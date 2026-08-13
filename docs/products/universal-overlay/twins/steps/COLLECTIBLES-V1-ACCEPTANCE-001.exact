/**
 * SYNOPSIS: Collectibles V1 foundation reachability acceptance.
 * @ssot docs/products/collectibles/PRODUCT_HOME.md
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCategoryAdapterRegistry } from '../services/collectibles/category-adapter.js';
import { createCollectibleTwin } from '../services/collectibles/twin-service.js';
import { createMtgCategoryAdapter } from '../services/collectibles/adapters/mtg-adapter.js';

test('registry + twin + mtg adapter export', () => {
  const registry = createCategoryAdapterRegistry();
  assert.equal(typeof registry.register, 'function');
  const twin = createCollectibleTwin({ display_name: 'test', representation_level: 1 });
  assert.equal(typeof twin.id, 'string');
  assert.equal(typeof createMtgCategoryAdapter, 'function');
  assert.equal(createMtgCategoryAdapter().identify('__CATEGORY_ID_TEST_STRING__'), 'mtg');
});

test('routes/collectibles-routes.js calls createCollectibleTwin (reachability)', () => {
  const src = readFileSync(new URL('../routes/collectibles-routes.js', import.meta.url), 'utf8');
  assert.match(src, /createCollectibleTwin/);
  assert.match(src, /registerCollectiblesRoutes/);
  assert.match(src, /createMtgCategoryAdapter/);
});
