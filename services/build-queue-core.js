/**
 * SYNOPSIS: Shared BUILD_QUEUE.json primitives plus the one-queue lock:
 * only the canonical manufacturing queue may live under
 * docs/products/<id>/BUILD_QUEUE.json. Other paths throw SECOND_QUEUE_FORBIDDEN.
 * Multiple factories + multiple product BPs share that one file (steps carry
 * product_id / source). Extracted out of product-build-orchestrator.js so it
 * and scripts/build-queue-drift-repair.mjs can both depend on this instead of
 * on each other.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { authorAssertionsFromSpec } from '../factory-staging/factory-core/bpb/author-assertions.js';
import { runBehaviorAssertions } from '../factory-staging/factory-core/sentry/behavior-assertions.js';
import {
  LIVE_BUILD_QUEUE_PRODUCT,
  LIVE_BUILD_QUEUE_PRODUCTS,
  LIVE_BUILD_QUEUE_REL,
  SECOND_QUEUE_FORBIDDEN,
  NEW_QUEUE_FORBIDDEN,
  PRINT_INVENTION_FORBIDDEN,
  isCanonicalLiveQueuePath,
  isLiveQueueLocation,
  isLiveQueueProduct,
  normalizeQueueRel,
} from '../config/live-build-queue.js';

export {
  LIVE_BUILD_QUEUE_PRODUCT,
  LIVE_BUILD_QUEUE_PRODUCTS,
  LIVE_BUILD_QUEUE_REL,
  SECOND_QUEUE_FORBIDDEN,
  NEW_QUEUE_FORBIDDEN,
  PRINT_INVENTION_FORBIDDEN,
  isCanonicalLiveQueuePath,
  isLiveQueueLocation,
  isLiveQueueProduct,
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const STEP_STATUS = Object.freeze({
  PENDING: 'pending',
  BUILDING: 'building',
  DONE: 'done',
  BLOCKED: 'blocked',
  SKIPPED: 'skipped',
  FOUNDER_GATED: 'founder_gated',
});

export function liveQueuePathForbidden(filePath) {
  const rel = String(filePath || '').replace(/\\/g, '/');
  const product = rel.match(/docs\/products\/([^/]+)\/BUILD_QUEUE\.json$/);
  if (product && !isLiveQueueProduct(product[1])) return product[1];
  const project = rel.match(/docs\/projects\/([^/]+(?:\/[^/]+)?)\/BUILD_QUEUE\.json$/);
  if (project) return project[1];
  const archived = rel.match(/docs\/history\/product-build-queues\/([^/]+)\/BUILD_QUEUE\.json$/);
  if (archived) return `archived:${archived[1]}`;
  return null;
}

export function assertLiveBuildQueuePath(filePath) {
  const other = liveQueuePathForbidden(filePath);
  if (!other) return;
  throw new Error(
    `${SECOND_QUEUE_FORBIDDEN}: live BUILD_QUEUEs are only ${LIVE_BUILD_QUEUE_PRODUCTS.map((id) => `docs/products/${id}/BUILD_QUEUE.json`).join(' + ')}. Refused '${other}'. Archived at docs/history/product-build-queues/. This is supposed to break.`,
  );
}

export function listForbiddenLiveQueueFiles(root = ROOT) {
  const found = [];
  const productsDir = path.join(root, 'docs/products');
  try {
    for (const name of fs.readdirSync(productsDir, { withFileTypes: true })) {
      if (!name.isDirectory()) continue;
      const p = path.join(productsDir, name.name, 'BUILD_QUEUE.json');
      if (!isLiveQueueProduct(name.name) && fs.existsSync(p)) found.push(path.relative(root, p));
    }
  } catch { /* missing products dir */ }
  const projectsDir = path.join(root, 'docs/projects');
  try {
    const walk = (dir) => {
      for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
        const abs = path.join(dir, name.name);
        if (name.isDirectory()) walk(abs);
        else if (name.name === 'BUILD_QUEUE.json') found.push(path.relative(root, abs));
      }
    };
    if (fs.existsSync(projectsDir)) walk(projectsDir);
  } catch { /* missing */ }
  return found;
}

export function assertNoSecondLiveQueueOnDisk(root = ROOT) {
  const extra = listForbiddenLiveQueueFiles(root);
  if (!extra.length) return;
  throw new Error(
    `${SECOND_QUEUE_FORBIDDEN}: extra live queues on disk:\n${extra.join('\n')}\nOnly ${LIVE_BUILD_QUEUE_PRODUCTS.map((id) => `docs/products/${id}/BUILD_QUEUE.json`).join(' + ')} may exist. Move the rest to docs/history/product-build-queues/.`,
  );
}

