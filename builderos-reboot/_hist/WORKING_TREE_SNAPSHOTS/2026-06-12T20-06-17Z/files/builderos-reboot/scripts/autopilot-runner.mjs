#!/usr/bin/env node
/**
 * HIST DOMAIN — Historian owns this artifact (read/salvage only).
 * hist_id: HIST-AUTO-004
 * Law: prompts/00-HIST-LEGACY-BOUNDARY.md
 * Product queue: builderos-reboot/BP_PRIORITY.json — not MISSION_QUEUE.json
 *
 * Auto-pilot: recovery owner first, then next pending mission from MISSION_QUEUE.json.
 * AUTONOMOUS-RECOVERY-0002: hard_stop / mission_failed → automatic recovery (no human invoke).
 * Usage: node builderos-reboot/scripts/autopilot-runner.mjs [--execute] [--skip-recovery]
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  detectRecoveryCandidates,
  runAutopilotRecoveryOwner,
} from './mission-recovery-owner.mjs';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const execute = process.argv.includes('--execute');
const skipRecovery = process.argv.includes('--skip-recovery');

if (!skipRecovery) {
  const candidates = detectRecoveryCandidates();
  if (candidates.length > 0) {
    console.log(`Auto-pilot recovery owner: ${candidates[0].mission_id} (${candidates[0].reason})`);
    const recoveryRun = await runAutopilotRecoveryOwner();
    console.log(JSON.stringify(recoveryRun, null, 2));

    if (recoveryRun.ran && !recoveryRun.sync_only) {
      const exitCode = recoveryRun.result?.observePass ? 0 : 1;
      if (!recoveryRun.result?.observePass) {
        console.log('Recovery owner finished — objective not complete; founder alert if UNSOLVED.');
      }
      process.exit(exitCode);
    }
    if (recoveryRun.ran && recoveryRun.sync_only) {
      console.log('Queue synced for already-complete objective; continuing to pending missions.');
    }
  }
}

const queue = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'builderos-reboot/MISSION_QUEUE.json'), 'utf8'));
const pending = queue.missions.find((m) => m.status === 'pending' || m.status === 'in_progress');

if (!pending) {
  console.log('No pending missions in queue.');
  process.exit(0);
}

const missionId = pending.mission_id;
const blueprintPath = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS', missionId, 'BLUEPRINT.json');

console.log(`Auto-pilot target: ${missionId} (execute=${execute})`);

if (!fs.existsSync(blueprintPath)) {
  console.log(`Mission pack not emitted yet: ${blueprintPath}`);
  console.log('Next action: emit blueprint for this mission.');
  process.exit(2);
}

if (!execute) {
  const { dispatchExecuteMission } = await import('../../factory-staging/factory-core/builder/run-mission.js');
  const { httpStatus, body } = dispatchExecuteMission({ mission_id: missionId, dry_run: true });
  console.log(JSON.stringify({ httpStatus, body }, null, 2));
  console.log('\nDry-run only. Re-run with --execute to materialize.');
  process.exit(httpStatus === 200 ? 0 : 1);
}

const result = spawnSync(
  process.execPath,
  ['builderos-reboot/scripts/execute-mission.mjs', missionId],
  { cwd: REPO_ROOT, stdio: 'inherit' },
);

process.exit(result.status ?? 1);
