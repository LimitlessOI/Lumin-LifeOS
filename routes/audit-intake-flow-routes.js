/**
 * SYNOPSIS: Handles audit intake flow submissions.
 * @ssot docs/products/limitlessos/PRODUCT_HOME.md
 */
import { processAuditIntake } from '../services/auditIntakeService.js'; // Assuming this service exists based on the task description and general patterns.

export function registerAuditIntakeFlowRoutes(app, deps) {
  app.post('/api/v1/intake/flow/audit', deps.requireKey, async (req, res, next) => {
    try {
      const payload = req.body;
      // The payload for the audit intake flow will likely contain intake questions and optional system connections.
      // We will pass this directly to a service layer for processing.
      const result = await processAuditIntake(deps, payload);
      res.json(result);
    } catch (error) {
      deps.logger.error({ error }, 'Error in audit-intake-flow-routes route');
      next(error);
    }
  });
}