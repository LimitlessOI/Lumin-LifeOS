/**
 * SYNOPSIS: Cognitive Core Era-8 "Compound Me" — cross-product can_act + continuous compound.
 * #36 Product consumers, #37 Judgment→Improvement, #38 Compound log,
 * #39 Role sync, #40 Autonomy ladder review.
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */

import { createCognitiveCoreTrust } from './cognitive-core-trust.js';
import { createCognitiveCoreJudgment } from './cognitive-core-judgment.js';
import { createCognitiveCoreTransmit } from './cognitive-core-transmit.js';
import { createCognitiveCorePreserve } from './cognitive-core-preserve.js';

const DEFAULT_CONSUMERS = [
  { product_id: 'site-builder', label: 'Site Builder', domains: ['shipping', 'marketing', 'general'] },
  { product_id: 'wellness-studio', label: 'Wellness Studio', domains: ['health', 'general'] },
  { product_id: 'marketingos', label: 'MarketingOS', domains: ['marketing', 'comms', 'general'] },
  { product_id: 'lifeos', label: 'LifeOS Chair', domains: ['general', 'comms', 'shipping', 'delegation'] },
];

const TIER_RANK = { refuse: 0, ask: 1, suggest: 2, allow: 3 };
const RANK_TIER = ['refuse', 'ask', 'suggest', 'allow'];

/**
 * @param {{ pool: import('pg').Pool, logger?: Console }} deps
 */
