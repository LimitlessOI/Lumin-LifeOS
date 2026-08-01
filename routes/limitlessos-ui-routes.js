/**
 * SYNOPSIS: UI update registration
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
import { getLimitlessosUiData } from '../services/limitlessos-ui-service.js';
export function registerLimitlessosUiRoutes(app, deps) {
  app.get('/ui/limitlessos', deps.requireKey, async (req, res, next) => {
    try {
      // UI update registration
      const result = await getLimitlessosUiData(deps, {});
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error in limitlessos-ui-routes route');
      next(error);
    }
  });
}