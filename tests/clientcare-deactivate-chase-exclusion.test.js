/**
 * SYNOPSIS: Prove deactivateClaim removes claims from forever-chase inventory.
 * @ssot docs/products/clientcare-billing-recovery/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createClientCareBillingService } from '../services/clientcare-billing-service.js';

test('getForeverChaseQueue SQL excludes do_not_bill and metadata.deactivated=true', async () => {
  const queries = [];
  const pool = {
    async query(sql) {
      queries.push(String(sql));
      if (/COUNT\(\*\)::int AS total_open/i.test(sql)) {
        return {
          rows: [{ total_open: 0, unpaid: 0, underpaid: 0, forever_chase_bucket: 0 }],
        };
      }
      return { rows: [] };
    },
  };

  const svc = createClientCareBillingService({ pool, logger: { info() {}, warn() {}, error() {} } });
  await svc.getForeverChaseQueue({ limit: 10 });

  const listSql = queries.find((q) => /SELECT\s*\n?\s*id,\s*tenant_id/i.test(q) || /SELECT\s+id,\s*tenant_id/i.test(q));
  assert.ok(listSql, 'expected forever-chase list query');
  assert.match(listSql, /do_not_bill/);
  assert.match(listSql, /deactivated/);
  assert.match(listSql, /NOT IN\s*\(\s*'resolved',\s*'do_not_bill'\s*\)/i);
});

test('deactivateClaim stamps do_not_bill + deactivated metadata (reversible, never DELETE)', async () => {
  const updates = [];
  const pool = {
    async query(sql, params) {
      if (/SELECT .* FROM clientcare_claims WHERE id/i.test(sql) || /FROM clientcare_claims\s+WHERE id/i.test(sql)) {
        return {
          rows: [{
            id: 117,
            rescue_bucket: 'forever_chase',
            metadata: {},
            patient_name: 'Justean Labelle',
            paid_amount: 0,
          }],
        };
      }
      if (/UPDATE clientcare_claims/i.test(sql)) {
        updates.push({ sql: String(sql), params });
        return {
          rows: [{
            id: 117,
            rescue_bucket: 'do_not_bill',
            metadata: {
              deactivated: true,
              deactivated_reason: 'cash-pay client wrongly billed',
            },
            patient_name: 'Justean Labelle',
            paid_amount: 0,
          }],
        };
      }
      return { rows: [] };
    },
  };

  const svc = createClientCareBillingService({ pool, logger: { info() {}, warn() {}, error() {} } });
  const result = await svc.deactivateClaim(117, {
    reason: 'cash-pay client wrongly billed',
    requestedBy: 'operator',
  });

  assert.ok(result);
  assert.equal(updates.length, 1);
  assert.match(updates[0].sql, /rescue_bucket='do_not_bill'/);
  assert.equal(updates[0].params[0], 117);
  const meta = JSON.parse(updates[0].params[1]);
  assert.equal(meta.deactivated, true);
  assert.match(meta.deactivated_reason, /cash-pay/);
});
