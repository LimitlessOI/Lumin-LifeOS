#!/usr/bin/env node
/**
 * Overnight builder queue — runs structured tasks from SSOT JSON against Railway.
 *
 * Precondition: run `npm run lifeos:builder:supervise` successfully on the same
 * base URL so smoke objectives have proven the builder follows the dashboard brief.
 *
 * Usage:
 *   npm run lifeos:builder:overnight -- --dry-run
 *   npm run lifeos:builder:overnight -- --max 2
 *   OVERNIGHT_MAX=3 npm run lifeos:builder:overnight
 *   npm run lifeos:builder:overnight -- --sleep-ms 3000
 *   npm run lifeos:builder:overnight -- --redeploy-after-success
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
  const model = task.model || DEFAULT_MODEL;
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
    if (ok) return { res, json, ok: true };
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
    return { res, json, ok: false };
  }
  return { ...last, ok: false };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function logLine(obj) {
  const line = `${JSON.stringify({ ts: new Date().toISOString(), ...obj })}\n`;
  await appendFile(LOG_PATH, line, 'utf8').catch(() => {});
  console.log(line.trimEnd());
}

async function main() {
  const dry = hasFlag('--dry-run');
  const max = parseInt(argValue('--max', process.env.OVERNIGHT_MAX || ''), 10) || 999;
  const singleId = argValue('--task', null);
  const useCursor = process.env.OVERNIGHT_USE_CURSOR === '1' && !hasFlag('--no-cursor');
  const hasExplicitStart = process.argv.includes('--start');
  const tasksPath = resolveTasksPath(argValue('--tasks-file', process.env.BUILDER_TASKS_PATH || DEFAULT_TASKS_PATH));
  const lane = inferLaneName(tasksPath, argValue('--lane', process.env.BUILDER_TASK_LANE || ''));
  const cursorPath = cursorPathForLane(lane);

  if (hasFlag('--reset-cursor')) {
    await persistCursor(cursorPath, 0);
    console.log(`builder-overnight cursor reset to nextStartIndex=0 (${cursorPath.replace(`${ROOT}/`, '')})`);
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

  const wrap = process.env.OVERNIGHT_CURSOR_WRAP === '1';
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

  console.log(`Overnight runner base: ${base}`);
  console.log(
    `Lane=${lane} tasks=${tasksPath.replace(`${ROOT}/`, '')} selected=${selected.length} (dry-run=${dry}) startIdx=${startIdx} cursor=${useCursor} cursor-path=${cursorPath.replace(`${ROOT}/`, '')} sleep-ms=${sleepMs} redeploy-after=${redeployAfter}`,
  );

  if (dry) {
    for (const t of selected) {
      console.log(`- ${t.id} → ${t.target_file}`);
    }
    return;
  }

  if (!key) throw new Error('COMMAND_CENTER_KEY (or alias) required for overnight builds');

  if (selected.length === 0) {
    await logLine({
      event: 'overnight_idle',
      lane,
      tasks_path: tasksPath,
      reason: 'queue_slice_empty',
      startIdx,
      taskCount: tasks.length,
      hint: `All tasks in JSON done for this cursor — add tasks or delete ${cursorPath.replace(`${ROOT}/`, '')} or set OVERNIGHT_CURSOR_WRAP=1`,
    });
    console.log('\n📭 Overnight: slice empty (no /build spend). Exit 0.');
    return;
  }

  await assertReady();

  await logLine({ event: 'overnight_start', lane, tasks_path: tasksPath, base, count: selected.length, startIdx });

  let failed = false;
  for (let i = 0; i < selected.length; i++) {
    const task = selected[i];
    const id = task.id;
    console.log(`\n▶ Running ${id} → ${task.target_file}`);
    await logLine({ event: 'task_start', lane, id, target_file: task.target_file });
    try {
      const { res, json, ok } = await runBuild(task);
      if (!ok) {
        failed = true;
        await logLine({ event: 'task_fail', lane, id, http: res.status, json });
        console.error(JSON.stringify(json, null, 2));
        console.error(`\nStopped after failure: ${id}. Fix gaps, redeploy if needed, then resume with --start <index>.`);
        process.exit(1);
      }
      await logLine({
        event: 'task_ok',
        lane,
        id,
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
      process.exit(1);
    }
  }

  if (!failed) {
    if (useCursor && !singleId && selected.length > 0) {
      const next = startIdx + selected.length;
      await persistCursor(cursorPath, next);
      await logLine({ event: 'cursor_advanced', lane, nextStartIndex: next, sliceStart: startIdx, ran: selected.length });
    }
    await logLine({ event: 'overnight_complete', lane, ok: true });
    console.log('\n✅ Overnight queue batch finished OK. Pull origin/main and review commits + grade in the morning.');
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
