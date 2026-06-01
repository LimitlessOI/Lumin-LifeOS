// @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md

import express from 'express';
import {
  createCommandControlJob,
  getCommandControlJob,
  listCommandControlJobs,
  cancelCommandControlJob,
  setCommandControlHalt,
  getCommandControlHaltState,
} from '../services/builderos-command-control-service.js';
import { executeCommandControlJob } from '../services/builderos-governed-loop-executor.js';

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

  router.get('/jobs', async (req, res, next) => {
    try {
      const jobs = await listCommandControlJobs(pool, {
        limit: req.query.limit,
        status: req.query.status,
      });
      res.json({ ok: true, jobs });
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

  router.post('/jobs/:id/execute', async (req, res, next) => {
    try {
      const result = await executeCommandControlJob(pool, req.params.id, {
        baseUrl: req.body?.base_url,
        commandKey: req.headers['x-command-key'],
      });
      const job = await getCommandControlJob(pool, req.params.id);
      const status = result.ok ? 200 : result.error === 'job_not_executable' ? 409 : 422;
      res.status(status).json({ ok: result.ok, result, job });
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
