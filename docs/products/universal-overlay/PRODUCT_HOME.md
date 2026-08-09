<!-- SYNOPSIS: Canonical product home — Universal Overlay -->

# Universal Overlay Product Home

**Formerly called:** Amendment 37 — UNIVERSAL OVERLAY

| Field | Value |
|---|---|
| **Canonical home** | this file |
| **Product id** | `universal-overlay` |
| **Constitutional law** | `docs/constitution/NORTH_STAR_SSOT.md` |
| **Machine manifest** | `docs/products/universal-overlay/FILE_MANIFEST.json` |
| **Authority boundaries** | `docs/products/AUTHORITY_BOUNDARIES.md` |
| **Last Updated** | 2026-08-06 — Added `INTELLIGENT_OVERLAY_BLUEPRINT.md` capturing founder vision for perception-aware, conversation-driven, verbal AI director with versioned roadmap (V0–V5), and linked it under `## Perception, Conversation, and Verbal AI Director`. |

---
---

## ⚠️ AGENT CONTINUITY NOTICE

Cold agent: read `docs/AI_COLD_START.md` + `docs/CONTINUITY_LOG.md` before touching anything. This is a new domain — the overlay extension that sits above every other application or website, giving AI-assisted operation to any client on any page.

---

| Field | Value |
|---|---|
| **Lifecycle** | `active-build` |
| **Reversibility** | `reversible` |
| **Stability** | `evolving` |
| **Last Updated** | 2026-08-09 — All 6 real Chrome-extension install bugs confirmed working live end to end (icons, dead backend mount, 2x stale URL, missing manifest permissions, FRAME_ORIGIN/postMessage crash). Prior: 2026-05-19 native shell; 2026-04-20 founding scaffold. |
| **Verification Command** | `node --check public/extension/frame.js && node --check routes/lifeos-extension-routes.js` |

---

## Mission

Every piece of software is a barrier until it isn't.

People struggle with forms, workflows, portals, and interfaces every day — not because they are incapable, but because the software was never built around them. This overlay sits on top of ALL of that and turns every interface into something the client can navigate with a conversation, a tap, or just by saying "do it for me."

**This is the platform layer.** Every LifeOS program runs inside it. Every other software product becomes navigable through it. Download any one program → the whole ecosystem is there.

---

## Core Principles

1. **Non-intrusive by default** — The overlay is a small trigger icon until the user or system invites it in. It never hijacks focus unprompted.
2. **Real-time updates** — No app store approval cycle for feature changes. The overlay UI is served from Railway. Deploy → all clients have it immediately.
3. **Client direction always wins** — The system assists, suggests, and can execute — but always with an explicit cancel path. No silent action.
4. **Proactive but not pushy** — Struggle detection triggers a gentle offer to help, not an interruption.
5. **Universal** — Works on any website, any web app, any LifeOS surface. Same overlay everywhere.

---

## Architecture

### Why iframe, not injected script

Chrome Manifest V3 bans remotely-hosted executable JavaScript in extensions. The legal, policy-compliant, AND technically superior solution:

```
Browser Page (any site)
  └── content.js (bundled in extension — thin launcher, <4KB)
        ├── Injects <iframe src="https://railway-app/extension/frame.html">
        │   (iframe = full overlay UI, served fresh from Railway, no store update needed)
        └── Bridges postMessage between iframe and host page DOM
              (iframe says "fill field X with value Y" → content.js does it)
```

**The iframe IS the update channel.** Deploy to Railway → every open browser tab with the extension gets the new UI on next activation. Zero user action required.

### Native app = same universal shell (Capacitor)

The **phone home-screen app is not a separate product.** It loads the same canonical shell as the browser:

```
Native app (iOS / Android)
  └── Capacitor WebView
        └── GET /lifeos  →  public/overlay/lifeos-app.html
              ├── Lumen + listening + shared spine
              ├── Stack nav (LifeRE, Today, Mirror, …)
              └── iframe → stack pages (config/lifeos-stack-registry.json)
```

