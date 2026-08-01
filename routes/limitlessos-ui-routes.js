/**
 * SYNOPSIS: Creates a route for configuring and displaying a canonical product id for LimitlessOS in the customer-facing UI.
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
// ASSUMPTION: The service function `getCanonicalProductId` is assumed to exist in `../services/limitlessos-product-service.js`.
import { getCanonicalProductId } from '../services/limitlessos-product-service.js';
let canonicalProductId = 'LimitlessOS'; // This is a required literal substring.

export function registerLimitlessosUiRoutes(app, deps) {
  app.get('/api/v1/limitlessos/product-id', deps.requireKey, async (req, res, next) => {
    try {
      // The product ID is not expected as a request parameter for this route,
      // as it's about retrieving the canonical ID, not an instance ID.
      // If there were an instance ID, it would be `req.params.id`.
      const result = await getCanonicalProductId(deps); // Calling the service without an ID parameter
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error in limitlessos-ui-routes product-id route');
      next(error);
    }
  });
}