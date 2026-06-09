#!/usr/bin/env node
/** Readiness report v3 — includes duplication, greenfield 3x, queue dry-run receipts. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

function run(args) {
  const r = spawnSync(process.execPath, args, { cwd: REPO_ROOT, encoding: 'utf8' });
  return { ok: r.status === 0, status: r.status };
}

function receiptPass(rel) {
  const p = path.join(REPO_ROOT, rel);
  if (!fs.existsSync(p)) return false;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')).pass === true;
  } catch {
    return false;
  }
}

const acceptance = run(['builderos-reboot/scripts/run-all-mission-acceptance.mjs']);
const integrationStep = run(['builderos-reboot/scripts/factory-execute-step-integration.mjs']);
const integrationMission = run(['builderos-reboot/scripts/factory-execute-mission-integration.mjs']);
const integrationGreenfield = run(['builderos-reboot/scripts/greenfield-integration.mjs']);
const determinism = receiptPass('builderos-reboot/DETERMINISM_RECEIPT.json') || run(['builderos-reboot/scripts/run-determinism-mechanical.mjs']).ok;
const greenfield3x = receiptPass('builderos-reboot/GREENFIELD_DETERMINISM_RECEIPT.json');
const duplication = receiptPass('builderos-reboot/DUPLICATION_RECEIPT.json');
const queueDry = receiptPass('builderos-reboot/QUEUE_DRY_RUN_RECEIPT.json');
const cutover = run(['builderos-reboot/scripts/cutover-verify.mjs']);

const queue = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'builderos-reboot/MISSION_QUEUE.json'), 'utf8'));
const state = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'builderos-reboot/CURRENT_STATE.json'), 'utf8'));

const checks = {
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

const corePass = checks.acceptance && checks.integration_step && checks.integration_mission && checks.integration_greenfield && checks.determinism_mechanical;
const extendedPass = corePass && checks.greenfield_3x && checks.duplication_rematerialize && checks.queue_dry_run && checks.cutover_verify;

const report = {
  generated_at: new Date().toISOString(),
  version: 3,
  verdict: extendedPass ? 'STAGING_READY_EXTENDED' : corePass ? 'STAGING_READY' : 'STAGING_NOT_READY',
  checks,
  queue_complete: queue.missions.filter((m) => m.status === 'complete').length,
  queue_total: queue.missions.length,
  active_mission: state.active_mission_id,
  lumin_factory_path: fs.existsSync(path.join(REPO_ROOT, 'lumin-factory')) ? 'lumin-factory/' : null,
};

fs.writeFileSync(path.join(REPO_ROOT, 'builderos-reboot/READINESS_REPORT.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exit(corePass ? 0 : 1);
