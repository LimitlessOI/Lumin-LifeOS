<!-- SYNOPSIS: Founder Packet — LifeOS Commitment Route v2.1 -->

# Founder Packet — LifeOS Commitment Route v2.1

**Mission ID:** `PRODUCT-LIFEOS-COMMITMENT-ROUTE-V2-0001`
**Locked:** 2026-06-16
**Authority:** Outcome truth only. System derives HOW. Receipts prove PASS.

---

## Problem

Action Inbox stages commitments but does not create tracked commitment records. Adam must manually re-enter approved items into the commitment tracker.

---

## Desired Outcome

When an approved Action Inbox item with classification `commitment` is routed via commitment-route, a `lifeos_commitments` row is created from the inbox text, the inbox item is marked done, and a receipt proves the link.

---

## FOUNDER SUCCESS TEST

**`npm run lifeos:commitment-route:v2-acceptance` exits 0 after deploy.**

---

## Constraints

- Only `commitment` classification items may route
- Must be approved (or staged — auto-approve on route)
- No auto-route without explicit API call
- bp_build_request still cannot route

---

## Failure metrics

- Commitment created without inbox approval
- Duplicate commitment row for same inbox item on retry
- Non-commitment classification accepted by route endpoint
- Inbox item left in limbo (not marked done after route)

---

## Acceptance command

```bash
npm run lifeos:commitment-route:v2-acceptance
```

---

## Out of scope

- AI re-extraction of commitment fields
- Calendar due-date parsing (v3)
- Reminder worker
