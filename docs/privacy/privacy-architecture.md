# Privacy Architecture

## Core Principle

**Litigo is privacy-first by design.** Conversation content never leaves the user's device unless explicitly required by an optional feature the user has enabled. Rule evaluation happens locally.

## Processing Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER DEVICE BOUNDARY                       │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    LOCAL PROCESSING                       │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │                Moss Semantic Engine                 │  │  │
│  │  │              (WebAssembly, on-device)               │  │  │
│  │  │                                                     │  │  │
│  │  │  • Semantic pattern matching                        │  │  │
│  │  │  • Rule evaluation                                  │  │  │
│  │  │  • Tone analysis                                    │  │  │
│  │  │  • Formatting detection                             │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │                  Rule Engine                        │  │  │
│  │  │                                                     │  │  │
│  │  │  • Rule CRUD operations                             │  │  │
│  │  │  • Priority ordering                                │  │  │
│  │  │  • Conflict detection                               │  │  │
│  │  │  • Compliance scoring                               │  │  │
│  │  │  • Violation explanation                            │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │                  Local Storage                      │  │  │
│  │  │                                                     │  │  │
│  │  │  • Rule definitions                                 │  │  │
│  │  │  • User preferences                                 │  │  │
│  │  │  • Activity log (default)                           │  │  │
│  │  │  • Chatbot configuration                            │  │  │
│  │  │  • Account tokens (encrypted)                       │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │             Chatbot Adapters (in-context)           │  │  │
│  │  │                                                     │  │  │
│  │  │  • Response observation                             │  │  │
│  │  │  • Text extraction                                  │  │  │
│  │  │  • UI injection                                     │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │               OPTIONAL E2EE SYNC (User Opt-In)            │  │
│  │                                                           │  │
│  │  • Rule definitions only (encrypted on device)           │  │
│  │  • User preferences                                       │  │
│  │  • Chatbot configuration                                  │  │
│  │                                                           │  │
│  │  NEVER:                                                   │  │
│  │  • Conversation content                                   │  │
│  │  • Activity logs                                          │  │
│  │  • Evaluation results                                     │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      LITIGO CLOUD SERVICES                      │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │ Authentication   │  │  Subscription    │  │  Sync Service  │ │
│  │                  │  │  Management      │  │  (E2EE)        │ │
│  │  • Email/password│  │  • Payment       │  │  • Stores only │ │
│  │  • Session tokens│  │    processing    │  │    ciphertext  │ │
│  │  • OAuth         │  │  • Plan status   │  │  • Cannot read │ │
│  └──────────────────┘  └──────────────────┘  └────────────────┘ │
│                                                                 │
│  Litigo servers CANNOT read:                                    │
│  • Conversation content                                         │
│  • Rule evaluation results                                      │
│  • Plaintext rule definitions (if E2EE sync enabled)            │
│  • Activity logs                                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Data Classification

### Category A: Never Leaves Device

| Data | Processing Location | Storage |
|------|---------------------|---------|
| Chatbot response text observed by adapters | Local (Wasm engine) | Never persisted beyond evaluation window |
| Full conversation content | Local (if adapter retrieves it) | Never persisted |
| Semantic analysis intermediates | Local (Wasm memory) | Never persisted |
| Rule evaluation results (per-response) | Local | Activity log only (stored locally by default) |
| Violation details | Local | Activity log only (stored locally by default) |

### Category B: Stored Locally, Optional Sync

| Data | Syncable? | Encryption |
|------|-----------|-----------|
| Rule definitions (name, pattern, priority) | Yes (opt-in) | E2EE if synced |
| Rule enable/disable state | Yes (opt-in) | E2EE if synced |
| Rule-chatbot associations | Yes (opt-in) | E2EE if synced |
| User preferences (appearance, notifications) | Yes (opt-in) | E2EE if synced |
| Protected chatbot list | Yes (opt-in) | E2EE if synced |

### Category C: Never Synced

| Data | Reason |
|------|--------|
| Activity log | Contains conversation context. Too sensitive for cloud. |
| Violation details | May contain snippets of conversation content. |
| Compliance score history | Derived from activity, too revealing. |

### Category D: Cloud-Necessary

| Data | Cloud Service | Purpose |
|------|--------------|---------|
| Email address | Authentication | Account identification |
| Password hash | Authentication | Account security (never stored plaintext) |
| Session tokens | Authentication | Maintaining signed-in state |
| Subscription status | Payment provider | Plan management |
| Payment method tokens | Payment provider | Processing payments (never store full card) |
| E2EE sync ciphertext | Sync service | Cross-device rule sync |

## End-to-End Encryption (Optional Sync)

### Key Architecture

```
User creates account or enables sync
    ↓
User's device generates encryption key pair
    ↓
Private key encrypted with user's password-derived key
    ↓
Encrypted private key + public key stored on Litigo servers
    ↓
Rule data encrypted with symmetric key
    ↓
Symmetric key encrypted with user's public key
    ↓
Encrypted rule data + encrypted symmetric key sent to sync service
    ↓
Second device: user signs in, enters password
    ↓
Password decrypts private key
    ↓
Private key decrypts symmetric key
    ↓
Symmetric key decrypts rule data
```

**Litigo servers never see:**
- The user's password (only a hash)
- The user's private key (only encrypted blob)
- The plaintext of any synced rule

### Algorithms

- **Key derivation:** Argon2id (memory-hard)
- **Asymmetric encryption:** X25519 / ECIES
- **Symmetric encryption:** XChaCha20-Poly1305
- **Hashing:** SHA-256 for integrity checks

## Telemetry

### Default: No Telemetry

Litigo does not send any usage data by default. The product works fully offline.

### Opt-In Analytics

