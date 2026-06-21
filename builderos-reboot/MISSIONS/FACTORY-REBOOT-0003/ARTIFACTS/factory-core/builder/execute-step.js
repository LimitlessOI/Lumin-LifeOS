/**
 * SYNOPSIS: Exports executeStep — builderos-reboot/MISSIONS/FACTORY-REBOOT-0003/ARTIFACTS/factory-core/builder/execute-step.js.
 */
export const BUILDER_ALLOWED_STATUSES = [
  'DONE',
  'BLOCKED_RETURN_TO_BPB',
  'FAILED_VERIFICATION'
];

export function executeStep(step, context) {
  return {
    action: 'execute_one_exact_step',
    stepId: step.step_id,
    allowedStatuses: BUILDER_ALLOWED_STATUSES,
    rules: [
      'stay_inside_sandbox',
      'do_not_choose_work',
      'do_not_invent_patch_plan',
      'block_if_non_coding_judgment_required'
    ],
    contextSummary: context
  };
}
