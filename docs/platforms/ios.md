# iOS Application Architecture

## Overview

The Litigo iOS application is designed around iOS platform constraints. Unlike Android, iOS does not permit floating overlays or system-wide accessibility monitoring of third-party apps. Instead, Litigo iOS uses a **keyboard extension** as its primary in-chatbot interaction model, paired with a main app for rule management.

**Critical:** Do not promise capabilities iOS does not technically permit. Be transparent about limitations.

## Target Platform

- **iOS Version:** 16.0 and above
- **Devices:** iPhone (primary), iPad (compatibility mode)
- **Distribution:** Apple App Store
- **Architecture:** arm64

## Technology Stack

- **Language:** Swift
- **UI:** SwiftUI
- **Architecture:** MVVM
- **Database:** SwiftData (iOS 17+) or Core Data
- **Background:** Background tasks framework (limited)
- **Shared Logic:** Kotlin Multiplatform or embedded JavaScriptCore + Wasm
- **Keyboard Extension:** Native iOS keyboard extension target

## Application Structure

```
apps/ios/
├── Litigo/                          # Main app target
│   ├── LitigoApp.swift
│   ├── Assets.xcassets
│   ├── Preview Content/
│   ├── Data/
│   │   ├── Database/               # SwiftData models
│   │   ├── Repository/
│   │   └── Preferences/            # UserDefaults + App Group
│   ├── Domain/
│   │   ├── Models/
│   │   ├── UseCases/
│   │   └── Engine/                 # Rule engine wrapper
│   ├── Features/
│   │   ├── Home/
│   │   ├── Rules/
│   │   ├── Activity/
│   │   ├── Chatbots/
│   │   ├── Settings/
│   │   ├── Account/
│   │   └── Onboarding/
│   ├── Components/
│   ├── Theme/
│   └── Resources/
│       └── wasm/
├── LitigoKeyboard/                  # Keyboard extension target
│   ├── KeyboardViewController.swift
│   ├── Views/
│   │   ├── KeyboardView.swift
│   │   ├── ComplianceIndicator.swift
│   │   └── RuleStatusView.swift
│   ├── Engine/
│   └── Resources/
├── Shared/                          # Shared between app and extension
│   ├── Models/
│   ├── Storage/                     # App Group shared storage
│   └── Engine/
├── Litigo.xcodeproj/
└── README.md
```

## Main App

### Navigation

Tab-based navigation (iOS standard pattern):

1. **Home** — Overview, compliance summary, protected chatbots
2. **Rules** — Rule list, create/edit/delete, enable/disable
3. **Activity** — Activity log with filtering
4. **Settings** — Settings, account, help, chatbot configuration

### Features

- Rule management (full CRUD, priority, categories)
- Activity history viewing and filtering
- Supported chatbot configuration (which apps the user uses)
- Settings and preferences
- Account management
- Onboarding flow
- Keyboard setup instructions

## Keyboard Extension Architecture

The keyboard extension is Litigo iOS's primary interaction point inside chatbot apps. When the user switches to the Litigo keyboard, it provides:

1. **Standard text input** (so it functions as a real keyboard)
2. **Litigo status bar** above the keys showing compliance status
3. **Rule status indicators**
4. **Quick access** to rule details and violation explanations

### Keyboard Layout

```
┌─────────────────────────────────────────────┐
│  Litigo Keyboard  ● Active  93% Compliance  │  ← Status bar
├─────────────────────────────────────────────┤
│  Q W E R T Y U I O P                        │
│   A S D F G H J K L                         │
│    Z X C V B N M              ⌫             │
│  [123] [space] [return]                     │
└─────────────────────────────────────────────┘
```

Tapping the status bar expands to show rule details:

```
┌─────────────────────────────────────────────┐
│  Litigo Compliance: 93%              [collapse]
├─────────────────────────────────────────────┤
│  ✓ Word limit          Passed               │
│  ✓ Bullet formatting   Passed               │
│  ⚠ Citation            Warning              │
│  ✓ Tone                Passed               │
├─────────────────────────────────────────────┤
│  Q W E R T Y U I O P                        │
│   ...                                       │
└─────────────────────────────────────────────┘
```

