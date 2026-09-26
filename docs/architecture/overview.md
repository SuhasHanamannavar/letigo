# Litigo Architecture Overview

## Product Mission

Litigo lets users define rules once and enforce those rules across AI conversations. It operates quietly alongside supported chatbots, analyzing responses locally and providing compliance feedback without disrupting the user's workflow.

## Core Flow

```
User defines rules
    ↓
Rules stored locally (with optional encrypted sync)
    ↓
User opens a supported chatbot
    ↓
Litigo detects the chatbot environment
    ↓
Chatbot generates a response
    ↓
Litigo extracts the response text
    ↓
Moss semantic engine evaluates against active rules (local, WebAssembly)
    ↓
Compliance score computed
    ↓
Subtle status indicator appears in-context
    ↓
User can expand to view details, passed rules, violations
    ↓
Activity logged locally
```

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Litigo Ecosystem                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                  Shared Core Layer                  │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  Rule Engine       │  Compliance Model             │    │
│  │  Rule Model        │  Chatbot Registry             │    │
│  │  Priority/Conflict │  User Settings                │    │
│  │  Moss Wasm Engine  │  Account State                │    │
│  │  Activity Logger   │  Privacy Configuration        │    │
│  └────────────────────┬────────────────────────────────┘    │
│                       │                                      │
│  ┌────────────────────┼────────────────────────────────┐    │
│  │  Platform-Specific │  Integration Layers            │    │
│  ├────────────────────┼────────────────────────────────┤    │
│  │  Chrome Extension  │  Chatbot Adapters (Web)        │    │
│  │  Windows Shell     │  System Tray / Background      │    │
│  │  macOS Shell       │  Menu Bar / Accessibility      │    │
│  │  Android Shell     │  Accessibility / Overlay       │    │
│  │  iOS Shell         │  Keyboard Extension            │    │
│  └────────────────────┴────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Optional Cloud Services                │    │
│  ├─────────────────────────────────────────────────────┤    │
│  │  Authentication  │  Subscription  │  E2EE Sync      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Layered Architecture

### 1. Shared Core (`packages/core`)

Platform-agnostic business logic. Pure TypeScript / JavaScript with no platform dependencies.

**Sub-packages:**
- `rules` — Rule model, CRUD, validation, priority, conflict detection
- `rule-engine` — Evaluation engine, Moss semantic interface, compliance scoring
- `compliance` — Score calculation, status aggregation, violation explanation
- `chatbot-registry` — Supported chatbot definitions, capabilities matrix
- `activity` — Activity log model, filtering, storage interface
- `settings` — User preferences, privacy configuration, appearance
- `account` — Account state, subscription status, authentication tokens
- `storage` — Abstract storage interface (implemented per platform)
- `sync` — Optional cross-device synchronization protocol

### 2. Platform Shells (`apps/*`)

Each platform implements the shared core through a platform-specific shell that handles:

- UI rendering and navigation
- System integration (tray, menu bar, overlay, keyboard)
- Permission requests and management
- Platform-specific storage implementation
- Native notification mechanisms
- Build and packaging

### 3. Chatbot Adapters (`packages/chatbot-adapters`)

Isolated, per-chatbot integration logic. Each adapter implements a standard interface.

### 4. Optional Cloud Services

Minimal by design. Only what cannot be done locally:

- **Authentication** — Account creation and sign-in
- **Subscription** — Payment processing and plan management
- **E2EE Sync** — Optional encrypted cross-device rule synchronization

**Never:** Conversation content, rule evaluation results, or activity logs.

## Repository Structure

```
litigo/
├── apps/
│   ├── web/                    # Marketing/landing website (Next.js)
│   ├── chrome-extension/       # Chrome extension (Manifest V3)
│   ├── desktop/                # Shared desktop shell (Tauri/Electron)
│   ├── android/                # Android application (Kotlin)
│   └── ios/                    # iOS application (Swift)
├── packages/
│   ├── core/                   # Shared business logic
│   ├── rules/                  # Rule model and CRUD
│   ├── rule-engine/            # Evaluation engine + Moss interface
│   ├── compliance/             # Compliance scoring
│   ├── chatbot-adapters/       # Per-chatbot integration adapters
│   ├── design-system/          # Design tokens, components, styles
│   ├── shared-types/           # TypeScript type definitions
│   └── config/                 # Shared build and lint config
├── docs/
│   ├── architecture/           # Architecture documents
│   ├── platforms/              # Per-platform documentation
│   ├── privacy/                # Privacy architecture
│   ├── chatbots.md             # Chatbot support matrix
│   └── deployment.md           # Deployment instructions
├── scripts/                    # Build and utility scripts
├── .github/
│   └── workflows/              # CI/CD workflows
├── .env.example                # Environment variable template
├── .gitignore
└── README.md
```

## Data Flow

### Rule Evaluation Path

```
Chatbot Response Text
    ↓
Adapter.extractResponse()
    ↓
RuleEngine.evaluate(response, activeRules)
    ↓
MossSemanticEngine.match(text, rule.pattern)  [local, Wasm]
    ↓
Per-rule result: { passed, severity, details }
    ↓
ComplianceModel.compute(results)
    ↓
{ score, passed: [], warnings: [], violations: [] }
    ↓
UI Layer renders status indicator
    ↓
ActivityLogger.record(event)
```

