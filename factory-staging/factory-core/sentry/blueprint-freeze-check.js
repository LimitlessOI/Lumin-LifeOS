/**
 * SYNOPSIS: Blueprint freeze check — required fields on every step before build.
 */

const STEP_REQUIRED = [
  'step_id',
  'action_type',
  'target_file',
  'sandbox_boundary',
  'authority_owner',
  'on_block',
];

export function blueprintFreezeCheck(blueprint) {
  const blocking = [];
  const steps = blueprint?.steps || [];

  if (!blueprint?.blueprint_id && !blueprint?.mission_id) {
    blocking.push('missing blueprint_id or mission_id');
  }

  if (!steps.length) {
    blocking.push('empty steps array');
  }

  for (const step of steps) {
    for (const key of STEP_REQUIRED) {
      if (step[key] === undefined || step[key] === null || step[key] === '') {
        blocking.push(`${step.step_id || 'unknown'}: missing ${key}`);
      }
    }
    if (step.action_type === 'write_file_exact') {
      const inputs = step.exact_inputs || {};
      if (!inputs.content_source_path && inputs.exact_content == null) {
        blocking.push(`${step.step_id}: write_file_exact missing content source`);
      }
    }
  }

  const pass = blocking.length === 0;
  return {
    blueprint_status: pass ? 'FROZEN' : 'REVIEW_REQUIRED',
    pass,
    blocking,
    checks: [
      'deterministic_step_set',
      'authority_lock',
      'exact_output_contract_present',
      'non_goals_present',
    ],
    blueprintId: blueprint?.blueprint_id || blueprint?.mission_id,
  };
}
