/**
 * SYNOPSIS: Registers StudentInterviewAnalyticsRoutes routes/handlers (routes/studentInterviewAnalyticsRoutes.js).
 * @ssot docs/products/lumin-university/PRODUCT_HOME.md
 */
import { getInterviewAnalysis } from '../services/studentInterviewAnalytics.js';

export function registerStudentInterviewAnalyticsRoutes(app, deps) {
  const { logger, requireKey } = deps;
  if (typeof requireKey !== 'function') {
    throw new Error('registerStudentInterviewAnalyticsRoutes requires deps.requireKey');
  }

  app.get('/student-interview-analytics/:id', requireKey, async (req, res) => {
    const { id } = req.params;
    logger.info({ id }, 'Fetching student interview analytics');
    try {
      const analysis = await getInterviewAnalysis(deps, { id });
      if (analysis) {
        res.status(200).json(analysis);
      } else {
        res.status(404).json({ message: 'Interview analysis not found.' });
      }
    } catch (error) {
      logger.error({ error, id }, 'Failed to fetch student interview analytics');
      res.status(500).json({ message: 'Failed to retrieve interview analytics.' });
    }
  });
}