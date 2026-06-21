<!-- SYNOPSIS: Completion Authority Consolidation Plan V1 -->

# Completion Authority Consolidation Plan V1

**Date:** 2026-06-13  
**Inputs:** `docs/PASS_DONE_AUTHORITY_AUDIT_V1.md`, commit `5c3099a105` (outcome guard), commit `5c702c430e` (audit)  
**Mission:** Plan only — **no runtime code changes in this slice.**

---

## 1. Canonical completion authority design

### Problem

Today, **24 distinct authorities** can emit terminal success signals (`PASS`, `DONE`, `COMPLETE`, `COMMITTED`, `SUCCESS`). Only **one** path — `executeCommandControlJob()` in `services/builderos-governed-loop-executor.js` — runs **both** technical verification and `verifyGovernedOutcomeBeforePass()`.

A commit landing in GitHub is therefore **not proof** the requested outcome was delivered.

### Design principle

**One writer, many evidence producers.**

```
Founder request + required outcome
        │
        ▼
  Technical evidence ──► builderos-completion-authority.js ◄── Outcome evidence
  (syntax, OIL, precommit,     (single terminal decision)      (git show vs instruction)
   acceptance probes)
        │
        ▼
  Terminal grant OR fail-closed blocker
  (completion_receipt_id, not raw PASS string)
```

### New module: `services/builderos-completion-authority.js`

Thin orchestrator over existing verifiers. Does **not** re-implement syntax/OIL; **does** own the only legal transition to terminal success.

#### Public API (proposed)

| Function | Purpose |
|----------|---------|
| `evaluateBuildCompletion(input)` | Sync/async decision: may this build be marked complete? |
| `grantBuildCompletion(input)` | Writes canonical completion receipt; returns `{ granted: true, receipt }` or throws/returns blocker |
| `isTerminalSuccess(response)` | Helper for callers: true only if response carries `completion_receipt_id` from this module |

#### Input contract (`CompletionRequest`)

```js
{
  lane: 'build' | 'product_acceptance' | 'factory_step',  // scopes rules
  founder_request: string,           // original instruction / mission objective
  required_outcome: string | null,   // explicit; else derived like outcome-verifier
  technical: {
    ok: boolean,
    source: 'precommit_governance' | 'oil_verifier' | 'acceptance_script' | 'sentry_contract',
    receipt_id?: string,
    detail?: object,
  },
  commit: {
    sha: string | null,
    target_file?: string,
  },
  metadata?: object,                 // mission_id, task_id, job_id, blueprint_id
}
```

#### Output contract (`CompletionDecision`)

```js
{
  granted: boolean,
  terminal_status: 'COMMITTED' | 'PASS' | 'DONE' | null,  // only set when granted
  blocker: 'FAIL_WRONG_OUTCOME' | 'FAIL_INCOMPLETE_TECHNICAL' | 'FAIL_MISSING_EVIDENCE' | null,
  completion_receipt_id: string | null,
  outcome_verification: object,      // from builder-outcome-verifier
  technical_verification: object,
  evidence_only: {                   // downstream modules may read, not override
    done_gate?: object,
    bp_sync_eligible?: boolean,
  },
}
```

#### Rules (fail-closed)

1. **No terminal grant** unless `technical.ok === true`.
2. **No terminal grant** for build/product lanes unless outcome verification passes (`verifyGovernedOutcomeBeforePass` or successor with structured `required_outcome` from BP/founder packet).
3. **`committed: true` in HTTP responses** must be preceded by `grantBuildCompletion()` — or response must use `committed_pending_outcome: true` during intermediate states (future).
4. **Product `verdict: PASS`** in `products/receipts/*.json` requires a linked `completion_receipt_id` before `syncMissionFromTechnicalReceipt()` may run.
5. **`canMarkBuildDone()`** may return `allowed: true` only as **measurement completeness evidence** inside `evidence_only.done_gate`; it must not alone grant terminal PASS.

#### Persistence (Phase 1+)

- Store completion receipts in Neon table `builderos_completion_receipts` (new migration in a later mission) **or** append-only JSONL under `data/completion-receipts.jsonl` until migration lands.
- Receipt fields: `id`, `lane`, `founder_request`, `required_outcome`, `commit_sha`, `technical_source`, `outcome_code`, `granted_at`, `blocker_if_denied`.

#### Backing modules (unchanged responsibility, subordinate role)

- `services/builder-outcome-verifier.js` — outcome gate implementation
- `services/builderos-precommit-governance.js` — technical gate for `/build`
- `scripts/builderos-builder-output-verifier.mjs` — technical gate for governed loop
- `services/builderos-control-plane-service.js` — measurement evidence only after grant

