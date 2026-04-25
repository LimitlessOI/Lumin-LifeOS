#!/usr/bin/env node
/**
 * Proves the Council Builder is reachable and reports why POST /api/v1/lifeos/builder/build
 * would fail (auth, GITHUB_TOKEN, DB, etc.). Run before any Conductor work on product paths.
 *
 * Env (highest wins first for base URL):
 *   BUILDER_BASE_URL, PUBLIC_BASE_URL, LUMIN_SMOKE_BASE_URL — default http://127.0.0.1:3000
 * Auth header (any one, must match server): COMMAND_CENTER_KEY, COMMAND_KEY, LIFEOS_KEY, API_KEY
 *
 * When a command key is set and `/domains` succeeds, optionally GETs `/api/v1/railway/env`
 * (same auth) so the **deploy** lists Railway variable **names** (values always masked server-side).
 * That proves e.g. COMMAND_CENTER_KEY / PUBLIC_BASE_URL exist in the service vault without asking Adam to re-screenshot.
 *
 * Exit: 0 = ready for /build (with caveats printed), 1 = not ready, 2 = local operator error (no key when required)
 *
 * Appends a JSON line to `data/builder-preflight-log.jsonl` (gitignored) on every exit — system-owned readiness note.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 *
 * If repo-root `.env` exists, it is loaded first (same pattern as `server.js` / other scripts) so
 * `PUBLIC_BASE_URL`, `BUILDER_BASE_URL`, and `x-command-key` source vars work without manual `export`.
 */

import 'dotenv/config';
import { mkdir, appendFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PREFLIGHT_LOG = path.join(ROOT, 'data', 'builder-preflight-log.jsonl');

const base = (
  process.env.BUILDER_BASE_URL ||
  process.env.PUBLIC_BASE_URL ||
  process.env.LUMIN_SMOKE_BASE_URL ||
  'http://127.0.0.1:3000'
)
  .replace(/\/$/, '');

const key =
  process.env.COMMAND_CENTER_KEY ||
  process.env.COMMAND_KEY ||
  process.env.LIFEOS_KEY ||
  process.env.API_KEY ||
  '';

const headers = {
  'content-type': 'application/json',
  ...(key ? { 'x-command-key': key } : {}),
};

function printBlock(title, body) {
  console.log(`\n${title}`);
  console.log(body);
}

async function fetchJson(url) {
  const r = await fetch(url, { headers });
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { _parseError: true, text: text.slice(0, 400) };
  }
  return { r, json };
}

async function logPreflight({ exitCode, reason }) {
  const host = (() => {
    try {
      return new URL(base).host;
    } catch {
      return 'invalid_base';
    }
  })();
  const line =
    JSON.stringify({
      ts: new Date().toISOString(),
      exit_code: exitCode,
      reason,
      host,
      key_in_shell: Boolean(key),
    }) + '\n';
  try {
    await mkdir(path.dirname(PREFLIGHT_LOG), { recursive: true });
    await appendFile(PREFLIGHT_LOG, line, 'utf8');
  } catch (err) {
    console.warn('[builder-preflight] machine log append failed:', err.message);
  }
}

async function finish(exitCode, reason) {
  await logPreflight({ exitCode, reason });
  process.exit(exitCode);
}

// Emit a TSOS machine-channel line (§2.14 / docs/TSOS_SYSTEM_LANGUAGE.md).
// §2.11b plain-language block follows for the human (Adam) read.
function tsosMachine(epistemic, state, verb, fact, next) {
  console.log(`[TSOS-MACHINE] ${epistemic}: STATE=${state} VERB=${verb} | ${fact} | NEXT=${next}`);
}

