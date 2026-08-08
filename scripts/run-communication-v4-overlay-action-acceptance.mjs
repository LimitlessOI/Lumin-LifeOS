#!/usr/bin/env node
/**
 * SYNOPSIS: Communication System V4 (Overlay Action) acceptance.
 * PASS = services/overlay-action-service.js exists and matches the proven
 * prototype's (scripts/prototype-overlay-action-v4.mjs, 10/10 tests) exact
 * parsing/approval behavior -- a risky action must never be approved without
 * explicit stop/confirmation language.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'PRODUCT-COMMUNICATION-V4-OVERLAY-ACTION-0001';
const SERVICE = path.join(ROOT, 'services/overlay-action-service.js');
const RECEIPT_DIR = path.join(ROOT, 'products/receipts');
const RECEIPT = path.join(RECEIPT_DIR, 'COMMUNICATION_V4_OVERLAY_ACTION_ACCEPTANCE.json');
const RECEIPT_REL = 'products/receipts/COMMUNICATION_V4_OVERLAY_ACTION_ACCEPTANCE.json';
const VERDICT = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'OBJECTIVE_VERDICT.json');

const report = {
  schema: 'communication_v4_overlay_action_acceptance_v1',
  mission_id: MISSION,
  started_at: new Date().toISOString(),
  tests_passed: [],
  tests_failed: [],
  steps: [],
};

function step(name, ok, detail) {
  report.steps.push({ step: name, ok, detail, at: new Date().toISOString() });
  (ok ? report.tests_passed : report.tests_failed).push(name);
}

function finish() {
  const { pass } = finishBpAcceptance({
    root: ROOT,
    missionId: MISSION,
    report,
    receiptAbsPath: RECEIPT,
    receiptRelPath: RECEIPT_REL,
    verdictAbsPath: VERDICT,
    objectiveName: 'Communication System V4 — Overlay Action',
    objectiveVerdictOnPass: 'OBJECTIVE_COMPLETE',
    buildRecord: {
      build_method: 'system-build',
      note: 'Reuses the proven 10/10-test parseCommand/approvePlan/executePlan logic from scripts/prototype-overlay-action-v4.mjs. Browser session management deliberately out of scope -- executePlan takes an already-connected page.',
    },
    verdictExtra: {
      acceptance_command: 'npm run lifeos:communication-v4-overlay-action:acceptance',
    },
    passPredicate: (r) => r.tests_failed.length === 0 && r.tests_passed.length > 0,
  });
  console.log(JSON.stringify(report, null, 2));
  process.exit(pass ? 0 : 1);
}

async function main() {
  if (!fs.existsSync(SERVICE)) {
    step('service_file_exists', false, 'services/overlay-action-service.js does not exist yet');
    return finish();
  }
  step('service_file_exists', true, null);

  let mod;
  try {
    mod = await import(`${SERVICE}?t=${Date.now()}`);
  } catch (err) {
    step('service_imports_cleanly', false, `import failed: ${err?.message || err}`);
    return finish();
  }
  step('service_imports_cleanly', true, null);

  const { parseCommand, approvePlan, executePlan } = mod;
  const hasFns = typeof parseCommand === 'function' && typeof approvePlan === 'function' && typeof executePlan === 'function';
  step('exports_core_functions', hasFns, hasFns ? null : 'parseCommand/approvePlan/executePlan not all exported as functions');
  if (!hasFns) return finish();

  try {
    const plan = parseCommand('Fill the full name with Alice Smith and the email with alice@example.com and stop before submitting');
    const pass = plan.steps.some((s) => s.action === 'fill' && s.field === 'full name' && s.value === 'Alice Smith')
      && plan.steps.some((s) => s.action === 'fill' && s.field === 'email' && s.value === 'alice@example.com')
      && plan.steps.some((s) => s.action === 'stop');
    step('parseCommand_fill_and_stop', pass, pass ? null : JSON.stringify(plan));
  } catch (err) {
    step('parseCommand_fill_and_stop', false, String(err?.message || err));
  }

  try {
    const risky = parseCommand('Click the submit button');
    const app = approvePlan(risky);
    const pass = app.approved === false && app.hasRisk === true;
    step('approvePlan_blocks_unconfirmed_submit', pass, pass ? null : JSON.stringify(app));
  } catch (err) {
    step('approvePlan_blocks_unconfirmed_submit', false, String(err?.message || err));
  }

  try {
    const safe = parseCommand('Click the settings button');
    const app = approvePlan(safe);
    const pass = app.approved === true && app.hasRisk === false;
    step('approvePlan_allows_non_risky_click', pass, pass ? null : JSON.stringify(app));
  } catch (err) {
    step('approvePlan_allows_non_risky_click', false, String(err?.message || err));
  }

  finish();
}

main().catch((err) => {
  step('uncaught_error', false, String(err?.message || err));
  finish();
});
