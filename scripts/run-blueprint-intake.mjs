#!/usr/bin/env node
/**
 * SYNOPSIS: CLI tool for Blueprint Intake — backfill any existing amendment into a blueprint via Railway API.
 * Reads amendment files locally then sends content to the live server, so no amendment files
 * need to be in the Railway Docker image.
 *
 * Usage:
 *   node scripts/run-blueprint-intake.mjs --amendment docs/projects/AMENDMENT_41_MARKETINGOS.md
 *   node scripts/run-blueprint-intake.mjs --list
 *   node scripts/run-blueprint-intake.mjs --session <id>
 *   node scripts/run-blueprint-intake.mjs --session <id> --arc
 *   node scripts/run-blueprint-intake.mjs --session <id> --answer gap_1 "the answer"
 *
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BASE_URL = (process.env.API_BASE_URL || 'https://robust-magic-production.up.railway.app').replace(/\/$/, '');
const KEY = process.env.COMMAND_CENTER_KEY;

if (!KEY) {
  console.error('COMMAND_CENTER_KEY not set — add it to .env');
  process.exit(1);
}

const HEADERS = { 'Content-Type': 'application/json', 'x-command-center-key': KEY };

async function api(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(120_000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${data.error || JSON.stringify(data)}`);
  return data;
}

function readAmendmentLocal(amendmentArg) {
  const candidates = [
    amendmentArg,
    path.join(ROOT, amendmentArg),
    path.join(ROOT, 'docs/projects', amendmentArg),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return { text: fs.readFileSync(p, 'utf8'), resolvedPath: p };
  }
  throw new Error(`Amendment not found locally: ${amendmentArg}`);
}

async function main() {
  const args = process.argv.slice(2);
  const amendmentArg = args[args.indexOf('--amendment') + 1];
  const listMode = args.includes('--list');
  const sessionIdx = args.indexOf('--session');
  const sessionArg = sessionIdx !== -1 ? args[sessionIdx + 1] : null;
  const arcMode = args.includes('--arc');
  const answerMode = args.includes('--answer');
  const answerGapId = answerMode ? args[args.indexOf('--answer') + 1] : null;
  const answerText = answerMode ? args[args.indexOf('--answer') + 2] : null;
  const productArg = args[args.indexOf('--product') + 1];
  const statusFilter = args[args.indexOf('--status') + 1];

  if (!amendmentArg && !listMode && !sessionArg) {
    console.log(`
Blueprint Intake CLI
────────────────────
Backfill an existing amendment:
  node scripts/run-blueprint-intake.mjs --amendment docs/projects/AMENDMENT_41_MARKETINGOS.md

Backfill with explicit product name:
  node scripts/run-blueprint-intake.mjs --amendment docs/projects/AMENDMENT_41_MARKETINGOS.md --product "SocialMediaOS"

List all intake sessions:
  node scripts/run-blueprint-intake.mjs --list

Filter by status:
  node scripts/run-blueprint-intake.mjs --list --status gap_collection

Check a session:
  node scripts/run-blueprint-intake.mjs --session <id>

Run ARC review:
  node scripts/run-blueprint-intake.mjs --session <id> --arc

Answer a gap:
  node scripts/run-blueprint-intake.mjs --session <id> --answer gap_1 "The answer is..."

Server: ${BASE_URL}
`);
    process.exit(0);
  }

  try {
    if (listMode) {
      const url = statusFilter ? `/api/v1/blueprint/intake?status=${statusFilter}` : '/api/v1/blueprint/intake';
      const data = await api('GET', url);
      if (data.count === 0) {
        console.log('No intake sessions found.');
      } else {
        console.log(`\nBlueprint Intake Sessions (${data.count}):`);
        console.log('─'.repeat(80));
        for (const s of data.sessions) {
          const badge = s.status === 'ready' ? '✅' : s.status === 'gap_collection' ? '⚠️ ' : s.status === 'failed' ? '❌' : '🔄';
          console.log(`  ${badge} ${s.id}`);
          console.log(`      Product:  ${s.product_name}`);
          console.log(`      Flow:     ${s.flow_type}`);
          console.log(`      Status:   ${s.status}`);
          console.log(`      Updated:  ${new Date(s.updated_at).toLocaleString()}`);
          console.log();
        }
      }
      return;
    }

    if (sessionArg && arcMode) {
      console.log(`\nRunning ARC review on session ${sessionArg}...`);
      const data = await api('POST', `/api/v1/blueprint/intake/${sessionArg}/arc`);
      const r = data.arc_report;
      console.log(`\nARC Report:`);
      console.log(`  Status:   ${data.status}`);
      console.log(`  Ready:    ${data.ready_to_execute}`);
      console.log(`  Critical: ${r?.total_critical ?? 0}`);
      console.log(`  Moderate: ${r?.total_moderate ?? 0}`);
      console.log(`  Minor:    ${r?.total_minor ?? 0}`);
      if (r?.critical?.length) {
        console.log('\nCritical Issues:');
        r.critical.forEach(c => console.log(`  [${c.step_id}] ${c.issue}`));
      }
      if (data.ready_to_execute) console.log('\nReady: POST /api/v1/builder/run to execute blueprint.');
      process.exit(data.ready_to_execute ? 0 : 1);
    }

    if (sessionArg && answerMode) {
      if (!answerGapId || !answerText) {
        console.error('Usage: --session <id> --answer <gap_id> "<answer text>"');
        process.exit(1);
      }
      const data = await api('POST', `/api/v1/blueprint/intake/${sessionArg}/answer`, {
        gap_id: answerGapId,
        answer: answerText,
      });
      console.log(`  Resolved: ${data.resolved}`);
      console.log(`  All resolved: ${data.all_resolved}`);
      console.log(`  Remaining: ${data.remaining_gaps}`);
      if (data.all_resolved) {
        console.log('\nAll gaps resolved. Run --arc to validate:');
        console.log(`  node scripts/run-blueprint-intake.mjs --session ${sessionArg} --arc`);
      }
      return;
    }

    if (sessionArg) {
      const data = await api('GET', `/api/v1/blueprint/intake/${sessionArg}`);
      const s = data.session;
      const gaps = s.gaps_json || [];
      const open = gaps.filter(g => !g.resolved);
      console.log(`\nSession: ${s.id}`);
      console.log(`  Product: ${s.product_name}`);
      console.log(`  Flow:    ${s.flow_type}`);
      console.log(`  Status:  ${s.status}`);
      console.log(`  Gaps:    ${gaps.length} total, ${open.length} open`);
      if (open.length > 0) {
        console.log('\nOpen gaps:');
        open.forEach(g => {
          console.log(`  ${g.id}: ${g.description}`);
          console.log(`    → node scripts/run-blueprint-intake.mjs --session ${s.id} --answer ${g.id} "your answer"`);
        });
      }
      return;
    }

    if (amendmentArg) {
      const product = productArg || amendmentArg.split('/').pop().replace(/^AMENDMENT_\d+_/, '').replace('.md', '');
      console.log(`\nStarting blueprint intake:`);
      console.log(`  Amendment: ${amendmentArg}`);
      console.log(`  Product:   ${product}`);
      console.log(`  Server:    ${BASE_URL}`);

      // Read amendment locally — file not available on Railway
      let amendmentText;
      try {
        const { text, resolvedPath } = readAmendmentLocal(amendmentArg);
        amendmentText = text;
        console.log(`  File:      ${resolvedPath} (${Math.round(text.length / 1024)}KB)`);
      } catch (err) {
        console.error(`\n${err.message}`);
        process.exit(1);
      }

      console.log(`  Step 1/3: Scanning codebase patterns... (on server)`);
      console.log(`  Step 2/3: Extracting product intent via ARC...`);
      console.log(`  Step 3/3: Generating blueprint...\n`);

      const result = await api('POST', '/api/v1/blueprint/intake/backfill', {
        product_name: product,
        amendment_file: amendmentArg,
        amendment_text: amendmentText,
      });

      console.log(`Session ID: ${result.session_id}`);
      console.log(`Status:     ${result.status}`);
      console.log(`Gaps found: ${result.gap_count}`);

      if (result.gap_count > 0) {
        console.log('\nOpen gaps (need your input):');
        result.gaps.forEach(g => console.log(`  ${g.id}: ${g.description}`));
        console.log('\nAnswer each gap:');
        result.gaps.forEach(g => {
          console.log(`  node scripts/run-blueprint-intake.mjs --session ${result.session_id} --answer ${g.id} "your answer"`);
        });
        process.exit(1);
      } else {
        console.log('\nNo gaps. Running ARC review...');
        const arc = await api('POST', `/api/v1/blueprint/intake/${result.session_id}/arc`);
        if (arc.ready_to_execute) {
          console.log('ARC: PASS — blueprint ready to execute');
        } else {
          console.log(`ARC: FAIL — ${arc.arc_report?.total_critical || 0} critical issues`);
          arc.arc_report?.critical?.forEach(c => console.log(`  CRITICAL [${c.step_id}]: ${c.issue}`));
          process.exit(1);
        }
      }
    }
  } catch (err) {
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  }
}

main();
