/**
 * SYNOPSIS: Mounts the governed factory hot path (BPB → Builder → SENTRY → TSOS → Historian)
 * from factory-staging/factory-core onto the production Express app under /factory/*.
 *
 * This is the production cutover of the governed factory: it exposes the same
 * execute-step / execute-mission / intake / readiness surfaces the staging server
 * (factory-staging/startup/register-routes.js) exposes, WITHOUT re-registering the
 * staging GET /health (which would collide with the production /health).
 *
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import express from 'express';
import { dispatchExecuteStep } from '../factory-staging/factory-core/builder/run-step.js';
import { dispatchExecuteMission } from '../factory-staging/factory-core/builder/run-mission.js';
import { runBpbIntakeGate } from '../factory-staging/factory-core/bpb/intake-gate.js';
import { summarizeHistorian } from '../factory-staging/factory-core/historian/append-record.js';
import { summarizeHistory } from '../factory-staging/factory-core/historian/mission-history.js';
import { summarizeTsosMetrics } from '../factory-staging/factory-core/tsos/tsos-summary.js';
import { reconcileRemoteTruth } from '../factory-staging/factory-core/readiness/remote-truth-reconciler.js';

export function createFactoryMountRoutes({ requireKey, logger } = {}) {
  const router = express.Router();
  const guard = typeof requireKey === 'function' ? requireKey : (_req, _res, next) => next();

  router.get('/factory/readiness', guard, (_req, res) => {
    try {
      const truth = reconcileRemoteTruth();
      res.json({
        ok: true,
        mounted: 'production',
        remote_truth: truth,
        historian: summarizeHistorian(),
        tsos: summarizeTsosMetrics(),
        pipeline: 'BPB->Builder->SENTRY->TSOS->Historian',
      });
    } catch (err) {
      res.status(503).json({ ok: false, error: err?.message || String(err) });
    }
  });

  router.get('/factory/historian/summary', guard, (_req, res) => {
    res.json({ ok: true, historian: summarizeHistorian(), history: summarizeHistory() });
  });

  router.get('/factory/tsos/summary', guard, (_req, res) => {
    res.json({ ok: true, tsos: summarizeTsosMetrics(), guardrails: 'measurement_only_no_mission_authority' });
  });

  router.get('/factory/gates/intake', guard, (req, res) => {
    const mission_id = req.query.mission_id;
    if (!mission_id) return res.status(400).json({ ok: false, error: 'mission_id query required' });
    const intake = runBpbIntakeGate(String(mission_id), { strict_pd: req.query.strict === 'true' });
    res.status(intake.ok ? 200 : 422).json({ ok: intake.ok, intake });
  });

  router.post('/factory/execute-step', guard, (req, res) => {
    const { httpStatus, body } = dispatchExecuteStep(req.body || {});
    res.status(httpStatus).json(body);
  });

  router.post('/factory/execute-mission', guard, (req, res) => {
    const { httpStatus, body } = dispatchExecuteMission(req.body || {});
    res.status(httpStatus).json(body);
  });

  if (logger?.info) logger.info('✅ [FACTORY-MOUNT] Governed factory mounted at /factory/{execute-step,execute-mission,gates/intake,readiness,historian/summary,tsos/summary}');
  return router;
}
