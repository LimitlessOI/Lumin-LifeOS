/**
 * SYNOPSIS: Exposes an HTTP route to store and analyze struggle detection form fill data.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */
import { logStruggleDetectionFormFillData } from '../services/struggleDetectionService.js';

export function registerStruggleDetectionFormFillData(app, deps) {
  app.post('/api/v1/struggle/form-fill-data', deps.requireKey, async (req, res, next) => {
    try {
      const payload = req.body;
      const result = await logStruggleDetectionFormFillData(deps, payload);
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error in struggleDetectionFormFillData route');
      next(error);
    }
  });
}