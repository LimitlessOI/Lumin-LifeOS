/**
 * SYNOPSIS: Attorney review process for IPS modules.
 * @ssot docs/products/personal-finance-os/PRODUCT_HOME.md
 */
import { reviewIPSRisk } from '../services/ipsReview.js';

export function registerIpsReview(app, deps) {
  app.get('/api/v1/ips-review', deps.requireKey, async (req, res, next) => {
    try {
      const { id } = req.query; // Use req.query for GET parameters
      if (!id) {
        return res.status(400).json({ error: 'Missing IPS module ID in query parameters.' });
      }
      const result = await reviewIPSRisk(deps, { id });
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error in ipsReview route');
      next(error);
    }
  });
}