// SYNOPSIS: MarketingOS Phase 2 calendar/atoms JSON API routes.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

const DEFAULT_WINDOW_DAYS = 30;

const ATOM_TYPES = new Set(['insight', 'headline', 'hook', 'cta', 'story', 'offer', 'objection', 'value_prop', 'other']);
const REUSE_CONSENT_LEVELS = new Set(['none', 'internal', 'approved', 'full']);

function jsonError(res, status, error) {
  return res.status(status).json({ ok: false, error });
}

function getOwnerId(req) {
  return req.user?.id ?? req.body?.owner_id ?? req.query?.owner_id ?? null;
}

function parseDateOnly(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function validateEnum(value, allowed, fieldName) {
  if (value == null) return null;
  if (!allowed.has(value)) {
    const allowedList = Array.from(allowed).join(', ');
    const err = new Error(`Invalid ${fieldName}; allowed values: ${allowedList}`);
    err.status = 400;
    throw err;
  }
  return value;
}

async function handleCalendarGet(req, res, deps) {
  try {
    const ownerId = getOwnerId(req);
    if (!ownerId) return jsonError(res, 400, 'owner_id is required');

    const fromDate = parseDateOnly(req.query?.from) || new Date().toISOString().slice(0, 10);
    const days = Number.parseInt(req.query?.days ?? `${DEFAULT_WINDOW_DAYS}`, 10);
    const windowDays = Number.isFinite(days) && days > 0 && days <= 365 ? days : DEFAULT_WINDOW_DAYS;

    const sql = `
      SELECT
        mcs.*,
        mcp.title,
        mcp.body,
        mcp.url,
        mcp.author,
        mcp.published_at,
        mcp.metadata,
        mcp.session_id,
        mcp.platform AS content_platform,
        mcp.format AS content_format,
        mcp.content_text,
        mcp.status AS content_status,
        mcp.generated_by_model,
        mcp.regeneration_count
      FROM marketing_calendar_slots mcs
      LEFT JOIN marketing_content_pieces mcp
        ON mcp.id = mcs.content_piece_id
      WHERE mcs.owner_id = $1
        AND mcs.scheduled_date >= $2::date
        AND mcs.scheduled_date < ($2::date + ($3 || ' days')::interval)
      ORDER BY mcs.scheduled_date ASC, mcs.created_at ASC
    `;
    const { rows } = await deps.pool.query(sql, [ownerId, fromDate, windowDays]);
    return res.json({ ok: true, owner_id: ownerId, from: fromDate, days: windowDays, rows });
  } catch (err) {
    deps.logger?.error?.({ err }, 'marketing calendar get failed');
    return jsonError(res, err.status || 500, err.message || 'Failed to load marketing calendar');
  }
}

async function handleAtomsPost(req, res, deps) {
  try {
    const ownerId = getOwnerId(req);
    if (!ownerId) return jsonError(res, 400, 'owner_id is required');

    const { atom_type, text, session_id = null, source_extraction_id = null, tags = null, reuse_consent_level = null } = req.body ?? {};
    if (!atom_type) return jsonError(res, 400, 'atom_type is required');
    if (!text) return jsonError(res, 400, 'text is required');

    validateEnum(atom_type, ATOM_TYPES, 'atom_type');
    if (reuse_consent_level != null) validateEnum(reuse_consent_level, REUSE_CONSENT_LEVELS, 'reuse_consent_level');

    const normalizedTags = tags == null ? null : (Array.isArray(tags) ? tags : tags);

    const sql = `
      INSERT INTO marketing_content_atoms
        (owner_id, session_id, source_extraction_id, atom_type, text, tags, reuse_consent_level)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const params = [ownerId, session_id, source_extraction_id, atom_type, text, normalizedTags, reuse_consent_level];
    const { rows } = await deps.pool.query(sql, params);

    return res.status(201).json({ ok: true, row: rows[0] });
  } catch (err) {
    deps.logger?.error?.({ err }, 'marketing atoms post failed');
    return jsonError(res, err.status || 500, err.message || 'Failed to create marketing atom');
  }
}

async function handleAtomsGet(req, res, deps) {
  try {
    const ownerId = getOwnerId(req);
    if (!ownerId) return jsonError(res, 400, 'owner_id is required');

    const atomType = req.query?.atom_type ?? null;
    if (atomType != null) validateEnum(atomType, ATOM_TYPES, 'atom_type');

    const params = [ownerId];
    let where = `WHERE owner_id = $1`;
    if (atomType) {
      params.push(atomType);
      where += ` AND atom_type = $2`;
    }

    const sql = `
      SELECT *
      FROM marketing_content_atoms
      ${where}
      ORDER BY created_at DESC
    `;
    const { rows } = await deps.pool.query(sql, params);

    return res.json({ ok: true, owner_id: ownerId, rows });
  } catch (err) {
    deps.logger?.error?.({ err }, 'marketing atoms get failed');
    return jsonError(res, err.status || 500, err.message || 'Failed to list marketing atoms');
  }
}

async function handleBrandVoiceRebuild(req, res, deps) {
  try {
    const ownerId = getOwnerId(req);
    if (!ownerId) return jsonError(res, 400, 'owner_id is required');

    const existing = await deps.pool.query(
      `SELECT * FROM marketing_brand_voice_profiles WHERE owner_id = $1 ORDER BY updated_at DESC LIMIT 1`,
      [ownerId]
    );

    const countResult = await deps.pool.query(
      `SELECT COUNT(*)::int AS session_count FROM marketing_sessions WHERE owner_id = $1`,
      [ownerId]
    );

    let profileJson = null;

    try {
      const { buildBrandVoiceProfile, scoreContentAgainstVoice } = await import('../services/marketing-brand-voice.js');
      if (typeof buildBrandVoiceProfile === 'function') {
        profileJson = await buildBrandVoiceProfile({ ownerId, pool: deps.pool, logger: deps.logger, baseUrl: deps.baseUrl });
      }
      if (profileJson && typeof scoreContentAgainstVoice === 'function') {
        profileJson = {
          ...profileJson,
          sample_score: await scoreContentAgainstVoice(profileJson, profileJson.sample_text ?? '')
        };
      }
    } catch (err) {
      deps.logger?.warn?.({ err }, 'marketing brand voice service import or rebuild failed; falling back to persistence update');
    }

    const upsert = existing.rows[0]
      ? await deps.pool.query(
          `UPDATE marketing_brand_voice_profiles
           SET profile_json = $2, source_session_count = $3, updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [existing.rows[0].id, profileJson ?? existing.rows[0].profile_json, countResult.rows[0].session_count]
        )
      : await deps.pool.query(
          `INSERT INTO marketing_brand_voice_profiles (owner_id, profile_json, source_session_count)
           VALUES ($1, $2, $3)
           RETURNING *`,
          [ownerId, profileJson ?? {}, countResult.rows[0].session_count]
        );

    return res.json({ ok: true, row: upsert.rows[0] });
  } catch (err) {
    deps.logger?.error?.({ err }, 'marketing brand voice rebuild failed');
    return jsonError(res, err.status || 500, err.message || 'Failed to rebuild brand voice profile');
  }
}

export function registerMarketingCalendarRoutes(app, deps) {
  app.get('/api/v1/marketing/calendar', deps.requireKey, (req, res) => handleCalendarGet(req, res, deps));
  app.post('/api/v1/marketing/atoms', deps.requireKey, (req, res) => handleAtomsPost(req, res, deps));
  app.get('/api/v1/marketing/atoms', deps.requireKey, (req, res) => handleAtomsGet(req, res, deps));
  app.post('/api/v1/marketing/brand-voice/rebuild', deps.requireKey, (req, res) => handleBrandVoiceRebuild(req, res, deps));
}

export default registerMarketingCalendarRoutes;