# Founder Packet — LifeOS Objective 1: Conversation Commitments v1

**Mission ID:** `PRODUCT-CONVERSATION-COMMITMENTS-C2-0001`  
**Locked:** 2026-06-11 (Adam)  
**Authority:** This file is **outcome truth only**. System derives HOW (blueprint). Receipts prove PASS.

> **Archive:** Pre-split docs live in `_hist/` — valuable history, not active authority.

---

## Priority

**Primary mission.** BuilderOS is support only; it outranks LifeOS only when it directly blocks LifeOS delivery. Recovery passed — ship the product.

---

## Problem

LifeOS has not proven it can turn a real conversation into something useful Adam can act on.

---

## Desired outcome

Adam pastes or types conversation text. LifeOS extracts commitments he can see, trust, and track (open / done / deferred / broken). Each commitment links back to source context. Reminder-ready fields exist; full reminder worker is not required for v1.

---

## FOUNDER SUCCESS TEST

**Adam voluntarily uses this feature again within 48 hours of first successful use.**

---

## Constraints

- Private by default — no sharing unless Adam explicitly chooses
- No inventing commitments that are not supported by the text
- No always-listening, audio capture, or surveillance in v1
- No therapy, coaching, or relationship interpretation
- Daily flow must not require a terminal
- Evidence must be answerable: *Why does LifeOS think this commitment exists?*

---

## Acceptance command

```bash
npm run lifeos:conversation-commitments:v1-acceptance
```

(System authors this command and the proof script. Founder packet names the bar only.)

---

## PASS criteria (both required)

### 1. Technical PASS

- Acceptance command exits **0**
- Receipt: `products/receipts/CONVERSATION_COMMITMENTS_V1_ACCEPTANCE.json` with `"verdict": "PASS"`
- Nothing else counts — no subsystem wins, no IDE-only proof, no partial credit

### 2. Founder usability PASS

- Adam pastes a **real** conversation
- Extractions are **accurate** (Adam confirms)
- Adam **wants to use it again tomorrow** (see FOUNDER SUCCESS TEST)

**I'll know this worked when:** I can paste a real conversation, it finds the commitments accurately, and I immediately want to use it again tomorrow.

---

## Out of scope

- All of LifeOS (this is one proof mission)
- Audio / always-listening capture
- Sherry / household sharing (v1)
- Calendar writes
- Autonomous send
- Full reminder worker (reminder-ready fields only)
- C2 rebuild
- Billing / monetization gates (prove value first; billing does not block this objective)

---

## Founder touches

**Alert only on UNSOLVED** — same bar as AUTONOMOUS-RECOVERY-0002. System exhausts recovery before escalating.

---

## Document layers (do not mix)

| Layer | Role | Active file |
|-------|------|-------------|
| Founder packet | WHAT + PASS | **This file** |
| PSSOT | Product truth (system-maintained) | `PSSOT.md` |
| Blueprint | HOW to build | `BLUEPRINT.json` (system-authored) |
| Receipts | PROOF | `products/receipts/`, mission proof JSON |
