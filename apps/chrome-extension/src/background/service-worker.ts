// Background Service Worker — Chrome Extension Manifest V3
// Manages state, messaging between content scripts and popup,
// and cross-tab coordination

import { RuleEngine } from '../../../packages/core/src/engine/rule-engine';
import type { Rule, ActivityEvent, ComplianceStatus } from '../../../packages/core/src/types';

// In-memory state (service worker can be terminated, so critical state lives in storage)
interface BackgroundState {
  activeTabs: Map<number, {
    chatbotId: string;
    chatbotName: string;
    lastCompliance?: ComplianceStatus;
    lastEvaluated?: Date;
  }>;
  rules: Rule[];
  engine: RuleEngine | null;
}

const state: BackgroundState = {
  activeTabs: new Map(),
  rules: [],
  engine: null,
};

// ─── Initialization ───────────────────────────────────────────────

async function initialize(): Promise<void> {
  try {
    const data = await chrome.storage.local.get(['litigo_rules']);
    state.rules = (data['litigo_rules'] as Rule[]) || [];
    state.engine = new RuleEngine(state.rules);
    console.log('[Litigo] Background service worker initialized with', state.rules.length, 'rules');
  } catch (e) {
    console.error('[Litigo] Background initialization error:', e);
  }
}

// Initialize on startup
initialize();

// Re-initialize when storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes['litigo_rules']) {
    state.rules = changes['litigo_rules'].newValue || [];
    state.engine = new RuleEngine(state.rules);
    // Notify all tabs
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'RULES_UPDATED' }).catch(() => {});
        }
      });
    });
  }
});

// ─── Message Handling ────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  switch (message.type) {
    case 'CHATBOT_DETECTED':
      if (tabId !== undefined) {
        state.activeTabs.set(tabId, {
          chatbotId: message.chatbotId,
          chatbotName: message.chatbotName,
          lastEvaluated: new Date(),
        });
        updateExtensionIcon(tabId, true);
      }
      break;

    case 'COMPLIANCE_UPDATED':
      if (tabId !== undefined) {
        const tabState = state.activeTabs.get(tabId);
        if (tabState) {
          tabState.lastCompliance = {
            score: message.score,
            totalRules: 0,
            passed: message.passed,
            warnings: message.warnings,
            violations: message.violations,
            evaluations: [],
            timestamp: new Date(),
          };
          tabState.lastEvaluated = new Date();
        }
        // Update badge text with compliance score
        updateBadge(tabId, message.score, message.violations > 0);
      }
      break;

    case 'GET_STATUS':
      if (tabId !== undefined) {
        const tabState = state.activeTabs.get(tabId);
        const activeRules = state.rules.filter(r => r.status === 'enabled').length;
        const totalViolations = state.rules.reduce((sum, r) => sum + (r.violationCount || 0), 0);
        sendResponse({
          enabled: true,
          chatbotId: tabState?.chatbotId || null,
          chatbotName: tabState?.chatbotName || null,
          score: tabState?.lastCompliance?.score,
          passed: tabState?.lastCompliance?.passed,
          warnings: tabState?.lastCompliance?.warnings,
          violations: tabState?.lastCompliance?.violations,
          rulesCount: activeRules,
          activeRules,
          totalViolations,
        });
      }
      break;

    case 'LOG_ACTIVITY':
      logActivity(message.event);
      break;

    case 'EVALUATE_TEXT':
      if (state.engine && message.text) {
        const status = state.engine.evaluate(message.text, message.chatbotId);
        sendResponse(status);
      }
      break;

    case 'GET_RULES':
      sendResponse(state.rules);
      break;

    case 'SAVE_RULE':
      saveRule(message.rule);
      break;

    case 'DELETE_RULE':
      deleteRule(message.ruleId);
      break;
  }

  return true; // Keep channel open for async
});

// ─── Tab Lifecycle ───────────────────────────────────────────────

chrome.tabs.onRemoved.addListener((tabId) => {
  state.activeTabs.delete(tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    const tabState = state.activeTabs.get(tabId);
    if (tabState) {
      tabState.lastCompliance = undefined;
    }
    clearBadge(tabId);
  }
});

// ─── Icon & Badge ────────────────────────────────────────────────

function updateExtensionIcon(tabId: number, active: boolean): void {
  // In production, we'd set different icons
  // For now, the default icon is used
}

