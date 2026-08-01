/**
 * SYNOPSIS: Add competitive landscape route for Teacher-OS.
 * @ssot docs/products/teacher-os/PRODUCT_HOME.md
 */
import { mapCompetitiveLandscape } from '../services/competitiveLandscape.js';

export function registerCompetitiveLandscapeRoutes(app, deps) {
  app.get('/api/v1/teacher-os/competitive-landscape', deps.requireKey, async (req, res, next) => {
    try {
      // The service function mapCompetitiveLandscape does not require parameters
      const result = await mapCompetitiveLandscape(deps, {});
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error in competitiveLandscapeRoutes route');
      next(error);
    }
  });
}