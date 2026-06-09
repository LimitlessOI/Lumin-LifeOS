#!/usr/bin/env node
/**
 * Blueprint duplication test: delete core runtime files, re-materialize missions, verify sha256.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(REPO_ROOT);

function sha256(rel) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(REPO_ROOT, rel))).digest('hex');
}

const probes = [
  'factory-staging/factory-core/builder/run-step.js',
  'factory-staging/factory-core/builder/run-mission.js',
  'factory-staging/startup/register-routes.js',
];

const before = Object.fromEntries(probes.map((p) => [p, sha256(p)]));

for (const p of probes) {
  fs.unlinkSync(path.join(REPO_ROOT, p));
  console.log('deleted', p);
}

// Canonical owners of shared runtime files (latest mission wins — avoid stale intermediate routes).
const steps = [
  ['FACTORY-REBOOT-0029', 'S2904'],
  ['FACTORY-REBOOT-0006', 'S601'],
  ['FACTORY-REBOOT-0029', 'S2905'],
];
for (const [mission, stepId] of steps) {
  const r = spawnSync(process.execPath, ['builderos-reboot/scripts/execute-mission-step.mjs', mission, stepId], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  if (r.status !== 0) {
    console.error('FAIL rematerialize', mission, stepId, r.stdout, r.stderr);
    process.exit(1);
  }
  console.log('rematerialized', mission, stepId);
}

const after = Object.fromEntries(probes.map((p) => [p, sha256(p)]));
const pass = probes.every((p) => before[p] === after[p]);

const receipt = {
  test_id: 'BLUEPRINT-DUPLICATION-REMATERIALIZE',
  run_at: new Date().toISOString(),
  pass,
  steps_rerun: steps.map(([mission, stepId]) => ({ mission, stepId })),
  probes: probes.map((p) => ({ path: p, before: before[p], after: after[p], match: before[p] === after[p] })),
};

fs.writeFileSync(path.join(REPO_ROOT, 'builderos-reboot/DUPLICATION_RECEIPT.json'), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
process.exit(pass ? 0 : 1);
