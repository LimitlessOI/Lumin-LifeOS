/**
 * SYNOPSIS: Permanent product expansion lane — work exists even when BP_PRIORITY queue reads complete.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { getActiveQueueItem, isQueueItemIncomplete } from './bp-priority-completion.js';
import { loadPointBTarget } from './point-b-target-lite.js';
import { executeIntakeBlueprint } from './intake-blueprint-executor.js';
import { SOCIALMEDIAOS_INTAKE_SESSION } from './lifeos-mission-pipeline-executor.js';
import { loadBuildQueue, selectNextStep, runNextStep, persistQueue, queueSummary, queuePathForProduct, reviveStaleBlockedSteps } from './product-build-orchestrator.js';
import { waitForDeploySha } from './deploy-truth.js';
import { enforceClaim, toWatchlist } from './truth-ladder.js';
import { extractBacklog, planBuildQueue } from './build-queue-planner.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BP_PATH = path.join(ROOT, 'builderos-reboot/BP_PRIORITY.json');
const LOG_PATH = path.join(ROOT, 'data/never-stop-product-factory-log.jsonl');
const STATE_PATH = path.join(ROOT, 'data/never-stop-product-factory-state.json');
const WATCHLIST_PATH = path.join(ROOT, 'data/truth-watchlist.jsonl');
const BUILD_REPAIR_ATTEMPTS = Number(process.env.NEVER_STOP_BUILD_REPAIR_ATTEMPTS || 3);
const PRODUCT_PRIORITY_PATH = path.join(ROOT, 'docs/products/PRODUCT_BUILD_PRIORITY.json');

/**
 * Founder-owned financial priority order for product builds. Returns an ordered
 * array of product_ids (highest financial priority first). Fail-open to [] so a
 * missing/malformed file never blocks the loop — it just falls back to
 * maturity-based ordering.
 */
export function loadProductPriority() {
  try {
    const raw = JSON.parse(fs.readFileSync(PRODUCT_PRIORITY_PATH, 'utf8'));
    return Array.isArray(raw.priority) ? raw.priority.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Rank a product to a fraction in [0,1) used as a tiebreaker within a work
 * kind: LISTED products (founder financial priority) sort first, in list order;
 * UNLISTED products sort after all listed ones, ordered by definition maturity
 * (larger documented backlog / more fleshed-out home builds earlier). Lower =
 * built sooner. Pure function.
 */
export function productRankFraction(productId, priorityList = [], maturity = 0) {
  const idx = priorityList.indexOf(productId);
  if (idx >= 0) return idx * 1e-4; // listed: 0.0000, 0.0001, ... always < unlisted
  const m = Number.isFinite(maturity) && maturity > 0 ? maturity : 0;
  // Unlisted: 0.5 (no backlog) down toward 0.01 as maturity grows — always > any listed rank.
  return Math.max(0.01, 0.5 - Math.min(0.49, m * 1e-3));
}

/**
 * Pull the most specific, verbatim failure text out of a blocked builder
 * response so the next attempt can be told exactly what went wrong. Prefers the
 * pre-commit gate's runtime output over the generic top-level error.
 */
export function extractBuilderFailure(body) {
  if (!body || typeof body !== 'object') return null;
  const v = body.governance && body.governance.verifier;
  const vb = v && v.body;
  const specific = vb && (vb.runtime_output || vb.syntax_error);
  if (specific) return String(specific).slice(0, 1500);
  if (v && v.stdout) return String(v.stdout).slice(0, 1500);
  if (body.hint) return String(body.hint).slice(0, 1500);
  if (body.error) return String(body.error).slice(0, 1500);
  return null;
}

/**
 * Default planner model access for auto-enrolling products into build lanes.
 * Founder rule: only a strong PAID model may be hardwired — uses Anthropic
 * (claude sonnet) directly. Returns null (fail-closed) when no key is present,
 * so the plan lane simply skips rather than fabricating a queue.
 */
export function defaultPlannerCallModel() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const model = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
  return async (_member, prompt, opts = {}) => {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: opts.maxOutputTokens || 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(`anthropic ${res.status}: ${JSON.stringify(j).slice(0, 200)}`);
    return (j.content || []).map((c) => c.text || '').join('');
  };
}

export function neverStopProductsEnabled() {
  return process.env.BUILDEROS_NEVER_STOP === '1'
    || process.env.NEVER_STOP_PRODUCTS === '1'
    || process.env.BUILDEROS_AUTOPILOT === '1';
}

export function hasTokenCapacity() {
  const keys = [
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY',
    'GOOGLE_API_KEY',
    'GEMINI_API_KEY',
    'COMMAND_CENTER_KEY',
  ];
  const present = keys.filter((k) => String(process.env[k] || '').trim().length > 8);
  if (present.length === 0) return { ok: false, reason: 'no_api_keys' };
  return { ok: true, keys: present.length };
}

const BUDGET_PATH = path.join(ROOT, 'data/never-stop-daily-budget.json');

function utcDayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

/**
 * Hard cost guardrail: cap the number of builder attempts (each ≈ one paid
 * `/build` call) the autonomous loop may spend per UTC day. Bounds runaway
 * spend even though the loop otherwise never stops. `NEVER_STOP_DAILY_STEP_CAP`
 * (default 60) — set to 0 to disable the cap.
 */
export function dailyBuildBudget() {
  const cap = Number(process.env.NEVER_STOP_DAILY_STEP_CAP ?? 60);
  const today = utcDayKey();
  let used = 0;
  try {
    const j = JSON.parse(fs.readFileSync(BUDGET_PATH, 'utf8'));
    if (j && j.day === today) used = Number(j.used) || 0;
  } catch {
    // no budget file yet
  }
  if (!Number.isFinite(cap) || cap <= 0) {
    return { ok: true, unlimited: true, cap: 0, used, remaining: Infinity, day: today };
  }
  const remaining = Math.max(0, cap - used);
  return { ok: remaining > 0, cap, used, remaining, day: today };
}

export function recordDailyBuildAttempts(n) {
  const attempts = Math.max(0, Number(n) || 0);
  if (!attempts) return;
  const today = utcDayKey();
  let used = 0;
  try {
    const j = JSON.parse(fs.readFileSync(BUDGET_PATH, 'utf8'));
    if (j && j.day === today) used = Number(j.used) || 0;
  } catch {
    // reset for a new day
  }
  try {
    fs.mkdirSync(path.dirname(BUDGET_PATH), { recursive: true });
    fs.writeFileSync(
      BUDGET_PATH,
      `${JSON.stringify({ day: today, used: used + attempts, updated_at: new Date().toISOString() }, null, 2)}\n`,
    );
  } catch {
    // non-fatal
  }
}

function log(row) {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.appendFileSync(LOG_PATH, `${JSON.stringify({ at: new Date().toISOString(), ...row })}\n`);
}

function writeState(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, `${JSON.stringify({ ...state, updated_at: new Date().toISOString() }, null, 2)}\n`);
}

