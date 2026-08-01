/**
 * SYNOPSIS: Exposes API routes for extending wellness table services.
 * @ssot docs/products/wellness-studio/PRODUCT_HOME.md
 */
export function registerWellnessTableExtensionsRoutes(app, deps) {
  const { pool, requireKey, logger } = deps;

  app.post('/api/v1/wellness/extensions/joy-checkins', requireKey, async (req, res) => {
    try {
      const { user_id, session_id, joy_level, notes } = req.body;
      if (!user_id || !session_id || joy_level === undefined) {
        return res.status(400).json({ error: 'Missing required fields: user_id, session_id, joy_level' });
      }

      const result = await pool.query(
        'INSERT INTO wellness_studio_sessions (user_id, session_type, joy_checkin_id, session_notes) VALUES ($1, $2, $3, $4) RETURNING id, created_at',
        [user_id, 'joy_checkin', joy_level, notes]
      );
      logger.info({ sessionId: result.rows[0].id, userId: user_id }, 'Joy check-in recorded');
      res.status(201).json({ message: 'Joy check-in recorded successfully', id: result.rows[0].id, created_at: result.rows[0].created_at });
    } catch (error) {
      logger.error({ error: error.message, stack: error.stack }, 'Failed to record joy check-in');
      res.status(500).json({ error: 'Failed to record joy check-in' });
    }
  });

  app.post('/api/v1/wellness/extensions/integrity-score', requireKey, async (req, res) => {
    try {
      const { user_id, session_id, score, notes } = req.body;
      if (!user_id || !session_id || score === undefined) {
        return res.status(400).json({ error: 'Missing required fields: user_id, session_id, score' });
      }

      const result = await pool.query(
        'INSERT INTO wellness_studio_sessions (user_id, session_type, integrity_score_log_id, session_notes) VALUES ($1, $2, $3, $4) RETURNING id, created_at',
        [user_id, 'integrity_score', score, notes]
      );
      logger.info({ sessionId: result.rows[0].id, userId: user_id }, 'Integrity score logged');
      res.status(201).json({ message: 'Integrity score logged successfully', id: result.rows[0].id, created_at: result.rows[0].created_at });
    } catch (error) {
      logger.error({ error: error.message, stack: error.stack }, 'Failed to log integrity score');
      res.status(500).json({ error: 'Failed to log integrity score' });
    }
  });

  app.post('/api/v1/wellness/extensions/wearable-data', requireKey, async (req, res) => {
    try {
      const { user_id, session_id, data_type, data_content } = req.body;
      if (!user_id || !session_id || !data_type || !data_content) {
        return res.status(400).json({ error: 'Missing required fields: user_id, session_id, data_type, data_content' });
      }

      const result = await pool.query(
        'INSERT INTO wellness_studio_sessions (user_id, session_type, wearable_data_id, session_notes) VALUES ($1, $2, $3, $4) RETURNING id, created_at',
        [user_id, 'wearable_data', JSON.stringify(data_content), `Wearable data type: ${data_type}`]
      );
      logger.info({ sessionId: result.rows[0].id, userId: user_id }, 'Wearable data recorded');
      res.status(201).json({ message: 'Wearable data recorded successfully', id: result.rows[0].id, created_at: result.rows[0].created_at });
    } catch (error) {
      logger.error({ error: error.message, stack: error.stack }, 'Failed to record wearable data');
      res.status(500).json({ error: 'Failed to record wearable data' });
    }
  });

  app.post('/api/v1/wellness/extensions/emotional-patterns', requireKey, async (req, res) => {
    try {
      const { user_id, session_id, pattern_type, description, confidence } = req.body;
      if (!user_id || !session_id || !pattern_type || !description) {
        return res.status(400).json({ error: 'Missing required fields: user_id, session_id, pattern_type, description' });
      }

      const result = await pool.query(
        'INSERT INTO wellness_studio_insights (user_id, session_id, insight_type, content, confidence_score) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at',
        [user_id, session_id, 'emotional_pattern', description, confidence || null]
      );
      logger.info({ insightId: result.rows[0].id, userId: user_id }, 'Emotional pattern insight logged');
      res.status(201).json({ message: 'Emotional pattern insight logged successfully', id: result.rows[0].id, created_at: result.rows[0].created_at });
    } catch (error) {
      logger.error({ error: error.message, stack: error.stack }, 'Failed to log emotional pattern insight');
      res.status(500).json({ error: 'Failed to log emotional pattern insight' });
    }
  });
}