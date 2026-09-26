// In-memory storage adapter with persistence hooks
// Platforms provide their own persistence layer (chrome.storage, localStorage, etc.)

import type {
  StorageAdapter,
  Rule,
  ActivityEvent,
  UserSettings,
  AccountState,
  SupportedChatbot,
} from '../types';

export class MemoryStorage implements StorageAdapter {
  private rules: Map<string, Rule> = new Map();
  private activity: ActivityEvent[] = [];
  private settings: UserSettings;
  private account: AccountState;
  private chatbots: Map<string, SupportedChatbot> = new Map();

  constructor() {
    this.settings = this.getDefaultSettings();
    this.account = { signedIn: false };
    this.initializeDefaultChatbots();
  }

  private getDefaultSettings(): UserSettings {
    return {
      general: {
        launchAtStartup: false,
        language: 'en',
        appearance: 'system',
        notifications: true,
      },
      protection: {
        autoDetection: true,
        enforcementBehavior: 'indicate_only',
      },
      rules: {
        defaultPriority: 'medium',
        conflictHandling: 'show_warning',
      },
      privacy: {
        localProcessingOnly: true,
        telemetryEnabled: false,
        syncEnabled: false,
        retainActivityDays: 30,
      },
    };
  }

  private initializeDefaultChatbots(): void {
    const defaults: SupportedChatbot[] = [
      {
        id: 'chatgpt',
        name: 'ChatGPT',
        enabled: true,
        capabilities: {
          responseExtraction: true,
          uiInjection: true,
          conversationRetrieval: true,
          inputAssistance: false,
          enforcement: false,
        },
        urlPattern: 'https://chat.openai.com/*',
        appIdentifiers: {
          android: 'com.openai.chatgpt',
          ios: 'com.openai.chatgpt',
          macos: 'com.openai.chatgpt',
          windows: 'ChatGPT.exe',
        },
      },
      {
        id: 'claude',
        name: 'Claude',
        enabled: true,
        capabilities: {
          responseExtraction: true,
          uiInjection: true,
          conversationRetrieval: true,
          inputAssistance: false,
          enforcement: false,
        },
        urlPattern: 'https://claude.ai/*',
        appIdentifiers: {
          android: 'com.anthropic.claude',
          ios: 'com.anthropic.claude',
        },
      },
      {
        id: 'gemini',
        name: 'Gemini',
        enabled: true,
        capabilities: {
          responseExtraction: true,
          uiInjection: true,
          conversationRetrieval: true,
          inputAssistance: false,
          enforcement: false,
        },
        urlPattern: 'https://gemini.google.com/*',
        appIdentifiers: {
          android: 'com.google.android.apps.bard',
          ios: 'com.google.bard',
        },
      },
      {
        id: 'perplexity',
        name: 'Perplexity',
        enabled: false,
        capabilities: {
          responseExtraction: true,
          uiInjection: true,
          conversationRetrieval: false,
          inputAssistance: false,
          enforcement: false,
        },
        urlPattern: 'https://www.perplexity.ai/*',
        appIdentifiers: {
          android: 'ai.perplexity.android',
          ios: 'ai.perplexity.ios',
        },
      },
      {
        id: 'copilot',
        name: 'Microsoft Copilot',
        enabled: true,
        capabilities: {
          responseExtraction: true,
          uiInjection: true,
          conversationRetrieval: false,
          inputAssistance: false,
          enforcement: false,
        },
        urlPattern: 'https://copilot.microsoft.com/*',
        appIdentifiers: {
          android: 'com.microsoft.copilot',
          ios: 'com.microsoft.copilot',
          windows: 'Copilot.exe',
        },
      },
      {
        id: 'grok',
        name: 'Grok',
        enabled: false,
        capabilities: {
          responseExtraction: true,
          uiInjection: true,
          conversationRetrieval: false,
          inputAssistance: false,
          enforcement: false,
        },
        urlPattern: 'https://grok.x.ai/*',
      },
    ];

    defaults.forEach(c => this.chatbots.set(c.id, c));
  }

