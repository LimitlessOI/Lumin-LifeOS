/**
 * SYNOPSIS: Exports readinessProofFreshness — lumin-factory/missions/FACTORY-REBOOT-0003/ARTIFACTS/factory-core/readiness/proof-freshness.js.
 */
export function readinessProofFreshness(entry) {
  return {
    staleProofBlocksReady: true,
    proofTimestamp: entry.proofTimestamp
  };
}
