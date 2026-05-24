/**
 * Bounded self-repair executor route.
 *
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 * @ssot docs/SSOT_NORTH_STAR.md Article II §2.16
 * @ssot docs/SSOT_COMPANION.md §0.5J
 */

import express from 'express';
import { pool } from '../core/database.js';
import { runSelfRepairExecutor } from '../services/self-repair-executor.js';

export function createSelfRepairExecutorRoutes({ requireKey }) {
  const router = express.Router();

  router.post('/api/v1/lifeos/command-center/self-repair/execute', requireKey, async (req, res, next) => {
    try {
      const dryRun = req.body?.dry_run !== false;
      const repairId = req.body?.repair_id || 'DR-003-RECEIPT-STALE';
      const result = await runSelfRepairExecutor({
        pool,
        req,
        dryRun,
        repairId,
      });

      const status = result.audit_result === 'PASS'
        ? 200
        : result.audit_result === 'DRY_RUN'
          ? 200
          : result.audit_result === 'BLOCKED'
            ? 409
            : 422;

      res.status(status).json({
        ok: result.audit_result === 'PASS' || result.audit_result === 'DRY_RUN',
        authority: result.authority,
        steps_planned: result.steps_planned,
        steps_executed: result.steps_executed,
        receipts_written: result.receipts_written,
        verification_result: result.verification_result,
        stopped_reason: result.stopped_reason,
        audit_before: result.audit_before,
        max_attempts: 2,
        dry_run: dryRun,
        repair_id: repairId,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
