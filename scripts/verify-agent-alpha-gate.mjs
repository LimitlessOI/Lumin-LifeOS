#!/usr/bin/env node
/**
 * SYNOPSIS: HARD gate — founder alpha blocked until agent_alpha_pass receipt exists.
 * @ssot docs/projects/AMENDMENT_LIFERE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION_ID = process.env.AGENT_ALPHA_MISSION_ID || 'PRODUCT-LIFERE-OS-V1-0001';
const receiptPath = path.join(ROOT, 'products/receipts/LIFERE_AGENT_ALPHA.json');
const verdictPath = path.join(ROOT, `builderos-reboot/MISSIONS/${MISSION_ID}/OBJECTIVE_VERDICT.json`);

const report = { schema: 'verify_agent_alpha_gate_v1', ok: false, mission_id: MISSION_ID, checks: [] };

function check(id, ok, detail = '') {
  report.checks.push({ id, ok, detail });
  if (!ok) report[`fail_${id}`] = detail;
}

if (!fs.existsSync(receiptPath)) {
  check('receipt_exists', false, 'Run npm run lifeos:lifere-agent-alpha first');
} else {
  const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
  check('receipt_ok', receipt.ok === true && receipt.agent_alpha_pass === true, JSON.stringify(receipt.failed || []).slice(0, 200));
  check('receipt_schema', receipt.schema === 'lifere_agent_alpha_v1');
}

if (fs.existsSync(verdictPath)) {
  const verdict = JSON.parse(fs.readFileSync(verdictPath, 'utf8'));
  check('verdict_agent_alpha', verdict.agent_alpha_pass === true, `agent_alpha_pass=${verdict.agent_alpha_pass}`);
} else {
  check('verdict_exists', false, verdictPath);
}

report.ok = report.checks.every((c) => c.ok);
console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
