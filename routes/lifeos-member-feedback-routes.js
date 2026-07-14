/**
 * SYNOPSIS: Registers LifeosMemberFeedbackRoutes routes/handlers (routes/lifeos-member-feedback-routes.js).
 */
export function registerLifeosMemberFeedbackRoutes(app, deps) {
  const { pool, requireKey, callCouncilMember, logger, commitToGitHub } = deps || {};

  if (!app || typeof app.post !== 'function') {
    throw new Error('registerLifeosMemberFeedbackRoutes requires an express app');
  }
  if (!pool || typeof pool.query !== 'function') {
    throw new Error('registerLifeosMemberFeedbackRoutes requires deps.pool');
  }
  if (typeof callCouncilMember !== 'function') {
    throw new Error('registerLifeosMemberFeedbackRoutes requires deps.callCouncilMember');
  }

  app.post('/api/member-feedback', requireKey, async (req, res) => {
    try {
      const feedback = req?.body?.feedback;

      if (typeof feedback !== 'string' || !feedback.trim()) {
        return res.status(400).json({ error: 'feedback is required' });
      }

      const agentId = req?.body?.agent_id ?? req?.body?.agentId ?? null;

      const prompt = [
        'You are processing member feedback for LifeOS.',
        'Summarize the feedback into a short actionable note.',
        'Return plain text only.',
        '',
        `Feedback: ${feedback.trim()}`
      ].join('\n');

      const processed = await callCouncilMember('member-feedback', prompt, {
        feedback,
        agentId,
        source: 'api/member-feedback'
      });

      const insertResult = await pool.query(
        `INSERT INTO tc_showing_feedback_requests (agent_id, status, payload)
         VALUES ($1, $2, $3)
         RETURNING id, created_at, updated_at`,
        [
          agentId,
          'processed',
          JSON.stringify({
            feedback,
            processed,
            source: 'api/member-feedback'
          })
        ]
      );

      if (typeof commitToGitHub === 'function') {
        try {
          await commitToGitHub(
            'logs/member-feedback/latest.json',
            JSON.stringify(
              {
                feedback,
                processed,
                request_id: insertResult.rows?.[0]?.id ?? null,
                created_at: insertResult.rows?.[0]?.created_at ?? null
              },
              null,
              2
            ),
            'Record processed member feedback'
          );
        } catch (commitErr) {
          if (logger?.warn) logger.warn({ err: commitErr }, 'member feedback commit skipped');
        }
      }

      return res.status(200).json({
        message: 'Feedback processed',
        processed,
        request: insertResult.rows?.[0] ?? null
      });
    } catch (err) {
      if (logger?.error) logger.error({ err }, 'member feedback route failed');
      return res.status(500).json({ error: 'Failed to process feedback' });
    }
  });
}

export default { registerLifeosMemberFeedbackRoutes };