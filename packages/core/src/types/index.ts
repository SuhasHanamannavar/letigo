// Shared type definitions for the Litigo ecosystem
// These types are used across all platforms

export type RulePriority = 'high' | 'medium' | 'low';

export type RuleStatus = 'enabled' | 'disabled';

export type RuleType =
  | 'word_count'
  | 'formatting'
  | 'citation'
  | 'tone'
  | 'semantic'
  | 'keyword_exclude'
  | 'keyword_require'
  | 'custom';

export interface RulePattern {
  type: RuleType;
  config: Record<string, any>;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  pattern: RulePattern;
  status: RuleStatus;
  priority: RulePriority;
  category?: string;
  appliedTo: string[];          // Chatbot IDs
  violationCount: number;
  lastTriggered?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type EvaluationResult = 'passed' | 'warning' | 'violated' | 'not_applicable';

export interface RuleEvaluation {
  ruleId: string;
  ruleName: string;
  result: EvaluationResult;
  severity: number;            // 0-100
  details?: string;
  detected?: string;
  expected?: string;
}

export interface ComplianceStatus {
  score: number;               // 0-100
  totalRules: number;
  passed: number;
  warnings: number;
  violations: number;
  evaluations: RuleEvaluation[];
  timestamp: Date;
}

export interface ActivityEvent {
  id: string;
  timestamp: Date;
  chatbotId: string;
  chatbotName: string;
  ruleId?: string;
  ruleName?: string;
  result: EvaluationResult;
  complianceScore?: number;
  responseSnippet?: string;
  details?: string;
}

export interface ChatbotCapabilities {
  responseExtraction: boolean;
  uiInjection: boolean;
  conversationRetrieval: boolean;
  inputAssistance: boolean;
  enforcement: boolean;
}

export interface SupportedChatbot {
  id: string;
  name: string;
  enabled: boolean;
  capabilities: ChatbotCapabilities;
  rulesCount?: number;
  lastActivity?: Date;
  urlPattern?: string;
  appIdentifiers?: {
    android?: string;
    ios?: string;
    windows?: string;
    macos?: string;
  };
}

export interface UserSettings {
  general: {
    launchAtStartup: boolean;
    language: string;
    appearance: 'light' | 'dark' | 'system';
    notifications: boolean;
  };
  protection: {
    autoDetection: boolean;
    enforcementBehavior: 'indicate_only' | 'warn' | 'block';
  };
  rules: {
    defaultPriority: RulePriority;
    conflictHandling: 'show_warning' | 'high_priority_wins';
  };
  privacy: {
    localProcessingOnly: boolean;
    telemetryEnabled: boolean;
    syncEnabled: boolean;
    retainActivityDays: number;
  };
}

export interface AccountState {
  signedIn: boolean;
  email?: string;
  plan?: 'free' | 'pro' | 'team';
  subscriptionStatus?: 'active' | 'trial' | 'canceled' | 'expired';
  syncEnabled?: boolean;
  lastSync?: Date;
}

export interface RuleConflict {
  ruleAId: string;
  ruleBId: string;
  type: 'contradictory' | 'overlapping' | 'redundant';
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface LitigoStatus {
  active: boolean;
  currentChatbot?: string;
  activeRulesCount: number;
  complianceScore?: number;
  lastEvaluation?: Date;
}

export interface StorageAdapter {
  // Rules
  getRules(): Promise<Rule[]>;
  getRule(id: string): Promise<Rule | null>;
  saveRule(rule: Rule): Promise<void>;
  deleteRule(id: string): Promise<void>;
  updateRule(rule: Rule): Promise<void>;

  // Activity
  getActivity(limit?: number, offset?: number): Promise<ActivityEvent[]>;
  logActivity(event: ActivityEvent): Promise<void>;
  clearActivity(): Promise<void>;

  // Settings
  getSettings(): Promise<UserSettings>;
  saveSettings(settings: UserSettings): Promise<void>;

  // Account
  getAccount(): Promise<AccountState>;
  saveAccount(account: AccountState): Promise<void>;

  // Chatbots
  getChatbots(): Promise<SupportedChatbot[]>;
  saveChatbot(chatbot: SupportedChatbot): Promise<void>;
  updateChatbotEnabled(id: string, enabled: boolean): Promise<void>;
}
