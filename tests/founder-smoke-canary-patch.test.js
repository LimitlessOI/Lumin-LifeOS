/**
 * SYNOPSIS: Mechanical smoke-canary mjs comment patch for drawer E2E.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  applySmokeCanaryMjsCommentPatch,
  isSmokeCanaryMjsCommentPatch,
  parseSmokeCanaryMjsCommentPatch,
} from '../services/founder-overlay-surgical-patch.js';

function testDetectsCanary() {
  const task = 'do: in scripts/lifeos-direct-build-smoke-test.mjs set "// ui-e2e-build-proof: 2026-07-10T12:00:00.000Z"';
  assert.equal(isSmokeCanaryMjsCommentPatch(task), true);
  assert.equal(isSmokeCanaryMjsCommentPatch('change something else'), false);
  const spec = parseSmokeCanaryMjsCommentPatch(task);
  assert.equal(spec.targetFile, 'scripts/lifeos-direct-build-smoke-test.mjs');
  assert.equal(spec.comment, '// ui-e2e-build-proof: 2026-07-10T12:00:00.000Z');
}

function testReplacesExistingMarker() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'smoke-canary-'));
  const rel = 'scripts/lifeos-direct-build-smoke-test.mjs';
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, '/* header */\n// ui-e2e-build-proof: OLD\nconst x = 1;\n');
  const task = 'do: in scripts/lifeos-direct-build-smoke-test.mjs set "// ui-e2e-build-proof: NEW" near the top';
  const result = applySmokeCanaryMjsCommentPatch({ root, task });
  assert.equal(result.ok, true);
  assert.match(result.files[0].output, /\/\/ ui-e2e-build-proof: NEW/);
  assert.doesNotMatch(result.files[0].output, /OLD/);
}

testDetectsCanary();
testReplacesExistingMarker();
console.log('founder-smoke-canary-patch: PASS');
