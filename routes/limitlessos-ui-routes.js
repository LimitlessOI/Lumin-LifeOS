/**
 * SYNOPSIS: UI update registration
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
import { getLimitlessosUiData } from '../services/limitlessos-service.js';

export function registerLimitlessOSUIRoutes(app, deps) {
  // UI update registration: expose the LimitlessOS UI route and brand/experience pages.
  app.get('/ui/limitlessos', deps.requireKey, async (req, res, next) => {
    try {
      // The original request structure for '/ui/limitlessos' did not specify params,
      // so we'll assume a simple data retrieval for the UI.
      // If specific data based on 'id' or other params were needed, they would be extracted from req.query or req.params.
      // For now, we call a service that provides general UI data.
      const result = await getLimitlessosUiData(deps, {}); 
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error in limitlessos-ui-routes route');
      next(error);
    }
  });
}