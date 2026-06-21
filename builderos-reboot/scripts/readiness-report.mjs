#!/usr/bin/env node
/**
 * SYNOPSIS: Readiness report v3 — includes duplication, greenfield 3x, queue dry-run receipts. Readiness report v3 — includes duplication, greenfield 3x, queue dry-run receipts. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  detectFactoryLayout,
  machinePath,
  repoRootFromScriptMeta,
  scriptPath,
} from './factory-repo-layout.mjs';

const REPO_ROOT = repoRootFromScriptMeta(import.meta.url);
const layout = detectFactoryLayout(REPO_ROOT);

function runScript(scriptName, extraArgs = []) {
  const r = spawnSync(process.execPath, [scriptPath(layout, scriptName), ...extraArgs], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
  return { ok: r.status === 0, status: r.status };
}

function receiptPass(fileName) {
  const p = machinePath(REPO_ROOT, layout, fileName);
  if (!fs.existsSync(p)) return false;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')).pass === true;
  } catch {
    return false;
  }
}

const acceptance = runScript('run-all-mission-acceptance.mjs');
const integrationStep = runScript('factory-execute-step-integration.mjs');
const integrationMission = runScript('factory-execute-mission-integration.mjs');
const integrationGreenfield = runScript('greenfield-integration.mjs');
const determinism =
  receiptPass('DETERMINISM_RECEIPT.json') || runScript('run-determinism-mechanical.mjs').ok;
const greenfield3x = receiptPass('GREENFIELD_DETERMINISM_RECEIPT.json');
const duplication = receiptPass('DUPLICATION_RECEIPT.json');
const queueDry = receiptPass('QUEUE_DRY_RUN_RECEIPT.json');
const cutover = runScript('cutover-verify.mjs');

const queue = JSON.parse(fs.readFileSync(machinePath(REPO_ROOT, layout, 'MISSION_QUEUE.json'), 'utf8'));
const state = JSON.parse(fs.readFileSync(machinePath(REPO_ROOT, layout, 'CURRENT_STATE.json'), 'utf8'));

const checks = {
  layout: layout.mode,
  acceptance: acceptance.ok,
  integration_step: integrationStep.ok,
  integration_mission: integrationMission.ok,
  integration_greenfield: integrationGreenfield.ok,
  determinism_mechanical: determinism,
  greenfield_3x: greenfield3x,
  duplication_rematerialize: duplication,
  queue_dry_run: queueDry,
  cutover_verify: cutover.ok,
};

const corePass =
  checks.acceptance &&
  checks.integration_step &&
  checks.integration_mission &&
  checks.integration_greenfield &&
  checks.determinism_mechanical;
const extendedPass =
  corePass &&
  checks.greenfield_3x &&
  checks.duplication_rematerialize &&
  checks.queue_dry_run &&
  checks.cutover_verify;

const report = {
  generated_at: new Date().toISOString(),
  version: 3,
  layout: layout.mode,
  verdict: extendedPass ? 'STAGING_READY_EXTENDED' : corePass ? 'STAGING_READY' : 'STAGING_NOT_READY',
  checks,
  queue_complete: queue.missions.filter((m) => m.status === 'complete').length,
  queue_total: queue.missions.length,
  active_mission: state.active_mission_id,
  lumin_factory_path: fs.existsSync(path.join(REPO_ROOT, 'lumin-factory')) ? 'lumin-factory/' : null,
};

fs.writeFileSync(machinePath(REPO_ROOT, layout, 'READINESS_REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exit(corePass ? 0 : 1);
