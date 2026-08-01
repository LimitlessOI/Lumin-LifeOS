/**
 * SYNOPSIS: Exposes an endpoint for comparing vendor offerings from the price book.
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
import { compareVendors } from '../services/priceBookService.js';

export function registerPriceBookVendorComparisonRoutes(app, deps) {
  app.get('/api/v1/pricebook/vendors/compare', deps.requireKey, async (req, res, next) => {
    try {
      // The `id` parameter from req.params is not applicable for a comparison route
      // that typically takes query parameters for filtering or selection.
      // Based on the previous attempt and the task, it seems like the comparison
      // logic should be handled by a service function and the route should pass
      // relevant query parameters to it.
      // Assuming the service function `compareVendors` will take query parameters
      // like `productIds` or `vendorIds` to perform the comparison.
      const { productIds, vendorIds, includeExplanations, excludeCriteria } = req.query;

      const result = await compareVendors(deps, { productIds, vendorIds, includeExplanations, excludeCriteria });
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error in price-book-vendor-comparison-routes route');
      next(error);
    }
  });
}