/**
 * SYNOPSIS: Shared mock pool for deliberation regression harness (local layer).
 * Shared mock pool for deliberation regression harness (local layer).
 * @ssot builderos-reboot/MISSIONS/FACTORY-DELIBERATION-SENTRY-REGRESSION-0001/REGRESSION_PROBE_CATALOG.json
 */
export function createMockPool() {
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
        const row = {
          id: store.rosters.length + 1,
          session_id: params[0],
          audit_expanded_roster: params[9] ? JSON.parse(params[9]) : null,
          expand_reason: params[10] ?? null,
        };
        store.rosters.push(row);
        return { rows: [row] };
      }
      if (sql.includes('UPDATE cncl_rosters') && sql.includes('audit_expanded_roster')) {
        const idx = store.rosters.findIndex((r) => r.session_id === params[0]);
        if (idx < 0) return { rows: [] };
        store.rosters[idx] = {
          ...store.rosters[idx],
          audit_expanded_roster: JSON.parse(params[1]),
          expand_reason: params[2] ?? null,
        };
        return { rows: [store.rosters[idx]] };
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
          future_back_horizons: JSON.parse(params[12] || '{}'),
          vote_counts: params[7] ? JSON.parse(params[7]) : null,
        };
        store.consensus.push(row);
        return { rows: [row] };
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
          store.gates[existingIdx] = {
            ...existing,
            gate_status: isPass ? 'PASS' : 'FAIL',
            metadata_json: { ...(existing.metadata_json || {}), ...meta },
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
        if (idx >= 0 && params[2]) {
          store.gates[idx].metadata_json = {
            ...(store.gates[idx].metadata_json || {}),
            ...JSON.parse(params[2]),
          };
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
