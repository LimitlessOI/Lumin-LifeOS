<!-- SYNOPSIS: Founder Packet — the real root cause blocking the drive channel all night, found via live deployment log inspection. -->

# Founder Packet — Global CORS Extension Fix

**Mission ID:** `GLOBAL-CORS-EXTENSION-FIX-0001`
**Locked:** 2026-08-09 (found live via real deployment logs, urgent — Adam: "if you have not accomplished what I asked you are not allowed to stop")
**Authority:** This file is **outcome truth only**. System derives HOW (blueprint). Receipts prove PASS.

## Priority

The actual root cause of every failed auto-pickup test tonight, found by pulling real Railway deployment logs: `middleware/apply-middleware.js`'s global CORS handler returns `200` for every `OPTIONS` preflight unconditionally, but only sets `Access-Control-Allow-Origin` for same-origin or explicitly allowlisted origins. For any third-party host page (fiverr.com, example.com — anywhere the extension's content script runs), the header is silently omitted while still reporting success. The browser accepts the 200 but then correctly refuses to send the real follow-up request, because the response never authorized its origin. My own route-level CORS fix (`OVERLAY-DRIVE-CORS-FIX-0001`) never had a chance to run, because this global middleware intercepts and short-circuits OPTIONS requests before reaching any router.

## Desired outcome

Extension content-script routes (`/api/v1/extension/*`) get `Access-Control-Allow-Origin` set for ANY origin, not just the allowlist — safe, since every one of these routes is independently protected by the `requireKey` secret header regardless of origin.

## FOUNDER SUCCESS TEST

An OPTIONS preflight to `/api/v1/extension/drive/pending-for-user` with `Origin: https://www.fiverr.com` returns `Access-Control-Allow-Origin: https://www.fiverr.com` (not silently omitted).

## Acceptance command

```bash
npm run global-cors-extension-fix:acceptance
```

## Explicitly out of scope

Loosening CORS for any route outside `/api/v1/extension/*`.
