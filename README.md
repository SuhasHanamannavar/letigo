# Litigo

**Your rules. Every chatbot.**

Litigo lets you define rules once and enforce them across AI conversations. It operates quietly alongside ChatGPT, Claude, Gemini, and other supported chatbots — analyzing responses locally, showing compliance status, and flagging violations without disrupting your workflow.

Simple. Fast. Quiet. Precise. Trustworthy. Cross-platform.

---

## Overview

Litigo is a cross-platform AI rule enforcement product. It is not another generic AI SaaS tool — it is a serious software utility that runs in the background and respects your privacy.

### Core Idea

```
User defines rules → Litigo enforces them across chatbots → You see compliance
```

### Key Features

- **Rule creation** — Define rules for word count, formatting, citations, tone, keywords, and custom semantic patterns
- **Real-time enforcement** — Responses evaluated automatically as they appear
- **Compliance scoring** — Clear percentage score with per-rule pass/warn/fail status
- **Activity log** — Complete audit trail of rule checks and violations
- **Privacy-first** — Moss semantic engine runs locally via WebAssembly. Conversation content never leaves your device.
- **Cross-platform** — Chrome extension, Windows, macOS, Android, iPhone
- **Chatbot adapter architecture** — Clean, maintainable per-chatbot integration

### Supported Chatbots

| Chatbot | Chrome | Windows | macOS | Android | iPhone |
|---------|--------|---------|-------|---------|--------|
| ChatGPT | ✓ | ✓ | ✓ | ✓ | ◇ |
| Claude | ✓ | ✓ | ✓ | ✓ | ◇ |
| Gemini | ✓ | ✓ | ✓ | ✓ | ◇ |
| Perplexity | ✓ | ✓ | ✓ | ✓ | ◇ |
| Microsoft Copilot | ✓ | ✓ | ✓ | ✓ | ◇ |
| Grok | ✓ | ✓ | ✓ | ✓ | ◇ |

✓ Full support · ◇ Keyboard-based interaction (iOS platform limitation)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Litigo Ecosystem                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────────────┐  │
│  │    Shared Core      │  │  Platform-Specific Shells    │  │
│  │                     │  │                             │  │
│  │  • Rule Engine      │  │  • Chrome Extension (MV3)   │  │
│  │  • Moss Wasm Engine │  │  • Windows (Tauri)          │  │
│  │  • Compliance Model │  │  • macOS (Tauri)            │  │
│  │  • Chatbot Registry │  │  • Android (Kotlin)         │  │
│  │  • Activity Logger  │  │  • iPhone (Swift)           │  │
│  │  • User Settings    │  │                             │  │
│  └─────────────────────┘  └─────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Chatbot Adapter Layer                  │    │
│  │  ChatGPT · Claude · Gemini · Perplexity · Copilot   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         Optional Cloud (Auth · Subscription ·       │    │
│  │          E2EE Rule Sync — never conversation)       │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

See [Architecture Overview](docs/architecture/overview.md) for full details.

---

## Repository Structure

```
litigo/
├── apps/
│   ├── web/                    # Marketing website (Next.js)
│   ├── chrome-extension/       # Chrome extension (Manifest V3)
│   ├── desktop/                # Desktop app (Tauri)
│   ├── android/                # Android app (Kotlin)
│   └── ios/                    # iOS app (Swift)
├── packages/
│   ├── core/                   # Shared business logic
│   ├── rules/                  # Rule model and CRUD
│   ├── rule-engine/            # Evaluation engine + Moss interface
│   ├── compliance/             # Compliance scoring
│   ├── chatbot-adapters/       # Per-chatbot integration adapters
│   ├── design-system/          # Design tokens and components
│   ├── shared-types/           # TypeScript type definitions
│   └── config/                 # Shared build and lint config
├── docs/
│   ├── architecture/
│   │   └── overview.md         # High-level architecture
│   ├── platforms/
│   │   ├── chrome-extension.md # Chrome extension architecture
│   │   ├── desktop.md          # Windows/macOS architecture
│   │   ├── android.md          # Android architecture
│   │   └── ios.md              # iOS architecture
│   ├── privacy/
│   │   └── privacy-architecture.md
│   ├── chatbots.md             # Chatbot adapter architecture
│   └── deployment.md           # Deployment instructions
├── scripts/
├── .github/
│   └── workflows/
├── .env.example
├── .gitignore
└── README.md
```

---

## Development Setup

### Prerequisites

- Node.js 20+
- npm or pnpm
- Rust (for Tauri desktop builds)
- Android Studio (for Android development)
- Xcode 15+ (for iOS development, macOS only)

### Install Dependencies

```bash
npm install
```

### Website Development

```bash
cd apps/web
npm run dev
```

Open http://localhost:3000

### Chrome Extension Development

