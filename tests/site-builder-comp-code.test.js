/**
 * SYNOPSIS: Site Builder complimentary publish codes.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import assert from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';
import {
  getPublishCompCodes,
  isValidPublishCompCode,
  normalizePublishCompCode,
} from '../config/site-builder-pricing.js';
import {
  redeemPublishCompCode,
  verifyPublishCheckoutSession,
} from '../services/site-builder-entry-checkout.js';

describe('site-builder complimentary codes', () => {
  const prev = process.env.SITE_BUILDER_FREE_CODES;

  before(() => {
    process.env.SITE_BUILDER_FREE_CODES = 'TALOA-FRIENDS, gift pass ';
  });

  after(() => {
    if (prev === undefined) delete process.env.SITE_BUILDER_FREE_CODES;
    else process.env.SITE_BUILDER_FREE_CODES = prev;
  });

  it('normalizes and lists codes from env', () => {
    assert.equal(normalizePublishCompCode('  taloa friends '), 'TALOA-FRIENDS');
    assert.deepEqual(getPublishCompCodes(), ['TALOA-FRIENDS', 'GIFT-PASS']);
  });

  it('accepts valid codes case-insensitively', () => {
    assert.equal(isValidPublishCompCode('taloa-friends'), true);
    assert.equal(isValidPublishCompCode('GIFT PASS'), true);
    assert.equal(isValidPublishCompCode('NOPE'), false);
    assert.equal(isValidPublishCompCode('ab'), false);
  });

  it('redeems a code and verifies without Stripe', async () => {
    const updates = [];
    const pool = {
      async query(sql, params) {
        updates.push({ sql, params });
        if (String(sql).includes('SELECT status')) {
          return {
            rows: [{
              status: 'converted',
              deal_value: 0,
              metadata: {
                compRedeemSessionId: 'comp_testsession',
                careIncludedMonths: 2,
                careIncludedUntil: '2099-01-01T00:00:00.000Z',
                compCode: 'TALOA-FRIENDS',
              },
            }],
          };
        }
        return { rows: [], rowCount: 1 };
      },
    };

    const redeemed = await redeemPublishCompCode({
      clientId: 'prev_test_client',
      code: 'taloa-friends',
      pool,
      businessName: 'Test Biz',
    });
    assert.equal(redeemed.ok, true);
    assert.equal(redeemed.free, true);
    assert.equal(redeemed.code, 'TALOA-FRIENDS');
    assert.match(redeemed.sessionId, /^comp_/);
    assert.ok(updates.some((u) => String(u.sql).includes("status = 'converted'")));

    const verified = await verifyPublishCheckoutSession({
      sessionId: 'comp_testsession',
      clientId: 'prev_test_client',
      pool,
    });
    assert.equal(verified.ok, true);
    assert.equal(verified.free, true);
    assert.equal(verified.code, 'TALOA-FRIENDS');
  });

  it('rejects unknown codes', async () => {
    const pool = { async query() { return { rows: [] }; } };
    const bad = await redeemPublishCompCode({
      clientId: 'prev_test_client',
      code: 'WRONG',
      pool,
    });
    assert.equal(bad.ok, false);
    assert.match(bad.error, /Invalid or unknown/i);
  });
});