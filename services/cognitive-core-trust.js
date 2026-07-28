/**
 * SYNOPSIS: Cognitive Core Era-4 "Trust Me" — earned delegation + inform/override.
 * #19 Expert Collaboration, #20 Memory Compression, #21 Legacy Recorder,
 * #22 Apprenticeship, #23 Delegation Confidence, #24 Autonomous Advisor.
 * Law 2: can_act only when scoreboard/scope evidence earns it. Never invent autonomy.
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */

import { createCognitiveCoreJudgment } from './cognitive-core-judgment.js';
import { listAdvisors } from '../config/cognitive-core-advisors.js';

function parseJson(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  try { return JSON.parse(text); } catch { /* fallthrough */ }
  const s = text.indexOf('{');
  const e = text.lastIndexOf('}');
  if (s >= 0 && e > s) { try { return JSON.parse(text.slice(s, e + 1)); } catch { return null; } }
  return null;
}

function clamp01(n, fb = 0.4) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fb;
}

function arr(v) { return Array.isArray(v) ? v : []; }

const STAKES_RANK = { low: 1, medium: 2, high: 3 };
const TIER_RANK = { refuse: 0, ask: 1, suggest: 2, allow: 3 };

/**
 * @param {{ pool: import('pg').Pool, logger?: Console, callAI?: Function }} deps
 */
