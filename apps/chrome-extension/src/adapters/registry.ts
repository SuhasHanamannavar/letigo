// Adapter Registry — manages and detects the correct chatbot adapter

import { ChatbotAdapter } from './base-adapter';
import { ChatGPTAdapter } from './chatgpt-adapter';
import { ClaudeAdapter } from './claude-adapter';
import {
  GeminiAdapter,
  PerplexityAdapter,
  CopilotAdapter,
  GrokAdapter,
} from './generic-adapters';

export class AdapterRegistry {
  private adapters: Map<string, ChatbotAdapter> = new Map();
  private activeAdapter: ChatbotAdapter | null = null;

  constructor() {
    this.register(new ChatGPTAdapter());
    this.register(new ClaudeAdapter());
    this.register(GeminiAdapter);
    this.register(PerplexityAdapter);
    this.register(CopilotAdapter);
    this.register(GrokAdapter);
  }

  register(adapter: ChatbotAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  unregister(adapterId: string): void {
    const adapter = this.adapters.get(adapterId);
    if (adapter === this.activeAdapter) {
      adapter.destroy?.();
      this.activeAdapter = null;
    }
    this.adapters.delete(adapterId);
  }

  getAll(): ChatbotAdapter[] {
    return Array.from(this.adapters.values());
  }

  getById(id: string): ChatbotAdapter | null {
    return this.adapters.get(id) || null;
  }

  /**
   * Detect which adapter matches the current page
   * Returns the first matching adapter or null
   */
  detect(): ChatbotAdapter | null {
    // If we already have an active adapter that still matches, reuse it
    if (this.activeAdapter && this.activeAdapter.detect()) {
      return this.activeAdapter;
    }

    for (const adapter of this.adapters.values()) {
      try {
        if (adapter.detect()) {
          // Clean up previous adapter
          if (this.activeAdapter && this.activeAdapter !== adapter) {
            this.activeAdapter.destroy?.();
          }
          this.activeAdapter = adapter;
          adapter.initialize?.();
          return adapter;
        }
      } catch (e) {
        console.warn(`[Litigo] Adapter ${adapter.id} detection error:`, e);
      }
    }

    return null;
  }

  getActiveAdapter(): ChatbotAdapter | null {
    return this.activeAdapter;
  }

  /**
   * Detect adapter by URL pattern only (for background service worker)
   */
  detectByUrl(url: string): ChatbotAdapter | null {
    for (const adapter of this.adapters.values()) {
      if (adapter.urlPattern.test(url)) {
        return adapter;
      }
    }
    return null;
  }

  destroyAll(): void {
    this.adapters.forEach(adapter => adapter.destroy?.());
    this.activeAdapter = null;
  }
}
