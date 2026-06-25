<!-- SYNOPSIS: Direct install (no App Store / Play Store) -->

# Direct install (no App Store / Play Store)

**Install page (share this link):** `/install`  
Production: **https://robust-magic-production.up.railway.app/install**

This is a **real app download**, not “open in browser” — once the APK/IPA is built and deployed to `public/downloads/`.

---

## iPhone — install today (Add to Home Screen)

**This works on your iPhone right now** — no App Store, no Xcode, no waiting for Android.

1. Open **Safari** (not Chrome): **https://robust-magic-production.up.railway.app/install**
2. Tap **Open LifeOS in Safari** → sign in if asked
3. Tap **Share** (square with arrow at bottom)
4. **Add to Home Screen** → **Add**
5. Open **LifeOS** from your home screen — full-screen app, same universal overlay

The home-screen icon loads `/lifeos` with mobile layout. Updates deploy from Railway automatically (no App Store review cycle).

---

## iPhone — signed .ipa later (no App Store)

Apple **does not** allow unsigned `.ipa` downloads. When you have an **Apple Developer account** ($99/yr):

1. Register your iPhone **UDID** at developer.apple.com
2. Add GitHub secrets: `IOS_P12_BASE64`, `IOS_P12_PASSWORD`, `IOS_PROFILE_BASE64`, `APPLE_TEAM_ID`
3. **Actions → Build LifeOS iOS IPA → Run workflow**
4. User opens **`/install`** → **Install LifeOS on iPhone** (OTA link)

**Until IPA is built:** use **Add to Home Screen** (above).

---

## Android (tap-to-download APK)

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
