// Litigo Background Service Worker
// Plain JavaScript version — loadable directly as unpacked extension
// Full TypeScript source available in service-worker.ts

// ─── Default Configuration ────────────────────────────────────────

const DEFAULT_RULES = [
  {
    id: 'rule-word-count-default',
    name: 'Keep answers under 100 words',
    description: 'Ensure AI responses stay concise',
    type: 'word_count',
    config: { maxWords: 100 },
    priority: 'medium',
    category: 'general',
    enabled: true,
    appliedTo: [],
    violationCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'rule-bullet-default',
    name: 'Use bullet points for lists',
    description: 'Prefer structured formatting for multi-point answers',
    type: 'formatting',
    config: { format: 'bullet_points' },
    priority: 'medium',
    category: 'formatting',
    enabled: true,
    appliedTo: [],
    violationCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  },
  {
    id: 'rule-citation-default',
    name: 'Always cite sources',
    description: 'Flag factual claims without citation indicators',
    type: 'citation',
    config: { minCitations: 1 },
    priority: 'high',
    category: 'compliance',
    enabled: true,
    appliedTo: [],
    violationCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

const DEFAULT_CHATBOTS = {
  chatgpt: { id: 'chatgpt', name: 'ChatGPT', enabled: true, urlPattern: 'chat.openai.com' },
  claude: { id: 'claude', name: 'Claude', enabled: true, urlPattern: 'claude.ai' },
  gemini: { id: 'gemini', name: 'Gemini', enabled: true, urlPattern: 'gemini.google.com' },
  perplexity: { id: 'perplexity', name: 'Perplexity', enabled: false, urlPattern: 'www.perplexity.ai' },
  copilot: { id: 'copilot', name: 'Copilot', enabled: true, urlPattern: 'copilot.microsoft.com' },
  grok: { id: 'grok', name: 'Grok', enabled: false, urlPattern: 'grok.x.ai' }
};

const DEFAULT_SETTINGS = {
  general: { launchAtStartup: false, language: 'en', appearance: 'system', notifications: true },
  protection: { autoDetect: true, enforcementBehavior: 'indicate' },
  rules: { defaultPriority: 'medium', conflictHandling: 'show' },
  privacy: { localProcessing: true, telemetry: false, networkActivity: 'minimal' }
};

// ─── State ────────────────────────────────────────────────────────

let tabStates = {}; // tabId -> { chatbotId, chatbotName, complianceScore, active }

// ─── Storage Helpers ──────────────────────────────────────────────

async function getStorage(key, defaultValue) {
  try {
    const result = await chrome.storage.local.get(key);
    return result[key] !== undefined ? result[key] : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

async function setStorage(key, value) {
  try {
    await chrome.storage.local.set({ [key]: value });
    return true;
  } catch (e) {
    console.error('[Litigo] Storage error:', e);
    return false;
  }
}

// ─── Initialization ───────────────────────────────────────────────

async function initializeDefaults() {
  const initialized = await getStorage('litigo_initialized', false);
  if (!initialized) {
    console.log('[Litigo] First run — initializing defaults');
    await setStorage('litigo_rules', DEFAULT_RULES);
    await setStorage('litigo_chatbots', DEFAULT_CHATBOTS);
    await setStorage('litigo_settings', DEFAULT_SETTINGS);
    await setStorage('litigo_activity', []);
    await setStorage('litigo_account', { mode: 'local', signedIn: false });
    await setStorage('litigo_enabled', true);
    await setStorage('litigo_initialized', true);
    console.log('[Litigo] Defaults initialized');
  }
}

// ─── Message Routing ──────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle async responses
  (async () => {
    try {
      const result = await handleMessage(message, sender);
      sendResponse(result);
    } catch (error) {
      console.error('[Litigo] Message handler error:', error);
      sendResponse({ error: error.message });
    }
  })();
  return true; // Keep channel open for async response
});

async function handleMessage(message, sender) {
  const tabId = sender.tab?.id;

  switch (message.type) {
    case 'LITIGO_STATUS':
      return {
        enabled: await getStorage('litigo_enabled', true),
        rules: await getStorage('litigo_rules', []),
        chatbots: await getStorage('litigo_chatbots', {}),
        settings: await getStorage('litigo_settings', DEFAULT_SETTINGS),
        tabState: tabId ? tabStates[tabId] : null
      };

    case 'TOGGLE_LITIGO':
      const enabled = message.enabled !== undefined ? message.enabled : !(await getStorage('litigo_enabled', true));
      await setStorage('litigo_enabled', enabled);
      await broadcastToTabs({ type: 'LITIGO_TOGGLED', enabled });
      updateBadge(enabled);
      return { enabled };

    case 'RULES_UPDATED':
      await setStorage('litigo_rules', message.rules);
      await broadcastToTabs({ type: 'RULES_UPDATED', rules: message.rules });
      return { success: true };

    case 'ACTIVITY_LOGGED':
      const activity = await getStorage('litigo_activity', []);
      activity.unshift({
        ...message.activity,
        id: 'evt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        timestamp: Date.now()
      });
      // Keep only last 500 entries
      const trimmed = activity.slice(0, 500);
      await setStorage('litigo_activity', trimmed);
      return { success: true, count: trimmed.length };

    case 'TAB_STATE_UPDATE':
      if (tabId) {
        tabStates[tabId] = { ...tabStates[tabId], ...message.state };
        if (message.state.complianceScore !== undefined) {
          updateBadgeForTab(tabId, message.state.complianceScore);
        }
      }
      return { success: true };

    case 'GET_ACTIVITY':
      const limit = message.limit || 50;
      const allActivity = await getStorage('litigo_activity', []);
      return { activity: allActivity.slice(0, limit) };

    case 'EVALUATE_TEXT':
      const rules = await getStorage('litigo_rules', []);
      const result = evaluateRules(message.text, rules, message.chatbotId);
      return result;

    default:
      return { error: 'Unknown message type: ' + message.type };
  }
}

// ─── Rule Evaluation Engine (JS port) ─────────────────────────────

function evaluateRules(text, rules, chatbotId) {
  const activeRules = rules.filter(r => r.enabled);
  const applicable = activeRules.filter(r =>
    !r.appliedTo || r.appliedTo.length === 0 || r.appliedTo.includes(chatbotId)
  );

  const evaluations = applicable.map(rule => evaluateRule(rule, text));

  const passed = evaluations.filter(e => e.result === 'passed').length;
  const warnings = evaluations.filter(e => e.result === 'warning').length;
  const violations = evaluations.filter(e => e.result === 'violated').length;
  const applicableCount = evaluations.filter(e => e.result !== 'not_applicable').length;

  const score = applicableCount > 0
    ? Math.round(((passed + warnings * 0.5) / applicableCount) * 100)
    : 100;

  return { score, passed, warnings, violations, evaluations, totalRules: applicable.length };
}

function evaluateRule(rule, text) {
  const trimmed = text.trim();
  if (!trimmed) return { ruleId: rule.id, ruleName: rule.name, result: 'not_applicable', severity: 0 };

  switch (rule.type) {
    case 'word_count':
      return evalWordCount(rule, trimmed);
    case 'formatting':
      return evalFormatting(rule, trimmed);
    case 'citation':
      return evalCitation(rule, trimmed);
    case 'tone':
      return evalTone(rule, trimmed);
    case 'keyword_exclude':
      return evalKeywordExclude(rule, trimmed);
    case 'keyword_require':
      return evalKeywordRequire(rule, trimmed);
    default:
      return { ruleId: rule.id, ruleName: rule.name, result: 'not_applicable', severity: 0 };
  }
}

function evalWordCount(rule, text) {
  const words = text.split(/\s+/).filter(w => w.length > 0).length;
  const max = rule.config?.maxWords || 100;
  if (words > max) {
    return {
      ruleId: rule.id, ruleName: rule.name, result: 'violated',
      severity: Math.min(100, Math.round(((words - max) / max) * 100)),
      details: `Detected ${words} words, limit is ${max}`
    };
  }
  return { ruleId: rule.id, ruleName: rule.name, result: 'passed', severity: 0, details: `${words} words` };
}

function evalFormatting(rule, text) {
  const hasBullets = /^\s*[-*•]\s/m.test(text) || /^\s*\d+\.\s/m.test(text);
  const wordCount = text.split(/\s+/).length;
  if (!hasBullets && wordCount > 30) {
    return {
      ruleId: rule.id, ruleName: rule.name, result: 'warning', severity: 50,
      details: 'No bullet points or numbered lists detected'
    };
  }
  return { ruleId: rule.id, ruleName: rule.name, result: 'passed', severity: 0 };
}

function evalCitation(rule, text) {
  const patterns = [/\[\d+\]/, /\([A-Z][a-z]+,\s*\d{4}\)/, /https?:\/\/[^\s)]+/, /according to/i, /source:/i];
  const found = patterns.reduce((count, p) => count + (text.match(p) ? 1 : 0), 0);
  const min = rule.config?.minCitations || 1;
  const wordCount = text.split(/\s+/).length;
  if (found < min && wordCount > 40) {
    return {
      ruleId: rule.id, ruleName: rule.name, result: 'violated', severity: 65,
      details: 'No citation indicators found in substantial response'
    };
  }
  return { ruleId: rule.id, ruleName: rule.name, result: 'passed', severity: 0, details: `${found} citation indicator(s)` };
}

function evalTone(rule, text) {
  const tone = rule.config?.tone || 'professional';
  const lower = text.toLowerCase();
  const informal = ['gonna', 'wanna', 'gotta', 'yo', 'hey', 'cool', 'awesome', 'totally'];
  const hits = informal.filter(w => lower.includes(w)).length;
  if (tone === 'professional' && hits >= 3) {
    return {
      ruleId: rule.id, ruleName: rule.name, result: 'warning',
      severity: Math.min(60, hits * 15),
      details: `${hits} informal language marker(s) detected`
    };
  }
  return { ruleId: rule.id, ruleName: rule.name, result: 'passed', severity: 0 };
}

function evalKeywordExclude(rule, text) {
  const keywords = rule.config?.keywords || [];
  const lower = text.toLowerCase();
  const found = keywords.filter(k => lower.includes(k.toLowerCase()));
  if (found.length > 0) {
    return {
      ruleId: rule.id, ruleName: rule.name, result: 'violated',
      severity: Math.min(100, found.length * 40),
      details: `Excluded keyword(s): ${found.join(', ')}`
    };
  }
  return { ruleId: rule.id, ruleName: rule.name, result: 'passed', severity: 0 };
}

function evalKeywordRequire(rule, text) {
  const keywords = rule.config?.keywords || [];
  const lower = text.toLowerCase();
  const missing = keywords.filter(k => !lower.includes(k.toLowerCase()));
  if (missing.length > 0) {
    return {
      ruleId: rule.id, ruleName: rule.name, result: 'warning',
      severity: Math.min(70, missing.length * 35),
      details: `Missing keyword(s): ${missing.join(', ')}`
    };
  }
  return { ruleId: rule.id, ruleName: rule.name, result: 'passed', severity: 0 };
}

// ─── Broadcast ────────────────────────────────────────────────────

async function broadcastToTabs(message) {
  try {
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, message).catch(() => {
          // Tab may not have content script injected — ignore
        });
      }
    });
  } catch (e) {
    // Silently fail
  }
}

