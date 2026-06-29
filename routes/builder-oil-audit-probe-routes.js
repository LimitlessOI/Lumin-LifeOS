/**
 * SYNOPSIS: routes/builder-oil-audit-probe-routes.js
 * routes/builder-oil-audit-probe-routes.js
 *
 * OIL-only audit probes — run inside Railway with runtime secrets.
 * Not general Builder execution; requires x-command-center-key.
 *
 * @ssot docs/products/project-governance/PRODUCT_HOME.md
 */

import { Router } from 'express';
import { runPhase7GeminiLiveProbe } from '../services/builder-oil-phase7-probe.js';

export function createBuilderOilAuditProbeRoutes({ requireKey, pool }) {
  const router = Router();

  function requireCommandCenterKeyOnly(req, res, next) {
    const provided = String(
      req.get('x-command-center-key')
      || req.get('x-command-key')
      || req.get('x-lifeos-key')
      || req.get('x-api-key')
      || ''
    ).trim();
    const configuredKeys = [
      process.env.COMMAND_CENTER_KEY,
      process.env.LIFEOS_KEY,
      process.env.API_KEY,
    ]
      .map((value) => String(value || '').trim())
      .filter(Boolean);
    if (configuredKeys.length === 0 || !provided || !configuredKeys.includes(provided)) {
      return res.status(401).json({
        ok: false,
        phase: 7,
        status: 'FAIL',
        error: 'Unauthorized: operator key required',
      });
    }
    return next();
  }

  /**
   * POST /api/v1/builder/oil-probe/phase7-gemini-live
   * Live Gemini audit-before-done: bad output → AUDIT_FAILED (Railway runtime only).
   */
  router.post('/oil-probe/phase7-gemini-live', requireCommandCenterKeyOnly, async (req, res) => {
    try {
      const report = await runPhase7GeminiLiveProbe(pool);
      if (!report.ok) {
        return res.status(report.checks?.find(c => c.name === 'gemini_key_configured' && !c.pass)
          ? 503
          : 500).json({
          ok: false,
          phase: 7,
          status: 'FAIL',
          error: report.error || 'Phase 7 live probe failed',
          audit_receipt_id: report.audit_receipt_id || null,
          checks: report.checks,
          lineage: report.lineage || null,
        });
      }
      res.json({
        ok: true,
        phase: 7,
        status: 'VERIFIED',
        probe: report.probe,
        runtime: report.runtime,
        audit_receipt_id: report.audit_receipt_id,
        fail_audit_receipt_id: report.fail_audit_receipt_id,
        task_receipt_id: report.task_receipt_id,
        checks: report.checks,
        lineage: report.lineage,
      });
    } catch (err) {
      res.status(500).json({
        ok: false,
        phase: 7,
        status: 'FAIL',
        error: err.message,
        halt_code: err.halt_code || null,
      });
    }
  });

  return router;
}
