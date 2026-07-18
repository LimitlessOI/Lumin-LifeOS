// SYNOPSIS: MarketingOS Phase 2 calendar/atoms JSON API routes.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

import { getOwnerId } from './marketing-session-routes.js';
import { buildBrandVoiceProfile, scoreContentAgainstVoice } from '../services/marketing-brand-voice.js';

function jsonError(res, status, error) {
  return res.status(status).json({ ok: false, error });
}

function isValidUuid(value) {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isValidDate(value) {
  if (typeof value !== 'string' || !value.trim()) return false;
  const t = Date.parse(value);
  return !Number.isNaN(t);
}

const CALENDAR_STATUSES = new Set(['planned', 'approved', 'used']);

function parseLimitWindow(value) {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeTags(tags) {
  if (tags == null) return [];
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') {
    const trimmed = tags.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    } catch {
      return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  return [];
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
      const ownerId = getOwnerId(req);
      if (!ownerId) return jsonError(res, 400, 'owner_id is required');

      const windowDays = parseLimitWindow(req.query?.days);
      const startDate = req.query?.from || new Date().toISOString().slice(0, 10);

      const { rows } = await pool.query(
        `
        SELECT
          s.id AS slot_id,
          s.owner_id,
          s.content_piece_id,
          s.scheduled_date,
          s.platform,
          s.status,
          s.created_at,
          SUBSTRING(p.content_text, 1, 80) AS content_piece_title,
          p.content_text AS content_piece_content_text,
          p.session_id AS content_piece_session_id,
          p.extraction_id AS content_piece_extraction_id,
          p.platform AS content_piece_platform,
          p.format AS content_piece_format,
          p.status AS content_piece_status,
          p.generated_by_model AS content_piece_generated_by_model,
          p.regeneration_count AS content_piece_regeneration_count,
          p.created_at AS content_piece_created_at,
          p.updated_at AS content_piece_updated_at
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

      const slots = rows.map((row) => {
        const content_piece = row.content_piece_id
          ? {
              id: row.content_piece_id,
              title: row.content_piece_title || null,
              content_text: row.content_piece_content_text || null,
              session_id: row.content_piece_session_id || null,
              extraction_id: row.content_piece_extraction_id || null,
              platform: row.content_piece_platform || null,
              format: row.content_piece_format || null,
              status: row.content_piece_status || null,
              generated_by_model: row.content_piece_generated_by_model || null,
              regeneration_count: row.content_piece_regeneration_count || null,
              created_at: row.content_piece_created_at || null,
              updated_at: row.content_piece_updated_at || null
            }
          : null;
        return {
          slot_id: row.slot_id,
          owner_id: row.owner_id,
          content_piece_id: row.content_piece_id,
          scheduled_date: row.scheduled_date,
          platform: row.platform,
          status: row.status,
          created_at: row.created_at,
          content_piece
        };
      });

      return res.json({ ok: true, slots });
    } catch (error) {
      logger?.error?.({ err: error }, 'marketing calendar fetch failed');
      return jsonError(res, 500, 'failed to fetch calendar');
    }
  });

  app.post('/api/v1/marketing/calendar', requireKey, async (req, res) => {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) return jsonError(res, 400, 'owner_id is required');

      const { content_piece_id, scheduled_date, platform, status } = req.body || {};

      if (!isValidUuid(content_piece_id)) {
        return jsonError(res, 400, 'content_piece_id is required');
      }
      if (!isValidDate(scheduled_date)) {
        return jsonError(res, 400, 'scheduled_date is required');
      }

      const pieceCheck = await pool.query(
        `SELECT p.id FROM marketing_content_pieces p
         JOIN marketing_sessions s ON s.id = p.session_id
         WHERE p.id = $1 AND s.owner_id = $2
         LIMIT 1`,
        [content_piece_id, ownerId]
      );
      if (!pieceCheck.rows.length) {
        return jsonError(res, 404, 'content_piece not found');
      }

      const slotStatus = CALENDAR_STATUSES.has(status) ? status : 'planned';
      const slotPlatform = isNonEmptyString(platform) ? platform.trim() : null;

      const { rows } = await pool.query(
        `WITH upsert AS (
           UPDATE marketing_calendar_slots
           SET scheduled_date = $3, platform = $4, status = $5
           WHERE owner_id = $1 AND content_piece_id = $2
           RETURNING id
         )
         INSERT INTO marketing_calendar_slots (owner_id, content_piece_id, scheduled_date, platform, status)
         SELECT $1, $2, $3, $4, $5
         WHERE NOT EXISTS (SELECT 1 FROM upsert)
         RETURNING id;`,
        [ownerId, content_piece_id, scheduled_date, slotPlatform, slotStatus]
      );

      return res.status(201).json({ ok: true, data: rows[0] });
    } catch (error) {
      logger?.error?.({ err: error }, 'marketing calendar insert failed');
      return jsonError(res, 500, 'failed to schedule content');
    }
  });

  app.post('/api/v1/marketing/atoms', requireKey, async (req, res) => {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) return jsonError(res, 400, 'owner_id is required');

      const { atom_type, text, session_id, source_extraction_id, tags, reuse_consent_level } = req.body || {};

      if (!isNonEmptyString(atom_type)) return jsonError(res, 400, 'atom_type is required');
      if (!ALLOWED_ATOM_TYPES.has(atom_type)) {
        return jsonError(res, 400, 'invalid atom_type');
      }
      if (!isNonEmptyString(text)) return jsonError(res, 400, 'text is required');

      const reuse = isNonEmptyString(reuse_consent_level) ? reuse_consent_level.trim() : 'session_only';
      if (!ALLOWED_REUSE_CONSENT_LEVELS.has(reuse)) {
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
          JSON.stringify(normalizedTags),
          reuse
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
      const ownerId = getOwnerId(req);
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

      return res.json({ ok: true, atoms: rows });
    } catch (error) {
      logger?.error?.({ err: error }, 'marketing atom list failed');
      return jsonError(res, 500, 'failed to list atoms');
    }
  });

  app.post('/api/v1/marketing/brand-voice/rebuild', requireKey, async (req, res) => {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) return jsonError(res, 400, 'owner_id is required');

      if (typeof buildBrandVoiceProfile !== 'function') {
        return jsonError(res, 500, 'brand voice rebuild unavailable');
      }

      const profileResult = await buildBrandVoiceProfile(pool, ownerId);

      if (!profileResult?.ok) {
        return jsonError(res, 503, profileResult?.reason || 'brand voice build failed');
      }

      if (typeof scoreContentAgainstVoice === 'function' && profileResult?.profile) {
        try {
          scoreContentAgainstVoice(profileResult.profile, '');
        } catch (innerError) {
          logger?.warn?.({ err: innerError }, 'brand voice scoring probe failed');
        }
      }

      const payload = {
        owner_id: ownerId,
        profile: profileResult.profile,
        session_count: profileResult.sessionCount
      };

      return res.json({ ok: true, data: payload });
    } catch (error) {
      logger?.error?.({ err: error }, 'brand voice rebuild failed');
      return jsonError(res, 500, 'failed to rebuild brand voice');
    }
  });
}

export default registerMarketingCalendarRoutes;