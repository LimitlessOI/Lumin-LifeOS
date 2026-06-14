# Build Execution Blocker Sequence Plan V1

**Status:** `AUTHORITATIVE PLAN` (doc-only — no runtime code in this slice)  
**Date:** 2026-06-14  
**Agent:** Composer (Cursor) · read-only planning audit  
**Evidence base:** live connection truth check (2026-06-14), code paths below, six prior audit docs

**Inputs read:**
- `docs/CANONICAL_ARCHITECTURE_RECONCILIATION_V1.md`
- `docs/BUILDER_EXECUTION_DUPLICATION_AUDIT.md`
- `docs/PASS_DONE_AUTHORITY_AUDIT_V1.md`
- `docs/COMPLETION_AUTHORITY_CONSOLIDATION_PLAN_V1.md`
- `docs/BUILDEROS_CONSOLIDATION_ROADMAP_V1.md`
- `services/builderos-build-done-gate-helper.js`
- `services/builderos-completion-authority.js`
- `routes/lifeos-council-builder-routes.js` (commit + gate wiring)
- `services/builderos-governed-loop-executor.js`
- `services/tsos-platform-kernel.js` (`wrapBuild` / `kernelExecute`)
- `services/builderos-oil-job-audit.js`
- `services/builderos-patch-mode-policy.js`
- `services/builderos-control-plane-service.js` (`canMarkBuildDone`)

---

## 1. Current build-readiness status

| Layer | Status | Evidence |
|-------|--------|----------|
| **Infrastructure** | READY | OpenAI, Claude, Gemini, Neon, Railway/GitHub deploy sync — live probes 2026-06-14 |
| **Route availability** | READY | `POST /api/v1/lifeos/builder/build` live; `GET /builder/ready` → `commitToGitHub: true`, `pool: true`, deploy SHA current |
| **Voice Rail → CC routing** | READY | Health: `founder_commands_route: builderos_command_control_job` |
| **Governed build execution** | NOT READY | CC jobs `blocked` (`ZONE3_PATCH_REQUIRED`) or `/build` returns `409 BUILDEROS_DONE_BLOCKED` after commit |
| **Completion authority** | PARTIAL | Module exists + wired in `/build` **after** DONE gate; often never reached |
| **End-to-end commit + success response** | NOT READY | Commit may land; HTTP success blocked by measurement gate ordering |

**Summary:** The system can talk to providers, persist to Neon, and commit files. It cannot reliably return a **governed build success** through command-control or `/build` without hitting one of two gates in sequence.

---

## 2. Exact blocker sequence

Governed path (Voice Rail / command-control → `/builder/build`):

```
Founder command
    │
    ▼
[BLOCKER A] OIL boundary audit (CC preflight)
    │  auditCommandControlJobBoundary() — builderos-oil-job-audit.js
    │  ZONE3 (>150 lines) → ZONE3_PATCH_REQUIRED → status: blocked
    │  Never calls /builder/build
    ▼
[BLOCKER B] PBB plan generation (if A passes)
    │
    ▼
POST /api/v1/lifeos/builder/build  (via platformKernel.wrapBuild)
    │
    ├─ kernelExecute kind:'build'
    │     ├─ recordBuildStart(task_id)     ← ledger row, start_time set
    │     └─ rawBuildHandler (buildAndCommit)
    │           ├─ council codegen
    │           ├─ syntax / precommit governance
    │           ├─ commitToGitHub()          ← GIT COMMIT HAPPENS HERE
    │           ├─ [BLOCKER C] evaluateBuildDoneGateForBuildResponse()
    │           │     canMarkBuildDone(task_id)
    │           │     missing: token_receipt, build_end_time, oil_receipt
    │           │     → 409 BUILDEROS_DONE_BLOCKED (completion never runs)
    │           └─ [BLOCKER D] evaluateBuildCompletionForBuildResponse()
    │                 (only if C passes — currently skipped when C fails)
    │
    └─ (after handler returns — often not reached on 409)
          verifyTokenReceipt / verifyOilReceipt
          recordBuildComplete() → sets end_time, links receipts
          canMarkBuildDone (kernel strict path)
```

