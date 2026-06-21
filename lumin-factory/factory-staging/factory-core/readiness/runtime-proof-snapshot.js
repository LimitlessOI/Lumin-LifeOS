/**
 * SYNOPSIS: Exports runtimeProofSnapshot — lumin-factory/factory-staging/factory-core/readiness/runtime-proof-snapshot.js.
 */
export function runtimeProofSnapshot(entry) {
  return {
    runtimeProofRequired: true,
    docsDoNotOutrankRuntime: true,
    snapshotRef: entry.snapshotRef
  };
}
