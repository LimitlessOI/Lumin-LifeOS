/**
 * SYNOPSIS: Cognitive Core Era-3 unit tests — values, ideas, energy advisory invariants.
 * Pure/fake-pool only (no live DB).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCognitiveCoreValues } from '../services/cognitive-core-values.js';
import { createCognitiveCoreIdeas } from '../services/cognitive-core-ideas.js';
import { createCognitiveCoreExtend } from '../services/cognitive-core-extend.js';

function fakeValuesPool() {
  return {
    calls: [],
    async query(sql, params) {
      this.calls.push({ sql, params });
      if (/INSERT INTO judgment_values/.test(sql)) {
        return { rows: [{ value_id: 'v1', principle: params[1], confidence: params[3], status: 'active' }] };
      }
      if (/INSERT INTO value_drift_events/.test(sql)) {
        return { rows: [{ drift_id: 'd1', principle: params[3], severity: params[5], drift_description: params[4] }] };
      }
      if (/FROM judgment_values/.test(sql)) {
        return { rows: [] };
      }
      if (/FROM value_drift_events/.test(sql)) {
        return { rows: [] };
      }
      if (/UPDATE value_drift_events/.test(sql)) {
        return { rows: [{ drift_id: params[0], resolved: true }] };
      }
      return { rows: [] };
    },
  };
}

function fakeIdeasPool() {
  return {
    calls: [],
    async query(sql, params) {
      this.calls.push({ sql, params });
      if (/INSERT INTO idea_nodes/.test(sql)) {
        return { rows: [{ idea_id: 'i1', label: params[1], status: params[4] }] };
      }
      if (/INSERT INTO idea_edges/.test(sql)) {
        return { rows: [{ edge_id: 'e1', from_idea: params[1], to_idea: params[2], relation: params[3] }] };
      }
      if (/UPDATE idea_nodes SET status/.test(sql)) {
        return { rows: [{ idea_id: params[0], status: params[1] }] };
      }
      if (/FROM idea_nodes/.test(sql)) {
        return { rows: [{ idea_id: 'i1', label: 'seed idea', status: 'seed' }] };
      }
      if (/FROM idea_edges/.test(sql)) {
        return { rows: [] };
      }
      return { rows: [] };
    },
  };
}

function fakeEnergyPool(rows) {
  return {
    calls: [],
    async query(sql, params) {
      this.calls.push({ sql, params });
      if (/FROM judgment_decisions d/.test(sql)) {
        return { rows: rows || [] };
      }
      if (/INSERT INTO decision_energy_profile/.test(sql)) {
        return { rows: [] };
      }
      return { rows: [] };
    },
  };
}

test('createValue requires principle', async () => {
  const values = createCognitiveCoreValues({ pool: fakeValuesPool() });
  await assert.rejects(() => values.createValue({ userId: '1' }), /principle_required/);
});

test('addIdea requires label', async () => {
  const ideas = createCognitiveCoreIdeas({ pool: fakeIdeasPool() });
  await assert.rejects(() => ideas.addIdea({ userId: '1' }), /idea_label_required/);
});

test('linkIdeas invalid relation defaults to mutation', async () => {
  const pool = fakeIdeasPool();
  const ideas = createCognitiveCoreIdeas({ pool });
  const edge = await ideas.linkIdeas({
    userId: '1',
    fromIdea: 'i1',
    toIdea: 'i2',
    relation: 'not_a_real_relation',
  });
  assert.equal(edge.relation, 'mutation');
  const insert = pool.calls.find((c) => /INSERT INTO idea_edges/.test(c.sql));
  assert.equal(insert.params[3], 'mutation');
});

test('linkIdeas accepts breakthrough relation and promotes target', async () => {
  const pool = fakeIdeasPool();
  const ideas = createCognitiveCoreIdeas({ pool });
  const edge = await ideas.linkIdeas({
    userId: '1',
    fromIdea: 'i1',
    toIdea: 'i2',
    relation: 'breakthrough',
  });
  assert.equal(edge.relation, 'breakthrough');
  assert.ok(pool.calls.some((c) => /UPDATE idea_nodes SET status = 'breakthrough'/.test(c.sql)));
});

test('energyAdvisory buckets hit rates by part-of-day', async () => {
  const extend = createCognitiveCoreExtend({
    pool: fakeEnergyPool([
      { hour: 6, hit: true },
      { hour: 7, hit: true },
      { hour: 9, hit: true },
      { hour: 10, hit: true },
      { hour: 14, hit: false },
      { hour: 15, hit: false },
    ]),
  });
  const out = await extend.energyAdvisory({ userId: '1' });
  assert.equal(out.ok, true);
  assert.equal(out.n, 6);
  assert.ok(out.best_windows.length >= 1);
  const morning = out.best_windows.find((w) => w.window === 'morning');
  assert.ok(morning);
  assert.equal(morning.n, 2);
  assert.equal(morning.hit_rate, 1);
  const afternoon = out.worst_windows.find((w) => w.window === 'afternoon');
  assert.ok(afternoon);
  assert.equal(afternoon.hit_rate, 0);
});

test('energyAdvisory is honest when sample is tiny', async () => {
  const extend = createCognitiveCoreExtend({ pool: fakeEnergyPool([{ hour: 22, hit: true }]) });
  const out = await extend.energyAdvisory({ userId: '1' });
  assert.equal(out.n, 1);
  assert.equal(out.note, 'insufficient_data_hypothesis_only');
  assert.ok(out.confidence < 0.3);
});