If the user explicitly enables "Help improve Litigo" in settings:

- **What is sent:** Aggregate, anonymous usage counts
  - Number of rules created (not the content)
  - Number of evaluations performed
  - Compliance score distribution (buckets, not per-response)
  - Feature usage flags (e.g., "user used priority feature")
  - Platform and version
  - Random anonymous device ID (resetable)

- **What is NEVER sent:**
  - Rule content or patterns
  - Conversation text
  - Chatbot names involved in specific evaluations
  - User identity (unless signed in, and even then not linked to analytics)
  - IP address (not logged beyond connection handling)

### Crash Reporting

- **Default:** Disabled
- **Opt-in:** If enabled, crash reports contain:
  - Stack traces (function names, line numbers)
  - Platform and version
  - Memory and OS info
  - **Never:** Rule content, conversation text, user identifiers

## Permissions Philosophy

### The Rule

> Request only what is technically necessary. Explain clearly what it's for and what it's NOT for.

### Permission Request Checklist

Before requesting any permission on any platform:

1. **Is it technically required?** — Can the feature work without it? If yes, don't request.
2. **Is it scoped as narrowly as possible?** — Request the minimum permission level, not the broadest.
3. **Can it be optional?** — Make it optional with degraded functionality if not granted.
4. **Is the explanation clear?** — User must understand what they're granting and why.
5. **Is it revocable?** — User must be able to turn it off later.

### Platform-Specific Permission Notes

**Chrome Extension:**
- `activeTab` — Only when user explicitly invokes Litigo on a tab
- `storage` — Local only, for rules and settings
- Host permissions — Restricted to supported chatbot domains only

**Android:**
- `SYSTEM_ALERT_WINDOW` — Only for floating overlay; explained during onboarding
- Accessibility service — Only for chatbot detection and response extraction; explicitly scoped
- Not requested: `READ_CONTACTS`, `READ_SMS`, `CAMERA`, `MICROPHONE`, location, etc.

**macOS:**
- Accessibility — Only for window/URL detection; clear explanation
- Not requested: Screen recording, microphone, camera, location, full disk access

**iOS:**
- "Allow Full Access" for keyboard — Only for clipboard analysis and optional sync; clearly explained
- Not requested: Location, camera, microphone, contacts, photos, health data

## Data Retention

### Local Data

- **Activity log:** Capped at last 1000 entries. User can clear at any time.
- **Rules:** Persisted until user deletes them.
- **Settings:** Persisted until user resets or uninstalls.
- **On uninstall:** All local data deleted (platform standard behavior).

### Cloud Data

- **Account data:** Retained while account is active.
- **Sync data:** Retained while account is active and sync is enabled.
- **Account deletion:** All cloud data deleted within 30 days. Backups purged within 90 days.
- **Analytics (if enabled):** Aggregated data retained for 90 days.

## Security Measures

### In Transit

- All network communication over TLS 1.3
- Certificate pinning for critical endpoints
- No fallback to unencrypted connections

### At Rest (Local)

- Android: Encrypted storage via Android Keystore
- iOS: Data protection API (NSFileProtection)
- Desktop: OS-level keychain for sensitive values; encrypted config files
- Chrome: `chrome.storage.local` (browser-level encryption if profile is locked)

### At Rest (Cloud)

- Database encryption at rest (AES-256)
- Volume-level encryption
- E2EE sync data additionally encrypted client-side

### Application Security

- No secrets in client-side code
- All external inputs sanitized
- Content Security Policy on website
- Wasm engine sandboxed
- Regular dependency vulnerability scanning
- Principle of least privilege for all services

## Transparency

### Privacy Policy

Clear, plain-language privacy policy that states:

1. What data Litigo collects (and what it doesn't)
2. Where data is processed
3. What data is sent to servers (and why)
4. What data is never sent
5. How optional sync works
6. How telemetry works (opt-in only)
7. User rights (access, export, deletion)
8. Contact information for privacy questions

### In-App Privacy Dashboard

Settings → Privacy shows:

- Current data processing mode (local-only / sync-enabled)
- Whether telemetry is enabled
- Local storage usage breakdown
- Option to export all local data
- Option to clear all local data
- Link to full privacy policy

## Third-Party Services

### Authentication

- **Provider:** Proprietary auth or established provider (e.g., Auth0, Firebase Auth)
- **Data shared:** Email, password hash, session tokens
- **Data NOT shared:** Rules, conversation content, activity

### Payment Processing

- **Provider:** Stripe or similar established payment processor
- **Data shared:** Payment method tokens, subscription plan, billing email
- **Data NOT shared:** Rules, conversation content, activity, usage patterns

### Email

- **Provider:** Transactional email service (e.g., SendGrid, Postmark)
- **Data shared:** Email address, transactional email content (welcome, password reset, receipts)
- **Data NOT shared:** Rules, conversation content, activity

## Compliance

### GDPR

- Right to access: User can export all local data
- Right to deletion: User can delete account and all associated data
- Right to data portability: Export format is JSON (standard, parseable)
- Lawful basis: Contract (for paid service) / Consent (for optional features)
- Data Processing Agreements: With all sub-processors

### CCPA/CPRA

- Do Not Sell: Litigo does not sell personal data
- Opt-out of analytics: Settings toggle
- Access and deletion rights supported

### HIPAA

- **Not currently HIPAA compliant**
- Litigo should not be used for Protected Health Information (PHI)
- Future: Potential HIPAA-compliant plan with BAA

## Independent Audit

Goal: Annual independent security audit covering:

- Architecture review
- Penetration testing
- Cryptography review
- Privacy controls verification
- Open source dependency audit

Audit results published (redacted where necessary) on the Litigo website.
