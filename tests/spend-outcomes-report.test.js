/**
 * SYNOPSIS: Unit tests for S00 spend→outcomes report helpers.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createBuilderOSControlPlaneService } from '../services/builderos-control-plane-service.js';

function mockPool(handlers) {
  return {
    query: async (text, params) => {
      for (const h of handlers) {
        if (h.match(text)) return h.run(text, params);
      }
      return { rows: [] };
    },
  };
}

test('getSpendOutcomesReport returns founder_line and outcomes from joined ledger', async () => {
  const pool = mockPool([
    {
      match: (t) => t.includes('FROM token_usage_log WHERE logged_at'),
      run: async () => ({ rows: [{ spend: 12.5, tokens: 90000 }] }),
    },
    {
      match: (t) => t.includes('FROM build_task_ledger b'),
      run: async () => ({
        rows: [
          {
            task_id: 't1',
            blueprint_id: 'bp-a',
            product_lane: 'lifeos',
            status: 'done',
            duration_ms: 120000,
            files_changed: ['services/foo.js'],
            proof_status: 'complete',
            start_time: new Date().toISOString(),
            end_time: new Date().toISOString(),
            token_receipt_id: 99,
            unmetered_exception_id: null,
            metadata: { commit_sha: 'abc1234' },
            receipt_cost_usd: 4.2,
            input_tokens: 1000,
            output_tokens: 500,
            model: 'claude',
            provider: 'anthropic',
          },
          {
            task_id: 't2',
            blueprint_id: null,
            product_lane: 'lifeos',
            status: 'failed',
            duration_ms: 30000,
            files_changed: null,
            proof_status: 'partial',
            start_time: new Date().toISOString(),
            end_time: new Date().toISOString(),
            token_receipt_id: null,
            unmetered_exception_id: null,
            metadata: {},
            receipt_cost_usd: null,
            input_tokens: 0,
            output_tokens: 0,
            model: null,
            provider: null,
          },
        ],
      }),
    },
    {
      match: (t) => t.includes('AVG(b.duration_ms)'),
      run: async () => ({ rows: [{ shipped: 1, spend: 4.2, avg_ms: 120000 }] }),
    },
  ]);

  const cp = createBuilderOSControlPlaneService({ pool });
  const report = await cp.getSpendOutcomesReport({ sinceHours: 24 });
  assert.equal(report.ok, true);
  assert.equal(report.shipped, 1);
  assert.equal(report.failed, 1);
  assert.equal(report.linked_builds, 1);
  assert.ok(report.founder_line.includes('$'));
  assert.ok(report.founder_line.includes('shipped'));
  assert.equal(report.outcomes[0].commit_sha, 'abc1234');
  assert.equal(report.outcomes[0].files_changed[0], 'services/foo.js');
});

test('estimateBuilds returns confidence from sample size', async () => {
  const pool = mockPool([
    {
      match: (t) => t.includes('PERCENTILE_CONT') || t.includes('AVG(b.duration_ms)'),
      run: async () => ({ rows: [{ n: 5, avg_ms: 60000, avg_cost: 1.25, p50_ms: 55000 }] }),
    },
  ]);
  const cp = createBuilderOSControlPlaneService({ pool });
  const est = await cp.estimateBuilds({
    items: [{ label: 'lifeos patch', product_lane: 'lifeos' }],
  });
  assert.equal(est.ok, true);
  assert.equal(est.estimates[0].sample_size, 5);
  assert.equal(est.estimates[0].confidence, 'medium');
  assert.equal(est.estimates[0].estimated_duration_ms, 55000);
  assert.ok(est.founder_line.includes('min'));
});

test('getLinkageStats marks gap when linkage_rate under 50%', async () => {
  const pool = mockPool([
    {
      match: (t) => t.includes('token_receipt_id IS NOT NULL'),
      run: async () => ({ rows: [{ sample: 10, linked: 2 }] }),
    },
  ]);
  const cp = createBuilderOSControlPlaneService({ pool });
  const stats = await cp.getLinkageStats({ sinceHours: 24, limit: 10 });
  assert.equal(stats.sample, 10);
  assert.equal(stats.linked, 2);
  assert.equal(stats.linkage_rate, 0.2);
  assert.equal(stats.linkage_gap, true);
});