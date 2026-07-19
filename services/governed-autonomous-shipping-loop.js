/**
 * SYNOPSIS: STEP 5g — the governed AUTONOMOUS shipping loop. When the STEP 5a
 * fence (GOVERNED_FACTORY_ONLY) is ON, the legacy never-stop loop fences itself
 * off, so WITHOUT this loop the system would ship nothing at all. This loop
 * preserves autonomous throughput THROUGH the governed pipe: it plans the
 * shippable BUILD_QUEUE steps across every product (planGovernedBuildQueueRun —
 * proven), ships each product's steps via the already-proven live surface
 * POST /factory/ship-queue (self-HTTP, so it reuses the exact
 * BPB→Builder→SENTRY→TSOS→Historian dispatch + codegen the route wires, with NO
 * duplicated dispatch wiring), then marks the shipped BUILD_QUEUE steps done and
 * commits the shipped files to GitHub so builds survive redeploy.
 * Same token + daily-budget guardrails as never-stop; only ships steps that are
 * provable (the STEP 5e planning gate surfaces the rest as gaps, never shipped).
 * The loop sources work from BUILD_QUEUE.json, which is the executable blueprint
 * per product, and orders products by the founder-owned PRODUCT_BUILD_PRIORITY.json.
 * It only halts for token/budget exhaustion or SENTRY/governance failure.
 *
 * CONDUCTOR-GLUE: pure orchestration of SENTRY-proven primitives
 * (governed-build-queue-scheduler + governed-shipping-runner) and existing
 * queue/guard helpers. It is the factory's own bootstrap rail — the loop that
 * lets the system ship product work cannot itself be shipped by that loop.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createUsefulWorkGuard } from './useful-work-guard.js';
import { governedFactoryOnly } from './governed-factory-guard.js';
import { hasTokenCapacity, dailyBuildBudget, recordDailyBuildAttempts, mergeQueueRuntimeStatus, defaultPlannerCallModel, discoverPlanWork, discoverSentryFixWork, runPlanBuildQueue } from './never-stop-product-factory.js';
import { planGovernedBuildQueueRun } from './governed-build-queue-scheduler.js';
import {
  loadBuildQueue,
  persistQueue,
  normalizeQueue,
  STEP_STATUS,
  claimPreExistingSatisfiedSteps,
  evaluateStepExpectations,
  reviveStaleBlockedSteps,
} from './product-build-orchestrator.js';
import { createDeploymentService } from './deployment-service.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PRODUCTS_DIR = path.join(REPO_ROOT, 'docs/products');
const STATE_FILE = path.join(REPO_ROOT, 'data/governed-autonomous-ship-state.json');

const state = {
  running: false,
  lastFounderAlert: null,
  lastRunAt: null,
  totalRuns: 0,
  lastShipped: 0,
  tokenHaltSince: null,
  lastCommitSha: null,
  lastCommitError: null,
};

let sharedPool = null;

function setSharedPool(pool) {
  sharedPool = pool;
}

async function loadPersistedState() {
  if (sharedPool) {
    try {
      const { rows } = await sharedPool.query(
        "SELECT state FROM governed_autonomous_ship_state WHERE id = 'singleton'"
      );
      if (rows[0]?.state && typeof rows[0].state === 'object') {
        Object.assign(state, rows[0].state);
        return;
      }
    } catch {
      /* non-fatal — fall through to file */
    }
  }
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    const persisted = JSON.parse(raw);
    if (persisted && typeof persisted === 'object') {
      Object.assign(state, persisted);
    }
  } catch {
    /* non-fatal — fresh start */
  }
}

async function persistState() {
  if (sharedPool) {
    try {
      await sharedPool.query(
        `INSERT INTO governed_autonomous_ship_state (id, state, updated_at)
         VALUES ('singleton', $1, now())
         ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = now()`,
        [JSON.stringify(state)]
      );
    } catch {
      /* non-fatal — fall through to file */
    }
  }
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch {
    /* non-fatal */
  }
}

await loadPersistedState();

// Shared queue cache populated by workCheck and consumed by execute so both
// phases use the same merged remote/local BUILD_QUEUE view.
let sharedQueueCache = {};

const TRUTHY = new Set(['1', 'true', 'yes', 'on']);

export function governedAutonomousShippingEnabled() {
  // Hard stops remain FOUNDER_STOP / PAUSE_AUTONOMY (scheduler). The Jul-15
  // FOUNDER_RESUME_AUTONOMY kill-switch is retired — founder mandate is continuous build.
  if (TRUTHY.has(String(process.env.PAUSE_AUTONOMY || '').trim().toLowerCase())) {
    return false;
  }
  const v = String(
    process.env.GOVERNED_AUTONOMOUS_SHIP
    || process.env.BUILDEROS_NEVER_STOP
    || process.env.BUILDEROS_AUTOPILOT
    || '',
  ).trim().toLowerCase();
  return TRUTHY.has(v);
}

function loadProductPriorityOrder() {
  try {
    const raw = fs.readFileSync(path.join(PRODUCTS_DIR, 'PRODUCT_BUILD_PRIORITY.json'), 'utf8');
    const parsed = JSON.parse(raw);
    const priority = Array.isArray(parsed?.priority) ? parsed.priority : [];
    const order = new Map();
    for (let i = 0; i < priority.length; i += 1) order.set(priority[i], i);
    return order;
  } catch { return new Map(); }
}

// Founder-owned income-lane focus. Products listed in PRODUCT_BUILD_PRIORITY.json
// `paused` (or the GOVERNED_AUTONOMOUS_PAUSED_PRODUCTS env, comma-separated) are
// skipped by the autonomous loop so tokens/commits go only to the active revenue
// lane. Default is empty — pausing a product is a founder business decision.
export function loadPausedProducts() {
  const out = new Set();
  const env = String(process.env.GOVERNED_AUTONOMOUS_PAUSED_PRODUCTS || '').trim();
  if (env) for (const p of env.split(',')) { const t = p.trim(); if (t) out.add(t); }
  try {
    const raw = fs.readFileSync(path.join(PRODUCTS_DIR, 'PRODUCT_BUILD_PRIORITY.json'), 'utf8');
    const parsed = JSON.parse(raw);
    const paused = Array.isArray(parsed?.paused) ? parsed.paused : [];
    for (const p of paused) if (typeof p === 'string' && p.trim()) out.add(p.trim());
  } catch { /* no priority file — nothing paused */ }
  return out;
}