function loadBpItems() {
  try {
    return JSON.parse(fs.readFileSync(BP_PATH, 'utf8')).items || [];
  } catch {
    return [];
  }
}

function smosSchemaMigrationPending() {
  const p = path.join(ROOT, 'db/migrations/20260629_socialmediaos_schema_align.sql');
  return fs.existsSync(p);
}

async function probeSmoSessionCreate(baseUrl, commandKey) {
  if (!baseUrl || !commandKey) return { ok: false, reason: 'missing_env' };
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/socialmediaos/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-command-key': commandKey,
      },
      body: JSON.stringify({ initialStatus: 'draft' }),
    });
    const text = await res.text();
    let json = {};
    try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 200) }; }
    return { ok: res.ok && res.status < 500, status: res.status, json };
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

function spawnAsync(cmd, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => { stdout += d; });
    child.stderr?.on('data', (d) => { stderr += d; });
    const timer = options.timeout
      ? setTimeout(() => { child.kill('SIGTERM'); resolve({ status: -1, stdout, stderr: `${stderr}[TIMEOUT]` }); }, options.timeout)
      : null;
    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      resolve({ status: code, stdout, stderr });
    });
    child.on('error', (err) => {
      if (timer) clearTimeout(timer);
      resolve({ status: -1, stdout, stderr: err.message });
    });
  });
}

export function targetFileExists(targetFile) {
  if (!targetFile) return false;
  try {
    return fs.statSync(path.join(ROOT, targetFile)).size > 0;
  } catch {
    return false;
  }
}

export async function lastCommitShaForFile(targetFile) {
  // The commit that LAST modified target_file is the true "built" SHA for a
  // no-op rebuild: it holds the file's current content and is a stable ancestor
  // of whatever the running deploy serves, so deploy-proof containment passes
  // reliably. (HEAD would be wrong — later queue-status commits keep advancing
  // HEAD past the served SHA, so the deploy could never be proven to contain it.)
  try {
    const r = await spawnAsync('git', ['log', '-1', '--format=%H', '--', targetFile], { cwd: ROOT, timeout: 10_000 });
    const sha = String(r.stdout || '').trim();
    return /^[0-9a-f]{40}$/i.test(sha) ? sha : null;
  } catch {
    return null;
  }
}

