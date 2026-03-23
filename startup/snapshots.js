/**
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
export function createSnapshotManager({
  createSystemSnapshotService,
  rollbackToSnapshotService,
  rootDir,
  pool,
  systemMetrics,
  roiTracker,
  activeConnections,
  ideaEngine,
  aiPerformanceScores,
  systemSnapshots,
  getTrackLoss,
}) {
  async function createSystemSnapshot(reason = "Manual snapshot", filePaths = []) {
    return createSystemSnapshotService({
      reason,
      filePaths,
      __dirname: rootDir,
      pool,
      systemMetrics,
      roiTracker,
      activeConnectionsSize: activeConnections.size,
      ideaEngine,
      aiPerformanceScores,
      systemSnapshots,
    });
  }

  async function rollbackToSnapshot(snapshotId) {
    return rollbackToSnapshotService({
      snapshotId,
      __dirname: rootDir,
      pool,
      systemMetrics,
      roiTracker,
      aiPerformanceScores,
      trackLoss: getTrackLoss ? getTrackLoss() : undefined,
    });
  }

  return {
    createSystemSnapshot,
    rollbackToSnapshot,
  };
}
