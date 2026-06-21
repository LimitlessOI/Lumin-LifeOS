/**
 * SYNOPSIS: Exports systemAlphaReadiness — lumin-factory/factory-staging/factory-core/readiness/system-alpha-readiness.js.
 */
export function systemAlphaReadiness(snapshot) {
  if (snapshot.proofFresh && snapshot.automatedProof) {
    return {
      status: 'STRUCTURAL_PASS',
      failClosed: true,
      requiresGovernedProof: true,
      humanReviewRequired: true,
    };
  }
  return {
    status: snapshot.proofFresh ? 'REVIEW_REQUIRED' : 'NOT_READY',
    failClosed: true,
    requiresGovernedProof: true,
  };
}
