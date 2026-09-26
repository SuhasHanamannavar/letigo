# Deployment Guide

## Website (Vercel)

The Litigo marketing website is built with Next.js and configured for Vercel deployment.

### Prerequisites

- GitHub account with the Litigo repository
- Vercel account

### Steps

1. **Push repository to GitHub** (if not already there)

2. **Import project in Vercel:**
   - Go to https://vercel.com/new
   - Select the Litigo repository
   - Framework preset: Next.js (auto-detected)

3. **Configure build settings:**
   - Build command: `cd apps/web && npm run build` (or as configured in root)
   - Output directory: `apps/web/.next`
   - Install command: `npm install`

4. **Set environment variables (optional):**
   - Only needed if using cloud features (auth, subscription, sync)
   - Local development works without any cloud variables

5. **Deploy**

6. **Configure custom domain (optional):**
   - Go to project settings → Domains
   - Add your domain (e.g., litigo.ai)
   - Update DNS records as instructed

### Vercel Configuration

`vercel.json` at repository root:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build:web",
  "outputDirectory": "apps/web/.next",
  "framework": "nextjs",
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

### SEO Configuration

Ensure the following are configured in the Next.js app:

- **Metadata API** — Title, description, Open Graph, Twitter cards
- **robots.txt** — Generated via Next.js robots file
- **sitemap.xml** — Generated via Next.js sitemap file
- **Structured data** — JSON-LD for SoftwareApplication
- **Favicon** — Multiple sizes in `/public`

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Yes | Canonical URL for metadata |
| `AUTH_SECRET` | No | Cloud authentication |
| `STRIPE_SECRET_KEY` | No | Payment processing |
| `DATABASE_URL` | No | Cloud database (auth only) |

---

## Chrome Extension Distribution

### Chrome Web Store

1. **Build the extension:**
   ```bash
   cd apps/chrome-extension
   npm run build
   ```

2. **Create ZIP:**
   ```bash
   cd dist
   zip -r ../litigo-extension.zip .
   ```

3. **Upload to Chrome Web Store Developer Dashboard:**
   - Go to https://chrome.google.com/webstore/devconsole
   - Create new item or update existing
   - Upload ZIP
   - Fill in store listing details
   - Submit for review

### Distribution via Website

For direct installation (developer mode):

1. Host the ZIP on the website download page
2. Provide clear instructions for loading unpacked extension
3. Note: This is for development/testing only. Most users should use Chrome Web Store.

---

## Desktop Distribution

### Windows

**Build:**
```bash
cd apps/desktop
npm run tauri build
```

**Output:**
- `src-tauri/target/release/bundle/msi/Litigo_<version>_x64_en-US.msi`
- `src-tauri/target/release/bundle/nsis/Litigo_<version>_x64-setup.exe`

**Code Signing:**
- Purchase Windows code signing certificate (e.g., DigiCert, Sectigo)
- Configure in `tauri.conf.json` under `bundle.windows`
- Sign the installer and executable

**Distribution:**
- Host `.msi` and `.exe` on website download page
- Provide SHA-256 checksums for verification
- Auto-update via Tauri updater

### macOS

**Build:**
```bash
cd apps/desktop
npm run tauri build
```

**Output:**
- `src-tauri/target/release/bundle/dmg/Litigo_<version>_aarch64.dmg`
- `src-tauri/target/release/bundle/macos/Litigo.app`

**Code Signing & Notarization:**
- Apple Developer ID certificate required
- Configure in `tauri.conf.json` under `bundle.macos`
- Notarize via `notarytool` (Xcode 13+)
- Staple the ticket to the `.dmg`

**Distribution:**
- Host `.dmg` on website download page
- Provide SHA-256 checksums
- Optionally distribute via Mac App Store (note sandbox restrictions)

---

## Android Distribution

### Direct APK Download

**Build signed release APK:**
```bash
cd apps/android
./gradlew assembleRelease
```

**Signing configuration** in `~/.gradle/gradle.properties`:
```properties
RELEASE_STORE_FILE=/path/to/keystore.jks
RELEASE_STORE_PASSWORD=your_keystore_password
RELEASE_KEY_ALIAS=your_key_alias
RELEASE_KEY_PASSWORD=your_key_password
```

**Output:**
- `app/build/outputs/apk/release/litigo-android-release.apk`

**Distribution:**
- Host APK on website download page
- Provide SHA-256 checksum
- Provide installation instructions (enable "Unknown sources" or "Install unknown apps")

