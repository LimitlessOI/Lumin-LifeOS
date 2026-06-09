export function getSandboxBoundary(step) {
  return {
    sandboxBoundary: step.sandbox_boundary,
    denyOutsideBoundary: true,
    denyCallerSuppliedAcceptance: true
  };
}
