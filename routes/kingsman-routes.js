/**
 * SYNOPSIS: Exports createDetectRoutes — routes/kingsman-routes.js.
 */
import express from 'express';

export function createDetectRoutes({ pool, requireKey, logger }) {
  const router = express.Router();

  router.post('/api/v1/detect', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const { pattern, evidence } = req.body || {};
      if (typeof pattern === 'undefined') {
        return res.status(400).json({ ok: false, error: 'pattern_required' });
      }
      if (typeof evidence === 'undefined') {
        return res.status(400).json({ ok: false, error: 'evidence_required' });
      }

      const { rows } = await pool.query(
        `INSERT INTO kingsman_threat_patterns
           (owner_id, pattern, evidence, created_at, updated_at)
         VALUES ($1, $2::jsonb, $3::jsonb, NOW(), NOW())
         RETURNING id, owner_id, pattern, evidence, created_at, updated_at`,
        [ownerId, JSON.stringify(pattern), JSON.stringify(evidence)],
      );

      const data = rows[0] || null;
      logger?.info?.(
        {
          ownerId,
          route: '/api/v1/detect',
          threatPatternId: data?.id || null,
        },
        'kingsman threat pattern submitted',
      );

      return res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  });

  return router;
}