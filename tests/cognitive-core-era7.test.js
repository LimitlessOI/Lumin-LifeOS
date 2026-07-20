/**
 * SYNOPSIS: Cognitive Core Era-7 unit tests — Calibrate Me (fake-pool).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCognitiveCoreCalibrate } from '../services/cognitive-core-calibrate.js';

function fakeCalibratePool({ domains = [] } = {}) {
  const state = { heuristics: [], snapshots: [], transfers: [], triggers: [], rituals: [], trees: [] };
  return {
    state,
    async query(sql, params) {
      if (/FROM judgment_trust_by_domain/.test(sql)) {
        return { rows: domains };
      }
      if (/COUNT\(d\.decision_id\)|FROM judgment_decisions|FROM judgment_outcomes|FROM judgment_predictions|FROM judgment_programs|FROM cognitive_debt/.test(sql)) {
        return { rows: [] };
      }
      if (/INSERT INTO decision_heuristics/.test(sql) && /ON CONFLICT/.test(sql) && params.length >= 6) {
        const row = {
          heuristic_id: `h-${params[1]}`,
          user_id: params[0],
          name: params[1],
          rule: params[2],
          status: 'active',
          confidence: 0.55,
        };
        if (!state.heuristics.find((h) => h.name === row.name)) {
          state.heuristics.push(row);
          return { rows: [row] };
        }
        return { rows: [] };
      }
      if (/INSERT INTO decision_heuristics/.test(sql)) {
        const row = {
          heuristic_id: 'h-new',
          user_id: params[0],
          name: params[1],
          rule: params[2],
          confidence: params[6],
          status: 'active',
        };
        state.heuristics.push(row);
        return { rows: [row] };
      }
      if (/FROM decision_heuristics/.test(sql)) {
        return { rows: state.heuristics.filter((h) => h.user_id === params[0]) };
      }
      if (/UPDATE decision_heuristics/.test(sql)) {
        const row = state.heuristics.find((h) => h.heuristic_id === params[0]);
        if (!row) return { rows: [] };
        row.activation_count = (row.activation_count || 0) + 1;
        return { rows: [row] };
      }
      if (/INSERT INTO calibration_snapshots/.test(sql)) {
        state.snapshots.push({ domain: params[1] });
        return { rows: [{}] };
      }
      if (/INSERT INTO trust_transfer_proposals/.test(sql)) {
        const row = {
          transfer_id: 'tr-1',
          user_id: params[0],
          from_domain: params[1],
          to_domain: params[2],
          proposed_tier: params[3],
          status: 'proposed',
        };
        state.transfers.push(row);
        return { rows: [row] };
      }
      if (/FROM trust_transfer_proposals/.test(sql) && /SELECT \*/.test(sql)) {
        return { rows: state.transfers.filter((t) => t.user_id === params[0]) };
      }
      if (/INSERT INTO consequence_trees/.test(sql)) {
        const row = {
          tree_id: 'tree-auto',
          user_id: params[0],
          question: params[2],
          depth: params[3],
          nodes: JSON.parse(params[4]),
          confidence: params[5],
        };
        state.trees.push(row);
        return { rows: [row] };
      }
      if (/INSERT INTO high_stakes_tree_triggers/.test(sql)) {
        const row = {
          trigger_id: 'trig-1',
          user_id: params[0],
          question: params[2],
          stakes: params[3],
          tree_id: params[4],
          auto_fired: true,
        };
        state.triggers.push(row);
        return { rows: [row] };
      }
      if (/INSERT INTO recalibration_rituals/.test(sql)) {
        const row = {
          ritual_id: 'rit-1',
          user_id: params[0],
          findings: JSON.parse(params[3]),
          adjustments: JSON.parse(params[4]),
          status: 'completed',
        };
        state.rituals.push(row);
        return { rows: [row] };
      }
      return { rows: [] };
    },
  };
}

test('seedHeuristics inserts core compression rules', async () => {
  const pool = fakeCalibratePool();
  const cal = createCognitiveCoreCalibrate({ pool, callAI: async () => '' });
  const out = await cal.seedHeuristics('1');
  assert.equal(out.ok, true);
  assert.ok(out.created_n >= 5);
  assert.ok(out.created.some((h) => h.name === 'earn_before_act'));
});

test('createHeuristic requires name+rule', async () => {
  const cal = createCognitiveCoreCalibrate({ pool: fakeCalibratePool() });
  await assert.rejects(() => cal.createHeuristic({ userId: '1', name: 'x' }), /name_and_rule/);
});

test('maybeAutoTree skips low stakes', async () => {
  const cal = createCognitiveCoreCalibrate({
    pool: fakeCalibratePool(),
    callAI: async () => '',
  });
  const out = await cal.maybeAutoTree({
    userId: '1',
    question: 'Ship now?',
    stakes: 'low',
  });
  assert.equal(out.ok, true);
  assert.equal(out.skipped, true);
});

test('maybeAutoTree fires on high stakes', async () => {
  const cal = createCognitiveCoreCalibrate({
    pool: fakeCalibratePool(),
    callAI: async () => { throw new Error('no ai'); },
  });
  const out = await cal.maybeAutoTree({
    userId: '1',
    question: 'Acquire a company?',
    stakes: 'high',
  });
  assert.equal(out.ok, true);
  assert.equal(out.trigger.auto_fired, true);
  assert.ok(out.tree?.nodes?.length >= 5);
});

test('proposeTrustTransfers from strong→weak domains', async () => {
  const pool = fakeCalibratePool({
    domains: [
      { domain: 'shipping', n: 12, accuracy: 0.9, brier_score: 0.1, delegation_tier: 'suggest' },
      { domain: 'billing', n: 2, accuracy: 0.4, brier_score: 0.4, delegation_tier: 'refuse' },
    ],
  });
  const cal = createCognitiveCoreCalibrate({ pool, callAI: async () => '' });
  // getScoreboard path uses journal — soft empty for dashboard; transfers use softQuery domains
  const out = await cal.proposeTrustTransfers('1');
  assert.equal(out.ok, true);
  assert.ok(out.proposals.length >= 1);
  assert.equal(out.proposals[0].from_domain, 'shipping');
  assert.equal(out.proposals[0].to_domain, 'billing');
  assert.equal(out.proposals[0].proposed_tier, 'ask');
});