export function createCognitiveCoreTrust(deps = {}) {
  const pool = deps.pool;
  const logger = deps.logger || console;
  const journal = createCognitiveCoreJudgment({ pool, logger });

  let _callAI = deps.callAI || null;
  async function callAI(prompt, opts = {}) {
    if (!_callAI) {
      const mod = await import('./never-stop-product-factory.js');
      _callAI = mod.defaultPlannerCallModel?.() || null;
    }
    if (!_callAI) return { ok: false, reason: 'no_model_available', text: '' };
    try {
      const text = await _callAI('planner', prompt, { maxOutputTokens: opts.maxOutputTokens || 1600 });
      return { ok: true, text: String(text || '') };
    } catch (err) {
      return { ok: false, reason: err.message, text: '' };
    }
  }

  /** #23 — live can-act from scoreboard + optional founder-approved scope. */
  async function canAct({ userId, domain = 'general', stakes = 'medium', action = null }) {
    if (!pool) return { ok: false, reason: 'no_pool', can_act: false, action: 'refuse' };
    const board = await journal.getScoreboard(String(userId));
    const row = (board.by_domain || []).find((d) => d.domain === domain) || null;
    const scoreTier = row?.delegation_tier || 'refuse';
    let scope = null;
    try {
      const { rows } = await pool.query(
        `SELECT * FROM delegation_scopes WHERE user_id = $1 AND domain = $2 AND status = 'active' LIMIT 1`,
        [String(userId), String(domain)],
      );
      scope = rows[0] || null;
    } catch { /* table may not exist yet */ }

    const tier = scope?.founder_approved
      ? (TIER_RANK[scope.delegation_tier] <= TIER_RANK[scoreTier]
        ? scope.delegation_tier
        : scoreTier) // never exceed earned scoreboard tier (Law 2)
      : scoreTier;

    const stakesMax = scope?.stakes_max || 'low';
    const stakesOk = (STAKES_RANK[stakes] || 2) <= (STAKES_RANK[stakesMax] || 1)
      || (!scope && stakes === 'low' && tier === 'suggest')
      || tier === 'allow';

    const actionAllowed = !action || !scope?.approved_actions?.length
      || arr(scope.approved_actions).some((a) => String(a).toLowerCase() === String(action).toLowerCase());

    let allow = false;
    let disposition = tier;
    if (tier === 'allow' && stakesOk && actionAllowed) {
      allow = true;
      disposition = 'allow';
    } else if (tier === 'suggest' && stakes === 'low' && actionAllowed) {
      allow = true;
      disposition = 'suggest';
    } else if (tier === 'ask') {
      disposition = 'ask';
    } else {
      disposition = 'refuse';
    }

    return {
      ok: true,
      domain,
      stakes,
      action: disposition,
      can_act: allow,
      delegation_tier: tier,
      scoreboard_tier: scoreTier,
      scope_tier: scope?.delegation_tier || null,
      founder_approved_scope: Boolean(scope?.founder_approved),
      stakes_max: stakesMax,
      accuracy: row?.accuracy ?? scope?.accuracy ?? null,
      brier_score: row?.brier_score ?? scope?.brier_score ?? null,
      n: row?.n ?? scope?.n ?? 0,
      law2: 'trust_earned_empirically',
    };
  }

  async function syncDelegationScopes(userId) {
    if (!pool) return { ok: false, reason: 'no_pool' };
    const board = await journal.getScoreboard(String(userId));
    const synced = [];
    for (const d of board.by_domain || []) {
      // Law 2: scoreboard updates tier unless founder already approved a scope
      // (approved scopes keep their tier but still refresh accuracy/n).
      const { rows } = await pool.query(
        `INSERT INTO delegation_scopes
           (user_id, domain, delegation_tier, stakes_max, accuracy, brier_score, n, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
         ON CONFLICT (user_id, domain) DO UPDATE SET
           delegation_tier = CASE WHEN delegation_scopes.founder_approved
             THEN delegation_scopes.delegation_tier ELSE EXCLUDED.delegation_tier END,
           accuracy = EXCLUDED.accuracy,
           brier_score = EXCLUDED.brier_score,
           n = EXCLUDED.n,
           updated_at = NOW()
         RETURNING *`,
        [
          String(userId), d.domain, d.delegation_tier || 'refuse',
          d.delegation_tier === 'allow' ? 'medium' : 'low',
          d.accuracy ?? null, d.brier_score ?? null, d.n || 0,
        ],
      );
      if (rows[0]) synced.push(rows[0]);
    }
    return { ok: true, scopes: synced, overall: board.overall || null };
  }

  async function listDelegationScopes(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM delegation_scopes WHERE user_id = $1 ORDER BY n DESC, updated_at DESC`,
      [String(userId)],
    );
    return rows;
  }

  async function approveDelegationScope({ userId, domain, stakesMax = 'low', approvedActions = [], notes = null }) {
    const gate = await canAct({ userId, domain, stakes: stakesMax });
    if (gate.scoreboard_tier === 'refuse' || (gate.n || 0) < 5) {
      return {
        ok: false,
        reason: 'insufficient_evidence',
        note: 'Law 2: founder cannot approve allow/suggest until scoreboard earns ask+ with n>=5',
        gate,
      };
    }
    const tier = gate.scoreboard_tier;
    const { rows } = await pool.query(
      `INSERT INTO delegation_scopes
         (user_id, domain, delegation_tier, stakes_max, approved_actions, accuracy, brier_score, n, founder_approved, notes, updated_at)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,$8,TRUE,$9,NOW())
       ON CONFLICT (user_id, domain) DO UPDATE SET
         delegation_tier = EXCLUDED.delegation_tier,
         stakes_max = EXCLUDED.stakes_max,
         approved_actions = EXCLUDED.approved_actions,
         accuracy = EXCLUDED.accuracy,
         brier_score = EXCLUDED.brier_score,
         n = EXCLUDED.n,
         founder_approved = TRUE,
         notes = EXCLUDED.notes,
         status = 'active',
         updated_at = NOW()
       RETURNING *`,
      [
        String(userId), String(domain), tier, ['low', 'medium', 'high'].includes(stakesMax) ? stakesMax : 'low',
        JSON.stringify(arr(approvedActions)), gate.accuracy, gate.brier_score, gate.n || 0,
        notes ? String(notes).slice(0, 2000) : null,
      ],
    );
    return { ok: true, scope: rows[0], gate };
  }

  /** #24 — propose a bounded autonomous action; execute only if can_act. */
  async function proposeAutonomousAction({
    userId, domain = 'general', proposedAction, reasoning = null,
    stakes = 'low', decisionId = null, executeIfAllowed = false,
  }) {
    if (!proposedAction) throw new Error('proposed_action_required');
    const gate = await canAct({ userId, domain, stakes, action: proposedAction });
    let status = 'refused';
    if (gate.can_act && executeIfAllowed) status = 'executed';
    else if (gate.can_act) status = 'proposed';
    else if (gate.action === 'ask' || gate.action === 'suggest') status = 'informed';
    else status = 'refused';

    const { rows } = await pool.query(
      `INSERT INTO autonomous_actions
         (user_id, domain, decision_id, proposed_action, reasoning, stakes, can_act_snapshot, status, executed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9) RETURNING *`,
      [
        String(userId), String(domain), decisionId,
        String(proposedAction).slice(0, 2000),
        reasoning ? String(reasoning).slice(0, 4000) : null,
        ['low', 'medium', 'high'].includes(stakes) ? stakes : 'low',
        JSON.stringify(gate),
        status,
        status === 'executed' ? new Date() : null,
      ],
    );
    return {
      ok: true,
      action: rows[0],
      can_act: gate.can_act,
      disposition: gate.action,
      note: status === 'refused'
        ? 'Law 2 refuse — not enough evidence to act; logged for review'
        : status === 'informed'
          ? 'Kept you informed; awaiting override or approval'
          : status === 'executed'
            ? 'Bounded action marked executed (caller must perform real side-effect)'
            : 'Proposed — confirm or override',
    };
  }

  async function overrideAutonomousAction({ actionId, overrideNote, status = 'overridden' }) {
    const st = ['overridden', 'executed', 'refused', 'informed'].includes(status) ? status : 'overridden';
    const { rows } = await pool.query(
      `UPDATE autonomous_actions
       SET status = $2, override_note = $3,
           executed_at = CASE WHEN $2 = 'executed' THEN COALESCE(executed_at, NOW()) ELSE executed_at END
       WHERE action_id = $1 RETURNING *`,
      [actionId, st, overrideNote ? String(overrideNote).slice(0, 2000) : null],
    );
    return rows[0] || null;
  }

  async function listAutonomousActions(userId, { status = null, limit = 50 } = {}) {
    const params = [String(userId)];
    let sql = `SELECT * FROM autonomous_actions WHERE user_id = $1`;
    if (status) {
      params.push(status);
      sql += ` AND status = $2`;
    }
    params.push(Math.min(200, Math.max(1, Number(limit) || 50)));
    sql += ` ORDER BY created_at DESC LIMIT $${params.length}`;
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  /** #19 — structured multi-advisor debate (not averaged mush). */
  async function runExpertDebate({
    userId, question, advisorIds = null, decisionId = null, options = [],
  }) {
    if (!question) throw new Error('question_required');
    const catalog = listAdvisors();
    const ids = arr(advisorIds).length
      ? arr(advisorIds).map(String)
      : catalog.slice(0, 4).map((a) => a.id);
    const advisors = ids.map((id) => catalog.find((a) => a.id === id)).filter(Boolean);
    if (advisors.length < 2) {
      return { ok: false, reason: 'need_at_least_two_advisors' };
    }
    const prompt = `You are the LifeOS Cognitive Core Expert Collaboration Mode (Era-4 #19).
Run a STRUCTURED debate among these reasoning-style lenses. Do NOT average them.
Expose disagreement first (tension), then one synthesis that names the trade.

Question: ${question}
Options: ${JSON.stringify(options)}
Advisors (lenses, NOT real people): ${JSON.stringify(advisors.map((a) => ({
    id: a.id, label: a.label, style: a.style || a.reasoning_style, simulation_note: a.simulation_note,
  })))}

Return ONLY JSON:
{
  "rounds":[{"advisor_id":"...","stance":"...","argument":"...","objects_to":"..."}],
  "tension_summary":"where they conflict",
  "synthesis":"named trade + recommendation hypothesis",
  "confidence":0.4
}`;
    const res = await callAI(prompt, { maxOutputTokens: 1800 });
    const parsed = parseJson(res.text);
    if (!parsed) return { ok: false, reason: res.ok ? 'debate_parse_failed' : res.reason };
    const { rows } = await pool.query(
      `INSERT INTO expert_debates
         (user_id, decision_id, question, advisor_ids, rounds, synthesis, tension_summary, confidence, source)
       VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8,'explicit') RETURNING *`,
      [
        String(userId), decisionId, String(question).slice(0, 2000),
        JSON.stringify(ids), JSON.stringify(arr(parsed.rounds)),
        String(parsed.synthesis || '').slice(0, 4000),
        String(parsed.tension_summary || '').slice(0, 2000),
        clamp01(parsed.confidence, 0.4),
      ],
    );
    return { ok: true, debate: rows[0] };
  }

  /** #20 — compress recent decisions into high-level mental models. */
  async function compressMemory({ userId, lookback = 20 }) {
    if (!pool) return { ok: false, reason: 'no_pool' };
    const { rows: decisions } = await pool.query(
      `SELECT d.decision_id, d.domain, d.question, d.options, o.actual_option, o.stated_reasons
       FROM judgment_decisions d
       LEFT JOIN judgment_outcomes o ON o.decision_id = d.decision_id
       WHERE d.user_id = $1 ORDER BY d.created_at DESC LIMIT $2`,
      [String(userId), Math.min(50, Math.max(5, Number(lookback) || 20))],
    );
    if (!decisions.length) return { ok: true, models: [], note: 'no_decisions_yet' };
    const prompt = `You are the LifeOS Cognitive Core Memory Compression engine (Era-4 #20).
Distill these decisions into 2–5 HIGH-LEVEL mental models (hypotheses), not a dump of facts.
Each model: label, summary, domain, confidence, evidence bullets.

Decisions: ${JSON.stringify(decisions)}

Return ONLY JSON:
{"models":[{"label":"...","summary":"...","domain":"...","confidence":0.4,"evidence":["..."]}]}`;
    const res = await callAI(prompt, { maxOutputTokens: 1600 });
    const parsed = parseJson(res.text);
    if (!parsed || !Array.isArray(parsed.models)) {
      return { ok: false, reason: res.ok ? 'compress_parse_failed' : res.reason };
    }
    const created = [];
    for (const m of parsed.models.slice(0, 5)) {
      if (!m.label || !m.summary) continue;
      const { rows } = await pool.query(
        `INSERT INTO mental_models (user_id, label, summary, domain, evidence, confidence)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6) RETURNING *`,
        [
          String(userId), String(m.label).slice(0, 300), String(m.summary).slice(0, 4000),
          m.domain ? String(m.domain).slice(0, 120) : null,
          JSON.stringify(arr(m.evidence)), clamp01(m.confidence, 0.4),
        ],
      );
      created.push(rows[0]);
    }
    return { ok: true, models: created };
  }

  async function listMentalModels(userId, { status = 'active' } = {}) {
    const { rows } = await pool.query(
      `SELECT * FROM mental_models WHERE user_id = $1 AND status = $2 ORDER BY confidence DESC, updated_at DESC`,
      [String(userId), status],
    );
    return rows;
  }

  /** #21 Legacy Recorder */
  async function recordLegacy({
    userId, kind = 'principle', title, content, domain = null, confidence = 0.5, evidence = [],
  }) {
    if (!title || !content) throw new Error('title_and_content_required');
    const k = ['principle', 'heuristic', 'story', 'failure', 'lesson'].includes(kind) ? kind : 'principle';
    const { rows } = await pool.query(
      `INSERT INTO legacy_entries (user_id, kind, title, content, domain, confidence, evidence)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb) RETURNING *`,
      [
        String(userId), k, String(title).slice(0, 300), String(content).slice(0, 8000),
        domain ? String(domain).slice(0, 120) : null, clamp01(confidence, 0.5),
        JSON.stringify(arr(evidence)),
      ],
    );
    return rows[0];
  }

  async function listLegacy(userId, { kind = null, status = 'active' } = {}) {
    const params = [String(userId), status];
    let sql = `SELECT * FROM legacy_entries WHERE user_id = $1 AND status = $2`;
    if (kind) {
      params.push(kind);
      sql += ` AND kind = $3`;
    }
    sql += ` ORDER BY updated_at DESC LIMIT 100`;
    const { rows } = await pool.query(sql, params);
    return rows;
  }

  /** #22 Apprenticeship — explain the PROCESS behind a decision. */
  async function teachApprenticeship({ userId, decisionId }) {
    const pack = await journal.getDecision(decisionId);
    if (!pack) return { ok: false, reason: 'decision_not_found' };
    const prompt = `You are the LifeOS Cognitive Core Apprenticeship Mode (Era-4 #22).
Teach someone ELSE to think like this decision process — not just the conclusion.
Explain the process, list teachable steps, and name traps to avoid. Hypothesis language only.

Question: ${pack.decision.question}
Options: ${JSON.stringify(pack.decision.options)}
Prediction: ${JSON.stringify(pack.prediction || null)}
Outcome: ${JSON.stringify(pack.outcome || null)}
Tension: ${JSON.stringify(pack.prediction?.tension_ledger || [])}

Return ONLY JSON:
{"process_explanation":"...","teachable_steps":["..."],"traps_to_avoid":["..."],"confidence":0.4}`;
    const res = await callAI(prompt, { maxOutputTokens: 1400 });
    const parsed = parseJson(res.text);
    if (!parsed?.process_explanation) {
      return { ok: false, reason: res.ok ? 'apprentice_parse_failed' : res.reason };
    }
    const { rows } = await pool.query(
      `INSERT INTO apprenticeship_lessons
         (user_id, decision_id, question, process_explanation, teachable_steps, traps_to_avoid, confidence)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7) RETURNING *`,
      [
        String(userId || pack.decision.user_id), decisionId,
        String(pack.decision.question || '').slice(0, 2000),
        String(parsed.process_explanation).slice(0, 6000),
        JSON.stringify(arr(parsed.teachable_steps)),
        JSON.stringify(arr(parsed.traps_to_avoid)),
        clamp01(parsed.confidence, 0.4),
      ],
    );
    return { ok: true, lesson: rows[0] };
  }

  return {
    canAct,
    syncDelegationScopes,
    listDelegationScopes,
    approveDelegationScope,
    proposeAutonomousAction,
    overrideAutonomousAction,
    listAutonomousActions,
    runExpertDebate,
    compressMemory,
    listMentalModels,
    recordLegacy,
    listLegacy,
    teachApprenticeship,
  };
}

export default createCognitiveCoreTrust;
