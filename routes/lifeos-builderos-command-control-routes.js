// @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md

import express from 'express';
import {
  createCommandControlJob,
  getCommandControlJob,
  cancelCommandControlJob,
  setCommandControlHalt,
  getCommandControlHaltState,
} from '../services/builderos-command-control-service.js';

export function createLifeOSBuilderOSCommandControlRoutes({ pool, requireKey }) {
  const router = express.Router();
  router.use(requireKey);

  router.post('/jobs', async (req, res, next) => {
    try {
      const job = await createCommandControlJob(pool, req.body || {});
      res.status(201).json({ ok: true, job });
    } catch (error) {
      next(error);
    }
  });

  router.get('/jobs/:id', async (req, res, next) => {
    try {
      const job = await getCommandControlJob(pool, req.params.id);
      if (!job) return res.status(404).json({ ok: false, error: 'job_not_found' });
      res.json({ ok: true, job });
    } catch (error) {
      next(error);
    }
  });

  router.post('/jobs/:id/cancel', async (req, res, next) => {
    try {
      const job = await cancelCommandControlJob(pool, req.params.id, req.body || {});
      if (!job) return res.status(409).json({ ok: false, error: 'job_not_cancellable' });
      res.json({ ok: true, job });
    } catch (error) {
      next(error);
    }
  });

  router.post('/halt', async (req, res, next) => {
    try {
      const haltState = await setCommandControlHalt(pool, req.body || {});
      res.json({ ok: true, halt_state: haltState });
    } catch (error) {
      next(error);
    }
  });

  router.get('/halt', async (_req, res, next) => {
    try {
      const haltState = await getCommandControlHaltState(pool);
      res.json({ ok: true, halt_state: haltState });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