Direct `/builder/build` (no CC): same **C → D** sequence inside `buildAndCommit`; **A** skipped unless caller supplies a zone-3 `target_file` (precommit may still pass; CC path blocks earlier).

### Blocker codes (observed)

| Code | Stage | When |
|------|-------|------|
| `ZONE3_PATCH_REQUIRED` | CC `oil_boundary_audit` | `target_file` >150 lines (`builderos-patch-mode-policy.js`) |
| `BUILDEROS_DONE_BLOCKED:missing_proof:token_receipt,build_end_time,oil_receipt` | `/build` post-commit | `canMarkBuildDone` before ledger completion |
| `BUILDEROS_DONE_BLOCKED:done_gate_pending` | `/build` post-commit | commit SHA success but no gate evidence |
| `FAIL_WRONG_OUTCOME` / `FAIL_MISSING_EVIDENCE` | completion authority | After DONE gate passes (rare today) |

---

## 3. Which blocker must be fixed first

**For holistically unblocking live build tests — fix Blocker C (DONE gate ordering) first among code defects.**

Rationale:
- Infrastructure is already connected; Zone 1/2 builds **reach** `/builder/build` and **commit**, then fail at DONE gate.
- Until measurement evidence is collected **before** terminal HTTP success (or DONE gate is demoted to evidence-only per CA-3), every successful commit returns `409` and completion authority never runs.
- Fixing C unlocks the smallest live proof loop: zone-1/2 target → commit → success response → completion grant.

**Blocker A (ZONE3) is first in the physical sequence** but is a **target-selection / replan** problem, not a wiring bug. For CC/Voice Rail proofs that aim at large scripts, A fires before `/build`. Treat A and C as **parallel tracks**:

| Track | First fix | Unblocks |
|-------|-----------|----------|
| **Live build smoke (zone 1/2 file)** | **C — DONE gate ordering** | `/build` success response after commit |
| **Voice Rail / CC default proof scripts** | **A — ZONE3 extract-helper or retarget** | Reach `/build` at all |

---

## 4. Which blocker must not be bypassed

| Gate | Do not bypass | Safe alternative |
|------|---------------|------------------|
| **ZONE3 policy** | Do not set `allowBuilder: true` for 150+ line files without extract-helper | Replan with extract-helper strategy; pick zone-1 new file or zone-2 small patch target for smoke tests |
| **OIL boundary audit** | Do not skip `auditCommandControlJobBoundary` | Fix target/instruction; use PBB replan |
| **Precommit governance** | Do not disable anti-pattern/stub/verifier | Fix output or target |
| **Outcome verification / completion authority** | Do not return bare `committed: true` without grant | Keep authority; fix ordering so it runs |
| **Token + OIL measurement** | Do not delete proof requirements | Collect evidence, then evaluate — do not skip collection |
| **Git commit actuator singularity** | Do not re-enable `/execute` fallback or shadow queue | Canonical `/build` only |

**Explicitly forbidden “quick fixes”:** `allow_exception: true` on DONE gate for production builds; disabling `BUILDEROS_COMPLETION_AUTHORITY`; turning off kernel `wrapBuild`; CC jobs targeting zone-3 files without replan.

---

## 5. Whether DONE gate is running too early

**Yes — in the current `/build` wiring.**

Evidence (`routes/lifeos-council-builder-routes.js` ~L2178–L2191):

1. `commitToGitHub()` completes.
2. `evaluateBuildDoneGateForBuildResponse()` → `canMarkBuildDone({ task_id })` runs **inside** `buildAndCommit`.
3. `evaluateBuildCompletionForBuildResponse()` runs only if step 2 passes.

But `canMarkBuildDone` requires (`builderos-control-plane-service.js` ~L289–L298):

