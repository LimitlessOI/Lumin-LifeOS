#!/usr/bin/env node
/** Single CI entry: run all factory verification scripts. */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectFactoryLayout, repoRootFromScriptMeta, scriptPath } from './factory-repo-layout.mjs';

const REPO_ROOT = repoRootFromScriptMeta(import.meta.url);
const layout = detectFactoryLayout(REPO_ROOT);
console.log(`factory:ci layout=${layout.mode} repo=${REPO_ROOT}`);

const steps = [
  ['acceptance', ['run-all-mission-acceptance.mjs']],
  ['integration_step', ['factory-execute-step-integration.mjs']],
  ['integration_mission', ['factory-execute-mission-integration.mjs']],
  ['greenfield', ['greenfield-integration.mjs']],
  ['determinism_mechanical', ['run-determinism-mechanical.mjs']],
  ['greenfield_3x', ['run-greenfield-determinism-3x.mjs']],
  ['duplication', ['factory-duplication-test.mjs']],
  ['queue_dry_run', ['autopilot-run-queue.mjs']],
  ['cutover_verify', ['cutover-verify.mjs']],
  ['readiness', ['readiness-report.mjs']],
  ['full_loop_proof', ['run-full-loop-proof.mjs']],
  ['product_salvage', ['generate-product-salvage.mjs']],
  ['mission_pack_index', ['generate-mission-pack-index.mjs']],
  ['certification', ['emit-project-certification.mjs']],
  ['tsos_integration', ['factory-tsos-integration.mjs']],
  ['tools_integration', ['factory-tools-integration.mjs']],
  ['tier1_telemetry_enforced', ['verify-tier1-telemetry.mjs', '--active', '--enforce', '--factory-scope']],
];

const results = {};
let failed = 0;

for (const [name, args] of steps) {
  const script = scriptPath(layout, args[0]);
  const r = spawnSync(process.execPath, [script, ...args.slice(1)], { cwd: REPO_ROOT, encoding: 'utf8' });
  results[name] = r.status === 0;
  console.log(results[name] ? `PASS ${name}` : `FAIL ${name}`);
  if (!results[name]) failed++;
}

const allPass = failed === 0;
console.log(allPass ? '\nFACTORY CI: ALL PASS' : `\nFACTORY CI: ${failed} FAILED`);
process.exit(allPass ? 0 : 1);
