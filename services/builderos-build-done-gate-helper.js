/**
 * SYNOPSIS: BuilderOS /build DONE gate helper — evaluates whether a build result may be marked DONE/PASS.
 * Extracted for Repair Lane wiring into routes/lifeos-council-builder-routes.js (later step).
 * @ssot docs/projects/AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md
 */

const SUCCESS_STATUSES = new Set(['DONE', 'PASS', 'COMPLETE', 'SUCCESS']);

function normalizeText(value) {
  return String(value || '').trim();
}

export function claimsBuildSuccess(buildResult = {}) {
  if (buildResult?.ok === false) return false;
  const status = normalizeText(buildResult?.status).toUpperCase();
  if (SUCCESS_STATUSES.has(status)) return true;
  if (buildResult?.ok === true && buildResult?.committed === true) return true;
  if (buildResult?.ok === true && normalizeText(buildResult?.commit_sha || buildResult?.sha)) return true;
  return buildResult?.ok === true;
}

export function resolveDoneGateEvidence(buildResult = {}, doneGate = null) {
  if (doneGate && typeof doneGate === 'object') return doneGate;
  if (buildResult?.kernel_receipts?.done_gate) return buildResult.kernel_receipts.done_gate;
  if (buildResult?.done_gate) return buildResult.done_gate;
  return null;
}

export function isCommitShaOnlySuccess(buildResult = {}, doneGate = null) {
  if (!claimsBuildSuccess(buildResult)) return false;
  const sha = normalizeText(buildResult?.commit_sha || buildResult?.sha);
  if (!sha) return false;
  const gate = resolveDoneGateEvidence(buildResult, doneGate);
  return !(gate && gate.allowed === true);
}

function resolveReceiptPath({ buildResult = {}, doneGate = null, task_id = null } = {}) {
  const fromBuild = normalizeText(buildResult?.receipt_path);
  if (fromBuild) return fromBuild;
  const fromGate = normalizeText(doneGate?.receipt_path || doneGate?.build?.metadata?.receipt_path);
  if (fromGate) return fromGate;
  if (task_id) return `build_task_ledger:${task_id}`;
  return null;
}

/**
 * Evaluate whether a build result may be marked DONE/PASS/COMPLETE/SUCCESS.
 *
 * @param {object} params
 * @param {object} [params.buildResult] - /build or governed-loop builder output
 * @param {string|null} [params.task_id]
 * @param {object|null} [params.doneGate] - control-plane canMarkBuildDone result when already fetched
 * @param {boolean} [params.controlPlaneAvailable] - caller knows control plane is wired
 * @returns {{
 *   ok: boolean,
 *   done_gate_required: boolean,
 *   done_gate_passed: boolean,
 *   reason: string,
 *   receipt_path: string|null,
 *   blocker: string|null,
 * }}
 */
export function evaluateBuildDoneGate({
  buildResult = {},
  task_id = null,
  doneGate = null,
  controlPlaneAvailable = false,
} = {}) {
  const gate = resolveDoneGateEvidence(buildResult, doneGate);
  const receipt_path = resolveReceiptPath({ buildResult, doneGate: gate, task_id });
  const cpAvailable = controlPlaneAvailable || gate != null;

  const base = {
    ok: false,
    done_gate_required: true,
    done_gate_passed: false,
    reason: '',
    receipt_path,
    blocker: null,
  };

  if (!claimsBuildSuccess(buildResult)) {
    return {
      ...base,
      done_gate_required: false,
      reason: 'build_not_claiming_success',
    };
  }

  if (isCommitShaOnlySuccess(buildResult, gate)) {
    if (!cpAvailable) {
      return {
        ...base,
        reason: 'commit_sha_only_without_done_gate',
        blocker: 'BUILDEROS_DONE_BLOCKED:commit_sha_only',
        receipt_path,
      };
    }
    if (!gate) {
      return {
        ...base,
        reason: 'commit_sha_only_pending_done_gate',
        blocker: 'BUILDEROS_DONE_BLOCKED:done_gate_pending',
        receipt_path,
      };
    }
  }

  if (gate) {
    if (gate.allowed === true) {
      return {
        ok: true,
        done_gate_required: true,
        done_gate_passed: true,
        reason: gate.reason || 'done_gate_complete',
        receipt_path,
        blocker: null,
      };
    }
    const gateReason = gate.reason || 'missing_proof';
    return {
      ...base,
      reason: gateReason,
      blocker: `BUILDEROS_DONE_BLOCKED:${gateReason}`,
      receipt_path,
    };
  }

  if (cpAvailable) {
    return {
      ...base,
      reason: 'done_gate_pending',
      blocker: 'BUILDEROS_DONE_BLOCKED:done_gate_pending',
      receipt_path,
    };
  }

  return {
    ...base,
    reason: 'done_gate_evidence_unavailable',
    blocker: 'BUILDEROS_DONE_BLOCKED:done_gate_required',
    receipt_path,
  };
}

/**
 * Async wrapper — fetches control-plane DONE gate when a service is available.
 */
export async function evaluateBuildDoneGateAsync({
  buildResult = {},
  task_id = null,
  doneGate = null,
  controlPlane = null,
  allow_exception = false,
} = {}) {
  let gate = resolveDoneGateEvidence(buildResult, doneGate);
  const controlPlaneAvailable = Boolean(controlPlane?.canMarkBuildDone);

  if (!gate && controlPlaneAvailable && task_id) {
    gate = await controlPlane.canMarkBuildDone({ task_id, allow_exception });
  }

  return evaluateBuildDoneGate({
    buildResult,
    task_id,
    doneGate: gate,
    controlPlaneAvailable,
  });
}
