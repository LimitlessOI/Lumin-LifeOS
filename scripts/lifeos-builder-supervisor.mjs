#!/usr/bin/env node
/**
 * Supervised builder runner for LifeOS dashboard work.
 *
 * Purpose:
 * - prove the Railway builder path is healthy
 * - force explicit model selection
 * - ground tasks in the dashboard build brief + mockup references
 * - run deterministic smoke objectives before chaining the continuous autonomous **`/build`** queue
 *
 * Usage:
 *   npm run lifeos:builder:supervise
 *   npm run lifeos:builder:supervise -- --model gemini_flash
 *   npm run lifeos:builder:supervise -- --skip-doc
 *   npm run lifeos:builder:supervise -- --probe-only --consequence-lens   # optional premortem Qs (no API spend)
 *   BUILDER_SUPERVISOR_GAPS_LIMIT=100 BUILDER_SUPERVISOR_GAPS_DOMAIN=lifeos-platform npm run lifeos:builder:supervise -- --probe-only
 *   # (--gaps-limit / --gaps-domain override env for GET /builder/gaps pattern summary)
 *   npm run lifeos:builder:supervise -- --queue --queue-max 2   # chain autonomous continuous `/build` queue after smoke (legacy: --overnight / --overnight-max)
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function quickDocReceiptCheck(source) {
  const normalized = String(source || '').toLowerCase();
  const mustContain = ['lifeos_dashboard_builder_brief.md', 'light', 'dark', 'mobile', 'desktop'];
  for (const needle of mustContain) {
    if (!normalized.includes(needle)) throw new Error(`doc receipt check: ${needle}`);
  }
}

/** After POST /build the commit hits GitHub before `origin/main` is readable locally — try verified local file first, then retry git show with backoff. */
async function fetchCommittedFile(repoPath) {
  const absLocal = path.join(process.cwd(), repoPath);
  let lastErr = '';
  const attempts = Number(process.env.SUPERVISOR_FETCH_RETRIES || '16');
  const baseSleep = Number(process.env.SUPERVISOR_FETCH_SLEEP_MS || '700');

  if (repoPath.includes('BUILDER_DASHBOARD_SMOKE_RECEIPT.md')) {
    try {
      const local = await readFile(absLocal, 'utf8');
      quickDocReceiptCheck(local);
      return local;
    } catch {
      /* race: disk not pulled yet → fall through to remote */
    }
  }

  for (let attempt = 0; attempt < attempts; attempt++) {
    await execFileAsync('git', ['fetch', 'origin', 'main'], { cwd: process.cwd() }).catch(() => {});

    try {
      const { stdout } = await execFileAsync(
        'git',
        ['show', `origin/main:${repoPath}`],
        {
          cwd: process.cwd(),
          maxBuffer: 12 * 1024 * 1024,
          shell: false,
        },
      );
      const t = String(stdout || '');
      if (t.trim().length > 15) return t;
      lastErr = 'short_stdout';
    } catch (e) {
      lastErr = e?.message || String(e);
    }

    try {
      const local = await readFile(absLocal, 'utf8');
      if ((local || '').trim().length > 15 && attempt >= 3) {
        if (repoPath.includes('BUILDER_DASHBOARD_SMOKE_RECEIPT.md')) quickDocReceiptCheck(local);
        return local;
      }
    } catch {
      /* no local file yet */
    }

    await sleep(baseSleep + attempt * 550);
  }

  throw new Error(
    `Committed file ${repoPath} not visible via git show origin/main:${repoPath} after ${attempts} attempts (last=${lastErr}). Run git fetch/pull or increase SUPERVISOR_FETCH_RETRIES.`
  );
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

const DEFAULT_MODEL = process.env.BUILDER_SUPERVISE_MODEL || 'gemini_flash';
const BRIEF = 'docs/projects/LIFEOS_DASHBOARD_BUILDER_BRIEF.md';
const QUEUE = 'docs/projects/LIFEOS_DASHBOARD_BUILDER_QUEUE.md';
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

function retryableHttp(status) {
  return status === 502 || status === 503 || status === 504 || status === 429;
}

async function assertReady() {
  const headers = key ? { 'x-command-key': key } : {};
  const max = Math.max(1, parseInt(process.env.SUPERVISOR_READY_RETRIES || '10', 10) || 10);
  let lastErr = '';
  for (let attempt = 0; attempt < max; attempt++) {
    const { res: readyRes, json: readyJson } = await fetchJson(`${base}/api/v1/lifeos/builder/ready`, { headers });
    if (!readyRes.ok && retryableHttp(readyRes.status) && attempt < max - 1) {
      lastErr = `ready ${readyRes.status}`;
      await sleep(1500 + attempt * 1500);
      continue;
    }
    if (!readyRes.ok) {
      throw new Error(`Builder /ready failed HTTP ${readyRes.status}: ${JSON.stringify(readyJson)}`);
    }
    const { res: domainsRes, json: domainsJson } = await fetchJson(`${base}/api/v1/lifeos/builder/domains`, { headers });
    if (!domainsRes.ok && retryableHttp(domainsRes.status) && attempt < max - 1) {
      lastErr = `domains ${domainsRes.status}`;
      await sleep(1500 + attempt * 1500);
      continue;
    }
    if (!domainsRes.ok) {
      throw new Error(`Builder /domains failed HTTP ${domainsRes.status}: ${JSON.stringify(domainsJson)}`);
    }
    return { readyJson, domainsJson };
  }
  throw new Error(`assertReady exhausted retries (${lastErr})`);
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
  const url = `${base}/api/v1/lifeos/builder/build`;
  const jsonBody = JSON.stringify(body);
  const maxAttempts = Math.max(1, parseInt(process.env.SUPERVISOR_BUILD_RETRIES || '5', 10) || 5);
  let last = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { res, json } = await fetchJson(url, {
      method: 'POST',
      headers: requiredHeaders(),
      body: jsonBody,
    });
    last = { res, json };
    const ok = res.ok && json?.ok === true && json?.committed === true;
    if (ok) return json;
    const retryable = retryableHttp(res.status) || (json?.message && String(json.message).includes('failed to respond'));
    if (retryable && attempt < maxAttempts - 1) {
      const wait = 2200 + attempt * 4000;
      console.warn(`[supervisor] /build retry ${attempt + 1}/${maxAttempts} after HTTP ${res.status} (wait ${wait}ms)`);
      await sleep(wait);
      continue;
    }
    throw new Error(`Builder build failed for ${targetFile}: ${JSON.stringify(json)}`);
  }
  throw new Error(`Builder build failed for ${targetFile}: ${JSON.stringify(last?.json)}`);
}

