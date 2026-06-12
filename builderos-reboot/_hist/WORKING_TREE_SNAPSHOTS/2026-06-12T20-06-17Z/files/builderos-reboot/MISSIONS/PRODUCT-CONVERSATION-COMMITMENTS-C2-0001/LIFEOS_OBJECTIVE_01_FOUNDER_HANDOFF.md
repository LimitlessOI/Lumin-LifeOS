# LifeOS Objective 1 — Founder handoff (Conductor → System)

> **⚠️ SUPERSEDED 2026-06-11** — Active authority is **`FOUNDER_PACKET.md`**. This file archived to `_hist/` for history. Do not use for build decisions.

**Role:** Adam locked intent. **Conductor packages.** **BuilderOS/CUR/factory executes.**  
**Conductor does NOT:** hand-code routes, write acceptance scripts, run proof, claim PASS.

**Supersedes:** ad-hoc SLICE-001 / `lifeos:commitments:slice-proof` run by IDE — **not valid** for Objective 1 PASS (Conductor bypass; does not prove the builder can complete the task).

---

## Objective name

**LifeOS Objective 1 — Conversation Commitments v1**

## Purpose

Prove LifeOS can turn a real conversation into useful action **without** expanding into all of LifeOS.

## Result (one sentence)

User pastes/types conversation text → LifeOS extracts a commitment → stores it → shows it → tracks status → reminder-ready fields work.

## PASS bar (only)

```bash
npm run lifeos:conversation-commitments:v1-acceptance
```

Exit **0** + receipt **`products/receipts/CONVERSATION_COMMITMENTS_V1_ACCEPTANCE.json`** with `"verdict":"PASS"`.

Nothing else counts. No subsystem wins. No IDE-run proof. No manual rescue during proof.

---

## Build order (system executes in this order)

| Phase | Goal | System PASS |
|-------|------|-------------|
| **0** | Product source of truth | `products/LIFEOS.md` exists, current-state only, no history inline |
| **1** | BP + acceptance command defined **before** product code | BP doc + acceptance script stub exits 1 until implemented |
| **2** | Data model | commitment record CRUD in DB |
| **3** | API | routes create/list/get/update/defer/broken/safe archive |
| **4** | Extraction | structured extract; no invent; evidence fields |
| **5** | UI | paste → preview → save → list → status buttons (no terminal) |
| **6** | Reminder-ready | due/deferred/overdue queryable |
| **7** | Hist + CFO receipts | create + status change receipted |
| **8** | SNT break tests | malformed/duplicate/privacy/missing id |
| **9** | Production proof | acceptance exit 0 + receipt PASS + SHA parity |

---

## Phase 0 — `products/LIFEOS.md` (current state only)

Sections (fixed order):

1. **IDENTITY**
2. **WHAT EXISTS IN CODE**
3. **WHAT IS NOT BUILT**
4. **HARD CONSTRAINTS**
5. **LOCKED DECISIONS**
6. **CURRENT BP** → Conversation Commitments v1
7. **ACCEPTANCE COMMAND** → `npm run lifeos:conversation-commitments:v1-acceptance`
8. **PASS RECEIPT** → `products/receipts/CONVERSATION_COMMITMENTS_V1_ACCEPTANCE.json`

**Forbidden in product file:** change receipts, agent continuity, constitutional law, history.

History → `logs/changes.jsonl`, `logs/receipts/`.

**Phase 0 PASS:** file exists; BP section points here; under ~500 lines prose.

---

## Phase 1 — BP scope (locked)

### In scope

- Manual text entry only
- Extract: promiser, commitment text, recipient, due date (nullable), source text, confidence
- Store, list, get one
- Status: open / done / deferred / broken
- Reminder-ready fields (due_date, deferred_until)
- Hist receipt on create + status change
- CFO/token receipt on extraction
- SNT checks (see Phase 8)

### Out of scope

- Audio, always-listening
- Therapy, coaching, relationship interpretation
- Broad LifeOS buildout
- Full reminder worker (reminder-**ready** only)
- C2 rebuild (minimal surface OK in Phase 5)

**Phase 1 PASS:** acceptance command name registered in `package.json` (may exit 1 until Phases 2–9 done).

---

## Phase 2 — Data model (minimum fields)

| Field | Notes |
|-------|--------|
| id | |
| user_id / owner | |
| source_text | full paste |
| promiser | who promised |
| recipient | to whom |
| commitment_text | what |
| due_date | nullable |
| confidence | numeric or enum |
| status | open \| done \| deferred \| broken |
| created_at, updated_at, completed_at | |
| deferred_until | |
| privacy_flag | |
| extraction_notes | |

