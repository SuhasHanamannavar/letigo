# Chatbot Adapter Architecture

## Overview

Litigo uses a clean adapter architecture to isolate chatbot-specific integration logic. Each supported chatbot gets its own adapter that implements a standard interface. This is critical for maintainability because chatbot websites and apps change their DOM/UI frequently.

## Core Principles

1. **Isolation** — Each adapter is self-contained. Changes to one adapter do not affect others.
2. **Standard Interface** — All adapters implement the same interface. The core engine treats them uniformly.
3. **Defensive** — Adapters must handle DOM/UI changes gracefully. Never assume selectors are stable.
4. **Detectable** — Each adapter must reliably detect when its chatbot is present.
5. **Fallback** — If an adapter breaks, it fails gracefully without crashing the host.

## Adapter Interface

```typescript
/**
 * ChatbotAdapter — standard interface for all chatbot integrations.
 * Platform-specific adapters may extend this with additional methods.
 */
interface ChatbotAdapter {
  // ─── Identification ──────────────────────────────────────────────

  /** Unique adapter ID (e.g., "chatgpt", "claude") */
  readonly id: string;

  /** Human-readable chatbot name */
  readonly name: string;

  /** URL pattern for web-based detection (browser extensions) */
  readonly urlPattern?: RegExp;

  /** Package names for app-based detection (mobile/desktop) */
  readonly appIdentifiers?: AppIdentifier[];

  /** Capabilities this adapter supports */
  readonly capabilities: Capabilities;

  // ─── Detection ───────────────────────────────────────────────────

  /**
   * Detect whether this chatbot is present in the current environment.
   * For web: check URL + DOM markers.
   * For apps: check accessibility node hierarchy.
   */
  detect(): boolean;

  // ─── Conversation Observation ────────────────────────────────────

  /**
   * Start observing the conversation for new responses.
   * Calls the callback when a new AI response is detected and appears complete.
   * Returns an unsubscribe function to stop observation.
   */
  observeResponse(
    callback: (response: ChatbotResponse) => void
  ): () => void;

  /**
   * Get the current conversation (list of messages).
   * Optional — not all adapters support full conversation retrieval.
   */
  getConversation?(): Conversation;

  /**
   * Get the composer/input element where the user types.
   * Optional — used for input assistance features.
   */
  getComposer?(): HTMLElement | null;

  // ─── Response Extraction ─────────────────────────────────────────

  /**
   * Extract plain text from a response element.
   * Must handle formatting, code blocks, and other rich content.
   */
  extractResponse(element: HTMLElement): string;

  /**
   * Extract structured response data if available.
   * Optional — falls back to extractResponse if not implemented.
   */
  extractResponseStructured?(element: HTMLElement): StructuredResponse;

  // ─── UI Injection ────────────────────────────────────────────────

  /**
   * Find the appropriate container in the chatbot UI to inject the Litigo indicator.
   * Returns null if no suitable container found.
   */
  getIndicatorContainer(element: HTMLElement): HTMLElement | null;

  /**
   * Inject the Litigo compliance indicator into the chatbot UI.
   * Returns the injected element for later removal or update.
   */
  injectIndicator(
    container: HTMLElement,
    status: ComplianceStatus
  ): HTMLElement;

  /**
   * Update an existing indicator with new status.
   */
  updateIndicator?(
    indicator: HTMLElement,
    status: ComplianceStatus
  ): void;

  /**
   * Remove injected Litigo UI.
   */
  removeLitigoUI(): void;

  // ─── Enforcement (Optional) ──────────────────────────────────────

  /**
   * Apply enforcement action for a violation.
   * Optional — most adapters only indicate, do not modify.
   * Examples: highlight violating text, show inline warning.
   */
  applyEnforcement?(violation: Violation, element: HTMLElement): void;

  // ─── Lifecycle ───────────────────────────────────────────────────

  /**
   * Called when adapter is initialized.
   * Use for one-time setup, DOM caching, observer initialization.
   */
  initialize?(): void;

  /**
   * Called when adapter is being unloaded.
   * Clean up observers, event listeners, injected UI.
   */
  destroy?(): void;
}

// ─── Supporting Types ──────────────────────────────────────────────

interface Capabilities {
  responseExtraction: boolean;
  uiInjection: boolean;
  conversationRetrieval: boolean;
  inputAssistance: boolean;
  enforcement: boolean;
}

interface AppIdentifier {
  platform: 'android' | 'ios' | 'windows' | 'macos';
  identifier: string;           // Package name / bundle ID / process name
  detectionMethod: 'foreground' | 'accessibility' | 'window-title' | 'url';
}

interface ChatbotResponse {
  id: string;
  text: string;
  element?: HTMLElement;        // Web only
  timestamp: Date;
  isComplete: boolean;
}

interface Conversation {
  messages: Message[];
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp?: Date;
}

interface StructuredResponse {
  text: string;
  codeBlocks?: CodeBlock[];
  citations?: Citation[];
  formatting?: FormattingInfo;
}

interface CodeBlock {
  language: string;
  content: string;
}

interface Citation {
  source: string;
  reference: string;
}

interface FormattingInfo {
  hasBulletPoints: boolean;
  hasNumberedList: boolean;
  hasHeadings: boolean;
  estimatedWordCount: number;
}
```