export function listProductsWithQueues() {
  try {
    const order = loadProductPriorityOrder();
    const paused = loadPausedProducts();
    const ids = fs.readdirSync(PRODUCTS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .filter((id) => fs.existsSync(path.join(PRODUCTS_DIR, id, 'BUILD_QUEUE.json')));
    return ids.sort((a, b) => {
      const oa = order.get(a);
      const ob = order.get(b);
      if (oa !== undefined && ob !== undefined) return oa - ob;
      if (oa !== undefined) return -1;
      if (ob !== undefined) return 1;
      return a.localeCompare(b);
    });
  } catch {
    return [];
  }
}

function httpBase() {
  // Internal loop calls must hit the same Railway container so the response
  // returns synchronously and SENTRY re-probes the local server after a reload.
  // A public SITE_BASE_URL would load-balance to a peer and the calling loop
  // would lose the shipping outcome.
  return `http://127.0.0.1:${process.env.PORT || 8080}`;
}

function commandKey() {
  return process.env.COMMAND_CENTER_KEY
    || process.env.COMMAND_KEY
    || process.env.COMMAND_CENTER_API_KEY
    || process.env.LIFEOS_TOKEN
    || '';
}

/**
 * Real twin only — never invent governed-autonomous-* blueprint ids (founder law).
 * Product BUILD_QUEUE must carry a registered blueprint_id; steps must cite twin step ids.
 */
function resolveShipTwinAuthority(product_id, ship_steps) {
  const first = Array.isArray(ship_steps) ? ship_steps[0] : null;
  const blueprint_id = String(first?.blueprint_id || '').trim();
  const mission_id = String(first?.mission_id || '').trim();
  if (!blueprint_id) {
    return {
      ok: false,
      status: 'NOT_ON_BLUEPRINT',
      error: `product ${product_id}: ship steps missing registered blueprint_id (synthetic governed-autonomous-* forbidden)`,
    };
  }
  if (/^governed-autonomous-/i.test(blueprint_id)) {
    return {
      ok: false,
      status: 'NOT_ON_BLUEPRINT',
      error: `synthetic_blueprint_id_forbidden:${blueprint_id}`,
    };
  }
  const steps = (Array.isArray(ship_steps) ? ship_steps : []).map((s, i) => ({
    ...s,
    blueprint_id: String(s.blueprint_id || blueprint_id).trim(),
    blueprint_step_id: String(s.blueprint_step_id || s.step_id || `step-${i}`).trim(),
    mission_id: String(s.mission_id || mission_id || '').trim() || undefined,
  }));
  return {
    ok: true,
    mission_id: mission_id || `PRODUCT-${product_id}`,
    blueprint_id,
    steps,
    // Product queue twin is validated by blueprintFollowClaim on disk — not mission pack intake.
    skip_intake_gate: false,
  };
}

async function shipViaGovernedQueue({ product_id, ship_steps }) {
  const auth = resolveShipTwinAuthority(product_id, ship_steps);
  if (!auth.ok) {
    return { status: 422, body: { ok: false, status: auth.status, error: auth.error } };
  }
  try {
    const res = await fetch(`${httpBase()}/factory/ship-queue`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-command-key': commandKey() },
      body: JSON.stringify({
        mission_id: auth.mission_id,
        blueprint_id: auth.blueprint_id,
        steps: auth.steps,
        skip_intake_gate: false,
        claim_following_blueprint: true,
        // LOOP_ESCALATION_CONTRACT: on repeated same-signature failure the loop
        // requests a strategy change — build this step with a stronger model tier
        // instead of re-trying the same one. 0 = default cheapest-tier-first.
        model_escalation: Math.max(
          0,
          ...(Array.isArray(ship_steps) ? ship_steps.map((s) => Number(s?.model_rotation) || 0) : [0]),
        ),
      }),
      signal: AbortSignal.timeout(120_000),
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  } catch (err) {
    return { status: 504, body: { ok: false, error: `ship_timeout:${err.message || err}` } };
  }
}

function deriveFailureReason(body) {
  if (!body) return 'governed_ship_failed';
  // runGovernedShippingQueue nests the dispatch body under `body.body`.
  const inner = body.body || body;
  const evidenceDetail = inner.evidence?.error || inner.evidence?.reason;
  const suffix = evidenceDetail ? `: ${String(evidenceDetail).slice(0, 200)}` : '';
  if (inner.gap_type) return `${inner.gap_type}${suffix}`;

  // SENTRY details are the most actionable feedback for the codegen retry prompt.
  if (inner.sentry) {
    const reasons = [];
    const reviewBlocking = inner.sentry.review?.blocking_findings || inner.sentry.blocking_findings;
    if (Array.isArray(reviewBlocking) && reviewBlocking.length) reasons.push(...reviewBlocking.slice(0, 5));
    const contractFailures = inner.sentry.contract?.failures;
    if (Array.isArray(contractFailures) && contractFailures.length) {
      reasons.push(...contractFailures.slice(0, 5).map((f) => `${f.test_id}: ${f.reason}`));
    }
    const behaviorProof = inner.sentry.verify?.behavior_proof || inner.sentry.behavior_proof;
    const behaviorResults = behaviorProof?.results;
    if (Array.isArray(behaviorResults) && behaviorResults.length) {
      for (const r of behaviorResults.slice(0, 5)) {
        if (r.ok) continue;
        const detail = r.reason || r.error
          || (typeof r.substring === 'string' ? `missing_substring:${r.substring}` : '')
          || (typeof r.observed_status === 'number' ? `observed_status:${r.observed_status}, expected:[${(r.expected_status || []).join(',')}]` : '')
          || (typeof r.observed_rows === 'number' ? `observed_rows:${r.observed_rows}, expected_min:${r.expected_min_rows}` : '')
          || (Array.isArray(r.missing) ? `missing:${r.missing.join(',')}` : '');
        const label = r.assertion_id || r.type || 'behavior_assertion';
        if (detail) reasons.push(`${label}: ${detail}`);
      }
    }
    if (Array.isArray(behaviorProof?.findings) && behaviorProof.findings.length) {
      for (const f of behaviorProof.findings.slice(0, 3)) {
        if (f && !reasons.some((r) => r.includes(String(f)))) reasons.push(String(f));
      }
    }
    const verifyFindings = inner.sentry.verify?.blocking_findings || inner.sentry.verify?.findings;
    if (Array.isArray(verifyFindings) && verifyFindings.length) {
      reasons.push(...verifyFindings.slice(0, 5).map((f) => (typeof f === 'string' ? f : `${f.check || f.id}: ${f.message || f.reason || JSON.stringify(f)}`)));
    }
    if (reasons.length) return `SENTRY_FAILED: ${reasons.join('; ').slice(0, 500)}`;
    if (inner.sentry.implementation_status) return `SENTRY_FAILED: ${inner.sentry.implementation_status}`;
  }

  if (inner.status) return String(inner.status);
  if (inner.error) return String(inner.error);
  if (inner.reason) return String(inner.reason);
  if (body.halted) return body.reason || 'governed_halted';
  if (body.blocked) return body.reason || 'governed_blocked';
  if (body.crashed) return body.error || 'governed_crashed';
  return 'governed_ship_failed';
}

function isPowerOfTwo(n) {
  return Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0;
}

// --- Blueprint reconciliation: LOOP_ESCALATION_CONTRACT enforcement ----------
// The signed contract (builderos-reboot/LOOP_ESCALATION_CONTRACT.json) requires
// counting failure SIGNATURES (not raw attempts) and, when the same signature
// repeats past the hard-stop threshold, raising a FOUNDER ALERT + demanding a
// strategy change instead of silently re-queuing forever. This loop is the
// factory's own bootstrap rail (it cannot be shipped by the factory), so the
// enforcement is wired here directly.
const ESCALATION_CONTRACT_PATH = path.join(REPO_ROOT, 'builderos-reboot/LOOP_ESCALATION_CONTRACT.json');
const FOUNDER_ALERTS_PATH = path.join(REPO_ROOT, 'data/founder-alerts.jsonl');
const KNOWN_BAD_SIGNATURES_REGISTRY_PATH = path.join(REPO_ROOT, 'data/known-bad-signatures-registry.json');
let escalationContractCache = null;

function loadEscalationContract() {
  if (escalationContractCache) return escalationContractCache;
  try {
    escalationContractCache = JSON.parse(fs.readFileSync(ESCALATION_CONTRACT_PATH, 'utf8'));
  } catch {
    escalationContractCache = {
      default_ladder_same_signature: { notice: 3, escalate: 5, hard_stop: 8 },
      class_overrides: {},
      recovery_mission_ref: 'AUTONOMOUS-RECOVERY-0001',
      founder_alert_on_incomplete_recovery: true,
    };
  }
  return escalationContractCache;
}

export function failureSignature(err) {
  return String(err || 'unknown')
    .replace(/[0-9a-f]{7,}/gi, '#')
    .replace(/\d+/g, 'N')
    .slice(0, 180);
}

export function classifyFailure(err) {
  const e = String(err || '').toLowerCase();
  if (e.includes('module_resolution_failed') || e.includes('artifact_missing_after_ship')) return 'fake_green_attempt';
  if (e.includes('not_on_blueprint') || e.includes('synthetic_blueprint') || e.includes('governed_blocked') || e.includes('governance')) return 'governance_block';
  if (e.includes('sentry_failed') || e.includes('evidence')) return 'evidence_gap';
  if (e.includes('authority')) return 'authority_violation';
  return 'same_signature_repeat';
}

export function escalationThresholds(cls) {
  const c = loadEscalationContract();
  return (c.class_overrides && c.class_overrides[cls]) || c.default_ladder_same_signature || { notice: 3, escalate: 5, hard_stop: 8 };
}

function emitFounderAlert(record, logger) {
  const payload = { ts: new Date().toISOString(), source: 'GOVERNED-AUTONOMOUS-SHIP', ...record };
  try {
    fs.appendFileSync(FOUNDER_ALERTS_PATH, `${JSON.stringify(payload)}\n`);
  } catch { /* alert file best-effort; state + log still carry it */ }
  state.lastFounderAlert = payload;
  persistState().catch(() => {});
  logger?.error?.(payload, '[GOVERNED-AUTONOMOUS-SHIP] FOUNDER ALERT (last resort) — automatic model-rotation recovery exhausted; step marked UNSOLVED');
}

// Blueprint ship-verify (SO-002): import-resolution proof in a child process so
// a shipped route/service that imports a missing module or export (boot-crash
// risk, e.g. a route importing a service that does not exist) is caught here
// instead of shipping red. Matches tests/spine-import-resolution semantics.
export function verifyModuleResolves(absFile) {
  try {
    const url = pathToFileURL(absFile).href;
    execFileSync(
      process.execPath,
      ['--input-type=module', '-e', `import(${JSON.stringify(url)}).then(()=>process.exit(0)).catch((e)=>{console.error(e&&e.message?e.message:e);process.exit(1)})`],
      {
        stdio: 'pipe',
        timeout: 30_000,
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL || 'postgres://u:p@127.0.0.1:5432/dummy',
          NODE_ENV: process.env.NODE_ENV || 'production',
        },
      },
    );
    return { ok: true };
  } catch (err) {
    const stderr = err?.stderr ? err.stderr.toString() : '';
    const line = stderr.split('\n').find((l) => /Error|Cannot find|does not provide/.test(l));
    return { ok: false, reason: `module_resolution_failed: ${(line || stderr || err.message || 'import_failed').slice(0, 200)}` };
  }
}

export function verifyShippedModulesResolve(shipSteps, shippedIds) {
  const proven = [];
  const unproven = [];
  for (const id of shippedIds) {
    const step = (Array.isArray(shipSteps) ? shipSteps : []).find((s) => (s.step_id || s.id) === id);
    const target = step?.target_file;
    const rel = target ? target.replace(/\\/g, '/') : '';
    // Only guard the CI-enforced server surface; docs/config/data steps are exempt.
    if (!rel || !/\.(mjs|js)$/.test(rel) || !/^(routes|services|middleware)\//.test(rel)) {
      proven.push(id);
      continue;
    }
    const abs = path.isAbsolute(target) ? target : path.join(REPO_ROOT, target);
    if (!fs.existsSync(abs)) { unproven.push({ id, reason: `module_resolution_failed: target missing ${rel}` }); continue; }
    const res = verifyModuleResolves(abs);
    if (res.ok) proven.push(id); else unproven.push({ id, reason: res.reason });
  }
  return { proven, unproven };
}

// Pure, side-effect-free so it's directly unit-testable without exercising
// markFailedStep's real GitHub-commit path (commitQueueStatus calls the live
// GitHub API via GITHUB_TOKEN/GITHUB_REPO — not something a test should risk
// triggering just to check this branch of logic).
export function isKnownBadSignature(step, signature) {
  const knownBad = Array.isArray(step?.known_bad_signatures) ? step.known_bad_signatures : [];
  return knownBad.some((k) => k?.signature === signature);
}

// Repo-wide known-bad-signature memory. isKnownBadSignature above is scoped to
// ONE build-queue step — it structurally cannot see "this exact defect was
// already fixed on a different branch/step/product," which is precisely how
// the same orphaned-import bug shipped to `main` twice on 2026-07-18/19 (the
// branch fix's known_bad_signatures stamp lived on the branch's own step;
// main's queue state had no record of it, so the loop reproduced it blind).
// This registry is deliberately separate from any one queue file so a
// signature recorded anywhere is checked everywhere.
export function loadKnownBadSignaturesRegistry() {
  try {
    const raw = fs.readFileSync(KNOWN_BAD_SIGNATURES_REGISTRY_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return { signatures: Array.isArray(parsed?.signatures) ? parsed.signatures : [] };
  } catch {
    return { signatures: [] };
  }
}

export function saveKnownBadSignaturesRegistry(registry) {
  const dir = path.dirname(KNOWN_BAD_SIGNATURES_REGISTRY_PATH);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(KNOWN_BAD_SIGNATURES_REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

// Pure — no fs — so it's directly unit-testable against an injected registry.
export function findRepoWideKnownBadSignature(signature, registry) {
  const list = Array.isArray(registry?.signatures) ? registry.signatures : [];
  return list.find((s) => s?.signature === signature) || null;
}

export function isRepoWideKnownBadSignature(signature, registry) {
  return Boolean(findRepoWideKnownBadSignature(signature, registry));
}

// Pure — returns a NEW registry with the entry appended (dedup on signature),
// never mutates the input. Used by scripts/mark-step-known-bad-signature.mjs.
export function recordRepoWideKnownBadSignature(signature, meta, registry) {
  const list = Array.isArray(registry?.signatures) ? registry.signatures : [];
  if (list.some((s) => s?.signature === signature)) {
    return { signatures: list };
  }
  return {
    signatures: [...list, { signature, recorded_at: new Date().toISOString(), ...meta }],
  };
}

export async function markFailedStep(queue, stepId, body, productId, logger) {
  if (!queue || !Array.isArray(queue.steps)) return;
  const step = queue.steps.find((s) => s.id === stepId || s.step_id === stepId);
  if (!step) return;
  const previousError = step.last_error || null;
  step.attempts = (typeof step.attempts === 'number' ? step.attempts : 0) + 1;
  step.last_attempt_at = new Date().toISOString();
  step.last_error = deriveFailureReason(body);
  step.status = STEP_STATUS.BLOCKED;
  step.commit_sha = null;
  step.built_sha = null;
  step.proof = null;

  // LOOP_ESCALATION_CONTRACT: count same-signature failures and escalate by class.
  const signature = failureSignature(step.last_error);
  if (step.failure_signature === signature) {
    step.same_signature_count = (typeof step.same_signature_count === 'number' ? step.same_signature_count : 0) + 1;
  } else {
    step.failure_signature = signature;
    step.same_signature_count = 1;
  }
  const failureClass = classifyFailure(step.last_error);
  step.escalation_class = failureClass;
  const ladder = escalationThresholds(failureClass);

  // Repeat-regression memory: a step reset to `pending` after a manual/GAP-FILL
  // fix normally restarts same_signature_count at 1 — discarding the escalation
  // history entirely. Observed live (2026-07-18, blueprint reconciliation
  // Section A): the SAME broken-stub defect was fixed once, the step was reset
  // to pending "so the factory rebuilds it properly," and the factory
  // reproduced the identical bug — twice, on two different products
  // (token-accounting-os, word-keeper) — with zero early warning either time,
  // because the reset wiped the counters. known_bad_signatures is a separate,
  // append-only field a human/GAP-FILL fix stamps via
  // `scripts/mark-step-known-bad-signature.mjs` when resetting a step to
  // pending; a plain status reset does not clear it. If the factory reproduces
  // a signature already recorded here, skip the ladder and go straight to
  // model rotation instead of re-earning it from attempt 1.
  //
  // Checks TWO registries, not one: the per-step known_bad_signatures array
  // (fine-grained, carries a step-specific note) AND a repo-wide registry
  // (data/known-bad-signatures-registry.json). The per-step-only version has a
  // structural blind spot, proven live 2026-07-18/19: a fix's known-bad stamp
  // lived on a feature branch's copy of the step; `main`'s own queue state had
  // no record of it, so the loop on `main` reproduced the identical bug a
  // second time with zero warning. The repo-wide registry closes that —
  // recorded once, checked everywhere, independent of which branch/step
  // originally hit it.
  //
  // 2026-07-19 fix: this block previously referenced an out-of-scope `knownBad`
  // variable (only defined inside isKnownBadSignature's own closure) when
  // building the log line below — a real ReferenceError that fired exactly
  // when a repeat regression was detected, throwing before persistQueue() at
  // the end of this function could run. The repeat-regression protection could
  // not actually complete a save the one time it mattered. Caught by direct
  // code read, not a test — isKnownBadSignature's own unit tests only exercise
  // the pure function in isolation, never this call site (deliberately, to
  // avoid markFailedStep's real commitQueueStatus GitHub-API side effect in a
  // unit test). Fixed by resolving the matched entry once, correctly scoped.
  const repoWideRegistry = loadKnownBadSignaturesRegistry();
  const stepKnownBadEntry = (Array.isArray(step?.known_bad_signatures) ? step.known_bad_signatures : [])
    .find((k) => k?.signature === signature) || null;
  const repoWideKnownBadEntry = findRepoWideKnownBadSignature(signature, repoWideRegistry);
  const isKnownRepeat = Boolean(stepKnownBadEntry) || Boolean(repoWideKnownBadEntry);
  if (isKnownRepeat && !step.force_model_rotation) {
    step.model_rotation = (typeof step.model_rotation === 'number' ? step.model_rotation : 0) + 1;
    step.force_model_rotation = true;
    logger?.warn?.(
      {
        product_id: productId,
        step_id: stepId,
        failure_signature: signature,
        known_bad_note: stepKnownBadEntry?.note || repoWideKnownBadEntry?.note,
        known_bad_source: stepKnownBadEntry ? 'step' : 'repo_wide_registry',
      },
      '[GOVERNED-AUTONOMOUS-SHIP] REPEAT REGRESSION — this exact failure signature was already fixed once and is recorded known-bad; skipping the escalation ladder and rotating model immediately instead of re-shipping it a third time',
    );
  }

  // Recovery ladder (contract). The FOUNDER is the last resort, never the router:
  // repeated same-signature failures first trigger an automatic STRATEGY CHANGE
  // — rotate to a different/stronger model on the next attempt(s). Only when that
  // is exhausted (hard-stop) is the step marked UNSOLVED and a last-resort alert
  // recorded (a log/record the founder can glance at — it never gates the loop).
  if (step.same_signature_count >= (ladder.escalate || 5)) {
    step.model_rotation = (typeof step.model_rotation === 'number' ? step.model_rotation : 0) + 1;
    step.force_model_rotation = true;
    logger?.warn?.(
      { product_id: productId, step_id: stepId, failure_class: failureClass, same_signature_count: step.same_signature_count, model_rotation: step.model_rotation },
      '[GOVERNED-AUTONOMOUS-SHIP] escalation — rotating to a different/stronger model (alternative strategy) before hard-stop',
    );
  }
  if (step.same_signature_count >= (ladder.hard_stop || 8) && step.founder_alerted_signature !== signature) {
    step.founder_alerted_signature = signature;
    step.hard_stopped = true;
    step.unsolved = true;
    emitFounderAlert({
      product_id: productId,
      step_id: stepId,
      failure_class: failureClass,
      failure_signature: signature,
      attempts: step.attempts,
      same_signature_count: step.same_signature_count,
      models_rotated: step.model_rotation || 0,
      last_error: step.last_error,
      disposition: 'UNSOLVED',
      recovery_ref: loadEscalationContract().recovery_mission_ref || 'AUTONOMOUS-RECOVERY-0001',
    }, logger);
  }

  persistQueue(queue);
  // Avoid pushing a GitHub commit + deploy for every identical repeat failure.
  // Only commit when the error changes, on the first failure, or at exponential
  // backoff intervals so the loop stays loud without drowning the deploy queue.
  const shouldCommit = step.last_error !== previousError || step.attempts <= 2 || isPowerOfTwo(step.attempts);
  if (!shouldCommit) {
    logger?.info?.({ product_id: productId, step_id: stepId, attempts: step.attempts, last_error: step.last_error }, '[GOVERNED-AUTONOMOUS-SHIP] repeated failure; skipping queue status commit');
    return;
  }
  try {
    await commitQueueStatus(productId, [stepId], queue, 'failed', logger);
  } catch (err) {
    logger?.warn?.({ product_id: productId, step_id: stepId, error: err.message }, '[GOVERNED-AUTONOMOUS-SHIP] failed queue status commit failed');
  }
}

function markShippedStepsDone(queueOrProductId, shippedStepIds, commit_sha) {
  if (!shippedStepIds.length) return;
  const queue = typeof queueOrProductId === 'string'
    ? loadBuildQueue(queueOrProductId)
    : queueOrProductId;
  if (!queue || !Array.isArray(queue.steps)) return;
  const done = new Set(shippedStepIds);
  let changed = false;
  const now = new Date().toISOString();
  for (const step of queue.steps) {
    if (done.has(step.id)) {
      if (step.status !== STEP_STATUS.DONE) {
        step.status = STEP_STATUS.DONE;
        step.shipped_via = 'governed_ship_queue';
        step.shipped_at = now;
        changed = true;
      }
      if (step.last_error != null) {
        step.last_error = null;
        changed = true;
      }
      if (step.last_attempt_at != null) {
        step.last_attempt_at = null;
        changed = true;
      }
      if (step.attempts !== 0) {
        step.attempts = 0;
        changed = true;
      }
      if (step.blocker_class != null) {
        step.blocker_class = null;
        changed = true;
      }
      if (step.claim_level != null) {
        step.claim_level = null;
        changed = true;
      }
      if (step.park_until != null) {
        step.park_until = null;
        changed = true;
      }
      if (step.revive_count != null && step.revive_count !== 0) {
        step.revive_count = 0;
        changed = true;
      }
      if (commit_sha && step.commit_sha !== commit_sha) {
        step.commit_sha = commit_sha;
        changed = true;
      }
    }
  }
  if (changed) persistQueue(queue);
}

/**
 * Post-ship artifact re-proof. The factory reporting a step in `body.shipped` is
 * NOT proof its artifact landed — the exact hole that produced false-DONEs (a
 * `done` step whose target file was never committed, e.g. a route importing a
 * service that does not exist). Before marking anything DONE, re-run the step's
 * declared artifact proof against the freshly-committed tree. A declared step
 * whose artifact still fails proof is kept OUT of done and returned as unproven
 * so it routes back to the failure/rework path instead of faking completion.
 * Undeclared/legacy steps (no checkable expectation) stay proven — this guard
 * only kills provable false-DONEs, it never invents new failures.
 */
async function partitionShippedByArtifactProof(queue, shippedIds) {
  const proven = [];
  const unproven = [];
  for (const id of shippedIds) {
    const step = (queue.steps || []).find((s) => s.id === id || s.step_id === id);
    if (!step) { proven.push(id); continue; }
    let res;
    try {
      res = await evaluateStepExpectations(step, { root: REPO_ROOT });
    } catch (err) {
      res = { ok: false, applicable: true, reason: `reaudit_threw: ${err.message}` };
    }
    if (res.applicable === false || res.ok) proven.push(id);
    else unproven.push({ id, reason: res.reason });
  }
  return { proven, unproven };
}

function queuePathForProduct(productId) {
  return path.join(PRODUCTS_DIR, productId, 'BUILD_QUEUE.json');
}

async function fetchRemoteBuildQueue(productId) {
  const localPath = queuePathForProduct(productId);
  const relPath = path.relative(REPO_ROOT, localPath).replace(/\\/g, '/');
  const token = process.env.GITHUB_TOKEN?.trim();
  const repo = process.env.GITHUB_REPO?.trim();
  const branch = process.env.GITHUB_DEPLOY_BRANCH || 'main';
  if (!token || !repo) return loadBuildQueue(productId);
  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) return loadBuildQueue(productId);
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/${relPath}?ref=${branch}`, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      if (data && typeof data.content === 'string') {
        const text = Buffer.from(data.content, 'base64').toString('utf8');
        const raw = JSON.parse(text);
        return normalizeQueue(raw, localPath);
      }
    }
  } catch (err) {
    // Remote unavailable — fall back to local queue; local is the durable source
    // of truth for runtime fields and the loop will keep working.
  }
  return loadBuildQueue(productId);
}

async function commitQueueStatus(product_id, stepIds, queue, commitSha, logger) {
  const { _sourcePath, ...clean } = queue;
  const queuePath = queue._sourcePath || queuePathForProduct(product_id);
  const relPath = path.relative(REPO_ROOT, queuePath).replace(/\\/g, '/');
  const content = `${JSON.stringify(clean, null, 2)}\n`;
  const branch = process.env.GITHUB_DEPLOY_BRANCH || 'main';
  const failed = commitSha === 'failed';
  const statusTag = failed ? 'FAILED' : 'QUEUE';
  const shaTag = failed ? '0000000' : commitSha.slice(0, 7);
  try {
    const result = await commitManyToGitHub([{ path: relPath, content }], `GOVERNED-AUTONOMOUS-${statusTag}: ${product_id} ${stepIds.join(', ')} ${shaTag}`, branch);
    if (result?.ok && result.sha) {
      logger?.info?.(`[GOVERNED-AUTONOMOUS-QUEUE] ${product_id} BUILD_QUEUE.json updated with ${shaTag}`);
    } else {
      logger?.warn?.(`[GOVERNED-AUTONOMOUS-QUEUE] ${product_id} commit returned !ok: ${result?.error || 'unknown'}`);
    }
  } catch (err) {
    logger?.warn?.(`[GOVERNED-AUTONOMOUS-QUEUE] ${product_id} commit failed: ${err.message}`);
  }
}

const { commitManyToGitHub } = createDeploymentService({
  pool: { query: async () => ({ rows: [] }) },
  systemMetrics: null,
  broadcastToAll: () => {},
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  GITHUB_REPO: process.env.GITHUB_REPO,
  GITHUB_DEPLOY_BRANCH: process.env.GITHUB_DEPLOY_BRANCH || 'main',
});

async function commitShippedFiles(product_id, shippedStepIds, ship_steps, logger) {
  if (!shippedStepIds.length || !Array.isArray(ship_steps)) return null;
  const shipped = new Set(shippedStepIds);
  const steps = ship_steps.filter((s) => shipped.has(s.step_id));
  const fileEntries = [];
  const queuePath = queuePathForProduct(product_id);
  if (fs.existsSync(queuePath)) {
    fileEntries.push({ path: path.relative(REPO_ROOT, queuePath).replace(/\\/g, '/'), content: fs.readFileSync(queuePath, 'utf8') });
  }
  for (const step of steps) {
    const target = step.target_file;
    if (!target) continue;
    const abs = path.isAbsolute(target) ? target : path.join(REPO_ROOT, target);
    if (fs.existsSync(abs)) {
      fileEntries.push({ path: target.replace(/\\/g, '/'), content: fs.readFileSync(abs, 'utf8') });
    }
  }
  if (fileEntries.length === 0) return null;
  const message = `GOVERNED-AUTONOMOUS-SHIP: ${product_id} ${shippedStepIds.join(', ')}`;
  const branch = process.env.GITHUB_DEPLOY_BRANCH || 'main';
  try {
    const result = await commitManyToGitHub(fileEntries, message, branch);
    if (result?.ok && result.sha) {
      state.lastCommitSha = result.sha;
      state.lastCommitError = null;
      await persistState();
      logger?.info?.(`[GOVERNED-AUTONOMOUS-SHIP] committed ${fileEntries.length} files for ${product_id}: ${result.sha.slice(0, 7)}`);
      return result.sha;
    }
    state.lastCommitError = result?.error || 'commit returned !ok';
    await persistState();
    logger?.warn?.(`[GOVERNED-AUTONOMOUS-SHIP] commit for ${product_id} returned !ok: ${state.lastCommitError}`);
    return null;
  } catch (err) {
    state.lastCommitError = String(err?.message || err);
    await persistState();
    logger?.warn?.(`[GOVERNED-AUTONOMOUS-SHIP] commit for ${product_id} failed: ${state.lastCommitError}`);
    return null;
  }
}

function snapshotQueues(queueCache) {
  const snapshots = {};
  for (const [pid, queue] of Object.entries(queueCache)) {
    if (!queue || !Array.isArray(queue.steps)) continue;
    try {
      snapshots[pid] = JSON.stringify(queue.steps);
    } catch {
      /* ignore unserializable */
    }
  }
  return snapshots;
}

function changedProductIds(queueCache, snapshots) {
  const changed = [];
  for (const [pid, queue] of Object.entries(queueCache)) {
    if (!queue || !Array.isArray(queue.steps)) continue;
    try {
      if (JSON.stringify(queue.steps) !== snapshots[pid]) changed.push(pid);
    } catch {
      /* ignore */
    }
  }
  return changed;
}

async function commitQueueRuntimeChanges(queueCache, snapshots, tag, logger, skip = new Set()) {
  const changed = changedProductIds(queueCache, snapshots).filter((pid) => !skip.has(pid));
  if (!changed.length) return skip;
  for (const pid of changed) {
    const queue = queueCache[pid];
    if (!queue) continue;
    try {
      await commitQueueStatus(pid, ['queue'], queue, tag, logger);
      skip.add(pid);
    } catch (err) {
      logger?.warn?.(`[GOVERNED-AUTONOMOUS-SHIP] queue runtime sync for ${pid} failed: ${err.message}`);
    }
  }
  return skip;
}

async function planQueueIfNeeded({ products, queueCache, logger, maxPlanAttempts = 1 }) {
  const callModel = defaultPlannerCallModel();
  if (!callModel || typeof callModel !== 'function') {
    logger?.warn?.('[GOVERNED-AUTONOMOUS-SHIP] no planner callModel available');
    return 0;
  }
  let tasks = [];
  try {
    tasks = [...discoverPlanWork(), ...discoverSentryFixWork()]
      .filter((t) => t && t.kind === 'plan_build_queue')
      .sort((a, b) => (a.priority || 0) - (b.priority || 0));
  } catch (err) {
    logger?.warn?.(`[GOVERNED-AUTONOMOUS-SHIP] discover planning work threw: ${err.message}`);
    return 0;
  }
  if (!tasks.length) return 0;

  let planned = 0;
  for (let attempt = 0; attempt < maxPlanAttempts; attempt += 1) {
    let attemptPlanned = 0;
    for (const task of tasks) {
      try {
        const result = await runPlanBuildQueue(task, { callModel, logger });
        if (result?.ok) {
          attemptPlanned += result.added || 0;
          logger?.info?.(`[GOVERNED-AUTONOMOUS-SHIP] planned ${result.added || 0} step(s) for ${result.product_id}`);
          try {
            const local = loadBuildQueue(task.product_id);
            const remote = await fetchRemoteBuildQueue(task.product_id);
            queueCache[task.product_id] = mergeQueueRuntimeStatus(remote, local);
          } catch (err) {
            logger?.warn?.(`[GOVERNED-AUTONOMOUS-SHIP] could not reload queue for ${task.product_id}: ${err.message}`);
          }
        } else {
          logger?.info?.(`[GOVERNED-AUTONOMOUS-SHIP] plan for ${task.product_id}: ${result?.detail || 'no_queue'}`);
        }
      } catch (err) {
        logger?.warn?.(`[GOVERNED-AUTONOMOUS-SHIP] plan task ${task.product_id} threw: ${err.message}`);
      }
    }
    planned += attemptPlanned;
    if (!attemptPlanned) break;
  }
  return planned;
}

export async function runGovernedAutonomousShipOnce({ logger, maxStepsPerProduct = 1, shipFn = shipViaGovernedQueue, queueCache: inputQueueCache } = {}) {
  if (state.running) return { ok: false, skipped: true, reason: 'already_running' };
  if (!governedFactoryOnly()) return { ok: false, skipped: true, reason: 'fence_off' };

  const token = hasTokenCapacity();
  if (!token.ok) {
    state.tokenHaltSince = state.tokenHaltSince || new Date().toISOString();
    return { ok: false, halted: true, reason: 'token_capacity', detail: token.reason };
  }
  const budget = dailyBuildBudget();
  if (!budget.ok) return { ok: false, halted: true, reason: 'daily_budget', detail: budget };

  state.tokenHaltSince = null;
  state.running = true;
  state.lastRunAt = new Date().toISOString();
  state.totalRuns += 1;
  await persistState();
  try {
    const products = listProductsWithQueues();
    let queueCache = inputQueueCache || {};

    // If no pre-merged cache was supplied, fetch remote BUILD_QUEUE and merge
    // runtime fields so the loop never re-ships already-completed steps.
    if (!Object.keys(queueCache).length) {
      for (const pid of products) {
        try {
          const local = loadBuildQueue(pid);
          const remote = await fetchRemoteBuildQueue(pid);
          queueCache[pid] = mergeQueueRuntimeStatus(remote, local);
        } catch (err) {
          logger?.warn?.(`[GOVERNED-AUTONOMOUS-SHIP] could not load queue for ${pid}: ${err.message}`);
        }
      }
    }

    // Close already-built twin steps before planning (stop stub-codegen thrash).
    for (const pid of products) {
      const queue = queueCache[pid];
      if (!queue) continue;
      try {
        const claimed = await claimPreExistingSatisfiedSteps(queue);
        if (claimed.length) {
          persistQueue(queue);
          logger?.info?.(`[GOVERNED-AUTONOMOUS-SHIP] claimed pre-existing ${pid}: ${claimed.join(', ')}`);
        }
      } catch (err) {
        logger?.warn?.(`[GOVERNED-AUTONOMOUS-SHIP] pre-existing claim ${pid} failed: ${err.message}`);
      }
    }

    // "Skip to the next tab, go back and fix what failed": revive BLOCKED steps
    // whose cooldown has elapsed back to PENDING so this same tick re-attempts
    // them. Anti-thrash is preserved — reviveStaleBlockedSteps bounds revive_count
    // and demotes a step that keeps failing the same way to SKIPPED (terminal),
    // and founder-gated steps are never auto-revived.
    for (const pid of products) {
      const queue = queueCache[pid];
      if (!queue || !Array.isArray(queue.steps)) continue;
      try {
        const revived = reviveStaleBlockedSteps(queue);
        if (revived.length) {
          persistQueue(queue);
          logger?.info?.(`[GOVERNED-AUTONOMOUS-SHIP] revived blocked ${pid}: ${revived.join(', ')}`);
        }
      } catch (err) {
        logger?.warn?.(`[GOVERNED-AUTONOMOUS-SHIP] revive ${pid} failed: ${err.message}`);
      }
    }

    const queueSnapshots = snapshotQueues(queueCache);
    let queueCommitted = new Set();

    let plan = planGovernedBuildQueueRun({
      products,
      readQueue: (id) => queueCache[id],
      maxStepsPerProduct,
    });
    if (!plan.runnable) {
      const planned = await planQueueIfNeeded({ products, queueCache, logger });
      if (planned) {
        plan = planGovernedBuildQueueRun({
          products,
          readQueue: (id) => queueCache[id],
          maxStepsPerProduct,
        });
      }
    }
    if (!plan.runnable) {
      queueCommitted = await commitQueueRuntimeChanges(queueCache, queueSnapshots, 'queue', logger, queueCommitted);
      return { ok: true, shipped: 0, reason: 'no_shippable_steps', gaps: plan.total_gaps };
    }
    let shipped = 0;
    const perProduct = [];
    for (const entry of plan.by_product) {
      if (!Array.isArray(entry.ship_steps) || entry.ship_steps.length === 0) continue;
      const queue = queueCache[entry.product_id];
      const { status, body } = await shipFn(entry);
      const ok = status === 200 && body && body.ok === true;
      let shippedIds = ok && Array.isArray(body.shipped)
        ? body.shipped.map((s) => s.step_id).filter(Boolean)
        : [];
      if (shippedIds.length && queue) {
        const commitSha = await commitShippedFiles(entry.product_id, shippedIds, entry.ship_steps, logger);
        if (commitSha) {
          // Fail-closed on false-DONE: a step is only marked done if its declared
          // artifact actually re-proves against the committed tree.
          const { proven, unproven } = await partitionShippedByArtifactProof(queue, shippedIds);
          for (const u of unproven) {
            u.reason = `artifact_missing_after_ship: ${u.reason}`;
          }
          // Blueprint ship-verify (SO-002): a step can pass artifact-existence yet
          // import a missing module/export and boot-crash (the exact class that
          // shipped broken route stubs red). Re-run the import-resolution CI
          // enforces before marking SHIP done.
          const modProof = verifyShippedModulesResolve(entry.ship_steps, proven);
          const unprovenAll = [...unproven, ...modProof.unproven];
          for (const u of unprovenAll) {
            logger?.warn?.({ product_id: entry.product_id, step_id: u.id, reason: u.reason }, '[GOVERNED-AUTONOMOUS-SHIP] step reported shipped but failed re-proof — kept OUT of done, routed to rework');
            await markFailedStep(queue, u.id, { error: u.reason }, entry.product_id, logger);
          }
          shippedIds = modProof.proven;
          if (shippedIds.length) {
            markShippedStepsDone(queue, shippedIds, commitSha);
            await commitQueueStatus(entry.product_id, shippedIds, queue, commitSha, logger);
            queueCommitted.add(entry.product_id);
          }
        } else {
          logger?.warn?.({ product_id: entry.product_id, shipped_ids: shippedIds }, '[GOVERNED-AUTONOMOUS-SHIP] factory shipped locally but GitHub commit failed; leaving steps retryable');
          for (const rawStep of entry.ship_steps || []) {
            const stepId = rawStep?.step_id || rawStep?.id;
            if (stepId) await markFailedStep(queue, stepId, { body: { error: 'github_commit_failed_after_local_ship' } }, entry.product_id, logger);
          }
        }
      } else if (queue) {
        for (const rawStep of entry.ship_steps || []) {
          const stepId = rawStep?.step_id || rawStep?.id;
          if (stepId) await markFailedStep(queue, stepId, body, entry.product_id, logger);
        }
      }
      shipped += shippedIds.length;
      perProduct.push({
        product_id: entry.product_id,
        status,
        ok,
        shipped: shippedIds.length,
        error: ok ? undefined : deriveFailureReason(body),
      });
    }
    queueCommitted = await commitQueueRuntimeChanges(queueCache, queueSnapshots, 'queue', logger, queueCommitted);
    recordDailyBuildAttempts(shipped);
    state.lastShipped = shipped;
    await persistState();
    return { ok: true, shipped, products: perProduct, gaps: plan.total_gaps };
  } catch (err) {
    logger?.warn?.({ err: err.message }, '[GOVERNED-AUTONOMOUS-SHIP] tick threw');
    return { ok: false, error: err.message };
  } finally {
    state.running = false;
    await persistState();
  }
}

export function getGovernedAutonomousShipStatus() {
  return {
    ok: true,
    governed_autonomous_ship: {
      ...state,
      fence_on: governedFactoryOnly(),
      enabled: governedAutonomousShippingEnabled(),
      products_with_queues: listProductsWithQueues().length,
      paused_products: [...loadPausedProducts()],
      last_founder_alert: state.lastFounderAlert,
    },
  };
}

export function startGovernedAutonomousShippingLoop({ logger, pool } = {}) {
  // Mirror image of the never-stop fence: this loop OWNS throughput only when
  // the fence is ON. When the fence is OFF, the legacy never-stop loop is the
  // active shipper and this loop stays idle so the two never double-ship.
  if (!governedFactoryOnly()) {
    logger?.info?.('[GOVERNED-AUTONOMOUS-SHIP] idle — GOVERNED_FACTORY_ONLY not active (legacy never-stop owns throughput)');
    return null;
  }
  if (!governedAutonomousShippingEnabled()) {
    logger?.info?.('[GOVERNED-AUTONOMOUS-SHIP] disabled — set GOVERNED_AUTONOMOUS_SHIP=1 (or BUILDEROS_NEVER_STOP/AUTOPILOT)');
    return null;
  }

  setSharedPool(pool);
  loadPersistedState().then(async () => {
    // If a previous container was killed mid-tick, the persisted `running`
    // flag would be left true. Reset it on boot so the new container can run.
    if (state.running) {
      state.running = false;
      await persistState().catch(() => {});
    }
  }).catch(() => {});

  // IDLE poll interval: only used when there is genuinely nothing to build
  // (empty/deduped queues, resource halt). It is NOT a per-cycle cooldown.
  const idleIntervalMs = Number(
    process.env.GOVERNED_AUTONOMOUS_SHIP_INTERVAL_MS
    || process.env.NEVER_STOP_INTERVAL_MS
    || process.env.BUILDEROS_NEVER_STOP_INTERVAL_MS
    || 5 * 60 * 1000,
  );
  // ACTIVE cadence: when a step just shipped or a shippable step was attempted,
  // chain the next cycle almost immediately. Founder standing order: go-go-go —
  // we save tokens by being smarter, not by idling. The only throttle on a step
  // that keeps failing the same way is the per-step exponential backoff in
  // markFailedStep (BLOCKED) + reviveStaleBlockedSteps cooldown, so we never
  // busy-spin one broken build.
  const activeDelayMs = Number(
    process.env.GOVERNED_AUTONOMOUS_SHIP_ACTIVE_DELAY_MS
    || 1500,
  );
  const bootDelayMs = Number(
    process.env.GOVERNED_AUTONOMOUS_SHIP_BOOT_DELAY_MS
    || process.env.NEVER_STOP_BOOT_DELAY_MS
    || 15_000,
  );

  const guardedTick = createUsefulWorkGuard({
    taskName: 'GOVERNED-AUTONOMOUS-SHIP',
    purpose: 'Continuous product building THROUGH the governed pipe when GOVERNED_FACTORY_ONLY is on',
    allowInDirectedMode: true,
    prerequisites: async () => {
      if (!governedFactoryOnly()) return { ok: false, reason: 'GOVERNED_FACTORY_ONLY not active' };
      if (!governedAutonomousShippingEnabled()) return { ok: false, reason: 'GOVERNED_AUTONOMOUS_SHIP not enabled' };
      const token = hasTokenCapacity();
      if (!token.ok) return { ok: false, reason: `token_capacity: ${token.reason}` };
      return { ok: true };
    },
    workCheck: async () => {
      const products = listProductsWithQueues();
      const cache = {};
      await Promise.all(products.map(async (pid) => {
        try {
          const local = loadBuildQueue(pid);
          const remote = await fetchRemoteBuildQueue(pid);
          cache[pid] = mergeQueueRuntimeStatus(remote, local);
        } catch (err) {
          logger?.warn?.(`[GOVERNED-AUTONOMOUS-SHIP] workCheck could not load queue for ${pid}: ${err.message}`);
        }
      }));
      sharedQueueCache = cache;
      const plan = planGovernedBuildQueueRun({
        products,
        readQueue: (id) => cache[id],
        maxStepsPerProduct: 1,
      });
      const activeProducts = plan.by_product.filter((p) => p.ship_steps.length > 0).length;
      const productsWithGaps = plan.by_product.filter((p) => p.gaps.length > 0).length;
      let planTasks = 0;
      try {
        planTasks = [...discoverPlanWork(), ...discoverSentryFixWork()].filter((t) => t && t.kind === 'plan_build_queue').length;
      } catch (err) {
        logger?.warn?.(`[GOVERNED-AUTONOMOUS-SHIP] workCheck planning discovery threw: ${err.message}`);
      }
      return {
        count: plan.total_shippable + plan.total_gaps + planTasks,
        description: `${plan.total_shippable} shippable + ${plan.total_gaps} gap + ${planTasks} plan task(s) across ${activeProducts} active product(s) (priority: ${products.slice(0, 3).join(', ')})`,
      };
    },
    execute: async () => runGovernedAutonomousShipOnce({ logger, queueCache: sharedQueueCache }),
    logger,
  });

  logger?.info?.({ activeDelayMs, idleIntervalMs }, '[GOVERNED-AUTONOMOUS-SHIP] starting — event-driven governed throughput (go-go-go)');

  // Event-driven cadence. The next cycle is scheduled based on the OUTCOME of
  // the previous one, not a fixed clock:
  //   - shipped >= 1, or a shippable step was attempted (incl. a failed attempt
  //     that should retry) -> chain immediately (activeDelayMs).
  //   - genuinely nothing to build, or a hard resource halt (token/budget)
  //     -> poll slowly (idleIntervalMs) so we don't busy-spin.
  // A step that keeps failing the same way is throttled by its own BLOCKED
  // backoff + reviveStaleBlockedSteps cooldown, so immediate retry is safe.
  function delayForOutcome(outcome) {
    if (!outcome) return idleIntervalMs;
    // createUsefulWorkGuard returns { skipped, result } or { skipped, error }.
    // A guard skip (no work / prereqs / guard error) is always an idle poll so
    // we never busy-spin when there is nothing buildable.
    if (outcome.skipped) return idleIntervalMs;
    const result = outcome.result || outcome;
    if (!result) return idleIntervalMs;
    if (result.halted || result.reason === 'token_capacity' || result.reason === 'daily_budget') {
      return idleIntervalMs;
    }
    // Productive cycle, or a shippable step was actually attempted (incl. a
    // failed attempt that should retry) -> chain immediately.
    if (Number(result.shipped) > 0) return activeDelayMs;
    if (Array.isArray(result.products) && result.products.length > 0) return activeDelayMs;
    if (result.error || outcome.error) return activeDelayMs;
    // Executed but nothing shippable (no_shippable_steps / plan-only / all
    // remaining steps blocked awaiting revive): calm poll, not a hot loop.
    return idleIntervalMs;
  }

  const controller = { stopped: false, handle: null };

  async function loopTick() {
    if (controller.stopped) return;
    let result;
    try {
      result = await guardedTick();
    } catch (err) {
      logger?.warn?.({ err: err.message }, '[GOVERNED-AUTONOMOUS-SHIP] tick failed');
      result = { ok: false, error: err.message };
    }
    if (controller.stopped) return;
    const delay = delayForOutcome(result);
    controller.handle = setTimeout(loopTick, delay);
  }

  controller.handle = setTimeout(loopTick, bootDelayMs);

  // Preserve the previous contract (callers may clearInterval/clearTimeout the
  // return value) while exposing an explicit stop for the self-rescheduler.
  controller.unref = () => controller.handle?.unref?.();
  controller.stop = () => {
    controller.stopped = true;
    if (controller.handle) clearTimeout(controller.handle);
  };
  return controller;
}

export default startGovernedAutonomousShippingLoop;