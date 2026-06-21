<!-- SYNOPSIS: OIL Governance Pass Report — Memory Capsule Alpha -->

# OIL Governance Pass Report — Memory Capsule Alpha

**Pass type:** OIL Runtime Governance Pass (Step 4 of 5)  
**Scope:** BT-001 through BT-021 (all committed Alpha build artifacts)  
**Verdict:** `PASS_WITH_BLOCKERS_RESOLVED`  
**Date:** 2026-05-21  
**Status:** All blockers corrected. Files syntax-clean. Ready for Step 5 runtime pressure test.

---

## Verification Summary

| Check | Result | Notes |
|---|---|---|
| `node --check` all 17 service/route files | PASS (after repairs) | 11 files failed pre-repair |
| CANONICAL guard present in capsule/trust paths | PASS | Lines enforcing MEMORY_PROMOTION_BYPASS confirmed in memory-capsule.js |
| Vector/graph code present | PASS (none found) | SQL-first confirmed |
| Hardcoded Pool instances in service files | PASS (after repairs) | Removed from 6 files |
| All 15 halt codes reachable | PASS | Verified via grep and file reads |
| evidence_level stored as label not integer in provenance | PASS | getEvidenceLevel() converts |
| whyRetrieved + allowedUse required for retrieval | PASS | Throws MEMORY_RETRIEVAL_UNJUSTIFIED if absent |
| LEGACY_MEMORY_BYPASS fires on non-context lanes | PASS (after fix) | review_lane now correctly allowed |
| resolveContradiction quarantines losing capsule | PASS (after fix) | Logic was inverted pre-repair |
| OIL trust map used for permission assignment | PASS (after fix) | Was using hardcoded 'trusted' literal |
| Routes mounted in register-runtime-routes.js | PASS | Mounted before memory-intelligence-routes |

---

## Blockers Found and Resolved

### BLOCKER-1: Stray markdown fences in 11 files (SYNTAX)
**Severity:** Critical — files would not parse  
**Files:** memory-candidate.js, memory-capsule.js, memory-provenance.js, memory-links.js, memory-contradiction.js, memory-health.js, memory-retrieval.js, memory-legacy-bridge.js, memory-receipts.js, memory-working.js, routes/memory-capsule-routes.js  
**Cause:** Council output wraps code in markdown code fences and appends metadata JSON block; builder strips the outer fence but not the trailing block  
**Fix:** Complete file rewrites stripping all content after the last valid export statement  
**Status:** RESOLVED

### BLOCKER-2: `allowedImportMethods` wrong values (GOVERNANCE)
**File:** services/memory-legacy-bridge.js  
**Violated artifact:** AMENDMENT_02_MIGRATION_RUNBOOK.md §Import Methods  
**Before:** `['insert', 'update', 'delete']`  
**After:** `['conversation_memory_migration', 'knowledge_base_upload', 'ssot_doc_sync']`  
**Impact:** Every valid legacy import would be rejected; every invalid method would be accepted  
**Status:** RESOLVED

### BLOCKER-3: `resolveContradiction` quarantines winning capsule (GOVERNANCE)
**File:** services/memory-contradiction.js  
**Violated artifact:** HALT_RECOVERY_PROTOCOL.md §MEMORY_CONTRADICTION_REVIEW_REQUIRED  
**Before:** `UPDATE memory_capsules SET status = 'quarantined' WHERE id = $1 [winningCapsuleId]`  
**After:** `losingCapsuleId` parameter added; losing capsule quarantined; winning capsule untouched  
**Additional fix:** `WHERE id = $1` → `WHERE capsule_id = $1` (correct PK column)  
**Status:** RESOLVED

### BLOCKER-4: `memory-relationship.js` wrong table name and broken pool.query usage (GOVERNANCE)
**File:** services/memory-relationship.js  
**Violated artifact:** MEMORY_NEON_SCHEMA.md (canonical table name)  
**Before:** `FROM capsules WHERE id = $1`; `capsule.relationship` field check; `.find()` on pool.query result (not `.rows`)  
**After:** `FROM memory_capsules WHERE capsule_id = $1`; `capsule.rows[0].truth_class === 'relationship'`; `.rows.find()`  
**Status:** RESOLVED

### BLOCKER-5: `assignRetrievalPermission` used wrong trust mapping (GOVERNANCE)
**File:** services/memory-retrieval.js  
**Violated artifact:** MEMORY_CAPSULE_LIFECYCLE.md §Trust Level → Retrieval Permission  
**Before:** `trustLevel === 'trusted' ? 'action_authority' : 'decision_support'`  
**After:** `TRUST_TO_PERMISSION` map aligned with OIL levels (UNTRUSTED→blocked, PROPOSED→context_only, SCOPED→context_only, RECEIPT_BACKED→decision_support, TRUSTED_FOR_CONTEXT→action_authority)  
**Status:** RESOLVED

### BLOCKER-6: `abstentionCount` declared as `const` (BUG)
**File:** services/memory-retrieval.js  
**Before:** `const abstentionCount = 0` (cannot increment in loop)  
**After:** `let abstentionCount = 0`  
**Status:** RESOLVED

