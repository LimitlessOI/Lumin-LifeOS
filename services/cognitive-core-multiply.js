/**
 * SYNOPSIS: Cognitive Core Era-10 "Multiply Me" — network, consensus, self-fix loop.
 * #46 Advisor Council Consensus, #47 Cohort Benchmark, #48 Judgment Replay Sim,
 * #49 Compound ROI Ledger, #50 Ship-Queue Bridge (findings → governed factory).
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */

import { createCognitiveCoreJudgment } from './cognitive-core-judgment.js';
import { createCognitiveCoreGovern } from './cognitive-core-govern.js';
import { listAdvisors } from '../config/cognitive-core-advisors.js';

function clamp01(n, fb = 0.4) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fb;
}

function arr(v) { return Array.isArray(v) ? v : []; }

async function softQuery(pool, sql, params = []) {
  if (!pool?.query) return [];
  try {
    const r = await pool.query(sql, params);
    return r.rows || [];
  } catch {
    return [];
  }
}

// Reference calibration band — a hypothesis, NOT a real peer leaderboard.
const COHORT_REFERENCE = { accuracy: 0.72, brier: 0.2 };

/**
 * @param {{ pool: import('pg').Pool, logger?: Console, callAI?: Function }} deps
 */
export function createCognitiveCoreMultiply(deps = {}) {
  const pool = deps.pool;
  const logger = deps.logger || console;
  const journal = createCognitiveCoreJudgment({ pool, logger });
  const govern = createCognitiveCoreGovern({ pool, logger });

  let _callAI = deps.callAI || null;
  async function callAI(prompt, opts = {}) {
    if (!_callAI) {
      try {
        const mod = await import('./never-stop-product-factory.js');
        _callAI = mod.defaultPlannerCallModel?.() || null;
      } catch { _callAI = null; }
    }
    if (!_callAI) return { ok: false, text: '' };
    try {
      const text = await _callAI('planner', prompt, { maxOutputTokens: opts.maxOutputTokens || 1800 });
      return { ok: true, text: String(text || '') };
    } catch (err) {
      logger.warn?.('[COGNITIVE-CORE/multiply] AI call failed', err?.message || err);
      return { ok: false, text: '' };
    }
  }

  // ── #46 Advisor Council Consensus ────────────────────────────────────
  async function runCouncil({ userId, question, advisorIds = [] } = {}) {
    const uid = String(userId || '1');
    const q = String(question || '').trim();
    if (!q) return { ok: false, error: 'question_required' };
    const all = listAdvisors();
    const chosen = advisorIds.length
      ? all.filter((a) => advisorIds.includes(a.id))
      : all.slice(0, 4);
    if (!chosen.length) return { ok: false, error: 'no_advisors' };

    let positions = chosen.map((a) => ({
      advisor_id: a.id,
      label: a.label,
      position: `${a.label} lens: weigh "${q.slice(0, 60)}" against ${a.goals?.[0] || 'its priority'} (hypothesis)`,
      simulation_note: a.simulation_note,
    }));
    let consensus = 'Tension held: no forced average — see dissent.';
    let dissent = [];
    let confidence = 0.4;

    const ai = await callAI(
      `You are a council synthesizer. Advisors: ${chosen.map((a) => a.label).join(', ')}.
Return ONLY JSON:
{"positions":[{"advisor_id":"munger","label":"Munger","position":"..."}],
 "consensus":"...","dissent":["..."],"confidence":0.4}
Question: ${q}
Rules: advisors are lenses (not the real people); surface genuine tension; never fake unanimity.`,
      { maxOutputTokens: 1600 },
    );
    if (ai.ok && ai.text) {
      try {
        const s = ai.text.indexOf('{');
        const e = ai.text.lastIndexOf('}');
        if (s >= 0 && e > s) {
          const parsed = JSON.parse(ai.text.slice(s, e + 1));
          if (Array.isArray(parsed.positions) && parsed.positions.length) positions = parsed.positions;
          if (parsed.consensus) consensus = String(parsed.consensus);
          if (Array.isArray(parsed.dissent)) dissent = parsed.dissent;
          confidence = clamp01(parsed.confidence, 0.4);
        }
      } catch { /* keep rule positions */ }
    }

    const r = await pool.query(
      `INSERT INTO advisor_council_sessions
         (user_id, question, advisor_ids, positions, consensus, dissent, confidence)
       VALUES ($1,$2,$3::jsonb,$4::jsonb,$5,$6::jsonb,$7)
       RETURNING *`,
      [
        uid,
        q,
        JSON.stringify(chosen.map((a) => a.id)),
        JSON.stringify(positions),
        consensus,
        JSON.stringify(dissent),
        confidence,
      ],
    );
    return {
      ok: true,
      session: r.rows[0],
      honesty: 'THINK: advisors are lenses, not the real people. Dissent preserved — no forced unanimity.',
    };
  }

  async function listCouncilSessions(userId, { limit = 20 } = {}) {
    const r = await pool.query(
      `SELECT * FROM advisor_council_sessions WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [String(userId || '1'), Math.min(Math.max(Number(limit) || 20, 1), 100)],
    );
    return r.rows;
  }

  // ── #47 Cohort Benchmark ─────────────────────────────────────────────
  async function benchmarkCohort(userId) {
    const uid = String(userId || '1');
    const board = await journal.getScoreboard(uid).catch(() => ({ by_domain: [] }));
    const created = [];
    for (const d of board.by_domain || []) {
      if ((d.n || 0) < 1) continue;
      const acc = d.accuracy != null ? Number(d.accuracy) : null;
      const brier = d.brier_score != null ? Number(d.brier_score) : null;
      const percentile = acc != null
        ? clamp01(0.5 + (acc - COHORT_REFERENCE.accuracy), 0) * 100
        : null;
      const r = await pool.query(
        `INSERT INTO cohort_benchmarks
           (user_id, domain, user_accuracy, user_brier, cohort_accuracy, cohort_brier, percentile)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING *`,
        [uid, d.domain, acc, brier, COHORT_REFERENCE.accuracy, COHORT_REFERENCE.brier, percentile],
      );
      if (r.rows[0]) created.push(r.rows[0]);
    }
    return {
      ok: true,
      benchmarks: created,
      honesty: 'THINK: reference band is a fixed hypothesis, not a live peer leaderboard.',
    };
  }

  async function listBenchmarks(userId, { limit = 30 } = {}) {
    const r = await pool.query(
      `SELECT * FROM cohort_benchmarks WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [String(userId || '1'), Math.min(Math.max(Number(limit) || 30, 1), 100)],
    );
    return r.rows;
  }

  // ── #48 Judgment Replay Simulation ───────────────────────────────────
  async function replayJudgment(userId) {
    const uid = String(userId || '1');
    const decisions = await softQuery(pool,
      `SELECT d.decision_id, d.domain, p.confidence AS pred_conf, o.correct
       FROM judgment_decisions d
       LEFT JOIN judgment_predictions p ON p.decision_id = d.decision_id
       LEFT JOIN judgment_outcomes o ON o.decision_id = d.decision_id
       WHERE d.user_id = $1 AND o.outcome_id IS NOT NULL
       ORDER BY d.created_at DESC LIMIT 100`, [uid]);
    const withOutcome = decisions.filter((d) => d.correct != null);
    const n = withOutcome.length;
    const priorAccuracy = n
      ? withOutcome.filter((d) => d.correct === true || d.correct === 't').length / n
      : null;
    // Replay proxy: current active programs would down-weight low-confidence misses.
    const programs = await softQuery(pool,
      `SELECT AVG(confidence)::float AS avg_conf FROM judgment_programs
       WHERE user_id = $1 AND status = 'active'`, [uid]);
    const avgConf = programs[0]?.avg_conf != null ? Number(programs[0].avg_conf) : null;
    const replayAccuracy = priorAccuracy != null && avgConf != null
      ? clamp01(priorAccuracy + Math.max(0, (avgConf - 0.5)) * 0.1, 0)
      : priorAccuracy;
    const improvement = (replayAccuracy != null && priorAccuracy != null)
      ? replayAccuracy - priorAccuracy
      : null;

    const r = await pool.query(
      `INSERT INTO judgment_replay_runs
         (user_id, decisions_replayed, prior_accuracy, replay_accuracy, improvement, detail)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb)
       RETURNING *`,
      [
        uid,
        n,
        priorAccuracy,
        replayAccuracy,
        improvement,
        JSON.stringify({ avg_program_confidence: avgConf, method: 'confidence_reweight_proxy' }),
      ],
    );
    return {
      ok: true,
      run: r.rows[0],
      honesty: 'GUESS: replay uses a confidence-reweight proxy, not a full re-simulation of each turn.',
    };
  }

  async function listReplays(userId, { limit = 20 } = {}) {
    const r = await pool.query(
      `SELECT * FROM judgment_replay_runs WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [String(userId || '1'), Math.min(Math.max(Number(limit) || 20, 1), 100)],
    );
    return r.rows;
  }

  // ── #49 Compound ROI Ledger ──────────────────────────────────────────
  async function recordRoi(userId, { windowDays = 30 } = {}) {
    const uid = String(userId || '1');
    const win = Math.min(Math.max(Number(windowDays) || 30, 1), 365);
    const early = await softQuery(pool,
      `SELECT AVG(accuracy)::float AS acc FROM calibration_snapshots
       WHERE user_id = $1 AND created_at < NOW() - ($2 || ' days')::interval`,
      [uid, String(Math.floor(win / 2))]);
    const late = await softQuery(pool,
      `SELECT AVG(accuracy)::float AS acc FROM calibration_snapshots
       WHERE user_id = $1 AND created_at >= NOW() - ($2 || ' days')::interval`,
      [uid, String(Math.floor(win / 2))]);
    const baseline = early[0]?.acc != null ? Number(early[0].acc) : null;
    const current = late[0]?.acc != null ? Number(late[0].acc) : null;
    const gain = (baseline != null && current != null) ? current - baseline : null;
    const r = await pool.query(
      `INSERT INTO compound_roi_ledger
         (user_id, source_kind, metric, baseline, current_value, gain, window_days, refs)
       VALUES ($1,'calibration','accuracy_gain',$2,$3,$4,$5,'[]'::jsonb)
       RETURNING *`,
      [uid, baseline, current, gain, win],
    );
    return {
      ok: true,
      roi: r.rows[0],
      honesty: 'THINK: ROI compares calibration-snapshot halves; sparse history → low confidence.',
    };
  }

  async function listRoi(userId, { limit = 30 } = {}) {
    const r = await pool.query(
      `SELECT * FROM compound_roi_ledger WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [String(userId || '1'), Math.min(Math.max(Number(limit) || 30, 1), 100)],
    );
    return r.rows;
  }

  // ── #50 Ship-Queue Bridge (findings → governed factory) ──────────────
  async function bridgeFindingsToQueue(userId) {
    const uid = String(userId || '1');
    const findings = await govern.listFindings(uid, { status: 'open', limit: 20 });
    const created = [];
    for (const f of findings) {
      const r = await pool.query(
        `INSERT INTO ship_queue_bridge_items
           (user_id, source_kind, source_ref, title, proposed_change, target_file, queue_status, governed, refs)
         SELECT $1,'self_audit',$2,$3,$4,$5,'staged',TRUE,$6::jsonb
         WHERE NOT EXISTS (
           SELECT 1 FROM ship_queue_bridge_items
           WHERE user_id = $1 AND source_ref = $2 AND queue_status IN ('staged','submitted')
         )
         RETURNING *`,
        [
          uid,
          String(f.finding_id),
          f.title,
          f.proposed_fix,
          f.target_ref && f.target_ref.startsWith('law') ? null : f.target_ref,
          JSON.stringify([{ finding_id: f.finding_id, severity: f.severity }]),
        ],
      );
      if (r.rows[0]) {
        created.push(r.rows[0]);
        await govern.updateFinding({ findingId: f.finding_id, status: 'queued' });
      }
    }
    return {
      ok: true,
      bridged: created,
      honesty: 'KNOW: staged for the GOVERNED factory queue (SO-001) — not hand-shipped. Submission is a separate governed step.',
    };
  }

  async function listBridgeItems(userId, { status = 'staged', limit = 50 } = {}) {
    const r = await pool.query(
      `SELECT * FROM ship_queue_bridge_items
       WHERE user_id = $1 AND queue_status = $2
       ORDER BY created_at DESC LIMIT $3`,
      [String(userId || '1'), status || 'staged', Math.min(Math.max(Number(limit) || 50, 1), 200)],
    );
    return r.rows;
  }

  async function updateBridgeItem({ bridgeId, status = 'submitted' } = {}) {
    const st = ['staged', 'submitted', 'shipped', 'rejected'].includes(status) ? status : 'submitted';
    const r = await pool.query(
      `UPDATE ship_queue_bridge_items SET queue_status = $2, updated_at = NOW()
       WHERE bridge_id = $1 RETURNING *`,
      [String(bridgeId), st],
    );
    return r.rows[0] || null;
  }

  return {
    runCouncil,
    listCouncilSessions,
    benchmarkCohort,
    listBenchmarks,
    replayJudgment,
    listReplays,
    recordRoi,
    listRoi,
    bridgeFindingsToQueue,
    listBridgeItems,
    updateBridgeItem,
  };
}

export default createCognitiveCoreMultiply;
