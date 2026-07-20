/**
 * SYNOPSIS: Cognitive Core Era-6 "Transmit Me" — marketplace, interrupts, debt, trees, import.
 * #26 Capsule Marketplace, #27 Subconscious Interrupts, #28 Cognitive Debt,
 * #29 Deep Consequence Trees, #30 Portable Handshake.
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */

import { createCognitiveCorePreserve } from './cognitive-core-preserve.js';

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

/**
 * @param {{ pool: import('pg').Pool, logger?: Console, callAI?: Function }} deps
 */
export function createCognitiveCoreTransmit(deps = {}) {
  const pool = deps.pool;
  const logger = deps.logger || console;
  const preserve = createCognitiveCorePreserve({ pool, logger });

  let _callAI = deps.callAI || null;
  async function callAI(prompt, opts = {}) {
    if (!_callAI) {
      try {
        const mod = await import('./never-stop-product-factory.js');
        _callAI = mod.defaultPlannerCallModel?.() || null;
      } catch {
        _callAI = null;
      }
    }
    if (!_callAI) return { ok: false, text: '' };
    try {
      const text = await _callAI('planner', prompt, { maxOutputTokens: opts.maxOutputTokens || 1800 });
      return { ok: true, text: String(text || '') };
    } catch (err) {
      logger.warn?.('[COGNITIVE-CORE/transmit] AI call failed', err?.message || err);
      return { ok: false, text: '' };
    }
  }

  // ── #26 Capsule Marketplace ──────────────────────────────────────────
  async function publishListing({
    userId,
    packageId,
    title,
    description = '',
    visibility = 'private',
  } = {}) {
    const uid = String(userId || '1');
    const pkg = packageId ? await preserve.getPackage(packageId) : null;
    if (packageId && (!pkg || pkg.status !== 'sealed')) {
      return { ok: false, error: 'sealed_package_required' };
    }
    const ttl = String(title || pkg?.label || '').trim();
    if (!ttl) return { ok: false, error: 'title_required' };

    const legacy = arr(pkg?.snapshot?.legacy).slice(0, 12);
    const programs = arr(pkg?.snapshot?.programs).slice(0, 12);
    const wear_ids = ['founder', 'anti_you'];
    const payload = {
      framing_note: preserve.FRAMING,
      confidence_map: pkg?.confidence_map || { confident: [], extrapolated: [], unknown: [] },
      principles: legacy.filter((e) => e.kind === 'principle' || !e.kind).map((e) => ({
        title: e.title, content: e.content, confidence: e.confidence,
      })),
      program_hypotheses: programs.map((p) => ({
        label: p.label, hypothesis: p.hypothesis, confidence: p.confidence,
      })),
    };

    const r = await pool.query(
      `INSERT INTO capsule_marketplace_listings
         (user_id, package_id, title, description, wear_ids, payload, visibility, status)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,'published')
       RETURNING *`,
      [
        uid,
        pkg?.package_id || null,
        ttl,
        String(description || ''),
        JSON.stringify(wear_ids),
        JSON.stringify(payload),
        ['private', 'org', 'public'].includes(visibility) ? visibility : 'private',
      ],
    );
    return { ok: true, listing: r.rows[0] };
  }

  async function listMarketplace({ visibility = null, status = 'published', limit = 50 } = {}) {
    const lim = Math.min(Math.max(Number(limit) || 50, 1), 200);
    if (visibility) {
      const r = await pool.query(
        `SELECT listing_id, user_id, package_id, title, description, wear_ids, visibility,
                status, install_count, created_at
         FROM capsule_marketplace_listings
         WHERE status = $1 AND visibility = $2
         ORDER BY created_at DESC LIMIT $3`,
        [status || 'published', visibility, lim],
      );
      return r.rows;
    }
    const r = await pool.query(
      `SELECT listing_id, user_id, package_id, title, description, wear_ids, visibility,
              status, install_count, created_at
       FROM capsule_marketplace_listings
       WHERE status = $1
       ORDER BY created_at DESC LIMIT $2`,
      [status || 'published', lim],
    );
    return r.rows;
  }

  async function installListing({ userId, listingId, worn = false } = {}) {
    const uid = String(userId || '1');
    const listing = await pool.query(
      `SELECT * FROM capsule_marketplace_listings WHERE listing_id = $1 AND status = 'published'`,
      [String(listingId)],
    );
    if (!listing.rows[0]) return { ok: false, error: 'listing_not_found' };
    const r = await pool.query(
      `INSERT INTO capsule_marketplace_installs (listing_id, user_id, worn)
       VALUES ($1,$2,$3)
       ON CONFLICT (listing_id, user_id) DO UPDATE SET worn = EXCLUDED.worn
       RETURNING *`,
      [listingId, uid, !!worn],
    );
    await pool.query(
      `UPDATE capsule_marketplace_listings
       SET install_count = install_count + 1, updated_at = NOW()
       WHERE listing_id = $1`,
      [listingId],
    );
    return {
      ok: true,
      install: r.rows[0],
      payload: listing.rows[0].payload,
      honesty: "THINK: installed pack is a lens, not the author's live mind — recalibrate.",
    };
  }

  // ── #28 Cognitive Debt + #27 Interrupts ──────────────────────────────
  async function refreshDebt(userId) {
    const uid = String(userId || '1');
    const openDecisions = await softQuery(pool,
      `SELECT decision_id, question, domain, created_at FROM judgment_decisions
       WHERE user_id = $1
         AND decision_id NOT IN (SELECT decision_id FROM judgment_outcomes WHERE decision_id IS NOT NULL)
       ORDER BY created_at DESC LIMIT 20`, [uid]);
    const weakPrograms = await softQuery(pool,
      `SELECT program_id, label, confidence, domain FROM judgment_programs
       WHERE user_id = $1 AND status = 'active' AND confidence < 0.45
       ORDER BY confidence ASC LIMIT 15`, [uid]);
    const unpaid = await softQuery(pool,
      `SELECT p.prediction_id, p.decision_id, p.predicted_option, p.confidence
       FROM judgment_predictions p
       JOIN judgment_decisions d ON d.decision_id = p.decision_id
       WHERE d.user_id = $1
         AND p.prediction_id NOT IN (
           SELECT prediction_id FROM judgment_outcomes WHERE prediction_id IS NOT NULL
         )
       LIMIT 20`, [uid]);

    const created = [];
    for (const d of openDecisions) {
      const r = await pool.query(
        `INSERT INTO cognitive_debt_items
           (user_id, kind, title, detail, domain, severity, ref_id, status)
         SELECT $1,'open_decision',$2,$3,$4,$5,$6,'open'
         WHERE NOT EXISTS (
           SELECT 1 FROM cognitive_debt_items
           WHERE user_id = $1 AND ref_id = $6 AND kind = 'open_decision' AND status = 'open'
         )
         RETURNING *`,
        [
          uid,
          `Open decision: ${String(d.question || '').slice(0, 80)}`,
          'No outcome recorded yet — scoreboard cannot calibrate.',
          d.domain || null,
          0.7,
          String(d.decision_id),
        ],
      );
      if (r.rows[0]) created.push(r.rows[0]);
    }
    for (const p of weakPrograms) {
      const r = await pool.query(
        `INSERT INTO cognitive_debt_items
           (user_id, kind, title, detail, domain, severity, ref_id, status)
         SELECT $1,'weak_program',$2,$3,$4,$5,$6,'open'
         WHERE NOT EXISTS (
           SELECT 1 FROM cognitive_debt_items
           WHERE user_id = $1 AND ref_id = $6 AND kind = 'weak_program' AND status = 'open'
         )
         RETURNING *`,
        [
          uid,
          `Weak program: ${p.label}`,
          `Confidence ${clamp01(p.confidence)} — needs evidence or retirement.`,
          p.domain || null,
          1 - clamp01(p.confidence, 0.3),
          String(p.program_id),
        ],
      );
      if (r.rows[0]) created.push(r.rows[0]);
    }
    for (const p of unpaid) {
      const r = await pool.query(
        `INSERT INTO cognitive_debt_items
           (user_id, kind, title, detail, domain, severity, ref_id, status)
         SELECT $1,'unpaid_prediction',$2,$3,NULL,$4,$5,'open'
         WHERE NOT EXISTS (
           SELECT 1 FROM cognitive_debt_items
           WHERE user_id = $1 AND ref_id = $5 AND kind = 'unpaid_prediction' AND status = 'open'
         )
         RETURNING *`,
        [
          uid,
          `Unpaid prediction: ${String(p.predicted_option || '').slice(0, 60)}`,
          'Prediction lacks outcome — Brier cannot update.',
          0.65,
          String(p.prediction_id),
        ],
      );
      if (r.rows[0]) created.push(r.rows[0]);
    }
    return { ok: true, created_n: created.length, created };
  }

  async function listDebt(userId, { status = 'open', limit = 50 } = {}) {
    const r = await pool.query(
      `SELECT * FROM cognitive_debt_items
       WHERE user_id = $1 AND status = $2
       ORDER BY severity DESC, created_at DESC LIMIT $3`,
      [String(userId || '1'), status || 'open', Math.min(Math.max(Number(limit) || 50, 1), 200)],
    );
    return r.rows;
  }

  async function resolveDebt({ debtId, status = 'resolved' } = {}) {
    const st = ['resolved', 'wontfix', 'open'].includes(status) ? status : 'resolved';
    const r = await pool.query(
      `UPDATE cognitive_debt_items SET status = $2, updated_at = NOW()
       WHERE debt_id = $1 RETURNING *`,
      [String(debtId), st],
    );
    return r.rows[0] || null;
  }

  async function generateInterrupts(userId) {
    const uid = String(userId || '1');
    await refreshDebt(uid);
    const debt = await listDebt(uid, { status: 'open', limit: 10 });
    const created = [];
    for (const item of debt.slice(0, 5)) {
      const trigger = item.kind === 'weak_program' ? 'weak_program'
        : item.kind === 'open_decision' ? 'debt_threshold'
          : item.kind === 'unpaid_prediction' ? 'stale_hypothesis'
            : 'debt_threshold';
      const sev = item.severity >= 0.75 ? 'high' : item.severity >= 0.5 ? 'medium' : 'low';
      const r = await pool.query(
        `INSERT INTO subconscious_interrupts
           (user_id, trigger_kind, message, domain, severity, evidence, status)
         SELECT $1,$2,$3,$4,$5,$6::jsonb,'pending'
         WHERE NOT EXISTS (
           SELECT 1 FROM subconscious_interrupts
           WHERE user_id = $1 AND status = 'pending'
             AND message = $3
             AND created_at > NOW() - INTERVAL '24 hours'
         )
         RETURNING *`,
        [
          uid,
          trigger,
          item.title,
          item.domain || null,
          sev,
          JSON.stringify([{ debt_id: item.debt_id, kind: item.kind }]),
        ],
      );
      if (r.rows[0]) created.push(r.rows[0]);
    }
    return { ok: true, interrupts: created, debt_n: debt.length };
  }

  async function listInterrupts(userId, { status = 'pending', limit = 30 } = {}) {
    const r = await pool.query(
      `SELECT * FROM subconscious_interrupts
       WHERE user_id = $1 AND status = $2
       ORDER BY created_at DESC LIMIT $3`,
      [String(userId || '1'), status || 'pending', Math.min(Math.max(Number(limit) || 30, 1), 100)],
    );
    return r.rows;
  }

  async function dismissInterrupt({ interruptId, status = 'dismissed' } = {}) {
    const st = ['dismissed', 'surfaced', 'acted', 'pending'].includes(status) ? status : 'dismissed';
    const r = await pool.query(
      `UPDATE subconscious_interrupts SET status = $2 WHERE interrupt_id = $1 RETURNING *`,
      [String(interruptId), st],
    );
    return r.rows[0] || null;
  }

  // ── #29 Deep Consequence Tree ────────────────────────────────────────
  function ruleTree(question, depth) {
    const q = String(question || 'this option');
    const nodes = [];
    let parent = null;
    for (let level = 1; level <= depth; level++) {
      const id = `n${level}`;
      const node = {
        id,
        level,
        parent_id: parent,
        effect: level === 1
          ? `Immediate: choose path around "${q.slice(0, 80)}"`
          : level === 2
            ? 'Second-order: attention / capital / trust reallocates'
            : level === 3
              ? 'Third-order: option set for future decisions narrows or widens'
              : `Order-${level}: compounding constraint or optionality (hypothesis)`,
        watch: level <= 3 ? ['time-to-signal', 'reversibility', 'identity cost'] : ['compounding'],
        confidence: clamp01(0.55 - level * 0.05, 0.2),
      };
      nodes.push(node);
      parent = id;
    }
    return nodes;
  }

  async function buildConsequenceTree({
    userId,
    question,
    depth = 6,
    decisionId = null,
  } = {}) {
    const uid = String(userId || '1');
    const q = String(question || '').trim();
    if (!q) return { ok: false, error: 'question_required' };
    const d = Math.min(Math.max(Number(depth) || 6, 2), 12);

    let nodes = ruleTree(q, d);
    let confidence = 0.35;
    const ai = await callAI(
      `You are a consequence-tree hypothesizer. Return ONLY JSON:
{"nodes":[{"id":"n1","level":1,"parent_id":null,"effect":"...","watch":["..."],"confidence":0.4}],"confidence":0.4}
Question: ${q}
Depth: ${d}
Rules: each level is a higher-order effect; label uncertainty; no certainty theater.`,
      { maxOutputTokens: 1600 },
    );
    if (ai.ok && ai.text) {
      try {
        const s = ai.text.indexOf('{');
        const e = ai.text.lastIndexOf('}');
        if (s >= 0 && e > s) {
          const parsed = JSON.parse(ai.text.slice(s, e + 1));
          if (Array.isArray(parsed.nodes) && parsed.nodes.length) {
            nodes = parsed.nodes.slice(0, d * 3);
            confidence = clamp01(parsed.confidence, 0.35);
          }
        }
      } catch { /* keep rule tree */ }
    }

    const r = await pool.query(
      `INSERT INTO consequence_trees
         (user_id, decision_id, question, depth, nodes, confidence)
       VALUES ($1,$2,$3,$4,$5::jsonb,$6)
       RETURNING *`,
      [uid, decisionId || null, q, d, JSON.stringify(nodes), confidence],
    );
    return {
      ok: true,
      tree: r.rows[0],
      honesty: 'GUESS beyond order-2 unless evidence cited — tree is prospective hypothesis.',
    };
  }

  async function listConsequenceTrees(userId, { limit = 20 } = {}) {
    const r = await pool.query(
      `SELECT * FROM consequence_trees WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [String(userId || '1'), Math.min(Math.max(Number(limit) || 20, 1), 100)],
    );
    return r.rows;
  }

  // ── #30 Portable Handshake (import) ──────────────────────────────────
  async function acceptTransmission({
    userId,
    transmissionId,
  } = {}) {
    const uid = String(userId || '1');
    const t = await pool.query(
      `SELECT * FROM judgment_transmissions WHERE transmission_id = $1`,
      [String(transmissionId)],
    );
    if (!t.rows[0]) return { ok: false, error: 'transmission_not_found' };
    if (t.rows[0].status === 'revoked') return { ok: false, error: 'transmission_revoked' };
    const pkg = await preserve.getPackage(t.rows[0].package_id);
    if (!pkg || pkg.status !== 'sealed') return { ok: false, error: 'source_package_unavailable' };

    const provenance = {
      from_user_id: t.rows[0].user_id,
      transmission_id: t.rows[0].transmission_id,
      package_id: pkg.package_id,
      package_label: pkg.label,
      framing_note: preserve.FRAMING,
      accepted_at: new Date().toISOString(),
    };

    const r = await pool.query(
      `INSERT INTO package_imports
         (user_id, transmission_id, package_id, snapshot, provenance, status)
       VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,'accepted')
       RETURNING *`,
      [
        uid,
        t.rows[0].transmission_id,
        pkg.package_id,
        JSON.stringify(pkg.snapshot || {}),
        JSON.stringify(provenance),
      ],
    );
    await pool.query(
      `UPDATE judgment_transmissions SET status = 'accepted', updated_at = NOW()
       WHERE transmission_id = $1`,
      [t.rows[0].transmission_id],
    );
    return {
      ok: true,
      import: r.rows[0],
      framing_note: preserve.FRAMING,
      honesty: 'KNOW: snapshot imported. THINK: must recalibrate against importer scoreboard before acting.',
    };
  }

  async function listImports(userId, { limit = 30 } = {}) {
    const r = await pool.query(
      `SELECT import_id, user_id, transmission_id, package_id, provenance, status, created_at
       FROM package_imports WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [String(userId || '1'), Math.min(Math.max(Number(limit) || 30, 1), 100)],
    );
    return r.rows;
  }

  return {
    publishListing,
    listMarketplace,
    installListing,
    refreshDebt,
    listDebt,
    resolveDebt,
    generateInterrupts,
    listInterrupts,
    dismissInterrupt,
    buildConsequenceTree,
    listConsequenceTrees,
    acceptTransmission,
    listImports,
  };
}

export default createCognitiveCoreTransmit;
