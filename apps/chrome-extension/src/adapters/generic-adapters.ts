// Gemini, Perplexity, Copilot, Grok adapters — generic pattern with per-site selectors

import { BaseChatbotAdapter, ChatbotResponse } from './base-adapter';

interface GenericAdapterConfig {
  id: string;
  name: string;
  urlPattern: RegExp;
  assistantSelectors: string[];
  containerSelectors?: string[];
}

export class GenericChatbotAdapter extends BaseChatbotAdapter {
  readonly id: string;
  readonly name: string;
  readonly urlPattern: RegExp;
  private config: GenericAdapterConfig;

  constructor(config: GenericAdapterConfig) {
    super();
    this.id = config.id;
    this.name = config.name;
    this.urlPattern = config.urlPattern;
    this.config = config;
  }

  detect(): boolean {
    return this.urlPattern.test(window.location.href);
  }

  observeResponse(callback: (response: ChatbotResponse) => void): () => void {
    const processedIds = new Set<string>();
    let debounceTimer: number | null = null;

    const check = () => {
      const messages = this.findElements(this.config.assistantSelectors);
      for (const msg of messages) {
        const text = this.extractResponse(msg);
        if (!text || text.length < 10) continue;

        const id = this.generateResponseId(msg, text);
        if (processedIds.has(id)) continue;

        if (debounceTimer !== null) clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(() => {
          const stableText = this.extractResponse(msg);
          const stableId = this.generateResponseId(msg, stableText);
          if (!processedIds.has(stableId) && stableText.length > 10) {
            processedIds.add(stableId);
            callback({
              id: stableId,
              text: stableText,
              element: msg,
              timestamp: new Date(),
              isComplete: true,
            });
          }
        }, 1200);
      }
    };

    const container = this.findElement(this.config.containerSelectors || ['main']) || document.body;
    const observer = new MutationObserver(() => check());
    observer.observe(container, { childList: true, subtree: true, characterData: true });
    this.observers.push(observer);

    check();

    return () => {
      observer.disconnect();
      if (debounceTimer !== null) clearTimeout(debounceTimer);
      processedIds.clear();
    };
  }

  extractResponse(element: HTMLElement): string {
    const clone = element.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('button, [role="button"], svg, script, style, nav, header, footer').forEach(el => el.remove());
    return (clone.textContent || '').replace(/\s+/g, ' ').trim();
  }

  getIndicatorContainer(element: HTMLElement): HTMLElement | null {
    return element;
  }
}

// Pre-configured instances
export const GeminiAdapter = new GenericChatbotAdapter({
  id: 'gemini',
  name: 'Gemini',
  urlPattern: /^https:\/\/gemini\.google\.com\//,
  assistantSelectors: [
    '[class*="model-response"]',
    '[class*="assistant"]',
    '[class*="response-content"]',
    'message-content',
  ],
});

export const PerplexityAdapter = new GenericChatbotAdapter({
  id: 'perplexity',
  name: 'Perplexity',
  urlPattern: /^https:\/\/www\.perplexity\.ai\//,
  assistantSelectors: [
    '[class*="answer"]',
    '[class*="response"]',
    '[class*="prose"]',
    '[data-testid*="answer"]',
  ],
});

export const CopilotAdapter = new GenericChatbotAdapter({
  id: 'copilot',
  name: 'Microsoft Copilot',
  urlPattern: /^https:\/\/copilot\.microsoft\.com\//,
  assistantSelectors: [
    '[class*="assistant"]',
    '[class*="response"]',
    '[class*="message-content"]',
    '[data-cid]',
  ],
});

export const GrokAdapter = new GenericChatbotAdapter({
  id: 'grok',
  name: 'Grok',
  urlPattern: /^https:\/\/(grok\.x\.ai|x\.com\/i\/grok)\//,
  assistantSelectors: [
    '[class*="assistant"]',
    '[class*="response"]',
    '[class*="message"]',
    '[data-testid*="message"]',
  ],
});
