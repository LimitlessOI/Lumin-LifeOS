#!/usr/bin/env node
/**
 * Trigger gate-change + multi-model AI Council on the **deployed** server.
 *
 * **Preferred (preset):** one POST to `/api/v1/lifeos/gate-change/run-preset` — the
 * **system** runs `callCouncilMember` with **Railway’s** provider keys (not your laptop’s).
 * You only need `COMMAND_CENTER_KEY` (and correct `PUBLIC_BASE_URL`), same as any API call.
 *
 * Custom proposals still use: POST /proposals + POST /proposals/:id/run-council.
 * **List presets (local, no HTTP):** `node scripts/council-gate-change-run.mjs --list-presets`
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import 'dotenv/config';
import { readFile } from 'fs/promises';
import { GATE_CHANGE_PRESETS } from '../config/gate-change-presets.js';

const base = (process.env.PUBLIC_BASE_URL
  || process.env.GATE_CHANGE_BASE_URL
  || process.env.LUMIN_SMOKE_BASE_URL
  || 'http://127.0.0.1:3000').replace(/\/$/, '');
const key =
  process.env.COMMAND_CENTER_KEY ||
  process.env.COMMAND_KEY ||
  process.env.LIFEOS_KEY ||
  process.env.API_KEY ||
  '';
const headers = {
  'content-type': 'application/json',
  'x-command-key': key,
};

function parseArgs() {
  const a = process.argv.slice(2);
  const o = { preset: null, title: null, pain: null, file: null, models: null, listPresets: false };
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--list-presets' || a[i] === '--list') o.listPresets = true;
    else if (a[i] === '--preset' && a[i + 1]) o.preset = a[++i];
    else if (a[i] === '--title' && a[i + 1]) o.title = a[++i];
    else if (a[i] === '--pain' && a[i + 1]) o.pain = a[++i];
    else if (a[i] === '--file' && a[i + 1]) o.file = a[++i];
    else if (a[i] === '--models' && a[i + 1]) o.models = a[++i].split(',').map((s) => s.trim()).filter(Boolean);
  }
  return o;
}

async function main() {
  const args = parseArgs();
  if (args.listPresets) {
    console.log('Gate-change presets (use: npm run lifeos:gate-change-run -- --preset <key>):\n');
    for (const [k, p] of Object.entries(GATE_CHANGE_PRESETS)) {
      console.log(`  ${k}`);
      console.log(`    ${p.title}\n`);
    }
    return;
  }

  if (!key) {
    console.error('Missing COMMAND_CENTER_KEY (or COMMAND_KEY).');
    process.exit(2);
  }

  if (args.preset) {
    if (!GATE_CHANGE_PRESETS[args.preset]) {
      console.error('Unknown --preset. Run: npm run lifeos:gate-change-run -- --list-presets');
      process.exit(2);
    }
    const runPresetUrl = `${base}/api/v1/lifeos/gate-change/run-preset`;
    const body = { preset: args.preset };
    if (args.models?.length) body.models = args.models;
    console.log('POST /gate-change/run-preset (council runs on server with deploy env keys)...\n');
    const rr = await fetch(runPresetUrl, { method: 'POST', headers, body: JSON.stringify(body) });
    const rtext = await rr.text();
    let rjson;
    try {
      rjson = JSON.parse(rtext);
    } catch {
      console.error('Non-JSON', rr.status, rtext.slice(0, 1000));
      process.exit(1);
    }
    console.log(JSON.stringify(rjson, null, 2));
    if (!rr.ok || !rjson.ok) process.exit(1);
    if (rjson.proposal?.id) {
      console.log(
        '\nOK — GET',
        `${base}/api/v1/lifeos/gate-change/proposals/${rjson.proposal.id}`,
      );
    }
    return;
  }

  const title = args.title || 'Gate-change proposal (CLI)';
  let pain = args.pain;
  if (args.file) {
    pain = await readFile(args.file, 'utf8');
  }
  if (!pain || !String(pain).trim()) {
    console.error('Use --preset <name> for server-side run, --list-presets to list names, or --title and --pain "..." or --file path');
    process.exit(2);
  }
  const createBody = {
    title,
    pain_summary: String(pain).slice(0, 8000),
    hypothesis_label: 'THINK',
    created_by: 'scripts/council-gate-change-run.mjs',
  };
  const createUrl = `${base}/api/v1/lifeos/gate-change/proposals`;
  const cr = await fetch(createUrl, { method: 'POST', headers, body: JSON.stringify(createBody) });
  const ctext = await cr.text();
  let cjson;
  try {
    cjson = JSON.parse(ctext);
  } catch {
    console.error('Create proposal failed', cr.status, ctext.slice(0, 800));
    process.exit(1);
  }
  if (!cr.ok || !cjson.ok) {
    console.error('Create proposal', cr.status, cjson);
    process.exit(1);
  }
  const id = cjson.proposal?.id;
  if (!id) {
    console.error('No proposal id', cjson);
    process.exit(1);
  }
  const runUrl = `${base}/api/v1/lifeos/gate-change/proposals/${id}/run-council`;
  const runBody = args.models ? { models: args.models } : {};
  const rr = await fetch(runUrl, { method: 'POST', headers, body: JSON.stringify(runBody) });
  const rtext = await rr.text();
  let rjson;
  try {
    rjson = JSON.parse(rtext);
  } catch {
    console.error('run-council non-JSON', rr.status, rtext.slice(0, 1200));
    process.exit(1);
  }
  console.log(JSON.stringify(rjson, null, 2));
  if (!rr.ok || !rjson.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
