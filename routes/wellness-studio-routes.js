/**
 * SYNOPSIS: Registers WellnessStudioRoutes routes/handlers (routes/wellness-studio-routes.js).
 */
export function registerWellnessStudioRoutes(app, deps) {
  const db = deps?.db || deps?.pool;
  const callCouncilMember = deps?.callCouncilMember;
  const wellnessTherapist = deps?.wellnessTherapist;
  const requireKey = deps?.requireKey;

  if (!db || typeof db.query !== 'function') {
    throw new Error('registerWellnessStudioRoutes requires deps.db or deps.pool with a query method');
  }

  const runWellnessSession =
    wellnessTherapist?.runWellnessSession ||
    wellnessTherapist?.runSession ||
    wellnessTherapist?.createWellnessSession ||
    wellnessTherapist?.generateWellnessSession ||
    null;

  app.get('/api/wellness-studio/sessions', async (req, res) => {
    try {
      const userId = req?.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { rows } = await db.query(
        `
          select
            id,
            user_id,
            session_type,
            joy_checkin_id,
            integrity_score_log_id,
            wearable_data_id,
            emotional_pattern_id,
            session_notes,
            status,
            created_at,
            updated_at
          from wellness_studio_sessions
          where user_id = $1
          order by created_at desc
        `,
        [userId]
      );

      return res.json({ sessions: rows });
    } catch (error) {
      deps?.logger?.error?.({ error }, 'Failed to list wellness studio sessions');
      return res.status(500).json({ error: 'Failed to list wellness studio sessions' });
    }
  });

  app.post('/api/wellness-studio/sessions', requireKey, async (req, res) => {
    try {
      const userId = req?.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (typeof runWellnessSession !== 'function') {
        return res.status(500).json({ error: 'Wellness session orchestrator is unavailable' });
      }

      const result = await runWellnessSession({
        userId,
        body: req.body || {},
        db,
        callCouncilMember,
      });

      return res.status(201).json(result);
    } catch (error) {
      deps?.logger?.error?.({ error }, 'Failed to create wellness studio session');
      return res.status(500).json({ error: 'Failed to create wellness studio session' });
    }
  });

  app.get('/api/wellness-studio/sessions/:sessionId/insights', async (req, res) => {
    try {
      const userId = req?.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { sessionId } = req.params || {};
      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required' });
      }

      const { rows } = await db.query(
        `
          select
            id,
            user_id,
            session_id,
            insight_type,
            content,
            confidence_score,
            created_at,
            updated_at
          from wellness_studio_insights
          where user_id = $1
            and session_id = $2
          order by created_at asc
        `,
        [userId, sessionId]
      );

      return res.json({ insights: rows });
    } catch (error) {
      deps?.logger?.error?.({ error }, 'Failed to list wellness studio insights');
      return res.status(500).json({ error: 'Failed to list wellness studio insights' });
    }
  });
}

export default registerWellnessStudioRoutes;