export function assertBuildQueueMayBeWritten(filePath, { creating = false } = {}) {
  assertLiveBuildQueuePath(filePath);
  if (!creating) return;
  // Only forbid *minting* a live-queue-shaped path (docs/products/**/BUILD_QUEUE.json
  // or docs/projects/**/BUILD_QUEUE.json) that isn't the canonical one. The canonical
  // file's own first-ever creation must be allowed, and paths outside the live-queue
  // location pattern entirely (e.g. an isolated tmp dir a test writes to) are not a
  // second manufacturing queue and were never what this guard is meant to catch.
  if (isCanonicalLiveQueuePath(filePath) || !isLiveQueueLocation(filePath)) return;
  const rel = normalizeQueueRel(filePath);
  throw new Error(
    `${NEW_QUEUE_FORBIDDEN}: refused to mint '${rel}'. There is one manufacturing queue at ${LIVE_BUILD_QUEUE_REL} — enroll BP slices into it; do not create another BUILD_QUEUE.json. This is supposed to break.`,
  );
}

export function assertNoNewBuildQueueInCommit(fileEntries, { trackedSet = new Set() } = {}) {
  const entries = Array.isArray(fileEntries) ? fileEntries : [];
  const blocked = [];
  for (const entry of entries) {
    if (!entry || entry.delete === true || entry.op === 'delete' || entry.sha === null) continue;
    const rel = normalizeQueueRel(entry.path || entry.target_file || '');
    if (!rel.endsWith('BUILD_QUEUE.json')) continue;
    if (!isLiveQueueLocation(rel) && !rel.endsWith('/BUILD_QUEUE.json')) continue;
    if (!isLiveQueueLocation(rel)) continue;
    if (!isCanonicalLiveQueuePath(rel)) {
      blocked.push(rel);
    }
  }
  if (!blocked.length) return;
  throw new Error(
    `${NEW_QUEUE_FORBIDDEN}: commit refused — unauthorized BUILD_QUEUE.json. Refused:\n${blocked.join('\n')}\nOnly updates to ${LIVE_BUILD_QUEUE_REL} are legal. Enroll other projects as steps in that one queue (from their BPs). This is supposed to break.`,
  );
}

/**
 * Locate a product's BUILD_QUEUE.json from its id. Deterministic, no network.
 */
export function queuePathForProduct(productId) {
  return path.join(ROOT, 'docs/products', String(productId), 'BUILD_QUEUE.json');
}

export function loadBuildQueue(productId, { root = ROOT } = {}) {
  const p = productId.endsWith('.json')
    ? productId
    : path.join(root, 'docs/products', String(productId), 'BUILD_QUEUE.json');
  assertLiveBuildQueuePath(p);
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  return normalizeQueue(raw, p);
}

export function normalizeQueue(raw, sourcePath = null) {
  if (!raw || raw.schema !== 'product_build_queue_v1') {
    throw new Error('BUILD_QUEUE.json must have schema "product_build_queue_v1"');
  }
  const steps = Array.isArray(raw.steps) ? raw.steps : [];
  const ids = new Set();
  for (const s of steps) {
    if (!s.id) throw new Error('every build-queue step needs an id');
    if (ids.has(s.id)) throw new Error(`duplicate build-queue step id: ${s.id}`);
    ids.add(s.id);
    if (!s.target_file) throw new Error(`step ${s.id} needs a target_file`);
    // Done/cancelled/skipped steps are history — do not require a rebuild task
    // (conductor-completed queues were poisoning never-stop discover with parse errors).
    const status = String(s.status || STEP_STATUS.PENDING).toLowerCase();
    const terminal = status === 'done' || status === 'cancelled' || status === 'skipped';
    if (!s.task && !terminal) throw new Error(`step ${s.id} needs a task`);
    if (!s.status) s.status = STEP_STATUS.PENDING;
    if (typeof s.attempts !== 'number') s.attempts = 0;
    if (typeof s.same_signature_count !== 'number') s.same_signature_count = 0;
  }
  return { ...raw, steps, _sourcePath: sourcePath };
}

/**
 * ARTIFACT PROOF — kill false DONE when commit_sha exists but the file does not
 * satisfy the step's declared expectations (file_contains / expected_exports / route).
 * Pure enough for unit tests: inject readFile / http / importModule.
 *
 * Returns { ok, applicable, reason?, results? }.
 * - applicable:false when the step declares nothing checkable (non-server docs etc.)
 * - ok:false when declared expectations fail (blocks DONE)
 */
