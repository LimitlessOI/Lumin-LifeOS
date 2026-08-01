/**
 * SYNOPSIS: HTTP route module — Server.Approvals.
 * @ssot docs/products/business-tools/PRODUCT_HOME.md
 */
import express from 'express';

const approvalsRouter = express.Router();

// PENDING_APPROVALS is a simple in-memory map. For production, this should be persisted in the database.
// The current implementation is suitable for demonstrating the timeout logic.
const PENDING_APPROVALS = new Map();

export function registerServer_approvals(app, deps) {
  app.use('/approvals', approvalsRouter);

  approvalsRouter.post('/request', deps.requireKey, async (req, res) => {
    const { id, data, controversy } = req.body;
    if (!id || !data) {
      return res.status(400).send('Invalid request: id and data are required.');
    }

    const expirationTime = Date.now() + 48 * 60 * 60 * 1000; // 48 hours in milliseconds
    PENDING_APPROVALS.set(id, { data, expirationTime, controversy });

    // Schedule the timeout for 48h auto-reject
    setTimeout(async () => {
      const currentApproval = PENDING_APPROVALS.get(id);
      if (currentApproval && Date.now() >= currentApproval.expirationTime) {
        deps.logger.warn(`Approval request ${id} for controversy: ${currentApproval.controversy ? 'true' : 'false'} automatically rejected due to 48h auto-reject timeout.`);
        PENDING_APPROVALS.delete(id);
        // In a real system, this would update a database record, e.g., approval_requests table.
        // For this exercise, we are only managing the in-memory map.
      }
    }, expirationTime - Date.now());

    deps.logger.info(`Approval request ${id} submitted. Controversy: ${controversy ? 'true' : 'false'}.`);
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
      deps.logger.info(`Approval ${id} status check: automatically rejected due to 48h auto-reject timeout.`);
      return res.status(200).send('Approval automatically rejected due to timeout.');
    }

    res.status(200).json({ status: 'pending', controversy: approval.controversy });
  });

  approvalsRouter.post('/approve/:id', deps.requireKey, async (req, res) => {
    const { id } = req.params;
    const approval = PENDING_APPROVALS.get(id);

    if (!approval) {
      return res.status(404).send('Approval not found or already processed.');
    }

    if (Date.now() > approval.expirationTime) {
      PENDING_APPROVALS.delete(id);
      deps.logger.warn(`Attempt to approve expired request ${id}. Automatically rejected due to 48h auto-reject timeout.`);
      return res.status(400).send('Cannot approve, request has expired.');
    }

    PENDING_APPROVALS.delete(id);
    deps.logger.info(`Approval request ${id} approved.`);
    res.status(200).send('Approval granted.');
  });

  approvalsRouter.post('/reject/:id', deps.requireKey, async (req, res) => {
    const { id } = req.params;
    const approval = PENDING_APPROVALS.get(id);

    if (!approval) {
      return res.status(404).send('Approval not found or already processed.');
    }

    PENDING_APPROVALS.delete(id);
    deps.logger.info(`Approval request ${id} rejected manually.`);
    res.status(200).send('Approval rejected.');
  });
}