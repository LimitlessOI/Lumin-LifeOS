/**
 * SYNOPSIS: PREDICTION_RECEIPT + MODE_A_TO_B transition — required before IDC exit (HARD).
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadMissionJson } from '../mission-paths.js';
import { readFounderText } from './coverage-map.js';
import { loadBpPriorityMission } from '../gate-enforcement.js';

function writeJson(absPath, data) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, `${JSON.stringify(data, null, 2)}\n`);
}

export function writeModeAToBTransitionReceipt(missionFolder) {
  const missionId = path.basename(missionFolder);
  const receipt = {
    schema: 'mode_a_to_b_transition_v1',
    mission_id: missionId,
    mode_from: 'CREATIVE_EXPANSION',
    mode_to: 'REALITY_TRANSLATION',
    triggered_by: 'Chair',
    rationale: 'Founder packet present; department simulations and pre-ARC challenge required before ARC',
    at: new Date().toISOString(),
  };
  writeJson(path.join(missionFolder, 'MODE_A_TO_B_TRANSITION_RECEIPT.json'), receipt);
  return receipt;
}

export function writePredictionReceipt(missionFolder) {
  const missionId = path.basename(missionFolder);
  const founderText = readFounderText(missionFolder);
  const baseline = loadMissionJson(missionFolder, 'INTENT_BASELINE.json');
  const queueEntry = loadBpPriorityMission(missionId);
  const stepCount = loadMissionJson(missionFolder, 'BLUEPRINT.json')?.steps?.length ?? 0;

  const receipt = {
    schema: 'prediction_receipt_v1',
    mission_id: missionId,
    created_at: new Date().toISOString(),
    owner: 'CFO',
    pre_build: {
      estimated_duration_minutes: stepCount > 0 ? Math.max(5, stepCount * 3) : 30,
      estimated_token_cost: { value: null, confidence: 'GUESS', note: 'IDE/builder tokens tracked post-hoc in mission ledger' },
      estimated_deploy_required: /production|railway|acceptance/i.test(founderText),
      priority_rank: queueEntry?.rank ?? null,
      success_probability: { value: 0.7, confidence: 'THINK' },
    },
    post_build: {
      actual_duration_minutes: null,
      actual_token_cost: null,
      variance_note: null,
    },
    outcome_statement: baseline?.outcome_statement || null,
    scored_by: 'Hist',
  };
  writeJson(path.join(missionFolder, 'PREDICTION_RECEIPT.json'), receipt);
  return receipt;
}

export function hasPredictionReceipt(missionFolder) {
  return fs.existsSync(path.join(missionFolder, 'PREDICTION_RECEIPT.json'));
}

export function hasModeAToBReceipt(missionFolder) {
  return fs.existsSync(path.join(missionFolder, 'MODE_A_TO_B_TRANSITION_RECEIPT.json'));
}
