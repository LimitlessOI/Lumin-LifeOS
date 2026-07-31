/**
 * SYNOPSIS: FACTORY-MASTER-A-TO-Z-0001 acceptance smoke test.
 * Re-runs every blueprint step's OWN verify_command for real before considering
 * it done -- a step's status field is never trusted alone. Never self-declares
 * the final 10/10 rating: MMAZ-020 is final ratification, which Standing Order
 * #7 (this mission's own blueprint) reserves for the founder. This script can
 * only reach READY_FOR_FOUNDER_RATIFICATION; rating_current stays capped below
 * 10 until a real FOUNDER_RATIFIED_MASTER_A_TO_Z.json artifact exists.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION_ID = 'FACTORY-MASTER-A-TO-Z-0001';
const RECEIPT_REL = 'products/receipts/MASTER_A_TO_Z_ACCEPTANCE.json';
const VERDICT_REL = `builderos-reboot/MISSIONS/${MISSION_ID}/OBJECTIVE_VERDICT.json`;
const BLUEPRINT_REL = `builderos-reboot/MISSIONS/${MISSION_ID}/BLUEPRINT.json`;
const FOUNDER_RATIFICATION_REL = `builderos-reboot/MISSIONS/${MISSION_ID}/FOUNDER_RATIFIED.json`;

function loadBlueprint() {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, BLUEPRINT_REL), 'utf8'));
  } catch {
    return null;
  }
}

/** Actually execute a step's verify_command. Never assume; never echo it back unrun. */
function runVerify(cmd) {
  if (!cmd || typeof cmd !== 'string') return { ok: false, output: 'missing verify_command' };
  try {
    const output = execSync(cmd, { cwd: ROOT, encoding: 'utf8', timeout: 120_000, stdio: ['ignore', 'pipe', 'pipe'] });
    return { ok: true, output: String(output).slice(-2000) };
  } catch (err) {
    return { ok: false, output: String(err?.stdout || err?.message || err).slice(-2000) };
  }
}

/**
 * Re-verify every step for real, right now -- a step's stored `status: 'done'`
 * is a claim, not proof (proven unreliable repeatedly across this codebase
 * tonight). Steps without their own verify_command cannot be counted as
 * re-verified; that is itself reported, not silently passed.
 */
function reVerifyAllSteps(blueprint) {
  const steps = blueprint?.steps || [];
  const results = steps.map((s) => {
    if (!s.verify_command) {
      return { id: s.id, ok: false, reason: 'no_verify_command', output: '' };
    }
    const { ok, output } = runVerify(s.verify_command);
    return { id: s.id, ok, reason: ok ? null : 'verify_command_failed', output };
  });
  return {
    results,
    allPass: results.length > 0 && results.every((r) => r.ok),
    passCount: results.filter((r) => r.ok).length,
    total: results.length,
  };
}

function isFounderRatified() {
  const p = path.join(ROOT, FOUNDER_RATIFICATION_REL);
  if (!fs.existsSync(p)) return false;
  try {
    const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
    return doc?.founder_ratified === true && typeof doc?.ratified_at === 'string';
  } catch {
    return false;
  }
}

const blueprint = loadBlueprint();
const reverify = blueprint ? reVerifyAllSteps(blueprint) : { allPass: false, passCount: 0, total: 0, results: [] };
const founderRatified = isFounderRatified();

const now = new Date().toISOString();
const report = {
  tests_passed: reverify.results.filter((r) => r.ok).map((r) => r.id),
  tests_failed: reverify.results.filter((r) => !r.ok).map((r) => r.id),
  test_output: JSON.stringify(reverify.results.filter((r) => !r.ok)).slice(-2000),
  completed_at: now,
  production_base: 'https://lumin-web-production-e3a9.up.railway.app',
  mission_progress: reverify.allPass ? 'all_steps_reverified' : 'in_progress',
  steps_done: reverify.passCount,
  steps_total: reverify.total,
  founder_usability_pass: founderRatified,
};

if (!blueprint) {
  report.tests_failed.push('blueprint_load');
}

if (reverify.allPass) {
  // Real re-verification passed. This is READY_FOR_FOUNDER_RATIFICATION, not
  // an autonomous 10/10 -- MMAZ-020 is final ratification, reserved for the
  // founder by this mission's own Standing Order #7. rating_current is
  // deliberately capped below the target until FOUNDER_RATIFIED.json exists.
  const { pass } = finishBpAcceptance({
    root: ROOT,
    missionId: MISSION_ID,
    report,
    receiptAbsPath: path.join(ROOT, RECEIPT_REL),
    receiptRelPath: RECEIPT_REL,
    verdictAbsPath: path.join(ROOT, VERDICT_REL),
    objectiveName: 'Point A to Point Z — BuilderOS + LifeOS Cognitive Spine',
    objectiveVerdictOnPass: founderRatified ? 'TECHNICAL_PASS' : 'READY_FOR_FOUNDER_RATIFICATION',
    base: report.production_base,
    buildRecord: { build_method: 'system-build' },
    passPredicate: () => report.tests_failed.length === 0,
    verdictExtra: {
      rating_current: founderRatified ? 10 : 9,
      rating_target: 10,
      ratings: null,
      verdict_note: founderRatified
        ? 'All blueprint steps independently re-verified in this run (not trusted from stored status) and the founder has explicitly ratified completion via FOUNDER_RATIFIED.json.'
        : `All ${reverify.total} blueprint steps independently re-verified in this run by actually executing each step's own verify_command. rating_current is capped at 9 (not 10) because MMAZ-020 (final 10/10 ratification) requires explicit founder sign-off per this mission's own Standing Order #7 -- create ${FOUNDER_RATIFICATION_REL} with {"founder_ratified": true, "ratified_at": "<iso>"} to unlock 10.`,
      verify_command: 'node scripts/master-a-to-z-acceptance.mjs',
    },
  });
  console.log(JSON.stringify({ ok: true, finalized: pass, founder_ratified: founderRatified, acceptance: founderRatified ? 'FACTORY-MASTER-A-TO-Z-0001 mission complete' : 'FACTORY-MASTER-A-TO-Z-0001 ready for founder ratification' }));
  process.exit(pass ? 0 : 1);
}

console.log(JSON.stringify({ ok: true, finalized: false, acceptance: 'FACTORY-MASTER-A-TO-Z-0001 in progress', report }));
process.exit(0);
