/**
 * SYNOPSIS: TALOA-A2Z-006 -- read-only runtime truth state emitter for Taloa.
 * A stale heartbeat is reported as UNKNOWN/OFFLINE, never silently treated as
 * healthy idle -- matches the standing rule that liveness and causal progress
 * are separate signals. No secrets are ever included.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

const HEARTBEAT_STALE_MS = 2 * 60 * 1000;

export function createOverlayRuntimeTruth({ bodyIdentity = 'taloa_overlay', gitSha = null } = {}) {
  let lastHeartbeatAt = null;
  let currentTask = null;
  let lastObservation = null;
  let lastAction = null;
  let lastVerifiedResult = null;
  let blocker = null;
  const receiptIds = [];

  function heartbeat() {
    lastHeartbeatAt = Date.now();
  }

  function heartbeatStatus() {
    if (!lastHeartbeatAt) return 'OFFLINE';
    return Date.now() - lastHeartbeatAt > HEARTBEAT_STALE_MS ? 'UNKNOWN' : 'FRESH';
  }

  function setTask(task) {
    currentTask = task || null;
  }

  function setObservation(observation) {
    lastObservation = observation
      ? { observed_at: observation.observed_at, url: observation.evidence?.url || '', confidence: observation.confidence }
      : null;
  }

  function setAction(action) {
    lastAction = action || null;
  }

  function setVerifiedResult(result) {
    lastVerifiedResult = result || null;
    if (result?.status && result.status !== 'VERIFIED') {
      blocker = { type: result.status, reason: result.reason || null, at: new Date().toISOString() };
    } else if (result?.status === 'VERIFIED') {
      blocker = null;
    }
  }

  function setBlocker(next) {
    blocker = next || null;
  }

  function addReceipt(id) {
    if (id) receiptIds.push(id);
  }

  function snapshot() {
    const status = heartbeatStatus();
    return {
      body_identity: bodyIdentity,
      git_sha: gitSha,
      heartbeat_status: status,
      heartbeat_age_ms: lastHeartbeatAt ? Date.now() - lastHeartbeatAt : null,
      current_task: status === 'OFFLINE' ? null : currentTask,
      last_observation: status === 'OFFLINE' ? null : lastObservation,
      last_action: status === 'OFFLINE' ? null : lastAction,
      last_verified_result: status === 'OFFLINE' ? null : lastVerifiedResult,
      blocker: status === 'OFFLINE' ? { type: 'OFFLINE', reason: 'no_heartbeat_recorded' } : blocker,
      receipt_ids: receiptIds.slice(-20),
      emitted_at: new Date().toISOString(),
    };
  }

  return { heartbeat, setTask, setObservation, setAction, setVerifiedResult, setBlocker, addReceipt, snapshot };
}

export default { createOverlayRuntimeTruth };