- `build.end_time` — set only by `recordBuildComplete()` in `tsos-platform-kernel.js` ~L228–L244
- `token_receipt_id` / token_usage_log linkage
- `oil_receipt_id` / security_receipts linkage

`recordBuildComplete()` runs **after** `buildAndCommit` returns inside `kernelExecute` — **after** the DONE gate already failed inside the handler.

So the DONE gate evaluates measurement completeness **before** the kernel finishes measurement collection. That guarantees `missing_proof:build_end_time` (and often token/oil) on any kernel-wrapped build that commits.

---

## 6. Whether completion authority should run before or after DONE gate

**Target architecture (from consolidation plan):**

| Module | Role | Order |
|--------|------|-------|
| **DONE gate (`canMarkBuildDone`)** | **Evidence-only** measurement completeness | Collect first; **must not** block HTTP success alone after CA-3 |
| **Completion authority (`grantBuildCompletion`)** | **Terminal grant** (technical + outcome) | **Last** before success response |

**Current code (wrong for readiness):** DONE gate blocks → completion never runs.

**Recommended order after fix:**

```
commitToGitHub
    → kernel recordBuildComplete (end_time + receipt IDs)
    → completion authority (technical + outcome verify)
    → attach done_gate as evidence_only in response
    → 200 success only if completion.granted
```

**Interim (minimal change):** Move `evaluateBuildDoneGateForBuildResponse` out of `buildAndCommit` into `wrapBuild` **after** `recordBuildComplete`, **or** demote DONE gate to warning/evidence until CA-3 lands.

Completion authority should **not** run before commit today (outcome verifier uses `git show` on committed SHA). It should run **after commit** and **after measurement evidence is linked**, **before** HTTP 200 success.

---

## 7. What evidence must exist before commit

| Evidence | Gate | Notes |
|----------|------|-------|
| Safe `target_file` (zone 1–2, or extract-helper plan for zone 3) | OIL boundary | CC preflight |
| Valid instruction length / boundary | OIL boundary | No dangerous patterns |
| PBB plan ok | Governed loop | After OIL pass |
| Syntax / HTML / SQL validation | `/build` | Pre-commit |
| Precommit governance pass | `/build` | `runPrecommitGovernance` |
| `task_id` assigned | Kernel wrap | Auto-generated if missing |
| `build_task_ledger` row (`recordBuildStart`) | Kernel | start_time only — not end_time |

**Not required before commit:** token receipt, oil receipt, `end_time`, outcome verification, DONE gate pass.

---

## 8. What evidence can only exist after commit

| Evidence | Producer | Why after commit |
|----------|----------|------------------|
| `commit_sha` | `commitToGitHub` | Defines what landed |
| Outcome verification (`git show` vs instruction) | `builder-outcome-verifier` | Needs SHA |
| `completion_receipt_id` | `builderos-completion-authority` | Needs SHA + outcome pass |
| Post-commit mirror / route auto-wire | `/build` handler | Files on disk in repo |
| `build_task_ledger.end_time` | `recordBuildComplete` | Build duration terminal |
| Linked `token_receipt_id` | kernel + `verifyTokenReceipt` | Tied to council call for this task |
| Linked `oil_receipt_id` | kernel + `verifyOilReceipt` | Post-build security receipt |
| DONE gate `allowed: true` | `canMarkBuildDone` | Requires end_time + token + oil |

---

## 9. Smallest safe implementation sequence

Aligned with `COMPLETION_AUTHORITY_CONSOLIDATION_PLAN_V1.md` order **0 → 1 → fix ordering → 4 → 3** plus ZONE3 replan.

