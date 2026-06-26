#!/usr/bin/env node
/**
 * SYNOPSIS: Founder gate — is BuilderOS ready for blueprint intake (greenfield/backfill/adjust)?
 * Usage: npm run builderos:intake:ready
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */

import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runIntakeRegressionHarness, writeIntakeRegressionReceipt } from '../services/builderos-intake-regression-harness.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT_PATH = path.join(ROOT, 'data/builderos-intake-ready-last-run.json');

function check(id, ok, detail) {
  return { id, ok: Boolean(ok), detail: detail || (ok ? 'PASS' : 'FAIL') };
}

function resolveBaseUrl() {
  return (process.env.PUBLIC_BASE_URL || process.env.API_BASE_URL || '').replace(/\/$/, '');
}

function resolveCommandKey() {
  return process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || '';
}

async function fetchJson(url, commandKey) {
  const res = await fetch(url, {
    headers: commandKey ? { 'x-command-key': commandKey } : {},
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 400) };
  }
  return { ok: res.ok, status: res.status, json };
}

async function main() {
  const checks = [];
  const baseUrl = resolveBaseUrl();
  const commandKey = resolveCommandKey();

  checks.push(check('IGR-01', baseUrl, baseUrl ? `base=${baseUrl}` : 'PUBLIC_BASE_URL missing'));
  checks.push(check('IGR-02', commandKey, commandKey ? 'COMMAND_CENTER_KEY present' : 'COMMAND_CENTER_KEY missing'));

  if (baseUrl && commandKey) {
    const ready = await fetchJson(`${baseUrl}/api/v1/lifeos/builder/ready`, commandKey);
    const builder = ready.json?.builder || {};
    checks.push(check('IGR-03', ready.ok, ready.ok ? 'GET /builder/ready OK' : `ready HTTP ${ready.status}`));
    checks.push(check('IGR-04', builder.commitToGitHub === true, 'commitToGitHub available'));
    checks.push(check('IGR-05', builder.callCouncilMember === true, 'callCouncilMember available'));
    checks.push(check('IGR-06', builder.pool === true, 'pool available'));

    const deploy = spawnSync('npm', ['run', 'builderos:deploy:verify'], {
      cwd: ROOT,
      encoding: 'utf8',
      env: process.env,
    });
    checks.push(
      check('IGR-07', deploy.status === 0, deploy.status === 0 ? 'deploy SHA fresh' : 'deploy stale — run npm run system:railway:redeploy'),
    );

    const intakeList = await fetchJson(`${baseUrl}/api/v1/blueprint/intake`, commandKey);
    checks.push(
      check('IGR-08', intakeList.ok, intakeList.ok ? 'GET /blueprint/intake OK' : `intake API HTTP ${intakeList.status}`),
    );

    const backfillHint = await fetch(`${baseUrl}/api/v1/blueprint/intake/backfill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(commandKey ? { 'x-command-key': commandKey } : {}),
      },
      body: JSON.stringify({
        product_name: 'IntakeGateProbe',
        amendment_file: 'docs/projects/AMENDMENT_41_MARKETINGOS.md',
      }),
    });
    const backfillJson = await backfillHint.json().catch(() => ({}));
    const hintOk = backfillHint.status === 400 && backfillJson.error === 'amendment_text_required';
    checks.push(
      check(
        'IGR-11',
        hintOk,
        hintOk
          ? 'backfill without amendment_text returns actionable 400'
          : `backfill hint probe HTTP ${backfillHint.status} error=${backfillJson.error || 'unknown'}`,
      ),
    );

    const golden = await runIntakeRegressionHarness({
      mode: 'acceptance_only',
      baseUrl,
      commandKey,
    });
    writeIntakeRegressionReceipt(golden);
    checks.push(
      check('IGR-09', golden.ok === true, golden.ok ? 'golden intake acceptance PASS' : 'golden intake acceptance FAIL'),
    );
  } else {
    checks.push(check('IGR-03', false, 'skipped — missing env'));
  }

  const pbg = spawnSync('npm', ['run', 'builderos:pre-build-gate'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env,
  });
  checks.push(check('IGR-10', pbg.status === 0, pbg.status === 0 ? 'pre-build gate PASS (incl PBG-07)' : 'pre-build gate FAIL'));

  const allOk = checks.every((c) => c.ok);
  const report = {
    schema: 'builderos_intake_ready_gate_v1',
    generated_at: new Date().toISOString(),
    ready_for_founder_intake: allOk,
    ok: allOk,
    checks,
    founder_next: allOk
      ? {
          greenfield: 'POST /api/v1/blueprint/intake/greenfield { product_name, message }',
          backfill_cli: 'node scripts/run-blueprint-intake.mjs --amendment docs/projects/AMENDMENT_XX.md',
          backfill_api: 'POST /api/v1/blueprint/intake/backfill { product_name, amendment_file, amendment_text } — amendment_text required on Railway (docs/ not in image)',
          adjust: 'POST /api/v1/blueprint/intake/adjust { amendment_file, adjustment } — needs prior backfill session blueprint in DB',
          after_arc_ready: 'POST /api/v1/blueprint/intake/:id/execute',
          cli_execute: 'npm run blueprint:intake:execute -- --session <uuid>',
          verify_gate: 'npm run builderos:intake:ready',
        }
      : null,
  };

  fs.mkdirSync(path.dirname(RECEIPT_PATH), { recursive: true });
  fs.writeFileSync(RECEIPT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify(report, null, 2));

  if (!allOk) {
    console.error('\n--- NOT READY FOR INTAKE ---');
    checks.filter((c) => !c.ok).forEach((c) => console.error(`FAIL ${c.id}: ${c.detail}`));
    process.exit(1);
  }

  console.log('\n✅ BuilderOS is ready for founder intake.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
