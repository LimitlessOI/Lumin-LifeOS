export function readinessProofFreshness(entry) {
  return {
    staleProofBlocksReady: true,
    proofTimestamp: entry.proofTimestamp
  };
}
