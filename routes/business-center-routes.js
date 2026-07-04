/**
 * SYNOPSIS: Exports createBusinessCenterRoutes — routes/business-center-routes.js.
 */
import express from 'express';

function parseJsonBody(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    const err = new Error('invalid_metrics_json');
    err.status = 400;
    throw err;
  }
}

function requireOwnerId(req, res) {
  const ownerId = req.lifeosUser?.sub || null;
  if (!ownerId) {
    res.status(401).json({ error: 'jwt_required' });
    return null;
  }
  return ownerId;
}

export function createBusinessCenterRoutes({ pool, requireKey, logger }) {
  const router = express.Router();

  router.post('/api/v1/business-center', requireKey, async (req, res, next) => {
    try {
      const ownerId = requireOwnerId(req, res);
      if (!ownerId) return;

      const metrics = parseJsonBody(req.body?.metrics);
      if (metrics === null) {
        return res.status(400).json({ error: 'metrics_required' });
      }

      const { rows } = await pool.query(
        `SELECT $1::jsonb AS metrics_aggregated`,
        [JSON.stringify(metrics)],
      );

      logger?.info?.({ ownerId }, 'business_center_metrics_aggregated');

      return res.json({
        ok: true,
        metricsAggregated: rows[0]?.metrics_aggregated ?? metrics,
      });
    } catch (err) {
      if (err?.status === 400) {
        return res.status(400).json({ error: err.message });
      }
      next(err);
    }
  });

  return router;
}