/**
 * SYNOPSIS: BuilderOS Control Plane API — measurement health + build ledger.
 * BuilderOS Control Plane API — measurement health + build ledger.
 * @ssot docs/projects/AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md
 */
import { Router } from 'express';

export function createBuilderOSControlPlaneRoutes({ pool, requireKey, controlPlane }) {
  const router = Router();
  router.use(requireKey);

  router.get('/health', async (_req, res) => {
    try {
      const health = await controlPlane.getMeasurementHealth();
      res.json({ ok: true, ...health });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/summary', async (_req, res) => {
    try {
      const summary = await controlPlane.getControlPlaneSummary();
      res.json({ ok: true, ...summary });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/builds/:task_id', async (req, res) => {
    try {
      const build = await controlPlane.getBuildByTaskId(req.params.task_id);
      if (!build) return res.status(404).json({ ok: false, error: 'build_not_found' });
      res.json({ ok: true, build });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/builds/:task_id/done-gate', async (req, res) => {
    try {
      const gate = await controlPlane.canMarkBuildDone({
        task_id: req.params.task_id,
        allow_exception: req.query.allow_exception === 'true',
      });
      res.json({ ok: true, ...gate });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/builds/start', async (req, res) => {
    try {
      const row = await controlPlane.recordBuildStart(req.body || {});
      res.status(201).json({ ok: true, build: row });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.post('/builds/complete', async (req, res) => {
    try {
      const row = await controlPlane.recordBuildComplete(req.body || {});
      res.json({ ok: true, build: row });
    } catch (err) {
      const blocked = String(err.message || '').startsWith('BUILDEROS_DONE_BLOCKED');
      res.status(blocked ? 409 : 400).json({ ok: false, error: err.message });
    }
  });

  router.get('/tasks-without-proof', async (req, res) => {
    try {
      const rows = await controlPlane.getTasksWithoutProof(req.query.limit);
      res.json({ ok: true, count: rows.length, tasks: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
