/**
 * SYNOPSIS: Operator Consumption Ledger routes (OCL1).
 * Operator Consumption Ledger routes (OCL1).
 * @ssot docs/products/token-accounting-os/PRODUCT_HOME.md
 */
import { Router } from 'express';

export function createOperatorConsumptionLedgerRoutes({ pool, requireKey, tokenAccounting }) {
  const router = Router();
  const ocl = tokenAccounting?.ocl;

  router.post('/operator/record', requireKey, async (req, res) => {
    try {
      if (!ocl) {
        return res.status(503).json({ ok: false, error: 'operator consumption ledger not initialized' });
      }
      const row = await ocl.recordOperatorUsage(req.body || {});
      res.json({ ok: true, entry: row });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.get('/operator/recent', requireKey, async (req, res) => {
    try {
      const limit = req.query.limit || 20;
      const rows = await ocl.getOperatorUsageRecent(limit);
      res.json({ ok: true, entries: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/operator/summary', requireKey, async (req, res) => {
    try {
      const summary = await ocl.getOperatorUsageSummary({
        start: req.query.start,
        end: req.query.end,
        source: req.query.source,
      });
      res.json({ ok: true, ...summary });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
