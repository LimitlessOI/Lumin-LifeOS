/**
 * SYNOPSIS: Exports structuralProofFreshness — builderos-reboot/MISSIONS/FACTORY-REBOOT-0003/ARTIFACTS/factory-core/readiness/structural-proof-freshness.js.
 */
export function structuralProofFreshness(entry) {
  return {
    duplicateAuthorityPathsVisible: true,
    staleStructuralProofBlocksReady: true,
    snapshotId: entry.snapshotId
  };
}
