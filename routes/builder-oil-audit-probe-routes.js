/**
 * routes/builder-oil-audit-probe-routes.js
 *
 * OIL-only audit probes — run inside Railway with runtime secrets.
 * Not general Builder execution; requires x-command-center-key.
 *
 * @ssot docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md
 */

import { Router } from 'express';
import { runPhase7GeminiLiveProbe } from '../services/builder-oil-phase7-probe.js';

export function createBuilderOilAuditProbeRoutes({ requireKey, pool }) {
  const router = Router();

  /**
   * POST /api/v1/builder/oil-probe/phase7-gemini-live
   * Live Gemini audit-before-done: bad output → AUDIT_FAILED (Railway runtime only).
   */
  router.post('/oil-probe/phase7-gemini-live', requireKey, async (req, res) => {
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
          checks: report.checks,
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
