/**
 * SYNOPSIS: Cognitive Core Era-5 "Preserve Me" — sealed judgment packages + transmission.
 * #25 Legacy judgment transmission with transparent confidence (NOT "digital immortality").
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */

const FRAMING =
  'Preserved judgment with transparent confidence — not digital immortality.';

function clamp01(n, fb = 0.4) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fb;
}

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
 * @param {{ pool: import('pg').Pool, logger?: Console }} deps
 */
export function createCognitiveCorePreserve(deps = {}) {
  const pool = deps.pool;
  const logger = deps.logger || console;

  async function gatherSnapshot(userId) {
    const uid = String(userId || '1');
    const [
      programs,
      legacy,
      models,
      scopes,
      values,
      ideas,
      curiosity,
      learning,
      scoreboard,
    ] = await Promise.all([
      softQuery(pool,
        `SELECT program_id, label, hypothesis, confidence, change_trajectory, status, domain
         FROM judgment_programs WHERE user_id = $1 AND status = 'active'
         ORDER BY confidence DESC NULLS LAST LIMIT 40`, [uid]),
      softQuery(pool,
        `SELECT entry_id, kind, title, content, domain, confidence
         FROM legacy_entries WHERE user_id = $1 AND status = 'active'
         ORDER BY created_at DESC LIMIT 40`, [uid]),
      softQuery(pool,
        `SELECT model_id, label, summary, domain, confidence
         FROM mental_models WHERE user_id = $1 AND status = 'active'
         ORDER BY updated_at DESC LIMIT 30`, [uid]),
      softQuery(pool,
        `SELECT scope_id, domain, delegation_tier, stakes_max, accuracy, n, founder_approved
         FROM delegation_scopes WHERE user_id = $1 AND status = 'active'`, [uid]),
      softQuery(pool,
        `SELECT value_id, principle, hypothesis, confidence, source, status
         FROM judgment_values WHERE user_id = $1 AND status = 'active'
         ORDER BY updated_at DESC LIMIT 30`, [uid]),
      softQuery(pool,
        `SELECT idea_id, label, description, origin, status FROM idea_nodes
         WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 30`, [uid]),
      softQuery(pool,
        `SELECT prompt_id, topic, why, suggested_action, status FROM curiosity_prompts
         WHERE user_id = $1 AND status = 'open' LIMIT 20`, [uid]),
      softQuery(pool,
        `SELECT * FROM learning_style_profile WHERE user_id = $1 LIMIT 1`, [uid]),
      softQuery(pool,
        `SELECT domain, accuracy, brier_score, n, delegation_tier
         FROM judgment_trust_by_domain WHERE user_id = $1`, [uid]),
    ]);

    const confident = [];
    const extrapolated = [];
    const unknown = [];

    for (const p of programs) {
      const c = clamp01(p.confidence, 0.4);
      const item = { kind: 'program', id: p.program_id, label: p.label, confidence: c };
      if (c >= 0.7) confident.push(item);
      else if (c >= 0.4) extrapolated.push(item);
      else unknown.push(item);
    }
    for (const e of legacy) {
      const c = clamp01(e.confidence, 0.5);
      const item = { kind: 'legacy', id: e.entry_id, label: e.title, confidence: c };
      if (c >= 0.65) confident.push(item);
      else extrapolated.push(item);
    }
    for (const m of models) {
      const c = clamp01(m.confidence, 0.4);
      const item = { kind: 'mental_model', id: m.model_id, label: m.label, confidence: c };
      if (c >= 0.65) confident.push(item);
      else extrapolated.push(item);
    }
    if (!programs.length && !legacy.length && !models.length) {
      unknown.push({ kind: 'corpus', label: 'thin_corpus', confidence: 0 });
    }

    const source_counts = {
      programs: programs.length,
      legacy: legacy.length,
      mental_models: models.length,
      delegation_scopes: scopes.length,
      values: values.length,
      ideas: ideas.length,
      curiosity: curiosity.length,
      learning_style: learning.length,
      trust_domains: scoreboard.length,
    };

    return {
      snapshot: {
        programs,
        legacy,
        mental_models: models,
        delegation_scopes: scopes,
        values,
        ideas,
        curiosity,
        learning_style: learning[0] || null,
        trust_by_domain: scoreboard,
        gathered_at: new Date().toISOString(),
      },
      confidence_map: { confident, extrapolated, unknown },
      source_counts,
      framing_note: FRAMING,
    };
  }

  async function createPackage({ userId, label, seal = false } = {}) {
    const uid = String(userId || '1');
    const lbl = String(label || '').trim() || `judgment-package-${new Date().toISOString().slice(0, 10)}`;
    const gathered = await gatherSnapshot(uid);
    const status = seal ? 'sealed' : 'draft';
    const r = await pool.query(
      `INSERT INTO judgment_packages
         (user_id, label, version, status, snapshot, confidence_map, framing_note, source_counts, sealed_at)
       VALUES ($1,$2,1,$3,$4::jsonb,$5::jsonb,$6,$7::jsonb,$8)
       RETURNING *`,
      [
        uid,
        lbl,
        status,
        JSON.stringify(gathered.snapshot),
        JSON.stringify(gathered.confidence_map),
        gathered.framing_note,
        JSON.stringify(gathered.source_counts),
        seal ? new Date().toISOString() : null,
      ],
    );
    return { ok: true, package: r.rows[0], framing_note: FRAMING };
  }

  async function sealPackage({ packageId, userId } = {}) {
    const id = String(packageId || '');
    if (!id) throw new Error('package_id_required');
    const gathered = await gatherSnapshot(userId || '1');
    const r = await pool.query(
      `UPDATE judgment_packages
       SET status = 'sealed',
           snapshot = $2::jsonb,
           confidence_map = $3::jsonb,
           source_counts = $4::jsonb,
           framing_note = $5,
           sealed_at = NOW(),
           updated_at = NOW()
       WHERE package_id = $1 AND status IN ('draft','sealed')
       RETURNING *`,
      [
        id,
        JSON.stringify(gathered.snapshot),
        JSON.stringify(gathered.confidence_map),
        JSON.stringify(gathered.source_counts),
        FRAMING,
      ],
    );
    if (!r.rows[0]) return { ok: false, error: 'not_found_or_archived' };
    return { ok: true, package: r.rows[0] };
  }

  async function listPackages(userId, { status = null, limit = 50 } = {}) {
    const uid = String(userId || '1');
    const lim = Math.min(Math.max(Number(limit) || 50, 1), 200);
    if (status) {
      const r = await pool.query(
        `SELECT package_id, user_id, label, version, status, confidence_map, framing_note,
                source_counts, sealed_at, created_at, updated_at
         FROM judgment_packages WHERE user_id = $1 AND status = $2
         ORDER BY created_at DESC LIMIT $3`,
        [uid, status, lim],
      );
      return r.rows;
    }
    const r = await pool.query(
      `SELECT package_id, user_id, label, version, status, confidence_map, framing_note,
              source_counts, sealed_at, created_at, updated_at
       FROM judgment_packages WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [uid, lim],
    );
    return r.rows;
  }

  async function getPackage(packageId) {
    const r = await pool.query(`SELECT * FROM judgment_packages WHERE package_id = $1`, [String(packageId)]);
    return r.rows[0] || null;
  }

  async function transmitPackage({
    packageId,
    userId,
    recipientLabel,
    purpose,
    consentAttested = false,
  } = {}) {
    const uid = String(userId || '1');
    const pkg = await getPackage(packageId);
    if (!pkg) return { ok: false, error: 'package_not_found' };
    if (pkg.status !== 'sealed') return { ok: false, error: 'package_must_be_sealed' };
    if (!consentAttested) return { ok: false, error: 'consent_required' };
    const recipient = String(recipientLabel || '').trim();
    const why = String(purpose || '').trim();
    if (!recipient || !why) return { ok: false, error: 'recipient_and_purpose_required' };

    const summary = {
      label: pkg.label,
      version: pkg.version,
      source_counts: pkg.source_counts,
      confident_n: (pkg.confidence_map?.confident || []).length,
      extrapolated_n: (pkg.confidence_map?.extrapolated || []).length,
      framing_note: FRAMING,
    };

    const r = await pool.query(
      `INSERT INTO judgment_transmissions
         (package_id, user_id, recipient_label, purpose, consent_attested, status, payload_summary)
       VALUES ($1,$2,$3,$4,TRUE,'sent',$5::jsonb)
       RETURNING *`,
      [pkg.package_id, uid, recipient, why, JSON.stringify(summary)],
    );
    logger.info?.('[COGNITIVE-CORE/preserve] transmission sent', {
      transmission_id: r.rows[0]?.transmission_id,
      package_id: pkg.package_id,
    });
    return {
      ok: true,
      transmission: r.rows[0],
      framing_note: FRAMING,
      honesty: 'KNOW: sealed package transmitted with consent. THINK: recipient still must recalibrate.',
    };
  }

  async function listTransmissions(userId, { limit = 50 } = {}) {
    const r = await pool.query(
      `SELECT * FROM judgment_transmissions WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [String(userId || '1'), Math.min(Math.max(Number(limit) || 50, 1), 200)],
    );
    return r.rows;
  }

  return {
    FRAMING,
    gatherSnapshot,
    createPackage,
    sealPackage,
    listPackages,
    getPackage,
    transmitPackage,
    listTransmissions,
  };
}

export default createCognitiveCorePreserve;
