<!-- SYNOPSIS: Founder Packet — Communication System V4: Verbal AI Director & Autonomous Overlay Action -->

# Founder Packet — Communication System V4: Overlay Action

**Mission ID:** `PRODUCT-COMMUNICATION-V4-OVERLAY-ACTION-0001`
**Locked:** 2026-08-08 (Adam — "install all five" versions of the Communication System Blueprint)
**Authority:** This file is **outcome truth only**. System derives HOW (blueprint). Receipts prove PASS.
**Source doctrine:** `docs/products/lifeos/communication/COMMUNICATION_SYSTEM_BLUEPRINT.md` §22, row "V4 — Verbal AI Director & Autonomous Overlay Action"

---

## Priority

Fourth of five. Requires reliable perception and contracts first (V1-V3), per the blueprint's own stated dependency order — parsing "do it" into a safe, auditable plan is only trustworthy once the system already knows how to listen and read context correctly.

---

## Problem

Adam saying "do it" today has no deterministic path to actual multi-step action across a page — there's no shared, auditable way to turn a verbal command into a plan, gate the risky parts behind explicit confirmation, and execute the safe parts.

---

## Desired outcome

1. A real, callable Overlay Action service parses a natural-language command into a deterministic, auditable plan (fill/select/click/navigate/stop steps) — same parsing behavior as the already-proven prototype.
2. Any plan step that touches a risky target (submit, delete, purchase, pay, confirm) is never auto-approved — it requires either an explicit stop/confirmation gate in the command itself, or is blocked pending real confirmation at execution time.
3. Plan execution is a pure function of `(page, plan)` — it does not launch or manage its own browser session, so it can be driven by the real existing browser automation the codebase already has (`services/browser-agent.js`) rather than duplicating that infrastructure.

---

## FOUNDER SUCCESS TEST

Given the same natural-language commands the proven prototype was tested against (`scripts/prototype-overlay-action-v4.mjs`, 10/10 tests, including Puppeteer execution against `scripts/test-form-v4.html`), the ported service produces the identical plan and the identical risk/approval decision — reused, not reinvented. A command containing "click submit" with no stop/confirmation language is never auto-approved.

## Acceptance command

```bash
npm run lifeos:communication-v4-overlay-action:acceptance
```

(System authors this command and the proof script. Founder packet names the bar only.)

---

## PASS criteria (both required)

### 1. Technical PASS — objective, automatable

- Acceptance command exits **0**
- Receipt: `products/receipts/COMMUNICATION_V4_OVERLAY_ACTION_ACCEPTANCE.json` with `"verdict": "PASS"`
- `parseCommand`/`resolveSelector`/`approvePlan`/`executePlan` match the proven prototype's exact behavior on the same inputs.
- **Failure mode, explicit:** a risky action (submit/delete/purchase/pay/confirm) getting `approved:true` without an explicit stop/confirmation in the command is a FAIL, not a partial pass — this is a safety boundary, not a preference.

### 2. Founder usability PASS

- Adam confirms: the system never takes an irreversible action without him explicitly clearing it first.

**I'll know this worked when:** I can say "fill this out and stop before submitting" and trust that it actually stops — and that a command with no stop language never quietly clicks submit on its own.

---

## Out of scope

- Real browser session management / launching a browser — this mission ports the parse/approve/execute *logic* only; `executePlan(page, plan)` takes an already-connected page, and wiring it to a live `services/browser-agent.js` session is deferred
- Wiring this into any live product surface's decision path (V5's job, or a later live-wiring mission)
- Any AI/model call inside the parsing/approval logic — deterministic, matching the proven prototype exactly
- Redesigning the risky-action list or the approval policy shape

## Document layers (do not mix)

| Layer | Role | Active file |
|-------|------|-------------|
| Founder packet | WHAT + PASS | **This file** |
| Blueprint | HOW to build | `BLUEPRINT.json` (system-authored) |
| Receipts | PROOF | `products/receipts/`, mission proof JSON |
