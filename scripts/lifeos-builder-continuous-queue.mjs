#!/usr/bin/env node
/**
 * SYNOPSIS: 24×7 supervised autonomous builder queue — executes structured **`POST /builder/build`** tasks from SSOT JSON.
 * 24×7 supervised autonomous builder queue — executes structured **`POST /builder/build`** tasks from SSOT JSON.
 *
 * Same runner **`npm run lifeos:builder:queue`** invokes; the daemon chains it every cycle after probe/full supervise.
 * Env aliases: **`BUILDER_QUEUE_*`** (preferred) and legacy **`OVERNIGHT_*`** remain supported for shells/PM2.
 *
 * Canonical paths (2026 onward):
 * - Tasks SSOT: **`docs/projects/LIFEOS_DASHBOARD_BUILDER_QUEUE.json`**
 * - Telemetry: **`data/builder-continuous-queue-last-run.json`**, **`data/builder-continuous-queue-log.jsonl`**
 * - Lane cursor: **`data/builder-continuous-queue-cursor.<lane-slug>.json`** (migration reads pre-rename cursors).
 *
 * Precondition (first lane): **`npm run lifeos:builder:supervise`** on same **`PUBLIC_BASE_URL`** once.
 *
 * **`--reset-cursor-only`** — resets lane cursor then **exits without `/build`** (prevents chaining reset + accidental full-queue run).
 *
 * **Quarantine (2026-05-24):** This legacy shadow queue runner does **not** execute unless
 * **`BUILDER_QUEUE_ENABLED=1`** is set explicitly. Product work uses **`builderos-reboot/BP_PRIORITY.json`**
 * (priority ranking) → mission **`BLUEPRINT.json`** (work plan) — not this JSON task list.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import 'dotenv/config';

import { appendFile, readFile, writeFile } from 'fs/promises';
import { basename, isAbsolute, join } from 'path';
import { promisify } from 'util';
import { execFile } from 'child_process';
import {
  getEscalationHint,
  recordFailure as recordBuilderFailure,
  resolveTask as resolveBuilderTask,
} from './lib/builder-failure-memory.mjs';
import { validateQueueContract } from '../services/builderos-useful-work-contracts.js';
import { isLocked, getLock } from './lib/autonomy-write-lock.mjs';
import { buildClosureRecord } from './lib/closure-contract.mjs';
import { makePrediction, evaluatePrediction } from './lib/prediction-loop.mjs';

const execFileAsync = promisify(execFile);

/** Legacy shadow queue — opt-in only; default quarantined for migration/audit. */
function isLegacyBuilderQueueEnabled() {
  return String(process.env.BUILDER_QUEUE_ENABLED || '').trim() === '1';
}

function exitIfLegacyQueueQuarantined() {
  if (isLegacyBuilderQueueEnabled()) return;
  console.error(
    [
      '',
      'LEGACY BUILDER QUEUE QUARANTINED',
      'scripts/lifeos-builder-continuous-queue.mjs will not run tasks autonomously.',
      'This runner is preserved for migration/audit only.',
      'Opt in explicitly: BUILDER_QUEUE_ENABLED=1',
      'Product work queue: builderos-reboot/BP_PRIORITY.json (rank) → mission BLUEPRINT.json (steps).',
      '',
    ].join('\n'),
  );
  process.exit(0);
}

const ROOT = process.cwd();
const DEFAULT_TASKS_PATH = join(ROOT, 'docs/projects/LIFEOS_DASHBOARD_BUILDER_QUEUE.json');
// Overridden in main() to a lane-specific path so the auditor's per-lane reads stay aligned.
let LOG_PATH = join(ROOT, 'data/builder-continuous-queue-log.jsonl');
const LAST_RUN_PATH = join(ROOT, 'data/builder-continuous-queue-last-run.json');
const QUARANTINE_PATH = join(ROOT, 'data/quarantined-tasks.json');
const QUARANTINE_CLEARED_PATH = join(ROOT, 'data/quarantine-cleared-tasks.json');
const PREDICTION_LOG_PATH = join(ROOT, 'data/prediction-loop.jsonl');
const LEGACY_CURSOR_PATH = join(ROOT, 'data', 'builder-overnight-cursor.json');
/** Pre-rename default queue lane — `loadCursor()` reads this once to preserve `nextStartIndex`. */
const LEGACY_PRE_RENAME_QUEUE_CURSOR = join(
  ROOT,
  'data',
  'builder-overnight-cursor.lifeos-dashboard-overnight-tasks.json',
);

function retryableReady(status) {
  return status === 502 || status === 503 || status === 504 || status === 429;
}

/**
 * When true (default), a task that fails with a JS syntax error is immediately self-quarantined
 * and the queue continues to the next task rather than stopping the batch. The syntax gate already
 * blocked the bad commit — stopping the whole batch compounds the damage by also blocking every
 * subsequent task. Non-syntax failures (auth, 5xx, spec contamination) still stop the batch.
 * Set BUILDER_QUEUE_SKIP_SYNTAX_FAILS=0 to restore the old hard-stop behaviour.
 */
function skipOnSyntaxFail() {
  const raw = String(process.env.BUILDER_QUEUE_SKIP_SYNTAX_FAILS || "1").trim();
  return !/^0|false|no$/i.test(raw);
}

function slugifyLane(value) {
  return String(value || 'default')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'default';
}

function resolveTasksPath(input) {
  if (!input) return DEFAULT_TASKS_PATH;
  return isAbsolute(input) ? input : join(ROOT, input);
}

function inferLaneName(tasksPath, explicitLane = '') {
  return explicitLane || basename(tasksPath, '.json');
}

function cursorPathForLane(laneName) {
  return join(ROOT, 'data', `builder-continuous-queue-cursor.${slugifyLane(laneName)}.json`);
}