### Response Analysis via Keyboard

**Limitation:** iOS keyboard extensions cannot automatically read the chatbot's response text from the screen. The user must take an explicit action.

**Workflows:**

1. **Copy-Paste Analysis** — User copies the AI response, taps a Litigo keyboard button to analyze clipboard content.

2. **Input Assistance** — When the user types a prompt, Litigo can suggest rule-aware phrasing (e.g., "Remember: keep responses under 50 words").

3. **Manual Trigger** — User selects response text and uses the iOS share sheet or service menu to send to Litigo for analysis.

**Important:** Be honest about this limitation in onboarding and marketing. Litigo iOS cannot automatically monitor chatbot responses like the Chrome extension or Android overlay can.

## App Group Data Sharing

The main app and keyboard extension share data through an App Group:

- **Rules** — Shared read-only from keyboard extension
- **Settings** — Shared preferences
- **Activity** — Keyboard extension writes, main app reads
- **Engine** — Moss Wasm engine embedded in both targets (or shared framework)

```
┌─────────────────┐         App Group Container          ┌────────────────────┐
│   Main App      │  ┌────────────────────────────────┐  │  Keyboard Extension │
│                 │  │  Rules (read/write)             │  │                    │
│  - Rule CRUD    │→ │  Settings (read/write)          │← │  - Rules (read)    │
│  - Activity view│  │  Activity (append from keyboard)│  │  - Activity (write)│
│  - Settings     │  │  Engine cache                   │  │  - Engine (eval)   │
└─────────────────┘  └────────────────────────────────┘  └────────────────────┘
```

## Supported Chatbots on iOS

Since iOS does not allow monitoring which app is active, the "supported chatbots" concept shifts:

1. **User Configures** — In the main app, user selects which chatbot apps they use
2. **Keyboard Works Anywhere** — The Litigo keyboard can be enabled in any app with text input
3. **Context Tagging** — Activity events are tagged with the host app's bundle ID where available
4. **Rule Scoping** — Rules can be configured to apply to "all chatbots" or specific ones

### Chatbot Apps on iOS

| App | Bundle ID | Availability |
|-----|-----------|-------------|
| ChatGPT | `com.openai.chatgpt` | App Store |
| Claude | `com.anthropic.claude` | App Store |
| Gemini | `com.google.bard` | App Store |
| Perplexity | `ai.perplexity.ios` | App Store |
| Copilot | `com.microsoft.copilot` | App Store |
| Safari (web) | `com.apple.mobilesafari` | System |

## Onboarding Flow

```
Screen 1: Welcome
  "Litigo for iPhone"
  "Your rules. Every chatbot."
  [ Get Started ]

Screen 2: How it works on iPhone
  Clear explanation of iOS limitations
  "Litigo uses a custom keyboard to bring rule enforcement to your chatbots"
  "You'll switch to the Litigo keyboard inside your chatbot apps"
  [ Continue ]

Screen 3: Sign in
  [ Sign in ]  [ Continue without account ]

Screen 4: Enable Keyboard
  Step-by-step instructions:
  1. Open Settings
  2. General → Keyboard → Keyboards
  3. Add New Keyboard
  4. Select Litigo
  5. Enable "Allow Full Access" (explained)
  [ Open Settings ]  [ I'll do this later ]

Screen 5: Choose Chatbots
  Select which chatbot apps you use
  [ Continue ]

Screen 6: Create First Rule
  Quick rule templates
  [ Create rule ]  [ Skip ]

Screen 7: Ready
  "To use Litigo, switch to the Litigo keyboard inside your chatbot"
  [ Open ChatGPT ]  [ Done ]
```

## "Allow Full Access" Explanation