---

## 2. What `builderos-completion-authority.js` should own

| Owns | Does not own |
|------|----------------|
| Sole right to set terminal `PASS` / `DONE` / `COMPLETE` / `COMMITTED` / `SUCCESS` for **build and product delivery** | Syntax checking, stub detection, anti-pattern scan (delegates) |
| Orchestration order: technical → outcome → grant | GitHub commit mechanics (`commitToGitHub`) |
| `FAIL_WRONG_OUTCOME` and sibling blocker codes | OIL boundary preflight (stays in job audit) |
| Completion receipt ID generation and lookup | Council generation / PBB planning |
| Normalizing `required_outcome` from instruction, metadata, or founder packet | Factory sandbox byte-exact writes (until factory cutover) |
| Deny-list: callers that attempt terminal success without calling authority | Provider proof / system-action SUCCESS (different domain) |

---

## 3. What existing modules must become evidence-only

| Module | Current behavior | Future behavior |
|--------|------------------|-----------------|
| `builderos-build-done-gate-helper.js` | Can set `done_gate_passed: true` → allows success response | Returns `evidence_only.done_gate`; never sets terminal success alone |
| `builderos-control-plane-service.js` `canMarkBuildDone()` | `allowed: true` reads as mission PASS | Rename conceptually to `measurementComplete()`; input to completion authority only |
| `builder-audit-before-done.js` | Writes `verdict: PASS` for segment VERIFIED | Segment audit PASS = technical evidence; VERIFIED requires completion receipt |
| `bp-priority-sync.js` | Sets `receipt_verdict: PASS`, `blueprint_status: complete` on receipt | Sync only when receipt includes valid `completion_receipt_id` |
| `scripts/lib/bp-acceptance-finish.mjs` | Sets `report.verdict = PASS` from test list | Calls `grantBuildCompletion()` before writing PASS |
| `builderos-precommit-governance.js` | `shouldCommit: true` | Stays technical-only; never terminal PASS |
| `builderos-governed-loop-executor.js` | Sets `status: 'committed'` after inline outcome check | Delegates grant to completion authority (dedupe inline calls) |
| Factory `run-step.js` / mission-lib `DONE` | Terminal DONE for factory lane | Emit `factory_step_evidence`; DONE only via completion authority adapter at cutover |
| Mission recovery scripts | `mission_outcome: PASS` from SENTRY receipt | `objective_score` requires completion receipt or explicit UNSOLVED |

**Unchanged (non-build domains):** `lifeos-founder-system-action.js`, `self-repair-executor.js` proof PASS, `deliberation-governance-service.js` gate PASS — remain domain-specific; documented as **out of scope** for build completion authority.

---

## 4. Exact files that need later code changes

### Phase 1 — Production spine (highest priority)

| File | Change |
|------|--------|
| `services/builderos-completion-authority.js` | **NEW** — canonical API |
| `services/builder-outcome-verifier.js` | Export stable types; optional `required_outcome` override from caller |
| `routes/lifeos-council-builder-routes.js` | `/build` and `/execute` call `grantBuildCompletion()` before `committed: true` |
| `services/builderos-governed-loop-executor.js` | Replace inline outcome block with completion authority call |
| `tests/builder-outcome-verifier.test.js` | Extend for authority integration |
| `tests/builderos-completion-authority.test.js` | **NEW** — unit + regression (Multi-Lane vs §2.18) |
| `docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md` | Change receipt |
| `docs/projects/AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md` | Done gate demotion note |

### Phase 2 — Control plane + done gate demotion

| File | Change |
|------|--------|
| `services/builderos-build-done-gate-helper.js` | Remove ability to imply terminal success; evidence-only |
| `services/builderos-control-plane-service.js` | `canMarkBuildDone` → evidence sub-object only |
| `tests/builderos-build-done-gate-helper.test.js` | Update expectations |
| `tests/builderos-build-done-gate-route-wiring.test.js` | Wire through completion authority |

### Phase 3 — Product acceptance + BP sync

| File | Change |
|------|--------|
| `scripts/lib/bp-acceptance-finish.mjs` | Require completion grant before `verdict: PASS` |
| `services/bp-priority-sync.js` | Reject sync without `completion_receipt_id` on receipt |
| `scripts/verify-bp-priority-guardrails.mjs` | Add guard: PASS receipts must cite completion receipt |
| `tests/bp-priority-orphan-pass-guard.test.js` | Extend for completion receipt field |
| Each `scripts/run-*-acceptance.mjs` | Pass `required_outcome` from mission blueprint |

