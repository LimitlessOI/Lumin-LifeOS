/**
 * SNT Review #2 — Translation attack per founder doctrine.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { readFounderText } from './coverage-map.js';

export function runSntTranslationAttack(missionFolder, { blueprint, simulation } = {}) {
  const missionId = path.basename(missionFolder);
  const founderText = readFounderText(missionFolder);
  const attacks = [];

  const add = (claim, pass, failure_scenario, severity = 'blocking') => {
    attacks.push({
      claim,
      pass,
      failure_scenario,
      severity,
      evidence_if_wrong: pass ? null : 'Builder simulation or acceptance failure',
      recommended_action: pass ? 'none' : 'ARC revises blueprint',
    });
  };

  add('ARC preserved intent sources', Boolean(blueprint?.intent_sources?.length), 'ARC invented scope', 'blocking');
  add(
    'Blueprint has acceptance command',
    Boolean(blueprint?.acceptance_command),
    'No measurable Alpha bar',
    'blocking',
  );
  add(
    'All steps are write_file_exact',
    (blueprint?.steps || []).every((s) => s.action_type === 'write_file_exact'),
    'Builder forced to decide',
    'blocking',
  );
  add(
    'Auto-execution rule preserved',
    !/auto.?execut/i.test(JSON.stringify(blueprint || {})) || /never auto/i.test(founderText),
    'Intent drift on staging rule',
    'blocking',
  );
  add(
    'Simulation clear to build',
    simulation?.summary?.clear_to_build !== false,
    'Blocking decision gaps remain',
    'blocking',
  );

  const blocking = attacks.filter((a) => !a.pass && a.severity === 'blocking');
  const receipt = {
    schema: 'snt_translation_attack_v2',
    mission_id: missionId,
    seat: 'SNT',
    review: 'translation_attack',
    simulated_at: new Date().toISOString(),
    simulated_by: 'factory-core/arc/foundation/snt-translation-attack.js',
    core_question: 'If this claim is wrong, how would we know?',
    attacks_run: attacks.length,
    attacks,
    blocking_count: blocking.length,
    verdict: blocking.length ? 'builder_clearance_no' : 'builder_clearance_yes',
    pass: blocking.length === 0,
  };

  const out = path.join(missionFolder, 'receipts/SNT_TRANSLATION_ATTACK_REPORT.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(receipt, null, 2)}\n`);
  return receipt;
}
