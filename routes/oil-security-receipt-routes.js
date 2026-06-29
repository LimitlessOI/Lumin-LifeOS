/**
 * SYNOPSIS: routes/oil-security-receipt-routes.js
 */
// routes/oil-security-receipt-routes.js
/** @ssot docs/products/project-governance/PRODUCT_HOME.md */

import express from 'express';
import {
  writeSecurityReceipt,
  readRecentReceipts,
  readReceiptsByType,
  readLatestDailySummary,
  SECURITY_RECEIPT_TYPES,
} from '../services/oil-security-receipts.js';

export function createOILSecurityReceiptRoutes({ requireKey, pool }) {
  const router = express.Router();

  router.get('/api/v1/oil/receipts', requireKey, async (req, res, next) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const coreOnly = String(req.query.core_only || '').toLowerCase() === 'true';
      const receipts = await readRecentReceipts(limit, pool, { coreOnly });
      res.json({ receipts });
    } catch (error) {
      next(error);
    }
  });

  router.get('/api/v1/oil/receipts/type/:type', requireKey, async (req, res, next) => {
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

  router.get('/api/v1/oil/receipts/summary/latest', requireKey, async (req, res, next) => {
    try {
      const latest = await readLatestDailySummary(pool);
      res.json({
        status: latest ? 'OK' : 'NOT_WIRED',
        receipt: latest,
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/api/v1/oil/receipts', requireKey, async (req, res, next) => {
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