function updateBadge(tabId: number, score: number, hasViolations: boolean): void {
  try {
    const text = score >= 80 ? `${score}` : hasViolations ? '!' : `${score}`;
    chrome.action.setBadgeText({ tabId, text });
    chrome.action.setBadgeBackgroundColor({
      tabId,
      color: score >= 80 ? '#166534' : score >= 60 ? '#92400e' : '#991b1b',
    });
    chrome.action.setBadgeTextColor({ tabId, color: '#ffffff' });
  } catch (e) {
    // Silently fail if badge can't be set
  }
}

function clearBadge(tabId: number): void {
  try {
    chrome.action.setBadgeText({ tabId, text: '' });
  } catch (e) {}
}

// ─── Storage Helpers ─────────────────────────────────────────────

async function logActivity(event: ActivityEvent): Promise<void> {
  try {
    const data = await chrome.storage.local.get(['litigo_activity']);
    const activity: ActivityEvent[] = data['litigo_activity'] || [];
    activity.unshift(event);
    // Cap at 500 entries
    const capped = activity.slice(0, 500);
    await chrome.storage.local.set({ ['litigo_activity']: capped });
  } catch (e) {
    console.error('[Litigo] Failed to log activity:', e);
  }
}

async function saveRule(rule: Rule): Promise<void> {
  try {
    const data = await chrome.storage.local.get(['litigo_rules']);
    const rules: Rule[] = data['litigo_rules'] || [];
    const idx = rules.findIndex(r => r.id === rule.id);
    if (idx >= 0) {
      rules[idx] = { ...rule, updatedAt: new Date() };
    } else {
      rules.push({ ...rule, createdAt: new Date(), updatedAt: new Date() });
    }
    await chrome.storage.local.set({ ['litigo_rules']: rules });
    state.rules = rules;
    state.engine = new RuleEngine(rules);
  } catch (e) {
    console.error('[Litigo] Failed to save rule:', e);
  }
}

async function deleteRule(ruleId: string): Promise<void> {
  try {
    const data = await chrome.storage.local.get(['litigo_rules']);
    const rules: Rule[] = (data['litigo_rules'] || []).filter(r => r.id !== ruleId);
    await chrome.storage.local.set({ ['litigo_rules']: rules });
    state.rules = rules;
    state.engine = new RuleEngine(rules);
  } catch (e) {
    console.error('[Litigo] Failed to delete rule:', e);
  }
}

// ─── Install / Update ────────────────────────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[Litigo] Extension installed');
    // Initialize with default rules
    initializeDefaultRules();
    // Open welcome/onboarding page
    chrome.tabs.create({ url: 'https://litigo-ai.vercel.app/welcome' });
  } else if (details.reason === 'update') {
    console.log('[Litigo] Extension updated to', chrome.runtime.getManifest().version);
    // Run migrations if needed
  }
});

async function initializeDefaultRules(): Promise<void> {
  const defaultRules: Rule[] = [
    {
      id: 'rule_default_1',
      name: 'Keep answers under 100 words',
      description: 'Ensure AI responses are concise',
      pattern: { type: 'word_count', config: { maxWords: 100 } },
      status: 'enabled',
      priority: 'medium',
      category: 'conciseness',
      appliedTo: [],
      violationCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'rule_default_2',
      name: 'Always cite sources for factual claims',
      description: 'Flag responses that make factual claims without citations',
      pattern: { type: 'citation', config: { minCitations: 1 } },
      status: 'enabled',
      priority: 'high',
      category: 'accuracy',
      appliedTo: [],
      violationCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  try {
    await chrome.storage.local.set({ ['litigo_rules']: defaultRules });
    state.rules = defaultRules;
    state.engine = new RuleEngine(defaultRules);
  } catch (e) {
    console.error('[Litigo] Failed to initialize default rules:', e);
  }
}

// ─── Context Menu (Right-click) ─────────────────────────────────

chrome.contextMenus.create({
  id: 'litigo-analyze',
  title: 'Analyze with Litigo',
  contexts: ['selection'],
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'litigo-analyze' && info.selectionText && tab?.id) {
    if (state.engine) {
      const status = state.engine.evaluate(info.selectionText);
      // Show result in a notification
      const hasViolations = status.violations > 0;
      const hasWarnings = status.warnings > 0;
      const level = hasViolations ? 'Issues found' : hasWarnings ? 'Warnings' : 'All clear';

      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icon-48.png',
        title: `Litigo — ${status.score}% Compliance`,
        message: `${level}. ${status.passed} passed, ${status.warnings} warnings, ${status.violations} violations.`,
      });
    }
  }
});
