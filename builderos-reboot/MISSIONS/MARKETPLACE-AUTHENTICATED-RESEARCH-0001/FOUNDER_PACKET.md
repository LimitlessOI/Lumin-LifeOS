<!-- SYNOPSIS: Founder Packet — authenticated-session marketplace research, "the overlay acts as Adam's hands." -->

# Founder Packet — Authenticated Marketplace Research

**Mission ID:** `MARKETPLACE-AUTHENTICATED-RESEARCH-0001`
**Locked:** 2026-08-08 (Adam — "build our overlay system as if it's a human being pushing the button, typing it in. It is acting as my hands. That's all it is. giving me a compound multiplier of leverage.")
**Authority:** This file is **outcome truth only**. System derives HOW (blueprint). Receipts prove PASS.

---

## Priority

Direct successor to a real, honest finding: anonymous headless-browser access to Etsy and eBay search pages is actively blocked by anti-bot systems (Etsy: DataDome device-check interstitial; eBay: hard error page) — confirmed live tonight, not assumed. Adam's answer reframes the approach entirely: the overlay should act AS him — his hands, his own authenticated session — not as an anonymous bot. This is both more likely to actually work (authenticated sessions with real account history are treated very differently by anti-bot fingerprinting than anonymous first-visit traffic) and a fundamentally different, legitimate use case (personal browser automation on his own account) rather than anonymous scraping at scale.

## Problem

`routes/general-browser-agent-routes.js`'s `POST /api/v1/browser-agent/run` already has a proven, safe, precedented pattern for authenticated automation (`envCreds`: `WRM_WIX`, `TC_IMAP`/`ADAM_GMAIL`) — injecting real credentials from server env vars into the goal instruction so the overlay logs in as the real account owner before proceeding. Etsy and eBay are not wired into this pattern yet.

## Desired outcome

1. Extend the existing `envCreds` pattern with `ETSY` and `EBAY` options, matching the exact WRM_WIX/TC_IMAP shape: read `ETSY_EMAIL`/`ETSY_PASSWORD` (and `EBAY_EMAIL`/`EBAY_PASSWORD`) from env, inject a "log in as this account, do not invent credentials, stay on this domain" instruction ahead of the real research goal, never echo credential values in logs.
2. If the env vars are not set, fail closed with a clear `503` naming exactly which env vars are missing — never silently fall back to anonymous/unauthenticated browsing (that's the exact thing that just got blocked).
3. This wiring alone does not yet extract structured opportunity signal from a real search — that is deliberately a separate, later increment, once real credentials exist and the login+read flow can actually be tested live end to end.

## Explicitly out of scope this mission

- Structured signal extraction from real search results (price range, listing count, review counts) — needs a live-tested login flow first.
- Any workaround, proxy, or fingerprint-spoofing technique aimed at defeating anti-bot detection anonymously — deliberately rejected; authenticated-session automation on Adam's own account is the legitimate path, not adversarial scraping.
- Any risky action (purchase, listing creation, account changes) — the existing `allowRiskyActions` fail-closed gate (`OVERLAY-ENGINE-RISK-GATE-0001`) already covers this and is untouched by this mission.

## FOUNDER SUCCESS TEST

Given `ETSY_EMAIL`/`ETSY_PASSWORD` set as real env vars, `POST /api/v1/browser-agent/run` with `envCreds: "ETSY"` injects a real login instruction (credentials never appear in logs) and the overlay proceeds as an authenticated Etsy session. Given the env vars are NOT set, the same request fails closed with a clear, specific error naming the missing var names — never proceeds anonymously.

## Acceptance command

```bash
npm run marketplace:authenticated-research:acceptance
```

## What Adam needs to provide to activate this for real

Real Etsy account credentials as Railway env vars: `ETSY_EMAIL`, `ETSY_PASSWORD` (and optionally `EBAY_EMAIL`/`EBAY_PASSWORD` for eBay). This is account access, not a mechanics decision — the code ships regardless and fails closed with a clear message until these are set.
