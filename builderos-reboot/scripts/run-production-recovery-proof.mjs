#!/usr/bin/env node
/**
 * AUTONOMOUS-RECOVERY-0002 production proof — inject on Railway, recover via cron ONLY.
 * This script orchestrates HTTP calls; it must NOT invoke local factory:autopilot.
 * @ssot builderos-reboot/MISSIONS/AUTONOMOUS-RECOVERY-0001/FOUNDER_PACKET.json
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OBJECTIVE_ID = process.argv[2] || 'FACTORY-DELIBERATION-SENTRY-REGRESSION-0001';
const MISSION_DIR = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS/AUTONOMOUS-RECOVERY-0001');
const PROOF_DIR = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS', OBJECTIVE_ID);

const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const key = process.env.COMMAND_CENTER_KEY || process.env.COMMAND_KEY || '';

async function api(method, urlPath, body) {
  const r = await fetch(`${base}${urlPath}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(key ? { 'x-command-key': key } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 500) }; }
  return { status: r.status, json };
}

function writeUnsolved(report) {
  fs.mkdirSync(MISSION_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(MISSION_DIR, 'UNSOLVED_RECEIPT.json'),
    `${JSON.stringify({
      schema: 'unsolved_receipt_v1',
      generated_at: new Date().toISOString(),
      mission_id: 'AUTONOMOUS-RECOVERY-0001',
      objective_id: OBJECTIVE_ID,
      resolution: 'UNSOLVED_HONEST',
      reason: report.verdict,
      steps: report.steps,
      founder_alert_required: true,
      note: 'Production recovery proof failed — no manual npm recovery used',
    }, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(MISSION_DIR, 'FOUNDER_ALERT.json'),
    `${JSON.stringify({
      schema: 'founder_alert_v1',
      generated_at: new Date().toISOString(),
      severity: 'P0',
      reason: report.verdict,
      summary: 'Production autonomous recovery not proven — see PRODUCTION_RECOVERY_PROOF.json',
      report_ref: 'builderos-reboot/MISSIONS/' + OBJECTIVE_ID + '/PRODUCTION_RECOVERY_PROOF.json',
    }, null, 2)}\n`,
  );
}

function finish(report, exitCode) {
  fs.mkdirSync(PROOF_DIR, { recursive: true });
  const dest = path.join(PROOF_DIR, 'PRODUCTION_RECOVERY_PROOF.json');
  fs.writeFileSync(dest, `${JSON.stringify(report, null, 2)}\n`);
  const verdictPath = path.join(MISSION_DIR, 'OBJECTIVE_VERDICT.json');
  fs.writeFileSync(verdictPath, `${JSON.stringify({
    schema: 'objective_verdict_v1',
    generated_at: new Date().toISOString(),
    objective_id: 'AUTONOMOUS-RECOVERY-0002',
    verdict: report.pass ? 'OBJECTIVE_COMPLETE' : 'OBJECTIVE_NOT_COMPLETE',
    production_path: 'inject → GET /internal/cron/factory-recovery only',
    proof: dest,
    report,
  }, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) writeUnsolved(report);
  process.exit(exitCode);
}

const localHead = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: REPO_ROOT, encoding: 'utf8' }).stdout.trim();
const report = {
  schema: 'production_recovery_proof_v1',
  started_at: new Date().toISOString(),
  objective_id: OBJECTIVE_ID,
  invoke_recovery: 'GET /internal/cron/factory-recovery ONLY (no local npm)',
  local_head: localHead,
  steps: [],
  pass: false,
};

function step(name, ok, detail) {
  report.steps.push({ step: name, ok, detail, at: new Date().toISOString() });
}

if (!base || !key) {
  report.verdict = 'BLOCKED_MISSING_ENV';
  step('env', false, { base: Boolean(base), key: Boolean(key) });
  finish(report, 1);
}

const ready = await api('GET', '/api/v1/lifeos/builder/ready');
const liveSha = ready.json?.codegen?.deploy_commit_sha || '';
const shaOk = liveSha.startsWith(localHead.slice(0, 7));
step('deploy_sha_parity', shaOk, { local: localHead.slice(0, 12), live: liveSha.slice(0, 12) });
if (!shaOk) {
  report.verdict = 'BLOCKED_DEPLOY_DRIFT';
  finish(report, 1);
}

const inject = await api('POST', `/internal/cron/factory-recovery-proof/inject`, { objective_id: OBJECTIVE_ID });
const injectOk = inject.status === 200 && inject.json?.ok === true;
step('production_inject_failure', injectOk, { http: inject.status, body: inject.json });
if (!injectOk) {
  report.verdict = inject.status === 404 ? 'BLOCKED_INJECT_ROUTE_MISSING' : 'INJECT_FAILED';
  finish(report, 1);
}

const statusBefore = await api('GET', `/internal/cron/factory-recovery-proof/status?objective_id=${encodeURIComponent(OBJECTIVE_ID)}`);
const candidatesBefore = statusBefore.json?.recovery_candidates?.length ?? 0;
step('recovery_candidates_detected', candidatesBefore > 0, { count: candidatesBefore, body: statusBefore.json });
if (candidatesBefore === 0) {
  report.verdict = 'NO_RECOVERY_CANDIDATES_AFTER_INJECT';
  finish(report, 1);
}

const cron = await api('GET', '/internal/cron/factory-recovery');
const cronOk = cron.status === 200 && cron.json?.result?.exit_code === 0;
step('production_cron_recovery', cronOk, { http: cron.status, result: cron.json?.result });
report.production_cron = cron.json;

if (!cronOk) {
  report.verdict = 'PRODUCTION_CRON_RECOVERY_FAILED';
  finish(report, 1);
}

const deadline = Date.now() + 120000;
let finalStatus = null;
while (Date.now() < deadline) {
  await new Promise((r) => setTimeout(r, 5000));
  const st = await api('GET', `/internal/cron/factory-recovery-proof/status?objective_id=${encodeURIComponent(OBJECTIVE_ID)}`);
  finalStatus = st.json;
  if (st.json?.pass === true) break;
  if (st.json?.artifacts?.UNSOLVED_RECEIPT) break;
}

const pass = finalStatus?.pass === true;
step('objective_complete_on_production', pass, finalStatus);
report.final_status = finalStatus;
report.pass = pass;
report.verdict = pass ? 'OBJECTIVE_COMPLETE' : 'UNSOLVED_HONEST';
report.completed_at = new Date().toISOString();
finish(report, pass ? 0 : 1);
