/**
 * SYNOPSIS: Exports createRealEstateTrainingRoutes — routes/real-estate-training-routes.js.
 */
import express from 'express';

const JSONB_CONTENT_TYPE = 'application/json';

function parseJsonBody(value, fallback = null) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function isUuid(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

function normalizeModuleProgress(input) {
  const parsed = parseJsonBody(input, null);
  if (parsed === null) return null;
  return parsed;
}

export function createRealEstateTrainingRoutes({ pool, requireKey, logger }) {
  const router = express.Router();

  router.post('/api/v1/real-estate-training', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const { studentId } = req.body || {};
      const moduleProgress = normalizeModuleProgress(req.body?.moduleProgress);

      if (!isUuid(studentId)) {
        return res.status(400).json({ ok: false, error: 'studentId_required' });
      }

      if (moduleProgress === null) {
        return res.status(400).json({ ok: false, error: 'moduleProgress_required' });
      }

      const sql = `
        INSERT INTO real_estate_training_progress (
          owner_id,
          student_id,
          module_progress,
          updated_at
        )
        VALUES ($1, $2, $3::jsonb, NOW())
        RETURNING id, student_id, module_progress, updated_at
      `;

      const { rows } = await pool.query(sql, [ownerId, studentId, JSON.stringify(moduleProgress)]);
      const row = rows[0] || null;

      if (logger?.info) {
        logger.info(
          {
            ownerId,
            studentId,
            progressId: row?.id || null,
          },
          'real-estate-training progress updated',
        );
      }

      return res.json({
        ok: true,
        progressUpdated: row,
      });
    } catch (err) {
      if (err?.status) return res.status(err.status).json({ ok: false, error: err.message });
      if (logger?.error) {
        logger.error({ err }, 'real-estate-training route failed');
      }
      next(err);
    }
  });

  return router;
}