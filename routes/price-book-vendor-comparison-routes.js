/**
 * SYNOPSIS: Provides an endpoint for accessing vendor comparison data.
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
import { getVendorComparisonData } from '../services/priceBookVendorComparisonService.js';

export function registerPriceBookVendorComparisonRoutes(app, deps) {
  app.get('/api/v1/price-book/vendor-comparison', deps.requireKey, async (req, res, next) => {
    try {
      const { includeExplanations, excludeCriteria } = req.query;
      const result = await getVendorComparisonData(deps, { includeExplanations, excludeCriteria });
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error in price-book-vendor-comparison-routes route');
      next(error);
    }
  });
}