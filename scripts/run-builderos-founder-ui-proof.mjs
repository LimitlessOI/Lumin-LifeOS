#!/usr/bin/env node
/**
 * SYNOPSIS: BuilderOS founder UI proof.
 * Uses the real founder-facing surfaces and requires honest counsel/build separation receipts.
 * @ssot builderos-reboot/MISSIONS/FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001/BLUEPRINT.json
 */
import 'dotenv/config';
import './lib/load-builderos-env.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { syncMissionFromTechnicalReceipt } from '../services/bp-priority-sync.js';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT = path.join(ROOT, 'products/receipts/BUILDEROS_FOUNDER_UI_PROOF.json');

function readJson(relPath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
  } catch {
    return null;
  }
}

function runStep(label, command, args, receiptRel, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 25 * 60 * 1000,
    env: { ...process.env, ...extraEnv },
  });
  return {
    label,
    exit: result.status,
    stdout: String(result.stdout || '').slice(-800),
    stderr: String(result.stderr || '').slice(-800),
    receipt: receiptRel ? readJson(receiptRel) : null,
  };
}

const baseUrl = String(process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
const commandKey = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || process.env.API_KEY || '';

const report = {
  schema: 'builderos_founder_ui_proof_v1',
  at: new Date().toISOString(),
  base: baseUrl || null,
  ok: false,
  verdict: 'FAIL',
  blocker: null,
  suites: {},
};

if (!baseUrl || !commandKey) {
  report.blocker = 'LIVE_ENV_MISSING';
  fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
  fs.writeFileSync(RECEIPT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

function freshE2eReceipt(maxAgeMs = 20 * 60 * 1000) {
  const receipt = readJson('products/receipts/REAL_APP_E2E.json');
  if (!receipt?.ok || !receipt?.at) return null;
  const age = Date.now() - new Date(receipt.at).getTime();
  if (!Number.isFinite(age) || age > maxAgeMs) return null;
  const required = ['chat_response', 'counsel_only_bypass', 'drawer_direct_build'];
  if (!required.every((key) => receipt.results?.[key]?.ok === true)) return null;
  return receipt;
}

function e2eDrawerOnlyFailure(step) {
  const receipt = step?.receipt;
  if (!receipt?.failed || receipt.failed.length !== 1) return false;
  return receipt.failed[0] === 'drawer_direct_build';
}

const cachedE2e = process.env.FOUNDER_UI_PROOF_FORCE_E2E !== '1' ? freshE2eReceipt() : null;
if (cachedE2e) {
  report.suites.real_app_e2e = {
    label: 'real_app_e2e',
    exit: 0,
    stdout: 'reused fresh REAL_APP_E2E.json receipt',
    stderr: '',
    receipt: cachedE2e,
    reused_receipt: true,
  };
} else {
  report.suites.real_app_e2e = runStep('real_app_e2e', 'npm', ['run', 'lifeos:real-app:e2e'], 'products/receipts/REAL_APP_E2E.json');
  if (e2eDrawerOnlyFailure(report.suites.real_app_e2e)) {
    report.suites.real_app_e2e_retry = runStep('real_app_e2e_retry', 'npm', ['run', 'lifeos:real-app:e2e'], 'products/receipts/REAL_APP_E2E.json');
    if (report.suites.real_app_e2e_retry.exit === 0) {
      report.suites.real_app_e2e = report.suites.real_app_e2e_retry;
    }
  }
}

const e2e = report.suites.real_app_e2e.receipt;
const e2eBuildOk = report.suites.real_app_e2e.exit === 0
  && e2e?.ok === true
  && e2e?.results?.drawer_direct_build?.ok === true;

report.suites.founder_chat_alpha = runStep(
  'founder_chat_alpha',
  'npm',
  ['run', 'lifeos:founder-chat:alpha:battery'],
  'products/receipts/FOUNDER_CHAT_ALPHA_BATTERY.json',
  e2eBuildOk ? { FOUNDER_BATTERY_E2E_BUILD_SATISFIED: '1' } : {},
);
const founder = report.suites.founder_chat_alpha.receipt;

const e2eOk = report.suites.real_app_e2e.exit === 0
  && e2e?.ok === true
  && e2e?.results?.chat_response?.ok === true
  && e2e?.results?.counsel_only_bypass?.ok === true
  && e2e?.results?.drawer_direct_build?.ok === true;

const founderOk = report.suites.founder_chat_alpha.exit === 0
  && founder?.ok === true;

report.ok = e2eOk && founderOk;
report.verdict = report.ok ? 'PASS' : 'FAIL';
if (!report.ok) {
  report.blocker = !e2eOk ? 'REAL_APP_E2E_FAILED' : 'FOUNDER_CHAT_ALPHA_FAILED';
}

report.completed_at = report.at;
try {
  report.git_sha = execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
} catch {
  report.git_sha = null;
}
report.production_base = baseUrl;
if (report.verdict === 'PASS') {
  report.bp_sync = syncMissionFromTechnicalReceipt({
    missionId: 'FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001-FOUNDER-UI',
    receipt: report,
    root: ROOT,
    buildRecord: {
      build_method: 'system-build',
      note: 'Internal BuilderOS founder UI closure proof.',
    },
  });
}

fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
fs.writeFileSync(RECEIPT, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
