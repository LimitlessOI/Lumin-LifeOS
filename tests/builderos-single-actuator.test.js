/**
 * SYNOPSIS: Single transport actuator lock — any agent must converge here.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPlanFromBlueprintStep, executeCanonicalWorktreeStep } from '../services/builderos-canonical-executor.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ACTUATOR = '/api/v1/lifeos/builder/build';

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('canonical and governed executors dispatch only to the single actuator', () => {
  assert.match(read('services/builderos-canonical-executor.js'), /\/api\/v1\/lifeos\/builder\/build/);
  assert.match(read('services/builderos-governed-loop-executor.js'), /\/api\/v1\/lifeos\/builder\/build/);
});

test('worktree supervisor path remains dry-run only', () => {
  const out = executeCanonicalWorktreeStep({ missionId: 'FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001', dryRun: true });
  assert.equal(out.ok, true);
  assert.equal(out.path, 'worktree_harness');
  assert.match(read('services/builderos-canonical-executor.js'), /--dry-run/);
});

test('self and product targets differ only by target_file in dispatch plan', () => {
  const selfPlan = buildPlanFromBlueprintStep({
    step_id: 'SELF-01',
    target_file: 'services/builderos-canonical-executor.js',
    title: 'self',
  }, 'TEST-MISSION');
  const productPlan = buildPlanFromBlueprintStep({
    step_id: 'PROD-01',
    target_file: 'products/example.js',
    title: 'product',
  }, 'TEST-MISSION');
  assert.notEqual(selfPlan.target_file, productPlan.target_file);
  assert.equal(selfPlan.domain, productPlan.domain);
  assert.equal(selfPlan.mode, productPlan.mode);
});
