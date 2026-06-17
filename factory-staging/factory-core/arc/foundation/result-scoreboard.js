/**
 * Result scoreboard + release pass gate per founder doctrine.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadMissionJson } from '../mission-paths.js';
import { readFounderText } from './coverage-map.js';
import { mergeScoreboardWithReality } from './reality-score.js';

export function writeResultScoreboard(missionFolder) {
  const missionId = path.basename(missionFolder);
  const baseline = loadMissionJson(missionFolder, 'INTENT_BASELINE.json');
  const objective = loadMissionJson(missionFolder, 'OBJECTIVE_VERDICT.json');
  const builderRun = loadMissionJson(missionFolder, 'BUILDER_RUN_RECEIPT.json');
  const founderText = readFounderText(missionFolder);

  const board = mergeScoreboardWithReality(missionFolder, {
    schema: 'result_scoreboard_v1',
    mission_id: missionId,
    at: new Date().toISOString(),
    intended: baseline?.outcome_statement || section(founderText, 'Desired Outcome'),
    built: builderRun?.verdict || 'unknown',
    happened: objective?.verdict || 'pending',
    matched_intent: objective?.founder_usability_pass === true,
    evidence: {
      acceptance_receipt: objective?.receipt || null,
      builder_receipt: 'BUILDER_RUN_RECEIPT.json',
      tests_passed: objective?.tests_passed || [],
    },
    failed: objective?.tests_failed || [],
    changed: [],
    learned: [],
    no_narrative: true,
  });

  const out = path.join(missionFolder, 'RESULT_SCOREBOARD.json');
  fs.writeFileSync(out, `${JSON.stringify(board, null, 2)}\n`);
  return board;
}

function section(text, heading) {
  const re = new RegExp(`##+\\s*${heading}[\\s\\S]*?(?=\\n##|$)`, 'i');
  const m = text.match(re);
  return m ? m[0].replace(/^##[^\n]*\n?/, '').trim().slice(0, 400) : '';
}

export function evaluateReleasePassGate(missionFolder) {
  const objective = loadMissionJson(missionFolder, 'OBJECTIVE_VERDICT.json');
  const builderRun = loadMissionJson(missionFolder, 'BUILDER_RUN_RECEIPT.json');
  const studio = loadMissionJson(missionFolder, 'receipts/STUDIO_EXPERIENCE_SIMULATION_RECEIPT.json');
  const violations = [];

  if (!['TECHNICAL_PASS', 'PASS'].includes(builderRun?.verdict)) {
    violations.push('release:BUILD_PASS not achieved');
  }
  if (objective?.founder_usability_pass !== true) {
    violations.push('release:founder_usability_pass not true');
  }
  if (studio?.in_scope && studio?.pass !== true) {
    violations.push('release:studio simulation failed');
  }
  if (!fs.existsSync(path.join(missionFolder, 'RESULT_SCOREBOARD.json'))) {
    violations.push('release:RESULT_SCOREBOARD missing');
  }

  return {
    schema: 'release_pass_gate_v1',
    mission_id: path.basename(missionFolder),
    pass: violations.length === 0,
    status: violations.length === 0 ? 'RELEASE_PASS' : 'BLOCKED_RELEASE',
    violations,
  };
}
