#!/usr/bin/env node
/**
 * SYNOPSIS: Non-stop Objective 1 runner — blueprint exists → build → acceptance until PASS or UNSOLVED.
 * Non-stop Objective 1 runner — blueprint exists → build → acceptance until PASS or UNSOLVED.
 * @ssot builderos-reboot/MISSIONS/PRODUCT-CONVERSATION-COMMITMENTS-C2-0001/FOUNDER_PACKET.md
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSION = 'PRODUCT-CONVERSATION-COMMITMENTS-C2-0001';
const MISSION_DIR = path.join(ROOT, 'builderos-reboot/MISSIONS', MISSION);
const LOG = path.join(MISSION_DIR, 'OBJECTIVE_1_RUN_LOG.jsonl');
const UNSOLVED = path.join(MISSION_DIR, 'UNSOLVED_RECEIPT.json');
const MAX_CYCLES = Number(process.env.OBJECTIVE1_MAX_CYCLES || 48);
const SLEEP_MS = Number(process.env.OBJECTIVE1_CYCLE_SLEEP_MS || 120000);

function log(event, detail = {}) {
  const row = JSON.stringify({ ts: new Date().toISOString(), event, ...detail }) + '\n';
  fs.appendFileSync(LOG, row);
  console.log(`[objective-1] ${event}`, detail.message || detail.error || '');
}

function run(cmd, args = [], opts = {}) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', ...opts });
  return { status: r.status ?? 1, stdout: r.stdout || '', stderr: r.stderr || '' };
}

async function builderBuild(body) {
  const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const key = process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || '';
  if (!base || !key) return { ok: false, error: 'missing PUBLIC_BASE_URL or COMMAND_CENTER_KEY' };
  const r = await fetch(`${base}/api/v1/lifeos/builder/build`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-command-key': key },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 500) }; }
  return { ok: r.ok, status: r.status, body: json };
}

function writeUnsolved(reason, evidence) {
  fs.writeFileSync(UNSOLVED, `${JSON.stringify({
    schema: 'unsolved_receipt_v1',
    mission_id: MISSION,
    generated_at: new Date().toISOString(),
    reason,
    evidence,
  }, null, 2)}\n`);
}

function blueprintReady() {
  return fs.existsSync(path.join(MISSION_DIR, 'BLUEPRINT.json'));
}

async function deployIfNeeded() {
  const base = (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const key = process.env.COMMAND_CENTER_KEY || '';
  if (!base || !key) return;
  const local = run('git', ['rev-parse', 'HEAD']).stdout.trim().slice(0, 12);
  const ready = await fetch(`${base}/api/v1/lifeos/builder/ready`, { headers: { 'x-command-key': key } }).then((x) => x.json()).catch(() => ({}));
  const live = ready?.codegen?.deploy_commit_sha?.slice(0, 12);
  if (local && live && local.startsWith(live.slice(0, 7))) return;
  log('deploy_trigger', { local, live });
  await fetch(`${base}/api/v1/railway/managed-env/build-from-latest`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-command-key': key },
    body: '{}',
  }).catch(() => null);
}

for (let cycle = 1; cycle <= MAX_CYCLES; cycle++) {
  log('cycle_start', { cycle, max: MAX_CYCLES });

  if (!blueprintReady()) {
    log('halt', { message: 'BLUEPRINT.json missing — cannot proceed' });
    writeUnsolved('blueprint_missing', { cycle });
    process.exit(2);
  }

  const acceptance = run('npm', ['run', 'lifeos:conversation-commitments:v1-acceptance']);
  if (acceptance.status === 0) {
    log('OBJECTIVE_COMPLETE', { cycle });
    process.exit(0);
  }

  log('acceptance_fail', { cycle, tail: (acceptance.stdout + acceptance.stderr).slice(-400) });

  await deployIfNeeded();

  const builds = [
    {
      domain: 'lifeos',
      task: 'Add evidence fields to extractCommitments and heuristic fallback',
      spec: 'Return source_quote, confidence, extraction_method per item. Store JSON evidence in source_ref on log. Heuristic fallback when AI empty.',
      target_file: 'services/commitment-tracker.js',
      commit_message: '[system-build] CCV1 evidence extraction',
    },
    {
      domain: 'lifeos',
      task: 'Add POST /commitments/from-conversation batch save with evidence',
      spec: 'Body: user, text, save=true. Extract then log each with evidence bundle in source_ref. Extend extract response with evidence fields.',
      target_file: 'routes/lifeos-core-routes.js',
      commit_message: '[system-build] CCV1 conversation routes',
    },
    {
      domain: 'lifeos',
      task: 'Conversation commitments v1 UI',
      spec: 'Single page: paste textarea, Extract button, preview list with source quote, Save selected, list open commitments, Done/Defer/Broken buttons. Use lifeos-bootstrap API helpers. File lifeos-commitments-v1.html',
      target_file: 'public/overlay/lifeos-commitments-v1.html',
      commit_message: '[system-build] CCV1 commitments UI',
    },
  ];

  for (const b of builds) {
    const res = await builderBuild(b);
    log('builder_build', { target: b.target_file, status: res.status, committed: res.body?.committed });
    if (!res.ok) log('builder_build_error', { target: b.target_file, error: res.body?.error || res.body });
  }

  run('git', ['pull', '--rebase', 'origin', 'main']);
  await new Promise((r) => setTimeout(r, SLEEP_MS));
}

writeUnsolved('max_cycles_exhausted', { cycles: MAX_CYCLES });
process.exit(1);
