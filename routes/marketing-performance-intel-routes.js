/**
 * SYNOPSIS: Exposes API routes for marketing performance learning insights.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
import { learnFromPerformance } from '../services/marketing-message-learning.js';

export function registerMarketingPerformanceIntelRoutes(app, deps) {
  app.get('/api/v1/marketingos/performance/learnings', deps.requireKey, async (req, res, next) => {
    try {
      // The specification implies that learnings can be retrieved without specific parameters in the URL path,
      // as no `id` or other parameter is defined for `req.params` in the required route example.
      // Assuming the `learnFromPerformance` service function can operate without specific `id` from params for this route,
      // or that any necessary filtering would come from query parameters or the authenticated user's context.
      // For now, we pass an empty object as parameters, allowing the service to define its default behavior.
      const result = await learnFromPerformance(deps, {});
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error in marketing-performance-intel-routes route');
      next(error);
    }
  });
}