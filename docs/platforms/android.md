# Android Application Architecture

## Overview

The Litigo Android application provides rule management, activity viewing, and — crucially — a floating overlay interaction model when a supported chatbot application is active.

**Important:** Android does NOT give unrestricted access to every application. Litigo uses only legitimate Android mechanisms and maintains an explicit supported-app registry.

## Target Platform

- **Android Version:** 9.0 (API 28) and above
- **Distribution:** Direct APK download + potential Google Play listing
- **Architecture:** ARM64-v8a, armeabi-v7a, x86_64

## Technology Stack

- **Language:** Kotlin
- **UI:** Jetpack Compose
- **Architecture:** MVVM + Clean Architecture
- **Shared Logic:** Kotlin Multiplatform (core) or embedded JavaScript engine with Wasm
- **Dependency Injection:** Hilt
- **Database:** Room
- **Background:** WorkManager + Foreground Service

## Application Structure

```
apps/android/
├── app/
│   ├── src/main/
│   │   ├── AndroidManifest.xml
│   │   ├── kotlin/com/litigo/android/
│   │   │   ├── LitigoApp.kt
│   │   │   ├── di/                         # Hilt modules
│   │   │   ├── data/
│   │   │   │   ├── local/                  # Room database
│   │   │   │   │   ├── AppDatabase.kt
│   │   │   │   │   ├── RuleDao.kt
│   │   │   │   │   ├── ActivityDao.kt
│   │   │   │   │   └── entities/
│   │   │   │   ├── repository/
│   │   │   │   └── prefs/                  # DataStore preferences
│   │   │   ├── domain/
│   │   │   │   ├── model/
│   │   │   │   ├── usecases/
│   │   │   │   └── engine/                 # Rule engine wrapper
│   │   │   ├── ui/
│   │   │   │   ├── theme/                  # Material You + Litigo design
│   │   │   │   ├── navigation/
│   │   │   │   ├── features/
│   │   │   │   │   ├── home/
│   │   │   │   │   ├── rules/
│   │   │   │   │   ├── activity/
│   │   │   │   │   ├── chatbots/
│   │   │   │   │   ├── settings/
│   │   │   │   │   ├── account/
│   │   │   │   │   └── onboarding/
│   │   │   │   └── components/
│   │   │   ├── service/
│   │   │   │   ├── MonitorService.kt       # Foreground monitoring service
│   │   │   │   ├── AccessibilityMonitor.kt # Accessibility service
│   │   │   │   └── OverlayManager.kt       # Floating overlay control
│   │   │   ├── overlay/
│   │   │   │   ├── FloatingIndicator.kt    # Collapsed indicator
│   │   │   │   └── FloatingPanel.kt        # Expanded compliance panel
│   │   │   └── receiver/
│   │   ├── res/
│   │   └── assets/
│   │       └── wasm/
│   │           └── moss-engine.wasm
│   └── build.gradle.kts
├── core/                                    # KMP shared core module
└── build.gradle.kts
```

## Main App Navigation

Bottom navigation bar with 5 primary destinations:

1. **Home** — Overview, protected chatbots, today's stats
2. **Rules** — Rule list, create/edit/delete
3. **Activity** — Activity log with filters
4. **Chatbots** — Supported app registry, enable/disable
5. **Settings** — Gear icon → settings screen

Account accessed via profile avatar in top app bar.

## Floating Overlay Architecture

When a supported chatbot application is detected in the foreground, Litigo displays a floating overlay using the Android system-alert-window mechanism.

### Collapsed Indicator

```
┌──────────┐
│ ● Litigo │
└──────────┘
```

- Small, unobtrusive circular or pill-shaped overlay
- Position: Edge of screen (default: right edge, vertical center)
- Draggable to any position
- Single tap → expands to panel
- Long press → minimize or dismiss
- Status dot color indicates compliance state

### Expanded Panel

```
┌──────────────────────┐
│ Litigo        ● Active│
├──────────────────────┤
│  96%                 │
│  Compliance          │
├──────────────────────┤
│  Rules:              │
│  ✓ Under 50 words    │
│  ✓ Bullet points     │
│  ⚠ Cite sources      │
├──────────────────────┤
│  [ View details ]    │
└──────────────────────┘
```

- Compact panel (approx 260dp wide)
- Shows compliance score, rule statuses
- Tap outside to collapse
- "View details" opens main app activity screen

## Chatbot Detection on Android

### Supported App Registry

```kotlin
data class SupportedApp(
  val packageName: String,
  val applicationName: String,
  val displayName: String,
  val enabled: Boolean,
  val capabilities: Set<Capability>,
  val detectionMethod: DetectionMethod
)

enum class Capability {
  RESPONSE_EXTRACTION,
  OVERLAY_INJECTION,
  INPUT_ASSIST
}

enum class DetectionMethod {
  FOREGROUND_APP,
  ACCESSIBILITY_NODE,
  BROWSER_URL
}
```

### Initial Supported Apps

| App | Package Name | Detection | Capabilities |
|-----|-------------|-----------|-------------|
| ChatGPT | `com.openai.chatgpt` | Foreground + Accessibility | Response extraction, Overlay |
| Claude | `com.anthropic.claude` | Foreground + Accessibility | Response extraction, Overlay |
| Gemini | `com.google.android.apps.bard` | Foreground + Accessibility | Response extraction, Overlay |
| Perplexity | `ai.perplexity.android` | Foreground + Accessibility | Response extraction, Overlay |
| Copilot | `com.microsoft.copilot` | Foreground + Accessibility | Response extraction, Overlay |
| Chrome | `com.android.chrome` | Browser URL detection | Overlay only |
| Edge | `com.microsoft.emmx` | Browser URL detection | Overlay only |
| Firefox | `org.mozilla.firefox` | Browser URL detection | Overlay only |

