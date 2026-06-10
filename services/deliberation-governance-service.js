/**
 * Deliberation governance v2.7 — CnclRoster, consensus, scorecard, Hist case, CFO receipts, gate.
 * @ssot docs/projects/AMENDMENT_48_BUILDEROS_VOCABULARY.md
 */

import {
  validateCnclRoster,
  validateHistCase,
  validateCfoReceipt,
  validateConsensusSession,
  PROTOCOL_VERSION,
  GRADES,
  clampQueryLimit,
} from '../config/deliberation-governance.js';
import { formatFounderDebrief } from './founder-debrief-service.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REP_CATALOG_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../config/rep-catalog.json'
);

function gradeOrNull(g) {
  if (!g) return null;
  const u = String(g).toUpperCase().charAt(0);
  return GRADES.includes(u) ? u : null;
}

export function createDeliberationGovernanceService(pool, logger = console) {
  if (!pool?.query) {
    throw new Error('DeliberationGovernanceService requires a database pool');
  }

  async function createRoster(payload) {
    const v = validateCnclRoster(payload);
    if (!v.ok) return { ok: false, errors: v.errors };

    const r = v.roster;
    const { rows } = await pool.query(
      `INSERT INTO cncl_rosters (
        session_id, objective_id, project_slug, decision_type,
        authorities, reps, models, partial,
        roster_used, audit_expanded_roster, expand_reason,
        founder_priority_mode, metadata_json
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *`,
      [
        r.session_id,
        r.objective_id,
        r.project_slug,
        r.decision_type,
        JSON.stringify(r.authorities),
        JSON.stringify(r.reps),
        JSON.stringify(r.models),
        r.partial,
        r.roster_used ? JSON.stringify(r.roster_used) : null,
        r.audit_expanded_roster ? JSON.stringify(r.audit_expanded_roster) : null,
        r.expand_reason,
        r.founder_priority_mode,
        JSON.stringify(r.metadata_json),
      ]
    );
    return { ok: true, roster: rows[0] };
  }

  async function getRosterBySession(session_id) {
    const { rows } = await pool.query(
      `SELECT * FROM cncl_rosters WHERE session_id = $1 LIMIT 1`,
      [session_id]
    );
    return rows[0] || null;
  }

  async function expandRoster(session_id, { audit_expanded_roster, expand_reason }) {
    const { rows } = await pool.query(
      `UPDATE cncl_rosters
       SET audit_expanded_roster = $2, expand_reason = $3
       WHERE session_id = $1
       RETURNING *`,
      [session_id, JSON.stringify(audit_expanded_roster), expand_reason]
    );
    return rows[0] || null;
  }

  async function recordHistCase(payload) {
    const v = validateHistCase(payload);
    if (!v.ok) return { ok: false, errors: v.errors };

    let roster_id = payload.roster_id || null;
    if (!roster_id && payload.session_id) {
      const roster = await getRosterBySession(payload.session_id);
      roster_id = roster?.id || null;
    }

    const { rows } = await pool.query(
      `INSERT INTO hist_dept_cases (
        session_id, roster_id, problem, case_text, ideas, opportunity,
        evidence_links, uncertainty, metadata_json
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        payload.session_id,
        roster_id,
        payload.problem || null,
        payload.case_text,
        JSON.stringify(payload.ideas || []),
        payload.opportunity || null,
        JSON.stringify(payload.evidence_links || []),
        payload.uncertainty || 'THINK',
        JSON.stringify(payload.metadata_json || payload.metadata || {}),
      ]
    );
    return { ok: true, hist_case: rows[0] };
  }

  async function recordCfoReceipt(payload) {
    const v = validateCfoReceipt(payload);
    if (!v.ok) return { ok: false, errors: v.errors };

    let roster_id = payload.roster_id || null;
    if (!roster_id && payload.session_id) {
      const roster = await getRosterBySession(payload.session_id);
      roster_id = roster?.id || null;
    }

    const { rows } = await pool.query(
      `INSERT INTO cfo_deliberation_receipts (
        session_id, roster_id, dept, role, model, tokens, cost_usd,
        routing_change, cheaper_path_available, founder_priority_mode, metadata_json
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *`,
      [
        payload.session_id,
        roster_id,
        payload.dept || payload.role || null,
        payload.role || null,
        payload.model || null,
        payload.tokens ?? null,
        payload.cost_usd ?? null,
        payload.routing_change ? JSON.stringify(payload.routing_change) : null,
        payload.cheaper_path_available ?? null,
        Boolean(payload.founder_priority_mode),
        JSON.stringify(payload.metadata_json || payload.metadata || {}),
      ]
    );
    return { ok: true, receipt: rows[0] };
  }

  async function recordConsensusSession(payload) {
    const v = validateConsensusSession(payload);
    if (!v.ok) return { ok: false, errors: v.errors };

    let roster_id = payload.roster_id || null;
    if (!roster_id) {
      const roster = await getRosterBySession(payload.session_id);
      roster_id = roster?.id || null;
    }

    const { rows } = await pool.query(
      `INSERT INTO consensus_sessions (
        roster_id, session_id, original_positions, brainstorm_ids,
        final_synthesis, position_e_or_k_found, participants,
        vote_counts, confidence_avg, grade, predicted_outcome,
        protocol_version, future_back_horizons, competitive_scan, metadata_json
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *`,
      [
        roster_id,
        payload.session_id,
        JSON.stringify(payload.original_positions || []),
        JSON.stringify(payload.brainstorm_ids || []),
        payload.final_synthesis || null,
        Boolean(payload.position_e_or_k_found),
        JSON.stringify(payload.participants || []),
        payload.vote_counts ? JSON.stringify(payload.vote_counts) : null,
        payload.confidence_avg ?? null,
        gradeOrNull(payload.grade),
        payload.predicted_outcome || null,
        payload.protocol_version || PROTOCOL_VERSION,
        JSON.stringify(payload.future_back_horizons || {}),
        JSON.stringify(payload.competitive_scan || []),
        JSON.stringify(payload.metadata_json || payload.metadata || {}),
      ]
    );
    return { ok: true, consensus_session: rows[0] };
  }

  async function recordScorecardEntry(payload) {
    if (!payload?.decision_type) return { ok: false, errors: ['decision_type required'] };

    let roster_id = payload.roster_id || null;
    if (!roster_id && payload.session_id) {
      const roster = await getRosterBySession(payload.session_id);
      roster_id = roster?.id || null;
    }

    const { rows } = await pool.query(
      `INSERT INTO composition_scorecard_entries (
        roster_id, session_id, decision_type, authorities, reps,
        model_count, partial, outcome_grade, cost_usd, token_count,
        latency_ms, audit_expanded, expand_reason, notes, metadata_json
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *`,
      [
        roster_id,
        payload.session_id || null,
        payload.decision_type,
        JSON.stringify(payload.authorities || []),
        JSON.stringify(payload.reps || []),
        payload.model_count ?? 0,
        payload.partial !== false,
        gradeOrNull(payload.outcome_grade),
        payload.cost_usd ?? null,
        payload.token_count ?? null,
        payload.latency_ms ?? null,
        Boolean(payload.audit_expanded),
        payload.expand_reason || null,
        payload.notes || null,
        JSON.stringify(payload.metadata_json || payload.metadata || {}),
      ]
    );
    return { ok: true, scorecard_entry: rows[0] };
  }

  async function recordEvidenceVaultEntry(payload) {
    if (!payload?.source_type) return { ok: false, errors: ['source_type required'] };
    const { rows } = await pool.query(
      `INSERT INTO evidence_vault_entries (source_type, source_ref, content_hash, storage_path, metadata_json)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [
        payload.source_type,
        payload.source_ref || null,
        payload.content_hash || null,
        payload.storage_path || null,
        JSON.stringify(payload.metadata_json || payload.metadata || {}),
      ]
    );
    return { ok: true, entry: rows[0] };
  }

  async function getGateStatus(session_id, opts = {}) {
    const [gate, hist, cfo, consensus, latestConsensus] = await Promise.all([
      pool.query(`SELECT * FROM deliberation_gate_records WHERE session_id = $1`, [session_id]),
      pool.query(
        `SELECT COUNT(*)::int AS n FROM hist_dept_cases WHERE session_id = $1`,
        [session_id]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS n FROM cfo_deliberation_receipts WHERE session_id = $1`,
        [session_id]
      ),
      pool.query(
        `SELECT COUNT(*)::int AS n FROM consensus_sessions WHERE session_id = $1`,
        [session_id]
      ),
      pool.query(
        `SELECT * FROM consensus_sessions WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [session_id]
      ),
    ]);

    const violations = [];
    const histCount = hist.rows[0]?.n || 0;
    const cfoCount = cfo.rows[0]?.n || 0;
    const consensusCount = consensus.rows[0]?.n || 0;

    if (histCount < 1) violations.push('HIST_CASE_MISSING');
    if (cfoCount < 1) violations.push('CFO_RECEIPT_MISSING');

    const load_bearing =
      opts.load_bearing === true || gate.rows[0]?.metadata_json?.load_bearing === true;
    if (load_bearing) {
      if (consensusCount < 1) {
        violations.push('CONSENSUS_SESSION_MISSING');
      } else {
        const row = latestConsensus.rows[0];
        const cv = validateConsensusSession({
          session_id,
          final_synthesis: row?.final_synthesis,
          participants: row?.participants,
          original_positions: row?.original_positions,
          brainstorm_ids: row?.brainstorm_ids,
          future_back_horizons: row?.future_back_horizons,
          vote_counts: row?.vote_counts,
        });
        if (!cv.ok) {
          violations.push(...cv.errors.map((e) => `CONSENSUS_INVALID:${e}`));
        }
      }
    }

    return {
      session_id,
      gate: gate.rows[0] || null,
      hist_case_count: histCount,
      cfo_receipt_count: cfoCount,
      consensus_session_count: consensusCount,
      violations,
      pass: violations.length === 0,
    };
  }

  async function passDeliberationGate(payload) {
    const session_id = payload.session_id;
    if (!session_id) return { ok: false, errors: ['session_id required'] };

    const load_bearing =
      payload.load_bearing === true || payload.metadata_json?.load_bearing === true;
    const status = await getGateStatus(session_id, { load_bearing });
    if (!status.pass) {
      await pool.query(
        `INSERT INTO deliberation_gate_records (session_id, mission_id, objective_id, gate_status, violations, metadata_json)
         VALUES ($1,$2,$3,'FAIL',$4,$5)
         ON CONFLICT (session_id) DO UPDATE SET
           gate_status = 'FAIL',
           violations = EXCLUDED.violations,
           metadata_json = EXCLUDED.metadata_json`,
        [
          session_id,
          payload.mission_id || null,
          payload.objective_id || null,
          JSON.stringify(status.violations),
          JSON.stringify(payload.metadata_json || {}),
        ]
      );
      return { ok: false, status: 'DELIBERATION_GATE_FAIL', violations: status.violations };
    }

    const histRow = await pool.query(
      `SELECT id FROM hist_dept_cases WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [session_id]
    );
    const consensusRow = await pool.query(
      `SELECT id FROM consensus_sessions WHERE session_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [session_id]
    );
    const roster = await getRosterBySession(session_id);

    const { rows } = await pool.query(
      `INSERT INTO deliberation_gate_records (
        session_id, mission_id, objective_id, roster_id,
        hist_case_id, consensus_session_id, cfo_receipt_count,
        gate_status, violations, passed_at, metadata_json
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,'PASS','[]'::jsonb,NOW(),$8)
      ON CONFLICT (session_id) DO UPDATE SET
        gate_status = 'PASS',
        violations = '[]'::jsonb,
        hist_case_id = EXCLUDED.hist_case_id,
        consensus_session_id = EXCLUDED.consensus_session_id,
        cfo_receipt_count = EXCLUDED.cfo_receipt_count,
        passed_at = NOW(),
        metadata_json = EXCLUDED.metadata_json
      RETURNING *`,
      [
        session_id,
        payload.mission_id || null,
        payload.objective_id || null,
        roster?.id || null,
        histRow.rows[0]?.id || null,
        consensusRow.rows[0]?.id || null,
        status.cfo_receipt_count,
        JSON.stringify(payload.metadata_json || {}),
      ]
    );

    return { ok: true, status: 'DELIBERATION_GATE_PASS', gate: rows[0] };
  }

  async function listScorecard({ decision_type, limit = 50 } = {}) {
    const params = [];
    let sql = `SELECT * FROM composition_scorecard_entries`;
    if (decision_type) {
      params.push(decision_type);
      sql += ` WHERE decision_type = $1`;
    }
    params.push(clampQueryLimit(limit));
    sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  async function getSessionBundle(session_id) {
    const [roster, hist, cfo, consensus, scorecard, gate] = await Promise.all([
      getRosterBySession(session_id),
      pool.query(
        `SELECT * FROM hist_dept_cases WHERE session_id = $1 ORDER BY created_at DESC`,
        [session_id]
      ),
      pool.query(
        `SELECT * FROM cfo_deliberation_receipts WHERE session_id = $1 ORDER BY created_at DESC`,
        [session_id]
      ),
      pool.query(
        `SELECT * FROM consensus_sessions WHERE session_id = $1 ORDER BY created_at DESC`,
        [session_id]
      ),
      pool.query(
        `SELECT * FROM composition_scorecard_entries WHERE session_id = $1 ORDER BY created_at DESC`,
        [session_id]
      ),
      pool.query(`SELECT * FROM deliberation_gate_records WHERE session_id = $1 LIMIT 1`, [
        session_id,
      ]),
    ]);

    return {
      session_id,
      roster,
      hist_cases: hist.rows,
      cfo_receipts: cfo.rows,
      consensus_sessions: consensus.rows,
      scorecard_entries: scorecard.rows,
      gate: gate.rows[0] || null,
    };
  }

  async function generateFounderDebrief(session_id, { persist = true } = {}) {
    const bundle = await getSessionBundle(session_id);
    const formatted = formatFounderDebrief(bundle);
    if (!persist) return { ok: true, ...formatted };

    const { rows } = await pool.query(
      `INSERT INTO founder_debriefs (session_id, layer1_synopsis, layer2_full, metadata_json, updated_at)
       VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (session_id) DO UPDATE SET
         layer1_synopsis = EXCLUDED.layer1_synopsis,
         layer2_full = EXCLUDED.layer2_full,
         metadata_json = EXCLUDED.metadata_json,
         updated_at = NOW()
       RETURNING *`,
      [
        session_id,
        formatted.layer1_synopsis,
        formatted.layer2_full,
        JSON.stringify({ protocol_version: PROTOCOL_VERSION }),
      ]
    );
    return { ok: true, debrief: rows[0], ...formatted };
  }

  async function getStoredDebrief(session_id) {
    const { rows } = await pool.query(
      `SELECT * FROM founder_debriefs WHERE session_id = $1 LIMIT 1`,
      [session_id]
    );
    return rows[0] || null;
  }

  /**
   * Seed minimum A→Z deliberation records (roster + Hist + CFO) for a session.
   */
  async function seedPipelineMinimum(payload) {
    const session_id = payload.session_id;
    if (!session_id) return { ok: false, errors: ['session_id required'] };

    let rosterResult = await getRosterBySession(session_id);
    if (!rosterResult) {
      const created = await createRoster({
        session_id,
        objective_id: payload.objective_id,
        project_slug: payload.project_slug,
        decision_type: payload.decision_type || 'objective_build',
        authorities: payload.authorities || ['BPB', 'CDR', 'SNT', 'CFO'],
        reps: payload.reps || [{ name: 'LifeOS' }, { name: 'Founder' }],
        models: payload.models || [
          { id: 'bpb-model', focus: 'BPB' },
          { id: 'cdr-model', focus: 'CDR' },
        ],
        partial: payload.partial !== false,
        founder_priority_mode: Boolean(payload.founder_priority_mode),
      });
      if (!created.ok) return created;
      rosterResult = created.roster;
    }

    const status = await getGateStatus(session_id);
    if (!status.hist_case_count) {
      await recordHistCase({
        session_id,
        problem: payload.problem || `Session ${session_id}`,
        case_text:
          payload.case_text ||
          `Pipeline-seeded Historian case for ${session_id}. Attach lessons and outcomes as build proceeds.`,
        ideas: payload.ideas || [],
        opportunity: payload.opportunity || 'Complete build with SNT verify and outcome grade.',
      });
    }
    if (!status.cfo_receipt_count) {
      await recordCfoReceipt({
        session_id,
        dept: 'CFO',
        role: payload.cfo_role || 'pipeline_seed',
        model: payload.model || 'unspecified',
        tokens: payload.tokens ?? 0,
        cost_usd: payload.cost_usd ?? 0,
        founder_priority_mode: Boolean(payload.founder_priority_mode),
      });
    }

    return { ok: true, session_id, roster: rosterResult, gate: await getGateStatus(session_id) };
  }

  /**
   * Finalize pipeline: optional consensus, gate pass, founder debrief.
   */
  async function finalizePipeline(payload) {
    const session_id = payload.session_id;
    if (!session_id) return { ok: false, errors: ['session_id required'] };

    if (payload.consensus) {
      const consensusResult = await recordConsensusSession({ session_id, ...payload.consensus });
      if (!consensusResult.ok) {
        return { ok: false, session_id, status: 'CONSENSUS_INVALID', errors: consensusResult.errors };
      }
    }

    if (payload.scorecard) {
      await recordScorecardEntry({ session_id, ...payload.scorecard });
    }

    const load_bearing = Boolean(payload.load_bearing);
    const gateResult = await passDeliberationGate({
      session_id,
      load_bearing,
      mission_id: payload.mission_id,
      objective_id: payload.objective_id,
      metadata_json: { load_bearing, ...payload.metadata_json },
    });

    if (!gateResult.ok) {
      return { ok: false, session_id, gate: gateResult, debrief: null };
    }

    const debrief = await generateFounderDebrief(session_id, { persist: true });

    return {
      ok: true,
      session_id,
      gate: gateResult,
      debrief: {
        layer1_synopsis: debrief.layer1_synopsis,
        stored_id: debrief.debrief?.id,
      },
    };
  }

  async function syncRepCatalogFromConfig() {
    if (!fs.existsSync(REP_CATALOG_PATH)) {
      return { ok: false, error: 'rep-catalog.json missing' };
    }
    const catalog = JSON.parse(fs.readFileSync(REP_CATALOG_PATH, 'utf8'));
    let upserted = 0;
    for (const rep of catalog.reps || []) {
      await pool.query(
        `INSERT INTO rep_catalog_entries (rep_name, description, receipt_ref, active)
         VALUES ($1,$2,$3,true)
         ON CONFLICT (rep_name) DO UPDATE SET
           description = EXCLUDED.description,
           active = true`,
        [rep.name, rep.description || null, catalog.catalog_version || 'v2.7']
      );
      upserted += 1;
    }
    return { ok: true, upserted };
  }

  async function listRepCatalog() {
    const { rows } = await pool.query(
      `SELECT rep_name, description, receipt_ref, active FROM rep_catalog_entries WHERE active = true ORDER BY rep_name`
    );
    return rows;
  }

  return {
    createRoster,
    getRosterBySession,
    expandRoster,
    recordHistCase,
    recordCfoReceipt,
    recordConsensusSession,
    recordScorecardEntry,
    recordEvidenceVaultEntry,
    getGateStatus,
    passDeliberationGate,
    listScorecard,
    validateCnclRoster,
    getSessionBundle,
    generateFounderDebrief,
    getStoredDebrief,
    seedPipelineMinimum,
    finalizePipeline,
    syncRepCatalogFromConfig,
    listRepCatalog,
  };
}
