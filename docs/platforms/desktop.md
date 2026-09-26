# Desktop Application Architecture

## Overview

The Litigo desktop application runs as a background utility on Windows and macOS. It provides system-level integration (system tray / menu bar), rule management, activity viewing, chatbot configuration, and in-chatbot floating indicators.

**Critical difference from Wispr Flow:** Litigo is NOT system-wide. It only activates for supported chatbot applications and websites.

## Platforms

- **Windows** — Windows 10 and 11, x64
- **macOS** — macOS 12 (Monterey) and later, Universal (Apple Silicon + Intel)

## Technology Stack

- **Framework:** Tauri (preferred) or Electron
- **UI Layer:** Web technologies (HTML/CSS/TS) using shared design system
- **Backend:** Rust (Tauri) or Node.js (Electron)
- **System Integration:** Tauri plugins / native Node modules
- **Shared Core:** TypeScript package embedded in both

## Application Structure

```
apps/desktop/
├── src/
│   ├── main/                    # Main process (Rust or Node)
│   │   ├── tray/               # System tray / menu bar
│   │   ├── window-manager.ts   # Window lifecycle management
│   │   ├── background-monitor/ # Chatbot application detection
│   │   ├── permissions/        # Permission requests and management
│   │   ├── auto-start/         # Launch at login
│   │   └── ipc-handlers/       # IPC between main and renderer
│   ├── renderer/               # Renderer process (UI)
│   │   ├── windows/
│   │   │   ├── main/           # Main Hub window
│   │   │   ├── onboarding/     # First-run onboarding
│   │   │   ├── settings/       # Settings window
│   │   │   └── floating/       # In-chatbot floating panel
│   │   ├── components/         # Shared UI components
│   │   └── styles/             # Design system styles
│   └── core/                   # Embedded shared core
├── resources/
│   ├── icons/
│   └── wasm/
├── tauri.conf.json             # Tauri configuration
└── package.json
```

## Main Window (Hub)

### Navigation

Sidebar navigation, extremely simple:

```
┌─────────────────────────────────────────────────┐
│  ┌──────┐                                       │
│  │ Home │    Protected chatbots                 │
│  │ Rules │    [ ChatGPT ] [ Claude ] [ Gemini ] │
│  │Activity│                                      │
│  │Chatbots│    Today's Activity                  │
│  │Settings│    Rules checked:  142               │
│  │ Help  │    Violations caught: 8               │
│  └──────┘    Compliance:       93%               │
│              Protected conversations: 27         │
│  ┌──────┐                                       │
│  │Account│    Recent Activity                    │
│  │ Free  │    ─────────────────────────         │
│  │Litigo │    10:32 PM  ChatGPT  ✓ Passed        │
│  │Status │    10:28 PM  Claude   ⚠ Violation     │
│  └──────┘    09:51 PM  Gemini   ✓ Passed        │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Sidebar Items

- **Home** — Overview: protected chatbots, today's stats, recent activity
- **Rules** — Rule list, create/edit/delete, enable/disable, priority
- **Activity** — Full activity log with filtering
- **Chatbots** — Protected chatbot management, enable/disable per chatbot
- **Settings** — General, Protection, Rules, Privacy, Account, Help
- **Help** — Documentation links, diagnostics, contact
- **Bottom: Account** — Email, plan, sign out
- **Bottom: Status** — Litigo active/inactive indicator

## System Integration

### Windows

- **System Tray** — NotifyIcon with context menu
  - Show/Hide Litigo
  - Toggle Litigo enabled/disabled
  - Protected chatbots submenu
  - Settings
  - Quit
- **Background Process** — Runs in background, window hidden by default
- **Auto-start** — Registered via Windows Registry or Startup folder
- **Chatbot Detection** — Foreground window title/class monitoring
- **Floating Panel** — Topmost window positioned near chatbot window

### macOS

- **Menu Bar Item** — NSStatusItem with icon
  - Click shows status summary
  - Right-click (or Option-click) shows full menu
- **Background** — LSUIElement or accessory app mode
- **Auto-start** — LaunchServices / Login Items
- **Chatbot Detection** — NSWorkspace active application notifications
- **Accessibility Permission** — Required for some chatbot detection and response extraction
- **Floating Panel** — NSPanel with floating window level

## In-Chatbot Experience

When a supported chatbot application or website is in the foreground:

1. Litigo detects the active application
2. A subtle floating indicator appears near the chatbot window
3. Indicator shows: Litigo logo, status dot, brief compliance summary
4. Clicking expands to a compact panel with rule details

### Floating Indicator (Collapsed)

```
┌─────────────────┐
│ ● Litigo        │
│ 93% Compliance  │
└─────────────────┘
```

### Floating Panel (Expanded)

```
┌──────────────────────────┐
│ Litigo            ● Active│
├──────────────────────────┤
│  93%                     │
│  Compliance              │
├──────────────────────────┤
│  ✓ Under 50 words        │
│  ✓ Bullet points         │
│  ⚠ Cite sources          │
├──────────────────────────┤
│  [ View details ]        │
└──────────────────────────┘
```

## Onboarding Flow

First launch:

```
Screen 1: Welcome
  "Welcome to Litigo"
  "Your rules. Every chatbot."
  [ Get Started ]

