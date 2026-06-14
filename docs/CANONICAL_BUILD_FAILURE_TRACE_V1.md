# CANONICAL BUILD FAILURE TRACE V1

Status: AUTHORITATIVE FAILURE TRACE AUDIT (read-only; no runtime edits)  
Produced: 2026-06-13  
Mission: Canonical Build Failure Trace Authority

## Inputs

- `docs/COUNCIL_RECONCILIATION_REVIEW_V1.md`
- `docs/CANONICAL_BUILD_EXECUTION_PATH_V1.md`
- `docs/EXECUTION_CONSOLIDATION_FEASIBILITY_V1.md`
- `docs/AUTHORITY_CONSOLIDATION_MASTER_AUDIT_V1.md`

---

## Trace Scope

Canonical chain traced for failure analysis:

`Voice Rail -> Command Control -> Governed Loop -> /builder/build -> Commit -> DONE Gate -> Completion Authority`

---

## 1) Exact point where a valid build can fail

A technically valid build can fail **after commit** at the transition from commit to terminal authority, where DONE/completion/outcome authorities are not yet unified.

Primary breakpoints:

1. **DONE evidence checkpoint** can block with `BUILDEROS_DONE_BLOCKED` / `KERNEL_BUILD_DONE_BLOCKED` when proof linkage is incomplete (`token_receipt`, `build_end_time`, `oil_receipt`).
2. **Completion authority checkpoint** can fail with `FAIL_MISSING_EVIDENCE` or `FAIL_WRONG_OUTCOME` if invoked with incomplete evidence or mismatched outcome proof.
3. **Authority split condition** (kernel defer + governed-loop committed status + route-level completion deferral) allows disagreement about whether build is complete even when commit exists.

---

## 2) Exact point where current evidence says builds are failing

Current corpus points to two recurring fail locations:

1. **First practical failure point (founder/governed jobs):**
   - OIL boundary audit before `/builder/build` dispatch (especially `ZONE3_PATCH_REQUIRED`).
2. **Primary completion ambiguity/failure point (post-commit path):**
   - DONE evidence gate on or around `canMarkBuildDone` / `recordBuildComplete` phase with `missing_proof: token_receipt, build_end_time, oil_receipt`.

This means failure often occurs either:
- **before commit** (zone policy), or
- **after commit but before unified terminal grant** (missing or unlinked DONE evidence).

---

## 3) Failure type classification

### Most likely classification mix

1. **Ordering** — HIGH likelihood  
   Evidence: reconciliation and canonical-path docs both describe terminal split and ordering mismatch between DONE and completion authority.

2. **Missing linkage** — HIGH likelihood  
   Evidence: failures cite missing proof fields that can exist in system tables but not be linked correctly to the same `task_id` lifecycle at decision time.

3. **Missing receipt** — MEDIUM likelihood  
   Evidence: same missing-proof signatures can reflect truly absent writes in specific runs.

4. **Authority conflict** — HIGH likelihood  
   Evidence: master audit documents multiple terminal authorities; canonical path states completion is still deferred/split.

5. **Strict-mode enforcement** — MEDIUM likelihood  
   Evidence: kernel strict/soft behavior can convert evidence gaps into hard failures, but corpus does not show this as the dominant first cause.

---

## MOST LIKELY FAILURE PATH

1. Voice Rail routes founder command to command-control job.
2. Governed loop passes preflight and dispatches `/builder/build`.
3. `/builder/build` commits.
4. Terminal authority diverges:
   - DONE evidence gate evaluates proof completeness,
   - completion authority is deferred or not terminally unified on kernel path,
   - governed loop may still assign `committed` on outcome verifier path.
5. Run ends in blocked or ambiguous terminal state due to ordering/linkage mismatch rather than code generation failure.

Most likely root cause statement:
- **Post-commit terminal authority split combined with DONE evidence linkage/order mismatch.**

---

## ALTERNATE FAILURE PATHS

1. **Pre-build policy fail (non-terminal path)**
   - OIL boundary blocks at zone policy (`ZONE3_PATCH_REQUIRED`), never reaches commit.

2. **Completion-authority fail despite commit**
   - Completion authority invoked with incomplete evidence context -> `FAIL_MISSING_EVIDENCE`.

3. **Outcome mismatch fail**
   - Technical commit succeeds, but governed outcome verifier returns `FAIL_WRONG_OUTCOME`.

4. **Strict-mode hard fail**
   - Kernel strict behavior promotes proof incompleteness to immediate block instead of soft continuation.

---

## WHAT EVIDENCE WOULD PROVE THE ROOT CAUSE

To eliminate ambiguity, one run receipt must include all chain evidence for the same `job_id` and `task_id`:

1. Voice Rail request + command-control `job_id`.
2. Governed loop trace for:
   - OIL audit result,
   - PBB plan,
   - `/builder/build` dispatch status.
3. Commit evidence:
   - `commit_sha`,
   - target file,
   - commit timestamp.
4. Kernel/control-plane evidence for same `task_id`:
   - `recordBuildStart` wrote row,
   - `token_receipt_id` linkage,
   - `oil_receipt_id` linkage,
   - `end_time` set,
   - `canMarkBuildDone` decision.
5. Completion authority evidence:
   - whether `grantBuildCompletion` ran,
   - decision object (`granted`, `blocker`, `reason`, `completion_receipt_id`).
6. Governed outcome verifier decision:
   - pass/fail, code, reason.
7. Final job terminal state and response payload snapshot.

Root cause is proven when one artifact shows exact mismatch point across these seven steps.

---

## WHAT C2.5 SHOULD REVIEW NEXT

Recommended mission:
- **Live single-run failure-forensics receipt** for a zone-1/2 target proving end-to-end linkage from `job_id` to `completion_receipt_id` (or precise blocker).

Focus:
- prove where `task_id` linkage breaks (if it breaks),
- prove whether completion authority runs in kernel-managed terminal path for the failing run,
- classify failure as ordering vs missing write vs strict-mode.

---

## WHAT CLAUDE SHOULD REVIEW NEXT

Recommended mission:
- **Authority conflict normalization review**:
  - map exact ownership boundaries among DONE gate, completion authority, governed outcome verifier,
  - produce one non-implementation governance note specifying terminal authority precedence order and forbidden ambiguity states.

---

## WHAT CODEX SHOULD REVIEW NEXT

Recommended mission:
- **Evidence contract pre-implementation audit**:
  - define the minimal receipt schema required to prove canonical success (`job_id`, `task_id`, `commit_sha`, DONE linkage fields, completion decision, outcome decision),
  - ensure future fixes can be validated mechanically without re-audit.

---

## FOUNDER RISK IF WE GUESS WRONG

1. **False confidence risk (highest):** system reports committed/success while terminal completion proof is actually incomplete.
2. **Throughput risk:** repeated retries on wrong failure hypothesis consume cycles without reducing blocker rate.
3. **Governance drift risk:** teams patch around symptoms (e.g., bypassing gates) and reintroduce FAIL_OPEN behavior.
4. **Trust risk in Voice Rail/C2 receipts:** inconsistent final states reduce reliability of founder-facing execution truth.
5. **Consolidation regression risk:** retiring paths before root-cause proof can break production while not fixing canonical chain completion.

---

## Confidence

- **Most likely root cause confidence:** HIGH-MEDIUM  
- **Reason:** four independent governance/audit documents converge on terminal split + evidence linkage/ordering uncertainty, with repeated missing-proof signatures and unresolved U-02/U-03 style uncertainty.

---

## Verdict

PASS — failure trace completed with a single most likely root cause, alternate paths, proof requirements, and role-specific next-review missions.
