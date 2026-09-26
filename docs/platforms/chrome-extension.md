# Chrome Extension Architecture

## Overview

The Litigo Chrome extension is a Manifest V3 browser extension that detects supported chatbot websites, injects Litigo UI, and evaluates AI responses against user-defined rules using the local Moss semantic engine.

## File Structure

```
apps/chrome-extension/
├── manifest.json                    # MV3 manifest definition
├── src/
│   ├── background/
│   │   └── service-worker.ts        # Background service worker
│   ├── content/
│   │   ├── content-script.ts        # Main content script (orchestrator)
│   │   └── adapter-loader.ts        # Dynamically loads correct adapter
│   ├── adapters/
│   │   ├── chatbot-adapter.ts       # Base adapter interface
│   │   ├── chatgpt-adapter.ts       # ChatGPT adapter
│   │   ├── claude-adapter.ts        # Claude adapter
│   │   ├── gemini-adapter.ts        # Gemini adapter
│   │   ├── perplexity-adapter.ts    # Perplexity adapter
│   │   ├── copilot-adapter.ts       # Microsoft Copilot adapter
│   │   └── grok-adapter.ts          # Grok adapter
│   ├── popup/
│   │   ├── popup.html               # Extension popup UI
│   │   ├── popup.ts                 # Popup logic
│   │   └── popup.css                # Popup styles
│   ├── options/
│   │   ├── options.html             # Options page
│   │   └── options.ts               # Options logic
│   ├── core/                        # Embedded shared core
│   │   ├── rule-engine.ts
│   │   ├── compliance.ts
│   │   ├── storage.ts
│   │   └── types.ts
│   ├── wasm/
│   │   └── moss-engine.wasm         # Moss semantic engine (Wasm)
│   ├── ui/
│   │   ├── indicator.ts             # In-page Litigo indicator
│   │   ├── panel.ts                 # Expanded compliance panel
│   │   └── violation-tooltip.ts     # Violation detail tooltip
│   └── shared/
│       ├── messaging.ts             # Background <-> content messaging
│       └── constants.ts
├── assets/
│   ├── icon-16.png
│   ├── icon-32.png
│   ├── icon-48.png
│   └── icon-128.png
└── package.json
```

## Manifest V3 Configuration

Key permissions:
- `storage` — Local rule and settings storage
- `activeTab` — Access to current tab when needed
- `scripting` — Dynamic script injection
- Host permissions for supported chatbot domains

```json
{
  "manifest_version": 3,
  "name": "Litigo",
  "version": "1.0.0",
  "description": "AI rule enforcement across chatbots",
  "permissions": ["storage", "activeTab", "scripting"],
  "host_permissions": [
    "https://chat.openai.com/*",
    "https://claude.ai/*",
    "https://gemini.google.com/*",
    "https://www.perplexity.ai/*",
    "https://copilot.microsoft.com/*",
    "https://grok.x.ai/*"
  ],
  "background": {
    "service_worker": "dist/background/service-worker.js"
  },
  "action": {
    "default_popup": "dist/popup/popup.html",
    "default_icon": {
      "16": "assets/icon-16.png",
      "32": "assets/icon-32.png",
      "48": "assets/icon-48.png",
      "128": "assets/icon-128.png"
    }
  },
  "content_scripts": [
    {
      "matches": [
        "https://chat.openai.com/*",
        "https://claude.ai/*",
        "https://gemini.google.com/*",
        "https://www.perplexity.ai/*",
        "https://copilot.microsoft.com/*",
        "https://grok.x.ai/*"
      ],
      "js": ["dist/content/content-script.js"],
      "run_at": "document_idle"
    }
  ],
  "options_page": "dist/options/options.html",
  "icons": {
    "16": "assets/icon-16.png",
    "32": "assets/icon-32.png",
    "48": "assets/icon-48.png",
    "128": "assets/icon-128.png"
  },
  "web_accessible_resources": [{
    "resources": ["dist/wasm/moss-engine.wasm"],
    "matches": ["<all_urls>"]
  }]
}
```

## Content Script Flow

