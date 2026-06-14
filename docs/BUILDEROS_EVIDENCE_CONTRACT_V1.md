# BUILDEROS EVIDENCE CONTRACT V1

Status: AUTHORITATIVE EVIDENCE CONTRACT AUDIT (read-only; no runtime edits)  
Produced: 2026-06-13  
Mission: Evidence Contract Authority

## Inputs

- `docs/CANONICAL_BUILD_EXECUTION_PATH_V1.md`
- `docs/FAILURE_CAUSALITY_PROOF_AUDIT_V1.md`
- `docs/LIVE_PROOF_CONSENSUS_AUDIT_V1.md`
- `docs/AUTHORITY_CONSOLIDATION_MASTER_AUDIT_V1.md`

---

## Evidence Contract Matrix (required proof items)

| Proof item | Current source | Authority owner | Confidence | Machine verifiable? | Founder verifiable? | Retirement candidate? | Canonical owner |
|---|---|---|---|---|---|---|---|
| Founder intent text | Voice Rail message + CC `instruction` | Voice Rail + Command-control | 8/10 | Yes | Yes | No | Command-control job record |
| Job identity (`job_id`) | `builderos_command_control_jobs` | Command-control service | 9/10 | Yes | Yes (poll) | No | Command-control service |
| Task identity (`task_id`) | Governed loop (`cc-{jobId}`) and `/build` body | Governed loop + `/build` route | 7/10 | Yes | Partial | No | Governed loop |
| OIL boundary pass/block | Governed loop receipt stage (`oil_boundary_audit`) | OIL audit + governed loop | 8/10 | Yes | Partial | No | Governed loop |
| PBB plan validity | Governed loop plan stage | PBB planner + governed loop | 7/10 | Yes | Partial | No | Governed loop |
| Precommit governance pass | `/build` precommit result | `/build` route precommit governance | 7/10 | Yes | No | No | `/build` route |
| Commit presence (`commit_sha`) | `/build` response + governed loop builder output | `/build` route + deployment service | 8/10 | Yes | Yes | No | `/build` route |
| Commit content parity | `verifyGovernedOutcomeBeforePass` (`git show`) | Outcome verifier | 8/10 | Yes | Partial (via summarized receipt) | Shadow PASS producers are retirement/demotion candidates | Outcome verifier |
| DONE proof: token receipt linkage | `build_task_ledger.token_receipt_id` / fallback logs | Control-plane + kernel | 5/10 | Yes | No | No | Control-plane service |
| DONE proof: oil receipt linkage | `build_task_ledger.oil_receipt_id` / security receipts | Control-plane + kernel | 5/10 | Yes | No | No | Control-plane service |
| DONE proof: build end time | `build_task_ledger.end_time` | Control-plane + kernel | 6/10 | Yes | No | No | Control-plane service |
| DONE decision (`allowed`) | `canMarkBuildDone` gate result | Control-plane service | 6/10 | Yes | Partial | No | DONE gate helper + control-plane |
| Completion decision (`granted/blocker`) | `grantBuildCompletion` output | Completion authority | 4/10 | Partially (not unified on kernel path) | Partial | Legacy completion writers are retirement/demotion candidates | Completion authority |
| Completion receipt (`completion_receipt_id`) | Intended in completion authority; not observed in live consensus receipt | Completion authority | 2/10 | Not reliably today | No (missing in current receipts) | No | Completion authority |
| Terminal status (`job.status`) | command-control job final status | Governed loop | 8/10 | Yes | Yes | No | Governed loop |
| Founder usability acceptance (`founder_usability_pass`) | receipt sync field in BP sync | BP priority sync (non-gating) | 3/10 | Yes (field exists) | Yes (if used) | Non-canonical as terminal signal today | Completion authority (future gating) |

---

## 1) What evidence defines success?

Minimum success evidence contract (machine-success):

1. founder intent captured (`instruction`) with `job_id`
2. governed path reached `/builder/build`
3. `commit_sha` produced
4. outcome verifier pass (`PASS_OUTCOME_VERIFIED`)
5. DONE evidence complete (token + oil + end_time linked to same `task_id`)
6. completion authority grants with non-null `completion_receipt_id`
7. final terminal status consistent with completion decision

Current reality:
- System can often show partial success (`job.status='committed'`, `commit_sha`) without full completion receipt evidence.

---

## 2) What evidence defines failure?

Failure evidence families:

- policy/entry failure: `ZONE3_PATCH_REQUIRED`, claim/preflight failures
- build dispatch failure: `builder_failed`, `BUILDER_DISPATCH_FAILED`
- DONE evidence failure: `missing_proof:token_receipt,build_end_time,oil_receipt`
- completion failure: `FAIL_MISSING_EVIDENCE`, `FAIL_WRONG_OUTCOME`
- authority inconsistency failure: `job.status='committed'` while completion evidence remains deferred/null

---

## 3) What evidence is duplicated?

