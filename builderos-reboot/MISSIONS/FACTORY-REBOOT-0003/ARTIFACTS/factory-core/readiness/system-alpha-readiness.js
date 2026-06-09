export function systemAlphaReadiness(snapshot) {
  return {
    status: snapshot.proofFresh ? 'REVIEW_REQUIRED' : 'NOT_READY',
    failClosed: true,
    requiresGovernedProof: true
  };
}
