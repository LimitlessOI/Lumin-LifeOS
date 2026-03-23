/**
 * deployment-service.js
 * File protection checks, GitHub commits, and Railway deployment/env-var control.
 *
 * Railway API docs: https://docs.railway.app/reference/public-api
 * GraphQL endpoint: https://backboard.railway.app/graphql/v2
 *
 * Required env vars for Railway control:
 *   RAILWAY_TOKEN          — Account token (railway.app → Account Settings → Tokens)
 *   RAILWAY_PROJECT_ID     — Your project ID (visible in the Railway dashboard URL)
 *   RAILWAY_SERVICE_ID     — Your service ID (Settings → Service ID)
 *   RAILWAY_ENVIRONMENT_ID — Your environment ID (Settings → Environment ID, usually "production")
 *   GITHUB_DEPLOY_BRANCH   — Branch Railway watches for auto-deploy (default: main)
 *
 * Use createDeploymentService(deps) to get bound functions.
 */

import path from 'path';
import { promises as fsPromises } from 'fs';

const RAILWAY_GQL = 'https://backboard.railway.app/graphql/v2';

export function createDeploymentService(deps) {
  const {
    pool,
    systemMetrics,
    broadcastToAll,
    GITHUB_TOKEN,
    GITHUB_REPO,
    GITHUB_DEPLOY_BRANCH = 'main',
    RAILWAY_TOKEN,
    RAILWAY_PROJECT_ID,
    RAILWAY_SERVICE_ID,
    RAILWAY_ENVIRONMENT_ID,
    __dirname: baseDir,
  } = deps;

  // ── isFileProtected ────────────────────────────────────────────────────────
  async function isFileProtected(filePath) {
    try {
      const result = await pool.query(
        'SELECT can_write, requires_full_council FROM protected_files WHERE file_path = $1',
        [filePath]
      );
      if (result.rows.length === 0) return { protected: false };
      return {
        protected: true,
        can_write: result.rows[0].can_write,
        requires_council: result.rows[0].requires_full_council,
      };
    } catch {
      return { protected: false };
    }
  }

  // ── commitToGitHub ─────────────────────────────────────────────────────────
  /**
   * Commit a single file to GitHub.
   * @param {string} filePath   — repo-relative path (e.g. 'core/my-module.js')
   * @param {string} content    — file content string
   * @param {string} message    — commit message
   * @param {string} [branch]   — target branch (default: GITHUB_DEPLOY_BRANCH → 'main')
   */
  async function commitToGitHub(filePath, content, message, branch) {
    const token = GITHUB_TOKEN?.trim();
    if (!token) throw new Error('GITHUB_TOKEN not configured');
    if (!GITHUB_REPO) throw new Error('GITHUB_REPO not configured');

    const targetBranch = branch || GITHUB_DEPLOY_BRANCH || 'main';
    const [owner, repo] = GITHUB_REPO.split('/');

    // Get current SHA so we can update (not create duplicate)
    const getRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${targetBranch}`,
      {
        headers: {
          Authorization: `token ${token}`,
          'Cache-Control': 'no-cache',
        },
      }
    );

    let sha;
    if (getRes.ok) {
      const existing = await getRes.json();
      sha = existing.sha;
    }

    const payload = {
      message,
      content: Buffer.from(content).toString('base64'),
      branch: targetBranch,
      ...(sha && { sha }),
    };

    const commitRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!commitRes.ok) {
      const err = await commitRes.json();
      const msg = err.message || 'GitHub commit failed';
      if (commitRes.status === 401) throw new Error(`GitHub auth failed (GITHUB_TOKEN expired/invalid): ${msg}`);
      if (commitRes.status === 403) throw new Error(`GitHub permission denied (token lacks Contents write): ${msg}`);
      throw new Error(msg);
    }

    console.log(`✅ [DEPLOY] Committed ${filePath} → ${targetBranch}`);
    return true;
  }

  // ── triggerDeployment ──────────────────────────────────────────────────────
  /**
   * Commit multiple files to main, which triggers Railway auto-deploy.
   * If RAILWAY_TOKEN is set, also pings Railway directly to force an immediate redeploy.
   */
  async function triggerDeployment(modifiedFiles = []) {
    try {
      console.log(`🚀 [DEPLOY] Triggered for: ${modifiedFiles.join(', ')}`);
      if (systemMetrics) systemMetrics.deploymentsTrigger = (systemMetrics.deploymentsTrigger || 0) + 1;

      for (const file of modifiedFiles) {
        try {
          const content = await fsPromises.readFile(path.join(baseDir, file), 'utf-8');
          await commitToGitHub(file, content, `[auto-deploy] ${file}`);
        } catch (error) {
          console.warn(`⚠️ [DEPLOY] Couldn't commit ${file}: ${error.message}`);
        }
      }

      // If Railway token is available, also trigger an immediate redeploy
      // (avoids waiting for GitHub webhook → Railway pipeline)
      if (RAILWAY_TOKEN && RAILWAY_SERVICE_ID && RAILWAY_ENVIRONMENT_ID) {
        await triggerRailwayRedeploy();
      }

      if (broadcastToAll) broadcastToAll({ type: 'deployment_triggered', files: modifiedFiles });
      return { success: true, message: 'Deployment triggered' };
    } catch (error) {
      console.error('[DEPLOY] triggerDeployment error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ── Railway GraphQL helper ─────────────────────────────────────────────────
  async function railwayGql(query, variables = {}) {
    // Read dynamically — bootstrap can update process.env.RAILWAY_TOKEN at
    // runtime and it will be picked up immediately without a restart.
    const token = RAILWAY_TOKEN || process.env.RAILWAY_TOKEN;
    if (!token) throw new Error('RAILWAY_TOKEN not configured');

    const res = await fetch(RAILWAY_GQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Railway API HTTP ${res.status}: ${text}`);
    }

    const json = await res.json();
    if (json.errors?.length) {
      throw new Error(`Railway GQL error: ${json.errors.map(e => e.message).join('; ')}`);
    }
    return json.data;
  }

  // ── triggerRailwayRedeploy ─────────────────────────────────────────────────
  /**
   * Tell Railway to immediately redeploy the service.
   * Requires: RAILWAY_TOKEN, RAILWAY_SERVICE_ID, RAILWAY_ENVIRONMENT_ID
   */
  async function triggerRailwayRedeploy() {
    const data = await railwayGql(
      `mutation Redeploy($serviceId: String!, $environmentId: String!) {
         serviceInstanceRedeploy(serviceId: $serviceId, environmentId: $environmentId)
       }`,
      {
        serviceId: RAILWAY_SERVICE_ID,
        environmentId: RAILWAY_ENVIRONMENT_ID,
      }
    );
    console.log('🚀 [RAILWAY] Redeploy triggered');
    return data;
  }

  // ── setRailwayEnvVar ───────────────────────────────────────────────────────
  /**
   * Set (or update) a single environment variable on Railway.
   * Railway restarts the service automatically after an env var change.
   *
   * Requires: RAILWAY_TOKEN, RAILWAY_PROJECT_ID, RAILWAY_SERVICE_ID, RAILWAY_ENVIRONMENT_ID
   *
   * @param {string} name   — env var name (e.g. 'STRIPE_PRICE_PRO')
   * @param {string} value  — env var value
   */
  async function setRailwayEnvVar(name, value) {
    if (!RAILWAY_PROJECT_ID) throw new Error('RAILWAY_PROJECT_ID not configured');
    if (!RAILWAY_SERVICE_ID) throw new Error('RAILWAY_SERVICE_ID not configured');
    if (!RAILWAY_ENVIRONMENT_ID) throw new Error('RAILWAY_ENVIRONMENT_ID not configured');

    const data = await railwayGql(
      `mutation SetVar($input: VariableUpsertInput!) {
         variableUpsert(input: $input)
       }`,
      {
        input: {
          projectId: RAILWAY_PROJECT_ID,
          environmentId: RAILWAY_ENVIRONMENT_ID,
          serviceId: RAILWAY_SERVICE_ID,
          name,
          value: String(value),
        },
      }
    );
    console.log(`✅ [RAILWAY] Env var set: ${name}`);
    return data;
  }

  // ── setRailwayEnvVars ──────────────────────────────────────────────────────
  /**
   * Set multiple env vars at once.
   * @param {Record<string, string>} vars — { NAME: 'value', ... }
   */
  async function setRailwayEnvVars(vars) {
    const results = [];
    for (const [name, value] of Object.entries(vars)) {
      try {
        await setRailwayEnvVar(name, value);
        results.push({ name, ok: true });
      } catch (err) {
        console.warn(`⚠️ [RAILWAY] Failed to set ${name}: ${err.message}`);
        results.push({ name, ok: false, error: err.message });
      }
    }
    return results;
  }

  // ── getRailwayEnvVars ──────────────────────────────────────────────────────
  /**
   * List all env vars currently set on the Railway service.
   * Useful for checking what's configured before setting new ones.
   */
  async function getRailwayEnvVars() {
    if (!RAILWAY_PROJECT_ID || !RAILWAY_SERVICE_ID || !RAILWAY_ENVIRONMENT_ID) {
      throw new Error('RAILWAY_PROJECT_ID, RAILWAY_SERVICE_ID, and RAILWAY_ENVIRONMENT_ID are all required');
    }

    const data = await railwayGql(
      `query GetVars($projectId: String!, $environmentId: String!, $serviceId: String!) {
         variables(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId)
       }`,
      {
        projectId: RAILWAY_PROJECT_ID,
        environmentId: RAILWAY_ENVIRONMENT_ID,
        serviceId: RAILWAY_SERVICE_ID,
      }
    );
    return data.variables || {};
  }

  return {
    isFileProtected,
    commitToGitHub,
    triggerDeployment,
    triggerRailwayRedeploy,
    setRailwayEnvVar,
    setRailwayEnvVars,
    getRailwayEnvVars,
  };
}
