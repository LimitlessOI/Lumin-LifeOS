#!/usr/bin/env node
/**
 * Mechanical greenfield determinism: execute GF001 step 3x into run-a/b/c, compare.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(REPO_ROOT);

const { dispatchExecuteStep } = await import('../../factory-staging/factory-core/builder/run-step.js');

const blueprint = JSON.parse(fs.readFileSync('builderos-reboot/MISSIONS/FACTORY-GREENFIELD-0001/BLUEPRINT.json', 'utf8'));
const step = blueprint.steps[0];
const base = 'builderos-reboot/TEST_RUNS/FACTORY-GREENFIELD-0001';

function hashFile(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

const runs = [];
for (const label of ['run-a', 'run-b', 'run-c']) {
  const runDir = path.join(REPO_ROOT, base, label, 'factory-staging/greenfield');
  fs.mkdirSync(runDir, { recursive: true });
  const targetRel = step.target_file;
  const liveTarget = path.join(REPO_ROOT, targetRel);
  if (fs.existsSync(liveTarget)) fs.unlinkSync(liveTarget);

  const { httpStatus, body } = dispatchExecuteStep({
    mission_id: 'FACTORY-GREENFIELD-0001',
    blueprint_id: blueprint.blueprint_id,
    step,
  });

  if (httpStatus !== 200) {
    console.error('FAIL execute', label, body);
    process.exit(1);
  }

  const dest = path.join(runDir, 'PROOF_MARKER.txt');
  fs.copyFileSync(liveTarget, dest);
  runs.push({ label, sha256: hashFile(dest), httpStatus, input_mode: body.builder?.input_mode });
}

const pass = runs[0].sha256 === runs[1].sha256 && runs[1].sha256 === runs[2].sha256;

const compare = spawnSync('bash', [
  'builderos-reboot/scripts/compare-run-directories.sh',
  `${base}/run-a`,
  `${base}/run-b`,
  `${base}/run-c`,
], { cwd: REPO_ROOT, encoding: 'utf8' });

const receipt = {
  test_id: 'GREENFIELD-DETERMINISM-3X-MECHANICAL',
  run_at: new Date().toISOString(),
  mission_id: 'FACTORY-GREENFIELD-0001',
  pass: pass && compare.status === 0,
  runs,
  directory_compare_exit: compare.status,
  note: 'Mechanical 3-run proxy. Human 3-session test still recommended per DETERMINISM_CODER_PROMPT.md',
};

fs.writeFileSync(path.join(REPO_ROOT, 'builderos-reboot/GREENFIELD_DETERMINISM_RECEIPT.json'), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
process.exit(receipt.pass ? 0 : 1);
