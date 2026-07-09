// SYNOPSIS: MarketingOS Phase 2 calendar/atoms JSON API routes.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

import { buildBrandVoiceProfile, scoreContentAgainstVoice } from '../services/marketing-brand-voice.js';

const COMMAND_KEY_FALLBACK_SUB = 'emergency-key';

function jsonError(res, status, error) {
  return res.status(status).json({ ok: false, error });
}

function resolveOwnerId(req) {
  const authenticatedOwnerId =
    req.user?.id ??
    req.user?.user_id ??
    req.user?.sub ??
    req.lifeosUser?.id ??
    req.lifeosUser?.user_id ??
    req.lifeosUser?.sub ??
    null;

  if (
    authenticatedOwnerId &&
    !(req.auth_mode === 'command_key_fallback' && authenticatedOwnerId === COMMAND_KEY_FALLBACK_SUB)
  ) {
    return authenticatedOwnerId;
  }

  return req.body?.owner_id ?? req.query?.owner_id ?? null;
}

function parseLimitWindow(value) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeTags(tags) {
  if (tags == null) return null;
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') {
    const trimmed = tags.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    } catch {
      return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return tags;
}

const ALLOWED_ATOM_TYPES = new Set([
  'hook',
  'story',
  'insight',
  'cta'
]);

const ALLOWED_REUSE_CONSENT_LEVELS = new Set([
  'session_only',
  '90d',
  'perpetual'
]);

export function registerMarketingCalendarRoutes(app, deps) {
  const { pool, requireKey, callCouncilMember, logger, baseUrl } = deps || {};
  if (!app || !pool || !requireKey) {
    throw new Error('registerMarketingCalendarRoutes requires app, deps.pool, and deps.requireKey');
  }

  app.get('/api/v1/marketing/calendar', requireKey, async (req, res) => {
    try {
      const ownerId = resolveOwnerId(req);
      if (!ownerId) return jsonError(res, 400, 'owner_id is required');

      const windowDays = parseLimitWindow(req.query?.days);
      const startDate = req.query?.from || new Date().toISOString().slice(0, 10);

      const { rows } = await pool.query(
        `
        SELECT
          s.*,
          p.id AS content_piece_id,
          p.session_id AS content_piece_session_id,
          p.extraction_id AS content_piece_extraction_id,
          p.platform AS content_piece_platform,
          p.format AS content_piece_format,
          p.content_text AS content_piece_content_text,
          p.status AS content_piece_status,
          p.generated_by_model AS content_piece_generated_by_model,
          p.regeneration_count AS content_piece_regeneration_count
        FROM marketing_calendar_slots s
        LEFT JOIN marketing_content_pieces p
          ON p.id = s.content_piece_id
        WHERE s.owner_id = $1
          AND s.scheduled_date >= $2::date
          AND s.scheduled_date < ($2::date + ($3::int * INTERVAL '1 day'))
        ORDER BY s.scheduled_date ASC, s.created_at ASC
        `,
        [ownerId, startDate, windowDays]
      );

      return res.json({ ok: true, data: rows });
    } catch (error) {
      logger?.error?.({ err: error }, 'marketing calendar fetch failed');
      return jsonError(res, 500, 'failed to fetch calendar');
    }
  });

  app.post('/api/v1/marketing/atoms', requireKey, async (req, res) => {
    try {
      const ownerId = resolveOwnerId(req);
      if (!ownerId) return jsonError(res, 400, 'owner_id is required');

      const { atom_type, text, session_id, source_extraction_id, tags, reuse_consent_level } = req.body || {};

      if (!isNonEmptyString(atom_type)) return jsonError(res, 400, 'atom_type is required');
      if (!ALLOWED_ATOM_TYPES.has(atom_type)) {
        return jsonError(res, 400, 'invalid atom_type');
      }
      if (!isNonEmptyString(text)) return jsonError(res, 400, 'text is required');

      if (reuse_consent_level != null && !ALLOWED_REUSE_CONSENT_LEVELS.has(reuse_consent_level)) {
        return jsonError(res, 400, 'invalid reuse_consent_level');
      }

      const normalizedTags = normalizeTags(tags);

      const { rows } = await pool.query(
        `
        INSERT INTO marketing_content_atoms
          (owner_id, session_id, source_extraction_id, atom_type, text, tags, reuse_consent_level)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        `,
        [
          ownerId,
          session_id ?? null,
          source_extraction_id ?? null,
          atom_type,
          text,
          normalizedTags,
          reuse_consent_level ?? 'session_only'
        ]
      );

      return res.status(201).json({ ok: true, data: rows[0] });
    } catch (error) {
      logger?.error?.({ err: error }, 'marketing atom insert failed');
      return jsonError(res, 500, 'failed to create atom');
    }
  });

  app.get('/api/v1/marketing/atoms', requireKey, async (req, res) => {
    try {
      const ownerId = resolveOwnerId(req);
      if (!ownerId) return jsonError(res, 400, 'owner_id is required');

      const atomType = req.query?.atom_type;
      const params = [ownerId];
      let clause = 'WHERE owner_id = $1';

      if (isNonEmptyString(atomType)) {
        if (!ALLOWED_ATOM_TYPES.has(atomType)) return jsonError(res, 400, 'invalid atom_type');
        params.push(atomType);
        clause += ` AND atom_type = $${params.length}`;
      }

      const { rows } = await pool.query(
        `
        SELECT *
        FROM marketing_content_atoms
        ${clause}
        ORDER BY created_at DESC
        `,
        params
      );

      return res.json({ ok: true, data: rows });
    } catch (error) {
      logger?.error?.({ err: error }, 'marketing atom list failed');
      return jsonError(res, 500, 'failed to list atoms');
    }
  });

  app.post('/api/v1/marketing/brand-voice/rebuild', requireKey, async (req, res) => {
    try {
      const ownerId = resolveOwnerId(req);
      if (!ownerId) return jsonError(res, 400, 'owner_id is required');

      if (typeof buildBrandVoiceProfile !== 'function') {
        return jsonError(res, 500, 'brand voice rebuild unavailable');
      }

      const { rows: sessions } = await pool.query(
        `
        SELECT *
        FROM marketing_sessions
        WHERE owner_id = $1
        ORDER BY created_at DESC
        `,
        [ownerId]
      );

      const profile = await buildBrandVoiceProfile({
        owner_id: ownerId,
        sessions,
        baseUrl,
        callCouncilMember,
        pool,
        logger
      });

      if (typeof scoreContentAgainstVoice === 'function' && profile) {
        try {
          await scoreContentAgainstVoice(profile, '');
        } catch (innerError) {
          logger?.warn?.({ err: innerError }, 'brand voice scoring probe failed');
        }
      }

      const payload = {
        owner_id: ownerId,
        profile
      };

      await pool.query(
        `
        INSERT INTO marketing_brand_voice_profiles
          (owner_id, profile_json, source_session_count)
        VALUES
          ($1, $2, $3)
        ON CONFLICT DO NOTHING
        `,
        [ownerId, profile ?? null, Array.isArray(sessions) ? sessions.length : 0]
      );

      return res.json({ ok: true, data: payload });
    } catch (error) {
      logger?.error?.({ err: error }, 'brand voice rebuild failed');
      return jsonError(res, 500, 'failed to rebuild brand voice');
    }
  });
}

export default registerMarketingCalendarRoutes;