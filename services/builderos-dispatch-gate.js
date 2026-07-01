/**
 * SYNOPSIS: Fail-closed pre-dispatch gate for all autonomous BuilderOS paths (Claude Code PreToolUse pattern).
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function check(id, ok, detail) {
  return { id, ok: Boolean(ok), detail: ok ? detail || 'PASS' : detail };
}

export function assertServerJsCompositionRoot(root = ROOT) {
  const serverPath = path.join(root, 'server.js');
  try {
    const src = fs.readFileSync(serverPath, 'utf8');
    const ok =
      src.includes('COMPOSITION ROOT') &&
      !src.includes("./src/app.js") &&
      src.length > 500;
    return { ok, detail: ok ? 'composition root intact' : 'server.js corrupted — restore before dispatch' };
  } catch (e) {
    return { ok: false, detail: e.message };
  }
}

function localOriginMainSha(root = ROOT) {
  spawnSync('git', ['fetch', 'origin', 'main'], { cwd: root, encoding: 'utf8' });
  const r = spawnSync('git', ['rev-parse', 'origin/main'], { cwd: root, encoding: 'utf8' });
  return r.status === 0 ? String(r.stdout || '').trim() : null;
}

function shaPrefix(a, b) {
  if (!a || !b) return false;
  const x = String(a).trim();
  const y = String(b).trim();
  return x.slice(0, 12) === y.slice(0, 12) || x.startsWith(y) || y.startsWith(x);
}

export async function fetchDeploySha(baseUrl, commandKey) {
  const paths = ['/api/v1/lifeos/builder/ready', '/ready'];
  for (const p of paths) {
    try {
      const res = await fetch(`${String(baseUrl).replace(/\/$/, '')}${p}`, {
        headers: commandKey ? { 'x-command-key': commandKey } : {},
      });
      if (res.status === 404) continue;
      const json = await res.json().catch(() => ({}));
      const sha =
        json?.codegen?.deploy_commit_sha ||
        json?.builder?.deploy_commit_sha ||
        json?.deploy_commit_sha ||
        null;
      if (sha) return { sha, ready: json, path: p, status: res.status };
    } catch {
      /* try next */
    }
  }
  return { sha: null, ready: null, path: null, status: 0 };
}

/**
 * Unified fail-closed gate before any autonomous /build dispatch.
 * Pattern: Claude Code PreToolUse + OpenHands workspace preflight + deploy SHA parity.
 */
export async function runDispatchGate({
  allowStaleDeploy = true,
  baseUrl,
  commandKey,
  root = ROOT,
  skip = process.env.BUILDEROS_SKIP_DISPATCH_GATE === '1',
} = {}) {
  if (skip) {
    return { schema: 'builderos_dispatch_gate_v1', ok: true, skipped: true, checks: [] };
  }

  const resolvedBase = (
    baseUrl ||
    process.env.PUBLIC_BASE_URL ||
    process.env.BUILDER_BASE_URL ||
    ''
  ).replace(/\/$/, '');
  const resolvedKey =
    commandKey ||
    process.env.COMMAND_CENTER_KEY ||
    process.env.LIFEOS_KEY ||
    process.env.API_KEY ||
    '';

  const checks = [];
  checks.push(check('DG-01', Boolean(resolvedBase), resolvedBase ? `base=${resolvedBase}` : 'PUBLIC_BASE_URL missing'));
  checks.push(check('DG-02', Boolean(resolvedKey), resolvedKey ? 'command key present' : 'COMMAND_CENTER_KEY missing'));

  const server = assertServerJsCompositionRoot(root);
  checks.push(check('DG-03', server.ok, server.detail));

  if (resolvedBase && resolvedKey) {
    const live = await fetchDeploySha(resolvedBase, resolvedKey);
    const builder = live.ready?.builder || {};
    const commitPathReady =
      builder.commit_path_ready === true ||
      builder.commitToGitHub === true;
    checks.push(
      check('DG-04', live.status === 200 && live.ready?.ok !== false, live.path ? `GET ${live.path} OK` : 'ready unreachable'),
    );
    checks.push(
      check(
        'DG-05',
        commitPathReady,
        commitPathReady
          ? (builder.local_mirror_commit === true && builder.github_token !== true
              ? 'commit path ready via local mirror fallback'
              : 'commit path ready')
          : 'commit path not ready',
      ),
    );

    const origin = localOriginMainSha(root);
    const deployFresh = origin && live.sha && shaPrefix(live.sha, origin);
    checks.push(
      check(
        'DG-06',
        allowStaleDeploy || deployFresh,
        deployFresh
          ? `deploy SHA matches origin/main (${live.sha?.slice(0, 12)})`
          : allowStaleDeploy
            ? 'deploy stale — allowed via allowStaleDeploy'
            : `deploy stale: live=${live.sha?.slice(0, 12)} origin=${origin?.slice(0, 12)}`,
      ),
    );
  }

  const report = {
    schema: 'builderos_dispatch_gate_v1',
    generated_at: new Date().toISOString(),
    allow_stale_deploy: allowStaleDeploy,
    checks,
    ok: checks.every((c) => c.ok),
  };

  if (!report.ok) {
    report.blocker = 'BUILDEROS_DISPATCH_GATE_BLOCKED';
    report.failed = checks.filter((c) => !c.ok).map((c) => c.id);
  }

  return report;
}

export function runDispatchGateSync(options = {}) {
  const allowStale = options.allowStaleDeploy !== false;
  const server = assertServerJsCompositionRoot(options.root || ROOT);
  const checks = [check('DG-03', server.ok, server.detail)];
  if (!allowStale) {
    const r = spawnSync('npm', ['run', 'builderos:deploy:verify'], {
      cwd: options.root || ROOT,
      encoding: 'utf8',
      env: process.env,
    });
    checks.push(check('DG-06', r.status === 0, r.status === 0 ? 'deploy verify PASS' : 'deploy verify FAIL'));
  }
  return {
    schema: 'builderos_dispatch_gate_v1',
    generated_at: new Date().toISOString(),
    mode: 'sync_minimal',
    checks,
    ok: checks.every((c) => c.ok),
  };
}