async function verifyJsSmoke(repoPath) {
  const source = await fetchCommittedFile(repoPath);
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
  const source = await fetchCommittedFile(repoPath);
  quickDocReceiptCheck(source);
  return true;
}

// §2.6 truth-level labels used in supervisor output:
//   KNOW   = verified by evidence this session (HTTP 200 confirmed, commit landed, node --check passed)
//   THINK  = inference from evidence (repeated success suggests stability, but not proven under all conditions)
//   GUESS  = low confidence — flag explicitly
//   NOT-PROVEN = claim was not verified this session; do not assume it
//
// Per the Epistemic Bridge (docs/BUILDER_RELIABILITY_EPISTEMIC_BRIDGE.md):
//   - `/ready` HTTP 200 = KNOW (reachability at that moment, scoped to URL+key)
//   - committed:true = KNOW (git commit landed — NOT "output is good")
//   - smoke pass = KNOW (these specific tests pass — NOT "platform is generally healthy")
//   - "builder is healthy" without evidence = forbidden (§2.6 ¶3)
//   - gap DB rows = RECEIPT-tier (facts from prior failures, not live probes)

function printConsequenceLensReminder() {
  console.log('\n--- Optional lens: consequences + future-back + prior art + Adam ---');
  console.log('Docs: docs/SUPERVISOR_CONSEQUENCE_LENS.md (supervisor decides when — not every slice)');
  console.log('A Unintended: who gets hurt at scale? trust/support? → what breaks (deps/quotas/races/rollback)? observability honest? residue risk?');
  console.log('B 2-year-back: wish we did X today? cheap receipt skipped? SSOT/handoff line? run-council?');
  console.log('C Prior art: internal gaps/receipts/code + external published practice (THINK til cited); improve-dont-copy; cite URLs in §2.11b');
  console.log('D Adam-as-lens: must ASK Adam (ambiguous/strategic/value/irreversible)? spare lower-level ONLY under SSOT+verifiers; fair options/tradeoffs; §2.11b receipts');
}

