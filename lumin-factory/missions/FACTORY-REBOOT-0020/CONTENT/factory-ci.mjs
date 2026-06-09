#!/usr/bin/env node
/** Single CI entry: run all factory verification scripts. */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

const steps = [
  ['acceptance', ['builderos-reboot/scripts/run-all-mission-acceptance.mjs']],
  ['integration_step', ['builderos-reboot/scripts/factory-execute-step-integration.mjs']],
  ['integration_mission', ['builderos-reboot/scripts/factory-execute-mission-integration.mjs']],
  ['greenfield', ['builderos-reboot/scripts/greenfield-integration.mjs']],
  ['determinism_mechanical', ['builderos-reboot/scripts/run-determinism-mechanical.mjs']],
  ['greenfield_3x', ['builderos-reboot/scripts/run-greenfield-determinism-3x.mjs']],
  ['duplication', ['builderos-reboot/scripts/factory-duplication-test.mjs']],
  ['queue_dry_run', ['builderos-reboot/scripts/autopilot-run-queue.mjs']],
  ['cutover_verify', ['builderos-reboot/scripts/cutover-verify.mjs']],
  ['readiness', ['builderos-reboot/scripts/readiness-report.mjs']],
];

const results = {};
let failed = 0;

for (const [name, args] of steps) {
  const scriptPath = path.join(REPO_ROOT, args[0]);
  const r = spawnSync(process.execPath, [scriptPath], { cwd: REPO_ROOT, encoding: 'utf8' });
  results[name] = r.status === 0;
  console.log(results[name] ? `PASS ${name}` : `FAIL ${name}`);
  if (!results[name]) failed++;
}

const allPass = failed === 0;
console.log(allPass ? '\nFACTORY CI: ALL PASS' : `\nFACTORY CI: ${failed} FAILED`);
process.exit(allPass ? 0 : 1);
