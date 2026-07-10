// SYNOPSIS: Unit tests for Creative Engine estimate, gates, and storage path safety
// @ssot docs/products/creative-engine/PRODUCT_HOME.md

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createCreativeEngine } from '../services/creative-engine/index.js';
import { createMediaStorage } from '../services/creative-engine/media-storage.js';
import { estimateGenerativeBrollCost, runGenerativeBroll } from '../services/creative-engine/modes/generative-broll.js';

test('estimate footage_edit and photo_polish are ungated local modes', () => {
  const engine = createCreativeEngine({ pool: null, logger: { info() {}, warn() {}, error() {} } });
  const f = engine.estimate({ mode: 'footage_edit' });
  const p = engine.estimate({ mode: 'photo_polish' });
  assert.equal(f.ok, true);
  assert.equal(f.gated, false);
  assert.equal(p.ok, true);
  assert.equal(p.costEstimateCents, 0);
});

test('script_compose estimate reports replicate requirement', () => {
  const engine = createCreativeEngine({ pool: null, logger: { info() {}, warn() {}, error() {} } });
  const e = engine.estimate({ mode: 'script_compose', sceneCount: 3 });
  assert.equal(e.ok, true);
  assert.ok(e.requirements.includes('REPLICATE_API_TOKEN'));
});

test('generative_broll is gated scaffold', async () => {
  const est = estimateGenerativeBrollCost(2);
  assert.equal(est.sceneCount, 2);
  assert.ok(est.cents > 0);
  const result = await runGenerativeBroll({ job: { request: { sceneCount: 2 } }, logger: { info() {} } });
  assert.equal(result.ok, false);
  assert.equal(result.gated, true);
  assert.equal(result.error, 'GENERATIVE_BROLL_NOT_ENABLED_V1');
});

test('media storage rejects path traversal', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ce-store-'));
  const storage = createMediaStorage({ baseDir: dir, publicBaseUrl: 'http://localhost' });
  await storage.ensureDirs();
  assert.throws(() => storage.getLocalPath('../outside.txt'), /path_traversal_rejected/);
  const saved = await storage.saveUpload(Buffer.from('hi'), { ownerId: 't', filename: 'a.txt' });
  assert.ok(saved.key.startsWith('uploads/'));
});
