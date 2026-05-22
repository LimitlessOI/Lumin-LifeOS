// routes/oil-security-receipt-routes.js
/** @ssot docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md */

import express from 'express';
import { pool } from '../core/database.js';
import authMiddleware from '../middleware/auth.js';
import {
  writeSecurityReceipt,
  readRecentReceipts,
  readReceiptsByType,
  SECURITY_RECEIPT_TYPES,
} from '../services/oil-security-receipts.js';

export function createOILSecurityReceiptRoutes() {
  const router = express.Router();

  router.get('/api/v1/oil/receipts', authMiddleware, async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const receipts = await readRecentReceipts(limit, pool);
      res.json({ receipts });
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/v1/oil/receipts/type/:type', authMiddleware, async (req, res, next) => {
    try {
      const { type } = req.params;
      const limit = parseInt(req.query.limit) || 20;
      const receipts = await readReceiptsByType(type, limit, pool);
      res.json({ receipts });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Invalid receipt type')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  });

  router.post('/api/v1/oil/receipts', authMiddleware, async (req, res, next) => {
    try {
      const { receipt_type, payload } = req.body;
      const { receipt_id } = await writeSecurityReceipt(receipt_type, payload || {}, pool);
      res.status(201).json({ receipt_id });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Invalid receipt type')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  });

  return router;
}
