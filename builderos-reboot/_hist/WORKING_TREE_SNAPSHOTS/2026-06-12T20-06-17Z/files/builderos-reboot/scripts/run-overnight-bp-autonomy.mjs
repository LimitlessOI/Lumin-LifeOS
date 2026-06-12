#!/usr/bin/env node
/**
 * HIST DOMAIN — Historian owns this artifact (read/salvage only).
 * hist_id: HIST-AUTO-004
 * Law: prompts/00-HIST-LEGACY-BOUNDARY.md
 * Product queue: builderos-reboot/BP_PRIORITY.json
 *
 * Overnight BP autonomy — production deploy gate + recovery proof + one bounded objective.
 * Scope: AUTONOMOUS-RECOVERY-0002 only. No LifeOS product work.
 * @ssot builderos-reboot/MISSIONS/AUTONOMOUS-RECOVERY-0001/FOUNDER_PACKET.json
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
process.chdir(REPO_ROOT);

const base = (process.env.PUBLIC_BASE_URL || process.env.BUILDER_BASE_URL || '').replace(/\/$/, '');
const key = process.env.COMMAND_CENTER_KEY || process.env.COMMAND_KEY || '';
const localHead = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();

async function fetchJson(urlPath, { method = 'GET' } = {}) {
  const r = await fetch(`${base}${urlPath}`, {
    method,
    headers: key ? { 'x-command-key': key } : {},
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 300) }; }
  return { status: r.status, json };
}

const report = {
  schema: 'overnight_bp_autonomy_v1',
  started_at: new Date().toISOString(),
  scope: 'AUTONOMOUS-RECOVERY-0002 production BP only — no LifeOS product',
  local_head: localHead,
  steps: [],
};

function step(name, ok, detail) {
  report.steps.push({ step: name, ok, detail, at: new Date().toISOString() });
}

function writeReport(payload, exitCode) {
  const dest = path.join(REPO_ROOT, 'builderos-reboot/OVERNIGHT_BP_AUTONOMY_RECEIPT.json');
  fs.writeFileSync(dest, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(JSON.stringify(payload, null, 2));
  process.exit(exitCode);
}

function writeUnsolved(payload) {
  const dir = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS/AUTONOMOUS-RECOVERY-0001');
  fs.writeFileSync(
    path.join(dir, 'UNSOLVED_RECEIPT.json'),
    `${JSON.stringify({
      schema: 'unsolved_receipt_v1',
      generated_at: new Date().toISOString(),
      mission_id: 'AUTONOMOUS-RECOVERY-0001',
      resolution: 'UNSOLVED_HONEST',
      reason: payload.verdict,
      steps: payload.steps,
      founder_alert_required: true,
      note: 'Overnight BP autonomy — deploy gate or recovery proof failed',
    }, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(dir, 'FOUNDER_ALERT.json'),
    `${JSON.stringify({
      schema: 'founder_alert_v1',
      generated_at: new Date().toISOString(),
      severity: 'P0',
      reason: payload.verdict,
      summary: 'Overnight BP autonomy did not complete — see OVERNIGHT_BP_AUTONOMY_RECEIPT.json',
      report_ref: 'builderos-reboot/OVERNIGHT_BP_AUTONOMY_RECEIPT.json',
    }, null, 2)}\n`,
  );
}

const ready = await fetchJson('/api/v1/lifeos/builder/ready');
const liveSha = ready.json?.codegen?.deploy_commit_sha || '';
const shaMatch = liveSha.startsWith(localHead.slice(0, 7));
step('deploy_sha_parity', shaMatch, { local_head: localHead.slice(0, 12), live_sha: liveSha.slice(0, 12) });

if (!shaMatch) {
  report.verdict = 'BLOCKED_DEPLOY_DRIFT';
  report.founder_alert_required = true;
  writeUnsolved(report);
  writeReport(report, 1);
}

const cron = await fetchJson('/internal/cron/factory-recovery');
const cronOk = cron.status === 200 && cron.json?.result?.ok !== false;
step('production_recovery_cron', cronOk, { http: cron.status, body: cron.json });
report.production_recovery = cron.json;

if (!cronOk) {
  report.verdict = 'BLOCKED_RECOVERY_CRON';
  report.founder_alert_required = true;
  writeUnsolved(report);
  writeReport(report, 1);
}

const proof = spawnSync(process.execPath, ['builderos-reboot/scripts/run-autopilot-recovery-proof.mjs'], {
  cwd: REPO_ROOT,
  encoding: 'utf8',
  env: process.env,
  timeout: 600000,
});
step('autopilot_recovery_proof', proof.status === 0, { exit: proof.status, stderr_tail: (proof.stderr || '').slice(-400) });

if (proof.status !== 0) {
  report.verdict = 'UNSOLVED_HONEST';
  report.founder_alert_required = true;
  writeUnsolved(report);
  writeReport(report, 1);
}

const queue = JSON.parse(fs.readFileSync('builderos-reboot/MISSION_QUEUE.json', 'utf8'));
const queued = queue.missions.find((m) => m.status === 'queued' || m.status === 'pending');
if (queued) {
  const { dispatchExecuteMission } = await import('../../factory-staging/factory-core/builder/run-mission.js');
  const { httpStatus, body } = dispatchExecuteMission({ mission_id: queued.mission_id, dry_run: true });
  step('queued_objective_dry_run', httpStatus === 200 && body.ok, {
    mission_id: queued.mission_id,
    httpStatus,
    steps_total: body.steps_total,
  });
  report.queued_objective = { mission_id: queued.mission_id, dry_run: true, httpStatus, ok: body.ok };
} else {
  step('queued_objective_dry_run', true, { note: 'no queued mission — skipped' });
}

report.verdict = 'OBJECTIVE_COMPLETE';
report.completed_at = new Date().toISOString();
writeReport(report, 0);
