/**
 * SYNOPSIS: Final acceptance script for FACTORY-PATH-TO-TEN-0001.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION_ID = 'FACTORY-PATH-TO-TEN-0001';
const RECEIPT_REL = 'products/receipts/PATH_TO_TEN_FINAL_ACCEPTANCE.json';
const VERDICT_REL = `builderos-reboot/MISSIONS/${MISSION_ID}/OBJECTIVE_VERDICT.json`;

function runShell(label, command) {
  try {
    const out = execSync(command, { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return { ok: true, label, output: out.slice(-2000) };
  } catch (err) {
    return { ok: false, label, output: (err.stdout || '').slice(-2000), stderr: (err.stderr || '').slice(-2000), code: err.status };
  }
}

function main() {
  const checks = [
    { label: 'builder:preflight', command: 'npm run builder:preflight' },
    { label: 'lifeos:bp-priority:verify', command: 'npm run lifeos:bp-priority:verify' },
    { label: 'ssot-baseline', command: 'node scripts/verify-ssot-baseline.mjs' },
    { label: 'false-done-audit', command: 'node scripts/audit-false-done-steps.mjs --ci' },
    { label: 'never-stop-gate', command: 'node --test tests/never-stop-gate.test.js' },
    { label: 'receipt-auditor', command: 'node --test tests/receipt-auditor.test.js' },
    { label: 'sentry-reality-station', command: 'node --test tests/sentry-reality-station.test.js' },
    { label: 'cognitive-chair', command: 'node --test tests/cognitive-chair.test.mjs' },
    { label: 'model-roi-ledger', command: 'node --test tests/model-roi-ledger.test.js' },
    { label: 'wisdom-reality-update', command: 'node --test tests/wisdom-reality-update.test.js' },
    { label: 'smos-first-revenue-receipt', command: 'node scripts/verify-smos-first-revenue-receipt.mjs' },
    { label: 'path-to-ten-demo', command: 'node scripts/path-to-ten-end-to-end-demo.mjs' },
  ];

  const results = checks.map((c) => ({ ...runShell(c.label, c.command), command: c.command }));
  const passed = results.filter((r) => r.ok).map((r) => r.label);
  const failed = results.filter((r) => !r.ok).map((r) => r.label);

  const allOk = failed.length === 0;

  const now = new Date().toISOString();
  const report = {
    schema: 'path_to_ten_final_acceptance_v4',
    mission_id: MISSION_ID,
    at: now,
    mode: 'full_suite',
    ok: allOk,
    tests_passed: passed,
    tests_failed: failed,
    results,
    completed_at: now,
    production_base: 'https://lumin-web-production-e3a9.up.railway.app',
    founder_usability_pass: false,
    produced_by: 'Devin builder (FACTORY-PATH-TO-TEN-0001)',
    separation_collapsed: true,
    separation_note: 'Final acceptance runs the full gate suite. SENTRY and Receipt Auditor must independently verify high-stakes receipts in later iterations.',
  };

  const { pass } = finishBpAcceptance({
    root: ROOT,
    missionId: MISSION_ID,
    report,
    receiptAbsPath: path.join(ROOT, RECEIPT_REL),
    receiptRelPath: RECEIPT_REL,
    verdictAbsPath: path.join(ROOT, VERDICT_REL),
    objectiveName: 'BuilderOS Path to 10 — self-correcting, revenue-proving manufacturing system',
    objectiveVerdictOnPass: 'TEN_POINT_ZERO_RATIFIED',
    base: report.production_base,
    buildRecord: { build_method: 'system-build', note: 'Final PATH-TO-TEN acceptance gates.' },
    verdictExtra: { rating_current: allOk ? 10 : 5, rating_target: 10 },
  });

  console.log(JSON.stringify(report, null, 2));
  process.exit(pass ? 0 : 1);
}

main();