| Step | Change | Size | Unblocks |
|------|--------|------|----------|
| **S1** | **Reorder gates in kernel wrap:** remove DONE gate from inside `buildAndCommit`; run measurement link + `recordBuildComplete` first; then completion authority; expose DONE as `evidence_only` | ~40 LOC route + ~20 kernel | Zone 1/2 live build success response |
| **S2** | **CC smoke target policy:** document + script default to zone-1 new file or zone-2 patch (<50 lines); ban zone-3 paths in proof scripts | doc + script | Reach `/build` from Voice Rail |
| **S3** | **ZONE3 replan at PBB:** when OIL returns `ZONE3_PATCH_REQUIRED`, auto-generate extract-helper plan instead of hard block (or fail with explicit replan instruction) | ~80 LOC | Large-file builds without bypass |
| **S4** | **Completion authority:** ensure `founder_request` + `required_outcome` flow from CC job → `/build` body | ~30 LOC | Outcome gate fed |
| **S5** | **CA-3 demotion:** `canMarkBuildDone` → evidence sub-object only; never sole HTTP blocker | ~60 LOC | Stops measurement theater blocking delivery |
| **S6** | **Integration acceptance:** `run-build-readiness-v1-acceptance.mjs` — zone-2 patch → 200 + `completion_granted` | new script | Regression net |

**Do not implement S5 before S1** unless S1 is “move DONE after recordBuildComplete” — demotion without reorder leaves false PASS risk.

---

## 10. Test plan

### Unit

| Test | Expected |
|------|----------|
| `builderos-build-done-gate-helper` — gate with ledger row, no end_time | `allowed: false`, missing `build_end_time` |
| `builderos-completion-authority` — committed + outcome pass | `granted: true`, receipt id set |
| Mock kernel order: recordBuildComplete before done gate eval | `allowed: true` when receipts present |

### Integration (production, keyed)

| Case | Target | Expected |
|------|--------|----------|
| **T1** | New zone-1 file `data/build-readiness-probe-<ts>.json` one line | CC job → committed → 200, `completion_granted` |
| **T2** | Zone-2 file <50 lines, one-line comment | `/build` direct → 200, not `BUILDEROS_DONE_BLOCKED` |
| **T3** | Zone-3 script (361 lines) via CC | Still `blocked` at OIL until S3; honest blocker message |
| **T4** | Wrong outcome vs commit | 409 `FAIL_WRONG_OUTCOME`, `committed: true`, `completion_granted: false` |
| **T5** | Voice Rail command → CC | Job created; T1 target succeeds end-to-end |

### Commands

```bash
node --test tests/builderos-completion-authority.test.js
node --test tests/builderos-build-done-gate-helper.test.js
node --test tests/builder-outcome-verifier.test.js
# After S6:
npm run lifeos:build-readiness:v1-acceptance
```

---

## 11. Rollback plan

| Switch | Effect |
|--------|--------|
| `BUILDEROS_COMPLETION_AUTHORITY=0` | Completion authority bypass (break-glass); DONE gate still applies |
| Revert S1 gate reorder commit | Restores current behavior (commit + 409 DONE blocked) |
| `kernel_strict=false` on `/build` body | Soft-fail kernel complete errors (not recommended prod) |
| CC target override | Point proofs at zone-1/2 files without code change |

Production profile: all break-glass flags unset. Rollback = git revert S1–S5 commits in reverse order.

---

## 12. Founder-readable summary

**What works:** The plumbing is real — AI providers, database, GitHub deploy, and the build button all respond.

**What’s stuck:** Two gates fire in the wrong order.

1. **Big files** — The system refuses to patch large scripts until a safer “extract helper” plan exists. That’s intentional; pick a small file or new file for smoke tests.

2. **Proof timing** — After a commit lands, the system checks for measurement receipts **before** it finishes recording them. So builds can succeed in Git but the API says “blocked.” Completion checking never gets a turn.

**Fix order:** First, fix the timing so measurement receipts are recorded before we decide success. Second, teach the planner how to handle large files without turning safety off. Third, keep the outcome checker as the final “did we build the right thing?” gate.

**Do not:** Turn off zone-3 safety, skip outcome checking, or reopen old side-door commit paths.

---

## Change receipt

| Date | File | What |
|------|------|------|
| 2026-06-14 | `docs/BUILD_EXECUTION_BLOCKER_SEQUENCE_PLAN_V1.md` | V1 blocker sequence from live truth check + code path audit |
