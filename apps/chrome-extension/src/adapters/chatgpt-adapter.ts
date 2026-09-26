// ChatGPT Adapter — for https://chat.openai.com

import { BaseChatbotAdapter, ChatbotResponse } from './base-adapter';

export class ChatGPTAdapter extends BaseChatbotAdapter {
  readonly id = 'chatgpt';
  readonly name = 'ChatGPT';
  readonly urlPattern = /^https:\/\/chat\.openai\.com\//;

  // Multiple selector strategies for robustness against UI changes
  private readonly assistantMessageSelectors = [
    '[data-message-author-role="assistant"]',
    '.markdown.prose',
    '[class*="assistant"] [class*="message"]',
    '[class*="group/conversation-turn"]:nth-child(even)',
    'div:has(> svg[width="18"][height="18"])', // OpenAI logo marker
  ];

  private readonly responseContainerSelectors = [
    '[data-message-author-role="assistant"] > div:first-child',
    '.markdown.prose',
    '[class*="message-content"]',
  ];

  private readonly composerSelectors = [
    '#prompt-textarea',
    'textarea[placeholder*="Message"]',
    'textarea[placeholder*="message"]',
    '[contenteditable="true"][role="textbox"]',
  ];

  detect(): boolean {
    return this.urlPattern.test(window.location.href);
  }

  observeResponse(callback: (response: ChatbotResponse) => void): () => void {
    let debounceTimer: number | null = null;
    const processedIds = new Set<string>();

    const checkForNewResponses = () => {
      const messages = this.findElements(this.assistantMessageSelectors);

      for (const msg of messages) {
        const text = this.extractResponse(msg);
        if (!text || text.length < 10) continue;

        const id = this.generateResponseId(msg, text);
        if (processedIds.has(id)) continue;

        // Check if response appears stable (not streaming)
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
        }, 1200); // Wait for streaming to pause
      }
    };

    // Observe the conversation container for new messages
    const conversationContainer = this.findElement([
      '[class*="react-scroll-to-bottom"]',
      'main > div > div',
      '[role="presentation"]',
    ]) || document.body;

    const observer = new MutationObserver((mutations) => {
      let shouldCheck = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0 || mutation.type === 'characterData') {
          shouldCheck = true;
          break;
        }
      }
      if (shouldCheck) {
        checkForNewResponses();
      }
    });

    observer.observe(conversationContainer, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    this.observers.push(observer);

    // Initial check
    checkForNewResponses();

    return () => {
      observer.disconnect();
      if (debounceTimer !== null) clearTimeout(debounceTimer);
      processedIds.clear();
    };
  }

  extractResponse(element: HTMLElement): string {
    // Try to find the markdown/prose content
    const contentEl = element.querySelector('.markdown.prose') ||
      element.querySelector('[class*="markdown"]') ||
      element;

    // Clone to avoid modifying the original
    const clone = contentEl.cloneNode(true) as HTMLElement;

    // Remove UI elements that aren't content
    clone.querySelectorAll('button, [role="button"], script, style, svg').forEach(el => el.remove());

    // Get text with proper spacing
    const text = clone.textContent || clone.innerText || '';

    // Clean up excessive whitespace
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
  }

  getIndicatorContainer(element: HTMLElement): HTMLElement | null {
    // Find the message metadata / footer area
    const footer = element.querySelector('[class*="rounded-md"]') ||
      element.querySelector('[class*="actions"]') ||
      element.querySelector('div:last-child');

    if (footer && footer.parentElement === element) {
      return footer as HTMLElement;
    }

    // Fallback: inject at the top of the message
    return element;
  }

  getComposer(): HTMLElement | null {
    return this.findElement(this.composerSelectors);
  }
}
