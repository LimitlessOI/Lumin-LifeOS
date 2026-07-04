/**
 * SYNOPSIS: Exports createFaithStudioRoutes — routes/faith-studio-routes.js.
 */
import express from 'express';

function normalizeText(value) {
  return String(value ?? '').trim();
}

function parseJsonMaybe(value, fallback = {}) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function toInt(value) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

function jsonError(res, status, error, detail) {
  const payload = { error };
  if (detail !== undefined) payload.detail = detail;
  return res.status(status).json(payload);
}

function ensurePool(pool) {
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('pool_query_required');
  }
}

function readOwnerId(req) {
  return req.lifeosUser?.sub || null;
}

function coerceProjectRow(row) {
  if (!row) return row;
  return row;
}

async function selectProject(pool, projectId, ownerId) {
  const { rows } = await pool.query(
    `SELECT *
       FROM faith_projects
      WHERE id = $1
        AND owner_id = $2
      LIMIT 1`,
    [projectId, ownerId],
  );
  return rows[0] || null;
}

async function updateProjectById(pool, projectId, ownerId, setSql, params) {
  const { rows } = await pool.query(
    `UPDATE faith_projects
        SET ${setSql},
            updated_at = NOW()
      WHERE id = $1
        AND owner_id = $2
      RETURNING *`,
    [projectId, ownerId, ...params],
  );
  return rows[0] || null;
}

