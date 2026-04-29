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
 *   npm run lifeos:builder:overnight -- --task dashboard-shell-audit
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import 'dotenv/config';

import { appendFile, readFile } from 'fs/promises';
import { join } from 'path';

const ROOT = process.cwd();
const TASKS_PATH = join(ROOT, 'docs/projects/LIFEOS_DASHBOARD_OVERNIGHT_TASKS.json');
const LOG_PATH = join(ROOT, 'data/builder-overnight-log.jsonl');

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

const DEFAULT_MODEL = 'claude_via_openrouter';

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
  const { res, json } = await fetchJson(`${base}/api/v1/lifeos/builder/ready`, { headers });
  if (!res.ok) {
    throw new Error(`Builder /ready failed HTTP ${res.status}: ${JSON.stringify(json)}`);
  }
  const { res: dRes, json: dJson } = await fetchJson(`${base}/api/v1/lifeos/builder/domains`, { headers });
  if (!dRes.ok) {
    throw new Error(`Builder /domains failed HTTP ${dRes.status}: ${JSON.stringify(dJson)}`);
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
  const { res, json } = await fetchJson(`${base}/api/v1/lifeos/builder/build`, {
    method: 'POST',
    headers: requiredHeaders(),
    body: JSON.stringify(body),
  });
  return { res, json, ok: res.ok && json?.ok === true && json?.committed === true };
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
  const startIdx = Math.max(0, parseInt(argValue('--start', '0'), 10) || 0);

  const raw = await readFile(TASKS_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  const tasks = parsed.tasks || [];

  let selected = tasks;
  if (singleId) {
    selected = tasks.filter((t) => t.id === singleId);
    if (selected.length === 0) throw new Error(`Unknown task id: ${singleId}`);
  } else {
    selected = tasks.slice(startIdx, startIdx + max);
  }

  console.log(`Overnight runner base: ${base}`);
  console.log(`Tasks to run: ${selected.length} (dry-run=${dry})`);

  if (dry) {
    for (const t of selected) {
      console.log(`- ${t.id} → ${t.target_file}`);
    }
    return;
  }

  if (!key) throw new Error('COMMAND_CENTER_KEY (or alias) required for overnight builds');

  await assertReady();

  await logLine({ event: 'overnight_start', base, count: selected.length });

  let failed = false;
  for (const task of selected) {
    const id = task.id;
    console.log(`\n▶ Running ${id} → ${task.target_file}`);
    await logLine({ event: 'task_start', id, target_file: task.target_file });
    try {
      const { res, json, ok } = await runBuild(task);
      if (!ok) {
        failed = true;
        await logLine({ event: 'task_fail', id, http: res.status, json });
        console.error(JSON.stringify(json, null, 2));
        console.error(`\nStopped after failure: ${id}. Fix gaps, redeploy if needed, then resume with --start <index>.`);
        process.exit(1);
      }
      await logLine({
        event: 'task_ok',
        id,
        model_used: json?.model_used,
        committed: json?.committed,
      });
      console.log(`✅ ${id} committed model=${json?.model_used || '?'}`);
    } catch (err) {
      failed = true;
      await logLine({ event: 'task_error', id, error: err.message });
      console.error(err);
      process.exit(1);
    }
  }

  if (!failed) {
    await logLine({ event: 'overnight_complete', ok: true });
    console.log('\n✅ Overnight queue batch finished OK. Pull origin/main and review commits + grade in the morning.');
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(err.exitCode || 1);
});
