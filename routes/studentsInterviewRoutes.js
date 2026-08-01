/**
 * SYNOPSIS: Routes for handling student interviews.
 * @ssot docs/products/music-talent-studio/PRODUCT_HOME.md
 */
import { addStudentInterview, getStudentInterview } from '../services/studentsInterview.js';

export function registerStudentsInterviewRoutes(app, deps) {
  const { requireKey, logger } = deps;

  app.post('/students/interviews', requireKey, async (req, res) => {
    try {
      const interview = await addStudentInterview(deps, req.body);
      res.status(201).json(interview);
    } catch (error) {
      logger.error({ error, body: req.body }, 'Failed to add student interview via route');
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/students/interviews/:id', requireKey, async (req, res) => {
    try {
      const interview = await getStudentInterview(deps, { id: req.params.id });
      if (interview) {
        res.status(200).json(interview);
      } else {
        res.status(404).json({ error: 'Student interview not found' });
      }
    } catch (error) {
      logger.error({ error, params: req.params }, 'Failed to retrieve student interview via route');
      res.status(500).json({ error: error.message });
    }
  });
}