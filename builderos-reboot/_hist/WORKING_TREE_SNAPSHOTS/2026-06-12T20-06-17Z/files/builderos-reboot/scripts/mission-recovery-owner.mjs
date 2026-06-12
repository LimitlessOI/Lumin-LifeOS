/**
 * HIST DOMAIN — Historian owns this artifact (read/salvage only).
 * hist_id: HIST-AUTO-004
 * Law: prompts/00-HIST-LEGACY-BOUNDARY.md
 * Product queue: builderos-reboot/BP_PRIORITY.json
 *
 * AUTONOMOUS-RECOVERY-0002 — autopilot owns hard_stop / mission_failed recovery.
 * @ssot builderos-reboot/MISSIONS/AUTONOMOUS-RECOVERY-0001/FOUNDER_PACKET.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT, missionDir } from './mission-lib.mjs';
import { runTier1Check } from './tier1-telemetry-lib.mjs';
import {
  runLoopEscalation,
  resultPath as loopResultPath,
  packetPath,
  RESULT_FILENAME,
  PACKET_FILENAME,
} from './loop-escalation-lib.mjs';
import {
  runRecoveryProtocol,
  isObjectiveComplete,
  RECOVERY_RESULT_FILENAME,
} from './recovery-protocol-lib.mjs';

const QUEUE_REL = 'builderos-reboot/MISSION_QUEUE.json';
const RECOVERY_MISSION_ID = 'AUTONOMOUS-RECOVERY-0001';

export function queuePath() {
  return path.join(REPO_ROOT, QUEUE_REL);
}

export function loadQueue() {
  return JSON.parse(fs.readFileSync(queuePath(), 'utf8'));
}

export function saveQueue(queue) {
  queue.updated_at = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(queuePath(), `${JSON.stringify(queue, null, 2)}\n`);
}

/** Missions that need autopilot recovery before normal pending work. */
export function detectRecoveryCandidates(queue = loadQueue()) {
  const candidates = [];

  for (const entry of queue.missions) {
    const objectiveId = entry.mission_id;
    if (entry.status === 'complete') continue;

    const complete = isObjectiveComplete(objectiveId);
    if (complete.complete) {
      if (entry.status === 'mission_failed' || entry.recovery_required) {
        candidates.push({
          mission_id: objectiveId,
          priority: entry.priority ?? 999,
          reason: 'objective_complete_queue_stale',
          sync_only: true,
        });
      }
      continue;
    }

    let needsRecovery = false;
    let reason = null;

    if (
      entry.status === 'mission_failed' ||
      entry.status === 'recovery_required' ||
      entry.status === 'recovery_in_progress' ||
      entry.recovery_required === true
    ) {
      needsRecovery = true;
      reason = `queue_status:${entry.status}`;
    }

    const dir = missionDir(objectiveId);
    const loopFile = loopResultPath(objectiveId);
    if (fs.existsSync(loopFile)) {
      const loop = JSON.parse(fs.readFileSync(loopFile, 'utf8'));
      if (
        loop.recovery_protocol_active ||
        loop.escalation_level === 'hard_stop' ||
        loop.escalation_level === 'escalate'
      ) {
        needsRecovery = true;
        reason = reason || `loop:${loop.escalation_level}`;
      }
    }

    if (fs.existsSync(packetPath(objectiveId))) {
      const recoveryResult = path.join(dir, RECOVERY_RESULT_FILENAME);
      if (!fs.existsSync(recoveryResult)) {
        needsRecovery = true;
        reason = reason || 'failure_packet_no_recovery_result';
      }
    }

    if (needsRecovery) {
      candidates.push({
        mission_id: objectiveId,
        priority: entry.priority ?? 999,
        reason,
        sync_only: false,
      });
    }
  }

  const recoveryEntry = queue.missions.find((m) => m.mission_id === RECOVERY_MISSION_ID);
  const parentId = recoveryEntry?.parent_mission;
  if (parentId && !candidates.some((c) => c.mission_id === parentId)) {
    const parent = queue.missions.find((m) => m.mission_id === parentId);
    if (parent && parent.status !== 'complete') {
      const parentComplete = isObjectiveComplete(parentId);
      if (!parentComplete.complete) {
        candidates.push({
          mission_id: parentId,
          priority: (parent.priority ?? 999) - 0.01,
          reason: 'recovery_mission_parent',
          sync_only: false,
        });
      }
    }
  }

  candidates.sort((a, b) => a.priority - b.priority);
  const seen = new Set();
  return candidates.filter((c) => {
    if (seen.has(c.mission_id)) return false;
    seen.add(c.mission_id);
    return true;
  });
}

