export function runtimeProofSnapshot(entry) {
  return {
    runtimeProofRequired: true,
    docsDoNotOutrankRuntime: true,
    snapshotRef: entry.snapshotRef
  };
}
