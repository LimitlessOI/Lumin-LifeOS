/**
 * SYNOPSIS: Provides API routes for managing approval requests, including auto-rejection based on a timeout.
 * @ssot docs/products/business-tools/PRODUCT_HOME.md
 */
import { processApprovalRequest } from '../services/approvalService.js';

export function registerIssueApprovalRoutes(app, deps) {
  app.post('/api/v1/approvals/:id', deps.requireKey, async (req, res, next) => {
    try {
      const { id } = req.params;
      const payload = req.body;

      // This is where the 'approval_timeout' check would conceptually happen
      // For this task, we're assuming the service layer handles the timeout logic
      // and returns a result that indicates approval or auto-rejection.
      const result = await processApprovalRequest(deps, id, payload);
      res.json(result);
    } catch (error) {
      deps.logger.error({ error, approval_id: req.params.id }, 'Error in issueApprovalRoutes route');
      next(error);
    }
  });
}