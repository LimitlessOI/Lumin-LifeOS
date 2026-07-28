/**
 * SYNOPSIS: Triggers Railway redeploy via the RUNNING app.
 * Triggers Railway redeploy via the RUNNING app.
 * Tries multiple paths in order:
 *   1. POST /api/v1/railway/deploy          — standard command-key auth
 *   2. POST /api/v1/railway/managed-env/self-redeploy — railway-token auth
 *   3. POST /api/v1/railway/managed-env/build-from-latest — fresh build from GitHub HEAD (explicit SHA when known)
 *   4. `railway redeploy`                   — local Railway CLI fallback when repo is linked
 *
 * Success requires deploy_commit_sha on /builder/ready to match origin/main (not just /healthz).
 *
 * Env:
 *   PUBLIC_BASE_URL | BUILDER_BASE_URL | LUMIN_SMOKE_BASE_URL
 *   COMMAND_CENTER_KEY | COMMAND_KEY | LIFEOS_KEY | API_KEY
 *   RAILWAY_TOKEN  (optional — enables self-redeploy fallback)
 *   REDEPLOY_WAIT_MS (default 600000) — max wait for SHA parity
 *   REDEPLOY_POLL_MS (default 10000)
 *
 * Usage:
 *   npm run system:railway:redeploy
 *
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import 'dotenv/config';
import { execFile, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const base = (
  process.env.BUILDER_BASE_URL ||
  process.env.PUBLIC_BASE_URL ||
  process.env.LUMIN_SMOKE_BASE_URL ||
  ''
).trim().replace(/\/$/, '');

const key =
  process.env.COMMAND_CENTER_KEY ||
  process.env.COMMAND_KEY ||
  process.env.LIFEOS_KEY ||
  process.env.API_KEY ||
  '';

const railwayToken = process.env.RAILWAY_TOKEN || '';
const waitMs = Number(process.env.REDEPLOY_WAIT_MS || '600000');
const pollMs = Number(process.env.REDEPLOY_POLL_MS || '10000');

function shaPrefix(a, b) {
  if (!a || !b) return false;
  const x = String(a).trim();
  const y = String(b).trim();
  return x.slice(0, 12) === y.slice(0, 12) || x.startsWith(y) || y.startsWith(x);
}

function originMainSha() {
  spawnSync('git', ['fetch', 'origin', 'main'], { encoding: 'utf8' });
  const r = spawnSync('git', ['rev-parse', 'origin/main'], { encoding: 'utf8' });
  return r.status === 0 ? String(r.stdout || '').trim() : null;
}

async function tryDeploy(url, headers, body = '{}') {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { ok: false, error: text.slice(0, 200) }; }
  return { status: r.status, ok: r.ok, json };
}

async function tryBuildFromLatest(headers, commitSha) {
  const body = commitSha ? JSON.stringify({ commit_sha: commitSha }) : '{}';
  const r = await fetch(`${base}/api/v1/railway/managed-env/build-from-latest`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body,
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { ok: false, error: text.slice(0, 200) }; }
  return { status: r.status, ok: r.ok, json };
}

async function fetchLatestDeployment(headers) {
  const r = await fetch(`${base}/api/v1/railway/managed-env/deployments/latest`, {
    headers: { ...headers },
  });
  const json = await r.json().catch(() => ({}));
  return { status: r.status, ok: r.ok, json };
}

async function fetchDeploymentLogs(headers, deploymentId, limit = 30) {
  const r = await fetch(
    `${base}/api/v1/railway/managed-env/deployments/${deploymentId}/logs?limit=${limit}`,
    { headers: { ...headers } },
  );
  return r.json().catch(() => ({}));
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

async function waitForDeployShaParity(targetSha) {
  const headers = key ? { 'x-command-key': key } : {};
  const deadline = Date.now() + waitMs;
  console.log(`\nWaiting up to ${Math.round(waitMs / 1000)}s for deploy SHA parity with ${targetSha?.slice(0, 12)}…`);

  while (Date.now() < deadline) {
    const ready = await liveReadyShape();
    const liveSha = ready.deployCommitSha;
    const latest = await fetchLatestDeployment(headers);
    const dep = latest.json?.deployment;
    const depStatus = dep?.status || 'unknown';
    const depSha = dep?.meta?.commitHash || null;

    console.log(
      `  ready=${ready.status} live_sha=${liveSha?.slice(0, 12) || '?'} ` +
      `deployment=${depStatus} dep_sha=${depSha?.slice(0, 12) || '?'}`,
    );

    if (depStatus === 'FAILED') {
      const logs = dep?.id ? await fetchDeploymentLogs(headers, dep.id, 40) : {};
      const tail = (logs.logs || []).slice(-15).map((l) => l.message).filter(Boolean);
      console.error('\n❌ Latest Railway deployment FAILED.');
      if (depSha) console.error(`   commit: ${depSha}`);
      if (dep?.meta?.commitMessage) console.error(`   message: ${dep.meta.commitMessage}`);
      for (const line of tail) console.error(`   log: ${String(line).slice(0, 240)}`);
      return { ok: false, reason: 'deployment_failed', liveSha, depSha, depStatus };
    }

    if (targetSha && shaPrefix(liveSha, targetSha)) {
      console.log(`\n✅ Deploy SHA parity: production running ${liveSha?.slice(0, 12)}\n`);
      return { ok: true, liveSha, depSha, depStatus };
    }

    if (depStatus === 'SUCCESS' && targetSha && depSha && shaPrefix(depSha, targetSha) && !shaPrefix(liveSha, targetSha)) {
      console.warn('  Deployment SUCCESS but /ready SHA lagging — continuing poll…');
    }

    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  const final = await liveReadyShape();
  console.error('\n⚠️ Redeploy triggered but deploy SHA did not match origin/main before timeout.');
  console.error(`   target=${targetSha?.slice(0, 12)} live=${final.deployCommitSha?.slice(0, 12) || '?'}`);
  console.error('Run: npm run builderos:deploy:verify && GET /railway/managed-env/deployments/latest\n');
  return { ok: false, reason: 'timeout', liveSha: final.deployCommitSha };
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
    return false;
  }

  console.log('Trying Railway CLI fallback: railway redeploy …');
  const redeploy = await commandMaybe('railway', ['redeploy', '--yes']);
  const output = [redeploy.stdout, redeploy.stderr].filter(Boolean).join('\n');
  if (output) console.log(output.slice(0, 2000));
  return redeploy.ok;
}

async function finishAfterTrigger(targetSha) {
  const parity = await waitForDeployShaParity(targetSha);
  process.exit(parity.ok ? 0 : 1);
}

async function main() {
  if (!base) {
    console.error('❌ Set PUBLIC_BASE_URL (or BUILDER_BASE_URL) to the deploy origin.');
    process.exit(2);
  }

  const targetSha = originMainSha();
  if (targetSha) {
    console.log(`Target origin/main SHA: ${targetSha.slice(0, 12)}`);
  }

  const headers = key ? { 'x-command-key': key } : {};

  if (key) {
    console.log('Trying POST /api/v1/railway/deploy with command key…');
    const { status, ok, json } = await tryDeploy(`${base}/api/v1/railway/deploy`, headers);
    if (ok && json.ok) {
      console.log(JSON.stringify(json, null, 2));
      console.log('\n✅ Redeploy triggered via command-key path.\n');
      await finishAfterTrigger(targetSha);
      return;
    }
    if (status === 410 && json?.error === 'LEGACY_RAILWAY_CONTROL_DISABLED') {
      console.warn('⚠️  Legacy /railway/deploy disabled (410) — using build-from-latest…');
    } else if (status === 404) {
      console.warn('⚠️  /railway/deploy not mounted (404) — falling through to managed-env / CLI…');
    } else if (status === 401 || status === 403) {
      console.warn(`⚠️  Command-key auth failed (${status}) — trying railway-token fallback…`);
    } else {
      console.warn(`⚠️  /railway/deploy failed HTTP ${status} — falling through:`, JSON.stringify(json));
    }
  } else {
    console.warn('No command key in env — skipping command-key path.');
  }

  if (railwayToken) {
    console.log('Trying POST /api/v1/railway/managed-env/self-redeploy with RAILWAY_TOKEN…');
    const { status, ok, json } = await tryDeploy(
      `${base}/api/v1/railway/managed-env/self-redeploy`,
      { 'x-railway-token': railwayToken },
    );
    if (ok && json.ok) {
      console.log(JSON.stringify(json, null, 2));
      console.log('\n✅ Redeploy triggered via RAILWAY_TOKEN self-redeploy path.\n');
      await finishAfterTrigger(targetSha);
      return;
    }
    console.error(`HTTP ${status}:`, JSON.stringify(json));
    process.exit(1);
  }

  if (key) {
    const readyBefore = await liveReadyShape();
    console.log('Live builder-ready shape before build-from-latest:', JSON.stringify(readyBefore));
    console.log(`Trying POST /api/v1/railway/managed-env/build-from-latest (commit=${targetSha?.slice(0, 12) || 'latest'})…`);
    const { status, ok, json } = await tryBuildFromLatest(headers, targetSha);
    if (ok && json.ok) {
      console.log(JSON.stringify(json, null, 2));
      console.log('\n✅ Fresh build from latest source triggered.\n');
      await finishAfterTrigger(targetSha);
      return;
    }
    if (status === 401 || status === 403) {
      console.warn(`⚠️  build-from-latest auth failed (${status}) — trying Railway CLI fallback…`);
    } else {
      console.warn(`⚠️  build-from-latest failed HTTP ${status} — trying Railway CLI fallback…`, JSON.stringify(json));
    }
  }

  if (await tryRailwayCliRedeploy()) {
    console.log('\n✅ Redeploy triggered via Railway CLI fallback.\n');
    await finishAfterTrigger(targetSha);
    return;
  }

  console.error(
    '\n❌ No viable auth for redeploy.\n' +
    '   • Set COMMAND_CENTER_KEY matching Railway vault, OR\n' +
    '   • Set RAILWAY_TOKEN (from Railway → Account Settings → Tokens), OR\n' +
    '   • Link the local repo with Railway CLI (`railway link`) so `railway redeploy` can run\n' +
    '   Then re-run: npm run system:railway:redeploy\n',
  );
  process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});