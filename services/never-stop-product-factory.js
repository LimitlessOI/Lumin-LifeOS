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
import { loadBuildQueue, selectNextStep, runNextStep, persistQueue, queueSummary, queuePathForProduct } from './product-build-orchestrator.js';
import { waitForDeploySha } from './deploy-truth.js';
import { enforceClaim, toWatchlist } from './truth-ladder.js';
import { extractBacklog, planBuildQueue } from './build-queue-planner.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BP_PATH = path.join(ROOT, 'builderos-reboot/BP_PRIORITY.json');
const LOG_PATH = path.join(ROOT, 'data/never-stop-product-factory-log.jsonl');
const STATE_PATH = path.join(ROOT, 'data/never-stop-product-factory-state.json');
const WATCHLIST_PATH = path.join(ROOT, 'data/truth-watchlist.jsonl');

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
  for (const productId of productIds) {
    const queuePath = path.join(productsDir, productId, 'BUILD_QUEUE.json');
    if (!fs.existsSync(queuePath)) continue;
    try {
      const queue = loadBuildQueue(productId);
      const { step } = selectNextStep(queue);
      if (step) {
        found.push({
          id: `product_build_${productId}_${step.id}`,
          kind: 'product_build_step',
          priority: 2,
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
      priority: 5,
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

  const buildFn = async ({ target_file, task: stepTask, spec }) => {
    if (!baseUrl || !commandKey) return { ok: false, error: 'missing PUBLIC_BASE_URL / COMMAND_CENTER_KEY' };
    const build = await postBuilderBuild(baseUrl, commandKey, {
      domain: 'lifeos',
      mode: 'code',
      target_file,
      task: `[never-stop] ${stepTask}`,
      spec,
      platform_gap_fill: true,
      platform_gap_fill_reason: `Autonomous product-build orchestrator executing queued BUILD_QUEUE.json step for product ${task.product_id} (${task.step_id}): ${stepTask}`.slice(0, 480),
    });
    const b = build.body || {};
    const commit_sha = b.commit_sha || b.sha || b.commit || (b.result && b.result.commit_sha) || null;
    return { ok: build.ok, commit_sha, error: build.ok ? null : (b.error || `HTTP ${build.status}`) };
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
  const deployProofFn = async ({ commit_sha }) => {
    if (!baseUrl) return { ok: false, reason: 'no_base_url_for_deploy_proof' };
    if (!commit_sha) return { ok: false, reason: 'no_commit_sha_to_prove' };
    await tryRedeploy();
    const proof = await waitForDeploySha({
      expectedSha: commit_sha,
      baseUrl,
      fetchFn: (...a) => fetch(...a),
      attempts: 20,
      intervalMs: 15_000,
    });
    return { ok: proof.ok, reason: proof.ok ? null : (proof.reason || 'deploy_did_not_serve_sha'), served_sha: proof.served_sha };
  };

  const outcome = await runNextStep(queue, { buildFn, verifyFn, deployProofFn, logger });
  persistQueue(queue);

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
      result = { ...result, ...(await runPlanBuildQueue(task, { callModel: options.callModel, logger })) };
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

function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
  } catch {
    return {};
  }
}
