// @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md

import express from 'express';
import {
  createCommandControlJob,
  getCommandControlJob,
  listCommandControlJobs,
  cancelCommandControlJob,
  setCommandControlHalt,
  getCommandControlHaltState,
  updateCommandControlJobExecution,
} from '../services/builderos-command-control-service.js';
import { executeCommandControlJob } from '../services/builderos-governed-loop-executor.js';

export function createLifeOSBuilderOSCommandControlRoutes({ pool, requireKey }) {
  const router = express.Router();
  router.use(requireKey);

  function getForwardedOperatorKey(req) {
    return req.headers['x-command-key']
      || req.headers['x-command-center-key']
      || req.headers['x-lifeos-key']
      || req.headers['x-api-key']
      || null;
  }

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
      const jobId = req.params.id;
      const existing = await getCommandControlJob(pool, jobId);
      if (!existing) return res.status(404).json({ ok: false, error: 'job_not_found' });
      if (existing.status !== 'queued') {
        return res.status(409).json({ ok: false, error: 'job_not_executable', job_status: existing.status });
      }

      // Return immediately — Railway/proxy 502s when execute holds connection through full /build.
      res.status(202).json({
        ok: true,
        accepted: true,
        job_id: jobId,
        poll_url: `/api/v1/lifeos/builderos/command-control/jobs/${jobId}`,
      });

      setImmediate(async () => {
        try {
          await executeCommandControlJob(pool, jobId, {
            baseUrl: req.body?.base_url,
            commandKey: getForwardedOperatorKey(req),
          });
        } catch (error) {
          console.error('[command-control] async execute failed for job', jobId, error?.message);
          try {
            await updateCommandControlJobExecution(pool, jobId, {
              status: 'failed',
              blocker: error?.message || 'EXECUTE_ASYNC_CRASH',
            });
          } catch {
            // best-effort
          }
        }
      });
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
