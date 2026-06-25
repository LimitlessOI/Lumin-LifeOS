#!/usr/bin/env node
/**
 * SYNOPSIS: CLI tool for Blueprint Intake — backfill any existing amendment into a blueprint.
 * Usage: node scripts/run-blueprint-intake.mjs --amendment docs/projects/AMENDMENT_41_MARKETINGOS.md
 *        node scripts/run-blueprint-intake.mjs --list
 *        node scripts/run-blueprint-intake.mjs --session <id> --arc
 *        node scripts/run-blueprint-intake.mjs --session <id> --answer gap_1 "the answer"
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */

import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

async function main() {
  const args = process.argv.slice(2);
  const amendmentArg = args[args.indexOf('--amendment') + 1];
  const listMode = args.includes('--list');
  const sessionArg = args[args.indexOf('--session') + 1];
  const arcMode = args.includes('--arc');
  const answerMode = args.includes('--answer');
  const answerGapId = answerMode ? args[args.indexOf('--answer') + 1] : null;
  const answerText = answerMode ? args[args.indexOf('--answer') + 2] : null;
  const productArg = args[args.indexOf('--product') + 1];

  if (!amendmentArg && !listMode && !sessionArg) {
    console.log(`
Blueprint Intake CLI
────────────────────
Backfill an existing amendment:
  node scripts/run-blueprint-intake.mjs --amendment docs/projects/AMENDMENT_41_MARKETINGOS.md --product "SocialMediaOS"

List all intake sessions:
  node scripts/run-blueprint-intake.mjs --list

Check a session status:
  node scripts/run-blueprint-intake.mjs --session <id>

Run ARC review on a session:
  node scripts/run-blueprint-intake.mjs --session <id> --arc

Answer a gap:
  node scripts/run-blueprint-intake.mjs --session <id> --answer gap_1 "The answer is..."
`);
    process.exit(0);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  let callCouncilMember;
  try {
    const mod = await import('../services/council-service.js');
    callCouncilMember = mod.callCouncilMember;
  } catch (err) {
    console.error('council-service not available:', err.message);
    process.exit(1);
  }

  const { createBlueprintIntakeService } = await import('../services/blueprint-intake.js');
  const svc = createBlueprintIntakeService(pool, callCouncilMember);

  try {
    if (listMode) {
      const sessions = await svc.listSessions({});
      if (sessions.length === 0) {
        console.log('No intake sessions found.');
      } else {
        console.log(`\nBlueprint Intake Sessions (${sessions.length}):`);
        console.log('─'.repeat(80));
        for (const s of sessions) {
          console.log(`  ${s.id}`);
          console.log(`    Product:  ${s.product_name}`);
          console.log(`    Flow:     ${s.flow_type}`);
          console.log(`    Status:   ${s.status}`);
          console.log(`    Amendment:${s.amendment_file || '(none)'}`);
          console.log(`    Updated:  ${s.updated_at}`);
          console.log();
        }
      }
      process.exit(0);
    }

    if (sessionArg && arcMode) {
      console.log(`\nRunning ARC review on session ${sessionArg}...`);
      const result = await svc.runArcReview(sessionArg);
      console.log(`\nARC Report:`);
      console.log(`  Status:   ${result.status}`);
      console.log(`  Ready:    ${result.arcReport.ready_to_execute}`);
      console.log(`  Critical: ${result.arcReport.total_critical}`);
      console.log(`  Moderate: ${result.arcReport.total_moderate}`);
      console.log(`  Minor:    ${result.arcReport.total_minor}`);
      if (result.arcReport.critical?.length) {
        console.log('\nCritical Issues:');
        result.arcReport.critical.forEach(c => console.log(`  [${c.step_id}] ${c.issue}`));
      }
      if (result.arcReport.ready_to_execute) {
        const session = await svc.getSession(sessionArg);
        console.log(`\nBlueprint written to: ${session.blueprint_file}`);
        console.log('Ready to execute via: npm run builderos:bp-priority:never-stop');
      }
      process.exit(result.arcReport.ready_to_execute ? 0 : 1);
    }

    if (sessionArg && answerMode) {
      if (!answerGapId || !answerText) {
        console.error('Usage: --session <id> --answer <gap_id> "<answer text>"');
        process.exit(1);
      }
      console.log(`Answering gap ${answerGapId} on session ${sessionArg}...`);
      const result = await svc.answerGap({ sessionId: sessionArg, gapId: answerGapId, answer: answerText });
      console.log(`  Resolved: ${result.resolved}`);
      console.log(`  All resolved: ${result.allResolved}`);
      console.log(`  Remaining: ${result.remainingGaps}`);
      if (result.allResolved) {
        console.log('\nAll gaps resolved. Run --arc to validate and write blueprint.');
      }
      process.exit(0);
    }

    if (sessionArg) {
      const session = await svc.getSession(sessionArg);
      if (!session) {
        console.error(`Session not found: ${sessionArg}`);
        process.exit(1);
      }
      const gaps = session.gaps_json || [];
      console.log(`\nSession: ${session.id}`);
      console.log(`  Product: ${session.product_name}`);
      console.log(`  Flow:    ${session.flow_type}`);
      console.log(`  Status:  ${session.status}`);
      console.log(`  Gaps:    ${gaps.length} total, ${gaps.filter(g => !g.resolved).length} open`);
      if (gaps.filter(g => !g.resolved).length > 0) {
        console.log('\nOpen gaps:');
        gaps.filter(g => !g.resolved).forEach(g => {
          console.log(`  ${g.id}: ${g.description}`);
          console.log(`    Fix: node scripts/run-blueprint-intake.mjs --session ${session.id} --answer ${g.id} "your answer"`);
        });
      }
      process.exit(0);
    }

    if (amendmentArg) {
      const product = productArg || amendmentArg.split('/').pop().replace(/^AMENDMENT_\d+_/, '').replace('.md', '');
      console.log(`\nStarting blueprint intake...`);
      console.log(`  Amendment: ${amendmentArg}`);
      console.log(`  Product:   ${product}`);
      console.log(`  Scanning codebase patterns...`);
      console.log(`  Extracting product intent...`);
      console.log(`  Generating blueprint...\n`);

      const result = await svc.startBackfill({ amendmentFile: amendmentArg, productName: product });

      console.log(`Session ID: ${result.sessionId}`);
      console.log(`Status:     ${result.status}`);
      console.log(`Gaps found: ${result.gapCount}`);

      if (result.gapCount > 0) {
        console.log('\nOpen gaps (need your input):');
        result.gaps.forEach(g => {
          console.log(`  ${g.id}: ${g.description}`);
        });
        console.log(`\nAnswer gaps:`);
        result.gaps.forEach(g => {
          console.log(`  node scripts/run-blueprint-intake.mjs --session ${result.sessionId} --answer ${g.id} "your answer"`);
        });
        console.log(`\nOr use the API:`);
        console.log(`  POST /api/v1/blueprint/intake/${result.sessionId}/gap-chat`);
        console.log(`  POST /api/v1/blueprint/intake/${result.sessionId}/answer`);
      } else {
        console.log('\nNo gaps. Running ARC review...');
        const arc = await svc.runArcReview(result.sessionId);
        console.log(`ARC: ${arc.arcReport.ready_to_execute ? 'PASS — ready to execute' : 'FAIL — critical issues found'}`);
        if (!arc.arcReport.ready_to_execute) {
          arc.arcReport.critical?.forEach(c => console.log(`  CRITICAL [${c.step_id}]: ${c.issue}`));
        } else {
          const session = await svc.getSession(result.sessionId);
          console.log(`Blueprint: ${session.blueprint_file}`);
        }
      }

      process.exit(result.gapCount === 0 ? 0 : 1);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