/**
 * Bounded-concurrency map: run `fn` over `items` with at most `limit` in flight
 * at once, preserving input order in the results. This is the primitive that
 * lets the factory build MULTIPLE product lanes in parallel instead of one task
 * per cycle — the expensive part (the builder AI call per product) overlaps.
 */
export async function mapConcurrent(items, limit, fn) {
  const results = new Array(items.length);
  const width = Math.max(1, Math.min(Number(limit) || 1, items.length));
  let cursor = 0;
  const worker = async () => {
    while (cursor < items.length) {
      const idx = cursor;
      cursor += 1;
      results[idx] = await fn(items[idx], idx);
    }
  };
  await Promise.all(Array.from({ length: width }, worker));
  return results;
}

/**
 * Scan every product home for a structured BUILD_QUEUE.json that still has an
 * actionable (non-gated, dependency-satisfied) step. This is the general work
 * source that fixes "the loop had nothing buildable" — instead of two hardcoded
 * tasks, any product can declare ordered buildable steps and the loop executes
 * them one at a time.
 */
export function discoverBuildQueueWork() {
  const productsDir = path.join(ROOT, 'docs/products');
  const found = [];
  let productIds = [];
  try {
    productIds = fs.readdirSync(productsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return found;
  }
  const priorityList = loadProductPriority();
  for (const productId of productIds) {
    const queuePath = path.join(productsDir, productId, 'BUILD_QUEUE.json');
    if (!fs.existsSync(queuePath)) continue;
    try {
      const queue = loadBuildQueue(productId);
      reviveStaleBlockedSteps(queue);
      const { step } = selectNextStep(queue);
      if (step) {
        found.push({
          id: `product_build_${productId}_${step.id}`,
          kind: 'product_build_step',
          priority: 2 + productRankFraction(productId, priorityList),
          product: productId,
          product_id: productId,
          step_id: step.id,
          target_file: step.target_file,
          detail: `next buildable step: ${step.id}`,
        });
      }
    } catch (e) {
      log({ event: 'build_queue_parse_error', product_id: productId, error: e.message });
    }
  }
  return found;
}

/**
 * Scale lever: find products that have a PRODUCT_HOME with a documented backlog
 * but NO BUILD_QUEUE.json yet, so the loop can auto-plan a queue for them (via
 * the injected planner model) and pull them into the autonomous build lane.
 * Grounded in real documented work only — never fabricated.
 */
export function discoverPlanWork() {
  const productsDir = path.join(ROOT, 'docs/products');
  const found = [];
  let productIds = [];
  try {
    productIds = fs.readdirSync(productsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return found;
  }
  const priorityList = loadProductPriority();
  for (const productId of productIds) {
    if (fs.existsSync(queuePathForProduct(productId))) continue;
    const homePath = path.join(productsDir, productId, 'PRODUCT_HOME.md');
    if (!fs.existsSync(homePath)) continue;
    let backlogCount = 0;
    try {
      backlogCount = extractBacklog(fs.readFileSync(homePath, 'utf8')).length;
    } catch { backlogCount = 0; }
    if (backlogCount === 0) continue;
    found.push({
      id: `plan_build_queue_${productId}`,
      kind: 'plan_build_queue',
      priority: 5 + productRankFraction(productId, priorityList, backlogCount),
      product: productId,
      product_id: productId,
      home_path: homePath,
      detail: `${backlogCount} documented backlog item(s), no BUILD_QUEUE yet`,
    });
  }
  return found;
}

/**
 * Auto-plan a BUILD_QUEUE.json for a product from its PRODUCT_HOME backlog using
 * the injected planner model, then persist it so subsequent cycles execute the
 * steps. Fail-closed: writes nothing if planning yields no valid queue.
 */
async function runPlanBuildQueue(task, { callModel, logger } = {}) {
  if (typeof callModel !== 'function') {
    return { ok: false, detail: 'plan_skipped_no_model' };
  }
  let homeText = '';
  try {
    homeText = fs.readFileSync(task.home_path, 'utf8');
  } catch (e) {
    return { ok: false, detail: 'home_read_failed', error: e.message };
  }
  const planned = await planBuildQueue({ productId: task.product_id, homeText, callModel, logger });
  if (!planned || !planned.queue) {
    return { ok: false, detail: 'plan_produced_no_queue' };
  }
  const queuePath = queuePathForProduct(task.product_id);
  fs.mkdirSync(path.dirname(queuePath), { recursive: true });
  fs.writeFileSync(queuePath, `${JSON.stringify(planned.queue, null, 2)}\n`);
  log({ event: 'build_queue_planned', product_id: task.product_id, steps: planned.queue.steps.length, added: planned.added.length });
  return { ok: true, detail: 'build_queue_planned', product_id: task.product_id, steps: planned.queue.steps.length, added: planned.added.length };
}

export async function discoverProductExpansionWork(options = {}) {
  const baseUrl = options.baseUrl || process.env.PUBLIC_BASE_URL || '';
  const commandKey = options.commandKey || process.env.COMMAND_CENTER_KEY || '';
  const items = [];
  const pointB = loadPointBTarget();

  items.push(...discoverBuildQueueWork());
  items.push(...discoverPlanWork());

  const bpIncomplete = loadBpItems().filter((i) => isQueueItemIncomplete(i, { pointBTarget: pointB }));
  if (bpIncomplete.length && !process.env.BUILDEROS_AUTOPILOT) {
    items.push({
      id: 'bp_priority_foundation',
      kind: 'foundation_pipeline',
      priority: 1,
      mission_id: getActiveQueueItem(bpIncomplete, { pointBTarget: pointB })?.mission_id,
      detail: `${bpIncomplete.length} incomplete BP item(s)`,
    });
  }

  if (baseUrl) {
    const smosVerify = await spawnAsync(process.execPath, ['scripts/verify-socialmediaos.mjs'], {
      cwd: ROOT,
      env: { ...process.env, PUBLIC_BASE_URL: baseUrl, COMMAND_CENTER_KEY: commandKey },
      timeout: 30_000,
    });
    if (smosVerify.status !== 0) {
      items.push({
        id: 'smos_acceptance_repair',
        kind: 'acceptance_repair',
        priority: 2,
        product: 'SocialMediaOS',
        detail: 'verify-socialmediaos.mjs failing',
      });
    }
  }

  const sessionProbe = await probeSmoSessionCreate(baseUrl, commandKey);
  if (!sessionProbe.ok) {
    items.push({
      id: 'smos_session_crud',
      kind: 'schema_or_crud',
      priority: 2,
      product: 'SocialMediaOS',
      detail: `POST /socialmediaos/sessions → ${sessionProbe.status || sessionProbe.reason}`,
      migration_pending: smosSchemaMigrationPending(),
    });
  }

  const founderGapItems = loadBpItems().filter(
    (i) => i.verdict === 'TECHNICAL_PASS' && i.founder_usability_pass === false && i.mission_id,
  );
  for (const row of founderGapItems.slice(0, 3)) {
    items.push({
      id: `founder_gap_${row.mission_id}`,
      kind: 'founder_usability_gap',
      priority: 3,
      mission_id: row.mission_id,
      detail: 'TECHNICAL_PASS but founder_usability_pass false',
    });
  }

  items.push({
    id: 'smos_intake_expansion',
    kind: 'intake_blueprint',
    priority: 4,
    product: 'SocialMediaOS',
    session_id: SOCIALMEDIAOS_INTAKE_SESSION,
    detail: 'Run intake blueprint idempotent or next expansion steps',
  });

  items.sort((a, b) => a.priority - b.priority);
  return items;
}

export async function countProductWork(options = {}) {
  const work = await discoverProductExpansionWork(options);
  return {
    count: work.length,
    description: work.length
      ? `never-stop expansion: ${work[0].id} (+${Math.max(0, work.length - 1)} more)`
      : 'no expansion work (should not happen)',
    top: work[0] || null,
  };
}

async function tryRedeploy() {
  const r = await spawnAsync('npm', ['run', 'system:railway:redeploy'], {
    cwd: ROOT,
    timeout: 720_000,
    shell: true,
  });
  return { ok: r.status === 0, status: r.status };
}

// Coalesce concurrent redeploy requests: when several parallel lanes each commit
// and ask for a redeploy at once, we want ONE Railway redeploy, not N thrashing
// deploys. Callers that arrive while a redeploy is in flight share its promise.
let _redeployInFlight = null;
async function coalescedRedeploy() {
  if (_redeployInFlight) return _redeployInFlight;
  _redeployInFlight = tryRedeploy().finally(() => { _redeployInFlight = null; });
  return _redeployInFlight;
}

// Ask GitHub whether the running deploy's SHA already CONTAINS the built commit.
// GET /repos/:o/:r/compare/:base...:head with base=built, head=served returns a
// `status` of identical | behind | ahead | diverged. `behind`/`identical` mean
// the served commit is at or after the built one → the built code is live even
// though the exact SHA differs. Returns null on any failure so the caller stays
// fail-closed (a null comparison never counts as "live").
async function githubCompareStatus(baseSha, headSha) {
  const token = (process.env.GITHUB_TOKEN || '').trim();
  const repo = (process.env.GITHUB_REPO || '').trim();
  if (!token || !repo || !baseSha || !headSha) return null;
  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) return null;
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/compare/${baseSha}...${headSha}`,
      { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } },
    );
    if (!res.ok) return null;
    const body = await res.json();
    return body && typeof body.status === 'string' ? body.status : null;
  } catch {
    return null;
  }
}

async function postBuilderBuild(baseUrl, commandKey, body) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/v1/lifeos/builder/build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-command-key': commandKey },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = {};
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 400) }; }
  return { ok: res.ok, status: res.status, body: json };
}

/**
 * Commit a product's updated BUILD_QUEUE.json straight to the repo via the
 * GitHub Contents API (the same transport the builder primitive already uses),
 * so step status + attempt counts persist across the redeploys the deploy-truth
 * gate triggers. Fail-open: any missing credential / API error is returned, not
 * thrown, so it can never crash the loop. Skips the write when content is
 * unchanged so it does not spawn a redeploy for a no-op.
 */
async function commitQueueStatusToRepo(queue, stepId) {
  const token = (process.env.GITHUB_TOKEN || '').trim();
  const repo = (process.env.GITHUB_REPO || '').trim();
  const branch = process.env.GITHUB_DEPLOY_BRANCH || 'main';
  if (!token || !repo) return { ok: false, error: 'no_github_credentials' };
  const localPath = queue._sourcePath || queuePathForProduct(queue.product_id);
  const relPath = path.relative(ROOT, localPath).split(path.sep).join('/');
  const { _sourcePath, ...clean } = queue;
  const content = `${JSON.stringify(clean, null, 2)}\n`;
  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) return { ok: false, error: 'malformed_github_repo' };
  const apiBase = `https://api.github.com/repos/${owner}/${repoName}/contents/${relPath}`;
  const headers = { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };
  let sha;
  try {
    const getRes = await fetch(`${apiBase}?ref=${branch}`, { headers });
    if (getRes.ok) {
      const cur = await getRes.json();
      sha = cur.sha;
      if (cur.content && Buffer.from(cur.content, 'base64').toString('utf8') === content) {
        return { ok: false, error: 'no_change' };
      }
    }
  } catch { /* treat as new file */ }
  const body = {
    message: `[never-stop] queue status: ${queue.product_id} (${stepId})`,
    content: Buffer.from(content, 'utf8').toString('base64'),
    branch,
    ...(sha ? { sha } : {}),
  };
  const putRes = await fetch(apiBase, { method: 'PUT', headers, body: JSON.stringify(body) });
  if (putRes.ok || putRes.status === 201) return { ok: true };
  const errText = await putRes.text().catch(() => '');
  return { ok: false, error: errText.slice(0, 200), status: putRes.status };
}

/**
 * Execute one queued product build step end-to-end: hand the step to the live
 * builder primitive, require a real commit SHA (no false green), run the
 * product's verify script, and persist the queue (done / retry / blocked).
 */
async function runProductBuildStep(task, { baseUrl, commandKey, logger } = {}) {
  let queue;
  try {
    queue = loadBuildQueue(task.product_id);
  } catch (e) {
    return { ok: false, detail: 'build_queue_load_failed', error: e.message };
  }

  // Self-heal steps stranded as BLOCKED by a transient/since-fixed failure
  // before selecting work, so a fixed bug (e.g. the deploy-proof false-negative)
  // lets the loop finish the step instead of skipping it forever. Bounded +
  // persisted below so the revive survives the redeploy.
  const revived = reviveStaleBlockedSteps(queue);
  if (revived.length) {
    log({ event: 'blocked_steps_revived', product_id: task.product_id, revived });
  }

  const buildFn = async ({ target_file, task: stepTask, spec, last_error, max_output_tokens }) => {
    if (!baseUrl || !commandKey) return { ok: false, error: 'missing PUBLIC_BASE_URL / COMMAND_CENTER_KEY' };
    const stepTokenBudget = Number.isFinite(Number(max_output_tokens)) && Number(max_output_tokens) > 0
      ? Number(max_output_tokens)
      : null;
    // Verbatim error carry-forward: the builder's pre-commit gate RUNS the code
    // and blocks a commit on any runtime/anti-pattern failure. Retrying the same
    // prompt just regenerates the same bug (spin). Instead, feed the builder its
    // own verbatim failure and demand a root-cause fix — the "waterboard the AI
    // with its own error" self-repair pattern — until it commits or we exhaust.
    let priorError = last_error || null;
    for (let attempt = 1; attempt <= BUILD_REPAIR_ATTEMPTS; attempt += 1) {
      const repairBlock = priorError
        ? `\n\nREPAIR REQUIRED — your previous attempt was REJECTED by the pre-commit runtime gate with this VERBATIM error. Fix the ROOT CAUSE (do not suppress or swallow it), then output the full corrected file:\n${priorError}`
        : '';
      const build = await postBuilderBuild(baseUrl, commandKey, {
        domain: 'lifeos',
        mode: 'code',
        target_file,
        task: `[never-stop] ${stepTask}${repairBlock}`,
        spec,
        platform_gap_fill: true,
        platform_gap_fill_reason: `Autonomous product-build orchestrator executing queued BUILD_QUEUE.json step for product ${task.product_id} (${task.step_id}): ${stepTask}`.slice(0, 480),
        ...(stepTokenBudget ? { max_output_tokens: stepTokenBudget } : {}),
      });
      const b = build.body || {};
      const commit_sha = b.commit_sha || b.sha || b.commit || (b.result && b.result.commit_sha) || null;
      if (build.ok && commit_sha) {
        return { ok: true, commit_sha, error: null, repair_attempts: attempt - 1 };
      }
      // Idempotent completion: the builder ran cleanly but produced NO new commit
      // because target_file already exists with the desired content (a no-op
      // build — the artifact was shipped by an earlier attempt/session). That is
      // a legitimately-already-built step, NOT a failure. Without this, a step
      // whose file is already correct can never finish: every rebuild is a no-op,
      // yields no SHA, exhausts maxAttempts, and re-blocks forever. Complete it
      // honestly using the file's last-touching commit as the built SHA so verify
      // + deploy-proof still gate it (no false green — the file must exist AND be
      // served live before the step is marked done).
      if (build.ok && !commit_sha && targetFileExists(target_file)) {
        const builtSha = await lastCommitShaForFile(target_file);
        if (builtSha) {
          logger?.warn?.({ target_file, built: builtSha.slice(0, 8) }, '[never-stop] no-op build — file already present, completing via last-touching commit');
          return { ok: true, commit_sha: builtSha, error: null, no_op: true, repair_attempts: attempt - 1 };
        }
      }
      priorError = extractBuilderFailure(b) || (build.ok ? 'no_commit_sha' : `HTTP ${build.status}`);
      logger?.warn?.({ target_file, attempt, error: String(priorError).slice(0, 200) }, '[never-stop] build rejected — carrying verbatim error forward');
    }
    return { ok: false, commit_sha: null, error: priorError || 'build_failed_after_repair_attempts' };
  };

  const verifyFn = async ({ verify_script }) => {
    if (!verify_script) return { ok: true, detail: 'no_verify_script' };
    const r = await spawnAsync(process.execPath, [verify_script], {
      cwd: ROOT,
      env: { ...process.env, PUBLIC_BASE_URL: baseUrl, COMMAND_CENTER_KEY: commandKey },
      timeout: 120_000,
    });
    return { ok: r.status === 0, detail: r.status === 0 ? 'verify_pass' : `verify_exit_${r.status}` };
  };

  // Deploy-truth gate: after build+verify, trigger a redeploy and refuse to mark
  // the step "live" until the running deployment actually serves the built SHA.
  // In a busy repo (queue-status commits + up to NEVER_STOP_LANES parallel lanes)
  // the served SHA is almost always a DESCENDANT of the built commit, never an
  // exact match — so the proof also accepts a deploy whose SHA CONTAINS the built
  // commit, confirmed via the GitHub compare API. Without this, steps that built
  // fine were marked `blocked` after maxAttempts because exact-match could never
  // land (the "loop builds it but never finishes it" bug). The wait window is
  // widened to ~10 min to outlast a full Railway rebuild.
  const deployProofFn = async ({ commit_sha }) => {
    if (!baseUrl) return { ok: false, reason: 'no_base_url_for_deploy_proof' };
    if (!commit_sha) return { ok: false, reason: 'no_commit_sha_to_prove' };
    await coalescedRedeploy();
    // The /ready endpoint is auth-gated (401 without the command key), so the
    // proof MUST send it — otherwise every proof fails `ready_http_401`, the
    // deploy is never provable, and no step can ever reach `done` (the real
    // reason built steps stalled). Merge the header onto whatever opts the
    // prover passes (it sends Cache-Control + an abort signal).
    const authedFetch = (url, opts = {}) => fetch(url, {
      ...opts,
      headers: { ...(opts.headers || {}), 'x-command-key': commandKey },
    });
    const proof = await waitForDeploySha({
      expectedSha: commit_sha,
      baseUrl,
      fetchFn: authedFetch,
      attempts: 40,
      intervalMs: 15_000,
      compareFn: githubCompareStatus,
    });
    return {
      ok: proof.ok,
      reason: proof.ok ? null : (proof.reason || 'deploy_did_not_serve_sha'),
      served_sha: proof.served_sha,
      contains: proof.contains || false,
    };
  };

  const outcome = await runNextStep(queue, { buildFn, verifyFn, deployProofFn, logger });
  persistQueue(queue);
  // Durability (fixes rebuild-forever): persistQueue only writes the container's
  // LOCAL filesystem. deployProofFn triggers a redeploy that restarts from a fresh
  // git checkout, so a step marked "done" (and its attempt count) is lost and the
  // loop rebuilds the same step every cycle, never advancing. Commit the updated
  // queue back to the repo so status + attempts survive the redeploy.
  try {
    const committed = await commitQueueStatusToRepo(queue, task.step_id);
    if (!committed.ok && committed.error !== 'no_change') {
      logger?.warn?.({ product_id: task.product_id, step_id: task.step_id, error: committed.error }, '[never-stop] queue-status commit failed');
    }
  } catch (e) {
    logger?.warn?.({ product_id: task.product_id, error: e.message }, '[never-stop] queue-status commit threw');
  }

  // Truth-ladder the outcome: a "live" claim only holds at KNOW when the deploy
  // was proven; otherwise it is downgraded and parked on the re-confirm watchlist.
  const claim = enforceClaim({
    id: `${task.product_id}:${task.step_id}`,
    kind: 'deploy',
    text: `product step ${task.step_id} built + verified + served live`,
    grade: 'KNOW',
    proof: outcome.ok && outcome.deploy_proven ? { deploy_verified: true, commit_sha: outcome.commit_sha } : null,
  });
  const watch = toWatchlist([claim]);
  if (watch.length) {
    fs.mkdirSync(path.dirname(WATCHLIST_PATH), { recursive: true });
    for (const w of watch) fs.appendFileSync(WATCHLIST_PATH, `${JSON.stringify(w)}\n`);
  }

  log({ event: 'product_build_step', product_id: task.product_id, step_id: task.step_id, outcome, claim_grade: claim.grade, claim_flags: claim.flags });
  return { ok: outcome.ok, detail: 'product_build_step', outcome, claim, summary: queueSummary(queue) };
}

export async function runProductExpansionCycle(options = {}) {
  const logger = options.logger || console;
  const baseUrl = options.baseUrl || process.env.PUBLIC_BASE_URL || '';
  const commandKey = options.commandKey || process.env.COMMAND_CENTER_KEY || '';
  const token = hasTokenCapacity();
  if (!token.ok) {
    log({ event: 'token_capacity_halt', reason: token.reason });
    writeState({ status: 'token_halt', reason: token.reason });
    return { ok: false, halted: true, reason: 'token_capacity', detail: token.reason };
  }

  const work = await discoverProductExpansionWork({ baseUrl, commandKey });
  const task = work[0];
  if (!task) {
    log({ event: 'expansion_empty_unexpected' });
    return { ok: false, reason: 'no_work' };
  }

  log({ event: 'cycle_start', task });
  writeState({ status: 'running', current_task: task });

  let result = { ok: false, task_id: task.id };

  switch (task.kind) {
    case 'foundation_pipeline':
    case 'founder_usability_gap':
    default: {
      log({ event: 'bp_scheduler_deferred', task_id: task.id, kind: task.kind });
      result = { ...result, ok: true, detail: 'deferred_to_bp_scheduler' };
      break;
    }
    case 'product_build_step': {
      result = { ...result, ...(await runProductBuildStep(task, { baseUrl, commandKey, logger })) };
      break;
    }
    case 'plan_build_queue': {
      const callModel = options.callModel || defaultPlannerCallModel();
      result = { ...result, ...(await runPlanBuildQueue(task, { callModel, logger })) };
      break;
    }
    case 'acceptance_repair':
    case 'schema_or_crud': {
      const build = await postBuilderBuild(baseUrl, commandKey, {
        domain: 'lifeos',
        mode: 'code',
        target_file: 'db/migrations/20260629_socialmediaos_schema_align.sql',
        task: '[never-stop] SMOS schema align — add scheduled_for, session_id, published_at columns',
        spec: 'Apply idempotent ALTER TABLE for socialmediaos_sessions and socialmediaos_content_packs. SQL only.',
        platform_gap_fill: true,
      });
      result = { ...result, ok: build.ok, detail: 'builder_schema_align', build: build.body };
      if (build.ok) await tryRedeploy();
      break;
    }
    case 'intake_blueprint': {
      const intake = await executeIntakeBlueprint({
        sessionId: task.session_id || SOCIALMEDIAOS_INTAKE_SESSION,
        baseUrl,
        commandKey,
        dryRun: false,
      });
      result = { ...result, ok: intake.ok === true, detail: 'intake_blueprint', intake };
      break;
    }
  }

  log({ event: 'cycle_complete', task_id: task.id, ok: result.ok, detail: result.detail });
  writeState({ status: 'idle', last_task: task, last_result: result, cycles: (readState().cycles || 0) + 1 });
  logger?.info?.({ task: task.id, ok: result.ok }, '[NEVER-STOP-PRODUCT-FACTORY] cycle complete');
  return result;
}

/**
 * MULTIPLE LANES: build every product's next actionable step CONCURRENTLY, up to
 * `concurrency` at once, instead of one task per cycle. Phase 1 overlaps the
 * expensive per-product builder calls (bounded by `mapConcurrent`); redeploys are
 * coalesced into a single Railway deploy so parallel lanes don't thrash the
 * platform. Each lane still honors the full contract: real commit SHA, verify,
 * deploy-truth, truth-ladder — no false green, no false live.
 *
 * Dependency-injected (`laneStepFn`) so the concurrency behavior is unit-testable
 * without a live builder or network.
 */
export async function runProductExpansionLanes(options = {}) {
  const logger = options.logger || console;
  const baseUrl = options.baseUrl || process.env.PUBLIC_BASE_URL || '';
  const commandKey = options.commandKey || process.env.COMMAND_CENTER_KEY || '';
  const concurrency = Number(options.concurrency || process.env.NEVER_STOP_LANES || 3);

  if (!options.laneStepFn) {
    const token = hasTokenCapacity();
    if (!token.ok) {
      log({ event: 'lanes_token_halt', reason: token.reason });
      return { ok: false, halted: true, reason: 'token_capacity', detail: token.reason };
    }
  }

  const discover = options.discoverFn || discoverBuildQueueWork;
  const work = discover();
  if (!work.length) {
    log({ event: 'expansion_lanes_empty' });
    return { ok: true, lanes: 0, built: 0, live: 0, detail: 'no_build_queue_work' };
  }

  const laneStepFn = options.laneStepFn
    || ((task) => runProductBuildStep(task, { baseUrl, commandKey, logger }));

  writeState({ status: 'running_lanes', lanes: work.map((w) => w.id), concurrency });
  const results = await mapConcurrent(work, concurrency, async (task) => {
    try {
      const r = await laneStepFn(task, { baseUrl, commandKey, logger });
      return { task_id: task.id, product_id: task.product_id, ...r };
    } catch (e) {
      return { task_id: task.id, product_id: task.product_id, ok: false, error: e.message };
    }
  });

  const built = results.filter((r) => r && r.outcome && (r.outcome.commit_sha || (r.outcome.outcome && r.outcome.outcome.commit_sha))).length;
  const live = results.filter((r) => r && r.outcome && r.outcome.deploy_proven).length;
  log({ event: 'expansion_lanes', lanes: work.length, built, live });
  writeState({ status: 'idle', last_lanes: work.map((w) => w.id), lanes_built: built, lanes_live: live });
  return { ok: true, lanes: work.length, built, live, results };
}

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch {
    return {};
  }
}
