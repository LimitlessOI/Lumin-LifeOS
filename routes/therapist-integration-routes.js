/**
 * SYNOPSIS: HTTP route module — Therapist Integration Routes.
 * @ssot docs/products/wellness-studio/PRODUCT_HOME.md
 */
import { setupIntegration } from '../services/communication-profile.js'; // Assuming communication-profile.js contains setupIntegration
export function registerTherapistIntegrationRoutes(app, deps) {
  app.post('/api/therapist/integration', deps.requireKey, async (req, res, next) => {
    try {
      const payload = req.body;
      const result = await setupIntegration(deps, payload);
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error in therapist-integration-routes route');
      next(error);
    }
  });
}