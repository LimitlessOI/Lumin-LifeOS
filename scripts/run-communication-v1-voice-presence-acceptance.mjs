#!/usr/bin/env node
/**
 * SYNOPSIS: Communication System V1 (Voice Presence) acceptance.
 * Communication System V1 (Voice Presence) acceptance.
 * PASS = interaction-decision service exists with a real, deterministic
 * turn-completion scorer, and the client wiring for graceful TTS
 * interruption decay is present in the shared voice module and overlay.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finishBpAcceptance } from './lib/bp-acceptance-finish.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'PRODUCT-COMMUNICATION-V1-VOICE-PRESENCE-0001';
const BLUEPRINT = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'BLUEPRINT.json');
const SERVICE = path.join(ROOT, 'services/interaction-decision-service.js');
const VOICE_CHAT = path.join(ROOT, 'public/shared/lifeos-voice-chat.js');
const OVERLAY = path.join(ROOT, 'public/overlay/lifeos-app.html');
const RECEIPT_DIR = path.join(ROOT, 'products/receipts');
const RECEIPT = path.join(RECEIPT_DIR, 'COMMUNICATION_V1_VOICE_PRESENCE_ACCEPTANCE.json');
const RECEIPT_REL = 'products/receipts/COMMUNICATION_V1_VOICE_PRESENCE_ACCEPTANCE.json';
const VERDICT = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION, 'OBJECTIVE_VERDICT.json');

const report = {
  schema: 'communication_v1_voice_presence_acceptance_v1',
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
    objectiveName: 'Communication System V1 — Voice Presence',
    objectiveVerdictOnPass: 'OBJECTIVE_COMPLETE',
    buildRecord: {
      build_method: 'system-build',
      note: 'Second half of V1 (contract/commitment extraction already live). Reuses the proven 39/39-test fuseTurnCompletion scoring approach from scripts/prototype-conversational-contracts-v1.mjs.',
    },
    verdictExtra: {
      acceptance_command: 'npm run lifeos:communication-v1-voice-presence:acceptance',
    },
    passPredicate: (r) => r.tests_failed.length === 0 && r.tests_passed.length > 0,
  });
  console.log(JSON.stringify(report, null, 2));
  process.exit(pass ? 0 : 1);
}

step('blueprint_exists', fs.existsSync(BLUEPRINT), BLUEPRINT);

step('interaction_decision_service_exists', fs.existsSync(SERVICE), SERVICE);
if (fs.existsSync(SERVICE)) {
  try {
    const mod = await import(`file://${SERVICE}`);
    step('exports_computeTurnCompletionConfidence', typeof mod.computeTurnCompletionConfidence === 'function', {
      exported: Object.keys(mod),
    });
    if (typeof mod.computeTurnCompletionConfidence === 'function') {
      // Behavioral fixtures mirroring the proven prototype's own self-test cases
      // (finished statement vs. trailing conjunction/mid-thought) -- not a
      // byte-identical port check, a real behavioral one.
      const finished = mod.computeTurnCompletionConfidence('I will call the bank tomorrow.', { pauseMs: 900 });
      const midThought = mod.computeTurnCompletionConfidence('I will call the bank and', { pauseMs: 200 });
      const finishedScore = typeof finished === 'number' ? finished : finished?.confidence;
      const midScore = typeof midThought === 'number' ? midThought : midThought?.confidence;
      step('finished_statement_scores_higher_than_mid_thought',
        typeof finishedScore === 'number' && typeof midScore === 'number' && finishedScore > midScore,
        { finishedScore, midScore });
    }
  } catch (err) {
    step('interaction_decision_service_imports_cleanly', false, { error: err.message });
  }
}

step('voice_chat_module_exists', fs.existsSync(VOICE_CHAT));
if (fs.existsSync(VOICE_CHAT)) {
  const src = fs.readFileSync(VOICE_CHAT, 'utf8');
  step('voice_chat_has_fadeAndStopSpeaking', src.includes('fadeAndStopSpeaking'), 'public/shared/lifeos-voice-chat.js');
  step('voice_chat_documents_speechSynthesis_limitation', /speechSynthesis/i.test(src) && /no (native )?(volume )?ramp|instant|no fade/i.test(src),
    'must document that speechSynthesis.cancel() cannot fade, per FOUNDER_PACKET constraint');
}

step('overlay_wires_barge_in', fs.existsSync(OVERLAY));
if (fs.existsSync(OVERLAY)) {
  const src = fs.readFileSync(OVERLAY, 'utf8');
  step('overlay_calls_fadeAndStopSpeaking', src.includes('fadeAndStopSpeaking'), 'public/overlay/lifeos-app.html');
}

finish();
