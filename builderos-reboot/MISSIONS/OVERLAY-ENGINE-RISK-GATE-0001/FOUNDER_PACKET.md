<!-- SYNOPSIS: Founder Packet — real risk-authorization guardrail for the live, model-driven overlay/browser-agent engine. -->

# Founder Packet — Overlay Engine Risk Gate

**Mission ID:** `OVERLAY-ENGINE-RISK-GATE-0001`
**Locked:** 2026-08-08 (Adam — "we need to build the overlay system because that's the whole program sits on that. All of them do.")
**Authority:** This file is **outcome truth only**. System derives HOW (blueprint). Receipts prove PASS.

---

## Priority

Foundational. Adam named the overlay as the substrate every future autonomous-opportunity/commerce capability sits on. Before any autonomous listing-creation, purchasing, or account-action capability is built on top of it, the live engine needs a real authorization guardrail for financially/consequentially risky actions — it currently has none.

---

## Problem

`services/general-browser-agent.js` (`runBrowserGoal`) is the REAL, live, model-driven observe→decide→act→verify loop already powering `POST /api/v1/browser-agent/run`, `services/marketing-publisher.js`, and `services/browser-signup-orchestrator.js` — confirmed by direct code read, not assumed. It already has one guardrail (`confirmContext`: are we on the intended site/account before a live action). It has **zero** guardrail for action *risk* — nothing stops the model-driven loop from clicking a "Buy Now", "Complete Purchase", "Delete Account", or "Cancel Subscription" button if the decider proposes it. This is the exact gap named in tonight's earlier strategy conversation: "strict authorization, transaction limits, confirmation thresholds, and auditability around financial and consequential actions."

## Desired outcome

1. `runBrowserGoal` gains a second guard, alongside the existing `confirmContext` check: before executing any `click` action, look up the target element's real observed label (from `observation.elements`, matched by selector) and block it — fail closed, matching the existing guardrail's own philosophy — if the label matches a risky-action pattern (buy/purchase/pay/checkout/place order/confirm purchase/confirm payment/delete/remove account/cancel subscription/close account), UNLESS the caller explicitly passed `allowRiskyActions: true`.
2. Default is `allowRiskyActions: false` everywhere it isn't explicitly set — existing callers (`browser-agent/run`, marketing-publisher, browser-signup-orchestrator) get the new protection automatically, with no behavior change unless their goal legitimately needs to click a risky-labeled element, in which case they now have to say so explicitly.
3. A blocked risky action is recorded in the step history with a real, specific reason (the actual matched label), the same way `context_unconfirmed` blocks are recorded today — auditable, not silent.

---

## FOUNDER SUCCESS TEST

Given a synthetic goal/observation where the decider proposes clicking an element labeled "Complete Purchase" or "Delete Account", `runBrowserGoal` blocks it (`ok:false`, `reason` starts with `risky_action_requires_authorization:`) when `allowRiskyActions` is not set. The identical scenario with `allowRiskyActions: true` executes normally. A goal that never touches a risky-labeled element behaves identically to before this change (regression-proof).

## Acceptance command

```bash
npm run overlay:engine-risk-gate:acceptance
```

## Non-goals (explicitly out of scope this mission)

- Rebuilding `services/overlay-action-service.js` (Communication System V4's separate command-parser/risk-gate) — that file stays as-is; this mission fixes the REAL production engine directly instead.
- Any new autonomous listing-creation, purchasing, or marketplace capability — this mission is the safety prerequisite, not the capability itself.
- Kill-switch budgets / capital tracking — separate, later mission once real spend is on the table.
