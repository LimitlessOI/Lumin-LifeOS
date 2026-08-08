#!/usr/bin/env node
/**
 * SYNOPSIS: Communication System V5 (Cross-Domain Personal Intelligence) acceptance.
 * PASS = services/cross-domain-intelligence-service.js exists and matches the
 * proven prototype's (scripts/prototype-cross-domain-v5.mjs, 12/12 tests)
 * exact consent/inference behavior -- a sensitive domain must never appear in
 * an answer without explicit prior consent.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'PRODUCT-COMMUNICATION-V5-CROSS-DOMAIN-0001';
const SERVICE = path.join(ROOT, 'services/cross-domain-intelligence-service.js');
const RECEIPT_DIR = path.join(ROOT, 'products/receipts');
const RECEIPT = path.join(RECEIPT_DIR, 'COMMUNICATION_V5_CROSS_DOMAIN_ACCEPTANCE.json');
const RECEIPT_REL = 'products/receipts/COMMUNICATION_V5_CROSS_DOMAIN_ACCEPTANCE.json';
const VERDICT = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'OBJECTIVE_VERDICT.json');

const report = {
  schema: 'communication_v5_cross_domain_acceptance_v1',
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
    objectiveName: 'Communication System V5 — Cross-Domain Personal Intelligence',
    objectiveVerdictOnPass: 'OBJECTIVE_COMPLETE',
    buildRecord: {
      build_method: 'system-build',
      note: 'Reuses the proven 12/12-test Domain/PersonalIntelligence consent+inference logic from scripts/prototype-cross-domain-v5.mjs. Real data-source integration deliberately out of scope.',
    },
    verdictExtra: {
      acceptance_command: 'npm run lifeos:communication-v5-cross-domain:acceptance',
    },
    passPredicate: (r) => r.tests_failed.length === 0 && r.tests_passed.length > 0,
  });
  console.log(JSON.stringify(report, null, 2));
  process.exit(pass ? 0 : 1);
}

async function main() {
  if (!fs.existsSync(SERVICE)) {
    step('service_file_exists', false, 'services/cross-domain-intelligence-service.js does not exist yet');
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

  const { Domain, PersonalIntelligence } = mod;
  const hasClasses = typeof Domain === 'function' && typeof PersonalIntelligence === 'function';
  step('exports_Domain_and_PersonalIntelligence', hasClasses, hasClasses ? null : 'Domain or PersonalIntelligence not exported');
  if (!hasClasses) return finish();

  try {
    const pi = new PersonalIntelligence('user-1');
    const calendar = pi.addDomain(new Domain('calendar', 'Calendar'));
    calendar.addRecord({ title: 'Sprint review', time: '3pm', date: '2026-08-07' });
    const finance = pi.addDomain(new Domain('finance', 'Finance'));
    finance.addRecord({ type: 'account', balance: 4200 });

    const q1 = pi.queryCrossDomain('Am I free at 3pm?');
    const q1pass = q1.answer.free === false || q1.answer.events.length === 1;
    step('calendar_query_works', q1pass, q1pass ? null : JSON.stringify(q1));

    const q2 = pi.queryCrossDomain('Can I afford a $500 expense?');
    const q2pass = q2.blocked.some((b) => b.domain === 'finance');
    step('finance_blocked_without_consent', q2pass, q2pass ? null : JSON.stringify(q2));

    pi.requestShare('finance', 'assistant', ['balance'], 'answer affordability question');
    const q3 = pi.queryCrossDomain('Can I afford a $500 expense?');
    const q3pass = Boolean(q3.answer && q3.answer.assessment);
    step('finance_accessible_after_consent', q3pass, q3pass ? null : JSON.stringify(q3));

    const health = pi.addDomain(new Domain('health', 'Health'));
    const q4 = pi.queryCrossDomain('How is my energy?');
    const q4pass = q4.blocked.some((b) => b.domain === 'health');
    step('health_blocked_without_consent', q4pass, q4pass ? null : JSON.stringify(q4));
    void health;
  } catch (err) {
    step('cross_domain_scenario', false, String(err?.message || err));
  }

  finish();
}

main().catch((err) => {
  step('uncaught_error', false, String(err?.message || err));
  finish();
});
