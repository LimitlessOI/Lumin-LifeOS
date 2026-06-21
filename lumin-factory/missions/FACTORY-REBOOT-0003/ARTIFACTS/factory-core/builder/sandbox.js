/**
 * SYNOPSIS: Exports getSandboxBoundary — lumin-factory/missions/FACTORY-REBOOT-0003/ARTIFACTS/factory-core/builder/sandbox.js.
 */
export function getSandboxBoundary(step) {
  return {
    sandboxBoundary: step.sandbox_boundary,
    denyOutsideBoundary: true,
    denyCallerSuppliedAcceptance: true
  };
}
