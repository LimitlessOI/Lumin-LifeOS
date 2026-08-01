/**
 * SYNOPSIS: Exposes API routes for marketing performance learning insights.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
import { learnFromPerformance } from '../services/marketingMessageLearning.js';

export function registerMarketingPerformanceIntelRoutes(app, deps) {
  app.get('/api/v1/marketingos/performance/learnings', deps.requireKey, async (req, res, next) => {
    try {
      // The specification implies that learnings are retrieved based on a founder or post.
      // Assuming 'founderId' or 'postId' might be passed as query parameters for filtering.
      // If no specific ID is provided, it might imply a general overview or all available learnings.
      // For now, we'll pass all query parameters to the service function for flexible filtering.
      const result = await learnFromPerformance(deps, req.query);
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error in marketing-performance-intel-routes route');
      next(error);
    }
  });
}