# Build Execution Blocker Sequence Plan V1

**Status:** `AUTHORITATIVE PLAN` (doc-only — no runtime code in this slice)  
**Date:** 2026-06-14  
**Agent role:** Build-readiness planning audit (read-only)  
**Inputs:**
- Live connection truth check (2026-06-14): infra CONNECTED; governed build BROKEN at ZONE3 and DONE gate
- `docs/CANONICAL_ARCHITECTURE_RECONCILIATION_V1.md`
- `docs/BUILDER_EXECUTION_DUPLICATION_AUDIT.md`
- `docs/PASS_DONE_AUTHORITY_AUDIT_V1.md`
- `docs/COMPLETION_AUTHORITY_CONSOLIDATION_PLAN_V1.md`
- `docs/BUILDEROS_CONSOLIDATION_ROADMAP_V1.md`
- `services/builderos-build-done-gate-helper.js`
- `services/builderos-completion-authority.js`
- `routes/lifeos-council-builder-routes.js`
- `services/builderos-governed-loop-executor.js`
- `services/builderos-oil-job-audit.js`
- `services/builderos-patch-mode-policy.js`
- `services/builderos-control-plane-service.js`
- `services/tsos-platform-kernel.js`

---

## 1. Current build-readiness status

| Layer | Status | Evidence |
|-------|--------|----------|
| **Infrastructure** | READY | OpenAI, Claude, Gemini, Neon, Railway deploy sync, Voice Rail routing, `/builder/build` route — live probes 2026-06-14 |
| **Pre-commit path (OIL boundary)** | BLOCKED for common targets | CC jobs → `ZONE3_PATCH_REQUIRED` at `oil_boundary_audit` when `target_file` >150 lines |
| **Governed loop → `/build`** | PARTIAL | Zone 1/2 targets can reach `/builder/build`; zone 3 never calls `/build` |
| **Post-commit measurement** | BROKEN on non-kernel path | `BUILDEROS_DONE_BLOCKED: missing_proof:token_receipt,build_end_time,oil_receipt` when ledger incomplete |
| **Completion authority** | PARTIAL (kernel path restored) | `builderos-completion-authority.js` exists; kernel-managed `/build` now defers only DONE gate and still runs completion authority before success. Non-kernel paths can still be blocked by DONE before completion. |
| **Governed loop outcome verify** | READY (when job completes) | `verifyGovernedOutcomeBeforePass()` in `builderos-governed-loop-executor.js` — only reached if `/build` returns success |

**Summary:** The system can talk to providers and commit files, but **cannot complete a governed build end-to-end** on typical proof targets because blockers fire in sequence — first at zone policy (pre-build), then at measurement DONE gate (post-commit).

---

## 2. Exact blocker sequence

Governed path (Voice Rail / command-control → governed loop):

```
Founder command
    │
    ▼
[B0] Command-control job create + execute          ← API CONNECTED
    │
    ▼
[B1] OIL boundary audit (deterministic)            ← services/builderos-oil-job-audit.js
    │   classifyBuildTarget() zone 3/4             ← services/builderos-patch-mode-policy.js
    │   FAIL → job status: blocked, never calls /build
    ▼
[B2] PBB plan generation                           ← must produce valid target + task
    │
    ▼
[B3] POST /api/v1/lifeos/builder/build             ← platformKernel.wrapBuild when mounted
    │   precommit governance, syntax gates
    │   commitToGitHub()                           ← commit happens HERE
    ▼
[B4] Measurement ledger (build_task_ledger)        ← recordBuildStart/Complete via kernel ONLY
    │   requires: token_receipt, oil_receipt, build_end_time
    ▼
[B5] DONE gate                                     ← evaluateBuildDoneGateForBuildResponse()
    │   canMarkBuildDone()                         ← services/builderos-control-plane-service.js
    │   FAIL → 409 BUILDEROS_DONE_BLOCKED
    ▼
[B6] Completion authority                          ← grantBuildCompletion()
    │   verifyGovernedOutcomeBeforePass()
    │   FAIL → 409 FAIL_WRONG_OUTCOME / FAIL_MISSING_EVIDENCE
    ▼
[B7] HTTP success + governed loop outcome check    ← loop-level verifyGovernedOutcomeBeforePass()
    │
    ▼
job status: committed
```