export function createFaithStudioRoutes({ pool, requireKey, logger }) {
  ensurePool(pool);

  if (typeof requireKey !== 'function') {
    throw new Error('requireKey_required');
  }

  const router = express.Router();

  function logError(message, err, meta = {}) {
    if (logger && typeof logger.error === 'function') {
      logger.error(message, { err, ...meta });
    }
  }

  async function requireOwner(req, res, next) {
    const ownerId = readOwnerId(req);
    if (!ownerId) return jsonError(res, 401, 'jwt_required');
    req.faithStudioOwnerId = ownerId;
    return next();
  }

  router.post('/api/v1/faith-studio/projects', requireKey, requireOwner, async (req, res) => {
    try {
      const ownerId = req.faithStudioOwnerId;
      const title = normalizeText(req.body?.title);
      const sourceMode = normalizeText(req.body?.source_mode);
      const traditionProfile = normalizeText(req.body?.tradition_profile);
      const privacyMode = normalizeText(req.body?.privacy_mode);
      const reverenceMode = normalizeText(req.body?.reverence_mode);

      if (!title || !sourceMode || !traditionProfile || !privacyMode || !reverenceMode) {
        return jsonError(res, 400, 'validation_error', {
          required: ['title', 'source_mode', 'tradition_profile', 'privacy_mode', 'reverence_mode'],
        });
      }

      const metadata = {
        source_mode: sourceMode,
        tradition_profile: traditionProfile,
        privacy_mode: privacyMode,
        reverence_mode: reverenceMode,
      };

      const { rows } = await pool.query(
        `INSERT INTO faith_projects
           (owner_id, title, metadata)
         VALUES ($1, $2, $3::jsonb)
         RETURNING *`,
        [ownerId, title, JSON.stringify(metadata)],
      );

      return res.json({ ok: true, data: coerceProjectRow(rows[0]) });
    } catch (err) {
      logError('faith_studio_create_project_failed', err);
      return jsonError(res, err.status || 500, err.message || 'internal_error', err.detail);
    }
  });

  router.post('/api/v1/faith-studio/projects/:id/source', requireKey, requireOwner, async (req, res) => {
    try {
      const ownerId = req.faithStudioOwnerId;
      const projectId = req.params.id;
      const sourceRef = normalizeText(req.body?.source_ref);
      const sourceText = normalizeText(req.body?.source_text);
      const canonType = normalizeText(req.body?.canon_type);

      if (!sourceRef || !sourceText || !canonType) {
        return jsonError(res, 400, 'validation_error', {
          required: ['source_ref', 'source_text', 'canon_type'],
        });
      }

      const current = await selectProject(pool, projectId, ownerId);
      if (!current) return jsonError(res, 404, 'project_not_found');

      const metadata = {
        ...(parseJsonMaybe(current.metadata, {}) || {}),
        source_ref: sourceRef,
        source_text: sourceText,
        canon_type: canonType,
      };

      const updated = await updateProjectById(
        pool,
        projectId,
        ownerId,
        'metadata = $3::jsonb',
        [JSON.stringify(metadata)],
      );

      return res.json({ ok: true, data: updated });
    } catch (err) {
      logError('faith_studio_update_source_failed', err);
      return jsonError(res, err.status || 500, err.message || 'internal_error', err.detail);
    }
  });

  router.post('/api/v1/faith-studio/projects/:id/tradition', requireKey, requireOwner, async (req, res) => {
    try {
      const ownerId = req.faithStudioOwnerId;
      const projectId = req.params.id;
      const traditionName = normalizeText(req.body?.tradition_name);
      const interpretationNotesJson = req.body?.interpretation_notes_json;
      const visualRulesJson = req.body?.visual_rules_json;

      if (!traditionName || interpretationNotesJson === undefined || visualRulesJson === undefined) {
        return jsonError(res, 400, 'validation_error', {
          required: ['tradition_name', 'interpretation_notes_json', 'visual_rules_json'],
        });
      }

      const current = await selectProject(pool, projectId, ownerId);
      if (!current) return jsonError(res, 404, 'project_not_found');

      const metadata = {
        ...(parseJsonMaybe(current.metadata, {}) || {}),
        tradition_name: traditionName,
        interpretation_notes_json: parseJsonMaybe(interpretationNotesJson, {}),
        visual_rules_json: parseJsonMaybe(visualRulesJson, {}),
      };

      const updated = await updateProjectById(
        pool,
        projectId,
        ownerId,
        'metadata = $3::jsonb',
        [JSON.stringify(metadata)],
      );

      return res.json({ ok: true, data: updated });
    } catch (err) {
      logError('faith_studio_update_tradition_failed', err);
      return jsonError(res, err.status || 500, err.message || 'internal_error', err.detail);
    }
  });

  router.post('/api/v1/faith-studio/projects/:id/scene', requireKey, requireOwner, async (req, res) => {
    try {
      const ownerId = req.faithStudioOwnerId;
      const projectId = req.params.id;
      const sequenceNo = toInt(req.body?.sequence_no);
      const sceneSummary = normalizeText(req.body?.scene_summary);
      const witnessModeEnabled = Boolean(req.body?.witness_mode_enabled);
      const explanationLevel = normalizeText(req.body?.explanation_level);

      if (sequenceNo == null || !sceneSummary || !explanationLevel) {
        return jsonError(res, 400, 'validation_error', {
          required: ['sequence_no', 'scene_summary', 'witness_mode_enabled', 'explanation_level'],
        });
      }

      const current = await selectProject(pool, projectId, ownerId);
      if (!current) return jsonError(res, 404, 'project_not_found');

      const metadata = {
        ...(parseJsonMaybe(current.metadata, {}) || {}),
        scene: {
          sequence_no: sequenceNo,
          scene_summary: sceneSummary,
          witness_mode_enabled: witnessModeEnabled,
          explanation_level: explanationLevel,
        },
      };

      const updated = await updateProjectById(
        pool,
        projectId,
        ownerId,
        'metadata = $3::jsonb',
        [JSON.stringify(metadata)],
      );

      return res.json({ ok: true, data: updated });
    } catch (err) {
      logError('faith_studio_update_scene_failed', err);
      return jsonError(res, err.status || 500, err.message || 'internal_error', err.detail);
    }
  });

  router.post('/api/v1/faith-studio/projects/:id/witness-mode', requireKey, requireOwner, async (req, res) => {
    try {
      const ownerId = req.faithStudioOwnerId;
      const projectId = req.params.id;
      const userId = normalizeText(req.body?.user_id);

      if (!userId) {
        return jsonError(res, 400, 'validation_error', { required: ['user_id'] });
      }

      const current = await selectProject(pool, projectId, ownerId);
      if (!current) return jsonError(res, 404, 'project_not_found');

      const metadata = {
        ...(parseJsonMaybe(current.metadata, {}) || {}),
        witness_mode: {
          user_id: userId,
        },
      };

      const updated = await updateProjectById(
        pool,
        projectId,
        ownerId,
        'metadata = $3::jsonb',
        [JSON.stringify(metadata)],
      );

      return res.json({ ok: true, data: updated });
    } catch (err) {
      logError('faith_studio_update_witness_mode_failed', err);
      return jsonError(res, err.status || 500, err.message || 'internal_error', err.detail);
    }
  });

  router.post('/api/v1/faith-studio/projects/:id/export', requireKey, requireOwner, async (req, res) => {
    try {
      const ownerId = req.faithStudioOwnerId;
      const projectId = req.params.id;
      const outputType = normalizeText(req.body?.output_type);
      const storageUrl = normalizeText(req.body?.storage_url);
      const metadataJson = req.body?.metadata_json;

      if (!outputType || !storageUrl || metadataJson === undefined) {
        return jsonError(res, 400, 'validation_error', {
          required: ['output_type', 'storage_url', 'metadata_json'],
        });
      }

      const current = await selectProject(pool, projectId, ownerId);
      if (!current) return jsonError(res, 404, 'project_not_found');

      const metadata = {
        ...(parseJsonMaybe(current.metadata, {}) || {}),
        export: {
          output_type: outputType,
          storage_url: storageUrl,
          metadata_json: parseJsonMaybe(metadataJson, {}),
        },
      };

      const updated = await updateProjectById(
        pool,
        projectId,
        ownerId,
        'metadata = $3::jsonb',
        [JSON.stringify(metadata)],
      );

      return res.json({ ok: true, data: updated });
    } catch (err) {
      logError('faith_studio_update_export_failed', err);
      return jsonError(res, err.status || 500, err.message || 'internal_error', err.detail);
    }
  });

  return router;
}