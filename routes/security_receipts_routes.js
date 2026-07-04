/**
 * SYNOPSIS: Exports createSecurityReceiptsRoutes — routes/security_receipts_routes.js.
 */
import express from 'express';

function normalizeBody(body) {
  return body && typeof body === 'object' ? body : {};
}

function toText(value) {
  return value == null ? '' : String(value);
}

function badRequest(res, error, detail) {
  return res.status(400).json(detail ? { ok: false, error, detail } : { ok: false, error });
}

export function createSecurityReceiptsRoutes({ pool, requireKey, logger }) {
  const router = express.Router();

  router.post('/api/v1/security_receipts', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const body = normalizeBody(req.body);
      const securityFindingReceipt = toText(body.security_finding_receipt).trim();
      const severity = toText(body.severity).trim();
      const reproSteps = toText(body.repro_steps).trim();
      const exactFixTarget = toText(body.exact_fix_target).trim();
      const proofLimits = toText(body.proof_limits).trim();

      if (!securityFindingReceipt) return badRequest(res, 'security_finding_receipt_required');
      if (!severity) return badRequest(res, 'severity_required');
      if (!reproSteps) return badRequest(res, 'repro_steps_required');
      if (!exactFixTarget) return badRequest(res, 'exact_fix_target_required');
      if (!proofLimits) return badRequest(res, 'proof_limits_required');

      const { rows } = await pool.query(
        `INSERT INTO security_receipts
           (owner_id, security_finding_receipt, severity, repro_steps, exact_fix_target, proof_limits)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [ownerId, securityFindingReceipt, severity, reproSteps, exactFixTarget, proofLimits],
      );

      return res.json({ ok: true, data: rows[0] });
    } catch (err) {
      if (logger?.error) logger.error({ err }, 'security_receipts_create_failed');
      next(err);
    }
  });

  return router;
}