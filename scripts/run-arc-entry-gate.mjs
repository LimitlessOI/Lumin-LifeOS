#!/usr/bin/env node
/**
 * SYNOPSIS: ARC entry gate — validate a blueprint file for gaps before execution is allowed.
 * Usage: node scripts/run-arc-entry-gate.mjs <blueprint-file-path>
 * Exit 0 = ready to execute. Exit 1 = gaps found or file invalid.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { createBlueprintIntakeService } from '../services/blueprint-intake.js';

const { Pool } = pg;
const ROOT = path.resolve(import.meta.dirname, '..');

async function main() {
  const blueprintArg = process.argv[2];
  if (!blueprintArg) {
    console.error('Usage: node scripts/run-arc-entry-gate.mjs <path-to-blueprint.json>');
    process.exit(1);
  }

  const blueprintPath = path.resolve(ROOT, blueprintArg);
  if (!fs.existsSync(blueprintPath)) {
    console.error(`Blueprint not found: ${blueprintPath}`);
    process.exit(1);
  }

  let blueprint;
  try {
    blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
  } catch (err) {
    console.error(`Invalid JSON in blueprint: ${err.message}`);
    process.exit(1);
  }

  // Check for GAP_FLAGs in the blueprint
  const text = JSON.stringify(blueprint);
  const gapMatches = [...text.matchAll(/"GAP_FLAG:\s*([^"]+)"/g)];
  if (gapMatches.length > 0) {
    console.error(`\n[ARC ENTRY GATE] FAIL — ${gapMatches.length} unresolved GAP_FLAG(s):\n`);
    gapMatches.forEach((m, i) => console.error(`  ${i + 1}. ${m[1]}`));
    console.error('\nResolve gaps before executing: POST /api/v1/blueprint/intake/:id/answer');
    process.exit(1);
  }

  // Check required top-level fields
  const required = ['_meta', 'steps'];
  const missing = required.filter(k => !blueprint[k]);
  if (missing.length > 0) {
    console.error(`[ARC ENTRY GATE] FAIL — Missing required fields: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Check each step for required fields
  const stepIssues = [];
  for (const step of blueprint.steps || []) {
    if (!step.id) stepIssues.push(`Step missing id`);
    if (!step.file) stepIssues.push(`Step ${step.id || '?'} missing file`);
    if (!step.type) stepIssues.push(`Step ${step.id || '?'} missing type`);
    if (!step.ssot_tag) stepIssues.push(`Step ${step.id || '?'} missing ssot_tag`);
    if (!step.deps) stepIssues.push(`Step ${step.id || '?'} missing deps array`);
  }

  if (stepIssues.length > 0) {
    console.error(`[ARC ENTRY GATE] FAIL — Step validation errors:`);
    stepIssues.forEach(i => console.error(`  - ${i}`));
    process.exit(1);
  }

  // Optional: run AI-powered ARC review if DB available
  if (process.env.DATABASE_URL && !process.argv.includes('--no-ai')) {
    try {
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      let callCouncilMember;
      try {
        const mod = await import('../services/council-service.js');
        callCouncilMember = mod.callCouncilMember;
      } catch {
        console.log('[ARC] council-service not available — skipping AI review');
      }

      if (callCouncilMember) {
        const svc = createBlueprintIntakeService(pool, callCouncilMember);
        // Create a temporary session for the ARC review
        const { rows } = await pool.query(
          `INSERT INTO blueprint_intake_sessions (product_name, flow_type, status, blueprint_json)
           VALUES ($1, 'backfill', 'arc_review', $2) RETURNING id`,
          [blueprint._meta?.product || 'unknown', JSON.stringify(blueprint)]
        );
        const sessionId = rows[0].id;
        const result = await svc.runArcReview(sessionId);

        console.log('\n[ARC ENTRY GATE] AI Review complete:');
        console.log(`  Critical: ${result.arcReport.total_critical}`);
        console.log(`  Moderate: ${result.arcReport.total_moderate}`);
        console.log(`  Minor:    ${result.arcReport.total_minor}`);
        console.log(`  Ready:    ${result.arcReport.ready_to_execute}`);

        // Clean up temp session
        await pool.query('DELETE FROM blueprint_intake_sessions WHERE id = $1', [sessionId]);
        await pool.end();

        if (!result.arcReport.ready_to_execute) {
          console.error('\n[ARC ENTRY GATE] FAIL — AI review found critical issues');
          result.arcReport.critical?.forEach(c => console.error(`  CRITICAL [${c.step_id}]: ${c.issue}`));
          process.exit(1);
        }
      }
    } catch (err) {
      console.warn(`[ARC] AI review skipped: ${err.message}`);
    }
  }

  console.log(`\n[ARC ENTRY GATE] PASS`);
  console.log(`  Blueprint: ${blueprintPath}`);
  console.log(`  Product: ${blueprint._meta?.product || 'unknown'}`);
  console.log(`  Steps: ${(blueprint.steps || []).length}`);
  console.log(`  Version: ${blueprint._meta?.blueprint_version || 'unknown'}`);
  process.exit(0);
}

main().catch(err => {
  console.error('[ARC ENTRY GATE] Fatal:', err.message);
  process.exit(1);
});
