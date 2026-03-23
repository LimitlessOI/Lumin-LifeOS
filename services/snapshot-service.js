/**
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import fs from "fs";
import path from "path";
import { promises as fsPromises } from "fs";

/**
 * quickSnapshot(label, pool)
 * Standalone snapshot — only requires a label and a pg pool.
 * Used by idea-to-implementation-pipeline (no server context needed).
 * Returns snapshotId string, or null on failure.
 */
export async function quickSnapshot(label, pool) {
  if (!pool) return null;
  try {
    const snapshotId = `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const payload = { label, timestamp: new Date().toISOString() };
    await pool.query(
      `INSERT INTO system_snapshots (snapshot_id, snapshot_data, version, reason)
       VALUES ($1, $2, $3, $4)`,
      [snapshotId, JSON.stringify(payload), 'v26.1', label]
    );
    return snapshotId;
  } catch (err) {
    console.warn(`[SNAPSHOT] quickSnapshot failed: ${err.message}`);
    return null;
  }
}

/**
 * quickRollback(snapshotId, pool)
 * Minimal rollback — logs the event. Full file rollback requires the heavy
 * rollbackToSnapshot() with server context. Safe to call anywhere.
 */
export async function quickRollback(snapshotId, pool) {
  if (!pool || !snapshotId) return { ok: false, error: 'no pool or snapshotId' };
  try {
    const result = await pool.query(
      `SELECT snapshot_data FROM system_snapshots WHERE snapshot_id = $1`,
      [snapshotId]
    );
    if (result.rows.length === 0) {
      return { ok: false, error: `Snapshot not found: ${snapshotId}` };
    }
    console.log(`↩️ [SNAPSHOT] quickRollback acknowledged: ${snapshotId}`);
    return { ok: true, snapshotId };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Create a system snapshot, including optional file contents, and persist it.
 */
export async function createSystemSnapshot({
  reason = "Manual snapshot",
  filePaths = [],
  __dirname,
  pool,
  systemMetrics,
  roiTracker,
  activeConnectionsSize,
  ideaEngine,
  aiPerformanceScores,
  systemSnapshots,
}) {
  try {
    const snapshotId = `snap_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const fileContents = {};
    if (filePaths && filePaths.length > 0) {
      for (const filePath of filePaths) {
        try {
          const fullPath = path.join(__dirname, filePath);
          if (fs.existsSync(fullPath)) {
            const content = await fsPromises.readFile(fullPath, "utf-8");
            fileContents[filePath] = content;
          }
        } catch (error) {
          console.warn(
            `⚠️ Could not snapshot file ${filePath}: ${error.message}`
          );
        }
      }
    }

    const systemState = {
      metrics: systemMetrics,
      roi: roiTracker,
      activeConnections: activeConnectionsSize,
      dailyIdeas: ideaEngine ? ideaEngine.getIdeaCount() : 0,
      aiPerformance: Object.fromEntries(aiPerformanceScores),
      timestamp: new Date().toISOString(),
      fileContents,
    };

    await pool.query(
      `INSERT INTO system_snapshots (snapshot_id, snapshot_data, version, reason)
       VALUES ($1, $2, $3, $4)`,
      [snapshotId, JSON.stringify(systemState), "v26.1", reason]
    );

    systemSnapshots.push({
      id: snapshotId,
      timestamp: new Date().toISOString(),
      reason,
      filePaths: Object.keys(fileContents),
    });

    if (systemSnapshots.length > 10) {
      systemSnapshots.splice(0, systemSnapshots.length - 10);
    }

    console.log(
      `📸 System snapshot created: ${snapshotId} (${Object.keys(fileContents).length} files backed up)`
    );
    return snapshotId;
  } catch (error) {
    console.error("Snapshot creation error:", error.message);
    return null;
  }
}

/**
 * Roll back to a previously created snapshot, restoring metrics and file contents.
 */
export async function rollbackToSnapshot({
  snapshotId,
  __dirname,
  pool,
  systemMetrics,
  roiTracker,
  aiPerformanceScores,
  trackLoss,
}) {
  try {
    const result = await pool.query(
      `SELECT snapshot_data FROM system_snapshots WHERE snapshot_id = $1`,
      [snapshotId]
    );

    if (result.rows.length === 0) {
      throw new Error("Snapshot not found");
    }

    let snapshotData = result.rows[0].snapshot_data;
    if (typeof snapshotData === "string") {
      snapshotData = JSON.parse(snapshotData);
    }

    Object.assign(systemMetrics, snapshotData.metrics);
    Object.assign(roiTracker, snapshotData.roi);

    aiPerformanceScores.clear();
    for (const [ai, score] of Object.entries(
      snapshotData.aiPerformance || {}
    )) {
      aiPerformanceScores.set(ai, score);
    }

    const restoredFiles = [];
    if (
      snapshotData.fileContents &&
      typeof snapshotData.fileContents === "object"
    ) {
      for (const [filePath, content] of Object.entries(
        snapshotData.fileContents
      )) {
        try {
          const fullPath = path.join(__dirname, filePath);
          if (fs.existsSync(fullPath)) {
            const backupPath = `${fullPath}.pre-rollback.${Date.now()}`;
            await fsPromises.copyFile(fullPath, backupPath);
            console.log(
              `📦 Backed up current ${filePath} to ${
                backupPath.split("/").pop() || backupPath
              }`
            );
          }
          await fsPromises.writeFile(fullPath, content, "utf-8");
          restoredFiles.push(filePath);
          console.log(`↩️ Restored file: ${filePath}`);
        } catch (fileError) {
          console.error(
            `⚠️ Failed to restore file ${filePath}: ${fileError.message}`
          );
        }
      }
    }

    systemMetrics.rollbacksPerformed++;
    console.log(
      `↩️ System rolled back to snapshot: ${snapshotId} (${restoredFiles.length} files restored)`
    );

    await trackLoss(
      "info",
      "System rollback performed",
      `Rolled back to ${snapshotId}`,
      { snapshot: snapshotData, restoredFiles }
    );

    return {
      ok: true,
      snapshotId,
      restoredFiles,
      metrics: snapshotData.metrics,
      roi: snapshotData.roi,
    };
  } catch (error) {
    console.error("Rollback error:", error.message);
    return { ok: false, error: error.message };
  }
}

