/**
 * deployment-service.js — extracted from server.js
 * File protection checks, GitHub deployment triggers, and commit helpers.
 *
 * Use createDeploymentService(deps) to get bound functions.
 */

import path from 'path';
import { promises as fsPromises } from 'fs';

/**
 * @param {object} deps
 * @param {object}   deps.pool
 * @param {object}   deps.systemMetrics
 * @param {function} deps.broadcastToAll
 * @param {string}   deps.GITHUB_TOKEN
 * @param {string}   deps.GITHUB_REPO
 * @param {string}   deps.__dirname
 */
export function createDeploymentService(deps) {
  const {
    pool,
    systemMetrics,
    broadcastToAll,
    GITHUB_TOKEN,
    GITHUB_REPO,
    __dirname: baseDir,
  } = deps;

  // --------------------------------------------------------------------------
  // isFileProtected
  // --------------------------------------------------------------------------
  async function isFileProtected(filePath) {
    try {
      const result = await pool.query(
        "SELECT can_write, requires_full_council FROM protected_files WHERE file_path = $1",
        [filePath]
      );
      if (result.rows.length === 0) return { protected: false };
      return {
        protected: true,
        can_write: result.rows[0].can_write,
        requires_council: result.rows[0].requires_full_council,
      };
    } catch (e) {
      return { protected: false };
    }
  }

  // --------------------------------------------------------------------------
  // triggerDeployment
  // --------------------------------------------------------------------------
  async function triggerDeployment(modifiedFiles = []) {
    try {
      console.log(
        `🚀 [DEPLOYMENT] Triggered for: ${modifiedFiles.join(", ")}`
      );

      systemMetrics.deploymentsTrigger++;

      for (const file of modifiedFiles) {
        try {
          const content = await fsPromises.readFile(
            path.join(baseDir, file),
            "utf-8"
          );
          await commitToGitHub(
            file,
            content,
            `Auto-deployment: Updated ${file}`
          );
        } catch (error) {
          console.log(
            `⚠️ [DEPLOYMENT] Couldn't push ${file}: ${error.message}`
          );
        }
      }

      broadcastToAll({ type: "deployment_triggered", files: modifiedFiles });
      return { success: true, message: "Deployment triggered" };
    } catch (error) {
      console.error("Deployment trigger error:", error.message);
      return { success: false, error: error.message };
    }
  }

  // --------------------------------------------------------------------------
  // commitToGitHub
  // --------------------------------------------------------------------------
  async function commitToGitHub(filePath, content, message) {
    const token = GITHUB_TOKEN?.trim();
    if (!token) throw new Error("GITHUB_TOKEN not configured");

    const [owner, repo] = GITHUB_REPO.split("/");

    const getRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        headers: {
          Authorization: `token ${token}`,
          "Cache-Control": "no-cache",
        },
      }
    );

    let sha = undefined;
    if (getRes.ok) {
      const existing = await getRes.json();
      sha = existing.sha;
    }

    const payload = {
      message,
      content: Buffer.from(content).toString("base64"),
      ...(sha && { sha }),
    };

    const commitRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        method: "PUT",
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!commitRes.ok) {
      const err = await commitRes.json();
      throw new Error(err.message || "GitHub commit failed");
    }

    console.log(`✅ Committed ${filePath} to GitHub`);
    return true;
  }

  return { isFileProtected, triggerDeployment, commitToGitHub };
}