### Phase 4 — Callers and runners

| File | Change |
|------|--------|
| `services/voice-rail-command-executor.js` | Surface `completion_receipt_id` in founder receipt |
| `services/command-center-communication-service.js` | Same |
| `scripts/governed-overnight-backlog-run.mjs` | Treat success only when job result includes completion receipt |
| `scripts/lifeos-builder-continuous-queue.mjs` | Route through command-control or call authority |
| `scripts/lifeos-builder-supervisor.mjs` | Stop treating `committed: true` alone as KNOW |

### Phase 5 — Legacy / factory (defer)

| File | Change |
|------|--------|
| `factory-staging/factory-core/builder/run-step.js` | Adapter to completion authority at cutover |
| `builderos-reboot/scripts/mission-lib.mjs` | DONE → evidence-only until cutover |
| `builderos-reboot/scripts/mission-recovery-owner.mjs` | Require completion receipt for `mission_outcome: PASS` |
| `builderos-reboot/scripts/recovery-protocol-lib.mjs` | Same |

### Phase 6 — Optional persistence

| File | Change |
|------|--------|
| `db/migrations/YYYYMMDD_builderos_completion_receipts.sql` | **NEW** table |
| `services/builderos-completion-receipt-store.js` | **NEW** read/write |

---

## 5. Risk-ranked implementation phases

| Phase | Scope | Risk if delayed | Risk of change | Est. size |
|-------|--------|-----------------|----------------|-----------|
| **0** | New module + tests only (no wiring) | Low | Low | ~200 LOC + tests |
| **1** | Wire `/builder/build` + dedupe governed loop | **Critical** — highest FAIL_OPEN | **High** — breaks direct builder clients | ~80 LOC route + 30 loop |
| **2** | Wire `/builder/execute` | High | Medium | ~40 LOC |
| **3** | Demote done gate to evidence-only | Medium — false PASS via ledger | Medium | ~60 LOC |
| **4** | BP acceptance + sync choke | High — orphan PASS / wrong amendment | Medium | ~100 LOC |
| **5** | Runners / supervisor alignment | Medium | Low | ~50 LOC |
| **6** | Factory + mission recovery | Low until cutover | Low | Deferred |

**Order:** 0 → 1 → 2 → 4 → 3 → 5 → 6

Rationale: Phase 1 closes the highest-risk bypass. Phase 4 closes product receipt theater before relaxing done-gate naming (Phase 3).

---

## 6. First implementation target

**Phase 1, slice A:** `services/builderos-completion-authority.js` + wire **`POST /api/v1/lifeos/builder/build`** commit-success response in `routes/lifeos-council-builder-routes.js`.

Why first:

- Audit ranked it **highest-risk FAIL_OPEN**
- Governed loop already calls `/build` internally — direct callers bypass outcome gate
- Smallest choke with maximum blast-radius reduction
- Regression case already exists: Multi-Lane request vs §2.18 commit → must return `FAIL_WRONG_OUTCOME` (or block before response) when `required_outcome` is present

**Slice A behavior change:**

- After GitHub commit + precommit governance PASS, **before** `res.json({ committed: true })`:
  - Call `grantBuildCompletion({ founder_request: taskBody.task, required_outcome: taskBody.required_outcome, technical, commit })`
  - If denied → `409` with `blocker: FAIL_WRONG_OUTCOME`, `committed: true` may still be true in Git (commit already landed) but response must **not** claim mission complete — include `completion_granted: false` and remediation hint

**Note:** Commit-before-verify ordering is a known limitation; Phase 1 should document `committed_but_not_complete` state. Phase 2 optional: move outcome check before commit when `required_outcome` is set (larger change).

---

## 7. Test plan

### Unit tests (`tests/builderos-completion-authority.test.js`)

| Case | Expected |
|------|----------|
| Technical fail | `granted: false`, `FAIL_INCOMPLETE_TECHNICAL` |
| Technical pass, outcome fail (Multi-Lane vs §2.18 mock) | `granted: false`, `FAIL_WRONG_OUTCOME` |
| Both pass | `granted: true`, `completion_receipt_id` set |
| Missing `founder_request` | `granted: false`, `FAIL_MISSING_EVIDENCE` |
| Missing commit SHA for build lane | `granted: false` |

### Integration tests

| Command | Expected |
|---------|----------|
| `node --test tests/builderos-completion-authority.test.js` | All pass |
| `node --test tests/builder-outcome-verifier.test.js` | Regression still pass |
| `node --test tests/builderos-build-done-gate-route-wiring.test.js` | Update after Phase 3 |
| New `scripts/run-completion-authority-v1-acceptance.mjs` | HTTP probe: `/build` with mismatched outcome returns 409, not bare success |

