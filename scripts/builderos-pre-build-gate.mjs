#!/usr/bin/env node
/**
 * SYNOPSIS: Pre-build gate for canonical harness — ready, deploy, doctrine, env.
 * Usage: node scripts/builderos-pre-build-gate.mjs [--allow-stale]
 * @ssot builderos-reboot/governance/BUILDEROS_HARNESS_TOOLS.json
 */
import 'dotenv/config';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const allowStale = process.argv.includes('--allow-stale');

function check(id, ok, detail) {
  return { id, ok: Boolean(ok), detail: ok ? detail || 'PASS' : detail };
}

function resolveBaseUrl() {
  return (process.env.PUBLIC_BASE_URL || process.env.BUILDER_BASE_URL || '').replace(/\/$/, '');
}

function resolveCommandKey() {
  return process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || process.env.API_KEY || '';
}

async function fetchReady(baseUrl, commandKey) {
  const paths = ['/api/v1/lifeos/builder/ready', '/ready'];
  for (const p of paths) {
    const res = await fetch(`${baseUrl}${p}`, {
      headers: commandKey ? { 'x-command-key': commandKey } : {},
    });
    if (res.status === 404) continue;
    const json = await res.json().catch(() => null);
    return { ok: res.ok, json, path: p, status: res.status };
  }
  return { ok: false, json: null, path: null, status: 404 };
}

const checks = [];
const baseUrl = resolveBaseUrl();
const commandKey = resolveCommandKey();

checks.push(check('PBG-01', Boolean(baseUrl), baseUrl ? `base=${baseUrl}` : 'PUBLIC_BASE_URL missing'));
checks.push(check('PBG-02', Boolean(commandKey), commandKey ? 'command key present' : 'COMMAND_CENTER_KEY missing'));

if (baseUrl && commandKey) {
  const ready = await fetchReady(baseUrl, commandKey);
  const builder = ready.json?.builder || {};
  checks.push(check('PBG-03', ready.ok, ready.ok ? `GET ${ready.path} OK` : `ready HTTP ${ready.status}`));
  checks.push(
    check(
      'PBG-04',
      builder.commitToGitHub === true,
      builder.commitToGitHub ? 'commitToGitHub available' : 'commit path not ready',
    ),
  );
}

const doctrine = spawnSync(process.execPath, ['scripts/verify-lifeos-service-doctrine.mjs'], {
  cwd: ROOT,
  encoding: 'utf8',
});
checks.push(check('PBG-05', doctrine.status === 0, 'service doctrine verify'));

const commLaw = spawnSync(process.execPath, ['scripts/verify-lumin-communication-law.mjs'], {
  cwd: ROOT,
  encoding: 'utf8',
});
checks.push(check('PBG-05c', commLaw.status === 0, 'Lumin Communication Law verify'));

const convRoute = spawnSync(process.execPath, ['scripts/verify-lumin-conversation-routing.mjs'], {
  cwd: ROOT,
  encoding: 'utf8',
});
checks.push(check('PBG-05d', convRoute.status === 0, 'Lumin conversation routing verify'));

const serverPath = path.join(ROOT, 'server.js');
let serverOk = false;
let serverDetail = 'server.js missing';
try {
  const serverSrc = fs.readFileSync(serverPath, 'utf8');
  const compositionRoot =
    serverSrc.includes('COMPOSITION ROOT') &&
    !serverSrc.includes("./src/app.js") &&
    serverSrc.length > 500;
  serverOk = compositionRoot;
  serverDetail = compositionRoot
    ? 'server.js composition root intact'
    : 'server.js corrupted (builder rewrite — restore composition root before deploy)';
} catch (e) {
  serverDetail = e.message;
}
checks.push(check('PBG-05b', serverOk, serverDetail));

const deployArgs = ['run', 'builderos:deploy:verify'];
if (allowStale) deployArgs.push('--', '--allow-ahead');
const deploy = spawnSync('npm', deployArgs, { cwd: ROOT, encoding: 'utf8' });
checks.push(
  check(
    'PBG-06',
    allowStale ? true : deploy.status === 0,
    deploy.status === 0 ? 'deploy SHA fresh' : allowStale ? 'deploy stale (bypassed by --allow-stale)' : 'deploy stale or diverged (use --allow-stale to bypass)',
  ),
);

const skipIntakeRegression = /^1|true|yes$/i.test(String(process.env.BUILDEROS_SKIP_INTAKE_REGRESSION || '').trim());
if (!skipIntakeRegression && baseUrl && commandKey) {
  const intakeRegression = spawnSync('npm', ['run', 'builderos:intake:regression:acceptance'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env,
    timeout: 120_000,
  });
  checks.push(
    check(
      'PBG-07',
      intakeRegression.status === 0,
      intakeRegression.status === 0
        ? 'intake golden-path acceptance PASS'
        : 'intake regression failed — run npm run builderos:intake:regression:acceptance',
    ),
  );
} else if (skipIntakeRegression) {
  checks.push(check('PBG-07', true, 'skipped (BUILDEROS_SKIP_INTAKE_REGRESSION=1)'));
} else {
  checks.push(check('PBG-07', true, 'skipped (no PUBLIC_BASE_URL or COMMAND_CENTER_KEY)'));
}

const report = {
  schema: 'builderos_pre_build_gate_v1',
  generated_at: new Date().toISOString(),
  checks,
  ok: checks.every((c) => c.ok),
};

console.log(JSON.stringify(report, null, 2));
process.exit(report.ok ? 0 : 1);
