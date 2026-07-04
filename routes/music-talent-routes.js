/**
 * SYNOPSIS: Exports createMusicTalentRoutes — routes/music-talent-routes.js.
 */
import express from 'express';

export function createMusicTalentRoutes(app, ctx) {
  const router = express.Router();
  const pool = ctx?.pool;
  const logger = ctx?.logger || console;
  const requireKey = ctx?.requireKey;

  if (!pool || typeof pool.query !== 'function') {
    throw new Error('pool_required');
  }

  if (typeof requireKey !== 'function') {
    throw new Error('requireKey_required');
  }

  function parseInteger(value) {
    if (typeof value === 'number' && Number.isInteger(value)) return value;
    const n = Number.parseInt(value, 10);
    return Number.isInteger(n) ? n : null;
  }

  function normalizeText(value) {
    return String(value ?? '').trim();
  }

  router.post('/api/v1/submissions', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const studentId = parseInteger(req.body?.student_id);
      const submissionUrl = normalizeText(req.body?.submission_url);
      const submissionType = normalizeText(req.body?.submission_type);
      const genre = normalizeText(req.body?.genre);

      if (studentId === null) return res.status(400).json({ ok: false, error: 'student_id_required' });
      if (!submissionUrl) return res.status(400).json({ ok: false, error: 'submission_url_required' });
      if (!submissionType) return res.status(400).json({ ok: false, error: 'submission_type_required' });
      if (!genre) return res.status(400).json({ ok: false, error: 'genre_required' });

      const { rows } = await pool.query(
        `INSERT INTO talent_evaluation_submissions
           (owner_id, student_id, submission_url, submission_type, genre)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [ownerId, studentId, submissionUrl, submissionType, genre],
      );

      return res.json({ ok: true, data: rows[0] || null });
    } catch (err) {
      logger?.error?.({ err }, 'music_talent_routes_submission_failed');
      next(err);
    }
  });

  return router;
}