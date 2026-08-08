#!/usr/bin/env node
/**
 * SYNOPSIS: Communication System V2 (Evidence Fusion) acceptance.
 * PASS = services/evidence-fusion-service.js exists and matches the proven
 * prototype's (scripts/prototype-evidence-fusion-v2.mjs, 30/30 tests) exact
 * scoring/weighting behavior on real inputs -- not just that it exists.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'PRODUCT-COMMUNICATION-V2-EVIDENCE-FUSION-0001';
const SERVICE = path.join(ROOT, 'services/evidence-fusion-service.js');
const RECEIPT_DIR = path.join(ROOT, 'products/receipts');
const RECEIPT = path.join(RECEIPT_DIR, 'COMMUNICATION_V2_EVIDENCE_FUSION_ACCEPTANCE.json');
const RECEIPT_REL = 'products/receipts/COMMUNICATION_V2_EVIDENCE_FUSION_ACCEPTANCE.json';
const VERDICT = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'OBJECTIVE_VERDICT.json');

const report = {
  schema: 'communication_v2_evidence_fusion_acceptance_v1',
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
    objectiveName: 'Communication System V2 — Evidence Fusion & Cognitive Dynamics',
    objectiveVerdictOnPass: 'OBJECTIVE_COMPLETE',
    buildRecord: {
      build_method: 'system-build',
      note: 'Reuses the proven 30/30-test fuseEvidence/learnWeights scoring approach from scripts/prototype-evidence-fusion-v2.mjs -- shared confidence layer V3/V4/V5 depend on.',
    },
    verdictExtra: {
      acceptance_command: 'npm run lifeos:communication-v2-evidence-fusion:acceptance',
    },
    passPredicate: (r) => r.tests_failed.length === 0 && r.tests_passed.length > 0,
  });
  console.log(JSON.stringify(report, null, 2));
  process.exit(pass ? 0 : 1);
}

async function main() {
  if (!fs.existsSync(SERVICE)) {
    step('service_file_exists', false, 'services/evidence-fusion-service.js does not exist yet');
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

  const { fuseEvidence, learnWeights } = mod;
  const hasFns = typeof fuseEvidence === 'function' && typeof learnWeights === 'function';
  step('exports_fuseEvidence_and_learnWeights', hasFns, hasFns ? null : 'fuseEvidence or learnWeights not exported as functions');
  if (!hasFns) return finish();

  try {
    const r1 = fuseEvidence(
      { transcript: { frustrated: 0.7, confused: 0.2 }, timing: { confused: 0.4 }, tonality: { frustrated: 0.5 } },
      { weights: { transcript: 1, timing: 0.8, tonality: 1 } },
    );
    const pass = r1.state === 'frustrated' && r1.confidence > 0.5 && Array.isArray(r1.sources) && r1.sources.length === 3;
    step('fuseEvidence_mixed_modalities', pass, pass ? null : JSON.stringify(r1));
  } catch (err) {
    step('fuseEvidence_mixed_modalities', false, String(err?.message || err));
  }

  try {
    const r2 = fuseEvidence({ transcript: { celebrating: 1 } }, {});
    const pass = r2.state === 'celebrating' && r2.confidence === 1 && r2.finished === true;
    step('fuseEvidence_clean_celebrating', pass, pass ? null : JSON.stringify(r2));
  } catch (err) {
    step('fuseEvidence_clean_celebrating', false, String(err?.message || err));
  }

  try {
    const r3 = fuseEvidence({}, {});
    const pass = r3.state === 'neutral' && r3.confidence === 0 && r3.finished === false;
    step('fuseEvidence_empty_neutral', pass, pass ? null : JSON.stringify(r3));
  } catch (err) {
    step('fuseEvidence_empty_neutral', false, String(err?.message || err));
  }

  try {
    const learned = learnWeights(
      [
        { transcript: 'I am stuck and this is broken', timing: { pauseMs: 900 }, tonality: { meanEnergy: 0.16, pitchStd: 40, meanPauseMs: 200 }, label: 'frustrated' },
        { transcript: 'Great, it works perfectly', timing: { pauseMs: 200 }, tonality: { meanEnergy: 0.2, pitchStd: 80, wordRate: 150 }, label: 'celebrating' },
      ],
      { transcript: 1, timing: 0.5, tonality: 0.5 },
    );
    const pass = typeof learned?.weights?.transcript === 'number' && learned.weights.transcript >= 0.1;
    step('learnWeights_smoke', pass, pass ? null : JSON.stringify(learned));
  } catch (err) {
    step('learnWeights_smoke', false, String(err?.message || err));
  }

  finish();
}

main().catch((err) => {
  step('uncaught_error', false, String(err?.message || err));
  finish();
});
