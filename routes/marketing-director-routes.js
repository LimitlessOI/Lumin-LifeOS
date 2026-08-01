/**
 * SYNOPSIS: Marketing intelligence director API routes.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
import { getStrategicRecommendations, allocateBudget } from '../services/marketing-intelligence-director.js';

const marketingIntelligenceDirector = { getStrategicRecommendations, allocateBudget };

export function registerIntelligenceRoutes(app, deps) {
  deps.marketingIntelligenceDirector = marketingIntelligenceDirector;

  app.get('/api/v1/marketingos/director/recommendations', deps.requireKey, async (req, res, next) => {
    try {
      const payload = { founderId: req.query.founderId || req.lifeosUser?.sub };
      const result = await deps.marketingIntelligenceDirector.getStrategicRecommendations(deps, payload);
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error in marketing director recommendations route');
      next(error);
    }
  });

  app.post('/api/v1/marketingos/director/budget/allocate', deps.requireKey, async (req, res, next) => {
    try {
      const payload = req.body;
      const result = await deps.marketingIntelligenceDirector.allocateBudget(deps, payload);
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error in marketing director budget allocation route');
      next(error);
    }
  });
}
