<!-- SYNOPSIS: Direct install (no App Store / Play Store) -->

# Direct install (no App Store / Play Store)

**Install page (share this link):** `/install`  
Production: **https://robust-magic-production.up.railway.app/install**

This is a **real app download**, not “open in browser” — once the APK/IPA is built and deployed to `public/downloads/`.

---

## Android (easiest — true tap-to-download)

### Option A — GitHub Actions (no Android Studio on your Mac)

1. Push includes `android/` + `.github/workflows/build-lifeos-android.yml`.
2. **Actions → Build LifeOS Android APK → Run workflow** (or auto-runs on `android/**` changes to `main`).
3. Workflow builds debug APK, commits `public/downloads/lifeos.apk`, pushes → Railway deploys.
4. On the phone: open **`/install`** → **Download LifeOS.apk** → Install.

Artifact also available under the workflow run (30-day retention) if you need the APK before deploy finishes.

### Option B — Local build

1. On a machine with **Android Studio** installed:
   ```bash
   npm run mobile:add:android   # once
   npm run mobile:build:android
   ```
2. Deploy to Railway (`git add -f public/downloads/lifeos.apk` — file is gitignored but force-add works).
3. On the phone: open **`/install`** → **Download LifeOS.apk** → Install.

No Play Store. User may need to allow “Install unknown apps” for their browser.

---

## iPhone (direct install — no App Store, but Apple rules apply)

Apple **does not** allow random `.ipa` links without signing. We use **ad-hoc OTA install**:

1. **Apple Developer account** ($99/yr)
2. Register each iPhone **UDID** in developer.apple.com
3. Xcode → Archive → **Ad Hoc** → export `.ipa`
4. ```bash
   LIFEOS_IPA=/path/to/LifeOS.ipa npm run mobile:build:ios:adhoc
   ```
5. Deploy `lifeos.ipa`, `lifeos-ios.plist`, `release.json` (`ios.available: true`)
6. User opens **`/install`** → **Install LifeOS on iPhone**

This is **not** the App Store. It is **not** a scam sideload — it is the standard enterprise/ad-hoc channel Apple allows for registered devices (up to 100/year on standard accounts).

**Until IPA is built:** Safari → `/lifeos` → Add to Home Screen.

---

## Enterprise (optional later)

Apple Enterprise Program ($299/yr) allows wider internal distribution without listing every UDID — for staff/family at scale.

---

## Files

| File | Purpose |
|------|---------|
| `public/overlay/lifeos-install.html` | Install UI |
| `public/downloads/release.json` | What’s available |
| `public/downloads/lifeos.apk` | Android binary (after build) |
| `public/downloads/lifeos.ipa` | iOS binary (after Xcode export) |
| `public/downloads/lifeos-ios.plist` | OTA manifest for iPhone |
| `routes/public-routes.js` | `/install`, `/download/*` |

@ssot docs/projects/AMENDMENT_37_UNIVERSAL_OVERLAY.md
