<!-- SYNOPSIS: Founder maturity phases — pre-alpha machine proof → founder refinement → human beta -->

# Founder Maturity Phases

**Status:** `LOCKED` v1.0 — Adam direction 2026-07-08  
**Authority:** How products move from machine-built → founder-usable → other-human beta.  
**Does not replace:** `docs/COMPLETION_VOCABULARY_SSOT.md` (claim words). This file owns **who tests what, when**.  
**Change rule:** Edit only with Adam direction + receipt.

---

## 0. Hard rules

1. **Adam is never the first tester of “does it work.”** The machine must prove the product on live Railway using Adam’s real account credentials **before** he is asked to use it for a done/not-done judgment.
2. **When Adam gets it, the product is already done for function.** His phase is **refinement** (feel, ideas, taste, “move this button”) — not discovery of broken core paths.
3. **Founder chat is the refinement control surface.** Adam directs adjustments in `lifeos-app.html` chat. The system must act on what he says and give him what he asks for. He may reverse or replace prior feedback; that is normal.
4. **Beta is other humans.** Only after Adam feels ready. Feedback then comes from many sources; repeated requests for the same change are likely to ship unless there is a good reason not to.
5. **Claim words stay in the completion vocabulary SSOT.** This file maps phases onto those tokens — it does not invent new completion words.

---

## 1. Phase map

| Phase | Who | Job | Exit when | Ladder tokens (approx.) |
|-------|-----|-----|-----------|-------------------------|
| **Build** | Machine (BuilderOS / factory) | Author + install + deploy-truth | Code is on Railway at the claimed SHA | through `RELEASE_PASS` / transport proof |
| **Pre-alpha** | Machine as Adam | Login with founder credentials; exercise the real UI on prod; fail closed; self-repair; re-prove | Pre-alpha gate PASS (Layer A + Layer B human-sim) + no open P0 UI blockers | `SENTRY_MECHANICAL_PASS` → `CLEARED_FOR_FOUNDER_ALPHA` |
| **Founder alpha (refinement)** | Adam | Use it. Feel it. Direct changes via chat. Not “is it done?” — “how does it feel / what should change?” | Adam explicitly confirms usable (`FOUNDER_USABILITY_PASS`) when he is ready | `CLEARED_FOR_FOUNDER_ALPHA` → `FOUNDER_USABILITY_PASS` → `POINT_B_COMPLETE` |
| **Human beta** | Other people | Broader feedback; pattern detection | Adam elects beta; volume feedback loop active | after Point B for that product scope |
| **Release / scale** | Machine + ops | Harden, measure, expand | Release bar for that claim | `RELEASE_PASS` / product-specific release |

---

## 2. Pre-alpha (machine must finish this before Adam)

### Required

1. **Live Railway** — not localhost-only acceptance.
2. **Adam’s account credentials** — real login path (founder login env / vault), not anonymous probes only.
3. **UI walkthrough as Adam would** — shell, primary flows, chat, product surfaces in scope.
4. **SENTRY pre-alpha gate** — Layer A (structural) + Layer B (human-sim browser) for the product (`scripts/sentry-prealpha-gate.mjs` + registry).
5. **Deploy-truth** — served SHA matches the build under test.
6. **Fail → fix → re-prove** — findings go to the improvement feed; loop until gate PASS or typed blocker with owner.

### Forbidden

- Handing Adam a product whose pre-alpha gate is FAIL or skipped.
- Calling something “ready for you” on TECHNICAL_PASS alone.
- Soft chat probes counting as founder usability.

### Existing machinery (use; do not reinvent)

- `scripts/sentry-prealpha-gate.mjs`
- `builderos-reboot/governance/SENTRY_PRODUCT_REGISTRY.json`
- `scripts/run-machine-alpha-walkthrough.mjs` (LifeRE-class walkthrough)
- `npm run lifeos:founder-chat:alpha:battery`
- `services/deploy-truth.js` / build-deploy receipts
- Founder login env (`LIFEOS_FOUNDER_LOGIN_*`) — never print secrets

### Gap to close (honest)

**Enforcement path (Wave 0 close):** `scripts/sentry-prealpha-gate.mjs --enforce-creds` + registry Layer `B-credentialed` (`scripts/run-founder-jwt-chat-proof.mjs` with `LIFEOS_FOUNDER_LOGIN_*`). Soft/command-key E2E alone cannot grant `CLEARED_FOR_FOUNDER_ALPHA`. Remaining work: run credentialed gate on prod with founder login env present and keep the receipt green.

---

## 3. Founder alpha = refinement (Adam’s phase)

### What Adam does

- Uses the product in real life.
- Notices feel, friction, ideas, taste (“I don’t like this button”).
- Directs the system in founder chat as thoughts arise.
- May change his mind and redirect — the system must follow the latest clear ask.

### What Adam does **not** do in this phase

- Be the first person to discover that login is broken, routes 404, or the build path is theater.
- Rubber-stamp “done” because a receipt says TECHNICAL_PASS.

### How the system acts on feedback

- **Must:** interpret founder chat as refinement directives; build/adjust; re-prove affected paths; show him the result.
- **Pipeline shape:** Chair intake → (short or full) ARC/build → SENTRY on the change → deploy-truth. Exact length of the loop may vary; later audit is fine. **Non-negotiable:** it acts on what he said and returns the asked-for change.
- **Reversals:** allowed. Latest founder direction wins for the scoped ask.
- **Usability confirm:** only when Adam explicitly confirms (12+ char quote / confirm path) — never soft “looks good” / “keep going.”

---

## 4. Human beta (after Adam feels ready)

1. Adam elects beta for that product scope.
2. Other humans use it; feedback arrives from many sources.
3. **Pattern rule:** many independent requests for the same change → likely implement, unless there is a documented good reason to keep current behavior (safety, doctrine, cost, contradiction with North Star).
4. Adam’s feedback still outranks crowd preference when they conflict — he is founder.

---

## 5. Mapping to “BuilderOS / LifeRE / LifeOS done”

| Ask | Honest bar |
|-----|------------|
| BuilderOS done | Factory can build + pre-alpha prove products; governed path live; not just TECHNICAL_PASS theater |
| LifeRE done for Adam’s phase | Pre-alpha PASS on prod with his credentials → he refines → he confirms usability |
| LifeOS important pieces done | Same: pre-alpha on shell/auth/chair/dashboard slices → refinement → confirm |

Until pre-alpha PASS, agents must say **CLEARED_FOR_FOUNDER_ALPHA is not earned** (or lower).

---

## 6. Ratification

| Agent | Vote | Date | Notes |
|-------|------|------|-------|
| Adam | Direction | 2026-07-08 | Pre-alpha = machine tests UI with his Railway credentials before he gets it; his phase = refinement via chat; beta = other humans + pattern feedback |
| Grok | `AGREE` + seal | 2026-07-08 | Locked this file; points completion vocab at phases |

**Sealed:** 2026-07-08
