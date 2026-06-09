export function structuralProofFreshness(entry) {
  return {
    duplicateAuthorityPathsVisible: true,
    staleStructuralProofBlocksReady: true,
    snapshotId: entry.snapshotId
  };
}
