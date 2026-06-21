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
 *
 * @authority Legacy production spine — see services/AGENTS.md. Not canonical factory runtime.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import path from 'path';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { promises as fsPromises } from 'fs';

const execFile = promisify(execFileCb);

// Directories that are not part of the Express server.
// commitToGitHub hard-blocks any path whose first segment is in this set.
const COMMIT_FORBIDDEN_TOP_DIRS = new Set([
  'src', 'frontend', 'backend', 'apps',
  '.worktrees', 'backups', 'node_modules', '.git',
]);

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
    const rawPath = String(filePath || '').replace(/\\/g, '/').trim();
    const rawParts = rawPath.replace(/^\/+/, '').split('/').filter(Boolean);
    const normalizedPath = path.posix.normalize(rawPath).replace(/^\/+/, '');
    const pathParts = normalizedPath.split('/').filter(Boolean);

    if (
      !normalizedPath ||
      rawParts.length === 0 ||
      rawParts.some((part) => part === '.' || part === '..') ||
      pathParts.length === 0 ||
      pathParts.some((part) => part === '.' || part === '..')
    ) {
      throw new Error(`commitToGitHub BLOCKED: invalid repo-relative path "${filePath}"`);
    }

    // ── Forbidden path guard ───────────────────────────────────────────────────
    // Prevents the builder from accumulating dead code in orphaned directories
    // (src/, frontend/, backend/, etc.) that have zero server imports.
    const topDir = pathParts[0];
    if (COMMIT_FORBIDDEN_TOP_DIRS.has(topDir)) {
      throw new Error(
        `commitToGitHub BLOCKED: "${normalizedPath}" targets forbidden directory "${topDir}/". ` +
        `Valid roots: routes/ services/ db/ startup/ config/ scripts/ public/ docs/ prompts/ core/ middleware/. ` +
        `Re-scope target_file to a valid server path.`
      );
    }

    // ── package.json protected-scripts guard ──────────────────────────────────
    // Railway autonomous builders can commit a new package.json (e.g. to add an
    // npm script for a new feature) but generate it from a template that omits
    // the compliance-gating test and operator scripts. This guard rejects any
    // package.json commit that removes a required script entry.
    // Root cause of the 2026-05-13 triple-strip: stash-only scripts, then each
    // rebase + Railway rebuild lost them. Guard fires at the API level so even
    // Railway autonomous builds cannot silently strip them.
    if (normalizedPath === 'package.json') {
      const REQUIRED_PACKAGE_SCRIPTS = [
        'repo:sync-check',
        'lifeos:verify:ui-map',
      ];
      const REQUIRED_TEST_FILES = [
        'tests/site-builder-postmark-helper.test.js',
        'tests/tc-morning-digest-service-module.test.js',
        'tests/operator-runtime-status-freshness.test.js',
        'tests/deployment-service-package-guard.test.js',
      ];
      let pkg;
      try { pkg = JSON.parse(content); } catch {
        throw new Error(
          `commitToGitHub BLOCKED: package.json content is not valid JSON. Refusing to commit.`
        );
      }
      const scripts = pkg?.scripts || {};
      const missingScripts = REQUIRED_PACKAGE_SCRIPTS.filter(s => !(s in scripts));
      const testScript = scripts['test'] || '';
      const missingTests = REQUIRED_TEST_FILES.filter(f => !testScript.includes(f));
      if (missingScripts.length > 0 || missingTests.length > 0) {
        const msg = [
          `commitToGitHub BLOCKED: package.json is missing required compliance entries.`,
          missingScripts.length ? `  Missing npm scripts: ${missingScripts.join(', ')}` : '',
          missingTests.length ? `  Missing test files in "test" script: ${missingTests.join(', ')}` : '',
          `  Add the missing entries to the proposed package.json before committing.`,
          `  These scripts are required for compliance gates and regression tests.`,
        ].filter(Boolean).join('\n');
        throw new Error(msg);
      }
    }

    // ── JS syntax pre-check ───────────────────────────────────────────────────
    // Catches builder-truncated output (token-limit cutoff) before it reaches
    // Railway and causes a boot crash. Root cause of the 2026-05-09 crash loop:
    // site-builder-routes.js was committed at 336 lines (truncated), causing
    // SyntaxError: Unexpected end of input on every Railway boot.
    if (normalizedPath.endsWith('.js')) {
      const tmpDir = await fsPromises.mkdtemp(path.join(tmpdir(), 'deploy-check-'));
      const tmpFile = path.join(tmpDir, 'check.js');
      try {
        await fsPromises.writeFile(tmpFile, content, 'utf8');
        await execFile(process.execPath, ['--check', tmpFile]);
      } catch (e) {
        const detail = String(e?.stderr || e?.message || '').split('\n').slice(0, 3).join(' ');
        await fsPromises.unlink(tmpFile).catch(() => {});
        await fsPromises.rmdir(tmpDir).catch(() => {});
        throw new Error(
          `commitToGitHub BLOCKED: JS syntax check failed for "${normalizedPath}" — not pushing broken code to GitHub.\n` +
          `Detail: ${detail}\n` +
          `Likely cause: builder hit token limit mid-generation. Retry with a smaller spec or explicit target_file.`
        );
      }
      await fsPromises.unlink(tmpFile).catch(() => {});
      await fsPromises.rmdir(tmpDir).catch(() => {});
    }

    // Get current SHA so we can update (not create duplicate)
    const getRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${normalizedPath}?ref=${targetBranch}`,
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
      `https://api.github.com/repos/${owner}/${repo}/contents/${normalizedPath}`,
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

    const commitData = await commitRes.json().catch(() => ({}));
    const commitSha = commitData?.commit?.sha || null;
    console.log(`✅ [DEPLOY] Committed ${normalizedPath} → ${targetBranch}${commitSha ? ` (${commitSha.slice(0, 7)})` : ''}`);
    return { ok: true, sha: commitSha };
  }

  function normalizeRepoRelativePath(filePath) {
    const rawPath = String(filePath || '').replace(/\\/g, '/').trim();
    const rawParts = rawPath.replace(/^\/+/, '').split('/').filter(Boolean);
    const normalizedPath = path.posix.normalize(rawPath).replace(/^\/+/, '');
    const pathParts = normalizedPath.split('/').filter(Boolean);
    if (
      !normalizedPath
      || rawParts.length === 0
      || rawParts.some((part) => part === '.' || part === '..')
      || pathParts.length === 0
      || pathParts.some((part) => part === '.' || part === '..')
    ) {
      throw new Error(`commitToGitHub BLOCKED: invalid repo-relative path "${filePath}"`);
    }
    const topDir = pathParts[0];
    if (COMMIT_FORBIDDEN_TOP_DIRS.has(topDir)) {
      throw new Error(
        `commitToGitHub BLOCKED: "${normalizedPath}" targets forbidden directory "${topDir}/".`,
      );
    }
    return normalizedPath;
  }

  async function commitManyToGitHub(fileEntries, message, branch) {
    const token = GITHUB_TOKEN?.trim();
    if (!token) throw new Error('GITHUB_TOKEN not configured');
    if (!GITHUB_REPO) throw new Error('GITHUB_REPO not configured');
    if (!Array.isArray(fileEntries) || !fileEntries.length) {
      throw new Error('commitManyToGitHub requires at least one file');
    }

    const targetBranch = branch || GITHUB_DEPLOY_BRANCH || 'main';
    const [owner, repo] = GITHUB_REPO.split('/');
    const authHeaders = {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    };

    const tree = [];
    const paths = [];
    for (const entry of fileEntries) {
      const normalizedPath = normalizeRepoRelativePath(entry.path || entry.target_file);
      const content = String(entry.content ?? entry.output ?? '');
      paths.push(normalizedPath);

      if (normalizedPath === 'package.json') {
        let parsed;
        try {
          parsed = JSON.parse(content);
        } catch {
          throw new Error('commitManyToGitHub BLOCKED: package.json content is not valid JSON.');
        }
        const requiredScripts = ['repo:sync-check', 'lifeos:verify:ui-map'];
        const missing = requiredScripts.filter((s) => !parsed?.scripts?.[s]);
        if (missing.length) {
          throw new Error(`commitManyToGitHub BLOCKED: package.json missing scripts: ${missing.join(', ')}`);
        }
      }

      if (/\.(js|mjs|cjs)$/i.test(normalizedPath)) {
        const tmpDir = await fsPromises.mkdtemp(path.join(tmpdir(), 'lifeos-batch-commit-'));
        const tmpFile = path.join(tmpDir, path.basename(normalizedPath));
        await fsPromises.writeFile(tmpFile, content, 'utf8');
        try {
          await execFile('node', ['--check', tmpFile]);
        } catch (err) {
          const detail = err?.stderr || err?.message || 'syntax error';
          throw new Error(
            `commitManyToGitHub BLOCKED: JS syntax check failed for "${normalizedPath}": ${detail}`,
          );
        } finally {
          await fsPromises.unlink(tmpFile).catch(() => {});
          await fsPromises.rmdir(tmpDir).catch(() => {});
        }
      }

      const blobRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ content, encoding: 'utf-8' }),
      });
      if (!blobRes.ok) {
        const err = await blobRes.json().catch(() => ({}));
        throw new Error(err.message || `GitHub blob create failed for ${normalizedPath}`);
      }
      const blob = await blobRes.json();
      tree.push({ path: normalizedPath, mode: '100644', type: 'blob', sha: blob.sha });
    }

    const refRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${targetBranch}`,
      { headers: authHeaders },
    );
    if (!refRes.ok) {
      const err = await refRes.json().catch(() => ({}));
      throw new Error(err.message || `Could not read ref heads/${targetBranch}`);
    }
    const refData = await refRes.json();
    const baseCommitSha = refData?.object?.sha;
    if (!baseCommitSha) throw new Error('Missing base commit SHA for batch commit');

    const baseCommitRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/commits/${baseCommitSha}`,
      { headers: authHeaders },
    );
    if (!baseCommitRes.ok) throw new Error('Could not read base commit for batch commit');
    const baseCommit = await baseCommitRes.json();
    const baseTreeSha = baseCommit?.tree?.sha;
    if (!baseTreeSha) throw new Error('Missing base tree SHA for batch commit');

    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ base_tree: baseTreeSha, tree }),
    });
    if (!treeRes.ok) {
      const err = await treeRes.json().catch(() => ({}));
      throw new Error(err.message || 'GitHub tree create failed');
    }
    const treeData = await treeRes.json();

    const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        message: message || `[system-build] batch ${paths.length} files`,
        tree: treeData.sha,
        parents: [baseCommitSha],
      }),
    });
    if (!commitRes.ok) {
      const err = await commitRes.json().catch(() => ({}));
      throw new Error(err.message || 'GitHub commit create failed');
    }
    const commitData = await commitRes.json();
    const commitSha = commitData?.sha || null;

    const updateRefRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${targetBranch}`,
      {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ sha: commitSha, force: false }),
      },
    );
    if (!updateRefRes.ok) {
      const err = await updateRefRes.json().catch(() => ({}));
      throw new Error(err.message || 'GitHub ref update failed');
    }

    console.log(`✅ [DEPLOY] Batch committed ${paths.length} files → ${targetBranch}${commitSha ? ` (${commitSha.slice(0, 7)})` : ''}`);
    return { ok: true, sha: commitSha, paths };
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
    commitManyToGitHub,
    triggerDeployment,
    triggerRailwayRedeploy,
    setRailwayEnvVar,
    setRailwayEnvVars,
    getRailwayEnvVars,
  };
}
