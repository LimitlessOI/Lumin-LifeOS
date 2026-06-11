# AIC → BPB Handoff Spec — 7-Day MVP Blueprint

**Mission:** `PRODUCT-CONVERSATION-COMMITMENTS-C2-0001`  
**From:** AIC (AI Council — Product Development)  
**To:** BPB (Blueprint Builder)  
**Date:** 2026-06-09  
**Status:** Ready for blueprint authoring — **do not execute builder steps until operator billing gate clears**

---

## Agent identity

You are **BPB**. Your job in this pass:

1. Read upstream artifacts (below)  
2. Produce **`BLUEPRINT.json`** (7-day MVP slice only)  
3. Produce **`ACCEPTANCE_TESTS.json`** (wired to every step)  
4. Optionally stage **`ARTIFACTS/`** full-file drafts that `write_file_exact` steps copy into the production spine  

You are **not** the Conductor. You are **not** authorized to hand-code production features outside the blueprint. You are **not** executing paid model calls in this pass unless the operator explicitly enables billing.

---

## Headline (do not lose this)

**~60–70% of the 7-day MVP already exists.** This blueprint is **salvage + wire + consolidate**, not greenfield. If your blueprint reads like “build Conversation Commitments from scratch,” you failed intake.

**Proof loop (only scope):**

```text
Conversation → Extract → Approval → Commitment → Today/Overdue
```

---

## Operator execution gate (not a BPB blocker)

Adam is aligning **API billing to his debit card** before any token spend. That blocks **execute**, not **blueprint authoring**.

| Phase | Billing required? |
|-------|-------------------|
| Read upstream + write `BLUEPRINT.json` | **No** |
| `npm run factory:ci` / intake gate probe | **No** |
| `POST /factory/execute-step` | **Yes** — after operator confirms billing |
| `POST /api/v1/lifeos/builder/build` | **Yes** — Railway council keys + billing |

Document in blueprint `operator_notes`: *No execute until founder billing receipt.*

---

## Mandatory read order (before first step)

| # | File | Why |
|---|------|-----|
| 1 | `PSSOT.md` | Master — brainstorm dump + mission truth |
| 2 | `PSSOT_TO_BLUEPRINT.md` | PSSOT → BLUEPRINT conversion rules |
| 3 | `FOUNDER_INTENT_LOCK.md` | Locked decisions — overrides Phase 0 open items |
| 4 | `FOUNDER_PACKET.md` | Technical appendix (Evidence First, TSOS, providers) |
| 5 | `LIFEOS_SALVAGE_ASSESSMENT.md` | Classifications + split-brain finding |
| 6 | `SALVAGE_REVIEW.json` | Machine salvage rows — must stay consistent |
| 7 | `ACCEPTANCE_TESTS.json` | Extend, do not replace |
| 6 | `docs/C2_CANONICAL_DEFINITION.md` | C2 = bridge, not brain |
| 7 | `prompts/00-SYSTEM-AUTHORITY-LAYERS.md` | Production spine vs factory runtime |
| 8 | `builderos-reboot/MISSIONS/FACTORY-REBOOT-0002/ARTIFACTS/factory-core/bpb/BLUEPRINT_SCHEMA.json` | Step shape |

---

## Locked founder intent (non-negotiable)

| Topic | Rule |
|-------|------|
| Scope | **7-day MVP only** — see §Explicit reject list |
| C2 | **Long-term destination**; v1 ships in Mirror/Today with **documented C2 embed path** — no new standalone dashboard |
| Table | **`commitments`** via **`services/commitment-tracker.js`** |
| API | **`routes/lifeos-core-routes.js`** — consolidate split-brain |
| Privacy | **`is_public` default false** — private unless explicitly shared |
| Evidence | **Evidence First Law** — every extraction preserves auditable bundle |
| Salvage | No silent reuse — every touched legacy file cites `SALVAGE_REVIEW.json` bucket |

---

## Evidence First schema (BPB must embed in steps)

Store in `commitments.source_ref` as JSON string (v1) or dedicated `evidence_json` column if migration step adds it.

```json
{
  "source_conversation_id": "lifeos_event_stream.id or capture batch id",
  "source_quote": "verbatim span from conversation",
  "source_timestamp": "ISO-8601",
  "confidence": 0.85,
  "extraction_method": "council:gemini-flash-2.0|manual",
  "extracted_at": "ISO-8601",
  "event_action_id": "lifeos_event_actions.id when staged"
}
```

**UI requirement:** Every approved commitment exposes **“Why does LifeOS think this exists?”** → renders the bundle. No bundle → cannot promote to `status: open`.

