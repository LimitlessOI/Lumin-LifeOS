<!-- SYNOPSIS: Founder Packet — generic stuck-loop detection/recovery for the overlay engine, no site-specific code. -->

# Founder Packet — Overlay Stuck-Loop Recovery

**Mission ID:** `OVERLAY-STUCK-LOOP-RECOVERY-0001`
**Locked:** 2026-08-08 (Adam — "figure out a way around it... I don't have to write any etsy specific flow... nothing's impossible until it is absolutely ironclad proven impossible... your job is to overcome it")
**Authority:** This file is **outcome truth only**. System derives HOW (blueprint). Receipts prove PASS.

---

## Priority

Direct response to a real, live failure: a real Etsy shop-signup run (account created successfully, no bot detection) got stuck on the same navigate action for its entire 15-step budget with zero forward progress, then honestly reported `max_steps_exhausted`. Adam's explicit direction: fix the GENERIC engine so it can recover from this class of failure on ANY site, not write an Etsy-specific flow — a hand-authored per-site script is exactly what `general-browser-agent.js` was built to replace.

## Problem

The core observe→decide→act→verify loop has no way to notice it is repeating an action that produces no visible change. It will burn its entire step budget on the identical mistake rather than adapting. Separately, `navigate()` only waits for `domcontentloaded`, which fires before JS-heavy single-page apps (Etsy included) finish rendering — a plausible real contributor to the stuck loop (the decider may have been reasoning about a half-rendered page).

## Desired outcome

1. `runBrowserGoal` fingerprints each observation (URL + title + element signature) and detects when an action produced no visible state change, tracking a consecutive-stuck counter.
2. That stuck signal reaches the decider as real context — not just buried in an already-ignored history array — via explicit `stuck`/`stuckCount` fields, and the prompt gets an explicit corrective instruction when stuck fires.
3. When meaningfully stuck (stuckCount >= 2), the decider tries its strongest available model tier first instead of the cheapest, on the theory that a harder decision deserves a stronger model — same escalation philosophy as SO-003, triggered by observed difficulty instead of only pre-set.
4. `navigate()` gives the page a real settle beat after `domcontentloaded` before the loop looks at it again, closer to how a human actually waits for a page to load before reacting.
5. All of the above is 100% generic — works identically on Etsy, eBay, or any other site. No site-specific selectors, URLs, or flow logic anywhere in this mission.

## FOUNDER SUCCESS TEST

Given a synthetic scenario where `observe()` returns the identical fingerprint for 3 consecutive steps, `decideAction` receives `stuck:true` with an increasing `stuckCount`, and the decider's prompt includes an explicit "this didn't work, try something different" instruction. Given a fresh scenario where each step's observation genuinely differs, `stuck` stays `false` throughout — no false positives on normal forward progress.

## Acceptance command

```bash
npm run overlay:stuck-loop-recovery:acceptance
```

## Explicitly out of scope

- Any Etsy-specific selector, URL pattern, or flow step.
- Retrying the live Etsy signup automatically as part of this mission's acceptance (that's a manual live re-test after this ships, not a blueprint step).
