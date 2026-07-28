/**
 * SYNOPSIS: Cognitive Core Era-9 unit tests — Govern Me (fake-pool).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCognitiveCoreGovern } from '../services/cognitive-core-govern.js';

function fakeGovernPool({ domains = [], totals = {}, programs = [], snapshots = {} } = {}) {
  const state = { checks: [], drift: [], audits: [], findings: [], decay: [] };
  return {
    state,
    async query(sql, params) {
      if (/FROM judgment_trust_by_domain/.test(sql)) {
        return { rows: domains };
      }
      if (/COUNT\(d\.decision_id\)/.test(sql)) {
        return { rows: [totals] };
      }
      if (/FROM judgment_programs\s+WHERE user_id = \$1 AND status = 'active' AND confidence >= 0\.999/.test(sql)) {
        return { rows: programs.filter((p) => (p.confidence || 0) >= 0.999) };
      }
      if (/INSERT INTO constitutional_checks/.test(sql)) {
        state.checks.push({ law: params[1], status: params[2] });
        return { rows: [{}] };
      }
      if (/FROM calibration_snapshots/.test(sql)) {
        const dom = params[1];
        return { rows: snapshots[dom] || [] };
      }
      if (/INSERT INTO calibration_decay_events/.test(sql)) {
        const row = { decay_id: `dec-${state.decay.length + 1}`, domain: params[1], delta: params[5], severity: params[6] };
        state.decay.push(row);
        return { rows: [row] };
      }
      if (/INSERT INTO compiler_drift_ledger/.test(sql)) {
        const row = { drift_id: `dr-${state.drift.length + 1}`, kind: params[1], summary: params[2], severity: params[3], resolved: false };
        state.drift.push(row);
        return { rows: [row] };
      }
      if (/FROM compiler_drift_ledger/.test(sql)) {
        return { rows: state.drift.filter((d) => d.resolved === (params[1] === true)) };
      }
      if (/UPDATE compiler_drift_ledger/.test(sql)) {
        const row = state.drift.find((d) => d.drift_id === params[0]);
        if (row) row.resolved = true;
        return { rows: row ? [row] : [] };
      }
      if (/INSERT INTO integrity_audits/.test(sql)) {
        const row = { audit_id: `aud-${state.audits.length + 1}`, scope: params[1], passed: true, findings_n: 0 };
        state.audits.push(row);
        return { rows: [row] };
      }
      if (/UPDATE integrity_audits/.test(sql)) {
        const row = state.audits.find((a) => a.audit_id === params[0]);
        if (row) { row.passed = params[1]; row.findings_n = params[2]; row.summary = params[3]; }
        return { rows: row ? [row] : [] };
      }
      if (/INSERT INTO self_audit_findings/.test(sql)) {
        const row = {
          finding_id: `f-${state.findings.length + 1}`,
          title: params[2],
          finding: params[3],
          proposed_fix: params[4],
          target_ref: params[5],
          severity: params[6],
          status: 'open',
        };
        state.findings.push(row);
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
      return { rows: [] };
    },
  };
}

test('checkConstitution flags Law 2 when elevated tier has n<5', async () => {
  const pool = fakeGovernPool({
    domains: [{ domain: 'billing', n: 2, delegation_tier: 'suggest', accuracy: 0.9 }],
    totals: { outcomes: 0, miss_reports: 0 },
  });
  const g = createCognitiveCoreGovern({ pool });
  const checks = await g.checkConstitution('1');
  const law2 = checks.find((c) => c.law === 'law2_trust_earned_empirically');
  assert.equal(law2.status, 'fail');
});

test('checkConstitution warns Law 5 when outcomes but no miss reports', async () => {
  const pool = fakeGovernPool({
    domains: [],
    totals: { outcomes: 5, miss_reports: 0 },
  });
  const g = createCognitiveCoreGovern({ pool });
  const checks = await g.checkConstitution('1');
  const law5 = checks.find((c) => c.law === 'law5_improve_the_compiler');
  assert.equal(law5.status, 'warn');
});

test('runIntegrityAudit produces findings that carry proposed_fix', async () => {
  const pool = fakeGovernPool({
    domains: [{ domain: 'ops', n: 1, delegation_tier: 'allow', accuracy: 0.95 }],
    totals: { outcomes: 3, miss_reports: 0 },
  });
  const g = createCognitiveCoreGovern({ pool });
  const out = await g.runIntegrityAudit({ userId: '1', scope: 'law_conformance' });
  assert.equal(out.ok, true);
  assert.equal(out.passed, false);
  assert.ok(out.findings.length >= 1);
  for (const f of out.findings) {
    assert.ok(f.proposed_fix && f.proposed_fix.length > 0);
  }
});

test('detectCalibrationDecay records event on >5pt drop', async () => {
  const pool = fakeGovernPool({
    domains: [{ domain: 'shipping', n: 10, accuracy: 0.6 }],
    snapshots: { shipping: [{ accuracy: 0.8, brier_score: 0.15 }] },
  });
  const g = createCognitiveCoreGovern({ pool });
  const out = await g.detectCalibrationDecay('1');
  assert.equal(out.ok, true);
  assert.equal(out.decay_events.length, 1);
  assert.equal(out.decay_events[0].domain, 'shipping');
});

test('clean scoreboard yields passing audit', async () => {
  const pool = fakeGovernPool({
    domains: [{ domain: 'ops', n: 10, delegation_tier: 'suggest', accuracy: 0.85 }],
    totals: { outcomes: 4, miss_reports: 2 },
  });
  const g = createCognitiveCoreGovern({ pool });
  const out = await g.runIntegrityAudit({ userId: '1', scope: 'law_conformance' });
  assert.equal(out.passed, true);
  assert.equal(out.findings.length, 0);
});
