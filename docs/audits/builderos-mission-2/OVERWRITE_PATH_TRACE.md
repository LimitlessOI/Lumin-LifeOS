<!-- SYNOPSIS: OVERWRITE PATH TRACE — Mission 2 Phase 0 WP0.4 -->

# OVERWRITE PATH TRACE — Mission 2 Phase 0 WP0.4

## Authority

- Consensus decision: `builderos-reboot/DECISIONS/DECISION-0001.md`
- Sequencing: Phase 0 truth containment before Phase 1 Builder Readiness Audit.

## Chain observed

The observed failure pattern was: a generated artifact is produced by the governed factory, sealed into the `BUILD_QUEUE` twin, later proven wrong and unsealed (or manually corrected), but the identical broken content is regenerated and overwrites the approved correction.

1. **`POST /factory/ship-queue`** (or the autonomous loop) dispatches a step via `services/governed-shipping-runner.js`.
2. `runGovernedShippingQueue` calls `exactChangeClaim` to load the twin step and then `attachAuthoredAssertions` to build the dispatch payload. The dispatched `step` object did **not** carry the twin's `rejected_content_hashes`.
3. `dispatchExecuteStep` -> `runWriteFileExact` in `factory-staging/factory-core/builder/run-step.js` writes `resolved.content` to disk with `fs.writeFileSync(target, resolved.content)` **before** the content is compared against any rejected-hash list.
4. After the file is written, the route calls `sealExactChangeIntoTwin` in `services/truth-ladder.js`, which can compare the written bytes to `rejected_content_hashes` and refuse to seal.
5. Because the write happens before the seal, the working-tree file is overwritten even though the seal fails.
6. The next autonomous loop or retry sees the newly-overwritten (broken) file and the cycle repeats.

## Root cause

The overwrite is caused by ordering: `run-step.js` writes before checking `rejected_content_hashes`, and the rejected-hash list is not available to `run-step` because `governed-shipping-runner.js` did not pass it from the twin.

## Corrective action

Two narrow changes close the overwrite path before it reaches the filesystem:

1. `services/governed-shipping-runner.js:130` now forwards `exact.step.rejected_content_hashes` into the dispatched `step` object.
2. `factory-staging/factory-core/builder/run-step.js:100-113` now computes the SHA256 of the resolved content and, if it appears in `step.rejected_content_hashes`, returns `BLOCKED_RETURN_TO_BPB` with `gap_type: 'content_rejected'` **without** writing the file.

## Behavioral evidence

- `tests/run-step-overwrite-guard.test.js`
  - Rejected hash blocks the write; file does not exist.
  - Non-rejected hash allows the write; file contents match.

## Status

WP0.4 stop-gate satisfied. The overwrite path is now mechanically blocked before the filesystem.
