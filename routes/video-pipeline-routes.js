/**
 * SYNOPSIS: Exports createVideoRoutes — routes/video-pipeline-routes.js.
 */
import express from 'express';

function getOwnerId(req) {
  return req.lifeosUser?.sub || null;
}

function getScriptFromBody(body) {
  const script = body?.script;
  return typeof script === 'string' ? script.trim() : '';
}

function normalizeEstimatedCost(estimate) {
  if (!estimate || typeof estimate !== 'object') return estimate;
  return {
    model: estimate.model ?? null,
    estimatedUSD: typeof estimate.estimatedUSD === 'number' ? estimate.estimatedUSD : null,
    note: estimate.note ?? null,
  };
}

function jsonSafeErrorMessage(err) {
  return err instanceof Error ? err.message : 'internal_error';
}

export function createVideoRoutes({ pool, requireKey, logger }) {
  const router = express.Router();

  router.post('/api/v1/video/generate', requireKey, async (req, res, next) => {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const script = getScriptFromBody(req.body);
      if (!script) return res.status(400).json({ ok: false, error: 'script_required' });

      const { rows } = await pool.query(
        `INSERT INTO video_jobs (owner_id, script, status, created_at, updated_at)
         VALUES ($1, $2, 'queued', NOW(), NOW())
         RETURNING *`,
        [ownerId, script],
      );

      const job = rows[0];
      logger?.info?.('[VIDEO] generate queued', { ownerId, jobId: job?.id || null });

      res.status(201).json({ ok: true, data: job });
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/v1/video/estimate', requireKey, async (req, res, next) => {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const script = getScriptFromBody(req.body);
      if (!script) return res.status(400).json({ ok: false, error: 'script_required' });

      const sceneCount = Math.max(1, Math.min(10, script.split(/\n+/).filter((line) => line.trim().length > 20).length || 1));
      const estimatedUSD = sceneCount * 0.003;

      res.json({
        ok: true,
        estimate: normalizeEstimatedCost({
          model: 'Flux Schnell images + FFmpeg',
          estimatedUSD,
          note: 'Per image. Add narration/composition costs if used.',
        }),
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/api/v1/video/status/:jobId', requireKey, async (req, res, next) => {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const { rows } = await pool.query(
        `SELECT *
           FROM video_jobs
          WHERE id = $1
            AND owner_id = $2
          LIMIT 1`,
        [req.params.jobId, ownerId],
      );

      const job = rows[0];
      if (!job) return res.status(404).json({ ok: false, error: 'job_not_found' });

      res.json({
        ok: true,
        status: {
          id: job.id,
          status: job.status ?? null,
          job: job,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export const createXxxRoutes = createVideoRoutes;