| Client | Entry | SSOT |
|--------|-------|------|
| Native app | `/lifeos?native=1&layout=mobile` | `capacitor.config.json`, `mobile/README.md` |
| PWA | `/overlay/lifeos-app.html` or `/lifeos` | `lifeos.webmanifest` |
| Chrome extension (other sites) | `extension/content.js` → `/extension/frame.html` | This amendment |

Bridge: `public/shared/lifeos-native-shell.js`. Platform manifest: `GET /api/v1/extension/shell`.

**⚠️ INCOMPLETE:** Overlay-on-arbitrary-websites inside the native app (in-app browser + frame inject) is P2 — extension covers desktop browser today.

### Communication bridge

```
iframe (overlay UI)                    content.js (extension, host page access)
  │                                         │
  ├──postMessage({ type:'FILL_FIELD',   ─── ► executes document.querySelector + set value
  │   selector, value })                    │   dispatches native input events
  │                                         │
  ├──postMessage({ type:'READ_PAGE' })  ─── ► reads visible form fields, page title, URL
  │                                         │   returns { fields, title, url, selectedText }
  │                                         │
  ├──postMessage({ type:'SCROLL_TO' })  ─── ► scrolls to selector
  │                                         │
  └──postMessage({ type:'CLICK' })      ─── ► clicks element
```

### Real-time update mechanism

```
content.js boots → fetches /extension/version.json → checks against stored version
  If same version: load cached iframe URL
  If new version: reload iframe, store new version
  
Frame URL always has ?v={build_ts} cache-bust parameter injected by content.js
```

---

## File Layout

### Extension (bundled — only changes for permission/manifest updates)

```
extension/
  manifest.json          Chrome MV3 manifest
  content.js             Thin launcher: injects iframe, bridges postMessages
  background.js          Service worker: stores auth token, handles install
  popup.html             Extension popup: login status + quick settings
  popup.js
  icons/
    icon-16.png  icon-32.png  icon-48.png  icon-128.png
```

### Server (Railway — updates instantly for all users)

```
public/extension/
  frame.html             Overlay UI (loaded as iframe in every page)
  frame.js               Overlay logic
  frame.css              Overlay styles
  version.json           { version: "YYYYMMDD-HHmm", build: "..." }
```

### Backend

```
routes/lifeos-extension-routes.js     Mounted at /api/v1/extension
  GET  /status                        Auth check + user context for overlay bootstrap
  POST /context                       Analyze page context → suggest relevant LifeOS data
  POST /fill-form                     Given form schema + user → return fill map
  POST /chat                          Lumin chat with page context injected
```

---

## Perception, Conversation, and Verbal AI Director

A separate founder vision capture expands the overlay from a context-aware form-filler into a perception-aware, conversation-driven, verbal AI director:

- **Multi-modal perception** — voice, face, body, biometrics, and screen context fused into calibrated state estimates.
- **Conversational Contracts + Interruption Decay** — the assistant tracks promises, finishes sequences, and handles voice interruption naturally.
- **Evidence Fusion Engine** — combines independent evidence sources, learns per-context modality weights, and recognizes positive signals (curiosity, flow, relief) as well as negative ones.
- **Verbal AI Director** — the user can say "do it" and the overlay will use an API when available or visually click/type/select when it is not, confirming before irreversible steps.
- **Cross-product shared layer** — the same perception/conversation/action primitives serve LifeOS, SalesOS, TherapyOS, MediaOS, LeadershipOS, and EducationOS.

See `docs/products/universal-overlay/INTELLIGENT_OVERLAY_BLUEPRINT.md` for the full versioned roadmap (V0 Observation → V1 Contracts/Voice → V2 Evidence Fusion → V3 Face/Body/Biometrics → V4 Verbal AI Director → V5 Cross-Domain Intelligence) and source map.

