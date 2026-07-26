/**
 * SYNOPSIS: Site Builder Stripe checkout product/client binding (money-path).
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assertPaidCheckoutBinding } from '../services/site-builder-entry-checkout.js';

function session(overrides = {}) {
  return {
    id: 'cs_test_1',
    mode: 'payment',
    payment_status: 'paid',
    status: 'complete',
    amount_total: 4500,
    metadata: {
      product: 'site-builder-publish',
      clientId: 'prev_victim',
      careIncludedMonths: '2',
    },
    ...overrides,
    metadata: {
      product: 'site-builder-publish',
      clientId: 'prev_victim',
      careIncludedMonths: '2',
      ...(overrides.metadata || {}),
    },
  };
}

describe('assertPaidCheckoutBinding — publish', () => {
  it('accepts a paid publish session bound to the same clientId', () => {
    const result = assertPaidCheckoutBinding(session(), {
      clientId: 'prev_victim',
      expectedProduct: 'site-builder-publish',
    });
    assert.equal(result.ok, true);
  });

  it('rejects a $1 upsell session used as publish proof', () => {
    const result = assertPaidCheckoutBinding(
      session({
        amount_total: 100,
        metadata: {
          product: 'site-builder-upsell',
          kind: 'template-additional',
          clientId: 'prev_victim',
        },
      }),
      { clientId: 'prev_victim', expectedProduct: 'site-builder-publish' },
    );
    assert.equal(result.ok, false);
    assert.match(result.error, /not for this product/i);
  });

  it('rejects when clientId metadata is missing (no silent bind)', () => {
    const result = assertPaidCheckoutBinding(
      session({ metadata: { product: 'site-builder-publish', clientId: '' } }),
      { clientId: 'prev_victim', expectedProduct: 'site-builder-publish' },
    );
    assert.equal(result.ok, false);
    assert.match(result.error, /does not match this preview/i);
  });

  it('rejects clientId mismatch', () => {
    const result = assertPaidCheckoutBinding(session(), {
      clientId: 'prev_other',
      expectedProduct: 'site-builder-publish',
    });
    assert.equal(result.ok, false);
    assert.match(result.error, /does not match this preview/i);
  });

  it('rejects unpaid sessions even if status is complete', () => {
    const result = assertPaidCheckoutBinding(
      session({ payment_status: 'unpaid', status: 'complete' }),
      { clientId: 'prev_victim', expectedProduct: 'site-builder-publish' },
    );
    assert.equal(result.ok, false);
    assert.match(result.error, /Payment not completed/i);
  });

  it('rejects subscription-mode sessions', () => {
    const result = assertPaidCheckoutBinding(
      session({ mode: 'subscription' }),
      { clientId: 'prev_victim', expectedProduct: 'site-builder-publish' },
    );
    assert.equal(result.ok, false);
    assert.match(result.error, /not a one-time payment/i);
  });
});

describe('assertPaidCheckoutBinding — upsell', () => {
  it('requires site-builder-upsell product and kind when provided', () => {
    const ok = assertPaidCheckoutBinding(
      session({
        amount_total: 100,
        metadata: {
          product: 'site-builder-upsell',
          kind: 'template-additional',
          clientId: 'prev_victim',
        },
      }),
      {
        clientId: 'prev_victim',
        expectedProduct: 'site-builder-upsell',
        expectedKind: 'template-additional',
      },
    );
    assert.equal(ok.ok, true);

    const badKind = assertPaidCheckoutBinding(
      session({
        amount_total: 100,
        metadata: {
          product: 'site-builder-upsell',
          kind: 'color-custom',
          clientId: 'prev_victim',
        },
      }),
      {
        clientId: 'prev_victim',
        expectedProduct: 'site-builder-upsell',
        expectedKind: 'template-additional',
      },
    );
    assert.equal(badKind.ok, false);
    assert.match(badKind.error, /requested upsell/i);
  });

  it('rejects a publish session used as upsell proof', () => {
    const result = assertPaidCheckoutBinding(session(), {
      clientId: 'prev_victim',
      expectedProduct: 'site-builder-upsell',
      expectedKind: 'template-additional',
    });
    assert.equal(result.ok, false);
    assert.match(result.error, /not for this product/i);
  });
});
