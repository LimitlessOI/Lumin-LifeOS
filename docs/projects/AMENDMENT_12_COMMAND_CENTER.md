# AMENDMENT 12 — Command Center & Overlay
**Status:** LIVE (in development)
**Authority:** Subordinate to SSOT North Star Constitution
**Last Updated:** 2026-03-13

---

## WHAT THIS IS
The browser overlay and web dashboard that is the user-facing control panel for the entire platform. The overlay floats over any website (like a HUD). The command center is a full dashboard at `/console.html`. Includes the receptionist AI, conversation history, log monitoring, and all admin controls.

**Mission:** Give the user one place to see everything, control everything, and act on anything — without leaving their current context.

---

## REVENUE MODEL
- This is the UI layer that makes all other features accessible
- Better UX = higher retention = more MRR
- Command center will become the primary client portal for all services

---

## TECHNICAL SPEC

### Files
| File | Purpose |
|------|---------|
| `public/overlay/command-center.html` | Main command center dashboard |
| `public/overlay/command-center.js` | Dashboard JavaScript |
| `public/overlay/index.html` | Browser overlay entry point |
| `public/console.html` | Alternative console UI |
| `public/index.html` | Landing page |
| `public/dashboard` | Dashboard routes |
| `server.js` (lines 10463–10716, 10717–11098) | Command center endpoints + missing overlay — NEEDS EXTRACTION |

### Key Features
| Feature | Status |
|---------|--------|
| AI chat interface | Live |
| Memory browser | Live |
| System health monitor | Live |
| Queue stats | Live |
| Log tail (real-time) | Live |
| Financial dashboard | Live |
| Goal tracking UI | Partial |
| Site builder UI | Not built |
| Prospect pipeline UI | Not built |

### Auth
- `COMMAND_CENTER_KEY` env var — API key authentication for all `/api/v1/*` routes
- Key passed as header: `x-command-center-key` or query param `?key=`

### WebSocket
- Real-time updates pushed to overlay via WebSocket
- Events: `task_queued`, `task_complete`, `task_failed`, `chat_response`, `system_alert`

---

## CURRENT STATE
- **KNOW:** Overlay HTML/JS exists in `public/overlay/`
- **KNOW:** WebSocket server is live and broadcasts to connected clients
- **KNOW:** `COMMAND_CENTER_KEY` is the auth mechanism for all API routes
- **THINK:** Overlay may have incomplete features based on recent commits
- **DON'T KNOW:** Whether the overlay is being used daily

---

## REFACTOR PLAN
1. Extract command center endpoints → `routes/command-center-routes.js`
2. Add Site Builder UI panel — input URL, see preview link, manage prospects
3. Add Video Pipeline UI panel — script input, status tracking
4. Add Financial dashboard as default home screen
5. Add mobile-responsive PWA mode for the command center
6. Add role-based access — admin vs. client vs. agent views

---

## NON-NEGOTIABLES (this project)
- All API endpoints protected by `COMMAND_CENTER_KEY` — no public endpoints on admin routes
- WebSocket connections must authenticate before receiving data
- Log monitoring must redact secrets before displaying (API keys, tokens never shown)
- No sensitive data in URL query params (only in POST body or headers)