Direct `/builder/build` (no CC) skips B0–B2 but hits B3–B6 in the same order inside `buildAndCommit`.

---

## 3. Which blocker must be fixed first

**First fix: B1 — target / zone policy alignment** (not measurement, not completion authority).

Reason: Until the job passes OIL boundary audit, **`/builder/build` is never invoked**. Fixing DONE gate or completion authority first does not unblock Voice Rail proof scripts that target zone-3 files (e.g. `scripts/run-voice-rail-capability-proof.mjs` at 361 lines).

**For a live build test today, pick one:**

| Strategy | Action | Unblocks |
|----------|--------|----------|
| **A — Zone 1/2 target** | Use new file or file ≤50 lines (zone 1) / ≤150 lines caution (zone 2) | B1 pass → reaches B3 |
| **B — Extract-helper plan** | PBB plan must declare patch-mode / helper extraction for zone 3 | B1 pass with policy-compliant plan |
| **C — Policy change** | Raise threshold or allow supervised zone-3 with patch mode | Requires explicit founder mission — not default |

After B1 is cleared, **second fix: B4 — measurement evidence wiring** (token + OIL + `build_end_time` on `build_task_ledger` for `task_id`).

---

## 4. Which blocker must not be bypassed

| Gate | Do not bypass | Why |
|------|---------------|-----|
| **Zone 3 / zone 4 classification** | Hard-disable `ZONE3_PATCH_REQUIRED` without extract-helper | Produces stub commits on large files — false delivery |
| **OIL boundary audit** | Skip `auditCommandControlJobBoundary` | Unsafe targets, drift, empty instructions |
| **Precommit governance** | Commit without syntax/stub/anti-pattern scan | Broken code lands in `main` |
| **Outcome verification** | Return success without `verifyGovernedOutcomeBeforePass` | Wrong-outcome commits (Multi-Lane vs §2.18 class) |
| **Completion authority** | `BUILDEROS_COMPLETION_AUTHORITY=0` except break-glass | Re-opens FAIL_OPEN terminal paths |
| **Hist / safe-scope** | `isSafeTarget` false positives | Writes outside builder safe scope |

**May be demoted (not bypassed):** DONE gate as **terminal** authority — see §6. Measurement can stay required as **evidence**, not as the sole success signal.

---

## 5. Whether DONE gate is running too early

**Yes — in two senses.**

### 5a. Sequence order (relative to completion authority)

Current `/build` success path in `routes/lifeos-council-builder-routes.js`:

1. `commitToGitHub()` — commit already landed  
2. `evaluateBuildDoneGateForBuildResponse()` — **B5**  
3. `evaluateBuildCompletionForBuildResponse()` — **B6**

If B5 fails, B6 **never runs**. That matches the live observation: completion authority did not run because DONE gate blocked first.

Per `COMPLETION_AUTHORITY_CONSOLIDATION_PLAN_V1.md` Phase 3 (F5): DONE gate should become **evidence-only**; terminal grant belongs to completion authority.

### 5b. Evidence availability (relative to commit)

`canMarkBuildDone()` requires `build_task_ledger` row with:

- `token_receipt_id` (or unmetered exception / `token_usage_log` match)
- `oil_receipt_id` (or `security_receipts` match)
- `end_time`

These are written by **`tsos-platform-kernel.js`** via `recordBuildStart` / `recordBuildComplete` on the **kernel-wrapped** `/build` path. The bare `buildAndCommit` handler does **not** call `recordBuildStart` or `recordBuildComplete`.

When `req.__kernel_managed_build === true`, DONE gate evaluation **defers** (`done_gate_deferred_to_kernel`). When that flag is absent, or ledger rows exist but are incomplete, B5 fails **after commit** with `missing_proof:*`.

**Conclusion:** DONE gate runs at the wrong layer when it blocks terminal success before measurement evidence is guaranteed — and before completion authority runs.

---

## 6. Whether completion authority should run before or after DONE gate

