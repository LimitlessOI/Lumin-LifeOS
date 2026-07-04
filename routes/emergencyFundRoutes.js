/**
 * SYNOPSIS: Exports createEmergencyFundRoutes — routes/emergencyFundRoutes.js.
 */
import express from 'express';

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeFundRow(row, ownerId) {
  if (!row) return null;
  return {
    ...row,
    owner_id: row.owner_id ?? ownerId,
    targetAmount: row.target_amount ?? row.targetAmount ?? null,
    currentAmount: row.current_amount ?? row.currentAmount ?? null,
  };
}

export function createEmergencyFundRoutes({ pool, requireKey, logger }) {
  const router = express.Router();

  router.post('/api/v1/emergency-fund', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const targetAmount = parseNumber(req.body?.targetAmount);
      const currentAmount = parseNumber(req.body?.currentAmount);

      if (targetAmount === null || currentAmount === null) {
        return res.status(400).json({ error: 'invalid_body' });
      }

      const { rows } = await pool.query(
        `INSERT INTO emergency_funds (owner_id, target_amount, current_amount)
         VALUES ($1, $2, $3)
         ON CONFLICT (owner_id)
         DO UPDATE SET target_amount = EXCLUDED.target_amount,
                       current_amount = EXCLUDED.current_amount,
                       updated_at = NOW()
         RETURNING *`,
        [ownerId, targetAmount, currentAmount],
      );

      const fund = normalizeFundRow(rows[0], ownerId);
      res.json({ ok: true, fund });
    } catch (err) {
      if (logger?.error) logger.error({ err }, 'emergency-fund route failed');
      next(err);
    }
  });

  return router;
}