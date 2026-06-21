/**
 * SYNOPSIS: Exports structuralProofFreshness — lumin-factory/factory-staging/factory-core/readiness/structural-proof-freshness.js.
 */
export function structuralProofFreshness(entry) {
  return {
    duplicateAuthorityPathsVisible: true,
    staleStructuralProofBlocksReady: true,
    snapshotId: entry.snapshotId
  };
}