```bash
cd apps/chrome-extension
npm run dev
```

Load the `dist` folder as an unpacked extension in Chrome.

### Desktop Development

```bash
cd apps/desktop
npm run tauri dev
```

### Android Development

Open `apps/android` in Android Studio.

### iOS Development

Open `apps/ios/Litigo.xcodeproj` in Xcode.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

**Never commit `.env` to version control.**

Required variables:
- None for local development (all features work offline)

Optional variables for cloud features:
- `AUTH_SECRET` — Authentication service secret
- `STRIPE_SECRET_KEY` — Payment processing
- `SYNC_ENCRYPTION_KEY` — Sync service encryption master key
- `DATABASE_URL` — Cloud database (for auth/subscription only)

---

## Testing

```bash
# All tests
npm test

# Core tests
npm run test:core

# Adapter tests
npm run test:adapters

# Lint
npm run lint

# Type check
npm run typecheck
```

---

## Build

### Website

```bash
cd apps/web
npm run build
```

Output: `apps/web/.next/standalone`

Deploy to Vercel: `vercel deploy`

### Chrome Extension

```bash
cd apps/chrome-extension
npm run build
```

Output: `apps/chrome-extension/dist/` + `.zip` for Chrome Web Store

### Desktop

```bash
cd apps/desktop
npm run tauri build
```

Output:
- Windows: `.msi` installer
- macOS: `.dmg` disk image

### Android

```bash
cd apps/android
./gradlew assembleRelease
```

Output: `app/build/outputs/apk/release/litigo-android-release.apk`

### iOS

Archive in Xcode and distribute via App Store Connect.

---

## Deployment

### Website (Vercel)

The website is configured for Vercel deployment:

1. Push repository to GitHub
2. Import project in Vercel
3. Set environment variables (if using cloud features)
4. Deploy

See [Deployment Guide](docs/deployment.md) for full details.

### Chrome Extension

Upload the built `.zip` to the Chrome Web Store Developer Dashboard.

### Desktop

Installers are distributed via the Litigo website download page.

### Android

APK distributed via direct download from the Litigo website. Google Play listing optional.

### iOS

Distributed via Apple App Store.

---

## Privacy Architecture

Litigo is privacy-first by design:

- **Local processing** — Rule evaluation, semantic matching, and compliance scoring all happen on your device using the Moss engine compiled to WebAssembly.
- **No conversation transmission** — Chatbot response text never leaves your device.
- **Optional E2EE sync** — If you enable cross-device sync, rule data is end-to-end encrypted before transmission. Litigo servers cannot read it.
- **Opt-in telemetry only** — No usage data is sent by default.
- **Minimal permissions** — Each platform requests only what is technically necessary.

See [Privacy Architecture](docs/privacy/privacy-architecture.md) for full details.

---

## Known Limitations

### iOS Platform Limitations

iOS does not permit third-party apps to monitor other apps or display floating overlays. On iPhone, Litigo works through a **custom keyboard extension**:

- Switch to the Litigo keyboard inside your chatbot app
- Copy AI responses and tap the analyze button on the keyboard
- Rules are evaluated locally on your device

This is a legitimate iOS platform constraint, not a missing feature.

### Android Background Reliability

Some Android manufacturers (Xiaomi, Huawei, Oppo, Vivo, etc.) aggressively restrict background services. Users on these devices may need to:

- Manually enable "Auto-start" for Litigo in system settings
- Exclude Litigo from battery optimization
- Lock Litigo in the recent apps list

### Response Extraction Fragility

Chatbot websites and apps change their UI frequently. While the adapter architecture isolates these changes, adapters may break temporarily after a chatbot update. Litigo fails gracefully — the indicator simply won't appear until the adapter is updated.

### Desktop App-Level Detection

Extracting response text from native desktop chatbot applications (as opposed to web versions) is limited. The desktop app works best when paired with the Chrome extension for web-based chatbot usage.

---

## Contributing

Contributions welcome. Please read the architecture documentation before submitting changes.

Key areas for contribution:
- New chatbot adapters
- Platform-specific improvements
- Rule engine enhancements
- Documentation
- Bug fixes

---

## License

[Specify license here]

---

## Security

**Never commit secrets to the repository.**

- `.env` files are in `.gitignore`
- Use environment variables for all credentials
- Use GitHub Secrets / Vercel Environment Variables for deployment
- Rotate any credential that appears in Git history immediately

Report security issues to security@litigo.ai

---

## Links

- [Website](https://litigo-ai.vercel.app)
- [Architecture Documentation](docs/architecture/overview.md)
- [Design System](docs/design-system.md)
- [Privacy Architecture](docs/privacy/privacy-architecture.md)
- [Chatbot Adapters](docs/chatbots.md)
- [Platform Documentation](docs/platforms/)
