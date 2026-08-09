<!-- SYNOPSIS: Founder Packet — auto-pickup so an already-open browser tab drives a server-started session with zero clicks. -->

# Founder Packet — Overlay Drive Auto-Pickup

**Mission ID:** `OVERLAY-DRIVE-AUTOPICKUP-0001`
**Locked:** 2026-08-09 (Adam, live: "You need to do that. Don't make me do it. It's why we did the overlay.")
**Authority:** This file is **outcome truth only**. System derives HOW (blueprint). Receipts prove PASS.

## Priority

The drive channel required a human to click "Start" in the extension panel before it could take over. That's a real gap against the whole point of the overlay: Adam should never have to click anything for the AI to act through his browser.

## Desired outcome

`GET /api/v1/extension/drive/pending-for-user?user=X` atomically claims the newest unclaimed running session for a user. An already-open tab's content script can poll this on its own and auto-start driving the moment the server creates a session — no click required.

## FOUNDER SUCCESS TEST

Server creates a session via `/start`. A separate call to `/pending-for-user` for the same user returns that session's id and goal exactly once; a second call returns `session_id: null` (already claimed).

## Acceptance command

```bash
npm run overlay:drive-autopickup:acceptance
```

## Explicitly out of scope

The extension-side polling loop that calls this endpoint (hand-authored client glue, wired separately, not server code under SO-001).
