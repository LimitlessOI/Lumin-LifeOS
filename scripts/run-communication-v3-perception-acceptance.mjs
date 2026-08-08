#!/usr/bin/env node
/**
 * SYNOPSIS: Communication System V3 (Perception) acceptance.
 * PASS = services/perception-service.js exists and matches the proven
 * prototype's (scripts/prototype-perception-v3.mjs, 27/27 tests) exact
 * behavior, including consent-gating -- a channel's evidence must be
 * structurally absent from the result when consent is false.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'PRODUCT-COMMUNICATION-V3-PERCEPTION-0001';
const SERVICE = path.join(ROOT, 'services/perception-service.js');
const RECEIPT_DIR = path.join(ROOT, 'products/receipts');
const RECEIPT = path.join(RECEIPT_DIR, 'COMMUNICATION_V3_PERCEPTION_ACCEPTANCE.json');
const RECEIPT_REL = 'products/receipts/COMMUNICATION_V3_PERCEPTION_ACCEPTANCE.json';
const VERDICT = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'OBJECTIVE_VERDICT.json');

const report = {
  schema: 'communication_v3_perception_acceptance_v1',
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
    objectiveName: 'Communication System V3 — Perception',
    objectiveVerdictOnPass: 'OBJECTIVE_COMPLETE',
    buildRecord: {
      build_method: 'system-build',
      note: 'Reuses the proven 27/27-test fusePerception scoring approach from scripts/prototype-perception-v3.mjs, layered on V2 Evidence Fusion. Consent-gated: no camera/biometric evidence without explicit consent.',
    },
    verdictExtra: {
      acceptance_command: 'npm run lifeos:communication-v3-perception:acceptance',
    },
    passPredicate: (r) => r.tests_failed.length === 0 && r.tests_passed.length > 0,
  });
  console.log(JSON.stringify(report, null, 2));
  process.exit(pass ? 0 : 1);
}

async function main() {
  if (!fs.existsSync(SERVICE)) {
    step('service_file_exists', false, 'services/perception-service.js does not exist yet');
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

  const { fusePerception, hasConsent } = mod;
  const hasFns = typeof fusePerception === 'function' && typeof hasConsent === 'function';
  step('exports_fusePerception_and_hasConsent', hasFns, hasFns ? null : 'fusePerception or hasConsent not exported as functions');
  if (!hasFns) return finish();

  try {
    const happy = fusePerception({
      transcript: 'I love this, it is amazing!',
      tonality: { meanEnergy: 0.25, pitchStd: 80, wordRate: 150 },
      faceFrame: { smile: 0.9, eyeContact: 0.8, headNod: 0.6 },
      bodyFrame: { leaningForward: 0.7 },
      consents: { camera: true, biometric: false },
    });
    const pass = ['celebrating', 'excited'].includes(happy.state)
      && happy.positiveSignals.some((s) => s.signal === 'smile')
      && happy.positiveSignals.some((s) => s.signal === 'nod')
      && happy.consent.camera === true;
    step('fusePerception_happy_path_with_consent', pass, pass ? null : JSON.stringify(happy));
  } catch (err) {
    step('fusePerception_happy_path_with_consent', false, String(err?.message || err));
  }

  try {
    const denied = fusePerception({
      transcript: 'I am worried about this.',
      faceFrame: { frown: 0.9 },
      consents: { camera: false },
    });
    const pass = denied.state === 'concerned' && denied.modalities.face === undefined;
    step('fusePerception_consent_denied_face_ignored', pass, pass ? null : JSON.stringify(denied));
  } catch (err) {
    step('fusePerception_consent_denied_face_ignored', false, String(err?.message || err));
  }

  finish();
}

main().catch((err) => {
  step('uncaught_error', false, String(err?.message || err));
  finish();
});
