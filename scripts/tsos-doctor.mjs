#!/usr/bin/env node
/**
 * TokenSaverOS build-system doctor.
 *
 * Read-only by default: grades whether the current target can run the system builder,
 * gate-change council, Railway env-name probe, and redeploy path.
 *
 * Env:
 *   BUILDER_BASE_URL | PUBLIC_BASE_URL | LUMIN_SMOKE_BASE_URL
 *   COMMAND_CENTER_KEY | COMMAND_KEY | LIFEOS_KEY | API_KEY
 *   RAILWAY_TOKEN (local fallback only; presence is reported, value is never printed)
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import 'dotenv/config';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const DEFAULT_BASE = 'http://127.0.0.1:3000';

const base = (
  process.env.BUILDER_BASE_URL ||
  process.env.PUBLIC_BASE_URL ||
  process.env.LUMIN_SMOKE_BASE_URL ||
  DEFAULT_BASE
).replace(/\/$/, '');

const key =
  process.env.COMMAND_CENTER_KEY ||
  process.env.COMMAND_KEY ||
  process.env.LIFEOS_KEY ||
  process.env.API_KEY ||
  '';

const hasRailwayToken = Boolean(process.env.RAILWAY_TOKEN);
const localEnvPresence = {
  PUBLIC_BASE_URL: Boolean(process.env.PUBLIC_BASE_URL),
  RAILWAY_TOKEN: Boolean(process.env.RAILWAY_TOKEN),
  RAILWAY_PROJECT_ID: Boolean(process.env.RAILWAY_PROJECT_ID),
  RAILWAY_SERVICE_ID: Boolean(process.env.RAILWAY_SERVICE_ID),
  RAILWAY_ENVIRONMENT_ID: Boolean(process.env.RAILWAY_ENVIRONMENT_ID),
  GITHUB_TOKEN: Boolean(process.env.GITHUB_TOKEN),
};

const headers = {
  accept: 'application/json',
  ...(key ? { 'x-command-key': key } : {}),
};

function line(label, value) {
  console.log(`${label.padEnd(36)} ${value}`);
}

function statusIcon(result) {
  if (!result) return 'unknown';
  if (result.ok) return 'ok';
  if (result.status === 401 || result.status === 403) return 'auth-fail';
  if (result.status === 404) return 'missing-route';
  if (result.errorCode === 'ECONNREFUSED') return 'offline';
  return `http-${result.status || 'error'}`;
}

async function fetchMaybe(path, options = {}) {
  const url = `${base}${path}`;
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        ...headers,
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return {
      ok: response.ok && (!json || json.ok !== false),
      status: response.status,
      json,
      text: text.slice(0, 500),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      errorCode: error?.cause?.code || error?.code || 'FETCH_ERROR',
      error: error?.message || String(error),
    };
  }
}

async function commandMaybe(command, args = []) {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, {
      timeout: 10000,
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

async function railwayCliStatus() {
  const which = await commandMaybe('railway', ['--version']);
  if (!which.ok) {
    return { installed: false, linked: false, summary: 'not installed' };
  }
  const status = await commandMaybe('railway', ['status']);
  const output = [status.stdout, status.stderr].filter(Boolean).join('\n');
  return {
    installed: true,
    linked: status.ok,
    summary: status.ok ? output.slice(0, 300) || 'linked' : output.slice(0, 300) || 'not linked',
  };
}

function grade(results) {
  let score = 0;
  const max = 100;

  if (results.health?.status === 200) score += 15;
  if (key) score += 10;
  if (results.builderReady?.ok) score += 15;
  if (results.builderDomains?.ok) score += 15;
  if (results.gatePresets?.ok) score += 15;
  if (results.railwayEnv?.ok) score += 10;
  if (hasRailwayToken) score += 5;
  if (results.builderReady?.json?.builder?.github_token === true) score += 10;
  if (results.builderReady?.json?.builder?.callCouncilMember === true) score += 5;
  if (results.builderModelMap?.ok) score += 5;
  if (results.councilHealth?.ok) score += 5;
  if (results.railwayCli?.linked) score += 5;

  let rating = 'red';
  if (score >= 80) rating = 'green';
  else if (score >= 55) rating = 'yellow';
  else if (score >= 35) rating = 'orange';

  return { score: Math.min(score, max), rating };
}

function weaknessList(results) {
  const weaknesses = [];

  if (results.health?.errorCode === 'ECONNREFUSED') {
    weaknesses.push('Target app is offline or base URL/port is wrong.');
  } else if (results.health?.status !== 200) {
    weaknesses.push(`Health check is not green (HTTP ${results.health?.status || 'error'}).`);
  }

  if (!key) {
    weaknesses.push('No local command key alias is loaded; authenticated probes/builds cannot run.');
  }

  if (results.builderDomains?.status === 404) {
    weaknesses.push('Council builder route is missing on target deploy (deploy drift).');
  } else if (results.builderDomains?.status === 401 || results.builderDomains?.status === 403) {
    weaknesses.push('Council builder auth failed; local key does not match the target server.');
  }

  if (results.gatePresets?.status === 404) {
    weaknesses.push('Gate-change/Core council route is missing on target deploy (deploy drift).');
  } else if (results.gatePresets?.status === 401 || results.gatePresets?.status === 403) {
    weaknesses.push('Gate-change/Core council auth failed; local key does not match the target server.');
  }

  const builder = results.builderReady?.json?.builder;
  if (builder) {
    if (builder.github_token === false) weaknesses.push('Target server lacks GITHUB_TOKEN; /build can generate but cannot commit.');
    if (builder.callCouncilMember === false) weaknesses.push('Target server lacks callCouncilMember wiring; council generation cannot run.');
    if (builder.pool === false) weaknesses.push('Target server lacks DB pool; audit/proposals/readiness are degraded.');
  }

  if (!results.railwayEnv?.ok) {
    weaknesses.push('Railway env name probe is unavailable; operators cannot verify vault names from the system.');
  }

  if (!hasRailwayToken) {
    weaknesses.push('No local RAILWAY_TOKEN fallback; self-redeploy cannot bypass a broken command-key gate.');
  }

  if (results.railwayCli?.installed && !results.railwayCli.linked) {
    weaknesses.push('Railway CLI is installed but this repo is not linked; CLI deploy fallback is unavailable.');
  } else if (!results.railwayCli?.installed) {
    weaknesses.push('Railway CLI fallback is unavailable because the CLI is not installed.');
  }

  if (!results.builderModelMap?.ok) {
    weaknesses.push('Builder model-map route is unavailable; task-to-model routing cannot be inspected on target.');
  }

  if (!results.councilHealth?.ok) {
    weaknesses.push('Council health route is unavailable; model/provider readiness cannot be inspected on target.');
  }

  return weaknesses;
}

async function main() {
  console.log('TokenSaverOS Build-System Doctor');
  console.log('='.repeat(36));
  line('Base URL', base);
  line('Command key loaded', key ? 'yes (hidden)' : 'no');
  line('Railway token fallback', hasRailwayToken ? 'yes (hidden)' : 'no');
  line('Local PUBLIC_BASE_URL', localEnvPresence.PUBLIC_BASE_URL ? 'set' : 'missing');
  console.log('');

  const results = {};
  results.railwayCli = await railwayCliStatus();
  results.health = await fetchMaybe('/healthz');
  results.builderReady = await fetchMaybe('/api/v1/lifeos/builder/ready');
  results.builderDomains = await fetchMaybe('/api/v1/lifeos/builder/domains');
  results.builderModelMap = await fetchMaybe('/api/v1/lifeos/builder/model-map');
  results.gatePresets = await fetchMaybe('/api/v1/lifeos/gate-change/presets');
  results.councilHealth = await fetchMaybe('/api/v1/council/health');
  results.railwayEnv = await fetchMaybe('/api/v1/railway/env');

  line('Railway CLI', results.railwayCli.installed ? (results.railwayCli.linked ? 'linked' : 'installed, not linked') : 'not installed');
  line('/healthz', `${statusIcon(results.health)} (${results.health.status || results.health.errorCode})`);
  line('/lifeos/builder/ready', `${statusIcon(results.builderReady)} (${results.builderReady.status || results.builderReady.errorCode})`);
  line('/lifeos/builder/domains', `${statusIcon(results.builderDomains)} (${results.builderDomains.status || results.builderDomains.errorCode})`);
  line('/lifeos/builder/model-map', `${statusIcon(results.builderModelMap)} (${results.builderModelMap.status || results.builderModelMap.errorCode})`);
  line('/lifeos/gate-change/presets', `${statusIcon(results.gatePresets)} (${results.gatePresets.status || results.gatePresets.errorCode})`);
  line('/council/health', `${statusIcon(results.councilHealth)} (${results.councilHealth.status || results.councilHealth.errorCode})`);
  line('/railway/env', `${statusIcon(results.railwayEnv)} (${results.railwayEnv.status || results.railwayEnv.errorCode})`);

  console.log('\nLocal fallback env names');
  for (const [name, present] of Object.entries(localEnvPresence)) {
    console.log(`  ${present ? 'yes' : 'no '} ${name}`);
  }

  if (results.railwayCli?.summary) {
    console.log('\nRailway CLI status');
    console.log(results.railwayCli.summary);
  }

  if (results.builderReady?.json?.builder) {
    console.log('\nBuilder readiness (server truth)');
    console.log(JSON.stringify(results.builderReady.json.builder, null, 2));
  }

  if (results.railwayEnv?.json?.vars) {
    const names = new Set(Object.keys(results.railwayEnv.json.vars));
    console.log('\nCritical Railway names (values hidden by server)');
    for (const name of ['PUBLIC_BASE_URL', 'COMMAND_CENTER_KEY', 'LIFEOS_KEY', 'API_KEY', 'GITHUB_TOKEN', 'RAILWAY_TOKEN', 'DATABASE_URL', 'GITHUB_REPO']) {
      console.log(`  ${names.has(name) ? 'yes' : 'no '} ${name}`);
    }
  }

  const assessment = grade(results);
  const weaknesses = weaknessList(results);

  console.log('\nAssessment');
  line('TokenSaverOS readiness', `${assessment.score}/100 (${assessment.rating})`);

  if (weaknesses.length) {
    console.log('\nWeaknesses to fix next');
    weaknesses.forEach((weakness, index) => {
      console.log(`${index + 1}. ${weakness}`);
    });
  } else {
    console.log('\nNo blocking weaknesses detected by read-only probes.');
  }

  console.log('\nNext command');
  if (results.builderDomains?.status === 404 || results.gatePresets?.status === 404) {
    if (hasRailwayToken || results.railwayCli?.linked) {
      console.log('Run: npm run system:railway:redeploy');
    } else {
      console.log('Provide RAILWAY_TOKEN or run `railway link`, then run: npm run system:railway:redeploy');
    }
  } else if (results.builderReady?.json?.builder?.github_token === false) {
    console.log('Set GITHUB_TOKEN on the target server, then rerun: npm run tsos:doctor');
  } else if (assessment.score >= 80) {
    console.log('Run: npm run lifeos:builder:orchestrate');
  } else {
    console.log('Fix the top weakness above, then rerun: npm run tsos:doctor');
  }

  process.exit(assessment.score >= 80 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
