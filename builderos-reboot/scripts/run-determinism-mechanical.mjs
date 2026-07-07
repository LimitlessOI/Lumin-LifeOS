#!/usr/bin/env node
/**
 * SYNOPSIS: Mechanical determinism check: run dispatch 3x, compare outputs.
 * Mechanical determinism check: run dispatch 3x, compare outputs.
 * Proves executor stability (same-tier proxy for verify/copy missions).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(REPO_ROOT);

const { dispatchExecuteMission } = await import('../../factory-staging/factory-core/builder/run-mission.js');

function hashObj(obj) {
  return crypto.createHash('sha256').update(JSON.stringify(obj)).digest('hex');
}

const runs = [];
for (const label of ['run-a', 'run-b', 'run-c']) {
  const { httpStatus, body } = await dispatchExecuteMission({
    mission_id: 'FACTORY-REBOOT-0005',
    dry_run: true,
  });
  runs.push({ label, httpStatus, body_hash: hashObj(body), steps_total: body.steps_total });
}

const hashes = runs.map((r) => r.body_hash);
const pass = runs.every((r) => r.httpStatus === 200) && hashes[0] === hashes[1] && hashes[1] === hashes[2];

const receipt = {
  test_id: 'MECHANICAL-DETERMINISM-0005-DRY-RUN',
  run_at: new Date().toISOString(),
  mission_id: 'FACTORY-REBOOT-0005',
  mode: 'dry_run',
  pass,
  runs,
  note: 'Structural proxy. Full same-tier coder determinism still requires 3 fresh sessions per DETERMINISM_TEST_RUNBOOK.md',
};

const outPath = path.join(REPO_ROOT, 'builderos-reboot/DETERMINISM_RECEIPT.json');
fs.writeFileSync(outPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(receipt, null, 2));
process.exit(pass ? 0 : 1);
