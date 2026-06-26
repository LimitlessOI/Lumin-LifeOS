#!/usr/bin/env node
/**
 * SYNOPSIS: Full ARC pipeline — entry gate → AI review → write blueprint → signal executor.
 * Usage: node scripts/run-arc-pipeline.mjs <blueprint-file-path> [--execute]
 * --execute: legacy mission trigger only — for intake blueprints use:
 *   npm run blueprint:intake:execute -- --session <uuid>
 *   or: node scripts/run-blueprint-intake.mjs --session <uuid> --execute
 * Exit 0 = passed and (optionally) executed. Exit 1 = failed.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */

import { execSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const ROOT = path.resolve(import.meta.dirname, '..');
const blueprintArg = process.argv[2];
const shouldExecute = process.argv.includes('--execute');

if (!blueprintArg) {
  console.error('Usage: node scripts/run-arc-pipeline.mjs <blueprint-file-path> [--execute]');
  process.exit(1);
}

const blueprintPath = path.resolve(ROOT, blueprintArg);
if (!fs.existsSync(blueprintPath)) {
  console.error(`Blueprint not found: ${blueprintPath}`);
  process.exit(1);
}

console.log(`\n[ARC PIPELINE] Starting`);
console.log(`  Blueprint: ${blueprintPath}`);
console.log(`  Execute:   ${shouldExecute}`);

// Step 1: Entry gate (structural + GAP_FLAG check)
console.log('\n[ARC PIPELINE] Step 1: Entry gate...');
const gate = spawnSync(
  'node',
  ['scripts/run-arc-entry-gate.mjs', blueprintArg],
  { cwd: ROOT, stdio: 'inherit' }
);

if (gate.status !== 0) {
  console.error('\n[ARC PIPELINE] FAIL — Entry gate blocked execution');
  process.exit(1);
}

console.log('\n[ARC PIPELINE] Step 1 PASS');

// Step 2: Load and report blueprint summary
const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
const steps = blueprint.steps || [];
const stepsByType = steps.reduce((acc, s) => {
  acc[s.type] = (acc[s.type] || 0) + 1;
  return acc;
}, {});

console.log('\n[ARC PIPELINE] Step 2: Blueprint summary');
console.log(`  Product: ${blueprint._meta?.product || 'unknown'}`);
console.log(`  Version: ${blueprint._meta?.blueprint_version || 'unknown'}`);
console.log(`  Steps:   ${steps.length} total`);
for (const [type, count] of Object.entries(stepsByType)) {
  console.log(`           ${count}x ${type}`);
}

// Step 3: Dependency order validation
console.log('\n[ARC PIPELINE] Step 3: Dependency order check...');
const stepIds = new Set(steps.map(s => s.id));
const depErrors = [];
for (const step of steps) {
  for (const dep of (step.deps || [])) {
    if (!stepIds.has(dep)) {
      depErrors.push(`Step ${step.id} depends on unknown step: ${dep}`);
    }
  }
}
if (depErrors.length > 0) {
  console.error('\n[ARC PIPELINE] FAIL — Dependency errors:');
  depErrors.forEach(e => console.error(`  ${e}`));
  process.exit(1);
}
console.log('[ARC PIPELINE] Step 3 PASS');

// Step 4: File conflict check — ensure no step writes to a protected file
console.log('\n[ARC PIPELINE] Step 4: Protected file check...');
const protectedFiles = ['server.js', 'services/word-keeper-transcriber.js', 'services/council-service.js', 'config/council-members.js', 'core/two-tier-system-init.js'];
const neverTouch = blueprint._meta?.never_touch || [];
const allProtected = [...new Set([...protectedFiles, ...neverTouch])];
const fileConflicts = steps
  .filter(s => s.file && allProtected.includes(s.file))
  .map(s => `Step ${s.id} writes to protected file: ${s.file}`);
if (fileConflicts.length > 0) {
  console.error('\n[ARC PIPELINE] FAIL — Protected file conflicts:');
  fileConflicts.forEach(e => console.error(`  ${e}`));
  process.exit(1);
}
console.log('[ARC PIPELINE] Step 4 PASS');

// Step 5: Optional execution
if (shouldExecute) {
  console.log('\n[ARC PIPELINE] Step 5: Triggering legacy /builder/run (mission path — not intake)...');
  console.warn('[ARC PIPELINE] For intake sessions use: npm run blueprint:intake:execute -- --session <uuid>');
  const apiBase = process.env.API_BASE_URL || 'http://localhost:3001';
  const commandKey = process.env.COMMAND_CENTER_KEY || process.env.X_COMMAND_KEY;
  if (!commandKey) {
    console.error('[ARC PIPELINE] FAIL — COMMAND_CENTER_KEY or X_COMMAND_KEY required for --execute');
    process.exit(1);
  }

  try {
    const response = await fetch(`${apiBase}/api/v1/builder/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-command-key': commandKey,
      },
      body: JSON.stringify({ blueprint_file: blueprintArg }),
    });
    const data = await response.json();
    if (!response.ok) {
      console.error(`[ARC PIPELINE] Execute failed: ${data.error || response.statusText}`);
      process.exit(1);
    }
    console.log(`[ARC PIPELINE] Execute queued: ${JSON.stringify(data)}`);
  } catch (err) {
    console.error(`[ARC PIPELINE] Execute request failed: ${err.message}`);
    process.exit(1);
  }
}

console.log('\n[ARC PIPELINE] PASS — Blueprint is ready to execute');
if (!shouldExecute) {
  console.log(`  Run with: node scripts/run-arc-pipeline.mjs ${blueprintArg} --execute`);
}
process.exit(0);
