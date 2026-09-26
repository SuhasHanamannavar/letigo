// Content Script — runs on supported chatbot pages
// Orchestrates adapter detection, response observation, rule evaluation, and UI injection

import { AdapterRegistry } from '../adapters/registry';
import { RuleEngine } from '../../../packages/core/src/engine/rule-engine';
import { ChromeStorageAdapter } from '../../../packages/core/src/storage/chrome-storage';
import type {
  Rule,
  ComplianceStatus,
  ActivityEvent,
  SupportedChatbot,
} from '../../../packages/core/src/types';

class LitigoContentScript {
  private registry: AdapterRegistry;
  private storage: ChromeStorageAdapter;
  private engine: RuleEngine | null = null;
  private rules: Rule[] = [];
  private chatbotConfig: Map<string, SupportedChatbot> = new Map();
  private litigoEnabled: boolean = true;
  private currentAdapterId: string | null = null;
  private cleanupObserver: MutationObserver | null = null;
  private initialized: boolean = false;

  constructor() {
    this.registry = new AdapterRegistry();
    this.storage = new ChromeStorageAdapter();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.storage.ensureInitialized();
      await this.loadData();
      this.setupMessageListener();
      this.setupStorageListener();
      await this.detectAndStart();
      this.initialized = true;
      console.log('[Litigo] Content script initialized');
    } catch (e) {
      console.error('[Litigo] Failed to initialize content script:', e);
    }
  }

  private async loadData(): Promise<void> {
    this.rules = await this.storage.getRules();
    this.engine = new RuleEngine(this.rules);

    const chatbots = await this.storage.getChatbots();
    this.chatbotConfig = new Map(chatbots.map(c => [c.id, c]));

    const settings = await this.storage.getSettings();
    // Litigo is enabled by default unless user explicitly disables
    this.litigoEnabled = true; // Global toggle stored separately
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'LITIGO_STATUS':
          sendResponse({
            enabled: this.litigoEnabled,
            chatbotId: this.currentAdapterId,
            chatbotName: this.registry.getActiveAdapter()?.name || null,
            rulesCount: this.rules.filter(r => r.status === 'enabled').length,
          });
          break;
        case 'RULES_UPDATED':
          this.loadData();
          break;
        case 'TOGGLE_LITIGO':
          this.litigoEnabled = message.enabled;
          if (!this.litigoEnabled) {
            this.registry.destroyAll();
          } else {
            this.detectAndStart();
          }
          break;
        case 'EVALUATE_TEXT':
          // Manual evaluation request from popup
          if (this.engine && message.text) {
            const status = this.engine.evaluate(message.text, this.currentAdapterId || undefined);
            sendResponse(status);
          }
          break;
      }
      return true; // Keep channel open for async
    });
  }

  private setupStorageListener(): void {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes['litigo_rules']) {
        this.loadData();
      }
    });
  }

  private async detectAndStart(): Promise<void> {
    if (!this.litigoEnabled) return;

    const adapter = this.registry.detect();
    if (!adapter) {
      console.log('[Litigo] No supported chatbot detected on this page');
      return;
    }

    // Check if this chatbot is enabled by user
    const config = this.chatbotConfig.get(adapter.id);
    if (config && !config.enabled) {
      console.log(`[Litigo] ${adapter.name} is disabled in settings`);
      return;
    }

    this.currentAdapterId = adapter.id;
    console.log(`[Litigo] Detected: ${adapter.name}`);

    // Notify background service worker
    chrome.runtime.sendMessage({
      type: 'CHATBOT_DETECTED',
      chatbotId: adapter.id,
      chatbotName: adapter.name,
      url: window.location.href,
    });

    // Start observing responses
    const unsubscribe = adapter.observeResponse(async (response) => {
      await this.handleResponse(response.text, response.element, adapter.id);
    });

    // Store cleanup function
    (adapter as any)._unsubscribe = unsubscribe;

    // Watch for SPA navigation
    this.watchForNavigation();
  }

  private async handleResponse(
    text: string,
    element: HTMLElement,
    chatbotId: string
  ): Promise<void> {
    if (!this.engine || !this.litigoEnabled) return;

    try {
      // Evaluate against rules
      const status = this.engine.evaluate(text, chatbotId);

      // Inject/update UI indicator
      const adapter = this.registry.getActiveAdapter();
      if (adapter) {
        const container = adapter.getIndicatorContainer(element);
        if (container) {
          const existing = container.querySelector('.litigo-indicator');
          if (existing) {
            adapter.updateIndicator(existing as HTMLElement, status);
          } else {
            adapter.injectIndicator(container, status);
          }
        }
      }

      // Log activity for each violation/warning
      if (status.violations > 0 || status.warnings > 0) {
        for (const evalResult of status.evaluations) {
          if (evalResult.result === 'violated' || evalResult.result === 'warning') {
            const rule = this.rules.find(r => r.id === evalResult.ruleId);
            if (rule) {
              // Increment violation count on rule
              rule.violationCount++;
              rule.lastTriggered = new Date();
              await this.storage.updateRule(rule);
            }

            const event: ActivityEvent = {
              id: 'evt_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
              timestamp: new Date(),
              chatbotId,
              chatbotName: adapter?.name || chatbotId,
              ruleId: evalResult.ruleId,
              ruleName: evalResult.ruleName,
              result: evalResult.result,
              complianceScore: status.score,
              responseSnippet: text.slice(0, 200),
              details: evalResult.details,
            };
            await this.storage.logActivity(event);
          }
        }
      }

      // Also log passed rules occasionally (sample)
      if (status.passed > 0 && Math.random() < 0.1) {
        const passed = status.evaluations.find(e => e.result === 'passed');
        if (passed) {
          const event: ActivityEvent = {
            id: 'evt_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
            timestamp: new Date(),
            chatbotId,
            chatbotName: adapter?.name || chatbotId,
            ruleId: passed.ruleId,
            ruleName: passed.ruleName,
            result: 'passed',
            complianceScore: status.score,
          };
          await this.storage.logActivity(event);
        }
      }

      // Notify popup of updated status
      chrome.runtime.sendMessage({
        type: 'COMPLIANCE_UPDATED',
        chatbotId,
        score: status.score,
        violations: status.violations,
        warnings: status.warnings,
        passed: status.passed,
      });

    } catch (e) {
      console.error('[Litigo] Response handling error:', e);
    }
  }

  private watchForNavigation(): void {
    // Single Page Application navigation detection
    let lastUrl = location.href;

    const checkUrl = () => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        // Clean up old adapter UI
        this.registry.destroyAll();
        this.currentAdapterId = null;
        // Re-detect on new route
        setTimeout(() => this.detectAndStart(), 500);
      }
    };

    // Poll for URL changes (SPA routing)
    setInterval(checkUrl, 1000);

    // Also listen for history API
    const originalPushState = history.pushState;
    history.pushState = function(...args) {
      const result = originalPushState.apply(this, args);
      setTimeout(checkUrl, 100);
      return result;
    };

    window.addEventListener('popstate', () => setTimeout(checkUrl, 100));
  }
}

// Bootstrap
const litigo = new LitigoContentScript();
litigo.initialize();
