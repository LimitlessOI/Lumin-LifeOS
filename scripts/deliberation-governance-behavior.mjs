#!/usr/bin/env node
/**
 * Behavioral fail-closed tests for deliberation governance v2.7 (mock pool — no DATABASE_URL).
 * Usage: node scripts/deliberation-governance-behavior.mjs
 * @ssot docs/projects/AMENDMENT_48_BUILDEROS_VOCABULARY.md
 */

import { createDeliberationGovernanceService } from '../services/deliberation-governance-service.js';
import {
  validateConsensusSession,
  validateCnclRoster,
  validateHistCase,
  validateCfoReceipt,
  validateEvidenceVaultEntry,
  validateScorecardEntry,
  clampQueryLimit,
} from '../config/deliberation-governance.js';
import { validateDeliberationGate } from '../factory-staging/factory-core/deliberation/validate-deliberation-gate.js';
import { dispatchExecuteStep } from '../factory-staging/factory-core/builder/run-step.js';

let failed = 0;

function assert(label, cond) {
  if (cond) console.log(`OK: ${label}`);
  else {
    console.error(`FAIL: ${label}`);
    failed += 1;
  }
}

function createMockPool() {
  const store = {
    rosters: [],
    hist: [],
    cfo: [],
    consensus: [],
    gates: [],
    debriefs: [],
    scorecard: [],
  };

  const pool = {
    query: async (sql, params = []) => {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
        return { rows: [] };
      }
      if (sql.includes('pg_advisory_xact_lock')) {
        return { rows: [{ locked: true }] };
      }
      if (sql.includes('SELECT id FROM cncl_rosters WHERE')) {
        const row = store.rosters.find((r) => r.session_id === params[0]);
        return { rows: row ? [{ id: row.id }] : [] };
      }
      if (sql.includes('FROM cncl_rosters WHERE')) {
        return { rows: store.rosters.filter((r) => r.session_id === params[0]).slice(0, 1) };
      }
      if (sql.includes('INSERT INTO cncl_rosters')) {
        const row = { id: store.rosters.length + 1, session_id: params[0] };
        store.rosters.push(row);
        return { rows: [row] };
      }
      if (sql.includes('COUNT(*)') && sql.includes('hist_dept_cases')) {
        return { rows: [{ n: store.hist.filter((h) => h.session_id === params[0]).length }] };
      }
      if (sql.includes('COUNT(*)') && sql.includes('cfo_deliberation')) {
        return { rows: [{ n: store.cfo.filter((h) => h.session_id === params[0]).length }] };
      }
      if (sql.includes('COUNT(*)') && sql.includes('consensus_sessions')) {
        return { rows: [{ n: store.consensus.filter((h) => h.session_id === params[0]).length }] };
      }
      if (sql.includes('FROM deliberation_gate_records WHERE')) {
        return { rows: store.gates.filter((g) => g.session_id === params[0]) };
      }
      if (sql.includes('INSERT INTO hist_dept_cases')) {
        store.hist.push({ id: store.hist.length + 1, session_id: params[0], case_text: params[3] });
        return { rows: [{ id: store.hist.length }] };
      }
      if (sql.includes('INSERT INTO cfo_deliberation_receipts')) {
        store.cfo.push({ id: store.cfo.length + 1, session_id: params[0] });
        return { rows: [{ id: store.cfo.length }] };
      }
      if (sql.includes('INSERT INTO consensus_sessions')) {
        const row = {
          id: store.consensus.length + 1,
          session_id: params[1],
          final_synthesis: params[4],
          participants: JSON.parse(params[6] || '[]'),
          original_positions: JSON.parse(params[2] || '[]'),
          brainstorm_ids: JSON.parse(params[3] || '[]'),
          future_back_horizons: JSON.parse(params[12] || '{}'),
          vote_counts: params[7] ? JSON.parse(params[7]) : null,
        };
        store.consensus.push(row);
        return { rows: [row] };
      }
      if (sql.includes('INSERT INTO composition_scorecard')) {
        store.scorecard.push({ session_id: params[1] });
        return { rows: [{ id: 1 }] };
      }
      if (sql.includes('INSERT INTO deliberation_gate_records')) {
        const session_id = params[0];
        const meta = JSON.parse(params[params.length - 1] || '{}');
        const isPass = sql.includes("'PASS'");
        const existingIdx = store.gates.findIndex((g) => g.session_id === session_id);
        if (sql.includes('ON CONFLICT') && existingIdx >= 0) {
          const existing = store.gates[existingIdx];
          if (isPass && existing.gate_status === 'PASS') {
            return { rows: [] };
          }
          const mergedMeta = { ...(existing.metadata_json || {}), ...meta };
          store.gates[existingIdx] = {
            ...existing,
            gate_status: isPass ? 'PASS' : 'FAIL',
            metadata_json: mergedMeta,
            violations: isPass ? [] : JSON.parse(params[3] || '[]'),
          };
          return { rows: [store.gates[existingIdx]] };
        }
        const row = {
          session_id,
          gate_status: isPass ? 'PASS' : 'FAIL',
          metadata_json: meta,
          violations: isPass ? [] : JSON.parse(params[3] || '[]'),
        };
        store.gates.push(row);
        return { rows: [row] };
      }
      if (sql.includes('UPDATE deliberation_gate_records')) {
        const session_id = params[0];
        const idx = store.gates.findIndex((g) => g.session_id === session_id);
        if (idx >= 0) {
          store.gates[idx].gate_status = 'FAIL';
          if (params[2]) {
            store.gates[idx].metadata_json = {
              ...(store.gates[idx].metadata_json || {}),
              ...JSON.parse(params[2]),
            };
          }
        }
        return { rows: [] };
      }
      if (sql.includes('SELECT id FROM hist_dept_cases')) {
        return { rows: store.hist.length ? [{ id: 1 }] : [] };
      }
      if (sql.includes('SELECT id FROM consensus_sessions')) {
        return { rows: store.consensus.length ? [{ id: 1 }] : [] };
      }
      if (sql.includes('SELECT * FROM consensus_sessions WHERE') && sql.includes('ORDER BY')) {
        const rows = store.consensus.filter((c) => c.session_id === params[0]);
        return { rows: rows.length ? [rows[rows.length - 1]] : [] };
      }
      if (sql.includes('INSERT INTO founder_debriefs')) {
        store.debriefs.push({ id: store.debriefs.length + 1, session_id: params[0] });
        return { rows: [{ id: store.debriefs.length, session_id: params[0] }] };
      }
      if (sql.includes('SELECT * FROM hist_dept_cases WHERE')) {
        return { rows: store.hist.filter((h) => h.session_id === params[0]) };
      }
      if (sql.includes('SELECT * FROM cfo_deliberation_receipts')) {
        return { rows: store.cfo.filter((h) => h.session_id === params[0]) };
      }
      if (sql.includes('SELECT * FROM consensus_sessions WHERE')) {
        return { rows: store.consensus.filter((h) => h.session_id === params[0]) };
      }
      if (sql.includes('SELECT * FROM composition_scorecard')) {
        return { rows: store.scorecard.filter((s) => s.session_id === params[0]) };
      }
      if (sql.includes('SELECT * FROM deliberation_gate_records WHERE session')) {
        return { rows: store.gates.filter((g) => g.session_id === params[0]).slice(0, 1) };
      }
      if (sql.includes('SELECT * FROM founder_debriefs')) {
        return { rows: store.debriefs.filter((d) => d.session_id === params[0]) };
      }
      return { rows: [] };
    },
    store,
  };

  return pool;
}

