/**
 * SYNOPSIS: Registers LifeosMemberFeedbackRoutes routes/handlers (routes/lifeos-member-feedback-routes.js).
 */
export function registerLifeosMemberFeedbackRoutes(app, deps) {
  const router = app?.constructor?.Router ? app.constructor.Router() : null;

  if (!router) {
    throw new Error('Unable to create router for lifeos member feedback routes');
  }

  const {
    pool,
    requireKey,
    callCouncilMember,
    logger,
    baseUrl,
    commitToGitHub,
    commitManyToGitHub,
  } = deps || {};

  if (!pool || typeof pool.query !== 'function') {
    throw new Error('deps.pool is required for lifeos member feedback routes');
  }

  if (typeof callCouncilMember !== 'function') {
    throw new Error('deps.callCouncilMember is required for lifeos member feedback routes');
  }

  const safeLogger = logger || console;

  router.post('/member-feedback', requireKey, async (req, res) => {
    try {
      const feedback = req.body?.feedback;
      if (typeof feedback !== 'string' || !feedback.trim()) {
        return res.status(400).json({ ok: false, error: 'feedback is required' });
      }

      const processed = await callCouncilMember('member-feedback', feedback, {
        baseUrl,
      });

      await pool.query(
        'INSERT INTO tc_showing_feedback (showing_id, transaction_id, sentiment, rating, price_feedback, condition_feedback, competition_feedback, raw_feedback, source) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          feedback,
          'member-feedback',
        ],
      );

      return res.status(200).json({
        ok: true,
        result: processed,
      });
    } catch (error) {
      safeLogger.error?.({ err: error }, 'member feedback route failed');
      return res.status(500).json({ ok: false, error: 'failed to process feedback' });
    }
  });

  app.use('/api', router);
}

export default registerLifeosMemberFeedbackRoutes;