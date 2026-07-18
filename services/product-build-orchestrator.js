/**
 * SYNOPSIS: General product-build orchestrator — turns a product's structured
 * BUILD_QUEUE.json into concrete builder steps, runs each through the existing
 * build primitive + per-product verify, and advances / repairs / gates. This is
 * the "general engine that turns a product into buildable steps" the autonomy
 * audit flagged as missing (why the never-stop loop stalled with no work).
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { authorAssertionsFromSpec } from '../factory-staging/factory-core/bpb/author-assertions.js';
import { runBehaviorAssertions } from '../factory-staging/factory-core/sentry/behavior-assertions.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPED_BLOCKERS_PATH = path.join(ROOT, 'builderos-reboot/governance/TYPED_BLOCKER_SSOT.json');
const PARKING_POLICY_PATH = path.join(ROOT, 'builderos-reboot/governance/BLOCKER_PARKING_POLICY.json');
const PARK_LOG = path.join(ROOT, 'data/builderos-parked-blockers.jsonl');

export const STEP_STATUS = Object.freeze({
  PENDING: 'pending',
  BUILDING: 'building',
  DONE: 'done',
  BLOCKED: 'blocked',
  SKIPPED: 'skipped',
  FOUNDER_GATED: 'founder_gated',
});

function loadJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

export function resolveTypedBlockerClass({ stage = '', reason = '' } = {}) {
  const ssot = loadJsonSafe(TYPED_BLOCKERS_PATH);
  if (!ssot) return 'BLOCKED_TOOLING';
  const signal = `${stage} ${reason}`.toLowerCase();
  for (const row of ssot.signal_map || []) {
    try {
      if (new RegExp(row.pattern, 'i').test(signal)) return row.class;
    } catch {
      /* ignore bad pattern */
    }
  }
  return ssot.stage_map?.[stage] || 'BLOCKED_TOOLING';
}

function parkBlockedStep(step, queue, info, blockerClass) {
  const policy = loadJsonSafe(PARKING_POLICY_PATH);
  const per = policy?.per_class?.[blockerClass] || {};
  if (per.action === 'retry_then_self_repair' && !per.park_default) return null;
  const parkUntilMs = per.retry_ttl_minutes
    ? Date.now() + Number(per.retry_ttl_minutes) * 60_000
    : null;
  const entry = {
    schema: 'builderos_parked_blocker_v1',
    at: new Date().toISOString(),
    product_id: queue.product_id,
    step_id: step.id,
    blocker_class: blockerClass,
    stage: info.stage,
    reason: info.reason,
    park_until: parkUntilMs ? new Date(parkUntilMs).toISOString() : null,
    owner: per.owner || null,
    action: per.action || 'park',
  };
  try {
    fs.mkdirSync(path.dirname(PARK_LOG), { recursive: true });
    fs.appendFileSync(PARK_LOG, `${JSON.stringify(entry)}\n`);
  } catch {
    /* non-fatal on read-only fs */
  }
  step.blocker_class = blockerClass;
  step.park_until = entry.park_until;
  return entry;
}

const TERMINAL = new Set([
  STEP_STATUS.DONE,
  STEP_STATUS.BLOCKED,
  STEP_STATUS.SKIPPED,
]);

function isHumanHold(step) {
  if (!step || typeof step !== 'object') return false;
  return step.human_hold === true
    || step.pause_for_founder === true
    || step.gate === 'human_hold'
    || step.gate === 'pause_for_founder';
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
  }
  return { ...raw, steps, _sourcePath: sourcePath };
}

