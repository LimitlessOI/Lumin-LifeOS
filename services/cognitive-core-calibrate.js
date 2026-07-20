/**
 * SYNOPSIS: Cognitive Core Era-7 "Calibrate Me" — heuristics, calibration, trust transfer, rituals.
 * #31 Decision Compression, #32 Calibration Dashboard, #33 Cross-domain Trust Transfer,
 * #34 High-stakes Auto-Tree, #35 Recalibration Rituals.
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */

import { createCognitiveCoreJudgment } from './cognitive-core-judgment.js';
import { createCognitiveCoreTransmit } from './cognitive-core-transmit.js';

function clamp01(n, fb = 0.4) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fb;
}

const TIER_RANK = { refuse: 0, ask: 1, suggest: 2, allow: 3 };
const RANK_TIER = ['refuse', 'ask', 'suggest', 'allow'];

async function softQuery(pool, sql, params = []) {
  if (!pool?.query) return [];
  try {
    const r = await pool.query(sql, params);
    return r.rows || [];
  } catch {
    return [];
  }
}

const SEED_HEURISTICS = [
  {
    name: 'reversibility_first',
    rule: 'Prefer the reversible option when confidence < 0.7',
    when_to_use: 'high ambiguity, low evidence',
    when_not_to_use: 'irreversible stakes already accepted',
    domain: 'general',
  },
  {
    name: 'status_is_not_counsel',
    rule: 'Do not answer presence/vent turns with system status',
    when_to_use: 'relational / emotional turns',
    when_not_to_use: 'explicit ops/status questions',
    domain: 'comms',
  },
  {
    name: 'earn_before_act',
    rule: 'Refuse autonomy until domain n≥5 and accuracy supports tier',
    when_to_use: 'any can_act gate',
    when_not_to_use: 'never — Law 2',
    domain: 'delegation',
  },
  {
    name: 'name_the_miss_class',
    rule: 'Every wrong prediction gets one of 5 failure classes + correction',
    when_to_use: 'outcome capture',
    when_not_to_use: 'correct predictions',
    domain: 'calibration',
  },
  {
    name: 'second_order_on_high_stakes',
    rule: 'Auto-sketch a consequence tree when stakes=high',
    when_to_use: 'high-stakes decisions',
    when_not_to_use: 'low-stakes routine',
    domain: 'consequences',
  },
];

/**
 * @param {{ pool: import('pg').Pool, logger?: Console, callAI?: Function }} deps
 */