## Adapter Registry

```typescript
class AdapterRegistry {
  private adapters: Map<string, ChatbotAdapter> = new Map();

  register(adapter: ChatbotAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  unregister(adapterId: string): void {
    const adapter = this.adapters.get(adapterId);
    adapter?.destroy?.();
    this.adapters.delete(adapterId);
  }

  get(adapterId: string): ChatbotAdapter | undefined {
    return this.adapters.get(adapterId);
  }

  getAll(): ChatbotAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Detect which adapter matches the current environment.
   * Returns the first matching adapter or null.
   */
  detect(): ChatbotAdapter | null {
    for (const adapter of this.adapters.values()) {
      try {
        if (adapter.detect()) {
          return adapter;
        }
      } catch (e) {
        // Adapter detection failed — log and continue
        console.warn(`Adapter ${adapter.id} detection error:`, e);
      }
    }
    return null;
  }
}
```

## Adapter Implementation Guidelines

### DOM Selection Strategy (Web Adapters)

**Never rely on a single selector.** Use multiple fallback strategies:

```typescript
// BAD — single selector, breaks when class names change
const response = document.querySelector('.markdown.prose');

// GOOD — multiple selectors in priority order
function findResponseElement(): HTMLElement | null {
  const selectors = [
    '[data-message-author-role="assistant"]',   // Data attribute (most stable)
    '.markdown.prose',                          // Semantic class
    '.assistant-message',                       // Descriptive class
    '[class*="message-"][class*="assistant"]',  // Partial match fallback
    'div:has(> p:first-child)'                  // Structural fallback
  ];

  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector);
      if (el) return el as HTMLElement;
    } catch {
      // Invalid selector (e.g., :has not supported) — skip
    }
  }
  return null;
}
```

### MutationObserver Best Practices

```typescript
function observeResponse(callback: (text: string) => void): () => void {
  const container = findResponseContainer();
  if (!container) return () => {};

  // Debounce to avoid excessive evaluations during streaming
  let debounceTimer: number | null = null;

  const observer = new MutationObserver((mutations) => {
    if (debounceTimer) clearTimeout(debounceTimer);

    debounceTimer = window.setTimeout(() => {
      const text = extractResponse(container);
      if (text && text.length > 0) {
        callback(text);
      }
    }, 500); // Wait for streaming to pause
  });

  observer.observe(container, {
    childList: true,
    subtree: true,
    characterData: true
  });

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    observer.disconnect();
  };
}
```

### Response Completion Detection

Chatbots stream responses token by token. Litigo must detect when a response appears complete:

1. **Debounce threshold** — No new text for 500ms = likely complete
2. **Stop indicators** — Presence of "regenerate" button, stop button disappearing
3. **DOM stability** — No mutations for N milliseconds
4. **Text length heuristic** — Very short responses evaluated immediately

### UI Injection Safety

When injecting UI into chatbot pages:

