#!/usr/bin/env node
/**
 * Runs an "inner supervisor" review pass: POST /api/v1/lifeos/builder/task with mode review,
 * injecting prompts/lifeos-builder-inner-supervisor.md + the files you list.
 *
 * Usage:
 *   npm run lifeos:builder:inner-review -- routes/foo.js services/bar.js
 *   npm run lifeos:builder:inner-review -- --focus "security + drift" -- public/overlay/x.html
 *
 * Requires: PUBLIC_BUILDER_BASE_URL (or BUILDER_BASE_URL / PUBLIC_BASE_URL / LUMIN_SMOKE_BASE_URL)
 *           COMMAND_CENTER_KEY (or LIFEOS_KEY / API_KEY)
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import 'dotenv/config';

const INNER = 'prompts/lifeos-builder-inner-supervisor.md';

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

function parseArgs(argv) {
  let focus = '';
  const positional = [];
  let i = 2;
  while (i < argv.length) {
    if (argv[i] === '--focus' && argv[i + 1]) {
      focus = argv[i + 1];
      i += 2;
      continue;
    }
    positional.push(argv[i]);
    i++;
  }
  return { focus, positional: positional.filter((p) => p && !p.startsWith('--')) };
}

async function main() {
  const { focus, positional } = parseArgs(process.argv);
  const filesRel = positional.length ? positional : [];
  const files = [INNER, ...filesRel];

  if (filesRel.length === 0) {
    console.error(
      'Usage: npm run lifeos:builder:inner-review -- <repo-relative-files...>\nExample: npm run lifeos:builder:inner-review -- routes/lifeos-chat-routes.js'
    );
    process.exit(1);
  }
  if (!key) {
    console.error('Missing COMMAND_CENTER_KEY / LIFEOS_KEY / API_KEY');
    process.exit(2);
  }

  const task =
    `You are the INNER SUPERVISOR for the LifeOS builder platform operating under TSOS discipline. Apply the protocol in prompts/lifeos-builder-inner-supervisor.md. ` +
    `Review the listed implementation files for correctness vs spec, drift from SSOT/domain context, edge cases, and safety. ` +
    (focus ? `Extra focus requested by operator: ${focus}. ` : '');

  const body = JSON.stringify({
    domain: 'lifeos-council-builder',
    mode: 'review',
    model: process.env.INNER_SUPERVISOR_MODEL || undefined,
    useCache: false,
    autonomy_mode: 'normal',
    internet_research: false,
    task,
    files,
  });

  const url = `${base}/api/v1/lifeos/builder/task`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-command-key': key,
    },
    body,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 4000) };
  }
  if (!res.ok || !json?.ok) {
    console.error(JSON.stringify({ ok: false, http: res.status, body: json }, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(json, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