function missionArtifacts(objectiveId) {
  const dir = missionDir(objectiveId);
  const rootHarness = path.join(REPO_ROOT, 'scripts/deliberation-sentry-regression-harness.mjs');
  return {
    SENTRY_CHECK_RESULT: fs.existsSync(path.join(dir, 'SENTRY_CHECK_RESULT.json')),
    BLUEPRINT: fs.existsSync(path.join(dir, 'BLUEPRINT.json')),
    harness: fs.existsSync(rootHarness),
    PROBE_pollution: fs.existsSync(path.join(dir, 'PROBE.txt')),
    FAILURE_PATTERN_PACKET: fs.existsSync(path.join(dir, PACKET_FILENAME)),
    LOOP_ESCALATION_RESULT: fs.existsSync(path.join(dir, RESULT_FILENAME)),
  };
}

/** Observe + recovery for one objective (same path as run-mission-observe.mjs, parameterized). */
export async function runMissionRecovery(objectiveId) {
  const dir = missionDir(objectiveId);
  let artifacts = missionArtifacts(objectiveId);

  const tier1 = runTier1Check(objectiveId, { writeResult: true });
  const loop = await runLoopEscalation(objectiveId, { tier1, artifacts });

  let recovery = null;
  const failurePacket = packetPath(objectiveId);
  if (
    fs.existsSync(failurePacket) &&
    (loop.recovery_protocol_active ||
      loop.escalation_level === 'hard_stop' ||
      loop.escalation_level === 'escalate')
  ) {
    recovery = await runRecoveryProtocol(objectiveId);
    artifacts = missionArtifacts(objectiveId);
  } else if (loop.recovery_protocol_active || loop.escalation_level === 'hard_stop') {
    recovery = await runRecoveryProtocol(objectiveId);
    artifacts = missionArtifacts(objectiveId);
  }

  const objectiveScore =
    recovery?.objective_score === 'PASS'
      ? 'PASS'
      : recovery?.resolution === 'UNSOLVED_HONEST'
        ? 'UNSOLVED'
        : (recovery?.objective_score ?? (artifacts.SENTRY_CHECK_RESULT ? 'PARTIAL' : 'FAIL'));

  const observePass =
    objectiveScore === 'PASS' ||
    (recovery?.resolution === 'UNSOLVED_HONEST' && Boolean(recovery?.unsolved_written));

  const row = {
    ts: new Date().toISOString(),
    owner: 'AUTONOMOUS-RECOVERY-0002',
    objective_id: objectiveId,
    tier1_verdict: tier1.verdict,
    loop_escalation_level: loop.escalation_level,
    recovery_ran: Boolean(recovery),
    recovery_resolution: recovery?.resolution ?? null,
    unsolved_written: recovery?.unsolved_written ?? null,
    objective_score: objectiveScore,
    artifacts,
    system_terminal_stop: false,
  };

  fs.appendFileSync(path.join(dir, 'OBSERVATION_LOG.jsonl'), `${JSON.stringify(row)}\n`);

  return { objectiveId, loop, recovery, observePass, objectiveScore, artifacts };
}

