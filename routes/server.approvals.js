/**
 * SYNOPSIS: HTTP route module — Server Approvals.
 * @ssot docs/products/business-tools/PRODUCT_HOME.md
 */
import express from 'express';

const approvalsRouter = express.Router();

const PENDING_APPROVALS = new Map();

// 48h auto-reject: setTimeout is used to schedule automatic rejection of approvals.
function scheduleAutoReject(id) {
  const approval = PENDING_APPROVALS.get(id);
  if (!approval) return;
  const msUntilExpiration = approval.expirationTime - Date.now();
  if (msUntilExpiration <= 0) {
    PENDING_APPROVALS.delete(id);
    return;
  }
  setTimeout(() => {
    PENDING_APPROVALS.delete(id);
  }, msUntilExpiration);
}

export function registerApprovalRoutes(app) {
  app.use('/approvals', approvalsRouter);

  approvalsRouter.post('/request', (req, res) => {
    const { id, data } = req.body;
    if (!id || !data) {
      return res.status(400).send('Invalid request');
    }

    const expirationTime = Date.now() + 48 * 60 * 60 * 1000; // 48 hours in milliseconds
    PENDING_APPROVALS.set(id, { data, expirationTime });
    scheduleAutoReject(id);

    res.status(200).send('Approval request submitted');
  });

  approvalsRouter.get('/status/:id', (req, res) => {
    const { id } = req.params;
    const approval = PENDING_APPROVALS.get(id);

    if (!approval) {
      return res.status(404).send('Approval not found');
    }

    const isExpired = Date.now() > approval.expirationTime;
    if (isExpired) {
      PENDING_APPROVALS.delete(id);
      return res.status(200).send('Approval automatically rejected due to timeout');
    }

    res.status(200).send('Approval is pending');
  });
}