const validConsensus = {
  final_synthesis: 'Position E synthesis after future-back scan.',
  participants: [{ id: 'bpb' }, { id: 'cdr' }],
  original_positions: [{ stance: 'ship' }, { stance: 'defer' }],
  future_back_horizons: { '1y': 'scale', '5y': 'platform' },
  vote_counts: { ship: 2 },
};

const SUBSTANTIVE_CASE =
  'Substantive historian case text for behavioral gate testing (min twenty chars).';

console.log('=== Deliberation governance behavior (fail-closed) ===\n');

assert('empty consensus payload rejected', !validateConsensusSession({ session_id: 'x' }).ok);
assert('valid consensus payload accepted', validateConsensusSession({ session_id: 'x', ...validConsensus }).ok);

{
  const pool = createMockPool();
  const svc = createDeliberationGovernanceService(pool);
  await svc.seedPipelineMinimum({ session_id: 'lb-1', case_text: SUBSTANTIVE_CASE, problem: 'p' });
  const gate = await svc.passDeliberationGate({
    session_id: 'lb-1',
    load_bearing: true,
    metadata_json: { load_bearing: true },
  });
  assert(
    'load-bearing without consensus fails gate',
    !gate.ok && (gate.violations || []).includes('CONSENSUS_SESSION_MISSING')
  );
}

