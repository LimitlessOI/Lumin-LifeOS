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

export function registerApprovalRoutes(app) {
  router.post('/:id', approveRequest);
  router.post('/:id/reject', rejectRequest);
  router.post('/:id/auto-reject', autoReject);

  app.use('/api/v1/approvals', router);
}