export function createCognitiveCoreCompound(deps = {}) {
  const pool = deps.pool;
  const logger = deps.logger || console;
  const trust = createCognitiveCoreTrust({ pool, logger });
  const journal = createCognitiveCoreJudgment({ pool, logger });
  const transmit = createCognitiveCoreTransmit({ pool, logger });
  const preserve = createCognitiveCorePreserve({ pool, logger });

  async function registerDefaultConsumers() {
    const created = [];
    for (const c of DEFAULT_CONSUMERS) {
      const r = await pool.query(
        `INSERT INTO cognitive_product_consumers
           (product_id, label, domains, can_act_enabled, status)
         VALUES ($1,$2,$3::jsonb,TRUE,'active')
         ON CONFLICT (product_id) DO UPDATE SET
           label = EXCLUDED.label,
           domains = EXCLUDED.domains,
           updated_at = NOW(),
           status = 'active'
         RETURNING *`,
        [c.product_id, c.label, JSON.stringify(c.domains)],
      );
      if (r.rows[0]) created.push(r.rows[0]);
    }
    return { ok: true, consumers: created };
  }

  async function listConsumers() {
    const r = await pool.query(
      `SELECT * FROM cognitive_product_consumers WHERE status = 'active' ORDER BY product_id`,
    );
    return r.rows;
  }

  async function canActForProduct({
    userId,
    productId,
    domain,
    stakes = 'low',
    actionHint = null,
  } = {}) {
    const uid = String(userId || '1');
    const pid = String(productId || '').trim();
    if (!pid) return { ok: false, error: 'product_id_required' };
    const consumers = await pool.query(
      `SELECT * FROM cognitive_product_consumers WHERE product_id = $1 AND status = 'active'`,
      [pid],
    );
    if (!consumers.rows[0]) {
      return { ok: false, error: 'unknown_product', hint: 'POST /compound/consumers/seed' };
    }
    if (!consumers.rows[0].can_act_enabled) {
      return { ok: true, can_act: false, action: 'refuse', reason: 'consumer_paused' };
    }
    const gate = await trust.canAct({
      userId: uid,
      domain: domain || 'general',
      stakes,
      action: actionHint,
    });
    await pool.query(
      `INSERT INTO cognitive_can_act_calls
         (user_id, product_id, domain, stakes, can_act, action, snapshot)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
      [
        uid,
        pid,
        domain || 'general',
        stakes,
        !!gate.can_act,
        gate.action || 'refuse',
        JSON.stringify(gate),
      ],
    );
    await appendCompoundLog({
      userId: uid,
      eventKind: 'can_act_call',
      summary: `${pid}:${domain || 'general'} → ${gate.can_act ? 'allowish' : 'refuse'} (${gate.action})`,
      delta: { can_act: gate.can_act, action: gate.action, stakes },
      refs: [{ product_id: pid, domain: domain || 'general' }],
    });
    return { ok: true, product_id: pid, ...gate };
  }

  async function listCanActCalls(userId, { productId = null, limit = 50 } = {}) {
    if (productId) {
      const r = await pool.query(
        `SELECT * FROM cognitive_can_act_calls
         WHERE user_id = $1 AND product_id = $2
         ORDER BY created_at DESC LIMIT $3`,
        [String(userId || '1'), productId, Math.min(Math.max(Number(limit) || 50, 1), 200)],
      );
      return r.rows;
    }
    const r = await pool.query(
      `SELECT * FROM cognitive_can_act_calls WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [String(userId || '1'), Math.min(Math.max(Number(limit) || 50, 1), 200)],
    );
    return r.rows;
  }

  async function appendCompoundLog({
    userId,
    eventKind,
    summary,
    delta = {},
    refs = [],
  } = {}) {
    const r = await pool.query(
      `INSERT INTO cognitive_compound_log
         (user_id, event_kind, summary, delta, refs)
       VALUES ($1,$2,$3,$4::jsonb,$5::jsonb)
       RETURNING *`,
      [
        String(userId || '1'),
        String(eventKind || 'event'),
        String(summary || '').slice(0, 500),
        JSON.stringify(delta || {}),
        JSON.stringify(refs || []),
      ],
    );
    return r.rows[0];
  }

  async function listCompoundLog(userId, { limit = 50 } = {}) {
    const r = await pool.query(
      `SELECT * FROM cognitive_compound_log WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [String(userId || '1'), Math.min(Math.max(Number(limit) || 50, 1), 200)],
    );
    return r.rows;
  }

  async function proposeImprovementsFromDebt(userId) {
    const uid = String(userId || '1');
    await transmit.refreshDebt(uid);
    const debt = await transmit.listDebt(uid, { status: 'open', limit: 10 });
    const created = [];
    for (const item of debt.slice(0, 6)) {
      const proposed_change = item.kind === 'open_decision'
        ? 'Capture outcome for open decision so scoreboard can calibrate'
        : item.kind === 'weak_program'
          ? 'Gather evidence for or retire weak program hypothesis'
          : item.kind === 'unpaid_prediction'
            ? 'Record outcome against unpaid prediction'
            : 'Resolve cognitive debt item';
      const r = await pool.query(
        `INSERT INTO judgment_improvement_proposals
           (user_id, source_kind, source_ref, title, proposed_change, target_file, status, evidence)
         SELECT $1,'debt',$2,$3,$4,NULL,'proposed',$5::jsonb
         WHERE NOT EXISTS (
           SELECT 1 FROM judgment_improvement_proposals
           WHERE user_id = $1 AND source_ref = $2 AND status = 'proposed'
         )
         RETURNING *`,
        [
          uid,
          String(item.debt_id),
          item.title,
          proposed_change,
          JSON.stringify([{ debt_id: item.debt_id, kind: item.kind }]),
        ],
      );
      if (r.rows[0]) {
        created.push(r.rows[0]);
        await appendCompoundLog({
          userId: uid,
          eventKind: 'improvement_proposed',
          summary: r.rows[0].title,
          delta: { proposal_id: r.rows[0].proposal_id },
          refs: [{ debt_id: item.debt_id }],
        });
      }
    }
    return { ok: true, proposals: created };
  }

  async function listImprovementProposals(userId, { status = 'proposed', limit = 50 } = {}) {
    const r = await pool.query(
      `SELECT * FROM judgment_improvement_proposals
       WHERE user_id = $1 AND status = $2
       ORDER BY created_at DESC LIMIT $3`,
      [String(userId || '1'), status || 'proposed', Math.min(Math.max(Number(limit) || 50, 1), 200)],
    );
    return r.rows;
  }

  async function updateImprovementProposal({ proposalId, status } = {}) {
    const st = ['proposed', 'queued', 'shipped', 'rejected', 'superseded'].includes(status)
      ? status
      : 'queued';
    const r = await pool.query(
      `UPDATE judgment_improvement_proposals
       SET status = $2, updated_at = NOW()
       WHERE proposal_id = $1 RETURNING *`,
      [String(proposalId), st],
    );
    return r.rows[0] || null;
  }

  async function syncRolePackage({
    userId,
    packageId,
    roleLabel,
    direction = 'export',
  } = {}) {
    const uid = String(userId || '1');
    const role = String(roleLabel || '').trim();
    if (!role) return { ok: false, error: 'role_label_required' };
    let pkg = null;
    if (packageId) {
      pkg = await preserve.getPackage(packageId);
      if (!pkg || pkg.status !== 'sealed') return { ok: false, error: 'sealed_package_required' };
    }
    const provenance = {
      package_id: pkg?.package_id || null,
      package_label: pkg?.label || null,
      framing_note: preserve.FRAMING,
      synced_at: new Date().toISOString(),
    };
    const r = await pool.query(
      `INSERT INTO judgment_role_syncs
         (user_id, package_id, role_label, direction, provenance, status)
       VALUES ($1,$2,$3,$4,$5::jsonb,'recorded')
       RETURNING *`,
      [
        uid,
        pkg?.package_id || null,
        role,
        ['export', 'import', 'bidirectional'].includes(direction) ? direction : 'export',
        JSON.stringify(provenance),
      ],
    );
    await appendCompoundLog({
      userId: uid,
      eventKind: 'role_sync',
      summary: `Synced judgment to role ${role}`,
      delta: { sync_id: r.rows[0].sync_id, direction },
      refs: [{ package_id: pkg?.package_id, role }],
    });
    return { ok: true, sync: r.rows[0] };
  }

  async function listRoleSyncs(userId, { limit = 30 } = {}) {
    const r = await pool.query(
      `SELECT * FROM judgment_role_syncs WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [String(userId || '1'), Math.min(Math.max(Number(limit) || 30, 1), 100)],
    );
    return r.rows;
  }

  async function reviewAutonomyLadder(userId) {
    const uid = String(userId || '1');
    const scoreboard = await journal.getScoreboard(uid);
    const created = [];
    for (const d of (scoreboard.by_domain || scoreboard.domains || [])) {
      const n = Number(d.n) || 0;
      const accuracy = Number(d.accuracy) || 0;
      const brier = d.brier_score != null ? Number(d.brier_score) : null;
      const current = d.delegation_tier || 'refuse';
      let suggested = current;
      let direction = 'hold';
      let rationale = 'Hold — evidence insufficient to change tier';

      if (n < 5) {
        suggested = 'refuse';
        direction = current === 'refuse' ? 'hold' : 'demote';
        rationale = 'Law 2: n<5 → refuse';
      } else if (accuracy >= 0.9 && (brier == null || brier <= 0.15) && TIER_RANK[current] < 3) {
        suggested = 'allow';
        direction = 'promote';
        rationale = 'High accuracy + tight Brier — consider allow';
      } else if (accuracy >= 0.8 && (brier == null || brier <= 0.22) && TIER_RANK[current] < 2) {
        suggested = 'suggest';
        direction = 'promote';
        rationale = 'Strong calibration — consider suggest';
      } else if (accuracy >= 0.65 && TIER_RANK[current] < 1) {
        suggested = 'ask';
        direction = 'promote';
        rationale = 'Adequate accuracy — consider ask';
      } else if (accuracy < 0.55 && TIER_RANK[current] > 0) {
        suggested = RANK_TIER[Math.max(0, TIER_RANK[current] - 1)];
        direction = 'demote';
        rationale = 'Accuracy below 0.55 — demote one rung';
      }

      if (direction === 'hold' && suggested === current) {
        // still record a hold review for visibility when n>=5
        if (n < 5) continue;
      }

      const r = await pool.query(
        `INSERT INTO autonomy_ladder_reviews
           (user_id, domain, current_tier, suggested_tier, direction, rationale, scoreboard_snapshot, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,'suggested')
         RETURNING *`,
        [
          uid,
          d.domain,
          current,
          suggested,
          direction,
          rationale,
          JSON.stringify({ n, accuracy, brier_score: brier }),
        ],
      );
      if (r.rows[0]) created.push(r.rows[0]);
    }
    await appendCompoundLog({
      userId: uid,
      eventKind: 'ladder_review',
      summary: `Autonomy ladder review: ${created.length} domain suggestions`,
      delta: { reviews_n: created.length },
      refs: created.map((c) => ({ review_id: c.review_id, domain: c.domain })),
    });
    return { ok: true, reviews: created };
  }

  async function listLadderReviews(userId, { status = 'suggested', limit = 50 } = {}) {
    const r = await pool.query(
      `SELECT * FROM autonomy_ladder_reviews
       WHERE user_id = $1 AND status = $2
       ORDER BY created_at DESC LIMIT $3`,
      [String(userId || '1'), status || 'suggested', Math.min(Math.max(Number(limit) || 50, 1), 200)],
    );
    return r.rows;
  }

  async function resolveLadderReview({ reviewId, status = 'applied' } = {}) {
    const st = ['applied', 'dismissed', 'suggested'].includes(status) ? status : 'applied';
    const r = await pool.query(
      `UPDATE autonomy_ladder_reviews SET status = $2 WHERE review_id = $1 RETURNING *`,
      [String(reviewId), st],
    );
    return r.rows[0] || null;
  }

  return {
    registerDefaultConsumers,
    listConsumers,
    canActForProduct,
    listCanActCalls,
    appendCompoundLog,
    listCompoundLog,
    proposeImprovementsFromDebt,
    listImprovementProposals,
    updateImprovementProposal,
    syncRolePackage,
    listRoleSyncs,
    reviewAutonomyLadder,
    listLadderReviews,
    resolveLadderReview,
  };
}

export default createCognitiveCoreCompound;