### Detection Mechanisms

1. **Foreground App Monitoring** — UsageStatsManager or AccessibilityService to detect which app is in the foreground.

2. **Accessibility Service** — `AccessibilityService` monitors window state changes and can inspect the accessibility node tree. Used for:
   - Detecting when a supported chatbot app is active
   - Extracting response text from accessibility nodes where available
   - Detecting specific UI patterns in chatbot apps

3. **Browser URL Detection** — For supported browsers, the accessibility service can attempt to read the URL bar text node to detect chatbot websites.

## Permissions

### Required Permissions

| Permission | Purpose | Requested When |
|-----------|---------|----------------|
| `SYSTEM_ALERT_WINDOW` | Display floating overlay over other apps | Onboarding, before first use |
| `BIND_ACCESSIBILITY_SERVICE` | Detect active chatbot apps, extract responses | Onboarding, with clear explanation |
| `FOREGROUND_SERVICE` | Run monitoring service in background | Implicit, on first service start |
| `POST_NOTIFICATIONS` | Show violation notifications (Android 13+) | On first notification or onboarding |
| `RECEIVE_BOOT_COMPLETED` | Optional auto-start on boot | If user enables "Launch at startup" |

### Permission Explanation

During onboarding, each permission is explained in plain language:

**Overlay Permission:**
> "Litigo needs permission to display a small floating indicator when you use supported chatbots. This indicator shows your compliance status without leaving the chatbot. Litigo only shows this indicator when a supported chatbot is active."

**Accessibility Permission:**
> "Litigo uses Android's Accessibility Service to detect when you're using a supported chatbot app and to read AI responses for rule evaluation. This happens entirely on your device. Litigo does not monitor other apps and does not transmit conversation content."

**Important:** Never secretly monitor unrelated applications. The accessibility service is explicitly scoped to the supported app registry via `android:packageNames` in the service config where possible, and programmatically filtered otherwise.

## Onboarding Flow

```
Screen 1: Welcome
  "Litigo for Android"
  "Your rules. Every chatbot."
  [ Get Started ]

Screen 2: Sign in
  [ Sign in ]  [ Continue without account ]

Screen 3: Choose Protected Chatbots
  Checklist of supported apps installed on device
  [ Continue ]

Screen 4: Enable Overlay Permission
  Explanation + button to system settings
  [ Grant permission ]

Screen 5: Enable Accessibility Service
  Clear explanation of what it does and doesn't do
  [ Open accessibility settings ]

Screen 6: Create First Rule
  Quick rule creator with templates
  [ Create rule ]  [ Skip ]

Screen 7: Ready
  "Litigo is active"
  "Open a chatbot to see the floating indicator"
  [ Open ChatGPT ]  [ Done ]
```

## Background Operation

- **Foreground Service** — `MonitorService` runs as a foreground service with a persistent notification while Litigo is enabled. This ensures the system doesn't kill the monitoring process.
- **Notification** — Persistent notification shows "Litigo is active" with protected chatbot count. Tapping opens the main app.
- **Battery Optimization** — On first run, prompt user to exclude Litigo from battery optimization for reliable background operation.

## Rule Engine Integration

Options for running the shared rule engine on Android:

1. **Kotlin Multiplatform** — Core logic compiled to Kotlin/Native for Android. Moss semantic engine compiled separately.
2. **Embedded Wasm** — Moss engine compiled to Wasm, run via Wasmer or a similar Wasm runtime embedded in the app.
3. **JavaScript Engine** — Core logic in JS, executed via Android's JavaScript engine or J2V8.

**Recommended approach:** KMP for pure business logic, embedded Wasm runtime for the Moss semantic engine.

## Build & Distribution

```bash
# Debug build
./gradlew assembleDebug

# Release build (signed)
./gradlew assembleRelease

# Output
# app/build/outputs/apk/release/litigo-android-release.apk
```

### Signing

- Release builds signed with upload key
- Google Play: App signing by Play Console
- Direct APK: Self-signed release key

### Distribution Channels

1. **Direct APK download** from litigo website (primary)
2. **Google Play Store** (secondary, subject to policy review)

## Known Android Limitations

1. **Accessibility Service Required** — Reliable chatbot detection and response extraction requires the accessibility service. Without it, Litigo can only detect foreground apps via UsageStats (less reliable) and cannot extract response text.

2. **Manufacturer Background Restrictions** — Chinese OEMs (Xiaomi, Huawei, Oppo, Vivo, etc.) aggressively kill background services. Users may need to manually enable auto-start and disable battery optimization for Litigo in system settings.

3. **Response Extraction is Fragile** — App UI changes can break accessibility node paths. Adapters must be defensive and version-aware.

4. **No Global Text Capture** — Android does not permit arbitrary text capture from other apps. Response extraction works only where accessibility nodes expose text.

5. **Overlay Permission** — Some manufacturers restrict or break SYSTEM_ALERT_WINDOW. The overlay may not work on all devices.

6. **Android 14+ Restrictions** — Foreground service types are more restricted. The monitoring service must be properly typed.
