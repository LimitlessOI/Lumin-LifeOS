/**
 * SYNOPSIS: Cognitive Core Era-4 unit tests — Trust Me Law-2 gates (fake-pool only).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCognitiveCoreTrust } from '../services/cognitive-core-trust.js';

function fakeTrustPool({ domains = [] } = {}) {
  return {
    calls: [],
    async query(sql, params) {
      this.calls.push({ sql: String(sql).slice(0, 120), params });
      if (/FROM judgment_trust_by_domain/.test(sql)) {
        return { rows: domains };
      }
      if (/COUNT\(d\.decision_id\)/.test(sql)) {
        return { rows: [{ decisions: domains.reduce((s, d) => s + (d.n || 0), 0), outcomes: 0, predictions: 0, miss_reports: 0 }] };
      }
      if (/FROM delegation_scopes WHERE user_id/.test(sql) && /AND domain/.test(sql)) {
        return { rows: [] };
      }
      if (/FROM delegation_scopes WHERE user_id/.test(sql)) {
        return { rows: [] };
      }
      if (/INSERT INTO delegation_scopes/.test(sql)) {
        return {
          rows: [{
            scope_id: 'scope-1',
            user_id: params[0],
            domain: params[1],
            delegation_tier: params[2],
            stakes_max: params[3],
            founder_approved: true,
            n: params[7] ?? params[6] ?? 0,
            status: 'active',
          }],
        };
      }
      if (/INSERT INTO autonomous_actions/.test(sql)) {
        return {
          rows: [{
            action_id: 'act-1',
            user_id: params[0],
            domain: params[1],
            proposed_action: params[3],
            status: params[7],
            can_act_snapshot: typeof params[6] === 'string' ? JSON.parse(params[6]) : params[6],
          }],
        };
      }
      if (/UPDATE autonomous_actions/.test(sql)) {
        return { rows: [{ action_id: params[0], status: params[1], override_note: params[2] }] };
      }
      if (/INSERT INTO legacy_entries/.test(sql)) {
        return {
          rows: [{
            entry_id: 'leg-1',
            user_id: params[0],
            kind: params[1],
            title: params[2],
            content: params[3],
          }],
        };
      }
      return { rows: [] };
    },
  };
}

function makeTrust(domains) {
  return createCognitiveCoreTrust({ pool: fakeTrustPool({ domains }), logger: console });
}

test('Law 2: refuse tier cannot act even on low stakes', async () => {
  const trust = makeTrust([{ domain: 'shipping', delegation_tier: 'refuse', accuracy: 0.4, n: 2, brier_score: 0.3 }]);
  const gate = await trust.canAct({ userId: '1', domain: 'shipping', stakes: 'low' });
  assert.equal(gate.can_act, false);
  assert.equal(gate.action, 'refuse');
});

test('Law 2: suggest tier may act only on low stakes', async () => {
  const trust = makeTrust([{ domain: 'shipping', delegation_tier: 'suggest', accuracy: 0.85, n: 12, brier_score: 0.18 }]);
  const low = await trust.canAct({ userId: '1', domain: 'shipping', stakes: 'low' });
  const mid = await trust.canAct({ userId: '1', domain: 'shipping', stakes: 'medium' });
  assert.equal(low.can_act, true);
  assert.equal(mid.can_act, false);
});

test('Law 2: allow tier can act', async () => {
  const trust = makeTrust([{ domain: 'ops', delegation_tier: 'allow', accuracy: 0.92, n: 40, brier_score: 0.1 }]);
  const gate = await trust.canAct({ userId: '1', domain: 'ops', stakes: 'medium' });
  assert.equal(gate.can_act, true);
  assert.equal(gate.action, 'allow');
});

test('proposeAutonomousAction refuses when evidence missing', async () => {
  const trust = makeTrust([]);
  const out = await trust.proposeAutonomousAction({
    userId: '1',
    domain: 'billing',
    proposedAction: 'send_invoice_reminder',
    stakes: 'low',
  });
  assert.equal(out.ok, true);
  assert.equal(out.can_act, false);
  assert.equal(out.action.status, 'refused');
});

test('proposeAutonomousAction proposes when suggest+low', async () => {
  const trust = makeTrust([{ domain: 'billing', delegation_tier: 'suggest', accuracy: 0.82, n: 15, brier_score: 0.2 }]);
  const out = await trust.proposeAutonomousAction({
    userId: '1',
    domain: 'billing',
    proposedAction: 'draft_followup_email',
    stakes: 'low',
  });
  assert.equal(out.can_act, true);
  assert.equal(out.action.status, 'proposed');
});

test('recordLegacy requires title + content', async () => {
  const trust = makeTrust();
  await assert.rejects(
    () => trust.recordLegacy({ userId: '1', title: 'x' }),
    /title_and_content_required/,
  );
});

test('recordLegacy inserts principle hypothesis', async () => {
  const trust = makeTrust();
  const row = await trust.recordLegacy({
    userId: '1',
    kind: 'heuristic',
    title: 'Ship small',
    content: 'Prefer one vertical slice over a platform rewrite.',
    confidence: 0.6,
  });
  assert.equal(row.kind, 'heuristic');
  assert.equal(row.title, 'Ship small');
});

test('overrideAutonomousAction flips status', async () => {
  const trust = makeTrust();
  const row = await trust.overrideAutonomousAction({
    actionId: 'act-1',
    overrideNote: 'I will do this myself',
    status: 'overridden',
  });
  assert.equal(row.status, 'overridden');
  assert.match(row.override_note, /myself/);
});

test('approveDelegationScope blocked when n < 5 (Law 2)', async () => {
  const trust = makeTrust([{ domain: 'shipping', delegation_tier: 'ask', accuracy: 0.7, n: 2, brier_score: 0.25 }]);
  const out = await trust.approveDelegationScope({
    userId: '1',
    domain: 'shipping',
    stakesMax: 'low',
  });
  assert.equal(out.ok, false);
  assert.equal(out.reason, 'insufficient_evidence');
});
