/**
 * SYNOPSIS: deployment-service.js
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
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import path from 'path';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { promises as fsPromises } from 'fs';
import {
  ensureSynopsisInContent,
  isInFileEnforceable,
  isIndexable,
  computeUpdatedIndex,
  stripWrappingCodeFence,
  INDEX_REL,
} from '../scripts/lib/file-synopsis.mjs';
import { BLOCKED_WRITE_PATHS, ROUTE_REGISTRATION_FILE } from '../config/builder-safe-scope.js';

const execFile = promisify(execFileCb);

// Repo root derived from this module's own location (services/deployment-service.js)
// via import.meta.url — NOT process.cwd(), which is not guaranteed to be the repo
// root depending on how the server was launched.
const REPO_ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// `node --check` resolves ESM-vs-CommonJS from the nearest package.json "type".
// A syntax-check temp dir in os.tmpdir() has none, so a `.js` file would parse as
// CommonJS and silently pass ESM-only syntax errors (e.g. a truncated block
// comment at EOF) — the exact truncated-output class this guard exists to block
// before pushing to GitHub. Drop a package.json mirroring this repo's "type" so
// the check runs in the module system the file will actually run in. (.mjs/.cjs
// already force their mode via extension, so only `.js` needs this.)
async function writeSyntaxCheckModuleType(tmpDir, filePath) {
  if (!/\.js$/i.test(filePath)) return;
  let type = 'commonjs';
  try {
    const pkg = JSON.parse(await fsPromises.readFile(path.join(REPO_ROOT, 'package.json'), 'utf8'));
    if (pkg.type === 'module') type = 'module';
  } catch {
    // default commonjs (Node's own default when "type" is absent)
  }
  await fsPromises.writeFile(path.join(tmpDir, 'package.json'), JSON.stringify({ type }), 'utf8');
}

function assertNotBuilderBlockedPath(normalizedPath, label = 'commitToGitHub', { allowRouteRegistration = false } = {}) {
  if (allowRouteRegistration && normalizedPath === ROUTE_REGISTRATION_FILE) {
    return;
  }
  for (const blocked of BLOCKED_WRITE_PATHS) {
    const b = String(blocked || '').replace(/\/$/, '');
    if (normalizedPath === b || normalizedPath.startsWith(blocked)) {
      throw new Error(
        `${label} BLOCKED: "${normalizedPath}" is protected by builder-safe-scope. ` +
        'Composition root and constitutional paths require operator GAP-FILL — not autonomous /build.',
      );
    }
  }
}

// Directories that are not part of the Express server.
// commitToGitHub hard-blocks any path whose first segment is in this set.
const COMMIT_FORBIDDEN_TOP_DIRS = new Set([
  'src', 'frontend', 'backend', 'apps',
  '.worktrees', 'backups', 'node_modules', '.git',
]);

const RAILWAY_GQL = 'https://backboard.railway.app/graphql/v2';

function decodeGitHubContent(encoded = '') {
  try {
    return Buffer.from(String(encoded || '').replace(/\n/g, ''), 'base64').toString('utf8');
  } catch {
    return null;
  }
}

/**
 * Decide the current synopsis-index payload from a raw GitHub response.
 * Pure + exported so the anti-wipe contract is unit-testable:
 *   - 404               → { files: [] } (index legitimately absent)
 *   - non-2xx           → throw (transient read failure — do NOT rebuild)
 *   - 2xx empty body    → throw (the >1 MB Contents-API base64 trap — a raw
 *                         fetch of an existing file is never empty)
 *   - 2xx unparseable   → throw (corrupt — refuse to overwrite)
 *   - 2xx valid JSON    → parsed index
 * Every throw is non-destructive: callers skip the index co-commit and leave
 * the existing ~11k-entry index intact rather than truncating it.
 */
