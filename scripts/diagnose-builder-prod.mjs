#!/usr/bin/env node
/**
 * Read-only HTTP probe: health vs council builder /domains.
 * No secrets. Use to prove deploy drift (404 on /domains while /healthz OK).
 *
 * Env (optional):
 *   DIAGNOSE_BASE_URL — default: https://robust-magic-production.up.railway.app
 *
 * @ssot docs/ops/BUILDER_PRODUCTION_FIX.md
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import 'dotenv/config';

const DEFAULT_BASE = 'https://robust-magic-production.up.railway.app';

const base = (
  process.env.DIAGNOSE_BASE_URL ||
  process.env.PUBLIC_BASE_URL ||
  process.env.BUILDER_BASE_URL ||
  DEFAULT_BASE
).replace(/\/$/, '');

const key =
  process.env.COMMAND_CENTER_KEY ||
  process.env.COMMAND_KEY ||
  process.env.LIFEOS_KEY ||
  process.env.API_KEY ||
  '';

async function getStatus(path) {
  const r = await fetch(`${base}${path}`, {
    method: 'GET',
    headers: key ? { 'x-command-key': key } : {},
  });
  const text = await r.text();
  return { path, status: r.status, head: text.slice(0, 120) };
}

async function main() {
  const health = await getStatus('/healthz');
  const domains = await getStatus('/api/v1/lifeos/builder/domains');
  const gateChange = await getStatus('/api/v1/lifeos/gate-change/presets');

  console.log('══ Builder deploy diagnosis ══');
  console.log('Origin:', base);
  console.log('Key in env:', key ? 'yes (value hidden)' : 'no');
  console.log(`${health.path} → HTTP ${health.status}`);
  console.log(`${domains.path} → HTTP ${domains.status}`);
  console.log(`${gateChange.path} → HTTP ${gateChange.status}`);

  if (health.status !== 200) {
    console.log('\nVERDICT: App may be down or wrong URL (healthz not 200).');
    process.exit(1);
  }
  if (domains.status === 404) {
    console.log(
      '\nVERDICT: DEPLOY DRIFT — builder routes not on this image. See docs/ops/BUILDER_PRODUCTION_FIX.md (redeploy from main, then re-run).',
    );
    process.exit(1);
  }
  if (domains.status === 401 || domains.status === 403) {
    console.log(
      '\nVERDICT: Route EXISTS — add x-command-key to match Railway (COMMAND_CENTER_KEY). Preflight: npm run builder:preflight',
    );
    process.exit(0);
  }
  if (domains.status >= 200 && domains.status < 300) {
    console.log('\nVERDICT: Builder path reachable. Next: npm run builder:preflight (with key) or npm run lifeos:builder:build-chat');
    process.exit(0);
  }

  console.log('\nVERDICT: Unexpected — inspect response:', domains.head);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
