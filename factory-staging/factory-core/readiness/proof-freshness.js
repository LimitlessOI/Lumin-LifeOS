/**
 * SYNOPSIS: Exports readinessProofFreshness — factory-staging/factory-core/readiness/proof-freshness.js.
 */
export function readinessProofFreshness(entry) {
  return {
    staleProofBlocksReady: true,
    proofTimestamp: entry.proofTimestamp
  };
}
