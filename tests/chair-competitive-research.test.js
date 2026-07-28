/**
 * SYNOPSIS: js — tests/chair-competitive-research.test.js.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

import {
  listReviewableProducts,
  pickNextProduct,
  loadCursor,
  saveCursor,
  runCompetitiveResearchCycle,
} from '../services/chair-competitive-research.js';

function makeFixtureProducts(root, ids) {
  for (const id of ids) {
    const dir = path.join(root, 'docs/products', id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'PRODUCT_HOME.md'), `# ${id} Product Home\n\nFixture.\n`);
  }
}

test('listReviewableProducts: finds top-level products with a real PRODUCT_HOME.md', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'competitive-research-'));
  try {
    makeFixtureProducts(root, ['alpha', 'beta']);
    fs.mkdirSync(path.join(root, 'docs/products/no-home'), { recursive: true }); // no PRODUCT_HOME.md
    const ids = listReviewableProducts({ productsDir: path.join(root, 'docs/products') });
    assert.deepEqual(ids, ['alpha', 'beta']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('listReviewableProducts: finds one-level-nested products (e.g. marketingos/socialmediaos)', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'competitive-research-'));
  try {
    const nestedDir = path.join(root, 'docs/products/parent/child');
    fs.mkdirSync(nestedDir, { recursive: true });
    fs.writeFileSync(path.join(nestedDir, 'PRODUCT_HOME.md'), '# Child\n');
    const ids = listReviewableProducts({ productsDir: path.join(root, 'docs/products') });
    assert.deepEqual(ids, ['parent/child']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('pickNextProduct: skips products already reviewed manually or in a prior cycle', () => {
  const all = ['alpha', 'beta', 'gamma'];
  const cursor = { reviewedIds: ['alpha'] };
  const next = pickNextProduct(all, cursor);
  assert.equal(next, 'beta');
});

test('pickNextProduct: wraps around to the start once everything has been covered once', () => {
  const all = ['alpha', 'beta'];
  const cursor = { reviewedIds: ['alpha', 'beta'] };
  const next = pickNextProduct(all, cursor);
  assert.ok(all.includes(next), 'must return a valid product, not null, once the cycle completes');
});

test('pickNextProduct: returns null for an empty product list', () => {
  assert.equal(pickNextProduct([], { reviewedIds: [] }), null);
});

test('loadCursor/saveCursor: round-trips through an isolated cursor path', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cursor-test-'));
  const cursorPath = path.join(root, 'cursor.json');
  try {
    assert.deepEqual(loadCursor(cursorPath), { reviewedIds: [], lastRunAt: null });
    saveCursor({ reviewedIds: ['test-only-entry'], lastRunAt: '2020-01-01T00:00:00.000Z' }, cursorPath);
    const reloaded = loadCursor(cursorPath);
    assert.deepEqual(reloaded.reviewedIds, ['test-only-entry']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('runCompetitiveResearchCycle: no products found is reported honestly, not thrown', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'competitive-research-'));
  try {
    const result = await runCompetitiveResearchCycle({
      productsDir: path.join(root, 'docs/products'),
      cursorPath: path.join(root, 'cursor.json'),
      logger: { warn() {} },
    });
    assert.equal(result.skipped, 'no_products_found');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('runCompetitiveResearchCycle: produces a real finding shaped for Chair review, using an injected search service', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'competitive-research-'));
  try {
    makeFixtureProducts(root, ['test-product-xyz']);
    const fakeService = { searchCompetitors: async () => 'Competitor X does Y well; consider adding Z.' };

    const result = await runCompetitiveResearchCycle({
      productsDir: path.join(root, 'docs/products'),
      cursorPath: path.join(root, 'cursor.json'),
      webSearchService: fakeService,
      logger: { warn() {} },
    });

    assert.equal(result.productId, 'test-product-xyz');
    assert.equal(result.finding.check, 'competitive_gap');
    assert.match(result.finding.proposed_solution, /Competitor X/);
    assert.ok(result.finding.id.startsWith('competitive_gap:test-product-xyz:'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('runCompetitiveResearchCycle: a research call that fails still advances the cursor, does not get stuck', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'competitive-research-'));
  const cursorPath = path.join(root, 'cursor.json');
  try {
    makeFixtureProducts(root, ['test-product-fails']);
    const fakeService = { searchCompetitors: async () => { throw new Error('provider down'); } };

    const result = await runCompetitiveResearchCycle({
      productsDir: path.join(root, 'docs/products'),
      cursorPath,
      webSearchService: fakeService,
      logger: { warn() {} },
    });

    assert.equal(result.finding, null);
    const cursor = loadCursor(cursorPath);
    assert.ok(cursor.reviewedIds.includes('test-product-fails'), 'cursor must advance even on failure, or the sweep gets stuck forever on one bad product');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
