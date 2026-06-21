<!-- SYNOPSIS: Founder Packet — LifeOS Capture Pipeline v2 -->

# Founder Packet — LifeOS Capture Pipeline v2

**Mission ID:** `PRODUCT-LIFEOS-CAPTURE-PIPELINE-V2-0001`
**Locked:** 2026-06-16 (overnight machine build)
**Authority:** Outcome truth only. System derives HOW (blueprint). Receipts prove PASS.

> **Product truth:** Voice Rail captures communication. Action Inbox stages it. v2 wires them — every non-private Voice Rail message auto-stages in the inbox for Adam's review.

---

## Priority

**LifeOS integration slice v2.0.** Depends on Voice Rail v1 + Action Inbox v1 (both TECHNICAL_PASS).

BuilderOS is support only unless it blocks delivery.

---

## Problem

Voice Rail and Action Inbox work independently. Messages spoken in Voice Rail do not appear in the staging inbox unless Adam manually re-captures them. The middle layer is disconnected.

---

## Desired Outcome

When Adam sends a non-private message through Voice Rail, the same text is classified and staged in Action Inbox with `source: voice_rail`. Private mode and simulate-only never write to inbox. Adam sees one pipeline: speak → staged → approve.

---

## FOUNDER SUCCESS TEST

**`npm run lifeos:capture-pipeline:v2-acceptance` exits 0 — machine Alpha; three consecutive foundation-pipeline runs without manual intervention.**

---

## Constraints

- Private mode: zero inbox writes (same as Action Inbox v1)
- `simulate_only`: zero inbox writes
- `bp_build_request`: staged-only — never auto-routed to BuilderOS
- No auto-approve — staging only
- Voice Rail council reply behavior unchanged

---

## Acceptance command

```bash
npm run lifeos:capture-pipeline:v2-acceptance
```

---

## PASS criteria

### Technical PASS
- Acceptance command exits 0
- Receipt: `products/receipts/CAPTURE_PIPELINE_V2_ACCEPTANCE.json` with `"verdict": "PASS"`
- Capture pipeline health endpoint returns `capture-pipeline-v2`
- POST `/capture-pipeline/stage` stages with `source: voice_rail`
- Voice Rail POST `/message` returns `inbox_staging` on non-private messages

### Out of scope (v2)
- Auto-approve or auto-route inbox items
- Commitment tracker integration (v2.1)
- UI overlay changes
- BuilderOS execution from inbox

---

## Out of scope

- Full LifeOS hub overlay
- SocialMediaOS
- Calendar auto-wire

---

## Founder touches

None during machine path. Alpha = machine acceptance PASS only.
