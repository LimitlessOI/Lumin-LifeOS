export function blueprintFreezeCheck(blueprint) {
  return {
    blueprint_status: 'REVIEW_REQUIRED',
    checks: [
      'deterministic_step_set',
      'authority_lock',
      'exact_output_contract_present',
      'non_goals_present'
    ],
    blueprintId: blueprint.blueprint_id
  };
}
