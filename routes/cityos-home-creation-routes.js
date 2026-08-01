/**
 * SYNOPSIS: Product Home Creation
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
import { createCityosHome } from '../services/cityosHomeService.js';
export function registerCityOSHomeCreationRoutes(app, deps) {
  app.post('/api/v1/cityos/home/create', deps.requireKey, async (req, res, next) => {
    try {
      const payload = req.body;
      const result = await createCityosHome(deps, payload);
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error in cityos-home-creation-routes route');
      next(error);
    }
  });
}