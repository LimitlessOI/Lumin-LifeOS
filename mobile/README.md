<!-- SYNOPSIS: LifeOS Native Shell (Capacitor) -->

# LifeOS Native Shell (Capacitor)

Hybrid iOS + Android app wrapping LifeOS for home-screen icon, background audio entitlement, and future always-on listening.

## Prerequisites

- Node 20+
- **iOS:** Xcode + CocoaPods (Mac only)
- **Android:** Android Studio + SDK

## First-time setup

```bash
npm install
npm run mobile:sync
```

## iOS (Adam's iPhone)

```bash
npm run mobile:ios
```

In Xcode: enable **Background Modes → Audio** for ambient listening when app is backgrounded (full closed-app mic still requires OS permission prompts — user must opt in via Lumen onboarding).

## Android (when device arrives)

```bash
npm run mobile:android
```

Grant **microphone** and **ignore battery optimizations** when prompted for reliable scheduled listening.

## Production URL

Default loads Railway production. Override in `capacitor.config.json` → `server.url` for local dev:

```json
"server": { "url": "http://YOUR_LAN_IP:3000" }
```

## Privacy

- Audio clips: **IndexedDB on device** (`lifeos-local-vault.js`) unless user opts into cloud in Listening Profile.
- Preferences sync: `/api/v1/lifeos/listening/profile` (JSON only — no audio).

## Related

- Conversational setup: `/overlay/lifeos-listening-setup.html`
- Orchestrator: `public/shared/lifeos-listening-orchestrator.js`