function legacyCursorCandidatesForMigration(tasksPath, cursorPath) {
  const slugified = slugifyLane(basename(tasksPath, '.json'));
  const laneMatchesDefault =
    tasksPath.endsWith('LIFEOS_DASHBOARD_BUILDER_QUEUE.json') ||
    basename(tasksPath, '.json') === 'LIFEOS_DASHBOARD_BUILDER_QUEUE';
  const laneMatchesOld =
    tasksPath.endsWith('LIFEOS_DASHBOARD_OVERNIGHT_TASKS.json') ||
    basename(tasksPath, '.json') === 'LIFEOS_DASHBOARD_OVERNIGHT_TASKS';
  const legacyPerLaneOld = join(
    ROOT,
    'data',
    `builder-overnight-cursor.${slugifyLane('LIFEOS_DASHBOARD_OVERNIGHT_TASKS')}.json`,
  );
  const legacyPerSlug = join(ROOT, 'data', `builder-overnight-cursor.${slugified}.json`);
  /** @type {string[]} */
  const out = [];
  if (laneMatchesDefault || laneMatchesOld || cursorPath === legacyPerLaneOld) {
    out.push(LEGACY_PRE_RENAME_QUEUE_CURSOR, legacyPerLaneOld);
  }
  if (!out.includes(legacyPerSlug)) out.push(legacyPerSlug);
  return out.filter((p, i, a) => a.indexOf(p) === i && p !== cursorPath);
}

/** Prepended to `files[]` for LifeOS shell/dashboard targets so council always sees the UI map + boards. */
const DASHBOARD_UI_GROUNDING_FILES = [
  'docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md',
  'docs/LIFEOS_PROGRAM_MAP_SSOT.md',
  'docs/projects/LIFEOS_UX_ARCHITECTURE.md',
  'docs/mockups/DASHBOARD_UI_MAP.md',
  'docs/mockups/lifeos-system-map-board-2x.png',
  'docs/mockups/lifeos-shell-dashboard-architecture-board-2x.png',
  'docs/mockups/lifeos-expansion-stack-board-2x.png',
  'docs/mockups/lifeos-dashboard-density-study-light-dark-mobile-desktop.png',
];

function dashboardUiGroundingEnabled() {
  const raw = String(process.env.BUILDER_ENFORCE_UI_MAP || '1').trim();
  return !/^0|false|no$/i.test(raw);
}

function taskWantsDashboardUiGrounding(task) {
  if (!dashboardUiGroundingEnabled()) return false;
  const tf = String(task.target_file || '')
    .toLowerCase()
    .replace(/\\/g, '/');
  if (!tf) return false;
  if (tf.includes('lifeos-dashboard')) return true;
  if (tf.includes('lifeos-app.html')) return true;
  if (tf.includes('lifeos-bootstrap')) return true;
  if (tf.includes('public/shared/') && tf.includes('lifeos-dashboard')) return true;
  if (tf.includes('public/overlay/lifeos-dashboard')) return true;
  if (tf.includes('public/overlay/lifeos-app')) return true;
  if (tf.includes('public/overlay/lifeos-login')) return true;
  return false;
}

function mergeDashboardUiGroundingFiles(files) {
  const base = Array.isArray(files) ? [...files] : [];
  const seen = new Set(base.map((f) => String(f).trim().replace(/^[/\\]+/, '')));
  const prefix = [];
  for (const p of DASHBOARD_UI_GROUNDING_FILES) {
    if (!seen.has(p)) {
      seen.add(p);
      prefix.push(p);
    }
  }
  return [...prefix, ...base];
}

