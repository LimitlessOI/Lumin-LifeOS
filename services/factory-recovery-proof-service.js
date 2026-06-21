/**
 * SYNOPSIS: Production recovery proof — inject mission_failed on server filesystem + read status.
 * Production recovery proof — inject mission_failed on server filesystem + read status.
 * Used only by /internal/cron/factory-recovery-proof/* (AUTONOMOUS-RECOVERY-0002).
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QUEUE_PATH = path.join(REPO_ROOT, 'builderos-reboot/MISSION_QUEUE.json');
const HARNESS_PATH = path.join(REPO_ROOT, 'scripts/deliberation-sentry-regression-harness.mjs');
const AUTOPILOT_RECEIPT = path.join(REPO_ROOT, 'builderos-reboot/AUTOPILOT_RECOVERY_RECEIPT.json');
const CRON_RECEIPT = path.join(REPO_ROOT, 'builderos-reboot/FACTORY_AUTOPILOT_CRON_RECEIPT.json');

function missionDir(objectiveId) {
  return path.join(REPO_ROOT, 'builderos-reboot/MISSIONS', objectiveId);
}

function rmIfExists(p) {
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

function readJsonIfExists(p) {
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return { parse_error: true };
  }
}

export function loadMissionQueue() {
  return JSON.parse(fs.readFileSync(QUEUE_PATH, 'utf8'));
}

export function saveMissionQueue(queue) {
  queue.updated_at = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(QUEUE_PATH, `${JSON.stringify(queue, null, 2)}\n`);
}

/** Simulate hard_stop / mission_failed on the running server filesystem. */
export function injectProductionFailure(objectiveId) {
  const dir = missionDir(objectiveId);
  const queue = loadMissionQueue();
  const entry = queue.missions.find((m) => m.mission_id === objectiveId);
  if (!entry) {
    return { ok: false, error: 'objective_not_in_queue', objectiveId };
  }

  entry.status = 'mission_failed';
  entry.mission_outcome = 'FAIL';
  entry.recovery_required = true;
  entry.note = `Production proof inject — simulated hard_stop at ${new Date().toISOString()}`;
  delete entry.mission_outcome_pass;
  saveMissionQueue(queue);

  rmIfExists(HARNESS_PATH);
  rmIfExists(path.join(dir, 'REGRESSION_RUN_RESULT.json'));
  rmIfExists(path.join(dir, 'SENTRY_CHECK_RESULT.json'));
  rmIfExists(path.join(dir, 'RECOVERY_PROTOCOL_RESULT.json'));
  rmIfExists(path.join(dir, 'UNSOLVED_RECEIPT.json'));

  return {
    ok: true,
    objectiveId,
    injected_at: new Date().toISOString(),
    queue_status: entry.status,
    harness_removed: !fs.existsSync(HARNESS_PATH),
  };
}

/** Read production recovery proof status from server disk. */
export async function getProductionProofStatus(objectiveId) {
  const queue = loadMissionQueue();
  const entry = queue.missions.find((m) => m.mission_id === objectiveId) || null;
  const dir = missionDir(objectiveId);

  let candidates = [];
  let objectiveComplete = { complete: false };
  try {
    const owner = await import('../builderos-reboot/scripts/mission-recovery-owner.mjs');
    candidates = owner.detectRecoveryCandidates(queue);
    const recovery = await import('../builderos-reboot/scripts/recovery-protocol-lib.mjs');
    objectiveComplete = recovery.isObjectiveComplete(objectiveId);
  } catch (err) {
    objectiveComplete = { complete: false, detect_error: err.message };
  }

  return {
    objective_id: objectiveId,
    deploy_sha: process.env.RAILWAY_GIT_COMMIT_SHA || process.env.GIT_COMMIT || null,
    queue_entry: entry
      ? {
          status: entry.status,
          mission_outcome: entry.mission_outcome ?? null,
          recovery_required: entry.recovery_required ?? false,
          note: entry.note ?? null,
        }
      : null,
    recovery_candidates: candidates.map((c) => ({
      mission_id: c.mission_id,
      reason: c.reason,
      sync_only: c.sync_only,
    })),
    objective_complete: objectiveComplete,
    artifacts: {
      harness: fs.existsSync(HARNESS_PATH),
      REGRESSION_RUN_RESULT: fs.existsSync(path.join(dir, 'REGRESSION_RUN_RESULT.json')),
      RECOVERY_PROTOCOL_RESULT: fs.existsSync(path.join(dir, 'RECOVERY_PROTOCOL_RESULT.json')),
      UNSOLVED_RECEIPT: fs.existsSync(path.join(dir, 'UNSOLVED_RECEIPT.json')),
      FOUNDER_ALERT: fs.existsSync(path.join(dir, 'FOUNDER_ALERT.json')),
    },
    receipts: {
      autopilot: readJsonIfExists(AUTOPILOT_RECEIPT),
      cron: readJsonIfExists(CRON_RECEIPT),
    },
    pass:
      objectiveComplete.complete === true &&
      (entry?.status === 'complete' || entry?.mission_outcome === 'PASS'),
    checked_at: new Date().toISOString(),
  };
}
