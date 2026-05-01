#!/usr/bin/env node
/**
 * Triggers Railway redeploy via the RUNNING app.
 * Tries multiple paths in order:
 *   1. POST /api/v1/railway/deploy          — standard command-key auth
 *   2. POST /api/v1/railway/managed-env/self-redeploy — railway-token auth
 *      (works when COMMAND_CENTER_KEY is out of sync but RAILWAY_TOKEN is known)
 *   3. POST /api/v1/railway/managed-env/build-from-latest — force a fresh build from latest GitHub source
 *      (useful when runtime is serving a stale image even after restart-style redeploys)
 *   4. `railway redeploy`                   — local Railway CLI fallback when repo is linked
 *
 * Env:
 *   PUBLIC_BASE_URL | BUILDER_BASE_URL | LUMIN_SMOKE_BASE_URL
 *   COMMAND_CENTER_KEY | COMMAND_KEY | LIFEOS_KEY | API_KEY
 *   RAILWAY_TOKEN  (optional — enables self-redeploy fallback)
 *
 * Usage:
 *   npm run system:railway:redeploy
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import 'dotenv/config';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const base = (
  process.env.BUILDER_BASE_URL ||
  process.env.PUBLIC_BASE_URL ||
  process.env.LUMIN_SMOKE_BASE_URL ||
  ''
).replace(/\/$/, '');

const key =
  process.env.COMMAND_CENTER_KEY ||
  process.env.COMMAND_KEY ||
  process.env.LIFEOS_KEY ||
  process.env.API_KEY ||
  '';

const railwayToken = process.env.RAILWAY_TOKEN || '';
const waitMs = Number(process.env.REDEPLOY_WAIT_MS || '180000');
const pollMs = Number(process.env.REDEPLOY_POLL_MS || '5000');

async function tryDeploy(url, headers) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: '{}',
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { ok: false, error: text.slice(0, 200) }; }
  return { status: r.status, ok: r.ok, json };
}

async function tryBuildFromLatest(headers) {
  const r = await fetch(`${base}/api/v1/railway/managed-env/build-from-latest`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: '{}',
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { ok: false, error: text.slice(0, 200) }; }
  return { status: r.status, ok: r.ok, json };
}

async function getStatus(path) {
  try {
    const r = await fetch(`${base}${path}`, {
      headers: key ? { 'x-command-key': key } : {},
    });
    return { status: r.status, ok: r.ok };
  } catch (err) {
    return { status: 0, ok: false, error: err?.cause?.code || err?.code || err?.message };
  }
}

async function commandMaybe(command, args = []) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      timeout: 120000,
      maxBuffer: 1024 * 1024,
    });
    return {
      ok: true,
      stdout: String(stdout || '').trim(),
      stderr: String(stderr || '').trim(),
    };
  } catch (error) {
    return {
      ok: false,
      code: error?.code ?? null,
      stdout: String(error?.stdout || '').trim(),
      stderr: String(error?.stderr || error?.message || '').trim(),
    };
  }
}

async function tryRailwayCliRedeploy() {
  const version = await commandMaybe('railway', ['--version']);
  if (!version.ok) {
    console.warn('Railway CLI fallback unavailable: `railway` is not installed.');
    return false;
  }

  const status = await commandMaybe('railway', ['status']);
  if (!status.ok) {
    console.warn('Railway CLI fallback unavailable: repo is not linked (`railway status` failed).');
    const detail = [status.stdout, status.stderr].filter(Boolean).join('\n').slice(0, 500);
    if (detail) console.warn(detail);
    return false;
  }

  console.log('Trying Railway CLI fallback: railway redeploy …');
  const redeploy = await commandMaybe('railway', ['redeploy']);
  const output = [redeploy.stdout, redeploy.stderr].filter(Boolean).join('\n');
  if (output) console.log(output.slice(0, 2000));
  if (!redeploy.ok) {
    console.error('Railway CLI redeploy failed.');
    return false;
  }
  return true;
}

async function waitForLiveDeploy() {
  const deadline = Date.now() + waitMs;
  console.log(`\nWaiting up to ${Math.round(waitMs / 1000)}s for live deploy verification…`);
  while (Date.now() < deadline) {
    const health = await getStatus('/healthz');
    const domains = await getStatus('/api/v1/lifeos/builder/domains');
    const routeExists = domains.ok || domains.status === 401 || domains.status === 403;
    console.log(`  /healthz=${health.status || health.error} /builder/domains=${domains.status || domains.error}`);

    if (health.status === 200 && routeExists) {
      console.log('\n✅ Live deploy verified: health is green and builder route exists.\n');
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  console.error('\n⚠️ Redeploy was triggered, but live verification did not become green before timeout.');
  console.error('Run: npm run tsos:doctor\n');
  return false;
}

async function liveReadyShape() {
  try {
    const r = await fetch(`${base}/api/v1/lifeos/builder/ready`, {
      headers: key ? { 'x-command-key': key } : {},
    });
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return {
      status: r.status,
      hasBuilderReady: Boolean(json?.ok),
      hasCodegen: Boolean(json?.codegen),
      policyRevision: json?.codegen?.policy_revision || null,
      deployCommitSha: json?.codegen?.deploy_commit_sha || null,
    };
  } catch (err) {
    return {
      status: 0,
      hasBuilderReady: false,
      hasCodegen: false,
      error: err?.cause?.code || err?.code || err?.message,
    };
  }
}

async function main() {
  if (!base) {
    console.error('❌ Set PUBLIC_BASE_URL (or BUILDER_BASE_URL) to the deploy origin.');
    process.exit(2);
  }

  // ── Path 1: standard command-key deploy ────────────────────────────────────
  if (key) {
    console.log(`Trying POST /api/v1/railway/deploy with command key…`);
    const { status, ok, json } = await tryDeploy(
      `${base}/api/v1/railway/deploy`,
      { 'x-command-key': key },
    );
    if (ok && json.ok) {
      console.log(JSON.stringify(json, null, 2));
      console.log('\n✅ Redeploy triggered via command-key path.\n');
      process.exit((await waitForLiveDeploy()) ? 0 : 1);
    }
    if (status !== 401 && status !== 403) {
      // Non-auth failure — surface it
      console.error(`HTTP ${status}:`, JSON.stringify(json));
      process.exit(1);
    }
    console.warn(`⚠️  Command-key auth failed (${status}) — trying railway-token fallback…`);
  } else {
    console.warn('No command key in env — skipping command-key path.');
  }

  // ── Path 2: railway-token self-redeploy (no command key needed) ─────────────
  if (railwayToken) {
    console.log(`Trying POST /api/v1/railway/managed-env/self-redeploy with RAILWAY_TOKEN…`);
    const { status, ok, json } = await tryDeploy(
      `${base}/api/v1/railway/managed-env/self-redeploy`,
      { 'x-railway-token': railwayToken },
    );
    if (ok && json.ok) {
      console.log(JSON.stringify(json, null, 2));
      console.log('\n✅ Redeploy triggered via RAILWAY_TOKEN self-redeploy path.\n');
      process.exit((await waitForLiveDeploy()) ? 0 : 1);
    }
    console.error(`HTTP ${status}:`, JSON.stringify(json));
    process.exit(1);
  }

  // ── Path 3: force fresh build from latest source when command key works ─────
  if (key) {
    const readyBefore = await liveReadyShape();
    console.log('Live builder-ready shape before build-from-latest:', JSON.stringify(readyBefore));
    console.log(`Trying POST /api/v1/railway/managed-env/build-from-latest with command key…`);
    const { status, ok, json } = await tryBuildFromLatest({ 'x-command-key': key });
    if (ok && json.ok) {
      console.log(JSON.stringify(json, null, 2));
      console.log('\n✅ Fresh build from latest source triggered.\n');
      process.exit((await waitForLiveDeploy()) ? 0 : 1);
    }
    if (status !== 401 && status !== 403) {
      console.error(`HTTP ${status}:`, JSON.stringify(json));
      process.exit(1);
    }
    console.warn(`⚠️  build-from-latest auth failed (${status}) — trying Railway CLI fallback…`);
  }

  // ── Path 4: local Railway CLI fallback ──────────────────────────────────────
  if (await tryRailwayCliRedeploy()) {
    console.log('\n✅ Redeploy triggered via Railway CLI fallback.\n');
    process.exit((await waitForLiveDeploy()) ? 0 : 1);
  }

  // ── No viable auth ──────────────────────────────────────────────────────────
  console.error(
    '\n❌ No viable auth for redeploy.\n' +
    '   • Set COMMAND_CENTER_KEY matching Railway vault, OR\n' +
    '   • Set RAILWAY_TOKEN (from Railway → Account Settings → Tokens), OR\n' +
    '   • Link the local repo with Railway CLI (`railway link`) so `railway redeploy` can run\n' +
    '   Then re-run: npm run system:railway:redeploy\n',
  );
  process.exit(2);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