async function persistCursor(cursorPath, nextStartIndex) {
  await writeFile(
    cursorPath,
    `${JSON.stringify({ nextStartIndex, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    'utf8',
  ).catch(() => {});
}

async function loadCursor(cursorPath, tasksPath) {
  const migration = legacyCursorCandidatesForMigration(tasksPath, cursorPath);
  const candidates = [cursorPath, ...migration, LEGACY_CURSOR_PATH];
  for (const candidate of candidates) {
    try {
      const raw = await readFile(candidate, 'utf8');
      const j = JSON.parse(raw);
      if (typeof j.nextStartIndex === 'number' && j.nextStartIndex >= 0) return j;
    } catch {
      // try next candidate
    }
  }
  return { nextStartIndex: 0 };
}

async function loadQuarantinedTaskIds(laneName, tasks = []) {
  const validTaskIds = new Set(
    (Array.isArray(tasks) ? tasks : [])
      .map((task) => task?.id)
      .filter((id) => typeof id === 'string' && id.length > 0),
  );
  try {
    const raw = await readFile(QUARANTINE_PATH, 'utf8');
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows)) return new Set();
    return new Set(
      rows
        .filter(
          (row) =>
            row &&
            typeof row.task_id === 'string' &&
            String(row.lane || '') === String(laneName || '') &&
            validTaskIds.has(row.task_id),
        )
        .map((row) => row.task_id),
    );
  } catch {
    return new Set();
  }
}

const base = (
  process.env.BUILDER_BASE_URL ||
  process.env.PUBLIC_BASE_URL ||
  process.env.LUMIN_SMOKE_BASE_URL ||
  'http://127.0.0.1:3000'
).replace(/\/$/, '');

const key =
  process.env.COMMAND_CENTER_KEY ||
  process.env.COMMAND_KEY ||
  process.env.LIFEOS_KEY ||
  process.env.API_KEY ||
  '';

const DEFAULT_MODEL =
  process.env.BUILDER_CONTINUOUS_QUEUE_MODEL ||
  process.env.BUILDER_QUEUE_MODEL ||
  process.env.BUILDER_OVERNIGHT_MODEL ||
  process.env.BUILDER_SUPERVISE_MODEL ||
  'gemini_flash';
const LEGACY_TASK_MODELS = new Set([
  'claude_via_openrouter',
  'openrouter_free',
  'together_free',
]);

/** Per-task `"branch"` in JSON wins over `BUILDER_QUEUE_COMMIT_BRANCH` / `BUILDER_COMMIT_BRANCH` (omit all for default repo branch, usually main). */
function resolveQueueTaskCommitBranch(task) {
  const fromTask = typeof task?.branch === 'string' ? task.branch.trim() : '';
  if (fromTask) return fromTask;
  const fromEnv = String(
    process.env.BUILDER_QUEUE_COMMIT_BRANCH || process.env.BUILDER_COMMIT_BRANCH || '',
  ).trim();
  return fromEnv !== '' ? fromEnv : null;
}

/** When true (default), emit JSONL + stderr when a task commits on implicit default branch — trust-ramp signal, not a hard block. */
function warnImplicitDefaultBranchEnabled() {
  const raw = String(process.env.BUILDER_QUEUE_SILENCE_DEFAULT_BRANCH_WARNING || '').trim();
  return raw !== '1' && !/^true|yes$/i.test(raw);
}

/** When true, refuse to run any selected task whose resolved branch is null (every task must get a branch from env or per-task `branch`). */
function requireExplicitCommitBranch() {
  const raw = String(process.env.BUILDER_QUEUE_REQUIRE_COMMIT_BRANCH || '').trim();
  return raw === '1' || /^true|yes$/i.test(raw);
}

/** Slim receipt fields from POST /build JSON for telemetry / future lookback. */
/** For throughput interpretability — group comparable slices (`markdown_spec`, `overlay_html`, …). */
function sliceProfileFromTargetFile(targetPath) {
  const s = String(targetPath || "").toLowerCase();
  if (s.endsWith(".md")) return "markdown_spec";
  if (s.endsWith(".html")) return "overlay_html";
  if (s.endsWith(".css")) return "stylesheet";
  if (s.endsWith(".js")) return "javascript";
  return "other";
}

function summarizeBuildResponse(json) {
  if (!json || typeof json !== 'object') return {};
  const rw = json.route_wired;
  let route_wired_summary = null;
  if (rw && typeof rw === 'object') {
    route_wired_summary = {
      ok: rw.ok === true,
      skipped: rw.skipped === true,
      mountPath: typeof rw.mountPath === 'string' ? rw.mountPath : null,
    };
  }
  return {
    target_file: typeof json.target_file === 'string' ? json.target_file : null,
    model_used: typeof json.model_used === 'string' ? json.model_used : null,
    route_wired_summary,
  };
}

function argValue(flag, fallback = null) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] || fallback;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function requiredHeaders() {
  if (!key) {
    throw Object.assign(new Error('Missing COMMAND_CENTER_KEY / LIFEOS_KEY / API_KEY in shell env'), { exitCode: 2 });
  }
  return {
    'content-type': 'application/json',
    'x-command-key': key,
  };
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 2000) };
  }
  return { res, json, text };
}

async function assertReady() {
  const headers = key ? { 'x-command-key': key } : {};
  const max = Math.max(
    1,
    parseInt(
      process.env.BUILDER_QUEUE_READY_RETRIES || process.env.OVERNIGHT_READY_RETRIES || '10',
      10,
    ) || 10,
  );
  for (let attempt = 0; attempt < max; attempt++) {
    const { res, json } = await fetchJson(`${base}/api/v1/lifeos/builder/ready`, { headers });
    if (!res.ok && retryableReady(res.status) && attempt < max - 1) {
      await sleep(1500 + attempt * 1500);
      continue;
    }
    if (!res.ok) {
      throw new Error(`Builder /ready failed HTTP ${res.status}: ${JSON.stringify(json)}`);
    }
    const { res: dRes, json: dJson } = await fetchJson(`${base}/api/v1/lifeos/builder/domains`, { headers });
    if (!dRes.ok && retryableReady(dRes.status) && attempt < max - 1) {
      await sleep(1500 + attempt * 1500);
      continue;
    }
    if (!dRes.ok) {
      throw new Error(`Builder /domains failed HTTP ${dRes.status}: ${JSON.stringify(dJson)}`);
    }
    return;
  }
}

async function runBuild(task) {
  const requestedModel = typeof task.model === 'string' ? task.model.trim() : '';
  const useLegacyTaskModel = process.env.BUILDER_ALLOW_LEGACY_TASK_MODEL === '1';
  const forceModel = task.force_model === true;
  const model =
    requestedModel && (forceModel || !LEGACY_TASK_MODELS.has(requestedModel) || useLegacyTaskModel)
      ? requestedModel
      : DEFAULT_MODEL;
  const modelResolution =
    requestedModel === ''
      ? 'default'
      : model === requestedModel
        ? (forceModel ? 'task_forced' : 'task_requested')
        : `task_override_blocked:${requestedModel}`;
  const branchEffective = resolveQueueTaskCommitBranch(task);

  const rawFiles = task.files || [];
  const files = taskWantsDashboardUiGrounding(task) ? mergeDashboardUiGroundingFiles(rawFiles) : rawFiles;

  const body = {
    domain: task.domain || 'lifeos-platform',
    mode: 'code',
    model,
    autonomy_mode: 'max',
    internet_research: false,
    files,
    task: task.task,
    spec: task.spec,
    target_file: task.target_file,
    commit_message: task.commit_message,
    ...(branchEffective ? { branch: branchEffective } : {}),
  };
  const supervisorMotRaw = Number(task.max_output_tokens ?? task.maxOutputTokens ?? NaN);
  if (Number.isFinite(supervisorMotRaw) && supervisorMotRaw > 0) {
    body.max_output_tokens = Math.min(128000, Math.floor(supervisorMotRaw));
  }
  const url = `${base}/api/v1/lifeos/builder/build`;
  const jsonBody = JSON.stringify(body);
  const maxAttempts = Math.max(
    1,
    parseInt(process.env.BUILDER_QUEUE_BUILD_RETRIES || process.env.OVERNIGHT_BUILD_RETRIES || '4', 10) || 4,
  );
  let last = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { res, json } = await fetchJson(url, {
      method: 'POST',
      headers: requiredHeaders(),
      body: jsonBody,
    });
    last = { res, json };
    const ok = res.ok && json?.ok === true && json?.committed === true;
    if (ok) return { res, json, ok: true, requestedModel, effectiveModel: model, modelResolution };
    const retryable = res.status === 502 || res.status === 503 || res.status === 504;
    if (retryable && attempt < maxAttempts - 1) {
      const wait = 2000 + attempt * 3500;
      await logLine({
        event: 'task_retry',
        id: task.id,
        http: res.status,
        attempt: attempt + 1,
        wait_ms: wait,
      });
      await sleep(wait);
      continue;
    }
    return { res, json, ok: false, requestedModel, effectiveModel: model, modelResolution };
  }
  return {
    ...last,
    ok: false,
    requestedModel,
    effectiveModel: model,
    modelResolution,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function logLine(obj) {
  const line = `${JSON.stringify({ ts: new Date().toISOString(), ...obj })}\n`;
  await appendFile(LOG_PATH, line, 'utf8').catch(() => {});
  console.log(line.trimEnd());
}

async function logPrediction(obj) {
  const line = `${JSON.stringify({ ts: new Date().toISOString(), ...obj })}\n`;
  await appendFile(PREDICTION_LOG_PATH, line, 'utf8').catch(() => {});
}

/** Machine receipt for daemon / operators — wall clock vs `/build` time (answers “was 7h busy?”). */
async function persistLastRun(payload) {
  const body = {
    schema_version: 'builder_continuous_queue_last_run_v1',
    finished_at: new Date().toISOString(),
    ...payload,
  };
  await writeFile(LAST_RUN_PATH, `${JSON.stringify(body, null, 2)}\n`, 'utf8').catch(() => {});
}

/**
 * Immediately adds a task to the quarantine file so subsequent queue runs skip it.
 * Called when a syntax fail is detected at build time — prevents the same bad task
 * from burning repeated build cycles. Sentinel's detectAndWriteQuarantinedTasks
 * manages the authoritative list; this is a fast-path write that races it.
 */
async function selfQuarantineTask(task, lane, syntaxError) {
  try {
    // Load supervisor-cleared exemptions — never re-quarantine tasks the supervisor explicitly cleared.
    const clearedKeys = new Set();
    try {
      const clearedRaw = await readFile(QUARANTINE_CLEARED_PATH, 'utf8');
      const clearedList = JSON.parse(clearedRaw);
      if (Array.isArray(clearedList)) {
        for (const e of clearedList) {
          if (e.worker_id && e.task_id) clearedKeys.add(`${e.worker_id}:${e.task_id}`);
          if (e.lane && e.task_id) clearedKeys.add(`${e.lane}:${e.task_id}`);
        }
      }
    } catch { /* cleared list is optional */ }

    // Skip quarantine if this task was explicitly cleared by the supervisor.
    if (clearedKeys.has(`${lane}:${task.id}`) || clearedKeys.has(`${lane || 'default'}:${task.id}`)) {
      return;
    }

    const raw = await readFile(QUARANTINE_PATH, 'utf8').catch(() => '[]');
    const existing = JSON.parse(raw);
    const alreadyIn = Array.isArray(existing) && existing.some(
      (e) => e.task_id === task.id && String(e.lane || '') === String(lane || ''),
    );
    if (!alreadyIn) {
      const entry = {
        task_id: task.id,
        worker_id: lane,
        lane: lane,
        quarantined_at: new Date().toISOString(),
        failure_count: 1,
        last_error: String(syntaxError || 'syntax_fail').slice(0, 300),
        source: 'self_quarantine_syntax_fail',
      };
      const updated = Array.isArray(existing) ? [...existing, entry] : [entry];
      await writeFile(QUARANTINE_PATH, `${JSON.stringify(updated, null, 2)}\n`, 'utf8').catch(() => {});
    }
  } catch {
    // quarantine write is best-effort — do not block queue progress
  }
}

/**
 * Returns { skip: true, lineCount } when a .js target_file already exists on disk,
 * has enough lines, and passes `node --check`. Non-.js files always return skip=false
 * — no deterministic verifier exists here for HTML/CSS/MD.
 *
 * Purpose: prevent the daemon from re-calling the builder for a file that a GAP-FILL
 * or prior successful builder cycle already wrote. Saves tokens and stops the
 * repeated-truncation loop (file exists → builder truncates → circuit breaker fires).
 */
async function checkIfAlreadyShipped(task) {
  const targetFile = task.target_file;
  if (!targetFile || !targetFile.endsWith('.js')) return { skip: false };
  const absPath = isAbsolute(targetFile) ? targetFile : join(ROOT, targetFile);
  let content;
  try {
    content = await readFile(absPath, 'utf8');
  } catch {
    return { skip: false }; // file not on disk — normal, proceed with build
  }
  const lineCount = content.split('\n').length;
  const minLines = Math.max(
    5,
    parseInt(process.env.BUILDER_SKIP_IF_SHIPPED_MIN_LINES || '10', 10) || 10,
  );
  if (lineCount < minLines) return { skip: false, detail: `too_short_${lineCount}` };
  try {
    await execFileAsync(process.execPath, ['--check', absPath], { timeout: 8000 });
  } catch {
    return { skip: false, detail: 'syntax_fail' };
  }
  return { skip: true, lineCount };
}

function baseLastRunSkeleton({
  lane,
  tasksPath,
  cursorPath,
  wrap,
  useCursor,
  taskCount,
  startIdx,
  sliceMax,
  selectedLength,
}) {
  return {
    lane,
    tasks_path_relative: tasksPath.replace(`${ROOT}/`, ''),
    cursor_path_relative: cursorPath.replace(`${ROOT}/`, ''),
    wrap_cursor: wrap,
    use_cursor: useCursor,
    task_json_count: taskCount,
    slice_start_idx: startIdx,
    slice_requested_max: sliceMax,
    slice_selected_count: selectedLength,
  };
}

function queueCursorWrapEnabled() {
  const raw = process.env.BUILDER_QUEUE_CURSOR_WRAP ?? process.env.OVERNIGHT_CURSOR_WRAP ?? '';
  return raw === '1' || /^true|yes$/i.test(String(raw).trim());
}

function queueCursorAdvanceEnabled() {
  const raw = process.env.BUILDER_QUEUE_USE_CURSOR ?? process.env.OVERNIGHT_USE_CURSOR ?? '1';
  return !/^0|false|no$/i.test(String(raw).trim()) && !hasFlag('--no-cursor');
}

function selectQueueSlice(tasks, { startIdx, max, wrap, quarantinedIds }) {
  const selected = [];
  const skipped = [];
  const total = tasks.length;
  if (!total || max <= 0) {
    return { selected, skipped, nextCursor: startIdx, wrapped: false };
  }

  let idx = Math.min(Math.max(0, startIdx), total);
  let wrapped = false;
  let inspected = 0;
  let nextCursor = idx;
  const hardLimit = wrap ? total * 2 : total;

  while (selected.length < max && idx < total && inspected < hardLimit) {
    const task = tasks[idx];
    const wrappedPass = wrapped || idx < startIdx;

    if (quarantinedIds.has(task.id)) {
      skipped.push({ id: task.id, reason: 'quarantined', target_file: task.target_file || null });
    } else if (wrappedPass && task.skip_on_wrap === true) {
      skipped.push({ id: task.id, reason: 'skip_on_wrap', target_file: task.target_file || null });
    } else {
      selected.push(task);
    }

    idx += 1;
    inspected += 1;
    if (idx >= total) {
      if (wrap && !wrapped) {
        wrapped = true;
        idx = 0;
      } else {
        break;
      }
    }
    nextCursor = idx;
    if (wrapped && idx >= startIdx) break;
  }

  return { selected, skipped, nextCursor, wrapped };
}

async function main() {
  exitIfLegacyQueueQuarantined();

  const dry = hasFlag('--dry-run');
  const max = parseInt(
    argValue('--max', process.env.BUILDER_QUEUE_MAX || process.env.OVERNIGHT_MAX || ''),
    10,
  ) || 999;
  const singleId = argValue('--task', null);
  const useCursor = queueCursorAdvanceEnabled();
  const hasExplicitStart = process.argv.includes('--start');
  const tasksPath = resolveTasksPath(argValue('--tasks-file', process.env.BUILDER_TASKS_PATH || DEFAULT_TASKS_PATH));
  const lane = inferLaneName(tasksPath, argValue('--lane', process.env.BUILDER_TASK_LANE || ''));
  const cursorPath = cursorPathForLane(lane);
  // Route log to lane-specific file so the auditor's per-lane reads are aligned with the writer.
  // Default lane (LIFEOS_DASHBOARD_BUILDER_QUEUE) keeps the legacy default path unchanged.
  if (lane && lane !== 'LIFEOS_DASHBOARD_BUILDER_QUEUE') {
    LOG_PATH = join(ROOT, 'data', `builder-continuous-queue-log.${slugifyLane(lane)}.jsonl`);
  }

  const resetRequested = hasFlag("--reset-cursor") || hasFlag("--reset-cursor-only");
  if (resetRequested) {
    await persistCursor(cursorPath, 0);
    console.log(`Autonomous queue lane cursor reset nextStartIndex=0 (${cursorPath.replace(`${ROOT}/`, '')})`);
  }
  if (hasFlag("--reset-cursor-only")) {
    console.log("Exit (--reset-cursor-only): cursor reset complete — run queue separately with BUILDER_QUEUE_MAX if you want homogeneous slices.");
    process.exit(0);
  }

  const raw = await readFile(tasksPath, 'utf8');
  const parsed = JSON.parse(raw);
  const tasks = parsed.tasks || [];
  const quarantinedIds = await loadQuarantinedTaskIds(lane, tasks);

  let startIdx = 0;
  if (hasExplicitStart) {
    startIdx = Math.max(0, parseInt(argValue('--start', '0'), 10) || 0);
  } else if (useCursor && !singleId) {
    const c = await loadCursor(cursorPath, tasksPath);
    startIdx = Math.min(c.nextStartIndex || 0, Math.max(0, tasks.length));
  } else {
    startIdx = Math.max(0, parseInt(argValue('--start', '0'), 10) || 0);
  }

  const wrap = queueCursorWrapEnabled();
  if (startIdx >= tasks.length && wrap && !singleId) {
    startIdx = 0;
    await persistCursor(cursorPath, 0);
  }

  let selected = tasks;
  let skipped = [];
  let nextCursor = startIdx;
  if (singleId) {
    selected = tasks.filter((t) => t.id === singleId);
    if (selected.length === 0) throw new Error(`Unknown task id: ${singleId}`);
    if (quarantinedIds.has(singleId)) {
      throw new Error(`Task ${singleId} is quarantined for lane ${lane}; repair it before forcing a rerun.`);
    }
  } else {
    const slice = selectQueueSlice(tasks, { startIdx, max, wrap, quarantinedIds });
    selected = slice.selected;
    skipped = slice.skipped;
    nextCursor = slice.nextCursor;
  }

  const redeployAfter = hasFlag('--redeploy-after-success');
  const sleepMs = Math.max(
    0,
    parseInt(
      argValue('--sleep-ms', process.env.BUILDER_QUEUE_SLEEP_MS || process.env.OVERNIGHT_SLEEP_MS || '2500'),
      10,
    ) || 0,
  );

  console.log(`Continuous autonomous queue — base URL: ${base}`);
  console.log(
    `Lane=${lane} tasks=${tasksPath.replace(`${ROOT}/`, '')} selected=${selected.length} (dry-run=${dry}) startIdx=${startIdx} cursor=${useCursor} cursor-path=${cursorPath.replace(`${ROOT}/`, '')} sleep-ms=${sleepMs} redeploy-after=${redeployAfter}`,
  );
  if (!singleId && skipped.length > 0) {
    console.log(`Skipped ${skipped.length} task(s): ${skipped.map((s) => `${s.id}:${s.reason}`).join(', ')}`);
  }

  if (dry) {
    for (const t of selected) {
      console.log(`- ${t.id} → ${t.target_file}`);
    }
    return;
  }

  if (!key) throw new Error('COMMAND_CENTER_KEY (or alias) required for autonomous `/build` queue');

  const runnerT0 = Date.now();
  const skeleton = () =>
    baseLastRunSkeleton({
      lane,
      tasksPath,
      cursorPath,
      wrap,
      useCursor,
      taskCount: tasks.length,
      startIdx,
      sliceMax: max,
      selectedLength: selected.length,
    });

  if (selected.length === 0) {
    if (useCursor && !singleId) {
      await persistCursor(cursorPath, nextCursor);
    }
    const wallMs = Date.now() - runnerT0;
    await persistLastRun({
      ...skeleton(),
      ok: true,
      runner_exit_code: 0,
      idle_slice: true,
      idle_reason: 'queue_slice_empty',
      build_attempts: 0,
      build_commits: 0,
      build_wall_ms_sum: 0,
      runner_wall_ms: wallMs,
      queue_skipped_count: skipped.length,
      queue_skipped: skipped,
      throughput_note:
        'Slice empty — supervised daemon cycles can idle in milliseconds. Append tasks to LIFEOS_DASHBOARD_BUILDER_QUEUE.json, run --reset-cursor, or set BUILDER_QUEUE_CURSOR_WRAP=1 (legacy OVERNIGHT_CURSOR_WRAP) when bounded/soak sessions should recycle the backlog.',
    });
    await logLine({
      event: 'queue_idle',
      legacy_event_aliases: ['overnight_idle'],
      lane,
      tasks_path: tasksPath,
      reason: 'queue_slice_empty',
      startIdx,
      taskCount: tasks.length,
      skipped_count: skipped.length,
      runner_wall_ms: wallMs,
      last_run_path_relative: LAST_RUN_PATH.replace(`${ROOT}/`, ''),
      hint: `All tasks in JSON done for this cursor — add tasks, delete ${cursorPath.replace(`${ROOT}/`, '')}, BUILDER_QUEUE_CURSOR_WRAP=1, or npm run lifeos:builder:queue -- --reset-cursor`,
    });
    console.log('\n📭 Autonomous queue: slice empty (no /build spend this invocation). Exit 0.');
    return;
  }

  const implicitBranchTasks = selected.filter((t) => !resolveQueueTaskCommitBranch(t));
  const strictBranch = requireExplicitCommitBranch();
  if (strictBranch && implicitBranchTasks.length > 0) {
    const ids = implicitBranchTasks.map((t) => t.id).join(', ');
    await logLine({
      event: 'commit_branch_policy_block',
      lane,
      reason: 'BUILDER_QUEUE_REQUIRE_COMMIT_BRANCH',
      task_ids: implicitBranchTasks.map((t) => t.id),
      hint: 'Set BUILDER_QUEUE_COMMIT_BRANCH (or BUILDER_COMMIT_BRANCH) or add per-task "branch" for each row.',
    });
    console.error(
      `\nHALT: BUILDER_QUEUE_REQUIRE_COMMIT_BRANCH — ${implicitBranchTasks.length} task(s) have no resolved branch: ${ids}\nSet BUILDER_QUEUE_COMMIT_BRANCH=e.g.lifeos/autonomy-review or per-task "branch", then re-run.\n`,
    );
    process.exit(1);
  }

  if (implicitBranchTasks.length > 0 && warnImplicitDefaultBranchEnabled()) {
    console.warn(
      `\n⚠️  COMMIT BRANCH — ${implicitBranchTasks.length}/${selected.length} task(s) use the repo default branch (often main). Review-first: export BUILDER_QUEUE_COMMIT_BRANCH=lifeos/autonomy-review. Refine constraints (don’t discard ambition): docs/BUILDER_IDEA_FILTERS_REFINEMENT.md\n`,
    );
  }

  const contractCheck = validateQueueContract({ hasQueuedWork: selected.length > 0, hasKey: Boolean(key) });
  await logLine({ event: 'contract_check', lane, ...contractCheck });
  if (!contractCheck.ok && contractCheck.halt) {
    process.exit(1);
  }

  await assertReady();

  // C21 AUTONOMY_WRITE_LOCK — when locked, route all commits to staging branch.
  const lockActive = await isLocked();
  let lockStagingBranch = null;
  if (lockActive) {
    const lockData = await getLock();
    lockStagingBranch = lockData?.staging_branch || 'autonomy/staging';
    await logLine({
      event: 'autonomy_write_lock_active',
      lane,
      locked_by: lockData?.locked_by,
      locked_at: lockData?.locked_at,
      reason: lockData?.reason,
      confirmation_event_needed: lockData?.confirmation_event_needed,
      staging_branch: lockStagingBranch,
      KNOW: 'all_commits_routed_to_staging_branch_not_main',
    });
    console.warn(`\n🔒 AUTONOMY_WRITE_LOCK active — commits routing to ${lockStagingBranch} (reason: ${lockData?.reason})\n`);
  }

  await logLine({
    event: 'queue_batch_start',
    legacy_event_aliases: ['overnight_start'],
    lane,
    tasks_path: tasksPath,
    base,
    count: selected.length,
    startIdx,
    commit_branch_policy: {
      global_env_set: Boolean(
        String(process.env.BUILDER_QUEUE_COMMIT_BRANCH || process.env.BUILDER_COMMIT_BRANCH || '').trim(),
      ),
      tasks_implicit_default_branch: implicitBranchTasks.length,
      warn_implicit_default: warnImplicitDefaultBranchEnabled(),
      strict_require_explicit: strictBranch,
      refine_doc: 'docs/BUILDER_IDEA_FILTERS_REFINEMENT.md',
    },
    skipped_count: skipped.length,
    skipped_task_ids: skipped.map((s) => s.id),
  });

  let failed = false;
  let buildAttempts = 0;
  let buildCommits = 0;
  let buildWallMsSum = 0;
  let commitsOnImplicitDefault = 0;
  let commitsOnExplicitBranch = 0;
  /** Per-task wall time for **`POST /build`** (inclusive retries inside `runBuild`) — throughput meter input. */
  const perTaskSlice = [];
  for (let i = 0; i < selected.length; i++) {
    const task = selected[i];
    const id = task.id;
    console.log(`\n▶ Running ${id} → ${task.target_file}`);
    const requestedModel = typeof task.model === 'string' ? task.model.trim() : '';
    const effectiveModel =
      requestedModel && task.force_model === true
        ? requestedModel
        : requestedModel && LEGACY_TASK_MODELS.has(requestedModel) && process.env.BUILDER_ALLOW_LEGACY_TASK_MODEL !== '1'
          ? DEFAULT_MODEL
          : requestedModel || DEFAULT_MODEL;
    // C21: if lock active, staging branch overrides per-task branch (lock wins).
    const branchResolved = lockStagingBranch || resolveQueueTaskCommitBranch(task);
    await logLine({
      event: 'task_start',
      lane,
      id,
      target_file: task.target_file,
      slice_profile: sliceProfileFromTargetFile(task.target_file),
      commit_branch: branchResolved,
      implicit_default_branch: !branchResolved,
      autonomy_lock_active: lockActive || false,
      requested_model: requestedModel || null,
      effective_model: effectiveModel,
      task_force_model: task.force_model === true,
    });
    const sliceT0 = Date.now();

    // ── Skip-if-shipped ───────────────────────────────────────────────────────
    // If the .js target already exists on disk with adequate line count and clean
    // syntax, skip the builder call entirely. No tokens spent. Cursor still advances.
    // Covers GAP-FILL files and any task the builder already completed in a prior run.
    const shipped = await checkIfAlreadyShipped(task);

    // S5: prediction — made after SIS1 check so sis1WillSkip is known at prediction time
    const prediction = makePrediction({ taskId: id, lane, sis1WillSkip: shipped.skip });
    await logPrediction(prediction);

    if (shipped.skip) {
      await logLine({
        event: 'task_skip_already_shipped',
        auto_skip: 'target_file_already_valid',
        lane,
        id,
        target_file: task.target_file,
        line_count: shipped.lineCount,
        KNOW: 'file_exists_passes_node_check_no_builder_call_no_tokens_spent',
      });
      // C09: closure contract — SIS1 path
      await logLine(buildClosureRecord({
        closureType: 'skipped_already_valid',
        taskId: id,
        lane,
        proof: { target_file: task.target_file, line_count: shipped.lineCount, validator: 'node_check' },
        okToAdvance: true,
      }));
      // S5: evaluate prediction — SIS1 outcome
      await logPrediction(evaluatePrediction(prediction, {
        actual_ok: true,
        actual_duration_ms: Date.now() - sliceT0,
        actual_closure_type: 'skipped_already_valid',
      }));
      console.log(`⏭  ${id} — skip-if-shipped: ${task.target_file} (${shipped.lineCount} lines, syntax OK)`);
      perTaskSlice.push({ id, build_wall_ms: 0, ok: true, auto_skip: 'target_file_already_valid' });
      if (sleepMs > 0 && i < selected.length - 1) await sleep(sleepMs);
      continue;
    }
    // ─────────────────────────────────────────────────────────────────────────

    try {
      buildAttempts += 1;
      // Check failure-pattern memory: inject escalation hint into spec if this task
      // has failed multiple times across prior circuit-breaker cycles.
      const escalation = await getEscalationHint(id);
      const taskToRun = escalation
        ? { ...task, spec: (task.spec ? task.spec + '\n\n' : '') + escalation.hint }
        : task;
      if (escalation) {
        await logLine({
          event: 'task_escalation_hint_injected',
          lane,
          id,
          escalation_level: escalation.level,
          prior_failure_count: escalation.count,
          KNOW: 'spec_appended_with_escalation_hint_from_failure_memory',
        });
      }
      const { res, json, ok, modelResolution } = await runBuild(taskToRun);
      const buildWallMs = Date.now() - sliceT0;
      buildWallMsSum += buildWallMs;
      if (!ok) {
        const isSyntaxFail = Boolean(
          json?.syntax_error ||
          String(json?.error || '').toLowerCase().includes('syntax') ||
          String(json?.detail || '').toLowerCase().includes('syntax'),
        );
        // HTTP 413 (payload too large) wrapped inside a 500 means the task spec or file
        // injection is permanently too large for this council endpoint. Treat like syntax
        // fail: quarantine + skip so the queue advances past it rather than looping forever.
        const is413Payload = Boolean(
          String(json?.detail || '').includes('413') ||
          (res.status === 413),
        );
        const isSkippableFail = isSyntaxFail || is413Payload;
        perTaskSlice.push({ id, build_wall_ms: buildWallMs, ok: false });
        // Record failure in persistent memory before deciding what to do with it.
        const failureRecord = await recordBuilderFailure(
          id,
          lane,
          String(json?.error || json?.detail || '').slice(0, 200),
          task.target_file,
        );
        await logLine({
          event: 'task_fail',
          lane,
          id,
          slice_profile: sliceProfileFromTargetFile(task.target_file),
          http: res.status,
          model_resolution: modelResolution,
          build_wall_ms: buildWallMs,
          is_syntax_fail: isSyntaxFail,
          is_413_payload: is413Payload,
          failure_memory_count: failureRecord.count,
          failure_memory_level: failureRecord.escalationLevel,
          json,
        });
        // Level 3 (10+ cumulative failures): auto-quarantine regardless of failure type.
        if (failureRecord.escalationLevel >= 3 && !isSkippableFail) {
          const reason = `failure_pattern_level3_count_${failureRecord.count}_auto_quarantine`;
          await selfQuarantineTask(task, lane, reason);
          await logLine({
            event: 'task_skip_failure_pattern_quarantine',
            lane,
            id,
            target_file: task.target_file,
            failure_count: failureRecord.count,
            KNOW: 'level3_escalation_auto_quarantined_operator_review_needed',
          });
          // C09: closure contract — FPM1 level-3 auto-quarantine
          await logLine(buildClosureRecord({
            closureType: 'explicit_noncommit_reason',
            taskId: id,
            lane,
            proof: {
              committed: false,
              reason: 'fpm1_level3_auto_quarantine',
              failure_count: failureRecord.count,
              advance_justified: true,
            },
            okToAdvance: true,
          }));
          // S5: evaluate prediction — FPM1 quarantine (advance_justified=true → ok_to_advance)
          await logPrediction(evaluatePrediction(prediction, {
            actual_ok: false,
            actual_duration_ms: buildWallMs,
            actual_closure_type: 'explicit_noncommit_reason',
          }));
          console.warn(`⚠ Level-3 escalation on ${id} (${failureRecord.count} cumulative failures) — auto-quarantined.`);
          continue;
        }
        if (isSkippableFail && skipOnSyntaxFail()) {
          const skipReason = isSyntaxFail
            ? (json?.syntax_error || json?.error || 'syntax_fail')
            : `payload_too_large_413 detail=${json?.detail || '413'}`;
          await selfQuarantineTask(task, lane, skipReason);
          await logLine({
            event: 'task_skip_syntax_quarantine',
            lane,
            id,
            target_file: task.target_file,
            skip_reason: isSyntaxFail ? 'syntax_fail' : 'payload_413',
            KNOW: 'skippable_fail_quarantined_continuing_queue',
          });
          // C09: closure contract — syntax/413 quarantine
          await logLine(buildClosureRecord({
            closureType: 'explicit_noncommit_reason',
            taskId: id,
            lane,
            proof: {
              committed: false,
              reason: isSyntaxFail ? 'syntax_fail_quarantined' : 'payload_413_quarantined',
              advance_justified: true,
            },
            okToAdvance: true,
          }));
          // S5: evaluate prediction — syntax/413 quarantine
          await logPrediction(evaluatePrediction(prediction, {
            actual_ok: false,
            actual_duration_ms: buildWallMs,
            actual_closure_type: 'explicit_noncommit_reason',
          }));
          console.warn(`⚠ ${isSyntaxFail ? 'Syntax' : '413-payload'} fail on ${id} — quarantined, continuing queue.`);
          // do NOT set failed=true; do NOT exit — advance to next task
          continue;
        }
        failed = true;
        // C09: closure contract — hard fail, queue stops
        await logLine(buildClosureRecord({
          closureType: 'explicit_noncommit_reason',
          taskId: id,
          lane,
          proof: { committed: false, reason: 'hard_fail_queue_stop', http: res.status },
          okToAdvance: false,
        }));
        // S5: evaluate prediction — hard fail
        await logPrediction(evaluatePrediction(prediction, {
          actual_ok: false,
          actual_duration_ms: buildWallMs,
          actual_closure_type: 'explicit_noncommit_reason',
        }));
        console.error(JSON.stringify(json, null, 2));
        console.error(`\nStopped after failure: ${id}. Fix gaps, redeploy if needed, then resume with --start <index>.`);
        await persistLastRun({
          ...skeleton(),
          ok: false,
          runner_exit_code: 1,
          idle_slice: false,
          failed_task_id: id,
          build_attempts: buildAttempts,
          build_commits: buildCommits,
          build_wall_ms_sum: buildWallMsSum,
          runner_wall_ms: Date.now() - runnerT0,
          per_task_slice: perTaskSlice,
        });
        process.exit(1);
      }
      buildCommits += 1;
      if (branchResolved) commitsOnExplicitBranch += 1;
      else commitsOnImplicitDefault += 1;
      perTaskSlice.push({ id, build_wall_ms: buildWallMs, ok: true });
      // Successful build: clear failure-pattern history so future runs start fresh.
      await resolveBuilderTask(id);
      await logLine({
        event: 'task_ok',
        lane,
        id,
        slice_profile: sliceProfileFromTargetFile(task.target_file),
        model_resolution: modelResolution,
        model_used: json?.model_used,
        committed: json?.committed,
        build_wall_ms: buildWallMs,
        ...summarizeBuildResponse(json),
      });
      // C09: closure contract — committed success
      await logLine(buildClosureRecord({
        closureType: 'committed_success',
        taskId: id,
        lane,
        proof: {
          ok: true,
          committed: true,
          commit_sha: json?.commit_sha || null,
          model_used: json?.model_used || null,
        },
        okToAdvance: true,
      }));
      // S5: evaluate prediction — committed success
      await logPrediction(evaluatePrediction(prediction, {
        actual_ok: true,
        actual_duration_ms: buildWallMs,
        actual_closure_type: 'committed_success',
      }));
      console.log(`✅ ${id} committed model=${json?.model_used || '?'}`);
      if (sleepMs > 0 && i < selected.length - 1) {
        await sleep(sleepMs);
      }
    } catch (err) {
      failed = true;
      const errWallMs = Date.now() - sliceT0;
      buildWallMsSum += errWallMs;
      perTaskSlice.push({ id, build_wall_ms: errWallMs, ok: false });
      await logLine({
        event: 'task_error',
        lane,
        id,
        slice_profile: sliceProfileFromTargetFile(task.target_file),
        error: err.message,
        build_wall_ms: errWallMs,
      });
      // C09: closure contract — unhandled exception, queue stops
      await logLine(buildClosureRecord({
        closureType: 'explicit_noncommit_reason',
        taskId: id,
        lane,
        proof: { committed: false, reason: 'exception_queue_stop', error: String(err.message || err).slice(0, 200) },
        okToAdvance: false,
      }));
      // S5: evaluate prediction — unhandled exception
      await logPrediction(evaluatePrediction(prediction, {
        actual_ok: false,
        actual_duration_ms: errWallMs,
        actual_closure_type: 'explicit_noncommit_reason',
      }));
      console.error(err);
      await persistLastRun({
        ...skeleton(),
        ok: false,
        runner_exit_code: 1,
        idle_slice: false,
        failed_task_id: id,
        build_attempts: buildAttempts,
        build_commits: buildCommits,
        build_wall_ms_sum: buildWallMsSum,
        runner_wall_ms: Date.now() - runnerT0,
        error: err.message,
        per_task_slice: perTaskSlice,
      });
      process.exit(1);
    }
  }

  if (!failed) {
    if (useCursor && !singleId && selected.length > 0) {
      await persistCursor(cursorPath, nextCursor);
      await logLine({
        event: 'cursor_advanced',
        lane,
        nextStartIndex: nextCursor,
        sliceStart: startIdx,
        ran: selected.length,
        skipped_count: skipped.length,
      });
    }
    await persistLastRun({
      ...skeleton(),
      ok: true,
      runner_exit_code: 0,
      idle_slice: false,
      build_attempts: buildAttempts,
      build_commits: buildCommits,
      build_wall_ms_sum: buildWallMsSum,
      runner_wall_ms: Date.now() - runnerT0,
      build_ms_per_commit_avg:
        buildCommits > 0 ? Math.round(buildWallMsSum / buildCommits) : null,
      per_task_slice: perTaskSlice,
      queue_skipped_count: skipped.length,
      queue_skipped: skipped,
      commit_branch_receipt: {
        commits_on_implicit_default_branch: commitsOnImplicitDefault,
        commits_on_explicit_branch: commitsOnExplicitBranch,
        strict_require_was: strictBranch,
        implicit_warn_enabled: warnImplicitDefaultBranchEnabled(),
      },
    });
    const totalWall = Date.now() - runnerT0;
    await logLine({
      event: 'queue_batch_complete',
      legacy_event_aliases: ['overnight_complete'],
      lane,
      ok: true,
      build_commits: buildCommits,
      runner_wall_ms: totalWall,
    });
    console.log(
      '\n✅ Autonomous queue batch finished OK (`git pull` + review commits + compound-improve notes). Continuous daemon will pick up next cycle.',
    );
    if (redeployAfter && process.env.SKIP_AFTER_BUILD_REDEPLOY !== '1') {
      console.log('\n📤 Running npm run system:railway:redeploy …');
      try {
        await execFileAsync('npm', ['run', 'system:railway:redeploy'], {
          cwd: process.cwd(),
          env: process.env,
          shell: true,
          stdio: 'inherit',
        });
      } catch (e) {
        console.warn('⚠️ Redeploy script failed:', e.message);
      }
    }
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(err.exitCode || 1);
});
