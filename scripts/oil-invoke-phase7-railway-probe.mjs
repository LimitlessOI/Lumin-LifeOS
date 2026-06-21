#!/usr/bin/env node
/**
 * SYNOPSIS: Invoke Phase 7 live Gemini probe on Railway (runtime secrets).
 * Invoke Phase 7 live Gemini probe on Railway (runtime secrets).
 * Updates phase7-audit-before-done-receipt.json from API response — never prints keys.
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const RECEIPT_PATH = path.join(ROOT, 'data/builder/receipts/phase7-audit-before-done-receipt.json');

async function main() {
  const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const key = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || process.env.API_KEY;
  if (!base || !key) {
    console.error('HALT: PUBLIC_BASE_URL and COMMAND_CENTER_KEY required');
    process.exit(1);
  }

  const url = `${base}/api/v1/builder/oil-probe/phase7-gemini-live`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-command-key': key,
    },
    body: '{}',
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.ok) {
    console.error(JSON.stringify({ ok: false, httpStatus: res.status, body }, null, 2));
    process.exit(1);
  }

  const existing = JSON.parse(fs.readFileSync(RECEIPT_PATH, 'utf8'));
  fs.writeFileSync(RECEIPT_PATH, JSON.stringify({
    ...existing,
    status: 'VERIFIED',
    live_gemini_verified_at: new Date().toISOString(),
    live_gemini_proof_runtime: 'railway',
    live_gemini_probe_endpoint: '/api/v1/builder/oil-probe/phase7-gemini-live',
    live_gemini_invoke_script: 'scripts/oil-invoke-phase7-railway-probe.mjs',
    live_gemini_audit_receipt_id: body.audit_receipt_id,
    live_gemini_fail_receipt_id: body.fail_audit_receipt_id,
    live_gemini_task_receipt_id: body.task_receipt_id,
    live_gemini_checks: body.checks,
    known_gap: null,
    live_gemini_proof: null,
    files: [
      ...(existing.files || []),
      'services/builder-oil-phase7-probe.js',
      'routes/builder-oil-audit-probe-routes.js',
      'scripts/oil-invoke-phase7-railway-probe.mjs',
    ],
  }, null, 2));

  console.log(JSON.stringify({
    ok: true,
    phase: 7,
    status: 'VERIFIED',
    railway_proof: true,
    audit_receipt_id: body.audit_receipt_id,
    fail_audit_receipt_id: body.fail_audit_receipt_id,
    checks: body.checks?.map(c => c.name),
  }, null, 2));
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
