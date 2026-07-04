/**
 * SYNOPSIS: Exports createBlueprintRoutes — routes/builderos-routes.js.
 */
import express from 'express';

function normalizeText(value) {
  return String(value ?? '').trim();
}

function safeJsonParse(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return fallback;
  }
}

function extractTask(req) {
  if (req.body && Object.prototype.hasOwnProperty.call(req.body, 'task')) {
    return req.body.task;
  }
  return null;
}

function respondJsonPayload(res, data) {
  return res.json({ ok: true, data });
}

function createBuildHandler({ pool, logger }) {
  return async function handleBuild(req, res, next) {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const task = extractTask(req);
      if (task == null) return res.status(400).json({ ok: false, error: 'task_required' });

      const taskJson = safeJsonParse(task, null);
      if (taskJson === null && typeof task !== 'string') {
        return res.status(400).json({ ok: false, error: 'task_must_be_json' });
      }

      const { rows } = await pool.query(
        `INSERT INTO builder_blueprint_requests (owner_id, request_type, task, created_at, updated_at)
         VALUES ($1, $2, $3::jsonb, NOW(), NOW())
         RETURNING *`,
        [
          ownerId,
          'build',
          JSON.stringify(taskJson ?? task),
        ],
      );

      const record = rows[0] || null;

      if (logger?.info) {
        logger.info(
          {
            ownerId,
            requestType: 'build',
            requestId: record?.id || null,
          },
          'builder_blueprint_build_requested',
        );
      }

      return respondJsonPayload(res, record);
    } catch (err) {
      if (err?.status) return res.status(err.status).json({ ok: false, error: err.message });
      next(err);
    }
  };
}

function createExecuteHandler({ pool, logger }) {
  return async function handleExecute(req, res, next) {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const task = extractTask(req);
      if (task == null) return res.status(400).json({ ok: false, error: 'task_required' });

      const taskJson = safeJsonParse(task, null);
      if (taskJson === null && typeof task !== 'string') {
        return res.status(400).json({ ok: false, error: 'task_must_be_json' });
      }

      const { rows } = await pool.query(
        `INSERT INTO builder_blueprint_requests (owner_id, request_type, task, created_at, updated_at)
         VALUES ($1, $2, $3::jsonb, NOW(), NOW())
         RETURNING *`,
        [
          ownerId,
          'execute',
          JSON.stringify(taskJson ?? task),
        ],
      );

      const record = rows[0] || null;

      if (logger?.info) {
        logger.info(
          {
            ownerId,
            requestType: 'execute',
            requestId: record?.id || null,
          },
          'builder_blueprint_execute_requested',
        );
      }

      return respondJsonPayload(res, record);
    } catch (err) {
      if (err?.status) return res.status(err.status).json({ ok: false, error: err.message });
      next(err);
    }
  };
}

export function createBlueprintRoutes({ pool, requireKey, logger }) {
  const router = express.Router();

  if (!pool || typeof pool.query !== 'function') {
    throw new Error('pool_required');
  }

  if (typeof requireKey !== 'function') {
    throw new Error('requireKey_required');
  }

  router.post('/build', requireKey, createBuildHandler({ pool, logger }));
  router.post('/execute', requireKey, createExecuteHandler({ pool, logger }));

  return router;
}