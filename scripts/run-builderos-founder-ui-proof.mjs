#!/usr/bin/env node
/**
 * SYNOPSIS: BuilderOS founder UI proof.
 * Uses the real founder-facing surfaces and requires honest counsel/build separation receipts.
 * @ssot builderos-reboot/MISSIONS/FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001/BLUEPRINT.json
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT = path.join(ROOT, 'products/receipts/BUILDEROS_FOUNDER_UI_PROOF.json');

function readJson(relPath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
  } catch {
    return null;
  }
}

function runStep(label, command, args, receiptRel) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 8 * 60 * 1000,
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

report.suites.real_app_e2e = runStep('real_app_e2e', 'npm', ['run', 'lifeos:real-app:e2e'], 'products/receipts/REAL_APP_E2E.json');
report.suites.founder_chat_alpha = runStep('founder_chat_alpha', 'npm', ['run', 'lifeos:founder-chat:alpha:battery'], 'products/receipts/FOUNDER_CHAT_ALPHA_BATTERY.json');

const e2e = report.suites.real_app_e2e.receipt;
const founder = report.suites.founder_chat_alpha.receipt;

const e2eOk = report.suites.real_app_e2e.exit === 0
  && e2e?.ok === true
  && e2e?.results?.chat_response?.ok === true
  && e2e?.results?.counsel_only_bypass?.ok === true
  && e2e?.results?.drawer_direct_build?.ok === true;

const founderOk = report.suites.founder_chat_alpha.exit === 0
  && founder?.ok === true
  && founder?.results?.Q1_counsel_no_clarify?.truth === 'NO_COMMAND_RAN'
  && founder?.results?.B1_do_build?.final_pass_fail === 'PASS'
  && founder?.results?.B2_nl_ui_rounded?.final_pass_fail === 'PASS'
  && founder?.results?.B3_nl_css_yellow?.final_pass_fail === 'PASS';

report.ok = e2eOk && founderOk;
report.verdict = report.ok ? 'PASS' : 'FAIL';
if (!report.ok) {
  report.blocker = !e2eOk ? 'REAL_APP_E2E_FAILED' : 'FOUNDER_CHAT_ALPHA_FAILED';
}

fs.mkdirSync(path.dirname(RECEIPT), { recursive: true });
fs.writeFileSync(RECEIPT, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
