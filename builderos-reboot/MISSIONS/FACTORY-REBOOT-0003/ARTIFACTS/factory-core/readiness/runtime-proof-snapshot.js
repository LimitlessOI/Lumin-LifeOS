/**
 * SYNOPSIS: Exports runtimeProofSnapshot — builderos-reboot/MISSIONS/FACTORY-REBOOT-0003/ARTIFACTS/factory-core/readiness/runtime-proof-snapshot.js.
 */
export function runtimeProofSnapshot(entry) {
  return {
    runtimeProofRequired: true,
    docsDoNotOutrankRuntime: true,
    snapshotRef: entry.snapshotRef
  };
}
