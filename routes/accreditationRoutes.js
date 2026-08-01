/**
 * SYNOPSIS: Exports registerAccreditationRoutes — routes/accreditationRoutes.js.
 * @ssot docs/products/lumin-university/PRODUCT_HOME.md
 */

import { getAccreditationStructure } from '../services/accreditationService.js';

/**
 * Registers accreditation routes to the Express app.
 *
 * @param {object} app - The Express app instance.
 * @param {object} deps - Injected dependencies.
 * @param {import('pg').Pool} deps.pool - The PostgreSQL connection pool.
 * @param {function} deps.requireKey - The Express middleware enforcing the command key.
 * @param {object} deps.logger - The structured logger.
 * @param {string} deps.baseUrl - The public base URL string of the running deploy.
 * @param {function} deps.callCouncilMember - The async AI hook.
 */
export function registerAccreditationRoutes(app, deps) {
  /**
   * Fetches the accreditation structure based on institutionId.
   *
   * @param {object} req - The Express request object.
   * @param {object} res - The Express response object.
   * @param {function} next - The Express next middleware function.
   */
  app.get('/api/v1/accreditation/structure', deps.requireKey, async (req, res, next) => {
    try {
      const { institutionId } = req.query;
      const result = await getAccreditationStructure(deps, { institutionId });
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error fetching accreditation structure');
      next(error);
    }
  });
}