```
Page loads on supported domain
    ↓
Content script bootstraps
    ↓
Adapter loader iterates registered adapters
    ↓
adapter.detect() called on each
    ↓
Matching adapter identified
    ↓
Initialize adapter for this page
    ↓
adapter.observeResponse(callback) starts watching
    ↓
Chatbot generates response
    ↓
Adapter extracts response text
    ↓
Rule engine evaluates against active rules
    ↓
Compliance status computed
    ↓
Litigo indicator injected into page
    ↓
User clicks indicator → panel expands with details
    ↓
Activity logged to chrome.storage.local
```

## Adapter Interface (Chrome-specific)

```typescript
abstract class ChatbotAdapter {
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly urlPattern: RegExp;

  // Detection
  abstract detect(): boolean;

  // DOM observation
  abstract observeResponse(
    callback: (response: ChatbotResponse) => void
  ): () => void;  // Returns unsubscribe function

  // Response extraction
  abstract extractResponse(element: HTMLElement): string;

  // UI injection points
  abstract getResponseContainer(element: HTMLElement): HTMLElement;
  abstract injectIndicator(
    container: HTMLElement,
    status: ComplianceStatus
  ): HTMLElement;

  // Optional: direct enforcement
  applyEnforcement?(violation: Violation): void;
}
```

## Messaging Protocol

**Content → Background:**
- `GET_RULES` — Fetch active rules for a chatbot
- `LOG_ACTIVITY` — Record an activity event
- `GET_SETTINGS` — Fetch user settings
- `UPDATE_RULE` — Rule state change from popup

**Background → Content:**
- `RULES_UPDATED` — Push rule changes to active tabs
- `SETTINGS_UPDATED` — Push setting changes
- `LITIGO_TOGGLED` — Global enable/disable state

**Popup → Background:**
- `GET_STATUS` — Current Litigo status, active chatbot, compliance
- `GET_ACTIVITY` — Recent activity summary
- `TOGGLE_LITIGO` — Enable/disable Litigo globally

## Popup UI Structure

Compact (320px wide, variable height):

```
┌──────────────────────────────────┐
│  Litigo              ● Active    │
├──────────────────────────────────┤
│  Current: ChatGPT                │
│  Compliance: 93%                 │
│  Rules active: 4                 │
├──────────────────────────────────┤
│  Recent violations               │
│  • 10:28 PM — Word limit         │
│  • 09:47 PM — Technical jargon   │
├──────────────────────────────────┤
│  [ Quick Rule Toggle ]           │
├──────────────────────────────────┤
│  Settings    Account    Help     │
└──────────────────────────────────┘
```

## Storage

All data stored in `chrome.storage.local`:

```typescript
interface StorageSchema {
  rules: Rule[];
  settings: UserSettings;
  activity: ActivityEvent[];        // Capped at last 1000
  account: AccountState | null;
  enabledChatbots: Record<string, boolean>;
  litigoEnabled: boolean;
  version: number;                  // For migrations
}
```

Optional `chrome.storage.sync` for rule sync (E2EE, user opt-in).

## Wasm Loading

The Moss semantic engine is loaded as WebAssembly:

1. Service worker fetches `moss-engine.wasm` on extension start
2. Compiled Wasm module cached in memory
3. Content scripts request evaluation via messaging
4. Service worker performs evaluation and returns results
5. Alternatively: Wasm loaded directly in content script for lower latency

## Build System

- **Bundler:** Vite
- **Output:** Multiple entry points (service worker, content script, popup, options)
- **Wasm:** Emitted as asset, copied to dist
- **HMR:** Supported for popup and options during development

Build commands:
```bash
npm run dev          # Development mode with watch
npm run build        # Production build
npm run test         # Unit tests
```

## Limitations & Considerations

1. **MV3 Service Worker Lifecycle** — Service workers are terminated after 30 seconds of inactivity. State must be persisted to storage, not held in memory.

2. **DOM Fragility** — Chatbot websites change their DOM frequently. Adapters must be defensive and fail gracefully. Use multiple selector strategies.

3. **CSP Restrictions** — Some chatbot sites have strict Content Security Policies. Injected UI must work within these constraints.

4. **Wasm in MV3** — WebAssembly is permitted in MV3 but must be loaded from web_accessible_resources or embedded.

5. **Performance** — Response observation must be efficient. Use MutationObserver with targeted selectors, not whole-document observation.

6. **Isolated World** — Content scripts run in an isolated world. They share DOM but not JS context with the page.
