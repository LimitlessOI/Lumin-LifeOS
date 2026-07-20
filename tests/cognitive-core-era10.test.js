/**
 * SYNOPSIS: Cognitive Core Era-10 unit tests — Multiply Me (fake-pool).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCognitiveCoreMultiply } from '../services/cognitive-core-multiply.js';

function fakeMultiplyPool({ domains = [], decisions = [], programs = [], findings = [] } = {}) {
  const state = {
    council: [], benchmarks: [], replays: [], roi: [], bridge: [],
    findings: [...findings],
  };
  return {
    state,
    async query(sql, params) {
      if (/FROM judgment_trust_by_domain/.test(sql)) {
        return { rows: domains };
      }
      if (/COUNT\(d\.decision_id\)/.test(sql)) {
        return { rows: [{ decisions: 0, outcomes: 0, predictions: 0, miss_reports: 0 }] };
      }
      if (/INSERT INTO advisor_council_sessions/.test(sql)) {
        const row = {
          session_id: 'sess-1',
          question: params[1],
          advisor_ids: JSON.parse(params[2]),
          positions: JSON.parse(params[3]),
          consensus: params[4],
          dissent: JSON.parse(params[5]),
          confidence: params[6],
        };
        state.council.push(row);
        return { rows: [row] };
      }
      if (/FROM advisor_council_sessions/.test(sql)) {
        return { rows: state.council };
      }
      if (/INSERT INTO cohort_benchmarks/.test(sql)) {
        const row = { benchmark_id: `bm-${state.benchmarks.length + 1}`, domain: params[1], user_accuracy: params[2], percentile: params[6] };
        state.benchmarks.push(row);
        return { rows: [row] };
      }
      if (/FROM judgment_decisions d/.test(sql) && /judgment_outcomes o/.test(sql)) {
        return { rows: decisions };
      }
      if (/AVG\(confidence\)::float AS avg_conf FROM judgment_programs/.test(sql)) {
        const avg = programs.length ? programs.reduce((s, p) => s + (p.confidence || 0), 0) / programs.length : null;
        return { rows: [{ avg_conf: avg }] };
      }
      if (/INSERT INTO judgment_replay_runs/.test(sql)) {
        const row = {
          run_id: 'run-1',
          decisions_replayed: params[1],
          prior_accuracy: params[2],
          replay_accuracy: params[3],
          improvement: params[4],
        };
        state.replays.push(row);
        return { rows: [row] };
      }
      if (/FROM calibration_snapshots/.test(sql)) {
        return { rows: [{ acc: null }] };
      }
      if (/INSERT INTO compound_roi_ledger/.test(sql)) {
        const row = { roi_id: 'roi-1', baseline: params[1], current_value: params[2], gain: params[3] };
        state.roi.push(row);
        return { rows: [row] };
      }
      if (/FROM self_audit_findings/.test(sql)) {
        return { rows: state.findings.filter((f) => f.status === params[1]) };
      }
      if (/UPDATE self_audit_findings/.test(sql)) {
        const row = state.findings.find((f) => f.finding_id === params[0]);
        if (row) row.status = params[1];
        return { rows: row ? [row] : [] };
      }
      if (/INSERT INTO ship_queue_bridge_items/.test(sql)) {
        const row = {
          bridge_id: `br-${state.bridge.length + 1}`,
          source_ref: params[1],
          title: params[2],
          proposed_change: params[3],
          queue_status: 'staged',
          governed: true,
        };
        state.bridge.push(row);
        return { rows: [row] };
      }
      if (/FROM ship_queue_bridge_items/.test(sql)) {
        return { rows: state.bridge.filter((b) => b.queue_status === params[1]) };
      }
      return { rows: [] };
    },
  };
}

test('runCouncil preserves dissent and advisor-lens honesty (no AI)', async () => {
  const pool = fakeMultiplyPool();
  const m = createCognitiveCoreMultiply({ pool, callAI: async () => { throw new Error('no ai'); } });
  const out = await m.runCouncil({ userId: '1', question: 'Raise or bootstrap?' });
  assert.equal(out.ok, true);
  assert.ok(out.session.positions.length >= 1);
  assert.match(out.honesty, /lenses|not the real people/i);
});

test('runCouncil requires a question', async () => {
  const m = createCognitiveCoreMultiply({ pool: fakeMultiplyPool(), callAI: async () => '' });
  const out = await m.runCouncil({ userId: '1', question: '' });
  assert.equal(out.ok, false);
  assert.equal(out.error, 'question_required');
});

test('benchmarkCohort marks reference as hypothesis', async () => {
  const pool = fakeMultiplyPool({
    domains: [{ domain: 'shipping', n: 8, accuracy: 0.8, brier_score: 0.15 }],
  });
  const m = createCognitiveCoreMultiply({ pool, callAI: async () => '' });
  const out = await m.benchmarkCohort('1');
  assert.equal(out.ok, true);
  assert.equal(out.benchmarks.length, 1);
  assert.match(out.honesty, /not a live peer leaderboard/i);
});

test('replayJudgment uses proxy and labels GUESS', async () => {
  const pool = fakeMultiplyPool({
    decisions: [
      { decision_id: 'd1', correct: true, pred_conf: 0.7 },
      { decision_id: 'd2', correct: false, pred_conf: 0.6 },
    ],
    programs: [{ confidence: 0.7 }],
  });
  const m = createCognitiveCoreMultiply({ pool, callAI: async () => '' });
  const out = await m.replayJudgment('1');
  assert.equal(out.ok, true);
  assert.equal(out.run.decisions_replayed, 2);
  assert.match(out.honesty, /GUESS/);
});

test('bridgeFindingsToQueue stages governed items from open findings', async () => {
  const pool = fakeMultiplyPool({
    findings: [
      { finding_id: 'f1', title: 'Law2 fail', proposed_fix: 'demote', target_ref: 'law2', severity: 'high', status: 'open' },
      { finding_id: 'f2', title: 'Decay ops', proposed_fix: 'ritual', target_ref: 'domain:ops', severity: 'medium', status: 'open' },
    ],
  });
  const m = createCognitiveCoreMultiply({ pool, callAI: async () => '' });
  const out = await m.bridgeFindingsToQueue('1');
  assert.equal(out.ok, true);
  assert.equal(out.bridged.length, 2);
  assert.ok(out.bridged.every((b) => b.governed === true && b.queue_status === 'staged'));
  assert.match(out.honesty, /GOVERNED factory|SO-001/);
});
