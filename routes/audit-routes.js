/**
 * SYNOPSIS: Exports createAuditRoutes — routes/audit-routes.js.
 */
import express from 'express';

export function createAuditRoutes({ pool, requireKey, logger }) {
  const router = express.Router();

  router.post('/api/v1/audit', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const { stack, vendor_auth } = req.body || {};
      if (stack === undefined) return res.status(400).json({ ok: false, error: 'stack_required' });
      if (vendor_auth === undefined) return res.status(400).json({ ok: false, error: 'vendor_auth_required' });

      const { rows } = await pool.query(
        `INSERT INTO business_audits (owner_id, stack, vendor_auth)
         VALUES ($1, $2::jsonb, $3::jsonb)
         RETURNING *`,
        [ownerId, JSON.stringify(stack), JSON.stringify(vendor_auth)],
      );

      const data = rows[0] || null;
      return res.json({ ok: true, data });
    } catch (err) {
      if (logger?.error) logger.error({ err }, 'audit_submission_failed');
      next(err);
    }
  });

  return router;
}