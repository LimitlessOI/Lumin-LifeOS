<!-- SYNOPSIS: Native Universal Overlay shell (Capacitor) -->

# LifeOS Native App — Universal Overlay Platform

This is **not** a separate product. It is the **same universal overlay** described in `docs/products/universal-overlay/PRODUCT_HOME.md`:

> **This is the platform layer.** Every LifeOS program runs inside it.

| Surface | What it is |
|---------|------------|
| **Native app (this)** | Capacitor shell → loads `/lifeos` (`lifeos-app.html`) — home screen icon, background audio, deep links |
| **PWA / browser** | Same `lifeos-app.html` — Add to Home Screen |
| **Chrome extension** | `extension/content.js` + `/extension/frame.html` — overlay on *other* websites |

All stacks (LifeRE, BuilderOS, Today, Mirror, …) load **inside** the shell iframe. Config: `config/lifeos-stack-registry.json`. API manifest: `GET /api/v1/extension/shell`.

---

## First-time setup (Mac + iPhone)

```bash
npm install
npm run mobile:add:ios      # once — creates ios/ project
npm run mobile:sync
npm run mobile:ios          # Xcode → Run on your iPhone
```

Capacitor loads the same LifeOS shell (`lifeos-app.html`). SocialMediaOS Film Studio lives at `/marketing/session/:id` inside that shell (camera + voice-synced teleprompter — not a separate native SMOS binary).

When your Android arrives:

```bash
npm run mobile:add:android
npm run mobile:sync
npm run mobile:android
```

---

## What opens on launch

Capacitor loads:

`https://lumin-web-production-e3a9.up.railway.app/lifeos?native=1&layout=mobile&direct_system=1`

That is **`lifeos-app.html`** — the canonical universal shell. Sign in once; all programs are in the sidebar / bottom nav.

`public/shared/lifeos-native-shell.js` detects Capacitor, sets `data-lifeos-native="1"`, handles deep links, and syncs listening when the app returns foreground.

---

## Xcode (iPhone)

1. Open the Xcode project from `npm run mobile:ios`
2. Signing & Capabilities → your team
3. **Background Modes → Audio** (for Lumen listening when backgrounded)
4. Run on device

---

## Architecture

```
Phone home screen icon (LifeOS)
  └── Capacitor WebView
        └── /lifeos  (= lifeos-app.html universal shell)
              ├── Lumen drawer / listening / family guard
              ├── Sidebar or mobile bottom nav
              └── iframe → lifeos-dashboard, lifeos-lifere, … (all stacks)
```

Extension overlay on arbitrary websites is **browser-only** today; in-app browser + overlay on mobile is Amendment 37 P2.

---

## Local dev against Railway

Default `capacitor.config.json` points at production so the app always matches what you deploy. To hit local server:

```json
"server": { "url": "http://YOUR_LAN_IP:3000/lifeos?native=1&layout=mobile&direct_system=1" }
```

Then `npm run mobile:sync`.

---

## Related files

- `public/shared/lifeos-native-shell.js` — native bridge
- `public/overlay/lifeos-app.html` — universal shell UI
- `docs/products/universal-overlay/PRODUCT_HOME.md` — overlay law
- `config/lifeos-stack-registry.json` — stack registry
