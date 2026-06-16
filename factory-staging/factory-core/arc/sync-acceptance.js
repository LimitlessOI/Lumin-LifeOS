import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../builder/run-step.js';

export function generateAcceptanceTestsFromBlueprint(blueprint) {
  const tests = [];
  for (const step of blueprint.steps || []) {
    const contract = step.exact_output_contract || {};
    const baseId = step.acceptance_test_ids?.[0]?.replace(/-\d+$/, '') || `AT-${step.step_id}`;

    if (step.action_type === 'shell_command') {
      tests.push({
        test_id: `${baseId}-1`,
        step_id: step.step_id,
        type: 'file_exists',
        target: step.target_file,
      });
      continue;
    }

    if (contract.type === 'byte_exact_copy' && contract.sha256) {
      tests.push({
        test_id: `${baseId}-1`,
        step_id: step.step_id,
        type: 'file_sha256_matches',
        target: step.target_file,
        expected_sha256: contract.sha256,
      });
      if (step.target_file.endsWith('.json')) {
        tests.push({
          test_id: `${baseId}-2`,
          step_id: step.step_id,
          type: 'json_parseable',
          target: step.target_file,
        });
      }
    }
  }
  return tests;
}

export function writeAcceptanceTests(missionFolder, blueprint) {
  const tests = generateAcceptanceTestsFromBlueprint(blueprint);
  const out = path.join(missionFolder, 'ACCEPTANCE_TESTS.json');
  fs.writeFileSync(out, `${JSON.stringify(tests, null, 2)}\n`);
  return { ok: true, count: tests.length, path: path.relative(REPO_ROOT, out) };
}
