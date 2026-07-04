/**
 * SYNOPSIS: Exports createConfidenceArchitectureRoutes — routes/confidence-architecture-routes.js.
 */
import express from 'express';

const TABLE_NAME = 'children_achievements';

function normalizeText(value) {
  return String(value ?? '').trim();
}

function createBadRequestError(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function createNotFoundError(message = 'not_found') {
  const err = new Error(message);
  err.status = 404;
  return err;
}

function serializeJson(value) {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return '{}';
  }
}

function parseTimestamp(value) {
  const text = normalizeText(value);
  if (!text) return null;
  const ms = Date.parse(text);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

export function createConfidenceArchitectureRoutes({ pool, requireKey, logger }) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('pool_query_required');
  }
  if (typeof requireKey !== 'function') {
    throw new Error('requireKey_required');
  }

  const router = express.Router();

  router.post('/api/v1/confidence-architecture', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const body = req.body || {};
      const childId = normalizeText(body.child_id ?? body.childId);
      const winDescription = normalizeText(body.win_description ?? body.winDescription);
      const timestamp = parseTimestamp(body.timestamp);

      if (!childId) return res.status(400).json({ ok: false, error: 'child_id_required' });
      if (!winDescription) return res.status(400).json({ ok: false, error: 'win_description_required' });
      if (!timestamp) return res.status(400).json({ ok: false, error: 'timestamp_required' });

      const { rows: childRows } = await pool.query(
        `SELECT id, name, birthdate
           FROM children
          WHERE id = $1
            AND owner_id = $2
          LIMIT 1`,
        [childId, ownerId],
      );

      if (!childRows[0]) {
        throw createNotFoundError('child_not_found');
      }

      const insertedAt = new Date().toISOString();
      const { rows } = await pool.query(
        `INSERT INTO ${TABLE_NAME}
           (id, child_id, owner_id, achievement_title, achievement_date, evidence_type, evidence_uri, notes, metadata)
         VALUES ($1, $2, $3, $4, $5::timestamptz, $6, $7, $8, $9::jsonb)
         RETURNING *`,
        [
          crypto.randomUUID(),
          childId,
          ownerId,
          winDescription,
          timestamp,
          'win',
          null,
          null,
          serializeJson({
            source: 'confidence-architecture',
            surfaced_to: ['child', 'parent'],
            created_at: insertedAt,
          }),
        ],
      );

      const record = rows[0];
      logger?.info?.('confidence_architecture_win_logged', {
        ownerId,
        childId,
        achievementId: record?.id,
      });

      return res.status(201).json({
        ok: true,
        data: {
          achievement: record,
          child: childRows[0],
        },
      });
    } catch (err) {
      if (err?.status === 404) {
        return res.status(404).json({ ok: false, error: err.message || 'not_found' });
      }
      if (err?.status === 400) {
        return res.status(400).json({ ok: false, error: err.message });
      }
      next(err);
    }
  });

  return router;
}

export default createConfidenceArchitectureRoutes;