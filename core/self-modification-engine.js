/**
 * SelfModificationEngine — extracted from server.js
 * Handles AI-council-gated self-modification of files.
 *
 * Dependencies (server.js globals) are injected via the constructor options object.
 */

import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';

export class SelfModificationEngine {
  /**
   * @param {object} deps
   * @param {object} deps.pool
   * @param {object} deps.systemMetrics
   * @param {function} deps.createSystemSnapshot
   * @param {function} deps.isFileProtected
   * @param {function} deps.conductEnhancedConsensus
   * @param {function} deps.createProposal
   * @param {function} deps.sandboxTest
   * @param {function} deps.rollbackToSnapshot
   * @param {function} deps.trackLoss
   * @param {function} deps.broadcastToAll
   * @param {function} deps.callCouncilMember
   * @param {object}   deps.COUNCIL_MEMBERS
   * @param {string}   deps.__dirname
   */
  constructor(deps = {}) {
    this._deps = deps;
  }

  async modifyOwnCode(filePath, newContent, reason, options = {}) {
    const {
      pool, systemMetrics, createSystemSnapshot, isFileProtected,
      conductEnhancedConsensus, createProposal, sandboxTest, rollbackToSnapshot,
      trackLoss, broadcastToAll, callCouncilMember, COUNCIL_MEMBERS,
      __dirname: baseDir,
    } = this._deps;

    try {
      console.log(`🔧 [SELF-MODIFY] Attempting: ${filePath}`);

      const fullPath = path.join(baseDir, filePath);

      // Create file backup before any modifications
      let backupPath = null;
      if (fs.existsSync(fullPath)) {
        backupPath = `${fullPath}.backup.${Date.now()}`;
        await fsPromises.copyFile(fullPath, backupPath);
        console.log(`📦 Created file backup: ${backupPath.split("/").pop()}`);
      }

      // Create system snapshot with file contents
      const snapshotId = await createSystemSnapshot(
        `Before modifying ${filePath}`,
        [filePath] // Include this file in the snapshot
      );

      const protection = await isFileProtected(filePath);

      const activeAIs = await this.countActiveAIs();

      // Require at least one AI to be available for protected files
      if (protection.protected && protection.requires_council) {
        if (activeAIs === 0) {
          // Restore from backup if no AIs available
          if (backupPath && fs.existsSync(backupPath)) {
            await fsPromises.copyFile(backupPath, fullPath);
            await fsPromises.unlink(backupPath);
          }
          return {
            success: false,
            error: "No AI council members available - modification rejected for safety",
          };
        }

        const proposalId = await createProposal(
          `Self-Modify: ${filePath}`,
          `Reason: ${reason}\n\nChanges: ${newContent.slice(0, 300)}...`,
          "self_modification_engine"
        );

        if (proposalId) {
          const voteResult = await conductEnhancedConsensus(proposalId);
          if (voteResult.decision !== "APPROVED") {
            // Restore from backup if council rejected
            if (backupPath && fs.existsSync(backupPath)) {
              await fsPromises.copyFile(backupPath, fullPath);
              await fsPromises.unlink(backupPath);
            }
            return {
              success: false,
              error: "Council rejected modification",
              proposalId,
            };
          }
        }
      } else if (activeAIs === 0) {
        // Option A+: block all modifications when 0 AIs unless emergency override
        const emergencyOverride = process.env.SELF_MOD_EMERGENCY_OVERRIDE === 'true';
        const fromAuthenticatedRequest = options.emergencyOverrideFromAuthenticatedRequest === true;
        if (!emergencyOverride || !fromAuthenticatedRequest) {
          if (backupPath && fs.existsSync(backupPath)) {
            await fsPromises.copyFile(backupPath, fullPath);
            await fsPromises.unlink(backupPath);
          }
          return {
            success: false,
            error: "No AI council members available - modification rejected for safety",
          };
        }
        // Emergency override: audit + snapshot then proceed
        console.warn("⚠️ [SELF-MOD] EMERGENCY OVERRIDE: 0 AIs but SELF_MOD_EMERGENCY_OVERRIDE=true and authenticated request");
        await pool.query(
          `INSERT INTO loss_log (severity, what_was_lost, why_lost, context, timestamp) VALUES ($1, $2, $3, $4, NOW())`,
          ["info", "EMERGENCY SELF-MOD OVERRIDE", `file=${filePath} reason=${(reason || "").slice(0, 200)}`, JSON.stringify({ filePath, activeAIs: 0 })]
        ).catch(() => {});
        await createSystemSnapshot("Emergency override before self-mod");
      }

      const sandboxResult = await sandboxTest(
        newContent,
        `Test modification of ${filePath}`
      );
      if (!sandboxResult.success) {
        console.log(`⚠️ Sandbox test failed, rolling back to ${snapshotId}`);
        // Try to restore from snapshot (which includes file contents)
        const rollbackResult = await rollbackToSnapshot(snapshotId);
        // Also restore from backup as fallback
        if (backupPath && fs.existsSync(backupPath)) {
          await fsPromises.copyFile(backupPath, fullPath);
          await fsPromises.unlink(backupPath);
        }
        return {
          success: false,
          error: "Failed sandbox test",
          sandboxError: sandboxResult.error,
          rollbackResult,
        };
      }

      // Write the new content
      await fsPromises.writeFile(fullPath, newContent, "utf-8");

      // Keeping backup for extra safety

      const modId = `mod_${Date.now()}`;
      await pool.query(
        `INSERT INTO self_modifications (mod_id, file_path, change_description, new_content, status, council_approved)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          modId,
          filePath,
          reason,
          newContent.slice(0, 5000),
          "applied",
          protection.requires_council && activeAIs > 1,
        ]
      );

      systemMetrics.selfModificationsSuccessful++;
      console.log(`✅ [SELF-MODIFY] Success: ${filePath}${backupPath ? ` (backup: ${backupPath.split("/").pop()})` : ""}`);
      await trackLoss("info", `File modified: ${filePath}`, reason, {
        approved: true,
        backupPath: backupPath ? backupPath.split("/").pop() : null,
        snapshotId,
      });

      broadcastToAll({
        type: "self_modification",
        filePath,
        status: "success",
        backupPath: backupPath ? backupPath.split("/").pop() : null,
      });
      return {
        success: true,
        filePath,
        reason,
        modId,
        backupPath: backupPath ? backupPath.split("/").pop() : null,
        snapshotId,
      };
    } catch (error) {
      const { systemMetrics: sm, trackLoss: tl } = this._deps;
      if (sm) sm.selfModificationsAttempted++;
      if (tl) await tl("error", `Failed to modify: ${filePath}`, error.message);
      return { success: false, error: error.message };
    }
  }

  async countActiveAIs() {
    const { callCouncilMember, COUNCIL_MEMBERS } = this._deps;
    let active = 0;
    for (const member of Object.keys(COUNCIL_MEMBERS)) {
      try {
        await callCouncilMember(member, "Are you online?");
        active++;
      } catch {
        // offline
      }
    }
    return active;
  }
}

export default SelfModificationEngine;
