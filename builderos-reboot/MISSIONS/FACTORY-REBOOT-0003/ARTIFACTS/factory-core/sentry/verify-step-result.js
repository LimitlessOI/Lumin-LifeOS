export function verifyStepResult(step, result) {
  return {
    implementation_status: 'REVIEW_REQUIRED',
    stepId: step.step_id,
    resultStatus: result.status,
    verifyAgainst: ['acceptance_tests', 'exact_output_contract', 'anti_pattern_check']
  };
}