function resolveGapsQueryString() {
  const rawLimit = argValue('--gaps-limit', process.env.BUILDER_SUPERVISOR_GAPS_LIMIT || '50');
  let limit = parseInt(String(rawLimit), 10);
  if (!Number.isFinite(limit)) limit = 50;
  limit = Math.min(100, Math.max(1, limit));
  const domain = String(
    argValue('--gaps-domain', process.env.BUILDER_SUPERVISOR_GAPS_DOMAIN || '') || '',
  ).trim();
  const qs = new URLSearchParams({ limit: String(limit) });
  if (domain) qs.set('domain', domain);
  return { query: qs.toString(), limit, domain: domain || null };
}

async function analyzeBuilderGaps() {
  if (!key) return;
  try {
    const { query, limit, domain } = resolveGapsQueryString();
    const { res, json } = await fetchJson(`${base}/api/v1/lifeos/builder/gaps?${query}`, {
      headers: { 'x-command-key': key },
    });
    if (!res.ok || !Array.isArray(json?.gaps)) return;
    const gaps = json.gaps;
    // KNOW: gap count from DB (this is a RECEIPT — real past failures, not hypothetical)
    if (!gaps.length) {
      console.log('[supervisor] KNOW: 0 builder gaps in DB — no recorded failures to pattern-match.');
      return;
    }

    const patterns = {};
    for (const g of gaps) {
      const reason = String(g.failure_reason || '');
      let bucket;
      if (/\*[A-Za-z_$]/.test(reason)) bucket = 'asterisk-params (*rk/*ccm)';
      else if (/--- REPO FILE/i.test(reason)) bucket = 'repo-file-marker leaked into JS';
      else if (/<!DOCTYPE|SyntaxError.*'<'/.test(reason)) bucket = 'HTML emitted for JS target';
      else if (/generated HTML is missing|truncated before <body/i.test(reason)) bucket = 'HTML truncation';
      else if (/generated HTML is too short/i.test(reason)) bucket = 'HTML too short';
      else if (/empty/i.test(reason)) bucket = 'empty output';
      else if (/syntax/i.test(g.failure_stage)) bucket = 'other syntax error';
      else if (/validation/i.test(g.failure_stage)) bucket = 'other validation failure';
      else bucket = 'other';
      patterns[bucket] = (patterns[bucket] || 0) + 1;
    }
    const sorted = Object.entries(patterns).sort((a, b) => b[1] - a[1]);
    const total = gaps.length;

    // Truth level: RECEIPT — these are DB rows from real past failures, not live probes
    const scope = domain ? `domain=${domain} ` : '';
    console.log(
      `\n[supervisor] RECEIPT: ${total} builder gap records (${scope}limit=${limit} — past failures, not a live probe):`,
    );
    for (const [pat, count] of sorted) {
      const pct = Math.round((count / total) * 100);
      const fixed = /asterisk-params|repo-file-marker|HTML emitted for JS/.test(pat) ? ' [sanitizer fix deployed]' : '';
      console.log(`  ${count}x (${pct}%) ${pat}${fixed}`);
    }
    const topPattern = sorted[0]?.[0];
    const topCount = sorted[0]?.[1] || 0;
    if (topCount >= 3) {
      const isKnownFixed = /asterisk-params|repo-file-marker|HTML emitted for JS/.test(topPattern);
      if (isKnownFixed) {
        console.log(`[supervisor] THINK: "${topPattern}" was the top failure — sanitizer fix committed; watch gaps after next deploy to confirm.`);
      } else {
        console.log(`[supervisor] RECEIPT: Highest-yield unresolved pattern: "${topPattern}" (${topCount} hits). Step 3 lever — docs/BUILDER_COMPOUND_IMPROVEMENT_LOOP.md`);
      }
    }
    console.log();
  } catch {
    // gap analysis is best-effort — never block the supervisor
  }
}

function argvPrefer(firstFlag, secondFlag, envFallback) {
  const i1 = process.argv.indexOf(firstFlag);
  const i2 = process.argv.indexOf(secondFlag);
  if (i1 >= 0) return process.argv[i1 + 1] || envFallback;
  if (i2 >= 0) return process.argv[i2 + 1] || envFallback;
  return envFallback;
}