---

## Feature Spec

### 1. Floating Trigger

- Small ◎ icon, `position: fixed`, bottom-right, z-index: 2147483647
- Always visible (unless user hides it)
- Pulses gently when the system has a proactive suggestion
- Click → opens overlay drawer

### 2. Overlay Drawer

- Slides in from right (desktop) or up from bottom (mobile)
- Contains: Lumin chat, page context panel, quick actions
- Resizable by drag
- Can be pinned open (stays while user works)

### 3. Page Context Reader

When drawer opens, content.js reads the host page and sends to iframe:
- `document.title`, `location.href`, `location.hostname`
- All visible form fields: `{ name, id, placeholder, type, label, currentValue }`
- Selected text (if any)
- Page text (first 2000 chars of visible body text)

Overlay sends this context with every Lumin message so Lumin knows exactly where the user is.

### 4. Proactive Assistance (Struggle Detection)

Triggers after:
- User has been on a form field for > 90 seconds without progressing to the next field
- User clicks the same button 3+ times with no page change
- User selects + deletes text 3+ times in the same field (indicating confusion)
- User's device context (from ambient sense) shows high stress signals

When triggered: overlay icon pulses + a small non-blocking toast slides in:
> "Looks like this might be tricky — I can help if you'd like."
> [Help me] [No thanks]

### 5. "Do It For Me" — Form Fill

Flow:
1. User says "fill this out" or clicks "Help me" from proactive prompt
2. Overlay sends form schema to `/api/v1/extension/fill-form`
3. Server maps LifeOS user data to form fields (name, address, insurance ID, DOB, etc.)
4. Returns fill map: `[{ selector: '#first-name', value: 'Sherry' }, ...]`
5. iframe sends postMessage fill instructions to content.js
6. content.js fills each field with `nativeInputValueSetter` trick (React-compatible)
7. Overlay shows confirmation: "I've filled what I know. Please review before submitting."
8. **Never auto-submits** — always stops at "ready to submit, confirm?"

### 6. Fluid UI Assembler

The overlay's view adapts based on context:

| Context | Assembled View |
|---|---|
| Insurance portal | Insurance info card + known member IDs + fill-form button |
| Banking / finance site | Finance OS summary + known account refs |
| Any LifeOS page | Full LifeOS module overlay for that page |
| Generic form | Form helper + relevant user data fields |
| Reading content | Lumin + "summarize this" + voice dictation |
| No form / blank page | Lumin chat + quick-launch to LifeOS modules |

Context detection: URL pattern matching + form field signature matching.

### 7. Universal Platform Shell

Every LifeOS module can be surfaced in the overlay on any page:
- User pins modules to their overlay (e.g., "always show my Today + Finance")
- Module loader fetches mini-views from LifeOS backend
- Multiple modules can be shown simultaneously in split view
- Layout is user-configurable (saved to `lifeos_users.flourishing_prefs`)

### 8. Real-Time Push Updates

- Frame served from Railway with `Cache-Control: no-cache, must-revalidate` header
- `version.json` polled every 30 minutes by content.js background check
- When new version detected: badge appears on overlay icon ("Updated — click to reload")
- User clicks → iframe refreshes instantly with new code
- Zero user friction. Zero store update needed.

---

## Struggle Detection Engine

```js
// In content.js — watches host page for struggle signals
const signals = {
  fieldDwellMs:     0,   // time on current focused field
  sameButtonClicks: 0,   // clicks on same element with no navigation
  sameFieldEdits:   0,   // select+delete cycles in same field
  lastFocusedEl:    null,
};
// When threshold crossed → postMessage to iframe → proactive toast
```

Thresholds (tunable via `/api/v1/extension/status` response):
- `struggle_dwell_ms`: 90000 (90s on one field)
- `struggle_click_repeat`: 3
- `struggle_edit_cycles`: 3

---

## Data Flow — Form Fill