export function applyRecoveryToQueue(objectiveId, recovery, { syncOnly = false } = {}) {
  const queue = loadQueue();
  const mission = queue.missions.find((m) => m.mission_id === objectiveId);
  if (!mission) return { updated: false, reason: 'mission_not_in_queue' };

  const now = new Date().toISOString();
  const complete = isObjectiveComplete(objectiveId);

  if (complete.complete || recovery?.resolution === 'OBJECTIVE_COMPLETE' || recovery?.objective_score === 'PASS') {
    mission.status = 'complete';
    mission.mission_outcome = 'PASS';
    mission.note = syncOnly
      ? `Queue synced — objective already complete (${complete.via || 'recovery'}) at ${now}`
      : `Recovered autonomously by autopilot owner (AUTONOMOUS-RECOVERY-0002) at ${now}`;
    delete mission.recovery_required;
  } else if (recovery?.resolution === 'UNSOLVED_HONEST') {
    mission.status = 'unsolved';
    mission.mission_outcome = 'UNSOLVED';
    mission.note = `Recovery exhausted — UNSOLVED receipt + FOUNDER_ALERT at ${now}`;
    delete mission.recovery_required;
  } else if (syncOnly) {
    return { updated: false, reason: 'sync_only_no_change' };
  } else {
    mission.status = 'recovery_in_progress';
    mission.recovery_required = true;
    mission.note = `Autopilot recovery owner invoked at ${now}`;
  }

  const recoveryMission = queue.missions.find((m) => m.mission_id === RECOVERY_MISSION_ID);
  if (
    recoveryMission &&
    (complete.complete ||
      recovery?.resolution === 'OBJECTIVE_COMPLETE' ||
      recovery?.resolution === 'UNSOLVED_HONEST')
  ) {
    recoveryMission.status = 'complete';
    recoveryMission.note = `Recovery owner wired (0002) — ${objectiveId} at ${now}`;
  }

  saveQueue(queue);
  return { updated: true, mission_status: mission.status, mission_outcome: mission.mission_outcome };
}

export function writeAutopilotRecoveryReceipt(payload) {
  const dest = path.join(REPO_ROOT, 'builderos-reboot/AUTOPILOT_RECOVERY_RECEIPT.json');
  fs.writeFileSync(dest, `${JSON.stringify({ schema: 'autopilot_recovery_receipt_v1', ...payload }, null, 2)}\n`);
  return dest;
}

/** Top-level owner entry: detect → recover → queue update. */
export async function runAutopilotRecoveryOwner() {
  const candidates = detectRecoveryCandidates();
  if (candidates.length === 0) {
    return { ran: false, reason: 'no_recovery_candidates' };
  }

  const target = candidates[0];
  const startedAt = new Date().toISOString();

  if (target.sync_only) {
    const queueUpdate = applyRecoveryToQueue(target.mission_id, null, { syncOnly: true });
    const receipt = writeAutopilotRecoveryReceipt({
      run_at: startedAt,
      owner: 'AUTONOMOUS-RECOVERY-0002',
      action: 'queue_sync_only',
      target: target.mission_id,
      detect_reason: target.reason,
      queue_update: queueUpdate,
      observe_pass: true,
    });
    return { ran: true, sync_only: true, target, queueUpdate, receipt };
  }

  const result = await runMissionRecovery(target.mission_id);
  const queueUpdate = applyRecoveryToQueue(target.mission_id, result.recovery);
  const receipt = writeAutopilotRecoveryReceipt({
    run_at: startedAt,
    owner: 'AUTONOMOUS-RECOVERY-0002',
    action: 'recovery_owner',
    target: target.mission_id,
    detect_reason: target.reason,
    recovery_resolution: result.recovery?.resolution ?? null,
    objective_score: result.objectiveScore,
    observe_pass: result.observePass,
    queue_update: queueUpdate,
    founder_alert_only_on_unsolved: result.recovery?.resolution === 'UNSOLVED_HONEST',
  });

  return { ran: true, target, result, queueUpdate, receipt };
}
