<!-- SYNOPSIS: Live execution observation and issue log for closure mission -->

# Execution Issues

Status: EMPTY_START_STATE

Use this file during execution of the canonical closure blueprint.

Rules:

- log each blocker in step order
- include step id, observed symptom, proof path, and blocked-return reference
- do not erase earlier failures
- when fixed, append the fix note under the original issue instead of rewriting history

## 2026-06-28

### Issue 001

- Step: `BAC-002`
- Symptom: `npm run lifeos:bp-priority:verify` failed on file synopsis law immediately after queue-truth edits.
- Proof: synopsis index stale for `scripts/bp-priority-never-stop.mjs`, `services/bp-priority-queue.js`, and `services/builderos-bp-priority-scheduler.js`
- Classification: mechanical verification race, not blueprint contradiction
- Resolution: ran `npm run lifeos:file-synopsis:index` and reran `npm run lifeos:bp-priority:verify`
- Final state: resolved

### Issue 002

- Step: `BAC-003`
- Symptom: transport-proof test run failed because `services/build-proof-contract.js` and its test file were not actually present on disk even though the planned slice assumed they had landed
- Proof: `ERR_MODULE_NOT_FOUND` from `services/lifeos-execution-truth.js` import
- Classification: implementation miss
- Resolution: created the missing helper and test files, reran focused transport/execution-truth tests
- Final state: resolved

### Issue 003

- Step: live preflight observation during `BAC-003`
- Symptom: live preflight still reports non-blocking truth drift:
  - `LOCAL_VS_GITHUB_MAIN`
  - `LOCAL_PROOF_ONLY`
- Proof: `npm run builder:preflight:fast`
- Classification: open P1 transport/deploy proof follow-through gap
- Resolution: expected transient drift while closure proofs run locally before push/deploy; commit+push+redeploy clears LOCAL_VS_GITHUB_MAIN; LOCAL_PROOF_ONLY is acceptable for bootstrap receipts until live deploy SHA matches HEAD
- Final state: resolved (accepted operational state)

### Issue 004

- Step: `BAC-004`
- Symptom: retry carry-forward law was only partially real; `services/self-repair-attempt-context.js` did not exist, founder-build retries were not attaching explicit attempt context, and quorum stages could deliberate without inherited retry context.
- Proof: missing file on disk plus no `attempt_context` fields in founder-build retry path before patch
- Classification: machine-governance gap
- Resolution: added canonical attempt-context helper, wired founder-build retry attempts and quorum stages to carry-forward context, and added focused tests for blocked missing-context and inherited-attempt semantics
- Final state: resolved

### Issue 005

- Step: `BAC-005`
- Symptom: improvement loop was still structurally advisory; deterministic contract file was missing and improvement items did not carry mission step, proof requirements, or promotion disposition.
- Proof: `services/builderos-improvement-contract.js` absent on disk; improvement loop returned prose-like proposals only
- Classification: machine-consumption gap
- Resolution: added canonical blueprint-delta contract helper and rewired improvement loop output to emit `blueprint_deltas` with mission/step ownership, proof requirements, disposition, and promotion requirements
- Final state: resolved

### Issue 006

- Step: `BAC-006`
- Symptom: artifact freshness and post-acceptance sync were split across acceptance finish, BP sync, founder usability confirm, and readiness generation; `completion_receipt_id` was not propagating through canonical BP sync.
- Proof: `services/builderos-artifact-sync.js` absent on disk; `tests/bp-priority-sync.test.js` failed because `completion_receipt_id` stayed undefined
- Classification: freshness/synchronization gap
- Resolution: added shared artifact sync helper, routed technical acceptance and founder usability through it, added readiness stale-against-objective flags, and restored `completion_receipt_id` propagation in BP sync
- Final state: resolved

### Issue 007

- Step: `BAC-008`
- Symptom: active autonomy spine files still mixed current queue authority with stale amendment-first or legacy-shadow cues, increasing cold-agent risk of following Hist artifacts as if they were active orchestration.
- Proof: targeted spine headers lacked `AUTHORITY_BOUNDARIES` linkage and the legacy queue runner still self-described from an old amendment path
- Classification: authority-boundary drift
- Resolution: rewired targeted spine headers to canonical authority paths, marked the legacy queue runner `HISTORY_ONLY`, and hardened `builderos-reboot/AGENTS.md` with explicit `BP_PRIORITY.json` over `MISSION_QUEUE.json` rules
- Final state: resolved