1. **Use Shadow DOM** where possible to isolate styles
2. **Prefix all CSS classes** with `litigo-` to avoid collisions
3. **All CSS scoped** — Never write global CSS rules
4. **Clean up on navigation** — Remove injected UI when SPA route changes
5. **CSP aware** — Some chatbots have strict CSP; use inline styles sparingly

## Initial Adapters

### ChatGPTAdapter
- **URL:** `https://chat.openai.com/*`
- **Detection:** URL match + data attribute markers
- **Response extraction:** `[data-message-author-role="assistant"]`
- **UI injection:** Below each assistant message, or in message header
- **Capabilities:** Full response extraction, UI injection, conversation retrieval

### ClaudeAdapter
- **URL:** `https://claude.ai/*`
- **Detection:** URL match + Claude-specific DOM markers
- **Response extraction:** Assistant message containers
- **UI injection:** Message footer area
- **Capabilities:** Full response extraction, UI injection

### GeminiAdapter
- **URL:** `https://gemini.google.com/*`
- **Detection:** URL match + Gemini UI markers
- **Response extraction:** Response bubble containers
- **UI injection:** Message metadata area
- **Capabilities:** Response extraction, UI injection

### PerplexityAdapter
- **URL:** `https://www.perplexity.ai/*`
- **Detection:** URL match + Perplexity-specific elements
- **Response extraction:** Answer containers
- **UI injection:** Answer footer
- **Capabilities:** Response extraction, UI injection (citations available)

### CopilotAdapter
- **URL:** `https://copilot.microsoft.com/*`
- **Detection:** URL match + Copilot markers
- **Response extraction:** Response containers
- **UI injection:** Message area
- **Capabilities:** Response extraction, UI injection

### GrokAdapter
- **URL:** `https://grok.x.ai/*` or `https://x.com/i/grok/*`
- **Detection:** URL match + Grok-specific elements
- **Response extraction:** Response message containers
- **UI injection:** Message footer
- **Capabilities:** Response extraction, UI injection

## Adapter Testing

Each adapter should have:

1. **Unit tests** — Pure logic functions (text extraction, formatting detection)
2. **Integration tests** — Against saved HTML snapshots of chatbot pages
3. **Manual test checklist** — Verified against live chatbot pages

### Snapshot Testing Strategy

Save HTML snapshots of each chatbot's response UI:

```
packages/chatbot-adapters/
├── __snapshots__/
│   ├── chatgpt/
│   │   ├── response-simple.html
│   │   ├── response-with-code.html
│   │   ├── response-with-lists.html
│   │   └── streaming-in-progress.html
│   ├── claude/
│   └── gemini/
└── __tests__/
    ├── chatgpt-adapter.test.ts
    └── ...
```

Tests load snapshots into JSDOM and verify:
- Adapter detects correctly
- Response text extracted accurately
- UI injection finds correct container
- Edge cases handled (empty response, code-heavy, etc.)

## Versioning & Compatibility

Each adapter tracks:
- **Minimum tested date** — Last verified working
- **Known breakages** — Specific UI versions that don't work
- **Fallback behavior** — What happens when detection fails

Adapter health dashboard (internal):
```
Adapter      Status    Last Tested    Breakage Risk
───────────────────────────────────────────────────
ChatGPT      Healthy   2026-09-20     Low
Claude       Healthy   2026-09-18     Medium
Gemini       Healthy   2026-09-15     Medium
Perplexity   Degraded  2026-08-30     High
Copilot      Healthy   2026-09-12     Low
Grok         Beta      2026-09-01     High
```

## Adding a New Adapter

Checklist for adding support for a new chatbot:

1. **Research** — Document the chatbot's UI structure, URL patterns, app IDs
2. **Scaffold** — Create adapter file, implement interface skeleton
3. **Detection** — Implement reliable `detect()` method
4. **Observation** — Implement `observeResponse()` with MutationObserver
5. **Extraction** — Implement `extractResponse()` with multiple selector fallbacks
6. **UI Injection** — Implement indicator injection and removal
7. **Test** — Unit tests with snapshots, manual testing on live site
8. **Register** — Add to adapter registry
9. **Document** — Update chatbots.md support matrix
10. **UI** — Add chatbot icon/name to management UI
