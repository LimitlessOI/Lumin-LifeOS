<!-- SYNOPSIS: PSSOT → Blueprint conversion guide -->

# PSSOT → Blueprint conversion guide

**Audience:** BPB  
**Mission:** `PRODUCT-CONVERSATION-COMMITMENTS-C2-0001`  
**Input:** `PSSOT.md` + linked mission artifacts  
**Output:** `BLUEPRINT.json` + wired `ACCEPTANCE_TESTS.json`

---

## Principle

**PSSOT is unstructured-to-structured truth.** BPB's job is deterministic conversion — not reinterpretation. If PSSOT says "7-day only," the blueprint has no 30-day steps.

---

## Read order

1. `PSSOT.md` — master  
2. `FOUNDER_INTENT_LOCK.md` — locked decisions  
3. `BPB_HANDOFF_SPEC.md` — step intents + reject list  
4. `SALVAGE_REVIEW.json` — per-file classification  
5. `ACCEPTANCE_TESTS.json` — test IDs  

---

## Section mapping

| PSSOT / artifact | Blueprint field |
|------------------|-----------------|
| 7-day MVP flow | `scope`, phase order `P0`…`P5` |
| Salvage ADAPT/IMPORT rows | `target_file`, `allowed_context_files` |
| REJECT rows | `forbidden_context_files` or global `non_goals` |
| Locked decisions | `content_or_patch_contract` / step titles |
| Evidence First | Steps on `commitment-tracker.js`, UI evidence modal |
| Split-brain | Minimum one step: route consolidation |
| Out of scope | Every step gets relevant `non_goals[]` |
| AT-CC7-* tests | `acceptance_test_ids[]` per step |

---

## Required blueprint properties

Per factory schema (`BLUEPRINT_SCHEMA.json`):

- `mission_id`, `blueprint_id`, `steps[]`  
- Each step: `step_id`, `phase_id`, `target_file`, `action_type`, `dependencies`, `non_goals`, `acceptance_test_ids`, `sandbox_boundary`, `authority_owner`, `on_block`  

Factory execute today: **`write_file_exact` only** — stage full files in `ARTIFACTS/` then copy to production paths.

---

## Phase template (this mission)

| Phase | Intent | Example targets |
|-------|--------|-----------------|
| P0 | Evidence schema | migration, `ARTIFACTS/EVIDENCE_SCHEMA.json` |
| P1 | Extract + stage | `commitment-tracker.js`, `lifeos-event-stream.js` |
| P2 | API + route fix | `lifeos-core-routes.js`, `register-runtime-routes.js` |
| P3 | UI proof loop | `lifeos-mirror.html`, `lifeos-today.html` |
| P4 | C2 embed doc | `ARTIFACTS/C2_EMBED_PATH.md` |
| P5 | Verify + SSOT receipt | verify script, `AMENDMENT_21` receipt row |

---

## Validation before freeze

```bash
npm run factory:ci
# After BLUEPRINT.json exists:
# GET /factory/gates/intake?mission_id=PRODUCT-CONVERSATION-COMMITMENTS-C2-0001
```

Blueprint must pass `blueprint-freeze-check.js` (all required step fields).

---

## After execute (amendment path)

Shipped code → `@ssot` tags → **`AMENDMENT_21_LIFEOS_CORE.md`** change receipt.  
PSSOT remains mission history; amendment becomes operational law for the domain.
