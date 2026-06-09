#!/usr/bin/env node
/**
 * Sync ACCEPTANCE_TESTS.json from BLUEPRINT.json exact_output_contract fields.
 * Adds file_sha256_matches for byte_exact_copy steps; structural checks for S009-style steps.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const missionId = process.argv[2];
if (!missionId) {
  console.error('Usage: node sync-acceptance-from-blueprint.mjs FACTORY-REBOOT-0001');
  process.exit(1);
}

const missionDir = path.join(ROOT, 'builderos-reboot', 'MISSIONS', missionId);
const blueprintPath = path.join(missionDir, 'BLUEPRINT.json');
const acceptancePath = path.join(missionDir, 'ACCEPTANCE_TESTS.json');

const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
const tests = [];

for (const step of blueprint.steps) {
  const contract = step.exact_output_contract || {};
  const baseId = step.acceptance_test_ids?.[0]?.replace(/-\d+$/, '') || `AT-${step.step_id}`;

  const isDerivedAcceptance =
    contract.type === 'derived_acceptance_tests' ||
    (step.target_file.endsWith('/ACCEPTANCE_TESTS.json') && contract.type !== 'byte_exact_copy');

  if (isDerivedAcceptance) {
    tests.push({
      test_id: `${baseId}-1`,
      step_id: step.step_id,
      type: 'json_parseable',
      target: step.target_file,
    });
    tests.push({
      test_id: `${baseId}-2`,
      step_id: step.step_id,
      type: 'acceptance_tests_cover_blueprint',
      target: step.target_file,
      mission_id: blueprint.mission_id,
    });
  } else if (contract.type === 'byte_exact_copy' && contract.sha256) {
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
  } else if (contract.type === 'structural_json_contract') {
    tests.push({
      test_id: `${baseId}-1`,
      step_id: step.step_id,
      type: 'json_parseable',
      target: step.target_file,
    });
    if (contract.required_scope) {
      tests.push({
        test_id: `${baseId}-2`,
        step_id: step.step_id,
        type: 'json_field_equals',
        target: step.target_file,
        field_path: 'scope',
        expected: contract.required_scope,
      });
    }
    if (Array.isArray(contract.required_step_ids)) {
      tests.push({
        test_id: `${baseId}-3`,
        step_id: step.step_id,
        type: 'json_step_ids_include',
        target: step.target_file,
        expected_step_ids: contract.required_step_ids,
      });
    }
  } else {
    tests.push({
      test_id: `${baseId}-1`,
      step_id: step.step_id,
      type: 'file_exists',
      target: step.target_file,
    });
  }
}

fs.writeFileSync(acceptancePath, `${JSON.stringify(tests, null, 2)}\n`, 'utf8');
console.log(`Wrote ${tests.length} acceptance tests to ${acceptancePath}`);
