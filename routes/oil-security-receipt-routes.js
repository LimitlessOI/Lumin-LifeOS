// routes/oil-security-receipt-routes.js
/**
 * OIL Security Receipt API routes
 * @ssot docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md
 */

import express from 'express';
import { pool } from '../core/db.js';
import { authMiddleware } from '../mw/auth.js';
import {
  writeSecurityReceipt,
  readRecentReceipts,
  readReceiptsByType,
  SECURITY_RECEIPT_TYPES,
} from '../services/oil-security-receipts.js';

export const createOILSecurityReceiptRoutes = () => {
  const router = express.Router();

  router.get(
    '/api/v1/oil/receipts',
    authMiddleware,
    async (req, res, next) => {
      try {
        const limit = parseInt(req.query.limit) || 50;
        const receipts = await readRecentReceipts(limit, pool);
        res.json({ receipts: receipts.rows });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    '/api/v1/oil/receipts/type/:type',
    authMiddleware,
    async (req, res, next) => {
      try {
        const type = req.params.type;
        const limit = parseInt(req.query.limit) || 20;
        const receipts = await readReceiptsByType(type, limit, pool);
        res.json({ receipts: receipts.rows });
      } catch (error) {
        if (error instanceof Error && error.message.includes('Invalid type')) {
          res.status(400).json({ error: 'Invalid type' });
        } else {
          next(error);
        }
      }
    }
  );

  router.post(
    '/api/v1/oil/receipts',
    authMiddleware,
    async (req, res, next) => {
      try {
        const { receipt_type, payload } = req.body;
        const receiptId = await writeSecurityReceipt(receipt_type, payload || {}, pool);
        res.status(201).json({ receipt_id: receiptId });
      } catch (error) {
        if (error instanceof Error && error.message.includes('Invalid type')) {
          res.status(400).json({ error: 'Invalid type' });
        } else {
          next(error);
        }
      }
    }
  );

  return router;
};