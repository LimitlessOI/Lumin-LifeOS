/**
 * SYNOPSIS: Exports readinessProofFreshness — builderos-reboot/MISSIONS/FACTORY-REBOOT-0003/ARTIFACTS/factory-core/readiness/proof-freshness.js.
 */
export function readinessProofFreshness(entry) {
  return {
    staleProofBlocksReady: true,
    proofTimestamp: entry.proofTimestamp
  };
}