---

## Split-brain fix (required blueprint theme)

**Problem (verified in repo):**

| Call | Hits |
|------|------|
| `GET /api/v1/lifeos/commitments` | `lifeos-commitment-routes.js` → **`lifeos_commitments`** |
| `POST /api/v1/lifeos/commitments/:id/keep` | `lifeos-core-routes.js` → **`commitments`** |
| Event stream apply | `commitment-tracker.js` → **`commitments`** |

**Blueprint must:** consolidate **all 7-day MVP reads/writes** on `commitment-tracker.js` / `commitments` table. Options (pick one, document in blueprint):

- **A (preferred):** Redirect `lifeos-commitment-routes.js` GET/POST list to delegate to `commitment-tracker.js`; stop writing `lifeos_commitments` in v1 path  
- **B:** Unmount duplicate prefix in `startup/register-runtime-routes.js` and update Today overlay to use core endpoints only  

**Do not** merge mission-runtime `commitments` (with `mission_id`) into this product path.

---

## Existing assets to wire (salvage map)

| Asset | Classification | Blueprint use |
|-------|----------------|---------------|
| `services/lifeos-event-stream.js` | ADAPT_AND_IMPORT | Paste capture; stage actions; **disable auto-apply** for 7-day path |
| `routes/lifeos-core-routes.js` | ADAPT_AND_IMPORT | `POST /events/capture`; commitment CRUD; new approve endpoints |
| `services/commitment-tracker.js` | IMPORT_AS_IS → ADAPT | Evidence in extract + log; pending → open approval |
| `public/overlay/lifeos-mirror.html` | ADAPT_AND_IMPORT | Approve + evidence modal (primary review surface) |
| `public/overlay/lifeos-today.html` | ADAPT_AND_IMPORT | Today/overdue list after consolidation |
| `services/lifeos-commitment-tracker.js` | REFERENCE_ONLY | Do not use as v1 write path |
| `routes/lifeos-commitment-routes.js` | ADAPT or REFERENCE | Fix split-brain only |
| `public/overlay/lifeos-command-center.html` | REFERENCE_ONLY | Deep-link / embed note only — no rebuild |
| Word Keeper / coaching / calendar / Sherry | REJECT / deferred | **No steps** |

**Ingest endpoint (today):** `POST /api/v1/lifeos/events/capture` (`lifeos-core-routes.js`).

---

## Explicit reject list (steps touching these = intake failure)

- Waiting-on / unconfirmed buckets (beyond staging unapproved suggestions)
- Calendar write or staging
- Sherry / `shared_commitments` / household UI
- Word Keeper audio pipeline
- Coaching, Programs Map, therapist mode
- Full Command Center rebuild
- New standalone commitment dashboard HTML
- Factory council adapter for product extraction
- `factory-staging/` as product runtime target (factory **executes**; product **lives** in production spine)

---

## Recommended blueprint phases (BPB materializes steps)

BPB assigns `step_id`, `dependencies`, `exact_inputs`, `sha256` contracts, and `non_goals` per step.

### P0 — Evidence contract + schema

| Step intent | Target (example) | Notes |
|-------------|------------------|-------|
| Evidence schema artifact | `builderos-reboot/MISSIONS/.../ARTIFACTS/EVIDENCE_SCHEMA.json` | Canonical JSON shape |
| DB migration (optional but recommended) | `db/migrations/YYYYMMDD_commitment_evidence.sql` | `evidence_json JSONB` on `commitments` OR document `source_ref` JSON-only v1 |

### P1 — Extraction + staging

| Step intent | Target | Notes |
|-------------|--------|-------|
| Extend extract prompt + return shape | `services/commitment-tracker.js` | Add quote, confidence, method to extract output |
| Persist evidence on log | same | `source: 'conversation'`, `source_ref` = JSON bundle |
| Pending status | same | New rows from extract → `status: pending_approval` (or staging table via event actions only until approved) |
| Event stream gate | `services/lifeos-event-stream.js` | 7-day path: **suggested** actions only; `autoApply: false` default; no calendar apply |

### P2 — API: approve + list unified

| Step intent | Target | Notes |
|-------------|--------|-------|
| Approve/reject endpoints | `routes/lifeos-core-routes.js` | Promote pending → open; reject → cancelled |
| List open + overdue + pending | same | Single source via commitment-tracker |
| Route consolidation | `routes/lifeos-commitment-routes.js` and/or `startup/register-runtime-routes.js` | Fix split-brain |

### P3 — UI: proof loop

