/**
 * SYNOPSIS: Cognitive Core Era-8 unit tests — Compound Me (fake-pool).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCognitiveCoreCompound } from '../services/cognitive-core-compound.js';

function fakeCompoundPool({ domains = [], consumers = [] } = {}) {
  const state = {
    consumers: [...consumers],
    calls: [],
    log: [],
    proposals: [],
    syncs: [],
    reviews: [],
    debt: [],
    packages: [],
  };
  return {
    state,
    async query(sql, params) {
      if (/FROM judgment_trust_by_domain/.test(sql)) {
        return { rows: domains };
      }
      if (/COUNT\(d\.decision_id\)|FROM judgment_decisions|FROM judgment_outcomes|FROM judgment_predictions|FROM judgment_programs|FROM cognitive_debt_items|FROM delegation_scopes/.test(sql)) {
        return { rows: [] };
      }
      if (/INSERT INTO cognitive_product_consumers/.test(sql)) {
        const row = {
          consumer_id: `c-${params[0]}`,
          product_id: params[0],
          label: params[1],
          domains: JSON.parse(params[2]),
          can_act_enabled: true,
          status: 'active',
        };
        const existing = state.consumers.find((c) => c.product_id === row.product_id);
        if (existing) Object.assign(existing, row);
        else state.consumers.push(row);
        return { rows: [row] };
      }
      if (/FROM cognitive_product_consumers WHERE product_id/.test(sql)) {
        return { rows: state.consumers.filter((c) => c.product_id === params[0] && c.status === 'active') };
      }
      if (/FROM cognitive_product_consumers/.test(sql)) {
        return { rows: state.consumers.filter((c) => c.status === 'active') };
      }
      if (/INSERT INTO cognitive_can_act_calls/.test(sql)) {
        const row = {
          call_id: 'call-1',
          user_id: params[0],
          product_id: params[1],
          domain: params[2],
          stakes: params[3],
          can_act: params[4],
          action: params[5],
        };
        state.calls.push(row);
        return { rows: [row] };
      }
      if (/INSERT INTO cognitive_compound_log/.test(sql)) {
        const row = {
          entry_id: `log-${state.log.length + 1}`,
          user_id: params[0],
          event_kind: params[1],
          summary: params[2],
        };
        state.log.push(row);
        return { rows: [row] };
      }
      if (/FROM cognitive_compound_log/.test(sql)) {
        return { rows: state.log.filter((l) => l.user_id === params[0]) };
      }
      if (/INSERT INTO judgment_improvement_proposals/.test(sql)) {
        return { rows: [] };
      }
      if (/FROM judgment_improvement_proposals/.test(sql)) {
        return { rows: state.proposals };
      }
      if (/SELECT \* FROM judgment_packages WHERE package_id/.test(sql)) {
        return { rows: state.packages.filter((p) => p.package_id === params[0]) };
      }
      if (/INSERT INTO judgment_role_syncs/.test(sql)) {
        const row = {
          sync_id: 'sync-1',
          user_id: params[0],
          package_id: params[1],
          role_label: params[2],
          direction: params[3],
          status: 'recorded',
        };
        state.syncs.push(row);
        return { rows: [row] };
      }
      if (/INSERT INTO autonomy_ladder_reviews/.test(sql)) {
        const row = {
          review_id: `rev-${state.reviews.length + 1}`,
          user_id: params[0],
          domain: params[1],
          current_tier: params[2],
          suggested_tier: params[3],
          direction: params[4],
          rationale: params[5],
          status: 'suggested',
        };
        state.reviews.push(row);
        return { rows: [row] };
      }
      if (/FROM autonomy_ladder_reviews/.test(sql)) {
        return { rows: state.reviews.filter((r) => r.user_id === params[0]) };
      }
      if (/UPDATE autonomy_ladder_reviews/.test(sql)) {
        const row = state.reviews.find((r) => r.review_id === params[0]);
        if (row) row.status = params[1];
        return { rows: row ? [row] : [] };
      }
      if (/INSERT INTO cognitive_debt_items/.test(sql)) {
        return { rows: [] };
      }
      return { rows: [] };
    },
  };
}

test('registerDefaultConsumers seeds product bridge', async () => {
  const pool = fakeCompoundPool();
  const c = createCognitiveCoreCompound({ pool });
  const out = await c.registerDefaultConsumers();
  assert.equal(out.ok, true);
  assert.ok(out.consumers.some((x) => x.product_id === 'site-builder'));
  assert.ok(out.consumers.some((x) => x.product_id === 'lifeos'));
});

test('canActForProduct refuses unknown product', async () => {
  const c = createCognitiveCoreCompound({ pool: fakeCompoundPool() });
  const out = await c.canActForProduct({
    userId: '1',
    productId: 'nope',
    domain: 'shipping',
  });
  assert.equal(out.ok, false);
  assert.equal(out.error, 'unknown_product');
});

test('canActForProduct logs refuse when evidence thin (Law 2)', async () => {
  const pool = fakeCompoundPool({
    consumers: [{
      product_id: 'site-builder',
      label: 'Site Builder',
      domains: ['shipping'],
      can_act_enabled: true,
      status: 'active',
    }],
    domains: [],
  });
  const c = createCognitiveCoreCompound({ pool });
  const out = await c.canActForProduct({
    userId: '1',
    productId: 'site-builder',
    domain: 'shipping',
    stakes: 'low',
  });
  assert.equal(out.ok, true);
  assert.equal(out.can_act, false);
  assert.ok(pool.state.calls.length >= 1);
  assert.ok(pool.state.log.some((l) => l.event_kind === 'can_act_call'));
});

test('reviewAutonomyLadder demotes when n<5 on elevated tier', async () => {
  const pool = fakeCompoundPool({
    domains: [
      { domain: 'ops', n: 2, accuracy: 0.5, brier_score: 0.3, delegation_tier: 'suggest' },
    ],
  });
  // getScoreboard needs more than softQuery — journal.getScoreboard queries trust table
  // Our fake returns domains for that SELECT *
  const c = createCognitiveCoreCompound({ pool });
  const out = await c.reviewAutonomyLadder('1');
  assert.equal(out.ok, true);
  assert.ok(out.reviews.length >= 1);
  assert.equal(out.reviews[0].direction, 'demote');
  assert.equal(out.reviews[0].suggested_tier, 'refuse');
});

test('syncRolePackage requires sealed package when id given', async () => {
  const pool = fakeCompoundPool({
    packages: [{ package_id: 'p1', status: 'draft', label: 'x' }],
  });
  const c = createCognitiveCoreCompound({ pool });
  const out = await c.syncRolePackage({
    userId: '1',
    packageId: 'p1',
    roleLabel: 'chair',
  });
  assert.equal(out.ok, false);
  assert.equal(out.error, 'sealed_package_required');
});
