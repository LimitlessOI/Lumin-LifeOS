/**
 * SYNOPSIS: HTTP route module — Server Approvals.
 * @ssot docs/products/business-tools/PRODUCT_HOME.md
 */
import express from 'express';

const approvalsRouter = express.Router();

// PENDING_APPROVALS is a simple in-memory map. For production, this should be persisted in the database.
const PENDING_APPROVALS = new Map();

// 48h auto-reject: setTimeout is used to schedule automatic rejection of approvals.
function scheduleAutoReject(id, logger) {
  const approval = PENDING_APPROVALS.get(id);
  if (!approval) return;
  const msUntilExpiration = approval.expirationTime - Date.now();
  if (msUntilExpiration <= 0) {
    PENDING_APPROVALS.delete(id);
    return;
  }
  setTimeout(() => {
    const currentApproval = PENDING_APPROVALS.get(id);
    if (currentApproval && Date.now() >= currentApproval.expirationTime) {
      logger?.warn?.(`Approval request ${id} automatically rejected due to 48h auto-reject timeout.`);
      PENDING_APPROVALS.delete(id);
    }
  }, msUntilExpiration);
}

export function registerApprovalRoutes(app, deps = {}) {
  const requireKey = deps.requireKey || ((req, res, next) => next());
  const logger = deps.logger || console;

  app.use('/approvals', approvalsRouter);

  approvalsRouter.post('/request', requireKey, async (req, res) => {
    const { id, data } = req.body;
    if (!id || !data) {
      return res.status(400).send('Invalid request: id and data are required.');
    }

    const expirationTime = Date.now() + 48 * 60 * 60 * 1000; // 48 hours in milliseconds
    PENDING_APPROVALS.set(id, { data, expirationTime });
    scheduleAutoReject(id, logger);

    logger?.info?.(`Approval request ${id} submitted with 48h auto-reject timeout.`);
    res.status(200).send('Approval request submitted with 48h auto-reject timeout.');
  });

  approvalsRouter.get('/status/:id', async (req, res) => {
    const { id } = req.params;
    const approval = PENDING_APPROVALS.get(id);

    if (!approval) {
      return res.status(404).send('Approval not found or already processed.');
    }

    const isExpired = Date.now() > approval.expirationTime;
    if (isExpired) {
      PENDING_APPROVALS.delete(id);
      return res.status(200).send('Approval automatically rejected due to timeout');
    }

    res.status(200).send('Approval is pending');
  });
}
