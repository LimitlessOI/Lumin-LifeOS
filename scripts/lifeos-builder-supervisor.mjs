#!/usr/bin/env node
/**
 * Supervised builder runner for LifeOS dashboard work.
 *
 * Purpose:
 * - prove the Railway builder path is healthy
 * - force explicit model selection
 * - ground tasks in the dashboard build brief + mockup references
 * - run deterministic smoke objectives before any unattended queue
 *
 * Usage:
 *   npm run lifeos:builder:supervise
 *   npm run lifeos:builder:supervise -- --model claude_via_openrouter
 *   npm run lifeos:builder:supervise -- --skip-doc
 *   npm run lifeos:builder:supervise -- --overnight --overnight-max 2   # after smoke passes, run overnight queue
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import 'dotenv/config';

import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

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
const BRIEF = 'docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md';
const QUEUE = 'docs/projects/LIFEOS_DASHBOARD_OVERNIGHT_QUEUE.md';
const AMENDMENT = 'docs/projects/AMENDMENT_21_LIFEOS_CORE.md';
const CATALOG = 'docs/BRAINSTORM_SESSIONS_IDEAS_CATALOG.md';
const SHELL = 'public/overlay/lifeos-app.html';
const DASHBOARD = 'public/overlay/lifeos-dashboard.html';

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
    json = { raw: text.slice(0, 1000) };
  }
  return { res, json, text };
}

async function assertReady() {
  const headers = key ? { 'x-command-key': key } : {};
  const { res: readyRes, json: readyJson } = await fetchJson(`${base}/api/v1/lifeos/builder/ready`, { headers });
  if (!readyRes.ok) {
    throw new Error(`Builder /ready failed HTTP ${readyRes.status}: ${JSON.stringify(readyJson)}`);
  }
  const { res: domainsRes, json: domainsJson } = await fetchJson(`${base}/api/v1/lifeos/builder/domains`, { headers });
  if (!domainsRes.ok) {
    throw new Error(`Builder /domains failed HTTP ${domainsRes.status}: ${JSON.stringify(domainsJson)}`);
  }
  return { readyJson, domainsJson };
}

async function runBuild({ model, targetFile, files, task, spec, commitMessage }) {
  const body = {
    domain: 'lifeos-platform',
    mode: 'code',
    model,
    autonomy_mode: 'max',
    internet_research: false,
    files,
    task,
    spec,
    target_file: targetFile,
    commit_message: commitMessage,
  };
  const { res, json } = await fetchJson(`${base}/api/v1/lifeos/builder/build`, {
    method: 'POST',
    headers: requiredHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok || !json?.ok || !json?.committed) {
    throw new Error(`Builder build failed for ${targetFile}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function fetchRemoteFile(repoPath) {
  await execFileAsync('git', ['fetch', 'origin', 'main'], { cwd: process.cwd() });
  const { stdout } = await execFileAsync('git', ['show', `origin/main:${repoPath}`], { cwd: process.cwd() });
  return stdout;
}

async function verifyJsSmoke(repoPath) {
  const source = await fetchRemoteFile(repoPath);
  const dir = await mkdtemp(path.join(tmpdir(), 'lifeos-builder-supervisor-'));
  const tempFile = path.join(dir, path.basename(repoPath));
  try {
    await writeFile(tempFile, source, 'utf8');
    await execFileAsync(process.execPath, ['--check', tempFile]);
    const mod = await import(`${pathToFileURL(tempFile).href}?t=${Date.now()}`);
    if (mod.clampMobileWidgetCount(0) !== 1) throw new Error('clampMobileWidgetCount(0) must equal 1');
    if (mod.clampMobileWidgetCount(9) !== 6) throw new Error('clampMobileWidgetCount(9) must equal 6');
    if (mod.resolveThemeMode('LIGHT') !== 'light') throw new Error('resolveThemeMode("LIGHT") must equal "light"');
    if (mod.resolveThemeMode('weird') !== 'system') throw new Error('resolveThemeMode("weird") must equal "system"');
    if (mod.pickDashboardDensity({ viewportWidth: 390, widgetCount: 5, hasPinnedRail: true }) !== 'compact') {
      throw new Error('mobile dense layout expectation failed');
    }
    if (mod.pickDashboardDensity({ viewportWidth: 1440, widgetCount: 3, hasPinnedRail: false }) !== 'airy') {
      throw new Error('desktop airy layout expectation failed');
    }
    return true;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function verifyDocSmoke(repoPath) {
  const source = await fetchRemoteFile(repoPath);
  const mustContain = [
    'LIFEOS_DASHBOARD_BUILDER_BRIEF.md',
    'light',
    'dark',
    'mobile',
    'desktop',
  ];
  for (const needle of mustContain) {
    if (!source.includes(needle)) {
      throw new Error(`Doc smoke receipt missing required token: ${needle}`);
    }
  }
  return true;
}

async function main() {
  const model = argValue('--model', DEFAULT_MODEL);
  const skipDoc = hasFlag('--skip-doc');
  const skipJs = hasFlag('--skip-js');
  const runOvernight = hasFlag('--overnight');
  const overnightMax = argValue('--overnight-max', process.env.OVERNIGHT_MAX || '2');

  console.log(`Supervisor base: ${base}`);
  console.log(`Supervisor model: ${model}`);
  console.log('Checking builder readiness...');
  const { readyJson } = await assertReady();
  console.log(`Ready: commitToGitHub=${Boolean(readyJson?.builder?.commitToGitHub)} council=${Boolean(readyJson?.builder?.callCouncilMember)}`);

  if (!skipDoc) {
    console.log('Running doc smoke objective...');
    await runBuild({
      model,
      targetFile: 'docs/projects/BUILDER_DASHBOARD_SMOKE_RECEIPT.md',
      files: [BRIEF, QUEUE, AMENDMENT, CATALOG],
      task:
        'Create a concise builder smoke receipt that proves you understood the LifeOS dashboard brief. ' +
        'Summarize the required shell direction, state that both light and dark modes are required, and state that mobile and desktop differ intentionally. ' +
        'Do not invent APIs or backend claims.',
      spec:
        'Output markdown only. Reference the exact file name LIFEOS_DASHBOARD_BUILDER_BRIEF.md. ' +
        'Mention desktop sidebar, mobile bottom tabs, swipe-ready category dashboards, and persistent AI rail. ' +
        'End with ---METADATA--- JSON.',
      commitMessage: '[system-build] Builder smoke receipt for LifeOS dashboard supervision',
    });
    await verifyDocSmoke('docs/projects/BUILDER_DASHBOARD_SMOKE_RECEIPT.md');
    console.log('Doc smoke objective passed.');
  }

  if (!skipJs) {
    console.log('Running JS smoke objective...');
    await runBuild({
      model,
      targetFile: 'scripts/builder-smoke/dashboard-layout-utils.mjs',
      files: [BRIEF, QUEUE],
      task:
        'Create a tiny deterministic utility module for the dashboard shell. ' +
        'This is a supervised smoke test for overnight LifeOS dashboard work. ' +
        'The file must be pure ESM, have no external dependencies, and export exactly three named functions.',
      spec:
        [
          'Target file exports:',
          '1. clampMobileWidgetCount(count) => integer clamped to 1..6.',
          '2. resolveThemeMode(value) => "light", "dark", or "system". Unknown input returns "system". Case-insensitive string handling.',
          '3. pickDashboardDensity({ viewportWidth, widgetCount, hasPinnedRail }) => "compact" | "balanced" | "airy".',
          'Rules for pickDashboardDensity:',
          '- return "compact" when viewportWidth < 640 and widgetCount >= 4',
          '- return "compact" when hasPinnedRail is true and widgetCount >= 5',
          '- return "airy" when viewportWidth >= 1280 and widgetCount <= 3 and hasPinnedRail is false',
          '- otherwise return "balanced"',
          'Use straightforward code and small doc comments only where helpful.',
          'End with ---METADATA--- JSON.',
        ].join('\n'),
      commitMessage: '[system-build] Builder JS smoke objective for LifeOS dashboard supervision',
    });
    await verifyJsSmoke('scripts/builder-smoke/dashboard-layout-utils.mjs');
    console.log('JS smoke objective passed.');
  }

  console.log('\nSupervisor result: builder path is healthy enough for constrained overnight dashboard work.');
  console.log('Next command: npm run lifeos:builder:supervise -- --model claude_via_openrouter');

  if (runOvernight) {
    console.log(`\nChaining overnight runner (max ${overnightMax})...`);
    await execFileAsync(process.execPath, [
      path.join(process.cwd(), 'scripts/lifeos-builder-overnight.mjs'),
      '--max',
      String(overnightMax),
    ], { stdio: 'inherit', env: process.env, cwd: process.cwd() });
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(err.exitCode || 1);
});
