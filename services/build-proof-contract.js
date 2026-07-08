/**
 * SYNOPSIS: Canonical build transport proof contract for governed code-changing actions.
 * @ssot builderos-reboot/MISSIONS/FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001/BLUEPRINT.json
 */
export function evaluateBuildProof({
  codeChanging = true,
  alreadyPresent = false,
  commitSha = null,
  originContainsCommit = null,
  deployRequired = false,
  deployMatchesOriginMain = null,
  runtimeBehaviorVerified = null,
} = {}) {
  if (alreadyPresent) {
    return { ok: true, transport_status: 'ALREADY_PRESENT', fail_code: null };
  }
  if (!codeChanging) {
    return { ok: true, transport_status: 'REMOTE_TRANSPORT_PASS', fail_code: null };
  }
  if (!commitSha) {
    return { ok: false, transport_status: 'COMMIT_NO_SHA', fail_code: 'COMMIT_NO_SHA' };
  }
  if (originContainsCommit === false) {
    return { ok: false, transport_status: 'ORIGIN_MAIN_NOT_UPDATED', fail_code: 'ORIGIN_MAIN_NOT_UPDATED' };
  }
  if (deployRequired && runtimeBehaviorVerified === true) {
    return { ok: true, transport_status: 'LIVE_BEHAVIOR_PASS', fail_code: null };
  }
  if (deployRequired && deployMatchesOriginMain === false) {
    return { ok: false, transport_status: 'DEPLOY_NOT_SYNCED', fail_code: 'DEPLOY_NOT_SYNCED' };
  }
  if (deployRequired && runtimeBehaviorVerified === false) {
    return { ok: false, transport_status: 'LIVE_BEHAVIOR_NOT_VERIFIED', fail_code: 'LIVE_BEHAVIOR_NOT_VERIFIED' };
  }
  if (deployRequired && deployMatchesOriginMain !== true && runtimeBehaviorVerified !== true) {
    return { ok: false, transport_status: 'COMMIT_ONLY_NOT_LIVE', fail_code: 'COMMIT_ONLY_NOT_LIVE' };
  }
  if (deployRequired && deployMatchesOriginMain === true) {
    return { ok: true, transport_status: 'DEPLOY_SYNC_PASS', fail_code: null };
  }
  if (originContainsCommit === true) {
    return { ok: true, transport_status: 'REMOTE_TRANSPORT_PASS', fail_code: null };
  }
  return { ok: false, transport_status: 'COMMIT_ONLY_NOT_LIVE', fail_code: 'COMMIT_ONLY_NOT_LIVE' };
}

// Frozen verdict vocabulary for the build/deploy transport proof.
export const BUILD_PROOF_STATES = Object.freeze({
  PASS: 'PASS',
  WAITING_FOR_PROOF: 'WAITING_FOR_PROOF',
  FAIL: 'FAIL',
});

const _PASS_STATUSES = new Set([
  'ALREADY_PRESENT',
  'REMOTE_TRANSPORT_PASS',
  'DEPLOY_SYNC_PASS',
  'LIVE_BEHAVIOR_PASS',
]);
// Built + on origin, but not yet proven live — retryable, not a failure.
const _WAITING_STATUSES = new Set([
  'DEPLOY_NOT_SYNCED',
  'LIVE_BEHAVIOR_NOT_VERIFIED',
  'COMMIT_ONLY_NOT_LIVE',
]);
// Never shipped — the transport itself failed.
const _FAIL_STATUSES = new Set([
  'COMMIT_NO_SHA',
  'ORIGIN_MAIN_NOT_UPDATED',
]);

// Build a normalized proof record from raw transport signals. Infers
// deployRequired from the presence of a deploy target when not given, then runs
// evaluateBuildProof and folds its result into the record.
export function createBuildProofRecord(input = {}) {
  const {
    jobId = null,
    codeChanging = true,
    alreadyPresent = false,
    commitSha = null,
    originContainsCommit = null,
    deployIdentifier = null,
    deployShaSeen = null,
    expectedDeploySha = null,
    deployRequired = Boolean(deployIdentifier),
    deployMatchesOriginMain = null,
    runtimeBehaviorVerified = null,
  } = input;

  const evaluation = evaluateBuildProof({
    codeChanging,
    alreadyPresent,
    commitSha,
    originContainsCommit,
    deployRequired,
    deployMatchesOriginMain,
    runtimeBehaviorVerified,
  });

  return {
    job_id: jobId,
    code_changing: codeChanging,
    already_present: alreadyPresent,
    commit_sha: commitSha,
    origin_contains_commit: originContainsCommit,
    deploy_identifier: deployIdentifier,
    deploy_sha_seen: deployShaSeen,
    expected_deploy_sha: expectedDeploySha,
    deploy_required: deployRequired,
    deploy_matches_origin_main: deployMatchesOriginMain,
    runtime_behavior_verified: runtimeBehaviorVerified,
    transport_status: evaluation.transport_status,
    fail_code: evaluation.fail_code,
    ok: evaluation.ok,
  };
}

// Map a proof record to the frozen verdict vocabulary.
export function deriveBuildProofVerdict(record = {}) {
  const status = record && record.transport_status;
  if (_PASS_STATUSES.has(status)) return BUILD_PROOF_STATES.PASS;
  if (_WAITING_STATUSES.has(status)) return BUILD_PROOF_STATES.WAITING_FOR_PROOF;
  if (_FAIL_STATUSES.has(status)) return BUILD_PROOF_STATES.FAIL;
  return record && record.ok ? BUILD_PROOF_STATES.PASS : BUILD_PROOF_STATES.FAIL;
}

export default { evaluateBuildProof, BUILD_PROOF_STATES, createBuildProofRecord, deriveBuildProofVerdict };