### Cross-Device Sync Path (Optional)

```
Rule created/modified on Device A
    ↓
Local storage updated
    ↓
Sync layer encrypts (E2EE) only rule metadata + content
    ↓
Transmits to sync service
    ↓
Device B receives sync notification
    ↓
Decrypts and merges with local state
    ↓
Local storage updated on Device B
```

**Important:** Conversation content and activity logs are never synced.

## Technology Choices

### Shared Core
- **Language:** TypeScript
- **Semantic Engine:** Moss (compiled to WebAssembly)
- **Testing:** Vitest

### Website
- **Framework:** Next.js (React)
- **Styling:** Tailwind CSS + design tokens
- **Deployment:** Vercel

### Chrome Extension
- **Manifest:** V3
- **Language:** TypeScript
- **Build:** Vite + CRXJS or similar

### Desktop (Windows + macOS)
- **Framework:** Tauri (preferred) or Electron
- **UI:** Shared web components from design system
- **System Integration:** Tauri plugins / native modules

### Android
- **Language:** Kotlin
- **UI:** Jetpack Compose
- **Shared Logic:** Kotlin Multiplatform or embedded JS engine

### iOS
- **Language:** Swift
- **UI:** SwiftUI
- **Keyboard Extension:** Native iOS keyboard extension target
- **Shared Logic:** Embedded JavaScriptCore or KMP

## Privacy Boundary

```
┌─────────────────────────────────────────────────────────────┐
│                      DEVICE BOUNDARY                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    LOCAL ONLY                         │  │
│  │  • Rule matching and evaluation                      │  │
│  │  • Moss semantic engine (Wasm)                       │  │
│  │  • Conversation content observed                     │  │
│  │  • Compliance scoring                                │  │
│  │  • Activity log (default)                            │  │
│  │  • Rule definitions (default)                        │  │
│  │  • User preferences                                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │               OPTIONAL CLOUD (E2EE)                   │  │
│  │  • Rule sync (encrypted, user holds key)             │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      CLOUD SERVICES                         │
│  • Authentication (email, tokens)                          │
│  • Subscription management                                 │
│  • Sync service metadata (no plaintext content)            │
└─────────────────────────────────────────────────────────────┘
```

## Security Principles

1. **Local-first** — Everything that can be processed locally is processed locally.
2. **Minimal permissions** — Request only what is technically necessary.
3. **Transparent monitoring** — Never observe applications outside the supported chatbot registry.
4. **No secret transmission** — Conversation content never leaves the device.
5. **E2EE optional sync** — If sync is enabled, Litigo servers cannot read the data.
6. **No telemetry by default** — Usage analytics are opt-in only.
7. **Open source core** — Rule engine and adapters are auditable.

## Adapter Architecture

Each chatbot integration is isolated behind a standard interface:

```typescript
interface ChatbotAdapter {
  // Detection
  detect(): boolean;                    // Is this chatbot present?
  getName(): string;                    // Canonical name
  getCapabilities(): Capabilities;      // What this adapter supports

  // Conversation access
  getComposer(): HTMLElement | null;    // Input/text area
  getConversation(): Conversation;      // Message list
  observeResponse(callback: (response: Response) => void): () => void;

  // Response handling
  extractResponse(element: HTMLElement): string;
  evaluateResponse(text: string, rules: Rule[]): EvaluationResult;

  // UI injection
  injectLitigoUI(host: HTMLElement, status: ComplianceStatus): void;
  removeLitigoUI(): void;

  // Enforcement (optional)
  applyEnforcement?(violation: Violation): void;
}
```

Adapters are registered in a registry and loaded dynamically when their chatbot is detected.

## Rule Engine

The rule engine processes rules in priority order:

1. **High priority** rules evaluated first
2. Each rule produces a result: `PASSED`, `WARNING`, `VIOLATED`, `NOT_APPLICABLE`
3. Conflicts between rules are detected and surfaced to the user
4. Compliance score = (passed rules / total applicable rules) × 100
5. Severity weighting adjusts the score for high-priority violations

### Rule Model

```typescript
interface Rule {
  id: string;
  name: string;
  description: string;
  pattern: RulePattern;          // Semantic pattern definition
  enabled: boolean;
  priority: 'high' | 'medium' | 'low';
  category?: string;
  appliedTo: string[];           // Chatbot IDs
  violationCount: number;
  lastTriggered?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface RulePattern {
  type: 'word_count' | 'formatting' | 'citation' | 'tone' | 'semantic' | 'keyword_exclude' | 'custom';
  config: Record<string, any>;   // Type-specific configuration
}
```

## Build & Deployment

### Website
- Build: `next build`
- Output: Standalone Next.js build
- Deploy: Vercel (configured via `vercel.json`)

### Chrome Extension
- Build: Vite + CRXJS
- Output: Extension directory + `.zip` for Chrome Web Store
- Distribution: Chrome Web Store

### Desktop
- Build: Tauri `tauri build`
- Output: Windows `.msi`/`.exe`, macOS `.dmg`
- Distribution: Direct download + auto-update

### Android
- Build: Gradle `assembleRelease`
- Output: Signed `.apk` / `.aab`
- Distribution: Direct APK download + Google Play

### iOS
- Build: Xcode archive
- Output: `.ipa`
- Distribution: App Store
