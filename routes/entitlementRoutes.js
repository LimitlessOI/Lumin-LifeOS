/**
 * SYNOPSIS: Exposes entitlement endpoints for validating user feature access.
 * @ssot docs/products/business-tools/PRODUCT_HOME.md
 */
import { checkEntitlements } from '../services/entitlements.js';

export function registerEntitlementRoutes(app, deps) {
  app.get('/api/v1/user/entitlements', deps.requireKey, async (req, res, next) => {
    try {
      const { projectId, entitlement } = req.query; // Assuming projectId and entitlement come from query parameters for a GET request
      if (!projectId || !entitlement) {
        return res.status(400).json({ message: 'Missing projectId or entitlement query parameters.' });
      }
      const result = await checkEntitlements(deps, { projectId, entitlement });
      res.json({ hasEntitlement: result });
    } catch (error) {
      deps.logger.error({ error }, 'Error in entitlementRoutes route');
      next(error);
    }
  });
}