async function main() {
  // Machine-channel header (§2.14) — first output line, receipt-parsable
  tsosMachine('KNOW', 'PREFLIGHT_FAIL', 'PROBE', `base=${base} key_in_shell=${Boolean(key)}`, 'PROBE /ready then /domains');

  printBlock(
    '══ Council builder preflight ══',
    `Base URL: ${base}\nKey in env: ${key ? 'yes (value hidden)' : 'no'}`,
  );

  const readyUrl = `${base}/api/v1/lifeos/builder/ready`;
  let r;
  let json;
  try {
    const out = await fetchJson(readyUrl);
    r = out.r;
    json = out.json;
  } catch (e) {
    if (e?.cause?.code === 'ECONNREFUSED' || e?.code === 'ECONNREFUSED') {
      tsosMachine('KNOW', 'BLOCKED', 'PROBE', `ECONNREFUSED ${base}`, 'GAP_FILL platform or start server or set PUBLIC_BASE_URL');
      printBlock(
        '❌ CONNECTION REFUSED',
        [
          'Nothing is listening at ' + base,
          '',
          'Fix ONE of:',
          '• Start the app locally: npm start',
          '• Point to Railway: export PUBLIC_BASE_URL=https://<your-service>.up.railway.app',
        ].join('\n'),
      );
      await finish(1, 'econnrefused_ready');
    }
    throw e;
  }

  const readyMissing = r.status === 404;
  if (readyMissing) {
    console.warn('\n⚠️  GET /ready not found (404) — server build predates this route. Skipping server capability checks; use GET /domains + POST /build only after upgrade.');
  } else if (r.status === 401) {
    tsosMachine('KNOW', 'AUTH_FAIL', 'PROBE', 'x-command-key rejected on /ready', 'HALT_REQUEST operator supplies matching COMMAND_CENTER_KEY');
    printBlock(
      '❌ UNAUTHORIZED',
      [
        'The server requires a command key but this request was rejected.',
        '',
        '1. In Railway, see which of API_KEY, LIFEOS_KEY, COMMAND_CENTER_KEY is set.',
        '2. In this shell, export the SAME value as: COMMAND_CENTER_KEY, LIFEOS_KEY, or API_KEY.',
        '3. Requests use header x-command-key (see requireKey aliases).',
        '',
        'If the server has NO auth keys, requireKey is open — 401 means wrong URL or wrong key value.',
      ].join('\n'),
    );
    await finish(2, 'unauthorized_ready');
  } else if (!r.ok) {
    printBlock('❌ /ready request failed', `HTTP ${r.status} ${json._parseError ? json.text : JSON.stringify(json, null, 2)}`);
    await finish(1, 'ready_http_error');
  }

  if (!readyMissing && json?.builder) {
    const b = json.builder;
    const s = json.server;
    printBlock('Builder readiness (server truth)', JSON.stringify({ builder: b, server: s, next_steps: json.next_steps }, null, 2));
    if (!b.commitToGitHub) {
      printBlock(
        '❌ BLOCKER for POST /build',
        'commitToGitHub is not available on the server. Wire deployment-service into createLifeOSCouncilBuilderRoutes.\n' +
          'You cannot use [system-build] until the server can commit. Hand product edits require GAP-FILL: and a platform fix plan.',
      );
      await finish(1, 'no_commitToGitHub');
    }
    if (b.github_token === false) {
      printBlock(
        '❌ BLOCKER for POST /build (GitHub)',
        'Server reports GITHUB_TOKEN is not set. Set it in Railway (Variables) so commitToGitHub can push.\n' +
          'Until then, POST /build will fail at commit time even if the council generates code.',
      );
      await finish(1, 'no_github_token');
    }
    if (!b.callCouncilMember) {
      printBlock('❌ BLOCKER', 'callCouncilMember not wired — startup must pass it into the builder factory.');
      await finish(1, 'no_callCouncilMember');
    }
  }

  const domainsUrl = `${base}/api/v1/lifeos/builder/domains`;
  let d;
  try {
    d = await fetchJson(domainsUrl);
  } catch (e) {
    if (e?.cause?.code === 'ECONNREFUSED' || e?.code === 'ECONNREFUSED') {
      printBlock('❌ CONNECTION REFUSED (domains)', 'See base URL and server listen address above.');
      await finish(1, 'econnrefused_domains');
    }
    throw e;
  }
  if (d.r.status === 401) {
    printBlock('❌ UNAUTHORIZED on /domains', 'Same as /ready: set COMMAND_CENTER_KEY (or matching key) in this shell.');
    await finish(2, 'unauthorized_domains');
  }
  if (!d.r.ok || !d.json?.ok) {
    printBlock('❌ GET /domains failed', `HTTP ${d.r.status} ${JSON.stringify(d.json)}`);
    await finish(1, 'domains_http_error');
  }

  const n = d.json?.domains?.length ?? 0;

  /** Builder-critical names: presence checked via deploy GET /api/v1/railway/env (masked values only). */
  const RAILWAY_PROBE_NAMES = [
    'PUBLIC_BASE_URL',
    'COMMAND_CENTER_KEY',
    'LIFEOS_KEY',
    'API_KEY',
    'GITHUB_TOKEN',
    'RAILWAY_TOKEN',
    'DATABASE_URL',
    'GITHUB_REPO',
  ];

  if (key) {
    const envUrl = `${base}/api/v1/railway/env`;
    try {
      const envOut = await fetchJson(envUrl);
      if (envOut.r.status === 404) {
        printBlock(
          'ℹ️  Railway env name-list (skipped)',
          'GET /api/v1/railway/env returned 404 — this deploy may predate the route. Railway vault is still authoritative; use Railway UI or redeploy.',
        );
      } else if (!envOut.r.ok || !envOut.json?.ok) {
        printBlock(
          'ℹ️  Railway env name-list (skipped)',
          `GET /api/v1/railway/env failed HTTP ${envOut.r.status} — ${JSON.stringify(envOut.json).slice(0, 300)}`,
        );
      } else {
        const names = Object.keys(envOut.json.vars || {});
        const set = new Set(names);
        const authNamePresent = ['COMMAND_CENTER_KEY', 'LIFEOS_KEY', 'API_KEY'].some(k => set.has(k));
        const lines = RAILWAY_PROBE_NAMES.map(nm => {
          const ok = set.has(nm);
          return `  ${ok ? '✓' : '✗'} ${nm}${nm === 'COMMAND_CENTER_KEY' && !ok && authNamePresent ? ' (alias: LIFEOS_KEY or API_KEY present)' : ''}`;
        });
        printBlock(
          'Railway variable names (from deploy — values never shown)',
          [
            'Source: GET /api/v1/railway/env (server uses RAILWAY_TOKEN + project/service IDs).',
            'This is **name-level** proof for agents: do not tell Adam a var is “missing from Railway” if it appears here.',
            '',
            ...lines,
            '',
            `Total keys reported: ${envOut.json.count ?? names.length}`,
          ].join('\n'),
        );
      }
    } catch (e) {
      printBlock('ℹ️  Railway env name-list (skipped)', e?.message || String(e));
    }
  } else {
    printBlock(
      'ℹ️  Railway env name-list (skipped)',
      'No command key in this shell — set COMMAND_CENTER_KEY (or LIFEOS_KEY / API_KEY) to probe GET /api/v1/railway/env on the deploy.\nRailway dashboard remains authoritative; this probe is optional receipts.',
    );
  }

  tsosMachine('KNOW', 'PREFLIGHT_OK', 'PROBE', `builder domains+ready OK domains=${n}`, 'BUILD');
  printBlock(
    '✅ OK',
    `GET /domains: ${n} domain prompt file(s) visible.\n` +
      'Next: POST /api/v1/lifeos/builder/build with a task + target_file (or placement metadata) for [system-build].',
  );
  await finish(0, 'ok');
}

main().catch(async e => {
  console.error(e);
  await finish(1, `uncaught:${e?.message || e}`);
});
