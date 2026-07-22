/**
 * SYNOPSIS: Regression coverage for terminal ClientCare claim deactivation.
 * @ssot docs/products/clientcare-billing-recovery/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createClientCareBillingService,
  isClaimBillingExcluded,
} from '../services/clientcare-billing-service.js';

function deactivatedClaim(overrides = {}) {
  return {
    id: 117,
    tenant_id: null,
    external_claim_id: 'birth:cash-pay-client',
    patient_name: 'Cash Pay Client',
    paid_amount: 0,
    rescue_bucket: 'do_not_bill',
    metadata: {
      deactivated: true,
      forever_chase: false,
      pregnancy_id: '11111111-1111-1111-1111-111111111111',
    },
    ...overrides,
  };
}

test('terminal claim helper rejects bucket and metadata deactivation', () => {
  assert.equal(isClaimBillingExcluded(deactivatedClaim()), true);
  assert.equal(isClaimBillingExcluded({ rescue_bucket: 'forever_chase', metadata: { deactivated: 'true' } }), true);
  assert.equal(isClaimBillingExcluded({ rescue_bucket: 'resolved', metadata: {} }), true);
  assert.equal(isClaimBillingExcluded({ rescue_bucket: 'forever_chase', metadata: {} }), false);
});

test('forever-chase SQL excludes deactivated claims and due-work applies a second guard', async () => {
  const queries = [];
  const row = deactivatedClaim({ metadata: { deactivated: true, forever_chase: true } });
  const pool = {
    async query(sql) {
      queries.push(sql);
      if (sql.includes('COUNT(*)::int AS total_open')) {
        return { rows: [{ total_open: 1, unpaid: 1, underpaid: 0, forever_chase_bucket: 0 }] };
      }
      if (sql.includes('SELECT\n         id, tenant_id, patient_name')) return { rows: [row] };
      if (sql.includes('clientcare_payer_rule_overrides')) return { rows: [] };
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
  const service = createClientCareBillingService({ pool });

  await service.getForeverChaseQueue();
  const queueSql = queries.filter((sql) => sql.includes('FROM clientcare_claims') && sql.includes('total_open'))
    .concat(queries.filter((sql) => sql.includes('SELECT\n         id, tenant_id, patient_name')));
  assert.equal(queueSql.length, 2);
  for (const sql of queueSql) {
    assert.match(sql, /NOT IN \('resolved', 'do_not_bill'\)/);
    assert.match(sql, /metadata->>'deactivated'.*<> 'true'/s);
  }

  const due = await service.getDueChaseWork({ mode: 'all', dueOnly: false });
  assert.deepEqual(due.items, []);
});

test('deactivate clears chase metadata and pending claim actions', async () => {
  let row = deactivatedClaim({
    rescue_bucket: 'forever_chase',
    metadata: {
      forever_chase: true,
      billable_now: true,
      next_due_at: '2026-07-22T12:00:00.000Z',
      stage_worker: 'file_claim',
    },
  });
  let actionsCleared = false;
  const pool = {
    async query(sql, params = []) {
      if (sql.includes('SELECT * FROM clientcare_claims WHERE id=')) return { rows: [row] };
      if (sql.includes("SET rescue_bucket='do_not_bill'")) {
        row = {
          ...row,
          rescue_bucket: 'do_not_bill',
          metadata: { ...row.metadata, ...JSON.parse(params[1]) },
        };
        return { rows: [row] };
      }
      if (sql.includes("DELETE FROM clientcare_claim_actions WHERE claim_id=$1 AND status='open'")) {
        actionsCleared = true;
        return { rows: [] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
  const service = createClientCareBillingService({ pool });

  const result = await service.deactivateClaim(117, {
    reason: 'cash-pay client',
    requestedBy: 'operator',
  });

  assert.equal(result.rescue_bucket, 'do_not_bill');
  assert.equal(result.metadata.deactivated, true);
  assert.equal(result.metadata.forever_chase, false);
  assert.equal(result.metadata.billable_now, false);
  assert.equal(result.metadata.next_due_at, null);
  assert.equal(result.metadata.stage_worker, null);
  assert.equal(actionsCleared, true);
});

test('re-import preserves a prior deactivation and does not recreate stage work', async () => {
  const existing = deactivatedClaim();
  let upsertSql = '';
  let actionsCleared = false;
  const pool = {
    async query(sql) {
      if (sql.includes('clientcare_payer_rule_overrides')) return { rows: [] };
      if (sql.includes('INSERT INTO clientcare_claims')) {
        upsertSql = sql;
        return { rows: [existing] };
      }
      if (sql.includes("DELETE FROM clientcare_claim_actions WHERE claim_id=$1 AND status='open'")) {
        actionsCleared = true;
        return { rows: [] };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
  const service = createClientCareBillingService({ pool });

  const result = await service.upsertClaim({
    external_claim_id: existing.external_claim_id,
    patient_name: existing.patient_name,
    paid_amount: 0,
    billed_amount: 4900,
    metadata: { forever_chase: true },
  });

  assert.equal(result.excluded, true);
  assert.equal(result.claim.rescue_bucket, 'do_not_bill');
  assert.equal(result.stage, null);
  assert.equal(actionsCleared, true);
  assert.match(upsertSql, /clientcare_claims\.rescue_bucket = 'do_not_bill'/);
  assert.match(upsertSql, /COALESCE\(clientcare_claims\.metadata->>'deactivated', 'false'\) = 'true'/);
  assert.match(upsertSql, /COALESCE\(EXCLUDED\.metadata, '\{\}'::jsonb\) \|\| COALESCE\(clientcare_claims\.metadata, '\{\}'::jsonb\)/);
});

test('pregnancy and claim guards fail closed for deactivated rows', async () => {
  const row = deactivatedClaim();
  const pool = {
    async query(sql) {
      if (sql.includes('SELECT * FROM clientcare_claims WHERE id=')) return { rows: [row] };
      if (sql.includes('SELECT rescue_bucket, metadata')) return { rows: [row] };
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };
  const service = createClientCareBillingService({ pool });

  assert.equal(await service.claimAllowsBilling(row.id), false);
  assert.equal(await service.pregnancyAllowsBilling(row.metadata.pregnancy_id), false);
});
