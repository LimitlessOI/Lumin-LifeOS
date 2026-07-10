#!/usr/bin/env node
/**
 * SYNOPSIS: Canonical UI alpha gate — real UI probes + live founder-alpha audit rolled into one receipt.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT_PATH = path.join(ROOT, 'products/receipts/UI_ALPHA_GATE.json');

const steps = [
  ['real_app_e2e', 'npm', ['run', 'lifeos:real-app:e2e'], 'products/receipts/REAL_APP_E2E.json', 6 * 60 * 1000],
  ['founder_chat_alpha', 'npm', ['run', 'lifeos:founder-chat:alpha:battery'], 'products/receipts/FOUNDER_CHAT_ALPHA_BATTERY.json', 6 * 60 * 1000],
  ['overlay_alpha_battery_live', 'npm', ['run', 'lifeos:overlay:alpha:battery:live'], 'products/receipts/OVERLAY_ALPHA_BATTERY.json', 4 * 60 * 1000],
  ['founder_alpha_audit', 'npm', ['run', 'lifeos:founder-alpha:audit'], 'products/receipts/FOUNDER_ALPHA_READINESS_AUDIT.json', 6 * 60 * 1000],
];

function readJson(relPath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
  } catch {
    return null;
  }
}

function receiptOk(receipt) {
  if (!receipt) return false;
  return receipt.ok === true
    || receipt.verdict === 'CLEARED_FOR_FOUNDER_ALPHA'
    || receipt.verdict === 'ALPHA_GATE_CLOSED';
}

function receiptFresh(relPath, maxAgeMs = 30 * 60 * 1000) {
  try {
    const stat = fs.statSync(path.join(ROOT, relPath));
    return (Date.now() - stat.mtimeMs) <= maxAgeMs;
  } catch {
    return false;
  }
}

const report = {
  schema: 'ui_alpha_gate_v1',
  at: new Date().toISOString(),
  ok: true,
  passed: [],
  failed: [],
  suites: {},
  receipts: {},
};

for (const [id, cmd, args, receiptRel, timeout] of steps) {
  console.log(`▶ ${id}`);
  const preReceipt = readJson(receiptRel);
  if (receiptOk(preReceipt) && receiptFresh(receiptRel)) {
    report.passed.push(id);
    report.suites[id] = {
      ok: true,
      exit: 0,
      receipt: receiptRel,
      signal: null,
      timed_out: false,
      retried: false,
      reused_fresh_receipt: true,
    };
    report.receipts[id] = {
      ok: true,
      schema: preReceipt.schema || null,
      verdict: preReceipt.verdict || null,
    };
    continue;
  }

  let run = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
    timeout,
  });
  let retried = false;
  if (run.status !== 0 && id === 'founder_alpha_audit') {
    retried = true;
    await new Promise((resolve) => setTimeout(resolve, 5000));
    run = spawnSync(cmd, args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: 'pipe',
      timeout,
    });
  }
  const ok = run.status === 0;
  const receipt = readJson(receiptRel);
  report.suites[id] = {
    ok,
    exit: run.status,
    receipt: receiptRel,
    signal: run.signal || null,
    timed_out: Boolean(run.error && run.error.code === 'ETIMEDOUT'),
    retried,
    reused_fresh_receipt: false,
  };
  report.receipts[id] = receipt ? {
    ok: receiptOk(receipt),
    schema: receipt.schema || null,
    verdict: receipt.verdict || null,
  } : null;
  if (ok) {
    report.passed.push(id);
  } else {
    report.ok = false;
    report.failed.push(id);
    report[`fail_${id}`] = run.error?.code === 'ETIMEDOUT'
      ? `${id} timed out after ${timeout}ms`
      : (run.stderr || run.stdout || '').slice(-500);
  }
}

const founderAudit = readJson('products/receipts/FOUNDER_ALPHA_READINESS_AUDIT.json');
report.ready_for_founder_alpha = founderAudit?.ready_for_adam_alpha === true;
report.founder_usability_pass = founderAudit?.founder_usability_pass === true;
report.technical_pass_only = report.ok && report.founder_usability_pass !== true;
report.founder_usability_contract = 'docs/products/lifere/FOUNDER_USABILITY_CONTRACT.md';
report.verdict = report.ok
  ? (report.founder_usability_pass ? 'ALPHA_GATE_CLOSED' : 'CLEARED_FOR_FOUNDER_ALPHA')
  : 'FAIL';

fs.mkdirSync(path.dirname(RECEIPT_PATH), { recursive: true });
fs.writeFileSync(RECEIPT_PATH, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
