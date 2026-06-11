/**
 * Bounded self-repair executor route + deploy check + execution log read.
 *
 * @ssot docs/projects/AMENDMENT_12_COMMAND_CENTER.md
 * @ssot docs/SSOT_NORTH_STAR.md Article II §2.16
 * @ssot docs/SSOT_COMPANION.md §0.5J
 */

import express from 'express';
import { runSelfRepairExecutor, EXECUTOR_MAX_ATTEMPTS } from '../services/self-repair-executor.js';
import { runDeployDriftPreventionHook } from '../services/self-repair-deploy-scheduler.js';
import { readLatestSelfRepairExecution, readLastPassExecutionLogEntry } from '../services/self-repair-execution-log.js';
import { readLatestRepairMemory } from '../services/self-repair-memory.js';
import {
  buildPreventionRegistry,
  readPreventionRegistrySnapshot,
} from '../services/self-repair-prevention-registry.js';
import {
  buildPreventionHookPlans,
  buildPreventionHooksStatus,
} from '../services/self-repair-prevention-hook-planner.js';

export function createSelfRepairExecutorRoutes({ requireKey, pool }) {
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
        memory_event: result.memory_event || null,
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/api/v1/lifeos/command-center/self-repair/deploy-check', requireKey, async (req, res, next) => {
    try {
      const dryRun = req.body?.dry_run === true;
      const triggeredBy = req.body?.triggered_by || 'deploy-check';
      const outcome = await runDeployDriftPreventionHook(pool, { dryRun, triggeredBy });
      res.status(outcome.ok ? 200 : outcome.action === 'halt' ? 409 : 200).json({
        ok: outcome.ok,
        action: outcome.action,
        reason: outcome.reason,
        drift: outcome.drift,
        repair_id: outcome.repair_id || null,
        max_attempts: EXECUTOR_MAX_ATTEMPTS,
        dry_run: dryRun,
        prevention_hook: outcome.prevention_hook || null,
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

  router.get('/api/v1/lifeos/command-center/self-repair/memory/latest', requireKey, async (req, res, next) => {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 5, 20);
      const memory = await readLatestRepairMemory(pool, limit);
      if (!memory.ok || memory.count === 0) {
        return res.status(404).json({
          ok: false,
          status: 'NO_DATA',
          note: 'No self-repair memory lessons recorded yet',
          read_path: 'GET /api/v1/lifeos/command-center/self-repair/memory/latest',
        });
      }
      const registry = await buildPreventionRegistry(pool, { lessonLimit: 50, persist: true });
      const snapshot = readPreventionRegistrySnapshot();
      res.json({
        ok: true,
        source: memory.source,
        lessons: memory.lessons,
        count: memory.count,
        candidate_rules: registry.candidate_rules,
        prevention_registry: {
          status: snapshot.ok ? snapshot.status : registry.status,
          path: snapshot.registry_path || registry.registry?.path || null,
          rule_count: registry.candidate_rules.length,
          generated_at: registry.generated_at,
          not_wired: !snapshot.ok && registry.candidate_rules.length === 0,
        },
        last_pass_execution: readLastPassExecutionLogEntry(),
        read_path: 'GET /api/v1/lifeos/command-center/self-repair/memory/latest',
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/v1/lifeos/command-center/self-repair/prevention/candidates', requireKey, async (req, res, next) => {
    try {
      const lessonLimit = Math.min(parseInt(req.query.lesson_limit, 10) || 50, 100);
      const registry = await buildPreventionRegistry(pool, { lessonLimit, persist: true });
      const snapshot = readPreventionRegistrySnapshot();
      if (!registry.candidate_rules.length) {
        return res.status(404).json({
          ok: false,
          status: registry.status === 'NO_DATA' ? 'NO_DATA' : 'NOT_WIRED',
          note: 'No receipt-backed lessons with known classification and prevention_rule yet',
          lesson_count_scanned: registry.lesson_count_scanned,
          read_path: 'GET /api/v1/lifeos/command-center/self-repair/prevention/candidates',
        });
      }
      res.json({
        ok: true,
        status: 'CANDIDATE_RULES',
        promoted_to_invariant: false,
        candidate_rules: registry.candidate_rules,
        lesson_count_scanned: registry.lesson_count_scanned,
        registry: snapshot.ok
          ? { path: snapshot.registry_path, generated_at: snapshot.generated_at }
          : registry.registry,
        read_path: 'GET /api/v1/lifeos/command-center/self-repair/prevention/candidates',
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/v1/lifeos/command-center/self-repair/prevention/hooks', requireKey, async (req, res, next) => {
    try {
      const status = await buildPreventionHooksStatus(pool);
      if (!status.wired_count) {
        return res.status(status.candidate_count ? 200 : 404).json({
          ok: false,
          status: status.candidate_count ? 'CANDIDATES_ONLY' : 'NOT_WIRED',
          promoted_to_invariant: false,
          hooks: status.hooks,
          wired_count: status.wired_count,
          note: status.candidate_count
            ? 'Candidate rules exist but no governed hook is wired for execution'
            : 'No prevention hooks or candidates yet',
          read_path: 'GET /api/v1/lifeos/command-center/self-repair/prevention/hooks',
        });
      }
      res.json({
        ok: true,
        status: 'WIRED',
        promoted_to_invariant: false,
        hooks: status.hooks,
        wired_count: status.wired_count,
        candidate_count: status.candidate_count,
        generated_at: status.generated_at,
        read_path: 'GET /api/v1/lifeos/command-center/self-repair/prevention/hooks',
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/v1/lifeos/command-center/self-repair/prevention/plan', requireKey, async (req, res, next) => {
    try {
      const planResult = await buildPreventionHookPlans(pool);
      if (!planResult.plans.length) {
        return res.status(404).json({
          ok: false,
          status: 'NOT_WIRED',
          note: 'No CANDIDATE_RULE plans available',
          read_path: 'GET /api/v1/lifeos/command-center/self-repair/prevention/plan',
        });
      }
      res.json({
        ok: true,
        status: planResult.status,
        promoted_to_invariant: false,
        plans: planResult.plans,
        lesson_count_scanned: planResult.lesson_count_scanned,
        generated_at: planResult.generated_at,
        read_path: 'GET /api/v1/lifeos/command-center/self-repair/prevention/plan',
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