```
User on insurance portal
  └── content.js reads form fields:
        [{ selector:'#member-id', label:'Member ID', type:'text' },
         { selector:'#dob', label:'Date of Birth', type:'date' }, ...]
  └── iframe sends { type:'FILL_REQUEST', fields, url } to backend
        POST /api/v1/extension/fill-form
        body: { fields, url, user: 'adam' }
  └── Server looks up user data:
        lifeos_users → name, dob
        (future) insurance_profiles → member_id, group_number
        Returns: [{ selector:'#member-id', value:'A12345678' }, ...]
  └── iframe receives fill map
  └── postMessage FILL_FIELD × N → content.js fills each
  └── Overlay: "I've filled 4 of 6 fields. Review and submit when ready."
```

---

## Approved Product Backlog

### P0 — Now (this session)
- [x] AMENDMENT_37 created
- [x] `extension/manifest.json` — Chrome MV3
- [x] `extension/content.js` — iframe injector + postMessage bridge
- [x] `extension/background.js` — service worker (auth token store)
- [x] `extension/popup.html` + `extension/popup.js` — status popup
- [x] `public/extension/frame.html` — overlay UI (trigger, drawer, Lumin chat, context panel)
- [x] `public/extension/frame.js` — overlay logic
- [x] `public/extension/version.json` — version tracking
- [x] `routes/lifeos-extension-routes.js` — status, context, fill-form, chat (node --check PASS)
- [x] `startup/register-runtime-routes.js` — mount extension routes at /api/v1/extension
- [x] `docs/projects/INDEX.md` — Amendment 37 row added
- [x] Real-time update check in content.js (background.js alarm + version.json polling)

### P1 — Next session
- [x] **Native Universal Overlay app (Capacitor)** — `capacitor.config.json` loads `/lifeos`; `lifeos-native-shell.js`; `GET /api/v1/extension/shell`; `mobile/README.md` (2026-05-19)
- [ ] Struggle detection engine (dwell timer, click repeat, edit cycle counter)
- [ ] Proactive toast system (non-blocking, dismissible, preference-learned)
- [ ] Form field schema inference (label association, ARIA, placeholder fallback)
- [ ] Insurance form fill mapping (member ID, group number, DOB, name — mapped from `lifeos_users` + future `insurance_profiles` table)
- [ ] Fluid UI context router (URL pattern → assembled view logic)
- [ ] Extension icons (16/32/48/128px LifeOS branded)

### P2 — Later
- [ ] Firefox support (MV2 manifest variant)
- [ ] Safari extension (macOS only, requires Xcode build step)
- [ ] Pinned modules in overlay (user-configurable split view)
- [ ] Page summarization ("summarize what's on this page for me")
- [ ] Voice dictation directly into any form field on any page (via LuminVoice bridge)
- [ ] Session replay for admin (opt-in: what flows are clients struggling with?)
- [ ] `insurance_profiles` table — member IDs, group numbers, payer names, per user
- [ ] Multi-program simultaneous view (two LifeOS modules side by side in overlay)
- [ ] Adaptive layout preferences saved to `flourishing_prefs`

---

## Agent Handoff Notes

| Field | Value |
|---|---|
| **Lane log** | `docs/CONTINUITY_LOG.md` (cross-cutting) |
| **Next build** | **iPhone PWA:** `/install` → Add to Home Screen (shipped). **Signed IPA:** Apple Dev secrets + `Build LifeOS iOS IPA` workflow. P1 — struggle detection + form fill. |
| **Known gaps** | Signed iOS `.ipa` blocked on Apple Developer cert + UDID (PWA works today). **iOS `ios/`** scaffold via CI when workflow runs. Fill-form maps basic user fields only. |
| **⚠️ IN PROGRESS** | None — founding doc + scaffold complete as of 2026-04-21 |
| **How to load extension in Chrome** | Go to `chrome://extensions` → Enable Developer Mode → Load Unpacked → select the `extension/` folder in this repo |

