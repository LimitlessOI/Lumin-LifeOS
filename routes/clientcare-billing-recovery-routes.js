/**
 * SYNOPSIS: Exports createClientcareBillingRecoveryRoutes — routes/clientcare-billing-recovery-routes.js.
 */
import express from 'express';

export function createClientcareBillingRecoveryRoutes(app, ctx) {
  const pool = ctx?.pool;
  const requireKey = ctx?.requireKey;
  const logger = ctx?.logger || console;

  if (!app || typeof app.use !== 'function') {
    throw new Error('express_app_required');
  }
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('pool_required');
  }
  if (typeof requireKey !== 'function') {
    throw new Error('requireKey_required');
  }

  const router = express.Router();

  router.post('/claims/import', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const reportData = req.body?.report_data;
      if (reportData == null) {
        return res.status(400).json({ ok: false, error: 'report_data_required' });
      }

      const payload = typeof reportData === 'string' ? JSON.parse(reportData) : reportData;
      const claims = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.claims)
          ? payload.claims
          : [payload];

      if (!claims.length) {
        return res.status(400).json({ ok: false, error: 'report_data_empty' });
      }

      const results = [];
      for (const claim of claims) {
        const normalizedClaim = claim && typeof claim === 'object' ? { ...claim } : { report_data: claim };
        const { rows } = await pool.query(
          `INSERT INTO clientcare_billing_recovery_claim_imports
             (owner_id, report_data)
           VALUES ($1, $2::jsonb)
           RETURNING *`,
          [ownerId, JSON.stringify(normalizedClaim)],
        );
        results.push(rows[0]);
      }

      return res.json({ ok: true, data: results });
    } catch (error) {
      if (error instanceof SyntaxError) {
        return res.status(400).json({ ok: false, error: 'invalid_json' });
      }
      logger.error?.({ err: error }, '[CLIENTCARE-BILLING-RECOVERY] claims import failed');
      return next(error);
    }
  });

  app.use('/api/v1', router);
  return router;
}