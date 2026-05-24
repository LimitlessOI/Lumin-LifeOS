/**
 * routes/lifeos-command-center-routes.js
 *
 * Read-only aggregate endpoints for the Command & Control Center v2 cockpit.
 * No write operations except the mode POST which returns NOT_WIRED (Stage 2).
 *
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 */

import express from 'express';
import { pool } from '../core/database.js';
import { DEFAULT_BUILDER_MODE, BUILDER_MODE, BUILDER_MODE_RULES } from '../config/builder-release-modes.js';
import {
  readLatestDailySummary,
  readRecentReceipts,
  readReceiptsByType,
  SECURITY_RECEIPT_TYPES,
} from '../services/oil-security-receipts.js';

export function createCommandCenterAggregateRoutes({ requireKey }) {
  const router = express.Router();

  /**
   * GET /api/v1/lifeos/command-center/phase14
   * Returns the latest Phase 14 Alpha-Ready certification from builder_audit_receipts.
   * findings_json contains: alpha_ready, verified_phases, conditional_phases, blockers
   */
  router.get('/api/v1/lifeos/command-center/phase14', requireKey, async (req, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT id, verdict, findings, findings_json, audited_at
         FROM builder_audit_receipts
         WHERE written_by = 'OIL'
           AND findings ILIKE 'Phase 14 Alpha-Ready Certification%'
         ORDER BY audited_at DESC LIMIT 1`
      );
      if (!rows.length) {
        return res.json({ found: false, status: 'UNKNOWN', alpha_ready: null });
      }
      const row = rows[0];
      const fj = row.findings_json || {};
      const alphaReady = Boolean(fj.alpha_ready);
      return res.json({
        found: true,
        alpha_ready: alphaReady,
        status: alphaReady ? 'ALPHA_READY' : 'NOT_ALPHA_READY',
        verified: fj.verified_phases?.length ?? 0,
        conditional: fj.conditional_phases?.length ?? 0,
        blockers: fj.blockers?.length ?? 0,
        certified_at: row.audited_at,
        receipt_id: row.id,
        verified_phases: fj.verified_phases ?? [],
        conditional_phases: fj.conditional_phases ?? [],
        blockers_detail: fj.blockers ?? [],
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/v1/lifeos/command-center/mode
   * Returns the current compiled builder release mode.
   * Runtime switching is NOT_WIRED — mode is a module-level constant.
   */
  router.get('/api/v1/lifeos/command-center/mode', requireKey, (req, res) => {
    res.json({
      mode: DEFAULT_BUILDER_MODE,
      rules: BUILDER_MODE_RULES[DEFAULT_BUILDER_MODE],
      all_modes: Object.keys(BUILDER_MODE),
      note: 'Mode is a compiled constant. Runtime switching requires Stage 2 (builder_runtime_config table).',
    });
  });

  /**
   * POST /api/v1/lifeos/command-center/mode
   * NOT_WIRED — runtime mode switching not yet implemented.
   * Returns 501 with clear explanation so the cockpit can show the correct state.
   */
  router.post('/api/v1/lifeos/command-center/mode', requireKey, (req, res) => {
    res.status(501).json({
      ok: false,
      status: 'NOT_WIRED',
      note: 'Runtime mode switching not yet implemented. Mode is compiled in config/builder-release-modes.js. Stage 2 will add a builder_runtime_config table and a BUILDER_MODE_CHANGE security receipt write.',
    });
  });

  /**
   * GET /api/v1/lifeos/command-center/security
   * Read-only SEC-F01 aggregate for live security state. Real receipt data only.
   */
  router.get('/api/v1/lifeos/command-center/security', requireKey, async (req, res, next) => {
    try {
      const [latestSummary, recentReceipts, geminiProof] = await Promise.all([
        readLatestDailySummary(pool),
        readRecentReceipts(20, pool, { coreOnly: true }),
        readReceiptsByType(SECURITY_RECEIPT_TYPES.GEMINI_LIVE_PROOF, 1, pool),
      ]);

      const lastProof = geminiProof[0] || null;

      res.json({
        status: latestSummary ? 'LIVE' : 'NOT_WIRED',
        receipt_spine_only: true,
        live_data_only: true,
        latest_summary: latestSummary,
        last_gemini_proof: lastProof,
        recent_receipts: recentReceipts,
        not_wired: {
          active_defense: true,
          deception: true,
          credential_rotation: true,
          auto_remediation: true,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
