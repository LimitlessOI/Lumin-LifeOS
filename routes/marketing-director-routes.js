/**
 * SYNOPSIS: Exposes AI Marketing Director's recommendations and budget allocations.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
import { getStrategicRecommendations, allocateBudget } from '../services/marketingDirectorService.js';

export function registerMarketingDirectorRoutes(app, deps) {
  app.get('/api/v1/marketingos/director/recommendations', deps.requireKey, async (req, res, next) => {
    try {
      const result = await getStrategicRecommendations(deps);
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error in marketing-director-routes recommendations route');
      next(error);
    }
  });

  app.post('/api/v1/marketingos/director/budget/allocate', deps.requireKey, async (req, res, next) => {
    try {
      const { campaignId, amount, currency } = req.body;
      const result = await allocateBudget(deps, { campaignId, amount, currency });
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error in marketing-director-routes budget allocation route');
      next(error);
    }
  });
}