### Google Play Store

**Build App Bundle:**
```bash
./gradlew bundleRelease
```

**Output:**
- `app/build/outputs/bundle/release/litigo-android-release.aab`

**Distribution:**
- Upload to Google Play Console
- Configure store listing
- Internal testing → Closed testing → Open testing → Production
- App signing by Play Console recommended

---

## iOS Distribution

### App Store

**Prerequisites:**
- Apple Developer Program membership ($99/year)
- Xcode 15+
- App Store Connect access

**Steps:**

1. **Archive in Xcode:**
   - Open `apps/ios/Litigo.xcodeproj`
   - Select "Any iOS Device (arm64)" as target
   - Product → Archive

2. **Distribute:**
   - Open Organizer (Window → Organizer)
   - Select archive → Distribute App
   - Choose "App Store Connect" → "Upload"
   - Follow prompts to upload

3. **Configure in App Store Connect:**
   - Fill in app metadata
   - Upload screenshots and app preview
   - Set pricing and availability
   - Submit for review

### TestFlight

- Uploaded builds automatically appear in TestFlight
- Add internal and external testers
- Collect feedback before public release

---

## Cross-Platform Release Checklist

### Pre-Release

- [ ] All builds compile without errors
- [ ] Unit tests pass
- [ ] Lint passes
- [ ] Type check passes
- [ ] Design system QA — spacing, typography, colors, alignment
- [ ] Empty states implemented
- [ ] Error states implemented
- [ ] Loading states implemented
- [ ] Permission flows tested
- [ ] Privacy policy updated
- [ ] Terms of service updated
- [ ] Release notes drafted
- [ ] Version numbers bumped across all platforms
- [ ] Changelog updated

### Release

- [ ] Tag release in Git: `vX.Y.Z`
- [ ] Build and sign all artifacts
- [ ] Generate SHA-256 checksums
- [ ] Upload artifacts to download server
- [ ] Update website download page
- [ ] Submit Chrome Web Store update
- [ ] Submit Google Play update
- [ ] Submit App Store update
- [ ] Deploy website to Vercel
- [ ] Verify website production build
- [ ] Verify all download links work

### Post-Release

- [ ] Monitor error reporting
- [ ] Monitor user feedback channels
- [ ] Verify auto-update (desktop)
- [ ] Update documentation
- [ ] Announce release (if applicable)

---

## CI/CD (GitHub Actions)

Example workflow files in `.github/workflows/`:

### `ci.yml` — Run on every push

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
  build-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run build:web
```

### `release.yml` — Run on version tag

```yaml
name: Release
on:
  push:
    tags: ['v*']
jobs:
  build-extension:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run build:extension
      - uses: actions/upload-artifact@v4
        with:
          name: chrome-extension
          path: apps/chrome-extension/dist/*.zip
  build-desktop:
    strategy:
      matrix:
        os: [windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - uses: dtolnay/rust-toolchain@stable
      - run: npm run build:desktop
      - uses: actions/upload-artifact@v4
        with:
          name: desktop-${{ matrix.os }}
          path: apps/desktop/src-tauri/target/release/bundle/
```

---

## Infrastructure

### Cloud Services (Optional)

If implementing cloud features:

- **Authentication:** Auth0, Firebase Auth, or custom
- **Database:** PostgreSQL (for auth/subscription only)
- **Object Storage:** For sync ciphertext blobs
- **CDN:** Cloudflare or Vercel Edge
- **Email:** SendGrid or Postmark for transactional email
- **Payment:** Stripe

### Security Checklist

- [ ] All secrets in environment variables / GitHub Secrets
- [ ] No credentials in source code
- [ ] No credentials in Git history
- [ ] TLS everywhere
- [ ] Security headers configured
- [ ] CSP configured on website
- [ ] Dependency scanning enabled
- [ ] Regular dependency updates
- [ ] Backup strategy in place
- [ ] Access logging enabled
- [ ] Principle of least privilege applied to all services

---

## Rollback Procedure

If a release introduces critical issues:

### Website
- Vercel → Deployments → Select previous working deployment → "Promote to Production"

### Chrome Extension
- Chrome Web Store Developer Dashboard → Previous version → "Publish"

### Desktop
- Disable auto-update server
- Point download page to previous installer
- Users can manually reinstall previous version

### Android
- Google Play Console → Release → Releases overview → Select previous release → "Rollout to production"

### iOS
- App Store Connect → Previous build → "Release this version" (if approved)
- Or submit expedited review request for hotfix
