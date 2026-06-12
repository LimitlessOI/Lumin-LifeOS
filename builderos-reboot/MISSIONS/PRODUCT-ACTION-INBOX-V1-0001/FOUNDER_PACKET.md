# Founder Packet — LifeOS Action Inbox v1

**Mission ID:** `PRODUCT-ACTION-INBOX-V1-0001`
**Locked:** 2026-06-12 (CUR, temp builder/audit agent)
**Authority:** Outcome truth only. System derives HOW (blueprint). Receipts prove PASS.

> **Product truth:** The Action Inbox is the middle layer between communication and execution. Voice Rail and text capture go in. Classified, staged items come out. BuilderOS never runs automatically. Adam reviews and approves.

---

## Problem

Voice Rail captures raw communication beautifully. BuilderOS executes builds. But there is no staging area between them. Commands, commitments, tasks, and build requests all land in the same stream with no classification, no staging gate, and no receipt. Items get lost. BuilderOS has no protected boundary against accidental auto-execution.

---

## Desired Outcome

Every message captured through Voice Rail or direct API is classified, staged, and visible. Adam can see what is waiting. Adam approves before anything routes. Build requests never auto-execute. Private inputs never persist. Receipts prove what happened.

---

## FOUNDER SUCCESS TEST

**Adam can see staged items from Voice Rail in one list, approve or dismiss them, and trust that nothing ran on his behalf without his explicit approval — including zero automatic BuilderOS calls.**

---

## Classification Types (LOCKED — 9)

| Classification | Meaning |
|---|---|
| `conversation` | Normal dialogue — no action required |
| `task` | A to-do or action item |
| `commitment` | A promise or follow-through |
| `schedule_item` | Calendar / appointment / reminder |
| `bp_build_request` | A build/deploy request — STAGED ONLY, never auto-routed |
| `decision` | Something requiring a choice |
| `reminder` | A note to self |
| `private_no_save` | Private input — never written to DB |
| `unknown` | Could not classify |

---

## BuilderOS Handoff Rule (LOCKED)

`bp_build_request` items are **staged-only**. They are never automatically routed to CDR, SNT, or any BuilderOS executor. Adam must approve routing explicitly. This is non-negotiable and is enforced in the service.

---

## Private Mode Rule (LOCKED)

`private_no_save` inputs never touch the database. The service returns a local-only object. No receipt is created. No DB row is written. T06 in the acceptance test verifies this by count.

---

## Acceptance Command

```bash
npm run lifeos:action-inbox:v1-acceptance
```

---

## PASS Criteria

### Technical PASS
- Acceptance command exits 0
- Receipt: `products/receipts/ACTION_INBOX_V1_ACCEPTANCE.json` with `"verdict": "PASS"`
- T01–T10 all pass
- No DB row written for private input (T06)
- `bp_build_request` never auto-routed (T04)

### Out of Scope (v1)
- Auto-routing of any item without human approval
- BuilderOS execution from this inbox
- Full UI overlay (v2)
- Webhook delivery
- Cross-user inbox sharing
