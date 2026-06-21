/**
 * SYNOPSIS: js — lumin-factory/missions/FACTORY-REBOOT-0003/ARTIFACTS/factory-core/routes/factory-execute-step-routes.js.
 */
export const factoryExecuteStepRoute = {
  method: 'POST',
  path: '/factory/execute-step',
  purpose: 'execute one frozen step only',
  allowedOutputs: ['DONE', 'BLOCKED_RETURN_TO_BPB', 'FAILED_VERIFICATION']
};
