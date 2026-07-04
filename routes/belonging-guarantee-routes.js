/**
 * SYNOPSIS: Exports createBelongingGuaranteeRoutes — routes/belonging-guarantee-routes.js.
 */
import express from 'express';

const TABLE_NAME = 'children_success_moments';

function normalizeText(value) {
  return String(value ?? '').trim();
}

function createBadRequestError(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

export function createBelongingGuaranteeRoutes({ pool, requireKey, logger }) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('pool_query_required');
  }
  if (typeof requireKey !== 'function') {
    throw new Error('requireKey_required');
  }

  const router = express.Router();

  router.post('/api/v1/belonging-guarantee', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const body = req.body || {};
      const childId = normalizeText(body.child_id || body.childId);
      const lastSuccessDate = normalizeText(body.last_success_date || body.lastSuccessDate);

      if (!childId) return res.status(400).json({ ok: false, error: 'child_id_required' });
      if (!lastSuccessDate) return res.status(400).json({ ok: false, error: 'last_success_date_required' });

      const { rows: childRows } = await pool.query(
        `SELECT id, name
           FROM children
          WHERE id = $1
            AND owner_id = $2
          LIMIT 1`,
        [childId, ownerId],
      );

      if (!childRows[0]) return res.status(404).json({ ok: false, error: 'child_not_found' });

      const { rows } = await pool.query(
        `WITH input AS (
           SELECT $1::uuid AS child_id,
                  $2::timestamptz AS last_success_date,
                  $3::text AS owner_id
         ),
         inserted AS (
           INSERT INTO ${TABLE_NAME}
             (child_id, owner_id, last_success_date, flagged_for_review, created_at, updated_at)
           SELECT child_id, owner_id, last_success_date,
                  (NOW() - last_success_date) >= INTERVAL '5 days',
                  NOW(), NOW()
             FROM input
           RETURNING *
         )
         SELECT *
           FROM inserted
          LIMIT 1`,
        [childId, lastSuccessDate, ownerId],
      );

      const record = rows[0];

      return res.status(200).json({
        ok: true,
        data: record,
      });
    } catch (err) {
      if (logger?.error) {
        logger.error({ err }, 'belonging_guarantee_route_failed');
      }
      if (err?.code === '22P02') {
        return res.status(400).json({ ok: false, error: 'invalid_uuid_or_timestamp' });
      }
      next(err);
    }
  });

  return router;
}