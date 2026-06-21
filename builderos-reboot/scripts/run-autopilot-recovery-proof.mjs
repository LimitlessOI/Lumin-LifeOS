#!/usr/bin/env node
/**
 * SYNOPSIS: AUTONOMOUS-RECOVERY-0002 proof — simulate hard_stop, invoke ONLY factory:autopilot (no observe manual).
 * AUTONOMOUS-RECOVERY-0002 proof — simulate hard_stop, invoke ONLY factory:autopilot (no observe manual).
 * @ssot builderos-reboot/MISSIONS/AUTONOMOUS-RECOVERY-0001/FOUNDER_PACKET.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { REPO_ROOT, missionDir } from './mission-lib.mjs';
import { detectRecoveryCandidates, loadQueue, saveQueue } from './mission-recovery-owner.mjs';
import { isObjectiveComplete } from './recovery-protocol-lib.mjs';

const OBJECTIVE_ID = process.argv[2] || 'FACTORY-DELIBERATION-SENTRY-REGRESSION-0001';
const SKIP_SIMULATE = process.argv.includes('--skip-simulate');

const HARNESS = path.join(REPO_ROOT, 'scripts/deliberation-sentry-regression-harness.mjs');

function rmIfExists(p) {
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

function simulateHardStop(objectiveId) {
  const dir = missionDir(objectiveId);
  const queue = loadQueue();
  const entry = queue.missions.find((m) => m.mission_id === objectiveId);
  if (entry) {
    entry.status = 'mission_failed';
    entry.mission_outcome = 'FAIL';
    entry.recovery_required = true;
    entry.note = `Simulated hard_stop for AUTONOMOUS-RECOVERY-0002 proof at ${new Date().toISOString()}`;
    delete entry.mission_outcome_pass;
    saveQueue(queue);
  }

  rmIfExists(HARNESS);
  rmIfExists(path.join(dir, 'REGRESSION_RUN_RESULT.json'));
  rmIfExists(path.join(dir, 'SENTRY_CHECK_RESULT.json'));
  rmIfExists(path.join(dir, 'RECOVERY_PROTOCOL_RESULT.json'));
  rmIfExists(path.join(dir, 'UNSOLVED_RECEIPT.json'));

  return { simulated: true, objectiveId };
}

const startedAt = new Date().toISOString();

if (!SKIP_SIMULATE) {
  const sim = simulateHardStop(OBJECTIVE_ID);
  console.log('Simulated failure:', JSON.stringify(sim, null, 2));
}

const beforeCandidates = detectRecoveryCandidates();
console.log('Recovery candidates before autopilot:', JSON.stringify(beforeCandidates, null, 2));

if (beforeCandidates.length === 0) {
  console.error('FAIL: no recovery candidates detected after simulate');
  process.exit(1);
}

const autopilot = spawnSync(process.execPath, ['builderos-reboot/scripts/autopilot-runner.mjs'], {
  cwd: REPO_ROOT,
  encoding: 'utf8',
  env: process.env,
  timeout: 600000,
});

console.log(autopilot.stdout || '');
if (autopilot.stderr) console.error(autopilot.stderr);

const complete = isObjectiveComplete(OBJECTIVE_ID);
const queueAfter = loadQueue();
const mission = queueAfter.missions.find((m) => m.mission_id === OBJECTIVE_ID);
const receiptPath = path.join(REPO_ROOT, 'builderos-reboot/AUTOPILOT_RECOVERY_RECEIPT.json');
let receipt = null;
if (fs.existsSync(receiptPath)) {
  receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
}

const proof = {
  schema: 'autopilot_recovery_proof_v2',
  generated_at: new Date().toISOString(),
  started_at: startedAt,
  owner: 'AUTONOMOUS-RECOVERY-0002',
  objective_id: OBJECTIVE_ID,
  invoke: 'npm run factory:autopilot ONLY (no run-mission-observe manual)',
  autopilot_exit: autopilot.status,
  recovery_candidates_before: beforeCandidates.length,
  mission_status_after: mission?.status ?? null,
  mission_outcome_after: mission?.mission_outcome ?? null,
  objective_complete: complete.complete,
  complete_via: complete.via ?? null,
  receipt,
  pass:
    autopilot.status === 0 &&
    complete.complete &&
    (mission?.status === 'complete' || mission?.mission_outcome === 'PASS'),
};

const proofPath = path.join(missionDir(OBJECTIVE_ID), 'AUTOPILOT_RECOVERY_PROOF.json');
fs.writeFileSync(proofPath, `${JSON.stringify(proof, null, 2)}\n`);

console.log(JSON.stringify({ proof }, null, 2));
process.exit(proof.pass ? 0 : 1);
