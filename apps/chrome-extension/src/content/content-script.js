// Litigo Content Script
// Plain JavaScript version — runs directly inside supported chatbot pages
// Full TypeScript source with adapter architecture available in content-script.ts

(function () {
  'use strict';

  console.log('[Litigo] Content script loaded on:', window.location.hostname);

  // ─── State ──────────────────────────────────────────────────────

  let state = {
    enabled: true,
    rules: [],
    chatbotId: null,
    chatbotName: null,
    active: false,
    indicatorElement: null,
    lastResponseHash: null,
    observer: null,
    debounceTimer: null
  };

  // ─── Chatbot Detection ──────────────────────────────────────────

  const CHATBOT_CONFIGS = {
    'chat.openai.com': {
      id: 'chatgpt',
      name: 'ChatGPT',
      responseSelectors: [
        '[data-message-author-role="assistant"]',
        '.markdown.prose',
        '.assistant-message',
        '[class*="message"] [class*="assistant"]'
      ],
      containerSelector: '[class*="react-scroll"]'
    },
    'chatgpt.com': {
      id: 'chatgpt',
      name: 'ChatGPT',
      responseSelectors: [
        '[data-message-author-role="assistant"]',
        '.markdown.prose',
        '.assistant-message',
        '[class*="message"] [class*="assistant"]'
      ],
      containerSelector: '[class*="react-scroll"]'
    },
    'claude.ai': {
      id: 'claude',
      name: 'Claude',
      responseSelectors: [
        '[class*="AssistantMessage"]',
        '.font-claude-message',
        '[class*="message"] [class*="content"]'
      ],
      containerSelector: 'main'
    },
    'gemini.google.com': {
      id: 'gemini',
      name: 'Gemini',
      responseSelectors: [
        '[class*="response"]',
        '[class*="answer"]',
        '.message-content'
      ],
      containerSelector: 'main'
    },
    'www.perplexity.ai': {
      id: 'perplexity',
      name: 'Perplexity',
      responseSelectors: [
        '[class*="answer"]',
        '[class*="response"]'
      ],
      containerSelector: 'main'
    },
    'copilot.microsoft.com': {
      id: 'copilot',
      name: 'Copilot',
      responseSelectors: [
        '[class*="response"]',
        '[class*="message"]'
      ],
      containerSelector: 'main'
    },
    'grok.x.ai': {
      id: 'grok',
      name: 'Grok',
      responseSelectors: [
        '[class*="response"]',
        '[class*="message"]'
      ],
      containerSelector: 'main'
    },
    'x.com': {
      id: 'grok',
      name: 'Grok',
      responseSelectors: [
        '[class*="response"]',
        '[class*="message"]'
      ],
      containerSelector: 'main'
    }
  };

  function detectChatbot() {
    const host = window.location.hostname;
    for (const [domain, config] of Object.entries(CHATBOT_CONFIGS)) {
      if (host.includes(domain)) {
        return config;
      }
    }
    return null;
  }

  // ─── Initialization ─────────────────────────────────────────────

  async function initialize() {
    const chatbot = detectChatbot();
    if (!chatbot) {
      console.log('[Litigo] No supported chatbot detected on this page');
      return;
    }

    state.chatbotId = chatbot.id;
    state.chatbotName = chatbot.name;
    state.active = true;

    console.log(`[Litigo] Detected: ${chatbot.name}`);

    // Load initial state from background
    try {
      const status = await sendMessage({ type: 'LITIGO_STATUS' });
      state.enabled = status.enabled;
      state.rules = status.rules || [];
    } catch (e) {
      console.warn('[Litigo] Could not get initial status:', e);
    }

    // Notify background of tab state
    sendMessage({
      type: 'TAB_STATE_UPDATE',
      state: { chatbotId: chatbot.id, chatbotName: chatbot.name, active: true }
    });

    // Create indicator
    createIndicator();

    // Start observing responses
    startObserving(chatbot);

    // Listen for messages from background
    chrome.runtime.onMessage.addListener(handleBackgroundMessage);
  }

  // ─── Message Communication ──────────────────────────────────────

  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  }

  function handleBackgroundMessage(message) {
    switch (message.type) {
      case 'LITIGO_TOGGLED':
        state.enabled = message.enabled;
        updateIndicatorVisibility();
        break;
      case 'RULES_UPDATED':
        state.rules = message.rules;
        break;
    }
  }

  // ─── Response Observation ───────────────────────────────────────

  function startObserving(chatbot) {
    // Try to find the best container to observe
    let target = document.body;

    for (const selector of chatbot.responseSelectors) {
      const el = document.querySelector(selector);
      if (el && el.parentElement) {
        target = el.closest('main') || el.parentElement.parentElement || document.body;
        break;
      }
    }

    state.observer = new MutationObserver(mutations => {
      // Debounce to avoid excessive processing during streaming
      clearTimeout(state.debounceTimer);
      state.debounceTimer = setTimeout(() => {
        checkForNewResponse(chatbot);
      }, 1200);
    });

    state.observer.observe(target, {
      childList: true,
      subtree: true,
      characterData: true
    });

    // Initial check
    setTimeout(() => checkForNewResponse(chatbot), 500);
  }

  function checkForNewResponse(chatbot) {
    if (!state.enabled) return;

    // Find the most recent assistant response
    let responseText = null;

    for (const selector of chatbot.responseSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        const last = elements[elements.length - 1];
        const text = last.innerText || last.textContent;
        if (text && text.trim().length > 20) {
          responseText = text.trim();
          break;
        }
      }
    }

    if (!responseText) return;

    // Simple hash to detect new/changed responses
    const hash = simpleHash(responseText.slice(0, 200));
    if (hash === state.lastResponseHash) return;
    state.lastResponseHash = hash;

    // Evaluate the response
    evaluateResponse(responseText);
  }

  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  // ─── Evaluation ─────────────────────────────────────────────────

  async function evaluateResponse(text) {
    try {
      const result = await sendMessage({
        type: 'EVALUATE_TEXT',
        text: text,
        chatbotId: state.chatbotId
      });

      console.log(`[Litigo] Compliance: ${result.score}% — ${result.passed} passed, ${result.warnings} warnings, ${result.violations} violations`);

      // Update indicator
      updateIndicator(result);

      // Notify background of tab state
      sendMessage({
        type: 'TAB_STATE_UPDATE',
        state: { complianceScore: result.score }
      });

      // Log violations
      if (result.violations > 0 || result.warnings > 0) {
        const violatedRules = result.evaluations
          .filter(e => e.result === 'violated' || e.result === 'warning')
          .map(e => e.ruleName);

        sendMessage({
          type: 'ACTIVITY_LOGGED',
          activity: {
            chatbotId: state.chatbotId,
            chatbotName: state.chatbotName,
            ruleName: violatedRules[0] || 'Multiple rules',
            result: result.violations > 0 ? 'violated' : 'warning',
            complianceScore: result.score,
            responseSnippet: text.slice(0, 200)
          }
        });
      }
    } catch (e) {
      console.warn('[Litigo] Evaluation error:', e);
    }
  }

  // ─── UI Indicator ───────────────────────────────────────────────

  function createIndicator() {
    if (state.indicatorElement) return;

    const indicator = document.createElement('div');
    indicator.id = 'litigo-indicator';
    indicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483647;
      font-family: 'Archivo', system-ui, -apple-system, sans-serif;
      font-size: 13px;
      line-height: 1.4;
      color: #0a0a0a;
      background: #ffffff;
      border: 1px solid rgba(10,10,10,.08);
      border-radius: 10px;
      padding: 10px 14px;
      box-shadow: 0 4px 20px rgba(0,0,0,.08);
      min-width: 180px;
      max-width: 280px;
      opacity: 0;
      transform: translateY(8px);
      transition: opacity 0.25s ease, transform 0.25s ease;
      pointer-events: auto;
      user-select: none;
    `;

    indicator.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="width:8px;height:8px;border-radius:50%;background:#166534;display:inline-block;flex-shrink:0;"></span>
        <span style="font-weight:700;font-size:12px;">Litigo</span>
        <span style="font-size:11px;color:#6b7280;margin-left:auto;">${state.chatbotName}</span>
      </div>
      <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:6px;">
        <span class="litigo-score" style="font-size:20px;font-weight:700;color:#166534;font-variant-numeric:tabular-nums;">—</span>
        <span style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">Compliance</span>
      </div>
      <div class="litigo-progress" style="height:3px;background:rgba(10,10,10,.08);border-radius:2px;overflow:hidden;margin-bottom:6px;">
        <div class="litigo-progress-fill" style="height:100%;width:0%;background:#166534;border-radius:2px;transition:width .3s ease;"></div>
      </div>
      <div class="litigo-details" style="font-size:11px;color:#6b7280;display:flex;gap:12px;">
        <span><span style="color:#166534;font-weight:600;">✓</span> <span class="litigo-passed">0</span> passed</span>
        <span><span style="color:#92400e;font-weight:600;">⚠</span> <span class="litigo-warnings">0</span></span>
        <span><span style="color:#991b1b;font-weight:600;">✗</span> <span class="litigo-violations">0</span></span>
      </div>
    `;

    document.body.appendChild(indicator);
    state.indicatorElement = indicator;

    // Fade in
    requestAnimationFrame(() => {
      indicator.style.opacity = '1';
      indicator.style.transform = 'translateY(0)';
    });

    updateIndicatorVisibility();
  }

  function updateIndicator(result) {
    if (!state.indicatorElement) return;

    const el = state.indicatorElement;
    const scoreEl = el.querySelector('.litigo-score');
    const progressEl = el.querySelector('.litigo-progress-fill');
    const passedEl = el.querySelector('.litigo-passed');
    const warningsEl = el.querySelector('.litigo-warnings');
    const violationsEl = el.querySelector('.litigo-violations');

    // Determine color based on score
    let color = '#166534'; // success
    if (result.violations > 0) color = '#991b1b'; // error
    else if (result.warnings > 0) color = '#92400e'; // warning

    scoreEl.textContent = result.score + '%';
    scoreEl.style.color = color;
    progressEl.style.width = result.score + '%';
    progressEl.style.background = color;
    passedEl.textContent = result.passed;
    warningsEl.textContent = result.warnings;
    violationsEl.textContent = result.violations;

    // Status dot
    const dot = el.querySelector('span[style*="border-radius:50%"]');
    if (dot) dot.style.background = color;
  }

  function updateIndicatorVisibility() {
    if (!state.indicatorElement) return;
    state.indicatorElement.style.display = state.enabled ? 'block' : 'none';
  }

  // ─── SPA Navigation Detection ───────────────────────────────────

  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      const chatbot = detectChatbot();
      if (chatbot && chatbot.id !== state.chatbotId) {
        state.chatbotId = chatbot.id;
        state.chatbotName = chatbot.name;
        state.lastResponseHash = null;
        if (state.indicatorElement) {
          const nameEl = state.indicatorElement.querySelector('span:last-child');
          if (nameEl && nameEl.textContent.includes('color:#6b7280')) {
            nameEl.textContent = chatbot.name;
          }
        }
        startObserving(chatbot);
      }
    }
  }, 1000);

  // ─── Start ──────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

})();
