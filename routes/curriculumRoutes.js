/**
 * SYNOPSIS: Provides API routes for accessing virtual real estate curriculum.
 * @ssot docs/products/business-tools/PRODUCT_HOME.md
 */
import { getCurriculumByIdService } from '../services/curriculumService.js';
export function registerCurriculumRoutes(app, deps) {
  app.get('/api/v1/curriculum/:id', deps.requireKey, async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await getCurriculumByIdService(deps, { id });
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error in curriculumRoutes route');
      next(error);
    }
  });
}