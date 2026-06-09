export function proofFreshnessReview(proof) {
  return {
    proofId: proof.id,
    freshnessRequired: true,
    staleProofBlocksReady: true
  };
}
