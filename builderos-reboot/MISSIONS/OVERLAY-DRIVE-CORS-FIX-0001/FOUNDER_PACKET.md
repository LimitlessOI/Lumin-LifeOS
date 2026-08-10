<!-- SYNOPSIS: Founder Packet — real CORS bug blocking the auto-pickup drive channel from working at all. -->

# Founder Packet — Overlay Drive CORS Fix

**Mission ID:** `OVERLAY-DRIVE-CORS-FIX-0001`
**Locked:** 2026-08-09 (found live, urgent — Adam: "the system needs to function... get to us making money immediately")
**Authority:** This file is **outcome truth only**. System derives HOW (blueprint). Receipts prove PASS.

## Priority

The zero-click auto-pickup mechanism has failed every live test tonight. Root cause found: `routes/extension-drive-routes.js` sets no CORS headers, and `content.js`'s auto-pickup poll runs inside the host page's origin (e.g. fiverr.com), making its `fetch()` calls cross-origin -- silently blocked by the browser, silently swallowed by a `.catch(() => {})`.

## Desired outcome

Permissive CORS headers on every route in this file (safe: all routes already require the secret command-key header), so content.js's fetch actually reaches the server and gets a usable response.

## FOUNDER SUCCESS TEST

A cross-origin fetch (simulated with an `Origin` header from an arbitrary host) to `/pending-for-user` returns a real response instead of being blocked.

## Acceptance command

```bash
npm run overlay:drive-cors-fix:acceptance
```

## Explicitly out of scope

Any other change to the drive channel.
