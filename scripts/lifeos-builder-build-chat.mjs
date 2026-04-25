#!/usr/bin/env node
/**
 * System-authored Lumin chat UI: POST /api/v1/lifeos/builder/build on the RUNNING app.
 *
 * Prerequisites (KNOW from preflight):
 *   - Deploy must include council builder routes (`GET …/builder/domains` ≠ 404). If 404 → redeploy from `main`.
 *   - Shell: PUBLIC_BASE_URL (or BUILDER_BASE_URL) + COMMAND_CENTER_KEY (or LIFEOS_KEY / API_KEY) matching Railway.
 *   - Server: GITHUB_TOKEN + council keys for /build to succeed.
 *
 * Usage:
 *   npm run lifeos:builder:build-chat
 *   npm run lifeos:builder:build-chat -- --dry-run    # print JSON body only
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 *
 * Loads repo-root `.env` when present (see `council-builder-preflight.mjs`) so `PUBLIC_BASE_URL` + key work from disk.
 */

import 'dotenv/config';

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

const TARGET = 'public/overlay/lifeos-chat.html';
const DOMAIN = 'lifeos-lumin';

const body = {
  domain: DOMAIN,
  mode: 'code',
  autonomy_mode: 'max',
  internet_research: true,
  files: [TARGET],
  task:
    'Produce the complete, production-ready HTML for the Lumin chat overlay at target_file. ' +
    'Preserve all existing JavaScript behavior that talks to LifeOS APIs (threads, modes, build panel, voice, conflict interrupt, auth). ' +
    'Improve: visual polish, mobile usability, keyboard/focus flow, and clarity of the build/status strip. ' +
    'Do not remove working endpoints or change URL paths unless required for a bug fix. ' +
    'Single file output only.',
  spec:
    '- Match dark theme tokens already in the file where possible.\n' +
    '- Keep script src="/overlay/lifeos-bootstrap.js" and existing fetch patterns.\n' +
    '- Append ---METADATA--- JSON with target_file, confidence.',
  target_file: TARGET,
  commit_message: '[system-build] Lumin chat overlay — council builder (lifeos:builder:build-chat)',
};

async function main() {
  const dry = process.argv.includes('--dry-run');

  if (!base) {
    console.error('Set PUBLIC_BASE_URL or BUILDER_BASE_URL to your Railway app origin (e.g. https://….up.railway.app)');
    process.exit(2);
  }
  if (!key) {
    console.error('Set COMMAND_CENTER_KEY (or LIFEOS_KEY / API_KEY) to match Railway — same value the server expects on x-command-key.');
    process.exit(2);
  }

  const domainsUrl = `${base}/api/v1/lifeos/builder/domains`;
  const probe = await fetch(domainsUrl, {
    headers: { 'x-command-key': key, accept: 'application/json' },
  });
  if (probe.status === 404) {
    console.error(
      '\n❌ GET /api/v1/lifeos/builder/domains → 404\n' +
        'This deploy does not include the council builder. Redeploy Railway from the branch that mounts `createLifeOSCouncilBuilderRoutes` (current `main`), then re-run.\n',
    );
    process.exit(1);
  }
  if (probe.status === 401) {
    console.error('\n❌ 401 — x-command-key does not match Railway COMMAND_CENTER_KEY / LIFEOS_KEY / API_KEY.\n');
    process.exit(1);
  }
  if (!probe.ok) {
    const t = await probe.text();
    console.error(`\n❌ GET /domains failed HTTP ${probe.status}: ${t.slice(0, 400)}\n`);
    process.exit(1);
  }

  const buildUrl = `${base}/api/v1/lifeos/builder/build`;
  if (dry) {
    console.log('Dry run — would POST:\n', buildUrl, '\n', JSON.stringify(body, null, 2));
    process.exit(0);
  }

  console.log('POST', buildUrl, '…');
  const r = await fetch(buildUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-command-key': key },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    console.error('Non-JSON response', r.status, text.slice(0, 800));
    process.exit(1);
  }

  console.log(JSON.stringify(json, null, 2));
  if (!r.ok || !json.ok) {
    process.exit(1);
  }
  if (!json.committed) {
    console.warn('\n⚠️ committed:false — check note / target_file / GitHub token on server.\n');
    process.exit(1);
  }
  console.log('\n✅ System build committed:', json.target_file, '\n');
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