**Canonical table:** `commitments` (salvage assessment says ~60–70% exists — **extend**, do not greenfield ignore).

**Retire split-brain:** `lifeos_commitments` / `lifeos-commitment-tracker.js` writes must stop or redirect to canonical.

---

## Phase 3 — API (minimum)

- POST create from text (extract + store or staged approve — BP decides; founder prefers preview before save in UI)
- GET list (filter: open / done / broken / deferred)
- GET one
- PATCH/POST status update (done / deferred / broken)
- Safe delete/archive only

**Phase 3 PASS:** API-level tests in acceptance command (not Conductor curl).

---

## Phase 4 — Extraction rules

- No commitment in text → return empty, do not invent
- Missing date → `due_date: null`
- Low confidence → mark low
- Privacy-sensitive → flag
- Keep source text always
- Never claim certainty without evidence

---

## Phase 5 — UI minimum

- Text box (paste)
- Extracted preview
- Save
- List open commitments
- Buttons: done / defer / broken
- Filter: open / done / broken

**PASS:** full flow without terminal.

---

## Phase 6 — Reminder-ready

- due_date stored
- deferred_until stored
- overdue detectable via query
- future worker can consume fields (worker not in v1)

---

## Phase 7 — Receipts

**Hist:** created, status changed, completed, broken  
**CFO:** model, tokens/cost estimate, extraction attempts, useful-work result

---

## Phase 8 — SNT must break

- empty text
- no promise
- vague promise
- duplicate
- missing due date
- private/sensitive text
- malicious input
- false extraction attempt
- status update on missing id

**PASS:** SNT cannot produce false commitment or fake green.

---

## Phase 9 — Final acceptance receipt

`products/receipts/CONVERSATION_COMMITMENTS_V1_ACCEPTANCE.json`:

```json
{
  "verdict": "PASS",
  "git_sha": "...",
  "railway_sha": "...",
  "tests_passed": [],
  "tests_failed": []
}
```

---

## System execution path (Conductor directs, does not type)

1. `npm run builder:preflight`
2. Phase 0: `POST /api/v1/lifeos/builder/build` → `products/LIFEOS.md` (or BPB if product doc is BPB-owned)
3. Phase 1: system authors BP + acceptance script skeleton
4. Phases 2–9: **`POST /build`** per phase or one BP with steps — **receipt each**
5. Conductor: audit diff, run acceptance, report PASS/FAIL only to Adam

**If `/build` fails:** GAP-FILL platform only — log in receipt; do not hand-implement product routes.

---

## Known salvage (do not rebuild from scratch)

| Exists | Path |
|--------|------|
| commitments table + tracker | `services/commitment-tracker.js`, migration `20260430_lifeos_commitments.sql` |
| Core API (partial) | `routes/lifeos-core-routes.js` `/commitments/*` |
| Split-brain (must fix) | `routes/lifeos-commitment-routes.js`, `lifeos_commitments` table |
| Extract endpoint (partial) | POST `/commitments/extract` — needs evidence fields + rules |
| Mission PSSOT | `builderos-reboot/MISSIONS/PRODUCT-CONVERSATION-COMMITMENTS-C2-0001/PSSOT.md` |

---

## Conductor overreach log (weakness probe)

These were done by IDE Conductor **instead of the system** — they **mask** builder weakness and must **not** count as Objective 1 PASS:

| Artifact | Problem |
|----------|---------|
| `scripts/run-commitments-v1-slice-proof.mjs` | Conductor wrote + ran proof |
| `SLICE_001.json`, `CURRENT_SLICE.json` | Conductor scoped slice without factory |
| CRUD proof exit 0 | Proves API exists, **not** that builder completes objectives |

**Weakness hypothesis:** anywhere Conductor hand-coded = builder/factory cannot yet own that step. Fix the **platform**, not the product, until `/build` succeeds.

---

## Message to CUR / overnight

Do not start other LifeOS work. Execute **LifeOS Objective 1** phases 0→9 in order. One acceptance command. PASS or UNSOLVED + alert. Conductor observes and reports — does not substitute.

---

## Adam ↔ Conductor contract for this objective

- **Phase A:** Conductor may oppose with solutions before lock
- **Phase B:** After lock, system executes; Conductor runs acceptance and reports COMPLETE or NOT COMPLETE only

**Locked:** 2026-06-11 — this handoff is the BP authority for Objective 1.