### Manual founder verification

1. Submit command-control job with quoted required outcome that will not match builder output → job ends `FAIL_WRONG_OUTCOME` (already true today).
2. Call `/builder/build` directly with same mismatch → must **not** return success without completion grant after Phase 1.
3. Run existing product acceptance → must fail until completion receipt wired (Phase 4).

---

## 8. Rollback plan

| Trigger | Rollback |
|---------|----------|
| Phase 1 breaks builder throughput | Feature flag `BUILDEROS_COMPLETION_AUTHORITY=0` env bypass (implement in Phase 1) — authority returns `granted: true` with `rollback_bypass: true` receipt |
| False `FAIL_WRONG_OUTCOME` on valid builds | Tune `evaluateRequirementMatch` thresholds in `builder-outcome-verifier.js`; authority delegates matching logic there |
| BP sync blocked | Phase 4 independent; rollback by allowing sync without `completion_receipt_id` via same flag |
| Governed loop regression | Revert governed loop to inline `verifyGovernedOutcomeBeforePass` (keep module) |

**Rollback commit strategy:** One phase per commit; flag default `1` in production after bake period.

---

## 9. What not to change yet

- **Factory-staging** execute-step DONE semantics — wait for cutover receipt
- **builderos-reboot** static `PRODUCT_DEVELOPMENT_RESULT.json` files — hist/salvage only
- **Command Center manual OIL certification** (`proofOIL` PASS) — not a build completion path
- **Self-repair / proof freshness PASS** — infra domain
- **Provider proof / direct action SUCCESS** — separate product proof lane
- **Precommit governance internals** — already sufficient as technical evidence
- **Moving GitHub commit after outcome check** — defer to Phase 2+ ( larger refactor )
- **Neon migration for completion receipts** — JSONL acceptable for Phase 1

---

## 10. Founder-readable summary

**What went wrong:** The system could say "done" because a file was committed or a test script passed — even when the thing you asked for was not what got built (example: you asked for Multi-Lane Execution Governance; the repo got Compound Drift Law §2.18).

**What we fixed already:** Jobs that go through BuilderOS command-control now compare your request to what was actually committed.

**What's still open:** Direct builder endpoints, acceptance scripts, and blueprint sync can still say PASS without that comparison.

**The plan:** Create one module — **Completion Authority** — that is the only place allowed to say a build or product step is truly finished. Everything else only submits evidence ("syntax OK", "tests ran", "commit exists"). No PASS/DONE/COMPLETE unless both **technical** and **outcome** checks pass.

**First step:** Plug that module into the main builder `/build` endpoint — the highest-risk hole.

---

## FAIL_OPEN path remediation (8 paths)

### F1 — Direct `/builder/build`

| Field | Detail |
|-------|--------|
| **Current file** | `routes/lifeos-council-builder-routes.js` — commit branch ~L2006–L2147 |
| **Current unsafe behavior** | Commits to GitHub; returns `ok: true, committed: true` after precommit governance + done gate (token/OIL ledger only). No outcome parity. |
| **Desired future behavior** | `grantBuildCompletion()` must pass before response claims success; mismatch → `409 FAIL_WRONG_OUTCOME`, `completion_granted: false`. |
| **Action** | **Wrap** |
| **Smallest safe change** | Import `grantBuildCompletion`; call after `goldenSha` known, before `evaluateBuildDoneGateForBuildResponse`; block response if not granted. ~15 lines. |

### F2 — Direct `/builder/execute`

| Field | Detail |
|-------|--------|
| **Current file** | `routes/lifeos-council-builder-routes.js` — `executeOutput()` ~L1381–L1494 |
| **Current unsafe behavior** | Commits with validation/syntax only; returns `committed: true` with no outcome check or done gate. |
| **Desired future behavior** | Same as F1: require completion grant; accept `task` / `required_outcome` in body for parity check. |
| **Action** | **Wrap** |
| **Smallest safe change** | After commit, call `grantBuildCompletion({ founder_request: req.body.task, ... })`; deny response if fail. ~20 lines. |

### F3 — `finishBpAcceptance()` product PASS

