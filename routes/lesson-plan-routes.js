/**
 * SYNOPSIS: Exports createLessonPlanRoutes — routes/lesson-plan-routes.js.
 */
import express from 'express';

function normalizeIntentBody(body) {
  if (typeof body === 'string') {
    return body.trim();
  }

  if (body && typeof body === 'object') {
    const intent = body.intent ?? body.teacherIntent ?? body.prompt ?? body.rawText;
    return String(intent ?? '').trim();
  }

  return '';
}

export function createLessonPlanRoutes({ pool, requireKey, logger }) {
  const router = express.Router();

  router.post('/api/v1/lesson-plans', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const intent = normalizeIntentBody(req.body);

      if (!intent) {
        return res.status(400).json({ ok: false, error: 'intent_required' });
      }

      const { rows } = await pool.query(
        `SELECT generate_lesson_plan($1, $2) AS lesson_plan`,
        [ownerId, intent],
      );

      const lessonPlan = rows[0]?.lesson_plan ?? null;

      if (logger && typeof logger.info === 'function') {
        logger.info(
          { owner_id: ownerId },
          'lesson plan generated',
        );
      }

      return res.json({
        ok: true,
        data: lessonPlan,
      });
    } catch (err) {
      if (logger && typeof logger.error === 'function') {
        logger.error({ err }, 'lesson plan generation failed');
      }
      next(err);
    }
  });

  return router;
}