{
  const pool = createMockPool();
  const svc = createDeliberationGovernanceService(pool);
  await svc.seedPipelineMinimum({ session_id: 'lb-2', case_text: SUBSTANTIVE_CASE, problem: 'p' });
  const fin = await svc.finalizePipeline({ session_id: 'lb-2', load_bearing: true, consensus: {} });
  assert('finalize rejects empty consensus object', !fin.ok);
  assert('empty consensus does not pass load-bearing gate', fin.status !== 'DELIBERATION_GATE_PASS');
}

{
  const pool = createMockPool();
  const svc = createDeliberationGovernanceService(pool);
  await svc.seedPipelineMinimum({ session_id: 'lb-3', case_text: SUBSTANTIVE_CASE, problem: 'p' });
  const before = pool.store.debriefs.length;
  const fin = await svc.finalizePipeline({ session_id: 'lb-3', load_bearing: true });
  assert('load-bearing finalize without consensus returns ok:false', !fin.ok);
  assert('failed gate does not persist founder debrief', pool.store.debriefs.length === before);
  assert('failed finalize returns debrief:null', fin.debrief == null);
}

{
  const pool = createMockPool();
  const svc = createDeliberationGovernanceService(pool);
  await svc.seedPipelineMinimum({ session_id: 'lb-4', case_text: SUBSTANTIVE_CASE, problem: 'p' });
  const fin = await svc.finalizePipeline({
    session_id: 'lb-4',
    load_bearing: true,
    consensus: validConsensus,
  });
  assert('load-bearing with valid consensus passes finalize', fin.ok === true);
  assert('successful finalize persists debrief', pool.store.debriefs.length === 1);
}

{
  const gate = validateDeliberationGate('mission:nonexistent-load-bearing', { load_bearing: true });
  assert(
    'factory gate load-bearing without consensus fails',
    !gate.ok && (gate.violations || []).includes('CONSENSUS_SESSION_MISSING')
  );
}

// --- Adversarial probes (Codex SENTRY) ---

const unfocusedSameModel = validateCnclRoster({
  session_id: 'adv-1',
  authorities: ['BPB', 'CDR'],
  reps: [{ name: 'r1' }],
  models: [{ id: 'gpt-4' }, { id: 'gpt-4' }],
});
assert('BPB+CDR same model without focus rejected', !unfocusedSameModel.ok);

const wrongFocusSameModel = validateCnclRoster({
  session_id: 'adv-2',
  authorities: ['BPB', 'CDR'],
  reps: [{ name: 'r1' }],
  models: [
    { id: 'gpt-4', focus: 'ChC' },
    { id: 'gpt-4', focus: 'SNT' },
  ],
});
assert('BPB+CDR missing BPB/CDR focus rejected', !wrongFocusSameModel.ok);

assert('clampQueryLimit(-1) never negative', clampQueryLimit(-1) >= 1);
assert('clampQueryLimit(0) falls back to safe default', clampQueryLimit(0) >= 1);

assert('whitespace-only hist case_text rejected', !validateHistCase({ session_id: 'x', case_text: '   ' }).ok);
assert('short hist case_text rejected', !validateHistCase({ session_id: 'x', case_text: 'too short' }).ok);

