/**
 * SYNOPSIS: HTTP route module — Issue Approval Routes.
 * @ssot docs/products/business-tools/PRODUCT_HOME.md
 */
import express from 'express';

const router = express.Router();

// approval_timeout: requests older than 48 hours are automatically rejected
const PENDING_APPROVALS = new Map();
const APPROVAL_TIMEOUT_MS = 48 * 60 * 60 * 1000;

function autoReject(req, res) {
  const { id } = req.params;
  PENDING_APPROVALS.delete(id);
  res.send('Request auto-rejected');
}

function approveRequest(req, res) {
  const { id } = req.params;
  PENDING_APPROVALS.set(id, { approvedAt: Date.now() });
  res.send('Request approved');
}

function rejectRequest(req, res) {
  const { id } = req.params;
  PENDING_APPROVALS.delete(id);
  res.send('Request rejected');
}

export function registerApprovalRoutes(app, deps = {}) {
  const requireKey = deps.requireKey || ((req, res, next) => next());
  const logger = deps.logger || console;

  app.use('/api/v1/approvals', router);

  router.post('/:id', requireKey, async (req, res, next) => {
    try {
      const { id } = req.params;
      PENDING_APPROVALS.set(id, { requestedAt: Date.now() });
      logger?.info?.(`Approval request ${id} submitted; approval_timeout set to ${APPROVAL_TIMEOUT_MS}ms`);
      res.send('Approval request submitted');
    } catch (error) {
      logger?.error?.({ error, approval_id: req.params.id }, 'Error in issueApprovalRoutes');
      next(error);
    }
  });

  router.post('/:id/approve', requireKey, async (req, res, next) => {
    try {
      approveRequest(req, res);
    } catch (error) {
      logger?.error?.({ error, approval_id: req.params.id }, 'Error approving request');
      next(error);
    }
  });

  router.post('/:id/reject', requireKey, async (req, res, next) => {
    try {
      rejectRequest(req, res);
    } catch (error) {
      logger?.error?.({ error, approval_id: req.params.id }, 'Error rejecting request');
      next(error);
    }
  });

  router.post('/:id/auto-reject', requireKey, async (req, res, next) => {
    try {
      autoReject(req, res);
    } catch (error) {
      logger?.error?.({ error, approval_id: req.params.id }, 'Error auto-rejecting request');
      next(error);
    }
  });
}
