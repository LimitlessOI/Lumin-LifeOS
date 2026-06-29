#!/usr/bin/env node
/**
 * SYNOPSIS: ARC entry gate — structural + GAP_FLAG validation of a blueprint file.
 * For AI-powered review, use: POST /api/v1/blueprint/intake/:id/arc
 * Usage: node scripts/run-arc-entry-gate.mjs <blueprint-file-path>
 * Exit 0 = structurally valid. Exit 1 = gaps or missing fields.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

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
    console.error('\nResolve gaps: POST /api/v1/blueprint/intake/:id/answer');
    process.exit(1);
  }

  // Required top-level fields
  const missing = ['_meta', 'steps'].filter(k => !blueprint[k]);
  if (missing.length > 0) {
    console.error(`[ARC ENTRY GATE] FAIL — Missing required fields: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Step field validation
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

  // Dependency order validation
  const stepIds = new Set((blueprint.steps || []).map(s => s.id));
  const depErrors = [];
  for (const step of blueprint.steps || []) {
    for (const dep of step.deps || []) {
      if (!stepIds.has(dep)) depErrors.push(`Step ${step.id} depends on unknown step: ${dep}`);
    }
  }
  if (depErrors.length > 0) {
    console.error(`[ARC ENTRY GATE] FAIL — Dependency errors:`);
    depErrors.forEach(e => console.error(`  ${e}`));
    process.exit(1);
  }

  // Protected file check
  const neverTouch = [...(blueprint._meta?.never_touch || []), 'server.js', 'services/word-keeper-transcriber.js', 'services/council-service.js', 'config/council-members.js', 'core/two-tier-system-init.js'];
  const fileConflicts = (blueprint.steps || [])
    .filter(s => s.file && neverTouch.includes(s.file))
    .map(s => `Step ${s.id} writes to protected file: ${s.file}`);
  if (fileConflicts.length > 0) {
    console.error(`[ARC ENTRY GATE] FAIL — Protected file conflicts:`);
    fileConflicts.forEach(e => console.error(`  ${e}`));
    process.exit(1);
  }

  console.log(`\n[ARC ENTRY GATE] PASS`);
  console.log(`  Blueprint: ${blueprintPath}`);
  console.log(`  Product:   ${blueprint._meta?.product || 'unknown'}`);
  console.log(`  Version:   ${blueprint._meta?.blueprint_version || 'unknown'}`);
  console.log(`  Steps:     ${(blueprint.steps || []).length}`);
  console.log(`\n  For AI review: POST /api/v1/blueprint/intake/<session_id>/arc`);
  process.exit(0);
}

main().catch(err => {
  console.error('[ARC ENTRY GATE] Fatal:', err.message);
  process.exit(1);
});
