#!/usr/bin/env node
/**
 * Probes the running deploy to certify env-backed paths work (not only "name exists").
 * Appends one JSON line to data/env-certification-log.jsonl (gitignored) and prints a
 * markdown table row for pasting into docs/ENV_REGISTRY.md → Env certification log.
 *
 * Env (same resolution as builder preflight):
 *   BUILDER_BASE_URL | PUBLIC_BASE_URL | LUMIN_SMOKE_BASE_URL — default http://127.0.0.1:3000
 *   COMMAND_CENTER_KEY | COMMAND_KEY | LIFEOS_KEY | API_KEY — for authenticated routes
 *
 * Usage:
 *   npm run env:certify
 *   npm run env:certify -- --scope builder   # default: healthz + railway/env + builder/domains[/ready]
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import { mkdir, appendFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG = path.join(ROOT, 'data', 'env-certification-log.jsonl');

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

const headersJson = { 'content-type': 'application/json', ...(key ? { 'x-command-key': key } : {}) };

async function fetchJson(url) {
  const r = await fetch(url, { headers: headersJson });
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { _raw: text.slice(0, 200) };
  }
  return { r, json };
}

function escCell(s) {
  return String(s || '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

async function main() {
  const scope = process.argv.includes('--scope')
    ? process.argv[process.argv.indexOf('--scope') + 1] || 'builder'
    : 'builder';

  const checks = {
    healthz: { ok: false, detail: '' },
    railway_env: { ok: false, skipped: true, detail: 'no key' },
    builder_domains: { ok: false, skipped: true, detail: 'no key' },
    builder_ready: { ok: false, skipped: true, detail: 'no key or 404' },
  };

  try {
    const hz = await fetchJson(`${base}/healthz`);
    // 200 = healthy; 503 "degraded" still means we reached the deploy (e.g. optional AI key off in env)
    const reachable =
      hz.r.status === 200 ||
      (hz.r.status === 503 && (hz.json?.status === 'degraded' || hz.json?.checks));
    checks.healthz.ok = reachable;
    checks.healthz.detail = `HTTP ${hz.r.status} status=${hz.json?.status || 'n/a'}`;
  } catch (e) {
    checks.healthz.detail = e?.cause?.code || e?.message || String(e);
  }

  if (key) {
    checks.railway_env.skipped = false;
    try {
      const re = await fetchJson(`${base}/api/v1/railway/env`);
      checks.railway_env.ok = re.r.ok && re.json?.ok === true && typeof re.json?.vars === 'object';
      checks.railway_env.detail = checks.railway_env.ok
        ? `count=${re.json.count ?? Object.keys(re.json.vars).length}`
        : `HTTP ${re.r.status}`;
    } catch (e) {
      checks.railway_env.detail = e?.message || String(e);
    }

    checks.builder_domains.skipped = false;
    try {
      const bd = await fetchJson(`${base}/api/v1/lifeos/builder/domains`);
      checks.builder_domains.ok = bd.r.ok && bd.json?.ok === true && Array.isArray(bd.json?.domains);
      checks.builder_domains.detail = checks.builder_domains.ok
        ? `domains=${bd.json.domains.length}`
        : `HTTP ${bd.r.status}`;
    } catch (e) {
      checks.builder_domains.detail = e?.message || String(e);
    }

    checks.builder_ready.skipped = false;
    try {
      const br = await fetchJson(`${base}/api/v1/lifeos/builder/ready`);
      if (br.r.status === 404) {
        checks.builder_ready.ok = false;
        checks.builder_ready.detail = '404 (deploy predates route)';
      } else {
        checks.builder_ready.ok = br.r.ok && br.json?.ok === true;
        checks.builder_ready.detail = checks.builder_ready.ok
          ? `commit=${br.json?.builder?.commitToGitHub} github_token=${br.json?.builder?.github_token}`
          : `HTTP ${br.r.status}`;
      }
    } catch (e) {
      checks.builder_ready.detail = e?.message || String(e);
    }
  }

  const varsDesc =
    scope === 'builder'
      ? '`PUBLIC_BASE_URL` + command key + (via server) `RAILWAY_TOKEN` for /railway/env; builder routes'
      : '`PUBLIC_BASE_URL` + health';

  const successParts = [];
  if (checks.healthz.ok) successParts.push('healthz');
  if (!checks.railway_env.skipped && checks.railway_env.ok) successParts.push('GET /api/v1/railway/env');
  if (!checks.builder_domains.skipped && checks.builder_domains.ok) successParts.push('GET /lifeos/builder/domains');
  if (!checks.builder_ready.skipped && checks.builder_ready.ok) successParts.push('GET /lifeos/builder/ready');

  const pass =
    checks.healthz.ok &&
    (!key || (checks.railway_env.ok && checks.builder_domains.ok));

  const evidence = [
    `base=${base}`,
    `key_in_shell=${Boolean(key)}`,
    `healthz:${checks.healthz.detail}`,
    key ? `railway_env:${checks.railway_env.detail}` : '',
    key ? `builder_domains:${checks.builder_domains.detail}` : '',
    key ? `builder_ready:${checks.builder_ready.detail}` : '',
  ]
    .filter(Boolean)
    .join('; ');

  const line = {
    ts: new Date().toISOString(),
    base,
    key_in_shell: Boolean(key),
    scope,
    pass,
    checks,
    evidence,
  };

  try {
    await mkdir(path.dirname(LOG), { recursive: true });
    await appendFile(LOG, JSON.stringify(line) + '\n', 'utf8');
  } catch (e) {
    console.warn('[env-certify] log append failed:', e.message);
  }

  const isoDate = line.ts.slice(0, 10);
  const criterion =
    scope === 'builder'
      ? 'Deploy reachable; healthz OK; with key: /railway/env lists vars; /builder/domains returns domain list'
      : 'Deploy reachable; healthz OK';

  const mdRow = `| ${isoDate} | ${escCell(varsDesc)} | ${escCell(criterion)} | \`npm run env:certify\` (${escCell(evidence)}) | **${pass ? 'PASS' : 'FAIL'}** |`;

  console.log('\n══ Env certification (machine log + paste row) ══\n');
  console.log(JSON.stringify({ pass, checks }, null, 2));
  console.log('\n--- Paste into docs/ENV_REGISTRY.md → Env certification log ---\n');
  console.log(mdRow);
  console.log('\nMachine log:', LOG);
  console.log(pass ? '\n✅ PASS (append registry row after review)\n' : '\n❌ FAIL — fix URL/key/deploy before certifying\n');

  process.exit(pass ? 0 : 1);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
