/**
 * SYNOPSIS: BuilderOS artifact — Factory Execute Mission Routes.
 */
export const factoryExecuteMissionRoute = {
  method: 'POST',
  path: '/factory/execute-mission',
  purpose: 'execute all steps in one frozen mission blueprint',
  allowedOutputs: ['DONE', 'BLOCKED_RETURN_TO_BPB', 'FAILED_VERIFICATION'],
};
