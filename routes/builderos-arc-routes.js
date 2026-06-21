/**
 * SYNOPSIS: BuilderOS ARC pipeline API — system runs entry/simulate/translate, not agents.
 * BuilderOS ARC pipeline API — system runs entry/simulate/translate, not agents.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import { Router } from 'express';
import { runArcPipeline } from '../factory-staging/factory-core/arc/run-pipeline.js';
import { createBuilderOSArcService } from '../services/builderos-arc-service.js';

export function createBuilderOSArcRoutes({ requireKey, callCouncilMember, logger }) {
  const router = Router();
  router.use(requireKey);
  const arc = createBuilderOSArcService({ callCouncilMember, logger });

  router.post('/entry-gate', (req, res) => {
    const mission_id = req.body?.mission_id || req.query?.mission_id;
    if (!mission_id) return res.status(400).json({ ok: false, error: 'mission_id required' });
    const result = arc.runEntryGate(mission_id);
    res.status(result.ok ? 200 : 409).json({ ok: result.ok, ...result });
  });

  router.post('/simulate', (req, res) => {
    const mission_id = req.body?.mission_id || req.query?.mission_id;
    if (!mission_id) return res.status(400).json({ ok: false, error: 'mission_id required' });
    const result = arc.simulateMission(mission_id);
    res.status(result.ok ? 200 : 409).json({ ok: result.ok, ...result });
  });

  router.post('/run-pipeline', async (req, res) => {
    const mission_id = req.body?.mission_id || req.query?.mission_id;
    if (!mission_id) return res.status(400).json({ ok: false, error: 'mission_id required' });
    const result = runArcPipeline(mission_id, { writeReceipts: true });
    res.status(result.ok ? 200 : 409).json({ ok: result.ok, ...result });
  });

  router.post('/translate', async (req, res) => {
    const mission_id = req.body?.mission_id || req.query?.mission_id;
    if (!mission_id) return res.status(400).json({ ok: false, error: 'mission_id required' });
    const dryRun = req.body?.dry_run === true;
    const mode = req.body?.mode || 'auto';
    try {
      const result = await arc.translateMission(mission_id, { dryRun, mode });
      res.status(result.ok ? 200 : 409).json({ ok: result.ok, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/compile', (req, res) => {
    const mission_id = req.body?.mission_id || req.query?.mission_id;
    if (!mission_id) return res.status(400).json({ ok: false, error: 'mission_id required' });
    const result = arc.compileMission(mission_id);
    res.status(result.ok ? 200 : 409).json({ ok: result.ok, ...result });
  });

  return router;
}
