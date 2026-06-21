/**
 * SYNOPSIS: Exports getSandboxBoundary — lumin-factory/factory-staging/factory-core/builder/sandbox.js.
 */
export function getSandboxBoundary(step) {
  return {
    sandboxBoundary: step.sandbox_boundary,
    denyOutsideBoundary: true,
    denyCallerSuppliedAcceptance: true
  };
}
