/**
 * SYNOPSIS: Implements the builderOS token receipt route for recording build completion.
 * @ssot docs/products/token-accounting-os/PRODUCT_HOME.md
 */
import { recordBuilderOSTokenReceipt } from '../services/builderOSTokenReceipt.js';

export function registerBuilderOSTokenReceipt(app, deps) {
  app.post('/api/v1/builderOS/token-receipt', deps.requireKey, async (req, res, next) => {
    try {
      const payload = req.body;
      const result = await recordBuilderOSTokenReceipt(deps, payload);
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error in builderOSTokenReceipt route');
      next(error);
    }
  });
}