iOS keyboard extensions can request "Allow Full Access" which enables network access and pasteboard access. Litigo requests this for:

1. **Clipboard analysis** — Reading copied AI responses for rule evaluation
2. **Optional sync** — If user enables cross-device sync
3. **Authentication** — Account sign-in

**Privacy commitment:** Even with Full Access enabled, Litigo does NOT transmit conversation content. Rule evaluation happens locally.

## Permissions

| Permission | Purpose | Required? |
|-----------|---------|-----------|
| Keyboard activation | User must add Litigo keyboard in Settings | Yes |
| Allow Full Access | Clipboard access, network for auth/sync | Partial |
| Notifications | Violation alerts | No (optional) |
| Face ID/Touch ID | Secure access to settings/account | No (optional) |

## Background Capabilities

iOS severely limits background execution. Litigo iOS does NOT attempt to run continuously in the background.

- **No background monitoring** — Impossible on iOS for third-party apps
- **No floating overlays** — Not permitted by iOS SDK
- **Background tasks** — Used only for occasional sync and maintenance
- **Activity recording** — Only happens when keyboard extension is active

## Rule Engine on iOS

Options:

1. **Kotlin Multiplatform** — Core compiled to Kotlin/Native for iOS via Kotlin/Native framework
2. **JavaScriptCore** — Embed JS rule engine, run via JavaScriptCore framework
3. **Wasm Runtime** — Embed a Wasm runtime (e.g., Wasmer via C interop) to run Moss engine
4. **Pure Swift** — Reimplement core rule logic in Swift (highest performance, most maintenance)

**Recommended:** KMP for shared logic, embedded Wasm for Moss semantic engine.

## Build & Distribution

```bash
# Build for simulator
xcodebuild -scheme Litigo -destination 'platform=iOS Simulator,name=iPhone 15' build

# Archive for App Store
xcodebuild -scheme Litigo -destination 'generic/platform=iOS' archive

# Export
xcodebuild -exportArchive -archivePath Litigo.xcarchive -exportOptionsPlist ExportOptions.plist
```

### Signing

- Development: Team provisioning profile
- Distribution: App Store distribution certificate + provisioning profile
- Required: Apple Developer Program membership ($99/year)

### App Store Review Considerations

Potential review concerns to address:

1. **Keyboard extension functionality** — Must function as a real keyboard (provide text input)
2. **Full Access justification** — Clear explanation of why Full Access is requested
3. **No misleading claims** — Must not claim to "monitor all apps" or "work everywhere automatically"
4. **Privacy policy** — Required for App Store submission
5. **No private APIs** — All functionality must use public iOS SDK APIs

## Known iOS Limitations

**These are hard platform constraints. Do not fake functionality.**

1. **No automatic response detection** — iOS does not allow third-party apps to monitor or read content from other apps. The user must explicitly copy text or use the keyboard.

2. **No floating overlays** — iOS does not permit system-wide floating windows. The keyboard extension is the only legitimate in-app interaction point.

3. **No background monitoring** — Third-party apps cannot run continuously in the background to detect which app is active.

4. **No accessibility access to other apps** — iOS does not expose an accessibility service API to third-party apps for monitoring other apps.

5. **Keyboard must be functional** — Apple requires keyboard extensions to provide actual text input. They cannot be status-only.

6. **App Group data size limits** — Shared App Group containers have practical size limits. Activity logs should be capped.

7. **Extension memory limits** — Keyboard extensions have stricter memory limits than main apps. The rule engine must be efficient.

## Communication Strategy for iOS Limitations

Be transparent. In the app, on the website, and in marketing:

> "On iPhone, Litigo works through a custom keyboard. Switch to the Litigo keyboard inside your chatbot app to see compliance status and analyze responses. Due to iOS platform restrictions, Litigo cannot automatically monitor chatbot responses in the background."

Never pretend iOS provides the same experience as Android or Chrome. Position the iOS keyboard approach as the legitimate, privacy-respecting way to bring Litigo to iPhone.
