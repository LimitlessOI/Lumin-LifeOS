/**
 * SYNOPSIS: never-stop skips product-level SENTRY UI verify on non-UI BUILD_QUEUE targets.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isNonUiBuildQueueTarget } from '../services/never-stop-product-factory.js';

describe('isNonUiBuildQueueTarget', () => {
  it('skips migrations and sql', () => {
    assert.equal(isNonUiBuildQueueTarget('db/migrations/20260421_lifeos_phase3_schema.sql'), true);
    assert.equal(isNonUiBuildQueueTarget('scripts/foo.sql'), true);
  });

  it('skips services/routes/middleware/startup/config', () => {
    assert.equal(isNonUiBuildQueueTarget('services/lifeos-habits.js'), true);
    assert.equal(isNonUiBuildQueueTarget('routes/lifeos-phase3-routes.js'), true);
    assert.equal(isNonUiBuildQueueTarget('middleware/auth.js'), true);
    assert.equal(isNonUiBuildQueueTarget('startup/boot-domains.js'), true);
    assert.equal(isNonUiBuildQueueTarget('config/auto-registered-product-modules.json'), true);
    assert.equal(isNonUiBuildQueueTarget('config/foo.js'), true);
  });

  it('does NOT skip public UI surfaces', () => {
    assert.equal(isNonUiBuildQueueTarget('public/overlay/lifeos-habits.html'), false);
    assert.equal(isNonUiBuildQueueTarget('public/overlay/lifeos-app.html'), false);
  });
});
