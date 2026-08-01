/**
 * SYNOPSIS: Exposes API routes for script generation.
 * @ssot docs/products/creator-media-os/PRODUCT_HOME.md
 */
import { generateScriptHooks } from '../services/scriptEngine.js';

export function registerScriptRoutes(app, deps) {
  app.post('/api/v1/script', deps.requireKey, async (req, res, next) => {
    try {
      const payload = req.body;
      const result = await generateScriptHooks(deps, payload);
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error in scriptRoutes route');
      next(error);
    }
  });
}