export function createCognitiveCoreCalibrate(deps = {}) {
  const pool = deps.pool;
  const logger = deps.logger || console;
  const journal = createCognitiveCoreJudgment({ pool, logger });
  const transmit = createCognitiveCoreTransmit({ pool, logger, callAI: deps.callAI });

  async function seedHeuristics(userId) {
    const uid = String(userId || '1');
    const created = [];
    for (const h of SEED_HEURISTICS) {
      const r = await pool.query(
        `INSERT INTO decision_heuristics
           (user_id, name, rule, when_to_use, when_not_to_use, domain, source, confidence, status)
         VALUES ($1,$2,$3,$4,$5,$6,'explicit',0.55,'active')
         ON CONFLICT (user_id, name) DO NOTHING
         RETURNING *`,
        [uid, h.name, h.rule, h.when_to_use, h.when_not_to_use, h.domain],
      );
      if (r.rows[0]) created.push(r.rows[0]);
    }
    return { ok: true, created_n: created.length, created };
  }

  async function listHeuristics(userId, { status = 'active', limit = 50 } = {}) {
    const r = await pool.query(
      `SELECT * FROM decision_heuristics
       WHERE user_id = $1 AND status = $2
       ORDER BY confidence DESC, activation_count DESC LIMIT $3`,
      [String(userId || '1'), status || 'active', Math.min(Math.max(Number(limit) || 50, 1), 200)],
    );
    return r.rows;
  }

  async function createHeuristic({
    userId,
    name,
    rule,
    whenToUse = null,
    whenNotToUse = null,
    domain = null,
    confidence = 0.45,
  } = {}) {
    const nm = String(name || '').trim();
    const rl = String(rule || '').trim();
    if (!nm || !rl) throw new Error('name_and_rule_required');
    const r = await pool.query(
      `INSERT INTO decision_heuristics
         (user_id, name, rule, when_to_use, when_not_to_use, domain, source, confidence, status)
       VALUES ($1,$2,$3,$4,$5,$6,'explicit',$7,'active')
       ON CONFLICT (user_id, name) DO UPDATE SET
         rule = EXCLUDED.rule,
         when_to_use = EXCLUDED.when_to_use,
         when_not_to_use = EXCLUDED.when_not_to_use,
         domain = EXCLUDED.domain,
         confidence = EXCLUDED.confidence,
         updated_at = NOW(),
         status = 'active'
       RETURNING *`,
      [
        String(userId || '1'),
        nm,
        rl,
        whenToUse,
        whenNotToUse,
        domain,
        clamp01(confidence, 0.45),
      ],
    );
    return { ok: true, heuristic: r.rows[0] };
  }

  async function activateHeuristic({ heuristicId, hit = false } = {}) {
    const r = await pool.query(
      `UPDATE decision_heuristics
       SET activation_count = activation_count + 1,
           hit_count = hit_count + CASE WHEN $2 THEN 1 ELSE 0 END,
           confidence = LEAST(0.95, confidence + CASE WHEN $2 THEN 0.02 ELSE -0.01 END),
           updated_at = NOW()
       WHERE heuristic_id = $1
       RETURNING *`,
      [String(heuristicId), !!hit],
    );
    return r.rows[0] || null;
  }

  async function getCalibrationDashboard(userId) {
    const uid = String(userId || '1');
    const scoreboard = await journal.getScoreboard(uid);
    const domains = scoreboard.by_domain || scoreboard.domains || [];
    const rows = [];
    for (const d of domains) {
      const n = Number(d.n) || 0;
      const accuracy = d.accuracy != null ? Number(d.accuracy) : null;
      const brier = d.brier_score != null ? Number(d.brier_score) : null;
      // Overconfidence proxy: high confidence wrong → high Brier with mid accuracy.
      const overconfidence = brier != null && accuracy != null
        ? clamp01(brier - (1 - accuracy) * 0.5, 0)
        : null;
      const underconfidence = accuracy != null && brier != null && accuracy > 0.75 && brier < 0.12
        ? clamp01(0.2 - brier, 0)
        : 0;
      const snap = {
        domain: d.domain,
        n,
        accuracy,
        brier_score: brier,
        overconfidence,
        underconfidence,
        delegation_tier: d.delegation_tier,
      };
      rows.push(snap);
      await pool.query(
        `INSERT INTO calibration_snapshots
           (user_id, domain, n, accuracy, brier_score, overconfidence, underconfidence, delegation_tier, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
        [
          uid,
          d.domain,
          n,
          accuracy,
          brier,
          overconfidence,
          underconfidence,
          d.delegation_tier || null,
          JSON.stringify({ source: 'dashboard' }),
        ],
      );
    }
    return {
      ok: true,
      overall: scoreboard.overall || null,
      domains: rows,
      honesty: 'KNOW: metrics from scoreboard. THINK: over/underconfidence are proxies until richer confidence bins exist.',
    };
  }

  async function proposeTrustTransfers(userId) {
    const uid = String(userId || '1');
    const domains = await softQuery(pool,
      `SELECT domain, n, accuracy, brier_score, delegation_tier
       FROM judgment_trust_by_domain WHERE user_id = $1`, [uid]);
    const strong = domains.filter((d) => (d.n || 0) >= 8 && (d.accuracy || 0) >= 0.8);
    const weak = domains.filter((d) => (d.n || 0) < 5 || (d.accuracy || 0) < 0.65);
    const created = [];
    for (const from of strong.slice(0, 3)) {
      for (const to of weak.slice(0, 3)) {
        if (from.domain === to.domain) continue;
        const proposed = RANK_TIER[Math.min(TIER_RANK[from.delegation_tier] || 0, 1)] || 'ask';
        const rationale =
          `Strong calibration in ${from.domain} (n=${from.n}, acc=${Number(from.accuracy).toFixed(2)}) ` +
          `may inform cautious ${proposed} tier in ${to.domain} — still requires local evidence (Law 2).`;
        const r = await pool.query(
          `INSERT INTO trust_transfer_proposals
             (user_id, from_domain, to_domain, proposed_tier, rationale, evidence, status)
           SELECT $1,$2,$3,$4,$5,$6::jsonb,'proposed'
           WHERE NOT EXISTS (
             SELECT 1 FROM trust_transfer_proposals
             WHERE user_id = $1 AND from_domain = $2 AND to_domain = $3 AND status = 'proposed'
           )
           RETURNING *`,
          [
            uid,
            from.domain,
            to.domain,
            proposed,
            rationale,
            JSON.stringify([{ from, to }]),
          ],
        );
        if (r.rows[0]) created.push(r.rows[0]);
      }
    }
    return { ok: true, proposals: created };
  }

  async function listTrustTransfers(userId, { status = 'proposed', limit = 30 } = {}) {
    const r = await pool.query(
      `SELECT * FROM trust_transfer_proposals
       WHERE user_id = $1 AND status = $2
       ORDER BY created_at DESC LIMIT $3`,
      [String(userId || '1'), status || 'proposed', Math.min(Math.max(Number(limit) || 30, 1), 100)],
    );
    return r.rows;
  }

  async function resolveTrustTransfer({ transferId, status = 'accepted' } = {}) {
    const st = ['accepted', 'rejected', 'expired', 'proposed'].includes(status) ? status : 'accepted';
    const r = await pool.query(
      `UPDATE trust_transfer_proposals SET status = $2, updated_at = NOW()
       WHERE transfer_id = $1 RETURNING *`,
      [String(transferId), st],
    );
    return r.rows[0] || null;
  }

  async function maybeAutoTree({
    userId,
    question,
    stakes = 'high',
    decisionId = null,
  } = {}) {
    const uid = String(userId || '1');
    const q = String(question || '').trim();
    if (!q) return { ok: false, error: 'question_required' };
    if (!['high', 'medium'].includes(stakes)) {
      return { ok: true, skipped: true, reason: 'stakes_below_threshold' };
    }
    const treeOut = await transmit.buildConsequenceTree({
      userId: uid,
      question: q,
      depth: stakes === 'high' ? 8 : 5,
      decisionId,
    });
    const treeId = treeOut.tree?.tree_id || null;
    const r = await pool.query(
      `INSERT INTO high_stakes_tree_triggers
         (user_id, decision_id, question, stakes, tree_id, auto_fired)
       VALUES ($1,$2,$3,$4,$5,TRUE)
       RETURNING *`,
      [uid, decisionId || null, q, stakes, treeId],
    );
    return {
      ok: true,
      trigger: r.rows[0],
      tree: treeOut.tree || null,
      honesty: treeOut.honesty,
    };
  }

  async function listAutoTreeTriggers(userId, { limit = 20 } = {}) {
    const r = await pool.query(
      `SELECT * FROM high_stakes_tree_triggers WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [String(userId || '1'), Math.min(Math.max(Number(limit) || 20, 1), 100)],
    );
    return r.rows;
  }

  async function runRecalibrationRitual({
    userId,
    triggerKind = 'manual',
    domain = null,
  } = {}) {
    const uid = String(userId || '1');
    const dash = await getCalibrationDashboard(uid);
    const findings = [];
    const adjustments = [];
    for (const d of (dash.domains || dash.by_domain || [])) {
      if (domain && d.domain !== domain) continue;
      if (d.n < 5) {
        findings.push({ domain: d.domain, kind: 'thin_evidence', detail: `n=${d.n}` });
        adjustments.push({ domain: d.domain, action: 'hold_refuse', reason: 'Law 2 — n<5' });
      } else if ((d.overconfidence || 0) > 0.25) {
        findings.push({ domain: d.domain, kind: 'overconfidence', detail: d.overconfidence });
        adjustments.push({ domain: d.domain, action: 'lower_confidence_bias', reason: 'Brier/accuracy proxy' });
      } else if ((d.accuracy || 0) >= 0.85 && d.delegation_tier === 'refuse') {
        findings.push({ domain: d.domain, kind: 'under_delegated', detail: d.accuracy });
        adjustments.push({ domain: d.domain, action: 'consider_ask_tier', reason: 'earned evidence' });
      }
    }
    const r = await pool.query(
      `INSERT INTO recalibration_rituals
         (user_id, trigger_kind, domain, findings, adjustments, status)
       VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,'completed')
       RETURNING *`,
      [
        uid,
        ['manual', 'outcome', 'schedule', 'debt_threshold'].includes(triggerKind) ? triggerKind : 'manual',
        domain,
        JSON.stringify(findings),
        JSON.stringify(adjustments),
      ],
    );
    logger.info?.('[COGNITIVE-CORE/calibrate] ritual', { ritual_id: r.rows[0]?.ritual_id, findings_n: findings.length });
    return { ok: true, ritual: r.rows[0], findings, adjustments };
  }

  async function listRituals(userId, { limit = 20 } = {}) {
    const r = await pool.query(
      `SELECT * FROM recalibration_rituals WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [String(userId || '1'), Math.min(Math.max(Number(limit) || 20, 1), 100)],
    );
    return r.rows;
  }

  return {
    seedHeuristics,
    listHeuristics,
    createHeuristic,
    activateHeuristic,
    getCalibrationDashboard,
    proposeTrustTransfers,
    listTrustTransfers,
    resolveTrustTransfer,
    maybeAutoTree,
    listAutoTreeTriggers,
    runRecalibrationRitual,
    listRituals,
  };
}

export default createCognitiveCoreCalibrate;