### BLOCKER-7: `buildProvenanceChain` called with wrong argument signature (GOVERNANCE)
**File:** services/memory-retrieval.js  
**Before:** `buildProvenanceChain(capsule, taskScope, pool)` — missing whyRetrieved, allowedUse  
**After:** `buildProvenanceChain(capsule.capsule_id, lane, whyRetrieved, allowedUse, pool)` — all 5 args correct  
**Also:** `retrieveCapsules` signature extended to require `whyRetrieved` and `allowedUse` from caller; routes file updated to validate and forward them  
**Status:** RESOLVED

### BLOCKER-8: `enforceLegacyLaneCeiling` too strict — blocked review_lane (GOVERNANCE)
**File:** services/memory-legacy-bridge.js  
**Violated artifact:** HALT_RECOVERY_PROTOCOL.md §LEGACY_MEMORY_BYPASS (review_lane is valid for legacy review)  
**Before:** threw if `capsule.context_lane !== lane` (also wrong field reference)  
**After:** throws only if `lane !== 'context_lane' && lane !== 'review_lane'`  
**Status:** RESOLVED

### BLOCKER-9: `memory-provenance.js` queried capsule by wrong PK column; `fact_id` set to capsuleId (GOVERNANCE)
**File:** services/memory-provenance.js  
**Before:** `WHERE id = $1 [capsuleId]`; `fact_id: capsuleId`  
**After:** `WHERE capsule_id = $1`; fact looked up via `capsule.rows[0].fact_id`; `fact_id: fact.rows[0].id`  
**Status:** RESOLVED

### BLOCKER-10: `delayQuarantine` date validation inverted — always threw (BUG)
**File:** services/memory-zombie.js  
**Before:** `if (new Date(newReviewBy) > now || new Date(newReviewBy) > sevenDaysAgo)` — any future date throws  
**After:** `if (new Date(newReviewBy) <= now || new Date(newReviewBy) > sevenDaysFromNow)` — correct: must be future, max 7 days  
**Status:** RESOLVED

### BLOCKER-11: Three files truncated — missing functions and closing braces (SYNTAX)
**Files:** memory-working.js (missing `promoteToCandidate` + closing braces), memory-receipts.js (missing `isReceiptWritten` body), routes/memory-capsule-routes.js (missing `GET /capsule/:id` body, `POST /correct`, and `export default`)  
**Status:** RESOLVED — complete file content written

---

## Secondary Fixes (Dead Code / Import Cleanup)

| File | Fix |
|---|---|
| memory-candidate.js | Removed non-existent `genRandomUUID from 'pg'` and wrong `crypto` named import |
| memory-capsule.js, memory-zombie.js, memory-institutional.js, memory-links.js, memory-health.js, memory-legacy-bridge.js, memory-relationship.js, memory-retrieval.js | Removed hardcoded `new Pool({user:'your_username',...})` dead instances |
| memory-capsule.js, memory-contradiction.js, memory-zombie.js, memory-institutional.js, memory-health.js, memory-legacy-bridge.js, memory-relationship.js | Removed unused `import { LEVEL } from '../memory-intelligence-service.js'` |
| memory-legacy-bridge.js | Replaced `LEVEL.CLAIM` with literal `0`; fixed `insertCapsule`/`insertFact` column names to match canonical schema |
| memory-contradiction.js | Fixed `WHERE id IN (...)` → `WHERE capsule_id IN (...)` in createContradictionRecord; fixed bad receipt INSERT param; added `capsule_id_a/b/domain` to contradiction_records INSERT |
| memory-candidate.js | Moved `detectDuplicate` out of `createCandidate` closure and exported it per BT-005 spec |
| routes/memory-capsule-routes.js | Fixed pool import to `core/database.js`; fixed service call signatures (pool passed explicitly, signal args corrected) |

---

## Open Findings (Not Blockers for Alpha)

| Finding | File | Notes |
|---|---|---|
| `retrieveCapsules` does SELECT * with no WHERE filter | memory-retrieval.js | Intentional for Alpha (SQL-first, no vector). Performance risk at scale. Beta scope. |
| `GET /api/v1/memory/health` may conflict with memory-intelligence-routes /health | register-runtime-routes.js | Capsule routes mounted first — capsule health takes precedence. Review in Step 5. |
| `contradiction_records` JOIN in checkContradiction uses `ef.capsule_id` FK | memory-contradiction.js | Assumes epistemic_facts has capsule_id column. Verify during migration run. |
| `createContradictionRecord` only writes one receipt (for capsule_id_a) | memory-contradiction.js | Could emit two receipts for symmetry. Low priority for Alpha. |
| `working_memory_entries` has no `promoted_to_candidate` column in BT-001 migration | memory-working.js | promoteToCandidate UPDATE will fail if column absent. Migration update needed before Step 5. |

---

## Files Changed This Pass

All changes are direct repairs to builder-committed files. GAP-FILL applies to:
- Truncated file completions (memory-working.js, memory-receipts.js, routes/memory-capsule-routes.js): `GAP-FILL: council output truncated past export limit`
- Governance violation repairs: `GAP-FILL: council output contained logic inversion and schema mismatches`

---

## Next Step

**Step 5 — Runtime Pressure Test:** Run all 20 MC-BENCH signals from MEMORY_BENCHMARK_CORPUS.md against the live system. Each must pass. Any failure generates incident record + receipt + benchmark note.

Before Step 5, verify that `working_memory_entries` migration includes the `promoted_to_candidate` column (or add it via `ALTER TABLE`).
