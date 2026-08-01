/**
 * SYNOPSIS: Exposes API routes for marketing performance learning insights.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
import { learnFromPerformance } from '../services/marketing-message-learning.js';

const marketingMessageLearning = { learnFromPerformance };

export function registerMarketingPerformanceIntelRoutes(app, deps) {
  deps.marketingMessageLearning = marketingMessageLearning;

  app.get('/api/v1/marketingos/performance/learnings', deps.requireKey, async (req, res, next) => {
    try {
      const result = await deps.marketingMessageLearning.learnFromPerformance(deps, {});
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error in marketing-performance-intel-routes route');
      next(error);
    }
  });
}

export function registerPerformanceIntelRoutes(app, deps) {
  return registerMarketingPerformanceIntelRoutes(app, deps);
}
