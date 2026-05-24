/**
 * Bounded self-repair executor route + deploy check + execution log read.
 *
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 * @ssot docs/SSOT_NORTH_STAR.md Article II §2.16
 * @ssot docs/SSOT_COMPANION.md §0.5J
 */

import express from 'express';
import { pool } from '../core/database.js';
import { runSelfRepairExecutor, EXECUTOR_MAX_ATTEMPTS } from '../services/self-repair-executor.js';
import { runDeployRepairCheck } from '../services/self-repair-deploy-scheduler.js';
import { readLatestSelfRepairExecution } from '../services/self-repair-execution-log.js';

export function createSelfRepairExecutorRoutes({ requireKey }) {
  const router = express.Router();

  router.post('/api/v1/lifeos/command-center/self-repair/execute', requireKey, async (req, res, next) => {
    try {
      const dryRun = req.body?.dry_run !== false;
      const repairId = req.body?.repair_id || 'DR-003-RECEIPT-STALE';
      const triggeredBy = req.body?.triggered_by || 'CC_V2';
      const result = await runSelfRepairExecutor({
        pool,
        req,
        dryRun,
        repairId,
        triggeredBy,
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
        max_attempts: EXECUTOR_MAX_ATTEMPTS,
        dry_run: dryRun,
        repair_id: repairId,
        duration_ms: result.duration_ms,
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/v1/lifeos/command-center/self-repair/deploy-check', requireKey, async (req, res, next) => {
    try {
      const dryRun = req.body?.dry_run === true;
      const triggeredBy = req.body?.triggered_by || 'deploy-check';
      const outcome = await runDeployRepairCheck(pool, { dryRun, triggeredBy });
      res.status(outcome.ok ? 200 : outcome.action === 'halt' ? 409 : 200).json({
        ok: outcome.ok,
        action: outcome.action,
        reason: outcome.reason,
        drift: outcome.drift,
        repair_id: outcome.repair_id || null,
        max_attempts: EXECUTOR_MAX_ATTEMPTS,
        dry_run: dryRun,
        executor_result: outcome.executor_result
          ? {
              audit_result: outcome.executor_result.audit_result,
              stopped_reason: outcome.executor_result.stopped_reason,
              duration_ms: outcome.executor_result.duration_ms,
              steps_executed: outcome.executor_result.steps_executed,
            }
          : null,
        readiness_summary: outcome.readiness_summary || null,
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/v1/lifeos/command-center/self-repair/execution/latest', requireKey, async (req, res, next) => {
    try {
      const latest = await readLatestSelfRepairExecution(pool);
      if (!latest.entry) {
        return res.status(404).json({
          ok: false,
          status: 'NOT_WIRED',
          note: 'No self-repair execution log or receipt yet',
        });
      }
      res.json({
        ok: true,
        source: latest.source,
        entry: latest.entry,
        read_path: 'GET /api/v1/lifeos/command-center/self-repair/execution/latest',
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}