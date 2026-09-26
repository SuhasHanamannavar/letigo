// Claude Adapter — for https://claude.ai

import { BaseChatbotAdapter, ChatbotResponse } from './base-adapter';

export class ClaudeAdapter extends BaseChatbotAdapter {
  readonly id = 'claude';
  readonly name = 'Claude';
  readonly urlPattern = /^https:\/\/claude\.ai\//;

  private readonly assistantSelectors = [
    '[class*="message-assistant"]',
    '[class*="assistant-message"]',
    '.font-claude-message',
    'div[data-is-streaming="false"]',
  ];

  detect(): boolean {
    return this.urlPattern.test(window.location.href);
  }

  observeResponse(callback: (response: ChatbotResponse) => void): () => void {
    const processedIds = new Set<string>();
    let debounceTimer: number | null = null;

    const check = () => {
      const messages = this.findElements(this.assistantSelectors);
      for (const msg of messages) {
        // Skip streaming responses
        if (msg.getAttribute('data-is-streaming') === 'true') continue;

        const text = this.extractResponse(msg);
        if (!text || text.length < 10) continue;

        const id = this.generateResponseId(msg, text);
        if (processedIds.has(id)) continue;

        if (debounceTimer !== null) clearTimeout(debounceTimer);
        debounceTimer = window.setTimeout(() => {
          const stableText = this.extractResponse(msg);
          const stableId = this.generateResponseId(msg, stableText);
          if (!processedIds.has(stableId)) {
            processedIds.add(stableId);
            callback({
              id: stableId,
              text: stableText,
              element: msg,
              timestamp: new Date(),
              isComplete: true,
            });
          }
        }, 1000);
      }
    };

    const container = this.findElement(['main', '[role="main"]']) || document.body;
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
    clone.querySelectorAll('button, [role="button"], svg, script, style').forEach(el => el.remove());
    return (clone.textContent || '').replace(/\s+/g, ' ').trim();
  }

  getIndicatorContainer(element: HTMLElement): HTMLElement | null {
    return element.querySelector('[class*="flex-row"]') || element;
  }
}