export function resolveSynopsisIndexFromRaw(status, rawText) {
  if (status === 404) return { files: [] };
  if (!(status >= 200 && status < 300)) {
    throw new Error(`Could not read ${INDEX_REL} (HTTP ${status})`);
  }
  const raw = String(rawText || '');
  if (!raw.trim()) {
    throw new Error(`${INDEX_REL} returned empty body — refusing to rebuild index from empty`);
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`${INDEX_REL} raw content not valid JSON — refusing to wipe index: ${e.message}`);
  }
}

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
  async function commitToGitHub(filePath, content, message, branch, options = {}) {
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

    assertNotBuilderBlockedPath(normalizedPath, 'commitToGitHub', {
      allowRouteRegistration: options.allowRouteRegistration === true,
    });

    // ── Markdown fence strip ──────────────────────────────────────────────────
    // The model sometimes wraps whole-file output in a ```lang … ``` block. Strip
    // it before any parsing/validation so fenced JSON/JS/HTML cannot reach GitHub.
    content = stripWrappingCodeFence(content, normalizedPath);

    if (isInFileEnforceable(normalizedPath)) {
      content = ensureSynopsisInContent(normalizedPath, content);
    }

    // ── Generic JSON validity guard ───────────────────────────────────────────
    // Any *.json must parse (root package.json also gets the script guard below).
    // Prevents nested configs like services/health-nexus/package.json being
    // committed with markdown fences or truncation and breaking node's package
    // resolution / CI syntax gates.
    if (normalizedPath.endsWith('.json') && normalizedPath !== 'package.json') {
      try {
        JSON.parse(content);
      } catch {
        throw new Error(`commitToGitHub BLOCKED: "${normalizedPath}" content is not valid JSON. Refusing to commit.`);
      }
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
        await writeSyntaxCheckModuleType(tmpDir, normalizedPath);
        await fsPromises.writeFile(tmpFile, content, 'utf8');
        await execFile(process.execPath, ['--check', tmpFile]);
      } catch (e) {
        const detail = String(e?.stderr || e?.message || '').split('\n').slice(0, 3).join(' ');
        await fsPromises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
        throw new Error(
          `commitToGitHub BLOCKED: JS syntax check failed for "${normalizedPath}" — not pushing broken code to GitHub.\n` +
          `Detail: ${detail}\n` +
          `Likely cause: builder hit token limit mid-generation. Retry with a smaller spec or explicit target_file.`
        );
      }
      await fsPromises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }

    const authHeaders = {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    };

    async function readGithubFileState() {
      const getRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${normalizedPath}?ref=${targetBranch}`,
        { headers: authHeaders },
      );
      if (getRes.status === 404) {
        return { exists: false, sha: null, content: null };
      }
      if (!getRes.ok) {
        const err = await getRes.json().catch(() => ({}));
        const msg = err.message || `Could not read ${normalizedPath}`;
        if (getRes.status === 401) throw new Error(`GitHub auth failed (GITHUB_TOKEN expired/invalid): ${msg}`);
        if (getRes.status === 403) throw new Error(`GitHub permission denied (token lacks Contents read): ${msg}`);
        throw new Error(msg);
      }
      const existing = await getRes.json();
      return {
        exists: true,
        sha: existing.sha || null,
        content: decodeGitHubContent(existing.content),
      };
    }

    async function readBranchHeadSha() {
      const refRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${targetBranch}`,
        { headers: authHeaders },
      );
      if (!refRes.ok) {
        const err = await refRes.json().catch(() => ({}));
        throw new Error(err.message || `Could not read ref heads/${targetBranch}`);
      }
      const refData = await refRes.json();
      return refData?.object?.sha || null;
    }

    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const state = await readGithubFileState();
      if (state.exists && state.content === content) {
        const headSha = await readBranchHeadSha().catch(() => state.sha || null);
        console.log(`✅ [DEPLOY] No-op satisfied ${normalizedPath} → ${targetBranch}${headSha ? ` (${headSha.slice(0, 7)})` : ''}`);
        return { ok: true, sha: headSha, already_present: true };
      }

      const payload = {
        message,
        content: Buffer.from(content).toString('base64'),
        branch: targetBranch,
        ...(state.sha ? { sha: state.sha } : {}),
      };

      const commitRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${normalizedPath}`,
        {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify(payload),
        }
      );

      if (commitRes.ok) {
        const commitData = await commitRes.json().catch(() => ({}));
        const commitSha = commitData?.commit?.sha || null;
        console.log(`✅ [DEPLOY] Committed ${normalizedPath} → ${targetBranch}${commitSha ? ` (${commitSha.slice(0, 7)})` : ''}`);
        // Keep the File Synopsis Law index in step with the file we just wrote.
        // Best-effort: a failed index update must not fail the primary commit.
        await commitSynopsisIndexUpdate([{ path: normalizedPath, content }], targetBranch)
          .catch((e) => console.warn(`⚠️ [DEPLOY] synopsis index co-commit skipped for ${normalizedPath}: ${e.message}`));
        return { ok: true, sha: commitSha, already_present: false };
      }

      const err = await commitRes.json().catch(() => ({}));
      const msg = err.message || 'GitHub commit failed';
      const retryableConflict = commitRes.status === 409
        || /is at [a-f0-9]{7,40} but expected/i.test(msg)
        || /sha.*does not match/i.test(msg)
        || /Update is not a fast forward/i.test(msg);
      if (retryableConflict && attempt < maxAttempts) {
        console.log(`⚠️ [DEPLOY] Single-file commit race on ${targetBranch} (attempt ${attempt}/${maxAttempts}): ${msg} — retrying...`);
        await new Promise((r) => setTimeout(r, 500 * attempt));
        continue;
      }
      if (retryableConflict) {
        const latest = await readGithubFileState().catch(() => null);
        if (latest?.exists && latest.content === content) {
          const headSha = await readBranchHeadSha().catch(() => latest.sha || null);
          console.log(`✅ [DEPLOY] No-op satisfied after conflict ${normalizedPath} → ${targetBranch}${headSha ? ` (${headSha.slice(0, 7)})` : ''}`);
          return { ok: true, sha: headSha, already_present: true };
        }
      }
      if (commitRes.status === 401) throw new Error(`GitHub auth failed (GITHUB_TOKEN expired/invalid): ${msg}`);
      if (commitRes.status === 403) throw new Error(`GitHub permission denied (token lacks Contents write): ${msg}`);
      throw new Error(msg);
    }

    throw new Error(`GitHub commit failed after ${maxAttempts} attempts`);
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
    assertNotBuilderBlockedPath(normalizedPath, 'commitManyToGitHub');
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
    const committedForIndex = [];
    for (const entry of fileEntries) {
      const normalizedPath = normalizeRepoRelativePath(entry.path || entry.target_file);
      let content = String(entry.content ?? entry.output ?? '');
      paths.push(normalizedPath);

      // Same builder-output hygiene as the single-file path: strip a whole-file
      // markdown fence, inject the SYNOPSIS header, then validate JSON — so batch
      // (autonomous /execute) output is governance-compliant by construction.
      content = stripWrappingCodeFence(content, normalizedPath);
      if (isInFileEnforceable(normalizedPath)) {
        content = ensureSynopsisInContent(normalizedPath, content);
      }

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
      } else if (normalizedPath.endsWith('.json')) {
        try {
          JSON.parse(content);
        } catch {
          throw new Error(`commitManyToGitHub BLOCKED: "${normalizedPath}" content is not valid JSON.`);
        }
      }

      if (/\.(js|mjs|cjs)$/i.test(normalizedPath)) {
        const tmpDir = await fsPromises.mkdtemp(path.join(tmpdir(), 'lifeos-batch-commit-'));
        const tmpFile = path.join(tmpDir, path.basename(normalizedPath));
        await writeSyntaxCheckModuleType(tmpDir, normalizedPath);
        await fsPromises.writeFile(tmpFile, content, 'utf8');
        try {
          await execFile('node', ['--check', tmpFile]);
        } catch (err) {
          const detail = err?.stderr || err?.message || 'syntax error';
          throw new Error(
            `commitManyToGitHub BLOCKED: JS syntax check failed for "${normalizedPath}": ${detail}`,
          );
        } finally {
          await fsPromises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
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
      committedForIndex.push({ path: normalizedPath, content });
    }

    // ── Atomic File Synopsis Law index co-commit ──────────────────────────────
    // Fold a fresh index row for every indexable file into the SAME commit, so a
    // builder commit can never land governance-noncompliant (INDEX_MISSING /
    // INDEX_STALE) and block its own merge. Best-effort: if the index cannot be
    // read/built, still commit the files rather than fail the whole build.
    const indexableCommitted = committedForIndex.filter(
      (f) => isIndexable(f.path) && f.path !== INDEX_REL,
    );
    if (indexableCommitted.length && !paths.includes(INDEX_REL)) {
      try {
        const idxContent = await buildUpdatedIndexContent(indexableCommitted, targetBranch);
        const idxBlobRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ content: idxContent, encoding: 'utf-8' }),
        });
        if (idxBlobRes.ok) {
          const idxBlob = await idxBlobRes.json();
          tree.push({ path: INDEX_REL, mode: '100644', type: 'blob', sha: idxBlob.sha });
          paths.push(INDEX_REL);
        } else {
          console.warn(`⚠️ [DEPLOY] synopsis index blob create failed — committing files without index refresh`);
        }
      } catch (e) {
        console.warn(`⚠️ [DEPLOY] synopsis index co-commit skipped: ${e.message}`);
      }
    }

    // Retry the ref race: the autonomously looping builder can commit while
    // another process just updated the branch head. GitHub rejects the ref
    // PATCH with "Update is not a fast forward" when the expected parent SHA
    // has moved. Re-read the latest ref, rebuild the tree on the latest base,
    // and try again. The blobs are content-addressed and can be reused.
    const maxAttempts = 5;
    let lastError = '';
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
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
      if (updateRefRes.ok) {
        console.log(`✅ [DEPLOY] Batch committed ${paths.length} files → ${targetBranch}${commitSha ? ` (${commitSha.slice(0, 7)})` : ''}`);
        return { ok: true, sha: commitSha, paths };
      }

      const err = await updateRefRes.json().catch(() => ({}));
      const msg = err.message || 'GitHub ref update failed';
      const isRace = /fast forward|conflict|already exists|sha.*mismatch|expected/i.test(msg);
      lastError = msg;
      if (!isRace || attempt === maxAttempts) {
        throw new Error(msg);
      }
      console.log(`⚠️ [DEPLOY] Batch commit race on ${targetBranch} (attempt ${attempt}/${maxAttempts}): ${msg} — retrying...`);
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
    throw new Error(lastError || 'GitHub ref update failed after retries');
  }

  // ── Synopsis index helpers (File Synopsis Law, governance-by-construction) ──
  function repoOwnerAndName() {
    const [owner, repo] = String(GITHUB_REPO || '').split('/');
    return { owner, repo };
  }

  function githubAuthHeaders() {
    return {
      Authorization: `token ${GITHUB_TOKEN?.trim()}`,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
    };
  }

  async function fetchCurrentSynopsisIndex(owner, repo, targetBranch) {
    // Fetch with the RAW media type, NOT the default JSON+base64 Contents shape.
    // The Contents API only base64-encodes `content` for files <= 1 MB; for a
    // larger file (the index is ~3.4 MB) it returns 200 with an EMPTY `content`
    // and `encoding: "none"`. Decoding that yields "" → previously this returned
    // `{ files: [] }`, and computeUpdatedIndex then rebuilt the index from ONLY
    // the just-committed file — wiping all ~11k entries on every autonomous
    // commit. The raw media type streams the full bytes (up to 100 MB).
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${INDEX_REL}?ref=${targetBranch}`,
      { headers: { ...githubAuthHeaders(), Accept: 'application/vnd.github.raw' } },
    );
    const raw = res.status === 404 ? '' : await res.text();
    return resolveSynopsisIndexFromRaw(res.status, raw);
  }

  // Fetch the live index and return the pretty-printed content with fresh rows
  // for `committedFiles` folded in (matches the on-disk generator's format).
  async function buildUpdatedIndexContent(committedFiles, targetBranch) {
    const { owner, repo } = repoOwnerAndName();
    const current = await fetchCurrentSynopsisIndex(owner, repo, targetBranch);
    const payload = computeUpdatedIndex(current, committedFiles);
    return `${JSON.stringify(payload, null, 2)}\n`;
  }

  // Commit ONLY the index as its own commit — used by the single-file contents
  // API path, which cannot fold extra files into one commit. Callers treat this
  // as best-effort so a failed index sync never fails the primary file commit.
  async function commitSynopsisIndexUpdate(committedFiles, branch) {
    const token = GITHUB_TOKEN?.trim();
    if (!token || !GITHUB_REPO) return { ok: false, skipped: 'no-credentials' };
    const indexable = (committedFiles || []).filter((f) => isIndexable(f.path) && f.path !== INDEX_REL);
    if (!indexable.length) return { ok: false, skipped: 'nothing-indexable' };

    const targetBranch = branch || GITHUB_DEPLOY_BRANCH || 'main';
    const { owner, repo } = repoOwnerAndName();
    const headers = githubAuthHeaders();

    const idxContent = await buildUpdatedIndexContent(indexable, targetBranch);

    const blobRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
      method: 'POST', headers, body: JSON.stringify({ content: idxContent, encoding: 'utf-8' }),
    });
    if (!blobRes.ok) throw new Error(`index blob create failed (HTTP ${blobRes.status})`);
    const blob = await blobRes.json();

    const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${targetBranch}`, { headers });
    if (!refRes.ok) throw new Error(`could not read ref heads/${targetBranch}`);
    const baseCommitSha = (await refRes.json())?.object?.sha;
    if (!baseCommitSha) throw new Error('missing base commit sha for index update');

    const baseCommitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits/${baseCommitSha}`, { headers });
    if (!baseCommitRes.ok) throw new Error('could not read base commit for index update');
    const baseTreeSha = (await baseCommitRes.json())?.tree?.sha;
    if (!baseTreeSha) throw new Error('missing base tree sha for index update');

    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
      method: 'POST', headers,
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: [{ path: INDEX_REL, mode: '100644', type: 'blob', sha: blob.sha }],
      }),
    });
    if (!treeRes.ok) throw new Error('index tree create failed');
    const treeSha = (await treeRes.json())?.sha;

    const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
      method: 'POST', headers,
      body: JSON.stringify({
        message: `chore(governance): sync File Synopsis index for ${indexable.map((f) => f.path).join(', ')}`.slice(0, 480),
        tree: treeSha,
        parents: [baseCommitSha],
      }),
    });
    if (!commitRes.ok) throw new Error('index commit create failed');
    const commitSha = (await commitRes.json())?.sha || null;

    // Ref update races with never-stop queue-status commits and sibling builds.
    // Retry from a fresh HEAD so a lost race does not fail the primary file commit
    // (callers treat index sync as best-effort, but a thrown "Reference cannot be
    // updated" still polluted build receipts when callers awaited without catch).
    const maxRefAttempts = 4;
    for (let attempt = 1; attempt <= maxRefAttempts; attempt += 1) {
      const headRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${targetBranch}`, { headers });
      if (!headRes.ok) throw new Error(`could not re-read ref heads/${targetBranch} for index update`);
      const liveHead = (await headRes.json())?.object?.sha;
      let shaToPush = commitSha;
      if (liveHead && liveHead !== baseCommitSha) {
        const liveCommitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits/${liveHead}`, { headers });
        if (!liveCommitRes.ok) throw new Error('could not read live head for index rebase');
        const liveTreeSha = (await liveCommitRes.json())?.tree?.sha;
        if (!liveTreeSha) throw new Error('missing live tree sha for index rebase');
        const rebaseTreeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
          method: 'POST', headers,
          body: JSON.stringify({
            base_tree: liveTreeSha,
            tree: [{ path: INDEX_REL, mode: '100644', type: 'blob', sha: blob.sha }],
          }),
        });
        if (!rebaseTreeRes.ok) throw new Error('index rebase tree create failed');
        const rebaseTreeSha = (await rebaseTreeRes.json())?.sha;
        const rebaseCommitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
          method: 'POST', headers,
          body: JSON.stringify({
            message: `chore(governance): sync File Synopsis index for ${indexable.map((f) => f.path).join(', ')}`.slice(0, 480),
            tree: rebaseTreeSha,
            parents: [liveHead],
          }),
        });
        if (!rebaseCommitRes.ok) throw new Error('index rebase commit create failed');
        shaToPush = (await rebaseCommitRes.json())?.sha || null;
      }
      const updateRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${targetBranch}`, {
        method: 'PATCH', headers, body: JSON.stringify({ sha: shaToPush, force: false }),
      });
      if (updateRefRes.ok) {
        console.log(`✅ [DEPLOY] Synopsis index synced${shaToPush ? ` (${String(shaToPush).slice(0, 7)})` : ''}`);
        return { ok: true, sha: shaToPush };
      }
      const err = await updateRefRes.json().catch(() => ({}));
      const msg = err.message || 'index ref update failed';
      const retryable = updateRefRes.status === 422
        || /Reference cannot be updated|is at .* but expected|Update is not a fast forward/i.test(msg);
      if (retryable && attempt < maxRefAttempts) continue;
      throw new Error(msg);
    }
    throw new Error('index ref update failed after retries');
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
