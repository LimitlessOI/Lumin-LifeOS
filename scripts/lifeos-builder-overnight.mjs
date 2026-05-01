#!/usr/bin/env node
/**
 * Autonomous continuous builder queue (24/7) — executes structured **`POST /builder/build`** tasks from SSOT JSON.
 *
 * This is the same runner the supervised daemon invokes every cycle. **Not** tied to night hours; filenames and
 * some env vars retain `OVERNIGHT_*` labels for backward compatibility (`BUILDER_QUEUE_*` preferred where listed).
 *
 * Precondition (first-time lane): **`npm run lifeos:builder:supervise`** on the same **`PUBLIC_BASE_URL`** so smoke
 * objectives prove the dashboard brief ground truth.
 *
 * Usage:
 *   npm run lifeos:builder:queue -- --dry-run   # canonical npm name
 *   npm run lifeos:builder:queue -- --max 2
 *   BUILDER_QUEUE_MAX=3 npm run lifeos:builder:queue
 *   npm run lifeos:builder:overnight …          # legacy alias (same binary)
 *
 * Throughput receipt: **`data/builder-overnight-last-run.json`** (legacy path) —
 * build_commits, build_wall_ms_sum, runner_wall_ms, idle_slice.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import 'dotenv/config';

import { appendFile, readFile, writeFile } from 'fs/promises';
import { basename, isAbsolute, join } from 'path';
import { promisify } from 'util';
import { execFile } from 'child_process';

const execFileAsync = promisify(execFile);

const ROOT = process.cwd();
const DEFAULT_TASKS_PATH = join(ROOT, 'docs/projects/LIFEOS_DASHBOARD_OVERNIGHT_TASKS.json');
const LOG_PATH = join(ROOT, 'data/builder-overnight-log.jsonl');
const LAST_RUN_PATH = join(ROOT, 'data/builder-overnight-last-run.json');
const LEGACY_CURSOR_PATH = join(ROOT, 'data', 'builder-overnight-cursor.json');

function retryableReady(status) {
  return status === 502 || status === 503 || status === 504 || status === 429;
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
  return join(ROOT, 'data', `builder-overnight-cursor.${slugifyLane(laneName)}.json`);
}

async function persistCursor(cursorPath, nextStartIndex) {
  await writeFile(
    cursorPath,
    `${JSON.stringify({ nextStartIndex, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    'utf8',
  ).catch(() => {});
}

async function loadCursor(cursorPath) {
  for (const candidate of [cursorPath, LEGACY_CURSOR_PATH]) {
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

const DEFAULT_MODEL = process.env.BUILDER_OVERNIGHT_MODEL || process.env.BUILDER_SUPERVISE_MODEL || 'gemini_flash';
const LEGACY_TASK_MODELS = new Set([
  'claude_via_openrouter',
]);

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
  const max = Math.max(1, parseInt(process.env.OVERNIGHT_READY_RETRIES || '10', 10) || 10);
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
  const body = {
    domain: task.domain || 'lifeos-platform',
    mode: 'code',
    model,
    autonomy_mode: 'max',
    internet_research: false,
    files: task.files || [],
    task: task.task,
    spec: task.spec,
    target_file: task.target_file,
    commit_message: task.commit_message,
  };
  const supervisorMotRaw = Number(task.max_output_tokens ?? task.maxOutputTokens ?? NaN);
  if (Number.isFinite(supervisorMotRaw) && supervisorMotRaw > 0) {
    body.max_output_tokens = Math.min(128000, Math.floor(supervisorMotRaw));
  }
  const url = `${base}/api/v1/lifeos/builder/build`;
  const jsonBody = JSON.stringify(body);
  const maxAttempts = Math.max(1, parseInt(process.env.OVERNIGHT_BUILD_RETRIES || '4', 10) || 4);
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

/** Machine receipt for daemon / operators — wall clock vs `/build` time (answers “was 7h busy?”). */
async function persistLastRun(payload) {
  const body = {
    schema_version: 'builder_overnight_last_run_v1',
    finished_at: new Date().toISOString(),
    ...payload,
  };
  await writeFile(LAST_RUN_PATH, `${JSON.stringify(body, null, 2)}\n`, 'utf8').catch(() => {});
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

async function main() {
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

  if (hasFlag('--reset-cursor')) {
    await persistCursor(cursorPath, 0);
    console.log(`Autonomous queue lane cursor reset nextStartIndex=0 (${cursorPath.replace(`${ROOT}/`, '')})`);
  }

  const raw = await readFile(tasksPath, 'utf8');
  const parsed = JSON.parse(raw);
  const tasks = parsed.tasks || [];

  let startIdx = 0;
  if (hasExplicitStart) {
    startIdx = Math.max(0, parseInt(argValue('--start', '0'), 10) || 0);
  } else if (useCursor && !singleId) {
    const c = await loadCursor(cursorPath);
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
  if (singleId) {
    selected = tasks.filter((t) => t.id === singleId);
    if (selected.length === 0) throw new Error(`Unknown task id: ${singleId}`);
  } else {
    selected = tasks.slice(startIdx, startIdx + max);
  }

  const redeployAfter = hasFlag('--redeploy-after-success');
  const sleepMs = Math.max(
    0,
    parseInt(argValue('--sleep-ms', process.env.OVERNIGHT_SLEEP_MS || '2500'), 10) || 0,
  );

  console.log(`Continuous autonomous queue — base URL: ${base}`);
  console.log(
    `Lane=${lane} tasks=${tasksPath.replace(`${ROOT}/`, '')} selected=${selected.length} (dry-run=${dry}) startIdx=${startIdx} cursor=${useCursor} cursor-path=${cursorPath.replace(`${ROOT}/`, '')} sleep-ms=${sleepMs} redeploy-after=${redeployAfter}`,
  );

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
      throughput_note:
        'Slice empty — supervised daemon cycles can idle in milliseconds. Add JSON queue tasks, reset lane cursor, or enable BUILDER_QUEUE_CURSOR_WRAP=1 / OVERNIGHT_CURSOR_WRAP=1 so bounded wraps recycle workload.',
    });
    await logLine({
      event: 'overnight_idle',
      lane,
      tasks_path: tasksPath,
      reason: 'queue_slice_empty',
      startIdx,
      taskCount: tasks.length,
      runner_wall_ms: wallMs,
      last_run_path_relative: LAST_RUN_PATH.replace(`${ROOT}/`, ''),
      hint: `All tasks in JSON done for this cursor — add tasks or delete ${cursorPath.replace(`${ROOT}/`, '')} or set OVERNIGHT_CURSOR_WRAP=1`,
    });
    console.log('\n📭 Autonomous queue: slice empty (no /build spend this invocation). Exit 0.');
    return;
  }

  await assertReady();

  await logLine({ event: 'overnight_start', lane, tasks_path: tasksPath, base, count: selected.length, startIdx });

  let failed = false;
  let buildAttempts = 0;
  let buildCommits = 0;
  let buildWallMsSum = 0;
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
    await logLine({
      event: 'task_start',
      lane,
      id,
      target_file: task.target_file,
      requested_model: requestedModel || null,
      effective_model: effectiveModel,
      task_force_model: task.force_model === true,
    });
    try {
      buildAttempts += 1;
      const bw0 = Date.now();
      const { res, json, ok, modelResolution } = await runBuild(task);
      buildWallMsSum += Date.now() - bw0;
      if (!ok) {
        failed = true;
        await logLine({ event: 'task_fail', lane, id, http: res.status, model_resolution: modelResolution, json });
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
        });
        process.exit(1);
      }
      buildCommits += 1;
      await logLine({
        event: 'task_ok',
        lane,
        id,
        model_resolution: modelResolution,
        model_used: json?.model_used,
        committed: json?.committed,
      });
      console.log(`✅ ${id} committed model=${json?.model_used || '?'}`);
      if (sleepMs > 0 && i < selected.length - 1) {
        await sleep(sleepMs);
      }
    } catch (err) {
      failed = true;
      await logLine({ event: 'task_error', lane, id, error: err.message });
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
      });
      process.exit(1);
    }
  }

  if (!failed) {
    if (useCursor && !singleId && selected.length > 0) {
      const next = startIdx + selected.length;
      await persistCursor(cursorPath, next);
      await logLine({ event: 'cursor_advanced', lane, nextStartIndex: next, sliceStart: startIdx, ran: selected.length });
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
    });
    const totalWall = Date.now() - runnerT0;
    await logLine({
      event: 'overnight_complete',
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
