/**
 * SYNOPSIS: Exports createProgressReportRoutes — routes/progress-report-routes.js.
 */
import express from 'express';

export function createProgressReportRoutes({ pool, requireKey, logger }) {
  const router = express.Router();

  router.post('/api/v1/progress-reports', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const { gradebook, class_notes } = req.body || {};
      if (typeof class_notes !== 'string') {
        return res.status(400).json({ ok: false, error: 'class_notes_required' });
      }

      const { rows } = await pool.query(
        `INSERT INTO progress_reports (owner_id, gradebook, class_notes)
         VALUES ($1, $2::jsonb, $3)
         RETURNING *`,
        [
          ownerId,
          JSON.stringify(gradebook ?? {}),
          class_notes,
        ],
      );

      return res.json({ ok: true, data: rows[0] });
    } catch (err) {
      if (logger?.error) {
        logger.error({ err }, 'progress-reports:create_failed');
      }
      next(err);
    }
  });

  return router;
}