Screen 2: Sign in
  Email / password or create account
  [ Sign in ]  [ Continue without account ]

Screen 3: Enable Protection
  Explanation of what Litigo does
  Permission request where needed
  [ Enable Litigo ]

Screen 4: Choose Chatbots
  Checklist of supported chatbots
  Which ones do you use?
  [ Continue ]

Screen 5: Create First Rule
  Quick rule creator
  Suggested templates
  [ Create rule ]  [ Skip for now ]

Screen 6: Done
  "Litigo is active"
  "Open your chatbot to see it in action"
  [ Open ChatGPT ]  [ Close ]
```

## Settings Architecture

### General
- Launch at startup (Windows/macOS only)
- Language
- Appearance (light/dark/system)
- Notifications

### Protection
- Protected chatbots list (enable/disable)
- Automatic detection on/off
- Enforcement behavior (indicator only / warning / block)

### Rules
- Default rule behavior
- Rule priority strategy
- Conflict handling (show warning / high priority wins)

### Privacy
- Local processing information
- Data storage location
- Telemetry (opt-in only)
- Network activity log

### Account
- Email
- Subscription plan
- Sign out

### Help
- Documentation link
- Contact support
- Diagnostics (export logs, version info)

## Chatbot Detection Strategy

Desktop must detect chatbot environments across:

1. **Web browsers** — Chrome, Edge, Firefox, Safari visiting supported chatbot URLs
2. **Desktop applications** — Any native chatbot apps (e.g., ChatGPT desktop app, Claude app)

### Detection Methods

**Windows:**
- `GetForegroundWindow()` + `GetWindowText()` + `GetClassName()`
- Process name and path inspection
- UI Automation API for deeper inspection where needed
- Browser URL detection via accessibility or extension coordination

**macOS:**
- `NSWorkspace.shared.frontmostApplication`
- Apple events / Accessibility API for window titles and URLs
- Browser-specific AppleScript for URL extraction (with permission)

**Important:** Detection is read-only. Litigo never injects input or modifies other applications' state without explicit user action.

## Permissions

### Windows
- No special permissions required for basic operation
- Auto-start: Registry write access (standard user can write to HKCU)
- Advanced detection: UI Automation (no elevation needed)

### macOS
- **Accessibility Permission** — Required for reliable window title and URL detection across apps. Requested during onboarding with clear explanation.
- **Input Monitoring** — NOT requested. Litigo does not monitor keyboard input globally.
- **Screen Recording** — NOT requested. Litigo does not capture screen content.
- **Auto-start** — User approval required on modern macOS.

**Permission Philosophy:** Request the minimum. Explain clearly. Never request permissions "just in case."

## IPC Protocol

Main process ↔ Renderer process communication:

**Renderer → Main:**
- `GET_RULES` — Fetch rules
- `SAVE_RULE` — Create/update rule
- `DELETE_RULE` — Delete rule
- `GET_ACTIVITY` — Fetch activity log
- `GET_SETTINGS` — Fetch settings
- `UPDATE_SETTINGS` — Update settings
- `GET_CHATBOTS` — Get protected chatbot list
- `TOGGLE_CHATBOT` — Enable/disable a chatbot
- `OPEN_EXTERNAL` — Open URL in default browser
- `QUIT_APP` — Quit application

**Main → Renderer:**
- `CHATBOT_DETECTED` — Active chatbot changed
- `ACTIVITY_LOGGED` — New activity event recorded
- `RULES_UPDATED` — Rules changed (e.g., from sync)

## Build & Packaging

### Tauri Build

```bash
# Development
npm run tauri dev

# Production build
npm run tauri build

# Output
# Windows: .msi installer + .exe
# macOS: .dmg disk image + .app
```

### Code Signing & Notarization

- **Windows:** Code signing certificate required for distribution outside Microsoft Store
- **macOS:** Developer ID certificate + notarization required for Gatekeeper acceptance

## Auto-Update

Tauri's built-in updater:
- Update server hosting signed update manifests
- Delta updates where possible
- User notification when update available
- Silent background download option

## Limitations

1. **Browser URL Detection** — Detecting which URL a browser is visiting requires accessibility permissions on macOS or coordination with the Chrome extension. Without these, Litigo falls back to application-level detection only.

2. **Response Extraction from Desktop Apps** — Extracting AI response text from native desktop applications is significantly harder than from web pages. The desktop app relies primarily on:
   - Coordination with the browser extension for web-based chatbots
   - Accessibility tree inspection where available
   - Falls back to status-only indication if text extraction is not possible

3. **macOS App Store Restrictions** — If distributing through the Mac App Store, sandbox restrictions may limit background monitoring capabilities. Direct distribution outside the App Store is the primary target.

4. **Windows ARM** — Initial release targets x64 only. ARM64 support can be added later.