async function main() {
  const model = argValue('--model', DEFAULT_MODEL);
  const skipDoc = hasFlag('--skip-doc');
  const skipJs = hasFlag('--skip-js');
  const chainQueueRunner =
    hasFlag('--overnight') || hasFlag('--queue') || hasFlag('--continuous-queue');
  const queueMaxCli = argvPrefer(
    '--queue-max',
    '--overnight-max',
    process.env.BUILDER_QUEUE_MAX || process.env.OVERNIGHT_MAX || '2',
  );
  const probeOnly = hasFlag('--probe-only');
  const consequenceLens = hasFlag('--consequence-lens');

  console.log(`Supervisor base: ${base}`);
  console.log(`Supervisor model: ${model}`);

  if (probeOnly) {
    console.log('Probe-only: GET /ready + /domains (no council /build spend)');
    const { readyJson } = await assertReady();
    // KNOW: /ready returned 200 with these fields — scoped to this URL+key+moment
    console.log(`KNOW: /ready HTTP 200 — commitToGitHub=${Boolean(readyJson?.builder?.commitToGitHub)} council=${Boolean(readyJson?.builder?.callCouncilMember)}`);
    console.log('NOT-PROVEN: council output quality, output correctness, or platform stability under load — probe does not test these.');
    await analyzeBuilderGaps();
    if (consequenceLens) printConsequenceLensReminder();
    return;
  }

  console.log('Checking builder readiness...');
  const { readyJson } = await assertReady();
  // KNOW: /ready returned 200 — scoped to this URL+key+moment
  console.log(`KNOW: /ready HTTP 200 — commitToGitHub=${Boolean(readyJson?.builder?.commitToGitHub)} council=${Boolean(readyJson?.builder?.callCouncilMember)}`);

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
    // KNOW: committed:true + content contains required doc markers — scoped to this run
    console.log('KNOW: Doc smoke passed — brief markers confirmed in committed output.');
  }

  if (!skipJs) {
    console.log('Running JS smoke objective...');
    await runBuild({
      model,
      targetFile: 'scripts/builder-smoke/dashboard-layout-utils.mjs',
      files: [BRIEF, QUEUE],
      task:
        'Create a tiny deterministic utility module for the dashboard shell. ' +
        'This is a supervised smoke test for LifeOS autonomous continuous-queue work. ' +
        'The file must be pure ESM, have no external dependencies, and export exactly three named functions.',
      spec:
        [
          'Target file exports:',
          '1. clampMobileWidgetCount(count) => integer clamped to 1..6.',
          '2. resolveThemeMode(value) => "light", "dark", or "system". Unknown input returns "system". Case-insensitive string handling.',
          '3. pickDashboardDensity({ viewportWidth, widgetCount, hasPinnedRail }) => "compact" | "balanced" | "airy".',
          'Output must be plain JavaScript ESM only: no TypeScript, no markdown fences, no trailing metadata, and no unfinished comments.',
          'The committed file will be checked with node --check, so syntax must be valid on first commit.',
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
    // KNOW: these specific deterministic smoke checks passed on committed file contents (this run only)
    console.log('KNOW: JS smoke passed — clampMobileWidgetCount / resolveThemeMode / pickDashboardDensity checks OK.');
  }

  await analyzeBuilderGaps();

  console.log('\n--- §2.11b-style supervisor close (Adam) ---');
  console.log('KNOW (this session): Builder /ready + /domains returned 200; any doc/JS smoke you ran matched committed bytes + node --check.');
  console.log(
    'THINK: Path may still be adequate for constrained supervised dashboard backlog — depends on Railway deploy parity + council output quality.',
  );
  console.log(
    'NOT-PROVEN: End-to-end product quality under all models, unrelated routes, DB edge cases, or load — smoke is a narrow wedge.',
  );
  console.log(
    `Residue risk: Re-run after deploy if /gaps showed old patterns (asterisk-params, markers) — confirm gap counts drop.`,
  );
  console.log(
    `Next: npm run lifeos:builder:supervise -- --model ${model}  |  Chain continuous queue: same + --queue (legacy --overnight)`,
  );
  if (consequenceLens) printConsequenceLensReminder();

  if (chainQueueRunner) {
    console.log(
      `\nChaining autonomous continuous queue runner — JSON backlog capped at ${queueMaxCli} POST /builder/build task(s) this chain …`,
    );
    await execFileAsync(process.execPath, [
      path.join(process.cwd(), 'scripts/lifeos-builder-continuous-queue.mjs'),
      '--max',
      String(queueMaxCli),
    ], { stdio: 'inherit', env: process.env, cwd: process.cwd() });
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(err.exitCode || 1);
});