export async function evaluateStepExpectations(step, {
  root = ROOT,
  readFile,
  http,
  importModule,
  commitSha = null,
} = {}) {
  const target = String(step?.target_file || '').replace(/\\/g, '/');
  if (!target) return { ok: false, applicable: true, reason: 'missing_target_file' };

  // Only enforce when the step DECLARED something checkable. Empty declarations
  // stay applicable:false so legacy queues without expected_exports keep moving;
  // the false-done class we kill is "declared file_contains but never checked."
  const hasDeclared =
    (Array.isArray(step?.expected_exports) && step.expected_exports.length > 0)
    || (Array.isArray(step?.file_contains) && step.file_contains.length > 0)
    || Boolean(step?.route)
    || (step?.assertion_spec && typeof step.assertion_spec === 'object' && Object.keys(step.assertion_spec).length > 0)
    || (Array.isArray(step?.behavior_assertions) && step.behavior_assertions.length > 0);
  if (!hasDeclared) {
    return { ok: true, applicable: false, reason: 'no_declared_expectations' };
  }

  const authored = authorAssertionsFromSpec(step);
  if (!authored.ok) {
    return { ok: false, applicable: true, reason: authored.reason || 'declared_expectations_unusable' };
  }
  if (!authored.assertions.length) {
    if (authored.reason === 'no_proof_required_non_server_code') {
      return { ok: true, applicable: false, reason: authored.reason };
    }
    return { ok: false, applicable: true, reason: authored.reason || 'declared_expectations_unusable' };
  }

  const defaultRead = async (rel) => {
    const relPath = String(rel || target).replace(/\\/g, '/');
    // When proving a commit_sha, read THAT tree only — never fall through to a
    // dirty workspace that already has a later repair (gv-boot-wire false-done class).
    if (commitSha) {
      const { execFileSync } = await import('node:child_process');
      try {
        return execFileSync('git', ['show', `${commitSha}:${relPath}`], {
          cwd: root,
          encoding: 'utf8',
          maxBuffer: 4 * 1024 * 1024,
        });
      } catch (gitErr) {
        // Railway shallow clones often lack the object → every assertion becomes
        // assertion_threw and the step blocks forever. Prefer GitHub Contents API
        // for that exact SHA; only then fall back to workspace when HEAD matches.
        const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
        const repo = (process.env.GITHUB_REPO || process.env.GITHUB_REPOSITORY || 'LimitlessOI/Lumin-LifeOS').trim();
        if (token && repo) {
          const url = `https://api.github.com/repos/${repo}/contents/${relPath}?ref=${encodeURIComponent(commitSha)}`;
          const res = await fetch(url, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github.raw',
              'User-Agent': 'lumin-artifact-proof',
            },
          });
          if (res.ok) return await res.text();
        }
        let head = '';
        try {
          head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
        } catch {
          head = '';
        }
        if (head && (head === commitSha || head.startsWith(commitSha) || commitSha.startsWith(head.slice(0, 12)))) {
          return fs.readFileSync(path.join(root, relPath), 'utf8');
        }
        // Railway containers often have no usable .git and GitHub Contents can
        // 404 on older SHAs. The deployed workspace IS the served tree — read
        // disk as last resort so artifact proof is not permanently assertion_threw.
        const abs = path.join(root, relPath);
        if (fs.existsSync(abs)) {
          return fs.readFileSync(abs, 'utf8');
        }
        const err = new Error(`git_show_failed:${String(gitErr?.message || gitErr).slice(0, 180)}`);
        throw err;
      }
    }
    return fs.readFileSync(path.join(root, relPath), 'utf8');
  };

  const defaultImportModule = async (rel) => {
    const relPath = String(rel || target).replace(/\\/g, '/');
    // When a commit_sha is being proven, do NOT trust the local checkout: the
    // container may lag origin/main by many queue-status commits and hold a stale
    // or unrelated version of the file. Always read from the proven commit and
    // import a temp file so artifact proof evaluates the built artifact, not disk.
    const abs = path.join(root, relPath);
    if (!commitSha && fs.existsSync(abs)) {
      try {
        return await import(pathToFileURL(abs).href);
      } catch { /* fall through to temp-file import */ }
    }
    try {
      const content = await defaultRead(relPath);
      if (typeof content !== 'string') return undefined;
      // Create the temp file inside the repo so relative `../services/...` imports
      // resolve to real repo files instead of the OS temp directory (where the
      // import would look for `/tmp/services/...` and fail).
      const tmpDir = fs.mkdtempSync(path.join(root, '.lumin-import-'));
      const tmpFile = path.join(tmpDir, `${path.basename(relPath, path.extname(relPath))}.mjs`);
      fs.writeFileSync(tmpFile, content, 'utf8');
      try {
        return await import(pathToFileURL(tmpFile).href);
      } finally {
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
      }
    } catch {
      return undefined;
    }
  };

  const runner = {
    readFile: typeof readFile === 'function' ? readFile : defaultRead,
    http: typeof http === 'function' ? http : undefined,
    importModule: typeof importModule === 'function' ? importModule : defaultImportModule,
  };

  // Only run assertions we can prove here. HTTP/DB need live runners — those stay
  // on verify_script / moduleHealthFn. Artifact proof owns file/export content.
  const runnable = authored.assertions.filter((a) => {
    if (a.type === 'file_contains' || a.type === 'exports_smoke') return true;
    if (a.type === 'function_behavior_test' && typeof runner.importModule === 'function') return true;
    if ((a.type === 'http_status' || a.type === 'module_mounts') && typeof runner.http === 'function') return true;
    if (a.type === 'db_row_exists' && typeof runner.db === 'function') return true;
    return false;
  });
  if (!runnable.length) {
    return { ok: true, applicable: false, reason: 'declared_expectations_need_live_runners' };
  }

  const results = await runBehaviorAssertions(runnable, runner);
  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    const detail = failed.map((r) => r.reason || r.substring || r.assertion?.type).join('; ');
    return {
      ok: false,
      applicable: true,
      reason: `artifact_proof_failed: ${detail}`.slice(0, 800),
      results,
    };
  }
  return { ok: true, applicable: true, reason: 'artifact_proof_pass', results };
}
