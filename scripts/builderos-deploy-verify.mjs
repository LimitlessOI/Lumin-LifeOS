#!/usr/bin/env node
/**
 * SYNOPSIS: Verify Railway deploy SHA matches local git (fail-closed on stale prod).
 * Usage: node scripts/builderos-deploy-verify.mjs [--allow-ahead]
 * @ssot builderos-reboot/governance/BUILDEROS_HARNESS_TOOLS.json
 */
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const allowAhead = process.argv.includes('--allow-ahead');

function resolveBaseUrl() {
  return (process.env.PUBLIC_BASE_URL || process.env.BUILDER_BASE_URL || '').replace(/\/$/, '');
}

function resolveCommandKey() {
  return process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || process.env.API_KEY || '';
}

function localHead() {
  const r = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
  return r.status === 0 ? String(r.stdout || '').trim() : null;
}

function originMain() {
  spawnSync('git', ['fetch', 'origin', 'main'], { encoding: 'utf8' });
  const r = spawnSync('git', ['rev-parse', 'origin/main'], { encoding: 'utf8' });
  return r.status === 0 ? String(r.stdout || '').trim() : null;
}

async function fetchDeploySha(baseUrl, commandKey) {
  const paths = ['/api/v1/lifeos/builder/ready', '/ready'];
  for (const p of paths) {
    const res = await fetch(`${baseUrl}${p}`, {
      headers: commandKey ? { 'x-command-key': commandKey } : {},
    });
    if (res.status === 404) continue;
    const json = await res.json().catch(() => ({}));
    const sha =
      json?.codegen?.deploy_commit_sha ||
      json?.builder?.deploy_commit_sha ||
      json?.deploy_commit_sha ||
      null;
    if (sha) return { sha, path: p, ready: json };
  }
  return { sha: null, path: null, ready: null };
}

function shaPrefix(a, b) {
  if (!a || !b) return false;
  return a.slice(0, 12) === b.slice(0, 12) || a.startsWith(b) || b.startsWith(a);
}

const baseUrl = resolveBaseUrl();
const commandKey = resolveCommandKey();
const head = localHead();
const remote = originMain();

const report = {
  schema: 'builderos_deploy_verify_v1',
  generated_at: new Date().toISOString(),
  local_head: head,
  origin_main: remote,
  production_base: baseUrl || null,
  deploy_sha: null,
  status: 'unknown',
  ok: false,
};

if (!baseUrl || !commandKey) {
  report.status = 'missing_env';
  report.detail = 'PUBLIC_BASE_URL or COMMAND_CENTER_KEY missing';
  console.log(JSON.stringify(report, null, 2));
  process.exit(1);
}

const live = await fetchDeploySha(baseUrl, commandKey);
report.deploy_sha = live.sha;
report.ready_path = live.path;

if (!live.sha) {
  report.status = 'no_deploy_sha_on_ready';
  report.detail = 'GET /builder/ready did not expose deploy_commit_sha';
} else if (shaPrefix(live.sha, head)) {
  report.status = 'fresh_local_matches_prod';
  report.ok = true;
} else if (shaPrefix(live.sha, remote)) {
  report.status = 'prod_matches_origin_main';
  report.ok = true;
  report.detail = 'Local HEAD differs from origin/main but prod matches origin — git pull recommended';
} else if (allowAhead && head && remote && shaPrefix(head, remote)) {
  report.status = 'local_ahead_of_prod_allowed';
  report.ok = true;
  report.detail = 'Local has unpushed commits ahead of production (--allow-ahead)';
} else {
  report.status = 'stale_or_diverged';
  report.detail = 'Production deploy SHA does not match local HEAD or origin/main — push+redeploy needed';
}

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