| Step intent | Target | Notes |
|-------------|--------|-------|
| Paste/capture UI or wire existing | `public/overlay/lifeos-mirror.html` | Trigger capture; show staged suggestions |
| Approve/reject controls | same | |
| Evidence modal | same | “Why does LifeOS think this exists?” |
| Today/overdue after approve | `public/overlay/lifeos-today.html` | Uses consolidated GET |

### P4 — C2 embed path (documentation-first)

| Step intent | Target | Notes |
|-------------|--------|-------|
| C2 deep-link contract | `docs/` or mission `ARTIFACTS/C2_EMBED_PATH.md` | How CC surfaces Mirror/Today commitment panel later — **not** full CC rebuild |

### P5 — Verification (no AI required to run locally)

| Step intent | Target | Notes |
|-------------|--------|-------|
| Acceptance script | `scripts/verify-product-commitments-7day.mjs` | Static checks: routes exist, evidence fields in schema, no forbidden imports |
| SSOT receipt | `docs/projects/AMENDMENT_21_LIFEOS_CORE.md` | Change receipt row only |

---

## Factory execution pattern (critical)

Factory hot path today supports **`write_file_exact` only** (`factory-staging/factory-core/builder/run-step.js`).

**Required pattern for production spine files:**

1. BPB drafts complete file in `builderos-reboot/MISSIONS/PRODUCT-CONVERSATION-COMMITMENTS-C2-0001/ARTIFACTS/<mirror-path>`  
2. Blueprint step: `content_source_path` → that artifact → `target_file` → production path  
3. `sandbox_boundary` must cover target (e.g. `services/**`, `routes/**`, `public/overlay/**`, `db/migrations/**`)  
4. `authority_owner`: `BPB` for artifact steps; `Coder` for execute-step  
5. `on_block`: `BLOCKED_RETURN_TO_BPB`

**Two builders coexist** (honest): factory execute-step vs production Railway builder. This mission targets **production spine files** via factory `write_file_exact` unless a step explicitly delegates to `ProductionBuilder` with a documented GAP receipt.

---

## BPB deliverables checklist

| Artifact | Required | Validator |
|----------|----------|-----------|
| `BLUEPRINT.json` | **Yes** | `blueprint-freeze-check.js` — every step has `step_id`, `action_type`, `target_file`, `sandbox_boundary`, `authority_owner`, `on_block` |
| `ACCEPTANCE_TESTS.json` | **Yes** | Every step lists `acceptance_test_ids` |
| `SALVAGE_REVIEW.json` | Already complete | Must remain consistent with steps |
| `FOUNDER_PACKET.json` | Already updated | Strict intake fields present |
| `PRODUCT_DEVELOPMENT_RESULT.json` | Already PASS | See operator gates |

---

## Intake gate self-check (before handoff to execute)

```bash
npm run factory:ci
# When blueprint exists:
# GET /factory/gates/intake?mission_id=PRODUCT-CONVERSATION-COMMITMENTS-C2-0001
```

**Strict mode** (`strict_upstream_gates: true`): requires `PRODUCT_DEVELOPMENT_RESULT.status === PASS` and empty `unresolved_questions`. Operator smoke test is listed under `operator_execution_gates`, not strategic unresolved.

---

## Success criteria (blueprint quality)

BPB succeeds when another cold agent can:

1. Run factory intake → **BPB_INTAKE_PASS**  
2. Execute steps in order without inventing scope  
3. After execute (post-billing), Adam can paste a conversation, approve commitments, see Today/Overdue, and click evidence on every row  
4. No step implements 30-day deferred features  

---

## Failure criteria (return BLOCKED_RETURN_TO_BPB)

- Blueprint builds from scratch ignoring salvage  
- Steps touch REJECT list assets  
- Steps create standalone commitment dashboard  
- Steps write calendar / Sherry / coaching  
- Split-brain left unfixed  
- Missing Evidence First on extract/log/UI steps  
- Missing acceptance tests per step  
- `sandbox_boundary` allows `server.js` composition hacks (forbidden — use `startup/` / `routes/`)  

---

## AIC sign-off

| Check | Status |
|-------|--------|
| Phase 0 salvage | Complete |
| Founder intent | Locked |
| Strategic ambiguity | None for 7-day slice |
| Table / API choice | Evidence-based — `commitments` + core routes |
| Execute authorized | **No** — pending operator billing |
| Blueprint authorized | **Yes** |

**Next owner:** BPB → produce `BLUEPRINT.json` + finalize `ACCEPTANCE_TESTS.json`.