  // ─── Rules ──────────────────────────────────────────────────────

  async getRules(): Promise<Rule[]> {
    return Array.from(this.rules.values()).sort((a, b) =>
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  async getRule(id: string): Promise<Rule | null> {
    return this.rules.get(id) || null;
  }

  async saveRule(rule: Rule): Promise<void> {
    this.rules.set(rule.id, {
      ...rule,
      updatedAt: new Date(),
    });
  }

  async deleteRule(id: string): Promise<void> {
    this.rules.delete(id);
  }

  async updateRule(rule: Rule): Promise<void> {
    this.rules.set(rule.id, {
      ...rule,
      updatedAt: new Date(),
    });
  }

  // ─── Activity ───────────────────────────────────────────────────

  async getActivity(limit: number = 100, offset: number = 0): Promise<ActivityEvent[]> {
    return this.activity
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(offset, offset + limit);
  }

  async logActivity(event: ActivityEvent): Promise<void> {
    this.activity.unshift(event);
    // Cap activity log
    const maxEvents = 1000;
    if (this.activity.length > maxEvents) {
      this.activity = this.activity.slice(0, maxEvents);
    }
  }

  async clearActivity(): Promise<void> {
    this.activity = [];
  }

  // ─── Settings ───────────────────────────────────────────────────

  async getSettings(): Promise<UserSettings> {
    return { ...this.settings };
  }

  async saveSettings(settings: UserSettings): Promise<void> {
    this.settings = { ...settings };
  }

  // ─── Account ────────────────────────────────────────────────────

  async getAccount(): Promise<AccountState> {
    return { ...this.account };
  }

  async saveAccount(account: AccountState): Promise<void> {
    this.account = { ...account };
  }

  // ─── Chatbots ───────────────────────────────────────────────────

  async getChatbots(): Promise<SupportedChatbot[]> {
    return Array.from(this.chatbots.values());
  }

  async saveChatbot(chatbot: SupportedChatbot): Promise<void> {
    this.chatbots.set(chatbot.id, { ...chatbot });
  }

  async updateChatbotEnabled(id: string, enabled: boolean): Promise<void> {
    const chatbot = this.chatbots.get(id);
    if (chatbot) {
      chatbot.enabled = enabled;
      this.chatbots.set(id, chatbot);
    }
  }

  // ─── Utility ────────────────────────────────────────────────────

  /**
   * Serialize all data for export/sync
   */
  exportAll(): {
    rules: Rule[];
    settings: UserSettings;
    chatbots: SupportedChatbot[];
    exportedAt: Date;
  } {
    return {
      rules: Array.from(this.rules.values()),
      settings: this.settings,
      chatbots: Array.from(this.chatbots.values()),
      exportedAt: new Date(),
    };
  }

  /**
   * Import data from export
   */
  importAll(data: {
    rules?: Rule[];
    settings?: UserSettings;
    chatbots?: SupportedChatbot[];
  }, merge: boolean = true): void {
    if (data.rules) {
      if (!merge) this.rules.clear();
      data.rules.forEach(r => this.rules.set(r.id, r));
    }
    if (data.settings) {
      this.settings = data.settings;
    }
    if (data.chatbots) {
      if (!merge) this.chatbots.clear();
      data.chatbots.forEach(c => this.chatbots.set(c.id, c));
    }
  }

  /**
   * Get total storage stats
   */
  getStats(): {
    ruleCount: number;
    activityCount: number;
    chatbotCount: number;
    enabledChatbotCount: number;
  } {
    return {
      ruleCount: this.rules.size,
      activityCount: this.activity.length,
      chatbotCount: this.chatbots.size,
      enabledChatbotCount: Array.from(this.chatbots.values()).filter(c => c.enabled).length,
    };
  }
}
