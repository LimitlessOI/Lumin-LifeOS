/**
 * SYNOPSIS: S6 Founder Decoder v0 — unit tests
 * S6 Founder Decoder v0 — unit tests
 *
 * Tests that all four modes produce valid output strings.
 * Does not mock data — reads real or absent data files (graceful on missing).
 * Display-only: no assertions on specific values, only structural correctness.
 *
 * @ssot docs/projects/AMENDMENT_36_ZERO_DRIFT_HANDOFF_PROTOCOL.md
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts/founder-decoder.mjs');

async function runMode(mode) {
  const { stdout } = await execFileAsync(process.execPath, [SCRIPT, mode], { cwd: ROOT, timeout: 10000 });
  return stdout;
}

test('founder-decoder: --calm produces non-empty output', async () => {
  const out = await runMode('--calm');
  assert.ok(out.length > 0, 'calm output must be non-empty');
  assert.ok(out.includes('CALM MODE'), 'calm output must include header');
  assert.ok(out.includes('warn-only') || out.includes('detail') || out.includes('strategic') || out.includes('queue'), 'calm output must include guidance');
});

test('founder-decoder: --strategic produces build sequence', async () => {
  const out = await runMode('--strategic');
  assert.ok(out.includes('STRATEGIC MODE'), 'strategic output must include header');
  assert.ok(out.includes('C21'), 'strategic output must include C21 slice');
  assert.ok(out.includes('S5'), 'strategic output must include S5 slice');
  assert.ok(out.includes('S6'), 'strategic output must include S6 slice');
  assert.ok(out.includes('POSTURE'), 'strategic output must include system posture');
});

test('founder-decoder: --engineer produces daemon section', async () => {
  const out = await runMode('--engineer');
  assert.ok(out.includes('ENGINEER MODE'), 'engineer output must include header');
  assert.ok(out.includes('Daemons'), 'engineer output must include daemons section');
  assert.ok(out.includes('Quarantine'), 'engineer output must include quarantine section');
  assert.ok(out.includes('Prediction loop'), 'engineer output must include prediction section');
});

test('founder-decoder: --crisis produces output with working-state section', async () => {
  const out = await runMode('--crisis');
  assert.ok(out.includes('CRISIS MODE'), 'crisis output must include header');
  // Crisis mode should either list issues or say "No crisis signals"
  assert.ok(out.includes('still working') || out.includes('No crisis'), 'crisis output must include state summary');
});

test('founder-decoder: no-args prints usage', async () => {
  const { stdout } = await execFileAsync(process.execPath, [SCRIPT], { cwd: ROOT, timeout: 5000 });
  assert.ok(stdout.includes('--calm'), 'usage must include --calm');
  assert.ok(stdout.includes('--crisis'), 'usage must include --crisis');
});
