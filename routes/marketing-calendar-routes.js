// SYNOPSIS: MarketingOS Phase 2 calendar/atoms JSON API routes.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

import { buildBrandVoiceProfile, scoreContentAgainstVoice } from '../services/marketing-brand-voice.js';

const ATOM_TYPES = new Set(['insight', 'hook', 'angle', 'cta', 'caption', 'subject_line', 'pov', 'other']);
const REUSE_CONSENT_LEVELS = new Set(['none', 'internal', 'external']);

function jsonError(res, status, error) {
  return res.status(status).json({ ok: false, error });
}

function getOwnerId(req) {
  return req.user?.id ?? req.body?.owner_id ?? req.query?.owner_id ?? null;
}

function parseDateOnly(input) {
  if (!input) return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function validateAtomPayload(body) {
  const atom_type = body?.atom_type;
  const text = body?.text;
  const reuse_consent_level = body?.reuse_consent_level ?? null;

  if (!atom_type || typeof atom_type !== 'string' || !ATOM_TYPES.has(atom_type)) {
    return 'Invalid atom_type';
  }
  if (!text || typeof text !== 'string' || !text.trim()) {
    return 'Invalid text';
  }
  if (reuse_consent_level !== null && (!REUSE_CONSENT_LEVELS.has(reuse_consent_level))) {
    return 'Invalid reuse_consent_level';
  }
  return null;
}

export function registerMarketingCalendarRoutes(app, deps) {
  const { pool, requireKey, logger, callCouncilMember } = deps;

  app.get('/api/v1/marketing/calendar', requireKey, async (req, res) => {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) return jsonError(res, 400, 'owner_id is required');

      const startDate = parseDateOnly(req.query?.from) ?? new Date().toISOString().slice(0, 10);
      const end = new Date(startDate);
      end.setDate(end.getDate() + 30);
      const endDate = end.toISOString().slice(0, 10);

      const { rows } = await pool.query(
        `SELECT
           s.*,
           p.title,
           p.body,
           p.url,
           p.author,
           p.published_at,
           p.metadata,
           p.session_id AS content_session_id,
           p.platform AS content_platform,
           p.format AS content_format,
           p.content_text,
           p.status AS content_status,
           p.generated_by_model,
           p.regeneration_count
         FROM marketing_calendar_slots s
         LEFT JOIN marketing_content_pieces p
           ON p.id = s.content_piece_id
         WHERE s.owner_id = $1
           AND s.scheduled_date >= $2
           AND s.scheduled_date < $3
         ORDER BY s.scheduled_date ASC, s.created_at ASC`,
        [ownerId, startDate, endDate]
      );

      return res.json({ ok: true, data: rows });
    } catch (err) {
      logger?.error?.({ err }, 'marketing calendar fetch failed');
      return jsonError(res, 500, 'Failed to fetch marketing calendar');
    }
  });

  app.post('/api/v1/marketing/atoms', requireKey, async (req, res) => {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) return jsonError(res, 400, 'owner_id is required');

      const validationError = validateAtomPayload(req.body);
      if (validationError) return jsonError(res, 400, validationError);

      const { atom_type, text, session_id = null, source_extraction_id = null, tags = null, reuse_consent_level = null } = req.body;

      const { rows } = await pool.query(
        `INSERT INTO marketing_content_atoms
           (owner_id, session_id, source_extraction_id, atom_type, text, tags, reuse_consent_level)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [ownerId, session_id, source_extraction_id, atom_type, text, tags, reuse_consent_level]
      );

      return res.status(201).json({ ok: true, data: rows[0] });
    } catch (err) {
      logger?.error?.({ err }, 'marketing atom create failed');
      return jsonError(res, 500, 'Failed to create marketing atom');
    }
  });

  app.get('/api/v1/marketing/atoms', requireKey, async (req, res) => {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) return jsonError(res, 400, 'owner_id is required');

      const atomType = req.query?.atom_type;
      if (atomType && (!ATOM_TYPES.has(atomType))) return jsonError(res, 400, 'Invalid atom_type');

      const params = [ownerId];
      let where = 'WHERE owner_id = $1';
      if (atomType) {
        params.push(atomType);
        where += ` AND atom_type = $${params.length}`;
      }

      const { rows } = await pool.query(
        `SELECT *
         FROM marketing_content_atoms
         ${where}
         ORDER BY created_at DESC`,
        params
      );

      return res.json({ ok: true, data: rows });
    } catch (err) {
      logger?.error?.({ err }, 'marketing atoms list failed');
      return jsonError(res, 500, 'Failed to list marketing atoms');
    }
  });

  app.post('/api/v1/marketing/brand-voice/rebuild', requireKey, async (req, res) => {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) return jsonError(res, 400, 'owner_id is required');

      const { rows: sessionRows } = await pool.query(
        `SELECT *
         FROM marketing_sessions
         WHERE owner_id = $1
         ORDER BY created_at DESC`,
        [ownerId]
      );

      const profile = await buildBrandVoiceProfile?.(sessionRows, { ownerId, pool, logger, baseUrl: deps.baseUrl });
      const scored = profile ? await scoreContentAgainstVoice?.(profile, sessionRows[0] ?? null, { ownerId, pool, logger, baseUrl: deps.baseUrl }) : null;

      return res.json({ ok: true, data: { profile: profile ?? null, score: scored ?? null } });
    } catch (err) {
      logger?.error?.({ err }, 'brand voice rebuild failed');
      return jsonError(res, 500, 'Failed to rebuild brand voice profile');
    }
  });

  logger?.info?.({ routes: ['/api/v1/marketing/calendar', '/api/v1/marketing/atoms', '/api/v1/marketing/brand-voice/rebuild'] }, 'marketing calendar routes registered');
}

export default registerMarketingCalendarRoutes;