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
    return { ok: true, transport_status: 'COMMIT_ONLY_NOT_LIVE', fail_code: null };
  }
  if (deployRequired && deployMatchesOriginMain === true) {
    return { ok: true, transport_status: 'DEPLOY_SYNC_PASS', fail_code: null };
  }
  if (originContainsCommit === true) {
    return { ok: true, transport_status: 'REMOTE_TRANSPORT_PASS', fail_code: null };
  }
  return { ok: true, transport_status: 'COMMIT_ONLY_NOT_LIVE', fail_code: null };
}
