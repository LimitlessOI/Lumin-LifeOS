/**
 * SYNOPSIS: Registers LifeosMemberFeedbackRoutes routes/handlers (routes/lifeos-member-feedback-routes.js).
 */
export function registerLifeosMemberFeedbackRoutes(app, deps) {
  const pool = deps?.pool;
  const requireKey = deps?.requireKey;
  const logger = deps?.logger ?? console;
  const callCouncilMember = deps?.callCouncilMember;

  if (!pool || typeof pool.query !== 'function') {
    throw new Error('registerLifeosMemberFeedbackRoutes requires deps.pool');
  }
  if (typeof requireKey !== 'function') {
    throw new Error('registerLifeosMemberFeedbackRoutes requires deps.requireKey');
  }

  app.post('/api/member-feedback', requireKey, async (req, res) => {
    try {
      const feedback = req.body?.feedback ?? req.body;

      if (feedback == null || (typeof feedback === 'string' && feedback.trim() === '')) {
        return res.status(400).send('Feedback is required');
      }

      const feedbackText = typeof feedback === 'string' ? feedback : JSON.stringify(feedback);

      const processed = await processFeedback({
        feedback: feedbackText,
        callCouncilMember,
        pool,
        logger,
      });

      return res.status(200).json({
        status: 'ok',
        message: 'Feedback processed',
        result: processed,
      });
    } catch (error) {
      logger.error?.({ err: error }, 'member-feedback route failed');
      return res.status(500).send('Failed to process feedback');
    }
  });
}

async function processFeedback({ feedback, callCouncilMember, pool, logger }) {
  const text = String(feedback ?? '').trim();

  if (!text) {
    throw new Error('Feedback text is empty');
  }

  const requestRow = await pool.query(
    `
      INSERT INTO tc_showing_feedback_requests (agent_id, status, payload)
      VALUES ($1, $2, $3)
      RETURNING id, agent_id, status, payload, created_at, updated_at
    `,
    [null, 'received', { feedback: text }],
  );

  let aiSummary = null;
  if (typeof callCouncilMember === 'function') {
    try {
      aiSummary = await callCouncilMember(
        'member-feedback',
        `Summarize this member feedback and identify sentiment and any actionable themes:\n\n${text}`,
      );
    } catch (error) {
      logger.warn?.({ err: error }, 'member-feedback AI summary failed');
    }
  }

  await pool.query(
    `
      INSERT INTO tc_showing_feedback (
        showing_id,
        transaction_id,
        sentiment,
        rating,
        price_feedback,
        condition_feedback,
        competition_feedback,
        raw_feedback,
        source
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, showing_id, transaction_id, sentiment, rating, price_feedback, condition_feedback, competition_feedback, raw_feedback, source, created_at, updated_at
    `,
    [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      text,
      aiSummary ? 'member-feedback-ai' : 'member-feedback',
    ],
  );

  await pool.query(
    `
      UPDATE tc_showing_feedback_requests
      SET status = $2, payload = $3
      WHERE id = $1
    `,
    [requestRow.rows[0].id, 'processed', { feedback: text, ai_summary: aiSummary }],
  );

  return {
    request: requestRow.rows[0],
    aiSummary,
  };
}

export default { registerLifeosMemberFeedbackRoutes };