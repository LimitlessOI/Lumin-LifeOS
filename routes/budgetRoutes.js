/**
 * SYNOPSIS: Exports createBudgetRoutes — routes/budgetRoutes.js.
 */
import express from 'express';

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  return [];
}

function toJsonb(value) {
  return JSON.stringify(value ?? []);
}

function getOwnerId(req) {
  return req.lifeosUser?.sub || null;
}

export function createBudgetRoutes({ pool, requireKey, logger }) {
  const router = express.Router();

  router.post('/api/v1/budget', requireKey, async (req, res, next) => {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const body = req.body || {};
      const mode = typeof body.mode === 'string' ? body.mode : '';
      const incomeSources = normalizeArray(body.incomeSources);
      const fixedObligations = normalizeArray(body.fixedObligations);
      const discretionarySpending = normalizeArray(body.discretionarySpending);

      const { rows } = await pool.query(
        `SELECT
           $1::text AS owner_id,
           $2::text AS mode,
           $3::jsonb AS income_sources,
           $4::jsonb AS fixed_obligations,
           $5::jsonb AS discretionary_spending`,
        [
          ownerId,
          mode,
          toJsonb(incomeSources),
          toJsonb(fixedObligations),
          toJsonb(discretionarySpending),
        ],
      );

      const budget = rows[0] || {
        owner_id: ownerId,
        mode,
        income_sources: incomeSources,
        fixed_obligations: fixedObligations,
        discretionary_spending: discretionarySpending,
      };

      return res.json({ ok: true, budget });
    } catch (err) {
      if (logger?.error) logger.error({ err }, 'budget route failed');
      next(err);
    }
  });

  return router;
}