/**
 * SYNOPSIS: js — tests/builderos-intake-regression-harness.test.js.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const modPath = path.join(process.cwd(), 'services', 'builderos-intake-regression-harness.js');
const {
  loadIntakeRegressionHarness,
  resolveHarnessAcceptanceCmd,
} = await import(pathToFileURL(modPath).href);

test('loadIntakeRegressionHarness loads golden SocialMediaOS session', () => {
  const loaded = loadIntakeRegressionHarness();
  assert.equal(loaded.ok, true);
  assert.ok(loaded.sessions.length >= 1);
  const golden = loaded.sessions.find((s) => s.id === 'socialmediaos-p1-golden');
  assert.ok(golden);
  assert.equal(golden.session_id, '3e6105c4-f5e9-4037-bb57-5451acc2ea59');
  assert.match(golden.acceptance_cmd, /verify-socialmediaos\.mjs/);
});

test('resolveHarnessAcceptanceCmd prefers entry over blueprint meta', () => {
  const cmd = resolveHarnessAcceptanceCmd(
    { acceptance_cmd: 'node scripts/verify-socialmediaos.mjs' },
    { _meta: { acceptance_cmd: 'node other.mjs' } },
  );
  assert.equal(cmd, 'node scripts/verify-socialmediaos.mjs');
});