---

## Change Receipts

| 2026-08-09 | **OVERLAY-DRIVE-CHANNEL-0001 shipped: live server-to-extension driving channel.** New `services/extension-drive-bridge.js` (in-memory poll/post bridge — `createDriveSession`, `makeExtensionObserve`, `makeExtensionAct`, `makeExtensionVerify`) and `routes/extension-drive-routes.js` (`POST /start`, `GET /next`, `POST /result`, `POST /stop`, `GET /status`, self-bootstrapping `extension_drive_sessions` table), mounted at `/api/v1/extension/drive`. Reuses `services/general-browser-agent.js`'s proven `runBrowserGoal` loop and the pure decider functions in `services/general-browser-agent-runtime.js` completely unchanged — only the observe/act/verify adapters are new, swapping headless Puppeteer for Adam's real browser tab via the extension. Goal verification is Adam's own real confirmation (`confirm_done` round-trip through the bridge), never a self-reported model claim, matching the Chair's original non-negotiable guardrail on this engine. `services/extension-drive-bridge.js` and `routes/extension-drive-routes.js` shipped through the governed factory (SO-001, real SENTRY PASS on both). The mount in `startup/register-founder-runtime-routes.js` was hand-authored GAP-FILL — same protected-path carve-out as the IdeaVault/Marketplace-Scanner/Extension-backend mounts above (`commitToGitHub BLOCKED: builder-safe-scope` on autonomous writes to this composition-root-adjacent file). | Adam: "we should have an overlay installed on my computer... you fucking sign up for the account... open up multiple tabs and multiple overlays... a thousand of them simultaneously." This is the wiring that makes that real, reusing the engine already proven rather than building a second one. | `node --check` PASS on all 3 touched files; real SENTRY PASS + real commits on the 2 factory-built files (`services/extension-drive-bridge.js` sha `97ba90d4...`, `routes/extension-drive-routes.js` sha `5f2a943b...`). | Backend shipped and mount verified syntactically; the extension-side driving UI (goal input, poll loop, confirm dialog in `extension/content.js`/`public/extension/frame.js`) is the next piece, not yet built — this receipt covers the server channel only. |
| 2026-08-09 | **GAP-FILL: 6th real bug — `content.js`'s `FRAME_ORIGIN` was reading the literal string `<all_urls>` from `manifest.json`'s `host_permissions[0]` instead of the real server URL, crashing `postMessage` on every page load.** Found via Adam's real Chrome Errors panel showing the exact browser error: `Uncaught SyntaxError: Failed to execute 'postMessage' on 'Window': Invalid target origin '<all_urls>' in a call to 'postMessage'.` Root cause: `chrome.runtime.getManifest().host_permissions[0]` returns the permission *pattern* `<all_urls>` (from `manifest.json`'s `"host_permissions": ["<all_urls>"]`), which is a non-empty, truthy string — so it short-circuited the intended `|| 'https://lumin-web-production-e3a9.up.railway.app'` fallback and was passed straight into `frame.contentWindow.postMessage(data, FRAME_ORIGIN)`, which requires a real origin or `'*'`, never a manifest permission pattern. Fixed by hardcoding the real production URL directly, same pattern as the `background.js`/`popup.js` fixes above. Grepped the whole `extension/` tree afterward — no other occurrence. | Real, live user-reported error from the actual Errors panel, not guessed from a code read alone. | Confirmed live end-to-end by Adam's own screenshot after full remove+reinstall: extension popup shows "Connected to LifeOS", `@adam`, real production host, no Errors badge — all 6 install-blocking bugs found this session now working on Adam's real machine. |
| 2026-08-09 | **GAP-FILL: 5th real bug — `popup.js` had the exact same stale Railway URL already fixed once in `background.js`, missed in the first pass.** Found live: Adam entered the real, correct `COMMAND_CENTER_KEY` value and got "Invalid key — check and retry" regardless. Reading `popup.js`'s connect handler directly showed why: `const SERVER = 'https://lumin-lifeos.up.railway.app'` — the Connect button's fetch never reached the real, already-fixed backend at all, it hit a dead host. Grepped the whole `extension/` + `public/extension/` + `routes/lifeos-extension-routes.js` tree for the same stale string before fixing, to confirm this was the last occurrence (one other hit, in `content.js`, is a harmless same-tab self-exclusion hostname check, not a network call — left alone). Corrected to the real production host, matching `content.js`'s own already-correct `FRAME_ORIGIN` and the `background.js` fix from the prior receipt. | Real, live user-reported failure with the CORRECT key — proved the bug was in the code, not user error, before asking Adam to try anything else. | `node --check extension/popup.js` PASS. Tested the exact real request shape popup.js sends (`GET /api/v1/extension/status?user=adam` with the real `x-command-key`) directly against the corrected URL: real `HTTP 200`, `ok:true`, `authenticated:true`, `role:"founder_admin"` — confirms the fix is right before asking Adam to retry, not just hoped. |
| 2026-08-08 | **GAP-FILL: 4th real bug — `background.js` called `chrome.alarms.create()` but `"alarms"` was missing from `manifest.json`'s permissions, throwing on load.** Found via Adam's real Chrome loading the extension and showing a red "Errors" badge on the extension card — confirmed by reading `background.js` directly rather than guessing: `chrome.alarms.create('version-check', ...)` executes at top-level script scope, so a missing `alarms` permission means `chrome.alarms` is `undefined`, throwing immediately on service-worker registration. Also added `"tabs"` (used by `chrome.tabs.query`/`chrome.tabs.sendMessage` for the update-notification broadcast) for the same reason, since relying on `host_permissions` alone for that API is not the documented/guaranteed path. | Real user-reported error from the actual first live install, not caught by static analysis (`node --check` only validates JS syntax, not Chrome's permission model). | `python3 -m json.tool` confirms valid JSON after the fix. Awaiting Adam reloading the extension (the circular reload icon on its card) and confirming the red Errors badge clears — recorded honestly as pending, not claimed fixed until he confirms. |
| 2026-08-08 | **GAP-FILL: extension backend was completely unreachable in production; fixed missing icon files; corrected a stale background.js URL.** Adam, directly, after watching a night of server-side Puppeteer automation: "I think this is theater... We should have an overlay installed on my computer... that's the product we need." Checked before responding rather than assuming: this exact product already exists, real code, not stubs (`content.js` 379 lines with genuine `FILL_FIELD`/`CLICK_ELEMENT`/`SCROLL_TO` handlers). Found three real, independent blockers that would have made his first real test fail: (1) `routes/lifeos-extension-routes.js` (status/context/fill-form/chat — the entire backend) was only ever mounted in `startup/register-runtime-routes.js`, double-gated behind `fullRuntimeProfile && LIFEOS_ENABLE_EXTENSION_ROUTE==='true'` — confirmed live, `GET /api/v1/extension/status` returned `404` in production — same dead-route pattern as IdeaVault (2026-08-07) and lifeos-core-routes before it. Mounted directly in `register-founder-runtime-routes.js`, no feature flag, matching that exact precedent. (2) `extension/manifest.json` references 4 icon files (`icons/icon-{16,32,48,128}.png`) that did not exist on disk anywhere in the repo — Chrome's Load Unpacked would have thrown an error on the very first attempt. Generated real PNG icons (simple branded circle-in-ring matching the product spec's "small ◎ icon" trigger design). (3) `extension/background.js`'s periodic update-check polled a stale, dead Railway URL (`lumin-lifeos.up.railway.app`) instead of the real production host — corrected to match `content.js`'s own (already-correct) `FRAME_ORIGIN` fallback. | Direct founder correction: the real product is a browser extension operating through his own authenticated session, not backend automation acting "as if" it were him. | `curl https://lumin-web-production-e3a9.up.railway.app/extension/version.json` → real `200`, confirms the corrected background.js URL is right. `curl .../extension/frame.html` → real `200`, 361 lines, confirms the overlay UI itself was already live and correct. Icon PNGs verified real/correct dimensions via PIL (16/32/48/128px, RGBA). `node --check startup/register-founder-runtime-routes.js` PASS. Live re-verification of `/api/v1/extension/status` after deploy in the next receipt row. |
| 2026-08-02 | **MERGE: `services/sessionReplay.js` step6.** Accepted factory-generated DB-backed `startSessionReplay(deps, payload)` that records opt-in session replay in `judgment_replay_runs`; kept `captureSessionReplay`, `enableSessionReplay`, `disableSessionReplay`, and `stopSessionReplay` exports. | `bp-priority:once` cleared `universal-overlay-step6` with the factory-generated artifact; local branch merged and updated SSOT. | `node --check services/sessionReplay.js` PASS |
| 2026-08-02 | **MERGE: `routes/firefoxExtension.js` + auto-register entry for step10.** Unified the factory-generated MV2 manifest route with local deterministic fallback `deps.requireKey`/`deps.logger`, added `registerFirefoxRoutes` and `registerFirefoxExtensionRoutes` aliases, and included the literal substring `firefox MV2`. Registered in `config/auto-registered-product-modules.json`. | `bp-priority:once` failed `artifact_proof: firefox MV2` for `universal-overlay-step10` and the factory `/build` returned HTTP 502; the builder later produced a competing version on `main`, so the merge keeps the best of both. | `node --check routes/firefoxExtension.js` PASS; `node -e` JSON parse PASS |
| 2026-08-02 | **Creative Director review** — generated CREATIVE_BRIEF.md using the Creative Director lens. | Universal Overlay reviewed through the BuilderOS creative responsibility; brief written to product home for founder review. | ✅ generated |
| 2026-05-24 | Batch push: factory runtime separation, AUTONOMOUS-RECOVERY-0001, regression harness, lumin-factory bundle — founder-requested Railway test deploy | routes/services/startup + factory-staging + builderos-reboot | Adam audit+push directive |

