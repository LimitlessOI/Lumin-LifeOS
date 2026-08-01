/**
 * SYNOPSIS: Exposes API routes for marketing performance learning insights.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
import { learnFromPerformance } from '../services/marketingMessageLearning.js';

export function registerMarketingPerformanceIntelRoutes(app, deps) {
  app.get('/api/v1/marketingos/performance/learnings', deps.requireKey, async (req, res, next) => {
    try {
      const { founderId, postId } = req.query; // Assuming founderId or postId can be passed as query parameters
      const result = await learnFromPerformance(deps, { founderId, postId });
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error in marketing-performance-intel-routes route');
      next(error);
    }
  });
}