High-duplication evidence tokens:

1. PASS tokens across many non-terminal systems (technical pass signals reused as if terminal success)
2. completion-like statuses (`COMPLETE`, `SUCCESS`, `complete`) emitted by shadow writers
3. DONE semantics split between helper, control-plane gate, and other legacy markers

Result:
- Semantic duplication causes interpretation ambiguity for downstream automation and founder-facing receipts.

---

## 4) What evidence is missing?

Critical missing evidence today:

1. Reliable `completion_receipt_id` emission on canonical kernel-managed success path
2. Single per-run forensic artifact linking `job_id` + `task_id` + DONE linkage + completion decision + outcome decision
3. Enforced founder usability gate in completion path (field exists, gate does not)
4. Explicit forbidden-state detection for split terminal outcomes

---

## 5) What evidence can be forged?

Most forge-prone evidence classes (without stronger linkage):

1. PASS/COMPLETE tokens from non-canonical shadow writers
2. receipt verdict fields copied/synced without outcome parity check
3. terminal status interpreted without requiring completion receipt linkage

Less forge-prone:
- `git show` based outcome parity and database-linked gate evidence, when tied to same `task_id`.

---

## 6) What evidence is trusted?

Most trusted evidence sources:

1. Governed loop + outcome verifier result for a specific `commit_sha`
2. command-control job lifecycle records
3. control-plane DONE gate decision when ledger linkage is complete
4. precommit hook enforcement receipts for code-path governance

Trust caveat:
- Trust drops significantly when terminal state is inferred from any one layer without cross-layer linkage.

---

## 7) Confidence score (0-10)

**4.8 / 10**

---

## 8) Why is it not a 10?

1. Canonical chain does not yet reliably produce `completion_receipt_id`.
2. Terminal authority remains split across governed-loop status, DONE gate evidence, and deferred completion authority.
3. Multiple shadow PASS/COMPLETE signals still exist and can be misread as terminal proof.
4. Missing single run artifact proving end-to-end linkage for one canonical success path instance.

---

## 9) Top 3 actions to reach 10

1. **Live forensic proof contract execution**
   - Run one zone-1/2 canonical job and capture full C1–C5 + D1–D7 style artifact.
2. **Terminal authority unification**
   - Ensure completion authority grant (with `completion_receipt_id`) is required for terminal committed success.
3. **Shadow terminal evidence demotion**
   - Convert non-canonical PASS/COMPLETE emitters into evidence-only signals and enforce single canonical interpretation.

---

## 10) What Claude should review next

Recommended mission:
- **Terminal Authority Precedence and Founder Sovereignty Gate Law V1**  
Define governance precedence and required founder-linked completion semantics for product lanes.

---

## 11) What C2.5 should review next

Recommended mission:
- **Live Evidence Contract Run V1**  
Execute one canonical zone-1/2 run and generate the machine-verifiable proving artifact that settles completion and DONE linkage ambiguity.

---

## 12) What Codex should review next

Recommended mission:
- **Evidence Contract Schema Enforcement Audit V1**  
Produce a strict JSON schema and fail-state taxonomy that labels ambiguous terminal states automatically.

---

## COUNCIL AGREEMENT MATRIX

| Contract question | Canonical path audit | Failure causality audit | Live proof consensus audit | Authority master audit | Agreement |
|---|---|---|---|---|---|
| Is evidence fragmented across layers? | Yes | Yes | Yes | Yes | Strong |
| Is completion receipt currently blocked/unproven? | Yes (not unified) | Yes (supported, not fully proven) | Yes (blocker) | Yes (partial completion authority adoption) | Strong |
| Is outcome verifier canonical for content parity? | Yes | Yes | Yes | Yes | Strong |
| Are terminal signals duplicated/ambiguous? | Yes | Yes | Yes | Yes | Strong |
| Can BuilderOS mechanically prove full success today? | Not fully | Not fully | Blocked | Not with current authority duplication | Strong |

---

## IF I AM WRONG

If this score is too low, the likely correction is:

1. Completion receipt may already be emitted on a path not represented in current receipts.
2. DONE linkage may be more reliable in live runs than current corpus implies.
3. Shadow signals may be less operationally impactful if no consumer treats them as terminal.

Fast falsifier:
- One live canonical run artifact showing complete linkage and consistent terminal state with non-null `completion_receipt_id` would immediately increase score.

---

## Direct Answer

**Can BuilderOS mechanically prove success today?**

**Not fully.**

It can mechanically prove substantial portions of success (intent, job flow, commit, outcome parity in governed path), but it cannot yet reliably and unambiguously prove full terminal success under a single evidence contract because `completion_receipt_id` production and terminal authority unification remain incomplete.

---

## Change receipt

| Date | File | What |
|------|------|------|
| 2026-06-14 | `docs/BUILDEROS_EVIDENCE_CONTRACT_V1.md` | V1 machine-verifiable BuilderOS evidence contract audit |
