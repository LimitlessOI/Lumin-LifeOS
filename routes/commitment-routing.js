/**
 * SYNOPSIS: Registers commitment-related API routes for the LifeOS platform.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { getLifeOSCommitments } from '../services/commitmentService.js';
export function registerCommitmentRouting(app, deps) {
  app.get('/api/v1/lifeos/commitments', deps.requireKey, async (req, res, next) => {
    try {
      // The spec example uses req.params.id, but the route is '/api/v1/lifeos/commitments' without an ID param.
      // Assuming a query for all commitments or filtered by query parameters if any.
      // For now, calling the service without an ID.
      const result = await getLifeOSCommitments(deps, {});
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error in /api/v1/lifeos/commitments route');
      next(error);
    }
  });
}