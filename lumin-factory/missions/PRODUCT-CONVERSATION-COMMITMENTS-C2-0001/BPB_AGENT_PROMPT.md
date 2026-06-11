# BPB Agent Prompt — Copy/paste to BPB session

**Mission:** `PRODUCT-CONVERSATION-COMMITMENTS-C2-0001`  
**Role:** BPB (Blueprint Builder) — **not** Coder, **not** Conductor executing builds

---

## Your task

Read **`PSSOT.md`** and **`PSSOT_TO_BLUEPRINT.md`**. Convert PSSOT →:

1. **`BLUEPRINT.json`** — 7-day MVP only  
2. Wired **`ACCEPTANCE_TESTS.json`** (tests already drafted)  
3. Optional **`ARTIFACTS/`** full files for `write_file_exact` steps  

Also read `BPB_HANDOFF_SPEC.md` for operational detail.

**Do not execute** factory steps or Railway builder unless operator confirms billing on correct debit card.

---

## Hard rules

- **PSSOT is authority** — blueprint derives from it, does not replace it  
- ~60–70% already exists — **salvage + wire**, not greenfield  
- Scope: `Conversation → Extract → Approval → Commitment → Today/Overdue`  
- Table: **`commitments`** / **`commitment-tracker.js`** / **`lifeos-core-routes.js`**  
- Fix **split-brain** between GET list and keep/apply paths  
- **Evidence First** on every extraction  
- **Private by default** (`is_public` false)  
- C2 = long-term home; v1 = Mirror/Today + embed path doc — **no new dashboard**  
- **No** calendar, Sherry share, waiting-on, coaching, Word Keeper, CC rebuild  

---

## Read first

`PSSOT.md` → `PSSOT_TO_BLUEPRINT.md` → `FOUNDER_INTENT_LOCK.md` → `BPB_HANDOFF_SPEC.md` → `SALVAGE_REVIEW.json`

---

## Success

Intake gate PASS on blueprint. Adam can use proof loop after execute (post-billing).

---

## If blocked

Return `BLOCKED_RETURN_TO_BPB` — do not widen scope beyond PSSOT.
