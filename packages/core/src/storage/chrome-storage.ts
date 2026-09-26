// Chrome extension storage adapter wrapping chrome.storage API

import type {
  StorageAdapter,
  Rule,
  ActivityEvent,
  UserSettings,
  AccountState,
  SupportedChatbot,
} from '../types';
import { MemoryStorage } from './memory-storage';

const STORAGE_KEYS = {
  RULES: 'litigo_rules',
  ACTIVITY: 'litigo_activity',
  SETTINGS: 'litigo_settings',
  ACCOUNT: 'litigo_account',
  CHATBOTS: 'litigo_chatbots',
  VERSION: 'litigo_storage_version',
};

export class ChromeStorageAdapter extends MemoryStorage implements StorageAdapter {
  private memory: MemoryStorage;
  private initialized: boolean = false;

  constructor() {
    super();
    this.memory = new MemoryStorage();
  }

  async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    await this.loadFromChrome();
    this.initialized = true;
  }

  private async loadFromChrome(): Promise<void> {
    try {
      const data = await chrome.storage.local.get([
        STORAGE_KEYS.RULES,
        STORAGE_KEYS.ACTIVITY,
        STORAGE_KEYS.SETTINGS,
        STORAGE_KEYS.ACCOUNT,
        STORAGE_KEYS.CHATBOTS,
      ]);

      if (data[STORAGE_KEYS.RULES]) {
        const rules: Rule[] = data[STORAGE_KEYS.RULES].map((r: any) => ({
          ...r,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt),
          lastTriggered: r.lastTriggered ? new Date(r.lastTriggered) : undefined,
        }));
        for (const rule of rules) {
          await this.memory.saveRule(rule);
        }
      }

      if (data[STORAGE_KEYS.ACTIVITY]) {
        const activity: ActivityEvent[] = data[STORAGE_KEYS.ACTIVITY].map((a: any) => ({
          ...a,
          timestamp: new Date(a.timestamp),
        }));
        for (const event of activity) {
          await this.memory.logActivity(event);
        }
      }

      if (data[STORAGE_KEYS.SETTINGS]) {
        await this.memory.saveSettings(data[STORAGE_KEYS.SETTINGS]);
      }

      if (data[STORAGE_KEYS.ACCOUNT]) {
        await this.memory.saveAccount({
          ...data[STORAGE_KEYS.ACCOUNT],
          lastSync: data[STORAGE_KEYS.ACCOUNT].lastSync
            ? new Date(data[STORAGE_KEYS.ACCOUNT].lastSync)
            : undefined,
        });
      }

      if (data[STORAGE_KEYS.CHATBOTS]) {
        const chatbots: SupportedChatbot[] = data[STORAGE_KEYS.CHATBOTS];
        for (const cb of chatbots) {
          await this.memory.saveChatbot(cb);
        }
      }
    } catch (e) {
      console.warn('[Litigo] Failed to load from chrome.storage, using defaults:', e);
    }
  }

  private async persistToChrome(): Promise<void> {
    try {
      const exported = this.memory.exportAll();
      await chrome.storage.local.set({
        [STORAGE_KEYS.RULES]: exported.rules,
        [STORAGE_KEYS.SETTINGS]: exported.settings,
        [STORAGE_KEYS.CHATBOTS]: exported.chatbots,
        [STORAGE_KEYS.VERSION]: 1,
      });

      // Activity stored separately (may be large)
      const activity = await this.memory.getActivity(1000, 0);
      await chrome.storage.local.set({
        [STORAGE_KEYS.ACTIVITY]: activity.slice(0, 500), // Cap persisted activity
      });

      const account = await this.memory.getAccount();
      await chrome.storage.local.set({
        [STORAGE_KEYS.ACCOUNT]: account,
      });
    } catch (e) {
      console.warn('[Litigo] Failed to persist to chrome.storage:', e);
    }
  }

  // ─── Rules ──────────────────────────────────────────────────────

  async getRules(): Promise<Rule[]> {
    await this.ensureInitialized();
    return this.memory.getRules();
  }

  async getRule(id: string): Promise<Rule | null> {
    await this.ensureInitialized();
    return this.memory.getRule(id);
  }

  async saveRule(rule: Rule): Promise<void> {
    await this.ensureInitialized();
    await this.memory.saveRule(rule);
    await this.persistToChrome();
  }

  async deleteRule(id: string): Promise<void> {
    await this.ensureInitialized();
    await this.memory.deleteRule(id);
    await this.persistToChrome();
  }

  async updateRule(rule: Rule): Promise<void> {
    await this.ensureInitialized();
    await this.memory.updateRule(rule);
    await this.persistToChrome();
  }

  // ─── Activity ───────────────────────────────────────────────────

  async getActivity(limit?: number, offset?: number): Promise<ActivityEvent[]> {
    await this.ensureInitialized();
    return this.memory.getActivity(limit, offset);
  }

  async logActivity(event: ActivityEvent): Promise<void> {
    await this.ensureInitialized();
    await this.memory.logActivity(event);
    // Debounce persistence for activity (frequent writes)
    this.schedulePersist();
  }

  async clearActivity(): Promise<void> {
    await this.ensureInitialized();
    await this.memory.clearActivity();
    await this.persistToChrome();
  }

  // ─── Settings ───────────────────────────────────────────────────

  async getSettings(): Promise<UserSettings> {
    await this.ensureInitialized();
    return this.memory.getSettings();
  }

  async saveSettings(settings: UserSettings): Promise<void> {
    await this.ensureInitialized();
    await this.memory.saveSettings(settings);
    await this.persistToChrome();
  }

  // ─── Account ────────────────────────────────────────────────────

  async getAccount(): Promise<AccountState> {
    await this.ensureInitialized();
    return this.memory.getAccount();
  }

  async saveAccount(account: AccountState): Promise<void> {
    await this.ensureInitialized();
    await this.memory.saveAccount(account);
    await this.persistToChrome();
  }

  // ─── Chatbots ───────────────────────────────────────────────────

  async getChatbots(): Promise<SupportedChatbot[]> {
    await this.ensureInitialized();
    return this.memory.getChatbots();
  }

  async saveChatbot(chatbot: SupportedChatbot): Promise<void> {
    await this.ensureInitialized();
    await this.memory.saveChatbot(chatbot);
    await this.persistToChrome();
  }

  async updateChatbotEnabled(id: string, enabled: boolean): Promise<void> {
    await this.ensureInitialized();
    await this.memory.updateChatbotEnabled(id, enabled);
    await this.persistToChrome();
  }

  // ─── Debounced persistence ─────────────────────────────────────

  private persistTimer: number | null = null;

  private schedulePersist(): void {
    if (this.persistTimer !== null) {
      clearTimeout(this.persistTimer);
    }
    this.persistTimer = window.setTimeout(() => {
      this.persistTimer = null;
      this.persistToChrome();
    }, 1000);
  }
}
