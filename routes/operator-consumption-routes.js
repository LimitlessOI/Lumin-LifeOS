/**
 * SYNOPSIS: Exports createOperatorConsumptionRoutes — routes/operator-consumption-routes.js.
 */
import express from 'express';

export function createOperatorConsumptionRoutes({ pool, requireKey, logger }) {
  const router = express.Router();

  function jsonOk(res, data) {
    return res.json({ ok: true, data });
  }

  function requireOwner(req, res) {
    const ownerId = req.lifeosUser?.sub || null;
    if (!ownerId) {
      res.status(401).json({ error: 'jwt_required' });
      return null;
    }
    return ownerId;
  }

  router.post('/api/v1/lifeos/operator-consumption', requireKey, async (req, res, next) => {
    try {
      const ownerId = requireOwner(req, res);
      if (!ownerId) return;

      const workToken = String(req.body?.work_token || '').trim();
      const shippedCodeDay = String(req.body?.shipped_code_day || '').trim();

      if (!workToken) return res.status(400).json({ ok: false, error: 'work_token_required' });
      if (!shippedCodeDay) return res.status(400).json({ ok: false, error: 'shipped_code_day_required' });

      const { rows } = await pool.query(
        `INSERT INTO operator_consumption_ledger (
           operator,
           source,
           task_id,
           blueprint_id,
           evidence_note,
           raw_payload
         ) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         RETURNING *`,
        [
          ownerId,
          'manual',
          workToken,
          shippedCodeDay,
          'operator consumption intake',
          JSON.stringify({
            work_token: workToken,
            shipped_code_day: shippedCodeDay,
            owner_id: ownerId,
          }),
        ],
      );

      if (logger?.info) {
        logger.info({ ownerId, workToken, shippedCodeDay, id: rows[0]?.id }, '[operator-consumption] created');
      }

      return jsonOk(res, rows[0]);
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/v1/lifeos/operator-consumption', requireKey, async (req, res, next) => {
    try {
      const ownerId = requireOwner(req, res);
      if (!ownerId) return;

      const { rows } = await pool.query(
        `SELECT *
           FROM operator_consumption_ledger
          WHERE operator = $1
          ORDER BY logged_at DESC, id DESC`,
        [ownerId],
      );

      return jsonOk(res, rows);
    } catch (err) {
      next(err);
    }
  });

  return router;
}