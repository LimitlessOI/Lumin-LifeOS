<!-- SYNOPSIS: Founder Packet — live server-to-extension driving channel, generic across any goal/site. -->

# Founder Packet — Overlay Live Driving Channel

**Mission ID:** `OVERLAY-DRIVE-CHANNEL-0001`
**Locked:** 2026-08-09 (Adam — "we should have an overlay installed on my computer. I open up a browser for you, and you sign up for the account. That's how it needs to work... then you can open up multiple tabs and multiple overlays, and you can do a thousand of them simultaneously if needed.")
**Authority:** This file is **outcome truth only**. System derives HOW (blueprint). Receipts prove PASS.

---

## Priority

The Universal Overlay extension is now confirmed installed and working on Adam's real machine (6 install bugs found and fixed live tonight). Today the extension only answers when asked (chat, fill-form) — nothing lets the server push an action into it or receive results back. This mission builds that missing channel, reusing the already-proven generic goal loop (`services/general-browser-agent.js` — observe/decide/act/verify, risk-gated, stuck-loop-recovering) with a new adapter that talks to Adam's real browser tab through the extension instead of a server-side headless Puppeteer session.

## Problem

`services/general-browser-agent.js`'s `runBrowserGoal` is fully adapter-injected (`observe`, `decideAction`, `act`, `verifyGoal`, `confirmContext`) and already proven live against real sites via the Puppeteer adapter in `services/general-browser-agent-runtime.js`. There is no equivalent adapter that drives the SAME loop through the Universal Overlay extension's postMessage bridge, and no backend channel for the extension's frame.js to poll for pending actions or report results back.

## Desired outcome

1. A new bridge module turns a poll/post HTTP cycle into the `observe()`/`act()` functions `runBrowserGoal` already expects — no changes to the proven core loop.
2. Goal verification is Adam's own real confirmation (he is watching his own tab), not a self-reported model claim — matching the Chair's original non-negotiable guardrail on this engine ("success must be independently evidenced, never self-reported").
3. A new route exposes start/poll/result/stop/status so the extension's frame can drive an arbitrary goal on an arbitrary site — no site-specific code anywhere in this mission.
4. Mounted directly in the founder runtime lane (matching the IdeaVault / Marketplace-Scanner / Extension-backend precedent) — not the dead full-runtime lane.
5. Reuses the existing generic decider (`makeDecider`/`formatObservation`/`parseModelAction` from `services/general-browser-agent-runtime.js`) unchanged — these are already browser-agnostic pure functions.

## FOUNDER SUCCESS TEST

Given a session started with a goal and no browser attached, `GET /next` returns a real pending `observe` request. Given a posted observation payload, the next `GET /next` returns a real pending `act` request derived from a real decided action. Given a posted risky-click scenario without `allowRiskyActions`, the session blocks with `risky_action_requires_authorization` (proving the existing risk gate still applies, unmodified). Given the decider claims `done`, the next pending request is `confirm_done` — not an automatic pass.

## Acceptance command

```bash
npm run overlay:drive-channel:acceptance
```

## Explicitly out of scope

- Any site-specific selector, URL, or flow logic.
- Changes to `services/general-browser-agent.js`'s core loop (it is already fully generic and adapter-injected — reused, not modified).
- The actual extension-side UI (goal input, poll loop, confirm dialog) — client-side `extension/`/`public/extension/` files are hand-authored glue per SO-001's carve-out, not server code, and are wired separately from this governed-factory mission.
- Multi-session/multi-tab concurrency beyond what an in-memory per-process Map naturally supports (documented limitation, not solved here).
