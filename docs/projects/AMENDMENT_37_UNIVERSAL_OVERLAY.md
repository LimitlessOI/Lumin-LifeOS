# AMENDMENT 37 — Universal Overlay Platform

---

## ⚠️ AGENT CONTINUITY NOTICE

Cold agent: read `docs/AI_COLD_START.md` + `docs/CONTINUITY_LOG.md` before touching anything. This is a new domain — the overlay extension that sits above every other application or website, giving AI-assisted operation to any client on any page.

---

| Field | Value |
|---|---|
| **Lifecycle** | `active-build` |
| **Reversibility** | `reversible` |
| **Stability** | `evolving` |
| **Last Updated** | 2026-04-20 — Founding document + full P0 scaffold shipped. Extension routes mounted in register-runtime-routes.js. Amendment 37 registered in INDEX.md. node --check passes. See `## Change Receipts`. |
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
| **Next build** | P1 items above — struggle detection engine + form field schema inference. Also: add extension icons to `extension/icons/` |
| **Known gaps** | Extension icons are placeholder paths — need actual PNG assets before Chrome will load the extension. Fill-form currently maps only basic `lifeos_users` fields (name, handle) — insurance/DOB fields come with `insurance_profiles` table (P2). Struggle detection signals are wired as constants in content.js but the proactive toast bridge to the iframe is not yet built. |
| **⚠️ IN PROGRESS** | None — founding doc + scaffold complete as of 2026-04-21 |
| **How to load extension in Chrome** | Go to `chrome://extensions` → Enable Developer Mode → Load Unpacked → select the `extension/` folder in this repo |

---

## Change Receipts

| Date | What Changed | Why | Verified | Status |
|---|---|---|---|---|
| 2026-04-20 | Founding document created; full architecture spec, feature spec, struggle detection design, form fill data flow, approved backlog | Adam: build web-first overlay above everything, real-time updates, proactive help, do-it-for-me form fill, fluid UI, universal platform | ✅ | complete |
| 2026-04-20 | Extension scaffold shipped: `extension/manifest.json`, `extension/content.js`, `extension/background.js`, `extension/popup.html`, `extension/popup.js`; server overlay: `public/extension/frame.html`, `public/extension/frame.js`, `public/extension/version.json`; backend: `routes/lifeos-extension-routes.js` (status, context, fill-form, chat); mounted in `startup/register-runtime-routes.js`; registered in `docs/projects/INDEX.md` | Build the foundation that all overlay features sit on | ✅ node --check PASS | complete |
