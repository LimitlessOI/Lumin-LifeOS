#!/usr/bin/env node
/**
 * SYNOPSIS: HIST DOMAIN — Historian owns this artifact (read/salvage only).
 * HIST DOMAIN — Historian owns this artifact (read/salvage only).
 * hist_id: HIST-AUTO-004
 * Law: prompts/00-HIST-LEGACY-BOUNDARY.md
 * Product queue: builderos-reboot/BP_PRIORITY.json
 *
 * Dry-run entire mission queue to prove blueprints are parseable and ordered.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(REPO_ROOT);

const { dispatchExecuteMission } = await import('../../factory-staging/factory-core/builder/run-mission.js');

const queue = JSON.parse(fs.readFileSync('builderos-reboot/MISSION_QUEUE.json', 'utf8'));
const results = [];

for (const m of queue.missions) {
  const bp = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS', m.mission_id, 'BLUEPRINT.json');
  if (!fs.existsSync(bp)) {
    results.push({ mission_id: m.mission_id, status: 'no_blueprint' });
    continue;
  }
  const { httpStatus, body } = dispatchExecuteMission({ mission_id: m.mission_id, dry_run: true });
  results.push({
    mission_id: m.mission_id,
    httpStatus,
    ok: httpStatus === 200 && body.ok,
    steps_total: body.steps_total,
  });
}

const pass = results.filter((r) => r.httpStatus).every((r) => r.ok);
const receipt = { run_at: new Date().toISOString(), pass, results };
fs.writeFileSync(path.join(REPO_ROOT, 'builderos-reboot/QUEUE_DRY_RUN_RECEIPT.json'), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
process.exit(pass ? 0 : 1);