assert('trivial cfo role rejected', !validateCfoReceipt({ session_id: 'x', role: 'x' }).ok);
assert('negative cfo cost rejected', !validateCfoReceipt({ session_id: 'x', role: 'CFO', cost_usd: -1 }).ok);
assert('negative cfo tokens rejected', !validateCfoReceipt({ session_id: 'x', role: 'CFO', tokens: -1 }).ok);

assert(
  'invalid future_back horizon rejected',
  !validateConsensusSession({
    session_id: 'x',
    final_synthesis: 'synthesis text here',
    participants: [{ id: 'a' }, { id: 'b' }],
    original_positions: [{ stance: 'ship' }],
    future_back_horizons: { '100y': 'bad' },
    vote_counts: { ship: 2 },
  }).ok
);

assert(
  'negative vote_counts rejected',
  !validateConsensusSession({
    session_id: 'x',
    final_synthesis: 'synthesis text here',
    participants: [{ id: 'a' }, { id: 'b' }],
    original_positions: [{ stance: 'ship' }],
    future_back_horizons: { '1y': 'scale' },
    vote_counts: { ship: -1 },
  }).ok
);

assert(
  'negative scorecard metrics rejected',
  !validateScorecardEntry({
    decision_type: 'test',
    cost_usd: -5,
    token_count: -1,
    latency_ms: -1,
  }).ok
);

{
  const pool = createMockPool();
  const svc = createDeliberationGovernanceService(pool);
  await svc.seedPipelineMinimum({
    session_id: 'sticky-lb',
    case_text: SUBSTANTIVE_CASE,
    problem: 'p',
  });
  const fail1 = await svc.passDeliberationGate({ session_id: 'sticky-lb', load_bearing: true });
  assert('load-bearing fail without consensus', !fail1.ok);
  const fail2 = await svc.passDeliberationGate({ session_id: 'sticky-lb' });
  assert('sticky load-bearing blocks downgrade pass', !fail2.ok);
  const gateMeta = pool.store.gates.find((g) => g.session_id === 'sticky-lb')?.metadata_json;
  assert('load_bearing persisted in gate metadata', gateMeta?.load_bearing === true);
}

{
  const pool = createMockPool();
  const svc = createDeliberationGovernanceService(pool);
  await svc.recordHistCase({ session_id: 'no-roster-gate', case_text: SUBSTANTIVE_CASE });
  await svc.recordCfoReceipt({ session_id: 'no-roster-gate', role: 'CFO', cost_usd: 0 });
  const gate = await svc.passDeliberationGate({ session_id: 'no-roster-gate' });
  assert(
    'gate pass without roster fails',
    !gate.ok && (gate.violations || []).includes('ROSTER_MISSING')
  );
}

assert('xss evidence source_type rejected', !validateEvidenceVaultEntry({ source_type: '<script>' }).ok);
assert('path traversal storage_path rejected', !validateEvidenceVaultEntry({ source_type: 'manual', storage_path: '../../etc/passwd' }).ok);

const unknownRep = validateCnclRoster({
  session_id: 'rep-test',
  authorities: ['BPB'],
  reps: [{ name: 'NOT_IN_CATALOG_XYZ' }],
  models: [{ id: 'm1', focus: 'BPB' }],
});
assert('unknown REP rejected', !unknownRep.ok);

{
  const prev = process.env.FACTORY_ALLOW_SKIP_INTAKE_GATE;
  delete process.env.FACTORY_ALLOW_SKIP_INTAKE_GATE;
  const blocked = dispatchExecuteStep({
    skip_intake_gate: true,
    mission_id: 'M1',
    step: { step_id: 'S1', sandbox_boundary: 'test' },
  });
  assert('skip_intake_gate denied without env flag', blocked.httpStatus === 422);
  if (prev !== undefined) process.env.FACTORY_ALLOW_SKIP_INTAKE_GATE = prev;
}

console.log(`\n=== Done (${failed} failures) ===`);
process.exit(failed ? 1 : 0);