| Phase | Order | Rationale |
|-------|-------|-----------|
| **Current (broken UX)** | Commit → DONE gate → completion authority | DONE gate can block before outcome check runs |
| **Target (consolidation plan)** | Commit → collect measurement evidence → completion authority → attach measurement as `evidence_only` | Single terminal writer; DONE gate never alone grants PASS |
| **Outcome verifier input** | Requires **commit SHA** | Must run **after** `commitToGitHub()` |
| **Technical precommit** | Requires generated output | Must run **before** commit |

**Recommended terminal order:**

```
precommit (technical) → commit → [measurement evidence async/sync] → grantBuildCompletion() → response
```

DONE gate (`canMarkBuildDone`) feeds **measurement_complete** into completion authority input — it must **not** short-circuit completion authority.

**Kernel path note (2026-06-14 correction):** When `kernelManaged`, only DONE-gate evaluation is deferred to the kernel for ledger proof ordering. Completion is no longer deferred to the kernel; the route calls `grantBuildCompletion()` before returning any committed success response. The remaining consolidation gap is making kernel measurement evidence feed completion as evidence, not restoring a kernel-side completion bypass.

---

## 7. What evidence must exist before commit

| Evidence | Source | Gate |
|----------|--------|------|
| Valid instruction + safe `target_file` | OIL boundary audit | B1 |
| Zone 1/2 or approved patch-mode plan | `classifyBuildTarget` + PBB | B1–B2 |
| Generated output passes syntax / HTML / SQL checks | precommit path in `/build` | B3 |
| `runPrecommitGovernance()` pass | `builderos-precommit-governance.js` | B3 |
| `isSafeTarget(resolvedTarget)` | `config/builder-safe-scope.js` | B3 |
| Council / model routing (when not execution-only) | builder dispatch | B3 |

**Not required before commit:** token receipt, OIL security receipt row, `build_end_time`, outcome parity (needs SHA).

---

## 8. What evidence can only exist after commit

| Evidence | Why after commit | Consumer |
|----------|------------------|----------|
| `commit_sha` / `goldenSha` | Produced by `commitToGitHub()` | completion authority, outcome verifier |
| `git show` diff parity | Needs SHA | `verifyGovernedOutcomeBeforePass()` |
| `build_task_ledger.end_time` | Marks build leg complete | `canMarkBuildDone()` |
| Token receipt linked to `task_id` | Logged during/after AI call | `canMarkBuildDone()`, TSOS |
| OIL receipt linked to `task_id` | `writeSecurityReceipt` post-commit (partial today) | `canMarkBuildDone()` |
| `completion_receipt_id` | Grant after outcome pass | BP sync, product PASS |
| Governed loop `status: committed` | After full trace | CC job poll |

**Implication:** Post-commit 409 responses with `committed: true` in git but `ok: false` in HTTP are **expected** until measurement + completion gates are ordered correctly (`committed_but_not_complete` state from consolidation plan).

---

## 9. Smallest safe implementation sequence

Execute in this order — each step independently testable.

| Step | Work | Files (later mission) | Unblocks |
|------|------|----------------------|----------|
| **S1** | Document zone 1/2 live-test targets + extract-helper template for zone 3 | `docs/` + PBB plan generator | B1 for tests |
| **S2** | Ensure CC `metadata_json.target_file` picks zone 1/2 for proof scripts OR generate extract-helper plan for zone 3 | `builderos-governed-loop-executor.js`, PBB | B1 |
| **S3** | After commit, always link `task_id` → token log + OIL receipt + `end_time` before any terminal gate | `tsos-platform-kernel.js`, `/build` route, `kernel-token-linker.js` | B4 |
| **S4** | Reorder gates: run `grantBuildCompletion()` before DONE gate blocks response; demote DONE to `evidence_only` | `lifeos-council-builder-routes.js`, `builderos-build-done-gate-helper.js` | B5/B6 order |
| **S5** | Kernel path: call completion authority after measurement complete | `tsos-platform-kernel.js` | kernel parity |
| **S6** | Governed loop: treat `/build` 409 with `commit_sha` + `FAIL_WRONG_OUTCOME` as job failure (already partial) | `builderos-governed-loop-executor.js` | B7 |
| **S7** | Add acceptance script `run-build-execution-readiness-v1.mjs` | `scripts/` | regression net |

