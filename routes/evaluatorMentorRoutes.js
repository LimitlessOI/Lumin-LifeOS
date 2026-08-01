/**
 * SYNOPSIS: Registers EvaluatorMentorRoutes routes/handlers (routes/evaluatorMentorRoutes.js).
 * @ssot docs/products/lumin-university/PRODUCT_HOME.md
 */
import { getEvaluatorMentorCriteria } from '../services/evaluatorMentorQualification.js';

export function registerEvaluatorMentorRoutes(app, deps) {
  const { pool, logger, requireKey } = deps;

  /**
   * GET /evaluator-mentor/criteria
   * Returns the qualification criteria for evaluators and mentors.
   */
  app.get('/evaluator-mentor/criteria', requireKey, (req, res) => {
    try {
      const criteria = getEvaluatorMentorCriteria();
      res.status(200).json(criteria);
    } catch (error) {
      logger.error({ error, path: req.path }, 'Failed to retrieve evaluator mentor criteria');
      res.status(500).json({ error: 'Failed to retrieve criteria' });
    }
  });

  /**
   * POST /evaluator-mentor/qualifications
   * Records a user's qualification.
   * Body: { userId: string, qualificationName: string, qualificationDescription: string, issuedBy: string, issuedDate: string, expiresDate?: string, status: string, metadata?: object }
   */
  app.post('/evaluator-mentor/qualifications', requireKey, async (req, res) => {
    const { userId, qualificationName, qualificationDescription, issuedBy, issuedDate, expiresDate, status, metadata } = req.body;

    if (!userId || !qualificationName || !qualificationDescription || !issuedBy || !issuedDate || !status) {
      return res.status(400).json({ error: 'Missing required qualification fields.' });
    }

    try {
      const sql = `
        INSERT INTO mentor_qualifications (user_id, qualification_name, qualification_description, issued_by, issued_date, expires_date, status, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, created_at, updated_at;
      `;
      const values = [userId, qualificationName, qualificationDescription, issuedBy, issuedDate, expiresDate, status, metadata];
      const result = await pool.query(sql, values);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      logger.error({ error, path: req.path, body: req.body }, 'Failed to record mentor qualification');
      res.status(500).json({ error: 'Failed to record qualification' });
    }
  });

  /**
   * GET /evaluator-mentor/qualifications/:userId
   * Retrieves all qualifications for a specific user.
   */
  app.get('/evaluator-mentor/qualifications/:userId', requireKey, async (req, res) => {
    const { userId } = req.params;

    try {
      const sql = `
        SELECT id, user_id, qualification_name, qualification_description, issued_by, issued_date, expires_date, status, metadata, created_at, updated_at
        FROM mentor_qualifications
        WHERE user_id = $1;
      `;
      const result = await pool.query(sql, [userId]);
      res.status(200).json(result.rows);
    } catch (error) {
      logger.error({ error, path: req.path, userId }, 'Failed to retrieve mentor qualifications for user');
      res.status(500).json({ error: 'Failed to retrieve qualifications' });
    }
  });
}