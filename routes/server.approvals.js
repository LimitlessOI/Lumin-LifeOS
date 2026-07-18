/**
 * SYNOPSIS: HTTP route module — Server.Approvals.
 */
import express from 'express';

const approvalsRouter = express.Router();

const PENDING_APPROVALS = new Map();

function registerApprovalRoutes(app) {
  app.use('/approvals', approvalsRouter);

  approvalsRouter.post('/request', (req, res) => {
    const { id, data } = req.body;
    if (!id || !data) {
      return res.status(400).send('Invalid request');
    }

    const expirationTime = Date.now() + 48 * 60 * 60 * 1000; // 48 hours in milliseconds
    PENDING_APPROVALS.set(id, { data, expirationTime });

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

export { registerApprovalRoutes };