**Do not implement S4 before S3** on production without break-glass — demoting DONE gate without measurement wiring re-opens ledger theater PASS.

---

## 10. Test plan

### Unit

| Test | Expected |
|------|----------|
| `classifyBuildTarget` zone boundaries | 361-line script → zone 3; new file → zone 1 |
| `auditCommandControlJobBoundary` | zone 3 target → `ZONE3_PATCH_REQUIRED` |
| `evaluateBuildDoneGate` with incomplete ledger | `BUILDEROS_DONE_BLOCKED:missing_proof:*` |
| `evaluateBuildCompletion` without SHA | `FAIL_MISSING_EVIDENCE` |
| `evaluateBuildCompletion` Multi-Lane vs §2.18 mock | `FAIL_WRONG_OUTCOME` |

### Integration (production, keyed)

| Case | Steps | Pass criteria |
|------|-------|---------------|
| **T1 — Zone 1 live build** | CC job → new file under `products/receipts/` test artifact | job `committed`; `completion_granted: true`; SHA on `main` |
| **T2 — Zone 3 blocked** | CC job → `scripts/run-voice-rail-capability-proof.mjs` | job `blocked`; `ZONE3_PATCH_REQUIRED`; no `/build` call |
| **T3 — Measurement gap regression** | Zone 2 build without kernel wrap (test env) | 409 with `missing_evidence` listed; git may have commit |
| **T4 — Provider path unchanged** | `npm run lifeos:provider-tool-action:proof` | still PASS (infra unchanged) |

### Manual founder check

1. Voice Rail command with zone 1 target → honest receipt with `job_status: committed` or explicit blocker.  
2. Voice Rail command with zone 3 target → honest `ZONE3_PATCH_REQUIRED` — no “building now” theater.

---

## 11. Rollback plan

| Switch | Effect |
|--------|--------|
| `BUILDEROS_COMPLETION_AUTHORITY=0` | Bypass completion grant (break-glass); pre-step-1 behavior |
| `BUILDEROS_DONE_GATE=0` (proposed) | Skip DONE gate block on `/build` response — **only with completion authority on** |
| `kernel_strict=false` (default) | Kernel soft-fails ledger complete; use for bake |
| Target rollback | Revert to zone 1/2 proof targets only |
| Git | `committed_but_not_complete` commits — revert SHA via normal git if wrong outcome |

Production profile: all break-glass flags unset; zone 3 remains enforced.

---

## 12. Founder-readable summary

**Good news:** The plumbing works — AI providers, database, deploy, and the builder route are connected.

**Bad news:** A governed “please build this” command hits **two gates in a row**, and the first gate often stops the job before any code is written:

1. **File size gate (Zone 3):** Big scripts (like the Voice Rail proof runner) are blocked on purpose so the builder doesn’t paste a stub into a 361-line file. Fix: use a small new file for tests, or a proper “extract helper” plan — not a bypass.

2. **Measurement gate (DONE gate):** When a smaller build *does* commit, the system sometimes says “blocked — missing token receipt, build end time, oil receipt” because the ledger wasn’t filled in before the DONE check. Completion authority (the “did we build what you asked for?” check) never gets a turn.

**Fix order:** Pick a legal target first → wire measurement receipts → let completion authority be the final “done” signal → demote DONE gate to evidence-only.

**Do not:** Turn off zone policy or outcome checks just to get a green checkmark.

---

## Change receipt

| Date | File | What |
|------|------|------|
| 2026-06-14 | `docs/BUILD_EXECUTION_BLOCKER_SEQUENCE_PLAN_V1.md` | Corrected kernel path note after completion authority deferral rollback: DONE gate only is kernel-deferred; completion authority remains route-enforced. |
| 2026-06-14 | `docs/BUILD_EXECUTION_BLOCKER_SEQUENCE_PLAN_V1.md` | V1 blocker sequence from live truth check + code read |