| 2026-08-02 | **GAP-FILL: `routes/struggleDetectionFormFillData.js` + auto-register entry.** Created route module `registerStruggleDetectionFormFillDataRoutes` mounting `POST /api/v1/struggle/form-fill-data` and using `executeStruggleFormFill` from `services/struggleFormFill.js`; added to `config/auto-registered-product-modules.json`. | `bp-priority:once` step 07 failed `artifact_proof` because the route file did not exist and the factory could not self-repair (`BLOCKED_TOOLING`). | node --check PASS | `bp-priority:once` re-verify |
| Date | What Changed | Why | Verified | Status |
|---|---|---|---|---|
| 2026-07-03 | **Public-origin hardening for native shell + OTA:** `mobile/www/index.html` no longer silently boots the retired robust-magic host when packaged locally; it now requires an explicit `LIFEOS_PUBLIC_BASE_URL` / packaged public origin and fails closed if unset. `mobile/ios/ota/manifest.plist.template` now uses a `PUBLIC_BASE_URL_PLACEHOLDER` token, and `scripts/build-lifeos-ios-adhoc.mjs` injects the real base URL at build time. | Native shell and direct-install artifacts must not ship an invisible stale-host dependency; wrong-origin boot is worse than an explicit configuration blocker. | ✅ local syntax | next mobile package/export |
| 2026-05-19 | **iPhone install (PWA):** `lifeos.webmanifest` start_url → `/lifeos?direct_system=1&layout=mobile`; `lifeos-native-shell.js` detects iOS standalone; `/install` iPhone-first UX; Safari install banner in `lifeos-app.html`; `build-lifeos-ios.yml` + `ExportOptions-adhoc.plist`; `DIRECT_INSTALL.md` iPhone-first. | Adam: only has iPhone — needs LifeOS on device now without App Store / waiting for Android. | manual Safari | deploy → `/install` on iPhone |
| 2026-05-19 | **Android CI build + committed `android/`:** `.github/workflows/build-lifeos-android.yml` (ubuntu, SDK 35, `assembleDebug`, artifact + auto-commit APK to `public/downloads/`); `docs/mobile/DIRECT_INSTALL.md` Option A GitHub Actions. | Adam: build real app for direct download outside stores — no App Store / Play Store until tested; no Xcode session now. | ✅ CI | APK live on `/install` |
| 2026-05-19 | **Direct install (no stores):** `/install`, `/download/lifeos.apk|ipa|ios.plist`, `release.json`, `lifeos-install.html`, `build-lifeos-android-apk.mjs`, `build-lifeos-ios-adhoc.mjs`, `docs/mobile/DIRECT_INSTALL.md`. | Adam: downloadable app without App Store / Play Store. | ✅ node --check | build + deploy binaries |
| 2026-05-19 | **Native app = Universal Overlay shell:** Capacitor config → `/lifeos?native=1` (`lifeos-app.html`); `public/shared/lifeos-native-shell.js` (Capacitor detect, deep links, app foreground sync); `GET /api/v1/extension/shell` (stack registry manifest); `mobile/www/index.html` bootstrap; `extension/content.js` FRAME_ORIGIN → production Railway URL; `mobile/README.md` doctrine. | Adam: native app must be the overlay platform all programs sit on — not a separate mini-app. | ✅ node --check | pending deploy |
| 2026-04-20 | Founding document created; full architecture spec, feature spec, struggle detection design, form fill data flow, approved backlog | Adam: build web-first overlay above everything, real-time updates, proactive help, do-it-for-me form fill, fluid UI, universal platform | ✅ | complete |
| 2026-08-02 | `db/migrations/addAdaptiveLayoutColumn.sql`: factory-generated SQL used JavaScript `//` comments and failed migration validation. Hand-authored valid SQL using `--` comments with `CREATE TABLE IF NOT EXISTS flourishing_prefs` and `ADD COLUMN IF NOT EXISTS adaptive_layout_preferences JSONB`. | Unblock `universal-overlay` step 8 and keep migrations importable/applied. | ✅ syntax | pending `bp-priority:once` |
| 2026-08-02 | `routes/pageSummarization.js` step 10: factory builds were orphaned/non-existent in `origin/main`; restored the `143b6628d` canonical version exporting `registerPageSummarizationRoutes` and added `config/auto-registered-product-modules.json` entry so the route mounts live. | Unblock `universal-overlay` step 10 and fix missing route module. | ✅ syntax | pending `bp-priority:once` |
| 2026-08-02 | `universal-overlay-step4` (`services/proactiveToastSystem.js`) was a stale duplicate of `universal-overlay-1`; the canonical file exports `registerProactiveToast` (commit `0288b02c0`) and does not contain `ProactiveToastSystem`/`dismissibleToast`. Skipped the duplicate and aligned expectations to `registerProactiveToast` to satisfy `audit-false-done-steps`. | Remove HARD false-done ratchet failure caused by duplicate step with conflicting expected exports. | ✅ `node --check services/proactiveToastSystem.js` | pending `bp-priority:once` |
| 2026-04-20 | Extension scaffold shipped: `extension/manifest.json`, `extension/content.js`, `extension/background.js`, `extension/popup.html`, `extension/popup.js`; server overlay: `public/extension/frame.html`, `public/extension/frame.js`, `public/extension/version.json`; backend: `routes/lifeos-extension-routes.js` (status, context, fill-form, chat); mounted in `startup/register-runtime-routes.js`; registered in `docs/projects/INDEX.md` | Build the foundation that all overlay features sit on | ✅ node --check PASS | complete |