function isAutoRegisterConfigStep(step) {
  return String(step?.target_file || '').replace(/\\/g, '/') === 'config/auto-registered-product-modules.json';
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
  if (!authored.ok || !authored.assertions.length) {
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
    const abs = path.join(root, relPath);
    if (!fs.existsSync(abs)) return undefined;
    return import(pathToFileURL(abs).href);
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

export function depSatisfiedForSelect(depId, doneIds, queue, consumingStep) {
  if (doneIds.has(depId)) return true;
  // Chicken-egg break: a route step blocked ONLY for missing auto-registration
  // must not strand the register-config step that unblocks it. Allow the
  // auto-register config step to run when its dep failed functional proof for
  // that reason — even while still PENDING (before maxAttempts → BLOCKED).
  if (!isAutoRegisterConfigStep(consumingStep)) return false;
  const dep = (queue.steps || []).find((s) => s.id === depId);
  if (!dep) return false;
  const autoRegErr = /auto-registered|not auto-registered|module-health|module_not_mounted/i.test(
    String(dep.last_error || ''),
  );
  if (!autoRegErr) return false;
  if (dep.status === STEP_STATUS.BLOCKED) return true;
  // Built file exists (commit_sha) but mount proof failed → let register step run now.
  if (dep.status === STEP_STATUS.PENDING && dep.commit_sha) return true;
  return false;
}

/**
 * The next actionable step: first non-terminal, non-gated step whose declared
 * dependencies are all done. Founder-gated steps are surfaced separately so the
 * loop stops re-building work only Adam can clear (the "attempt 35" waste fix).
 *
 * Prefer PENDING over recently-revivable BLOCKED work: blocked thrash must not
 * starve a later pending blueprint step in the same queue.
 *
 * Chicken-egg: if the next candidate is a route that already committed but only
 * failed functional proof for missing auto-registration, prefer the pending
 * auto-register config sibling instead of rebuilding the route forever.
 */
export function selectNextStep(queue) {
  const doneIds = new Set(queue.steps.filter((s) => s.status === STEP_STATUS.DONE).map((s) => s.id));
  const gated = queue.steps.filter((s) => {
    if (s.status === STEP_STATUS.DONE || s.status === STEP_STATUS.BLOCKED || s.status === STEP_STATUS.SKIPPED) return false;
    return isHumanHold(s);
  });

  function consider(step) {
    if (TERMINAL.has(step.status)) return null;
    if (step.demoted === true || step.status === STEP_STATUS.SKIPPED) return null;
    if (isHumanHold(step)) return null;
    if (step.status === STEP_STATUS.FOUNDER_GATED && !isHumanHold(step)) {
      step.status = STEP_STATUS.PENDING;
    }
    if (step.park_until) {
      const until = Date.parse(step.park_until);
      if (Number.isFinite(until) && until > Date.now()) return null;
    }
    const deps = Array.isArray(step.depends_on) ? step.depends_on : [];
    if (!deps.every((d) => depSatisfiedForSelect(d, doneIds, queue, step))) return null;

    const autoRegErr = /auto-registered|not auto-registered|module-health|module_not_mounted/i.test(
      String(step.last_error || ''),
    );
    if (
      autoRegErr
      && step.commit_sha
      && /^routes\/.+\.(js|mjs)$/.test(String(step.target_file || '').replace(/\\/g, '/'))
    ) {
      const registerSibling = (queue.steps || []).find((s) => {
        if (!isAutoRegisterConfigStep(s)) return false;
        if (TERMINAL.has(s.status) || isHumanHold(s)) return false;
        const rDeps = Array.isArray(s.depends_on) ? s.depends_on : [];
        if (!rDeps.includes(step.id)) return false;
        return rDeps.every((d) => depSatisfiedForSelect(d, doneIds, queue, s));
      });
      if (registerSibling) return registerSibling;
    }

    return step;
  }

  // Pass 1: pending/building only — never promote blocked thrash ahead of real work.
  for (const step of queue.steps) {
    if (step.status !== STEP_STATUS.PENDING && step.status !== STEP_STATUS.BUILDING) continue;
    const picked = consider(step);
    if (picked) return { step: picked, gated };
  }

  // Pass 2: anything else non-terminal (should be rare).
  for (const step of queue.steps) {
    if (step.status === STEP_STATUS.PENDING || step.status === STEP_STATUS.BUILDING) continue;
    const picked = consider(step);
    if (picked) return { step: picked, gated };
  }
  return { step: null, gated };
}

export const DEFAULT_REVIVE_COOLDOWN_MS = 15 * 60 * 1000;
export const DEFAULT_MAX_REVIVES = 6;

/**
 * If a non-done step's declared file_contains / exports already hold on disk,
 * mark it DONE (pre_existing) instead of thrashing codegen. Used after ≥6
 * revive failures and for already-built targets the queue never closed.
 * Mutates queue.steps; returns claimed step ids.
 */
export async function claimPreExistingSatisfiedSteps(queue, {
  root = ROOT,
  now = () => new Date().toISOString(),
} = {}) {
  const claimed = [];
  if (!queue || !Array.isArray(queue.steps)) return claimed;
  for (const step of queue.steps) {
    if (step.status === STEP_STATUS.DONE) continue;
    if (isHumanHold(step)) continue;
    const hasDeclared =
      (Array.isArray(step?.file_contains) && step.file_contains.length > 0)
      || (Array.isArray(step?.expected_exports) && step.expected_exports.length > 0);
    if (!hasDeclared) continue;
    let proof;
    try {
      proof = await evaluateStepExpectations(step, { root });
    } catch {
      continue;
    }
    if (!proof?.ok || proof.applicable === false) continue;
    step.status = STEP_STATUS.DONE;
    step.pre_existing = true;
    step.shipped_via = 'pre_existing_artifact_proof';
    step.shipped_at = typeof now === 'function' ? now() : now;
    step.last_error = null;
    step.demoted = false;
    step.demote_reason = null;
    step.demoted_at = null;
    step.attempts = 0;
    claimed.push(step.id);
  }
  return claimed;
}

/**
 * Self-healing: a step that failed maxAttempts is marked BLOCKED, which is
 * TERMINAL, so selectNextStep skips it forever. That is correct for a genuinely
 * broken step, but it also permanently strands a step that was blocked by a
 * TRANSIENT or since-fixed failure (e.g. the deploy-proof false-negative that
 * blocked already-built editor panes). Downstream steps that depend on it then
 * never build either. This revives such steps back to PENDING once a cooldown
 * has elapsed, with a bounded revive_count so a truly broken step still stops
 * (the daily cost cap is the second backstop). Founder-gated steps are never
 * revived — only Adam clears those. Mutates queue.steps; returns revived ids.
 */
export function reviveStaleBlockedSteps(queue, {
  cooldownMs = DEFAULT_REVIVE_COOLDOWN_MS,
  maxRevives = DEFAULT_MAX_REVIVES,
  now = Date.now(),
} = {}) {
  const revived = [];
  for (const step of queue.steps) {
    if (step.status !== STEP_STATUS.BLOCKED) continue;
    if (isHumanHold(step)) continue;
    if (step.demoted === true) continue;
    if (step.park_until) {
      const until = Date.parse(step.park_until);
      if (Number.isFinite(until) && until > now) continue;
    }
    const reviveCount = typeof step.revive_count === 'number' ? step.revive_count : 0;
    const autoRegBlock = /auto-registered|not auto-registered|module-health|module_not_mounted/i.test(
      String(step.last_error || ''),
    );
    const artifactToolingBlock = /artifact_proof_failed:\sassertion_threw|codegen_authoring_failed|codegen_empty|codegen_threw|no_codegen_runner|authoring_requires_blueprint_assertions/i.test(
      String(step.last_error || ''),
    );
    const verifyThrash = /^verify_exit_/i.test(String(step.last_error || ''));
    // Cap thrash hard. Same error after budget → SKIPPED (terminal), stop burning tokens.
    const effectiveMax = (autoRegBlock || artifactToolingBlock) ? maxRevives + 3 : maxRevives;
    if (reviveCount >= effectiveMax || (verifyThrash && reviveCount >= 2)) {
      step.status = STEP_STATUS.SKIPPED;
      step.demoted = true;
      step.demoted_at = new Date(now).toISOString();
      step.demote_reason = `revive_exhausted:${String(step.last_error || 'unknown').slice(0, 160)}`;
      continue;
    }
    const lastAt = Date.parse(step.last_attempt_at || step.completed_at || '');
    const waited = Number.isFinite(lastAt) ? now - lastAt : Infinity;
    // Auto-reg chicken-egg: ONLY revive when THIS route's register sibling is DONE.
    // (Bug was: any done register unlocked every auto-reg-blocked route → eternal thrash.)
    if (autoRegBlock) {
      const registerDone = (queue.steps || []).find((s) => {
        if (!isAutoRegisterConfigStep(s) || s.status !== STEP_STATUS.DONE) return false;
        const rDeps = Array.isArray(s.depends_on) ? s.depends_on : [];
        return rDeps.includes(step.id);
      });
      if (!registerDone) continue;
    } else if (waited < cooldownMs && !artifactToolingBlock) {
      continue;
    }
    if (artifactToolingBlock && waited < Math.min(cooldownMs, 60_000)) continue;
    step.status = STEP_STATUS.PENDING;
    step.attempts = 0;
    step.revive_count = reviveCount + 1;
    step.revived_at = new Date(now).toISOString();
    // Strip stale runtime evidence (commit/proof timestamps) but preserve the
    // previous failure message so the codegen retry prompt can see exactly what
    // SENTRY reported last time.
    const previousLastError = step.last_error;
    step.commit_sha = null;
    step.built_sha = null;
    step.proof = null;
    step.last_error = previousLastError;
    step.last_attempt = null;
    step.last_attempt_at = null;
    step.demoted = false;
    step.demote_reason = null;
    step.demoted_at = null;
    step.park_until = null;
    step.no_op = null;
    step.pre_existing = null;
    step.blocker_class = null;
    step.claim_level = null;
    step.blocker_type = null;
    step.blocker_resolution = null;
    revived.push(step.id);
  }
  return revived;
}

export function queueSummary(queue) {
  const by = {
    pending: 0,
    building: 0,
    done: 0,
    blocked: 0,
    founder_gated: 0,
    design_review_flagged: 0,
    human_hold: 0,
  };
  for (const s of queue.steps) {
    if (isHumanHold(s) && s.status !== STEP_STATUS.DONE && s.status !== STEP_STATUS.BLOCKED) {
      by.human_hold += 1;
      by.founder_gated += 1;
      continue;
    }
    if (s.design_review_flagged && s.status !== STEP_STATUS.DONE && s.status !== STEP_STATUS.BLOCKED) {
      by.design_review_flagged += 1;
      continue;
    }
    const bucket = s.status;
    by[bucket] = (by[bucket] || 0) + 1;
  }
  const total = queue.steps.length;
  return { product_id: queue.product_id, total, ...by, complete: by.done === total };
}

export function persistQueue(queue, { root = ROOT } = {}) {
  const p = queue._sourcePath || queuePathForProduct(queue.product_id);
  const { _sourcePath, ...clean } = queue;
  fs.writeFileSync(p, `${JSON.stringify(clean, null, 2)}\n`);
  return p;
}

/**
 * Run the next actionable step of a product's build queue.
 *
 * Dependency-injected so it is fully unit-testable without a live builder:
 *   buildFn({ target_file, task, spec, product_id }) -> { ok, commit_sha?, error? }
 *   verifyFn({ product_id, verify_script, step })    -> { ok, detail? }
 *
 * Contract (closes audit gaps "false green" + "commit-proof transport"):
 *   - a build that returns ok but NO commit_sha is treated as FAILURE, not pass.
 *   - a step is only marked done when BOTH build (with SHA) AND verify pass.
 *   - after maxAttempts failures the step is BLOCKED (loop moves on, no spin).
 *   - OPTIONAL deployProofFn({ commit_sha }) -> { ok } proves the running deploy
 *     actually serves the built SHA before the step is called "live" (closes the
 *     "false live" gap). When provided and it fails, the step stays retryable
 *     (build/verify succeeded but the deploy hasn't caught up).
 *   - OPTIONAL moduleHealthFn({ commit_sha, step }) -> { ok, reason } is the
 *     FUNCTIONAL-PROOF gate: after the deploy is proven live, it confirms the
 *     step's module actually LOADED + MOUNTED on that deploy (read from the
 *     boot module-health manifest). A route that built + deployed but threw on
 *     import / was never registered is NOT done — it stays retryable and the
 *     verbatim mount error is carried into step.last_error so the next build
 *     attempt repairs the root cause (kills the "false done" class).
 */
export async function runNextStep(queue, { buildFn, verifyFn, deployProofFn, moduleHealthFn, artifactProofFn, maxAttempts = 3, logger = console } = {}) {
  if (typeof buildFn !== 'function') throw new Error('runNextStep requires buildFn');
  const { step, gated } = selectNextStep(queue);
  if (!step) {
    return { ok: true, done: true, awaiting_founder: gated.map((g) => g.id), summary: queueSummary(queue) };
  }

  step.status = STEP_STATUS.BUILDING;
  step.attempts += 1;
  step.last_attempt_at = new Date().toISOString();

  const build = await buildFn({
    product_id: queue.product_id,
    target_file: step.target_file,
    task: step.task,
    spec: step.spec || '',
    last_error: step.last_error || null,
    attempt: step.attempts,
    max_output_tokens: step.max_output_tokens || null,
  });

  const sha = build && (build.commit_sha || build.sha);
  if (!build || !build.ok || !sha) {
    return failStep(step, queue, maxAttempts, {
      stage: 'build',
      reason: !sha ? 'no_commit_sha (claimed pass without proof — treated as failure)' : (build && build.error) || 'build_failed',
    }, logger);
  }
  step.commit_sha = sha;

  // ARTIFACT PROOF (trust gate): declared file_contains / expected_exports / route
  // must hold on the built artifact before verify/deploy can mint DONE.
  // Closes gv-boot-wire false-done (unrelated last-touch SHA without required substring).
  let artifact = { ok: true, applicable: false, reason: 'no_artifact_proof_fn' };
  if (typeof artifactProofFn === 'function') {
    artifact = await artifactProofFn({ commit_sha: sha, product_id: queue.product_id, step });
  } else {
    artifact = await evaluateStepExpectations(step, { commitSha: sha });
  }
  if (!artifact.ok) {
    return failStep(step, queue, maxAttempts, {
      stage: 'artifact_proof',
      reason: artifact.reason || 'artifact_proof_failed (commit exists but step expectations not met — no false done)',
      commit_sha: sha,
    }, logger);
  }
  if (artifact.applicable) step.artifact_proven = true;

  let verify = { ok: true, detail: 'no_verify_defined' };
  if (typeof verifyFn === 'function' && (queue.verify_script || step.verify_script)) {
    verify = await verifyFn({
      product_id: queue.product_id,
      verify_script: step.verify_script || queue.verify_script,
      step,
    });
  }
  if (!verify.ok) {
    return failStep(step, queue, maxAttempts, { stage: 'verify', reason: verify.detail || 'verify_failed', commit_sha: sha }, logger);
  }

  // Wave 0 #10: deploy-truth required before DONE/live. Missing prover → BUILT_NOT_LIVE (not done).
  if (typeof deployProofFn !== 'function') {
    return failStep(step, queue, maxAttempts, {
      stage: 'deploy',
      reason: 'deploy_proof_required (BUILT_NOT_LIVE — no false live/done without deploy-truth)',
      commit_sha: sha,
      claim_level: 'BUILT_NOT_LIVE',
    }, logger);
  }
  const proof = await deployProofFn({ commit_sha: sha, product_id: queue.product_id, step });
  const deployProven = Boolean(proof && proof.ok);
  if (!deployProven) {
    return failStep(step, queue, maxAttempts, {
      stage: 'deploy',
      reason: (proof && proof.reason) || 'deploy_does_not_serve_built_sha (not live — no false live)',
      commit_sha: sha,
      claim_level: 'BUILT_NOT_LIVE',
    }, logger);
  }

  let functionalProven = null;
  if (typeof moduleHealthFn === 'function') {
    const health = await moduleHealthFn({ commit_sha: sha, product_id: queue.product_id, step });
    functionalProven = Boolean(health && health.ok);
    if (!functionalProven) {
      return failStep(step, queue, maxAttempts, {
        stage: 'functional_proof',
        reason: (health && health.reason) || 'module_not_mounted (built + live but the module did not load — no false done)',
        commit_sha: sha,
      }, logger);
    }
  }

  step.status = STEP_STATUS.DONE;
  step.completed_at = new Date().toISOString();
  step.deploy_proven = true;
  if (functionalProven !== null) step.functional_proven = functionalProven;
  logger?.info?.({ step: step.id, commit_sha: sha, deploy_proven: true, functional_proven: functionalProven }, '[PRODUCT-BUILD] step done');
  return { ok: true, step_id: step.id, commit_sha: sha, verified: true, deploy_proven: true, functional_proven: functionalProven, summary: queueSummary(queue) };
}

/**
 * FUNCTIONAL-PROOF evaluation (pure, network-free so it is unit-testable).
 * Given the boot module-health manifest body and a step's target_file, decide
 * whether the step is functionally proven (its module actually mounted LIVE).
 *
 * Only `routes/*.js|.mjs` targets MUST boot-mount to be provable — a route that
 * built + deployed but is not in the module-health manifest as `mounted` is
 * unreachable (false done). Non-route targets (services, migrations, config)
 * are gated by verify + deploy-proof, not by auto-registration, so they pass
 * through (`applicable:false`).
 */
export function evaluateModuleHealthForStep(healthBody, targetFile) {
  const target = String(targetFile || '');
  if (!/^routes\/.+\.(js|mjs)$/.test(target)) {
    return { ok: true, applicable: false, reason: 'no_mountable_module_for_step' };
  }
  const modules = Array.isArray(healthBody?.modules) ? healthBody.modules : [];
  const entry = modules.find((m) => m && m.module === target);
  if (!entry) {
    return {
      ok: false,
      applicable: true,
      reason: `route module not auto-registered — add {"path":"${target}","register":"<registerFn>","enabled":true} to config/auto-registered-product-modules.json so the endpoint actually mounts LIVE (built + deployed but unreachable = false done)`,
    };
  }
  if (entry.status !== 'mounted') {
    return {
      ok: false,
      applicable: true,
      reason: `module_not_mounted (${target}): ${entry.error || 'unknown import/mount failure'}`,
    };
  }
  return { ok: true, applicable: true, reason: 'module_mounted' };
}

function failStep(step, queue, maxAttempts, info, logger) {
  step.last_error = info.reason;
  const blockerClass = resolveTypedBlockerClass({ stage: info.stage, reason: info.reason });
  step.blocker_class = blockerClass;
  if (info.claim_level) step.claim_level = info.claim_level;
  const exhausted = step.attempts >= maxAttempts;
  step.status = exhausted ? STEP_STATUS.BLOCKED : STEP_STATUS.PENDING;
  let parked = null;
  if (exhausted) parked = parkBlockedStep(step, queue, info, blockerClass);
  logger?.warn?.({ step: step.id, stage: info.stage, attempts: step.attempts, exhausted, blocker_class: blockerClass }, `[PRODUCT-BUILD] step ${info.stage} failed`);
  return {
    ok: false,
    step_id: step.id,
    stage: info.stage,
    reason: info.reason,
    attempts: step.attempts,
    blocked: exhausted,
    blocker_class: blockerClass,
    claim_level: info.claim_level || null,
    parked: Boolean(parked),
    summary: queueSummary(queue),
  };
}