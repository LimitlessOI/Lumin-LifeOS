/**
 * SYNOPSIS: Acceptance script for FACTORY-COGNITIVE-ARCHITECTURE-0001.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION_ID = 'FACTORY-COGNITIVE-ARCHITECTURE-0001';
const RECEIPT_REL = 'products/receipts/COGNITIVE_ARCHITECTURE_V1_ACCEPTANCE.json';
const VERDICT_REL = `builderos-reboot/MISSIONS/${MISSION_ID}/OBJECTIVE_VERDICT.json`;

function runTests() {
  try {
    const out = execSync('node --test tests/cognitive-chair.test.mjs', {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { ok: true, output: out };
  } catch (err) {
    return { ok: false, output: err.stdout || '', stderr: err.stderr || '', code: err.status };
  }
}

function main() {
  const testResult = runTests();
  const now = new Date().toISOString();

  const report = {
    schema: 'cognitive_architecture_v1_acceptance',
    mission_id: MISSION_ID,
    at: now,
    mode: 'full_suite',
    ok: testResult.ok,
    tests_passed: testResult.ok ? ['cognitive-chair-suite'] : [],
    tests_failed: testResult.ok ? [] : ['cognitive-chair-suite'],
    test_output: testResult.output?.slice(-2000) || '',
    test_stderr: testResult.stderr?.slice(-2000) || '',
    exit_code: testResult.code ?? 0,
    completed_at: now,
    production_base: 'https://lumin-web-production-e3a9.up.railway.app',
    founder_usability_pass: false,
    dry_run_only: true,
    live_model_execution: false,
    produced_by: 'Devin builder (FACTORY-COGNITIVE-ARCHITECTURE-0001 GAP-FILL)',
    separation_collapsed: true,
    separation_note: 'First vertical-slice acceptance for the cognitive architecture was produced and verified within the same BuilderOS session. No independent SENTRY verifier existed for this initial GAP-FILL; future vertical slices will be verified by an independent SENTRY reality station.',
  };

  const { pass } = finishBpAcceptance({
    root: ROOT,
    missionId: MISSION_ID,
    report,
    receiptAbsPath: path.join(ROOT, RECEIPT_REL),
    receiptRelPath: RECEIPT_REL,
    verdictAbsPath: path.join(ROOT, VERDICT_REL),
    objectiveName: 'Cognitive Asset Architecture V1',
    objectiveVerdictOnPass: 'TECHNICAL_PASS',
    base: report.production_base,
    buildRecord: {
      build_method: 'GAP-FILL',
      note: 'First vertical slice of the five-layer cognitive reasoning stack. Live model execution wired but dry-run by default.',
    },
    verdictExtra: {
      dry_run_only: true,
      live_model_execution: false,
      next_phase: 'Phase 2: expand cognitive-asset library and Wisdom trust-score updates.',
    },
  });

  console.log(JSON.stringify(report, null, 2));
  process.exit(pass ? 0 : 1);
}

main();