// ─── Badge ────────────────────────────────────────────────────────

function updateBadge(enabled) {
  if (enabled) {
    chrome.action.setBadgeBackgroundColor({ color: '#166534' });
    chrome.action.setBadgeText({ text: '' });
  } else {
    chrome.action.setBadgeBackgroundColor({ color: '#991b1b' });
    chrome.action.setBadgeText({ text: 'OFF' });
  }
}

function updateBadgeForTab(tabId, score) {
  try {
    if (score >= 80) {
      chrome.action.setBadgeBackgroundColor({ color: '#166534', tabId });
    } else if (score >= 50) {
      chrome.action.setBadgeBackgroundColor({ color: '#92400e', tabId });
    } else {
      chrome.action.setBadgeBackgroundColor({ color: '#991b1b', tabId });
    }
    chrome.action.setBadgeText({ text: String(score), tabId });
  } catch (e) {
    // Ignore
  }
}

// ─── Tab Lifecycle ────────────────────────────────────────────────

chrome.tabs.onRemoved.addListener(tabId => {
  delete tabStates[tabId];
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Detect chatbot from URL
    const chatbots = DEFAULT_CHATBOTS;
    let detected = null;
    for (const [key, cb] of Object.entries(chatbots)) {
      if (tab.url.includes(cb.urlPattern)) {
        detected = cb;
        break;
      }
    }
    if (detected) {
      tabStates[tabId] = { chatbotId: detected.id, chatbotName: detected.name, active: true };
    }
  }
});

// ─── Install ──────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(details => {
  initializeDefaults();
  updateBadge(true);
  console.log('[Litigo] Extension installed/reloaded');
});

chrome.runtime.onStartup.addListener(() => {
  initializeDefaults();
  updateBadge(true);
});

// Context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'litigo-toggle',
    title: 'Toggle Litigo Protection',
    contexts: ['all']
  });
  chrome.contextMenus.create({
    id: 'litigo-options',
    title: 'Litigo Settings',
    contexts: ['all']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'litigo-toggle') {
    const enabled = await getStorage('litigo_enabled', true);
    await setStorage('litigo_enabled', !enabled);
    await broadcastToTabs({ type: 'LITIGO_TOGGLED', enabled: !enabled });
    updateBadge(!enabled);
  } else if (info.menuItemId === 'litigo-options') {
    chrome.runtime.openOptionsPage();
  }
});

// Initialize on load
initializeDefaults();
updateBadge(true);

console.log('[Litigo] Background service worker ready');