| Field | Detail |
|-------|--------|
| **Current file** | `scripts/lib/bp-acceptance-finish.mjs` |
| **Current unsafe behavior** | Sets `report.verdict = PASS` when acceptance tests pass; no diff/outcome parity vs mission objective. |
| **Desired future behavior** | PASS written only if `grantBuildCompletion()` succeeds using mission `required_outcome` from blueprint/founder packet + receipt `git_sha`. |
| **Action** | **Wrap** |
| **Smallest safe change** | Before `report.verdict = pass ? 'PASS'`, call authority with `lane: 'product_acceptance'`; flip pass false on `FAIL_WRONG_OUTCOME`. ~25 lines. |

### F4 — `syncMissionFromTechnicalReceipt()` BP complete

| Field | Detail |
|-------|--------|
| **Current file** | `services/bp-priority-sync.js` — `syncMissionFromTechnicalReceipt()` |
| **Current unsafe behavior** | On `receipt.verdict === 'PASS'`, sets `receipt_verdict: PASS`, `blueprint_status: 'complete'` without completion receipt link. |
| **Desired future behavior** | Sync runs only when receipt contains `completion_receipt_id` validated by authority store. |
| **Action** | **Block** |
| **Smallest safe change** | Early return / throw if `!receipt.completion_receipt_id`. ~5 lines + guardrail test. |

### F5 — `canMarkBuildDone()` ledger PASS

| Field | Detail |
|-------|--------|
| **Current file** | `services/builderos-control-plane-service.js`, `services/builderos-build-done-gate-helper.js` |
| **Current unsafe behavior** | `allowed: true` when token + OIL + end_time present → `done_gate_passed: true` implies mission success. |
| **Desired future behavior** | Done gate populates `evidence_only.measurement_complete` only; terminal success requires completion authority grant separately. |
| **Action** | **Wrap** (demote) |
| **Smallest safe change** | In `evaluateBuildDoneGate`, rename output to `measurement_complete: true`; require `buildResult.completion_granted === true` for `ok: true`. ~20 lines across helper + route. |

### F6 — Direct `/build` callers (scripts/supervisor)

| Field | Detail |
|-------|--------|
| **Current file** | `scripts/lifeos-builder-supervisor.mjs`, `scripts/lifeos-builder-continuous-queue.mjs`, any client parsing `committed: true` |
| **Current unsafe behavior** | Treat HTTP `committed: true` or commit SHA as proof of delivered outcome. |
| **Desired future behavior** | Callers check `completion_granted` / `completion_receipt_id`; prefer command-control path. |
| **Action** | **Wrap** (client) + **Block** (deprecated direct success parsing) |
| **Smallest safe change** | Supervisor: require `completion_granted === true` in `/build` response for KNOW line. ~10 lines. Continuous queue: route via command-control only (already partially true). |

### F7 — Hard-coded acceptance PASS scripts

| Field | Detail |
|-------|--------|
| **Current file** | e.g. `scripts/run-lifeos-direct-action-v1-acceptance.mjs` (L153 `report.verdict = 'PASS'`) |
| **Current unsafe behavior** | Sets PASS after HTTP probes without outcome module. |
| **Desired future behavior** | All acceptance scripts use `finishBpAcceptance` → authority path; no raw `verdict = 'PASS'`. |
| **Action** | **Wrap** |
| **Smallest safe change** | Replace direct PASS assignment with `finishBpAcceptance()` or shared helper that calls authority. ~5 lines per script. |

### F8 — Mission recovery `objective_score: PASS`

| Field | Detail |
|-------|--------|
| **Current file** | `builderos-reboot/scripts/mission-recovery-owner.mjs`, `recovery-protocol-lib.mjs` |
| **Current unsafe behavior** | Sets `mission.mission_outcome = 'PASS'` when SENTRY/BP audit receipts pass — governance PASS ≠ delivered outcome. |
| **Desired future behavior** | Recovery PASS only when linked build/product completion receipt exists for mission objective. |
| **Action** | **Retire** terminal PASS here → **evidence-only** until Phase 6 |
| **Smallest safe change** | Replace `mission_outcome = 'PASS'` with `mission_outcome = 'GOVERNANCE_PASS_PENDING_OUTCOME'` unless `completion_receipt_id` present. ~10 lines. |

---

## Recommended canonical authority (final)

**Module:** `services/builderos-completion-authority.js`  
**Outcome engine:** `services/builder-outcome-verifier.js`  
**Single choke for terminal states:** `grantBuildCompletion()` / `evaluateBuildCompletion()`  
**Evidence producers (never terminal alone):** precommit governance, OIL verifier, done gate, segment audit, acceptance probes, sentry contracts

---

## Change receipt

| Date | File | What |
|------|------|------|
| 2026-06-13 | `docs/COMPLETION_AUTHORITY_CONSOLIDATION_PLAN_V1.md` | V1 implementation plan from PASS/DONE audit |
