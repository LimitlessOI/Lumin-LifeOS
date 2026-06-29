/**
 * SYNOPSIS: Token Accounting OS — unified API.
 * Token Accounting OS — unified API.
 * @ssot docs/products/token-accounting-os/PRODUCT_HOME.md
 */
import { Router } from 'express';

export function createTokenAccountingRoutes({ pool, requireKey, tokenAccounting, savingsLedger }) {
  const router = Router();

  router.get('/unified', requireKey, async (req, res) => {
    try {
      const rows = await tokenAccounting.getUnified({
        limit: req.query.limit,
        source_system: req.query.source_system,
      });
      res.json({ ok: true, count: rows.length, entries: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/unified/today', requireKey, async (req, res) => {
    try {
      const since = new Date();
      since.setUTCHours(0, 0, 0, 0);
      const rows = await tokenAccounting.getUnified({ limit: 500 });
      const today = rows.filter((r) => new Date(r.logged_at) >= since);
      const totals = today.reduce(
        (acc, r) => {
          acc.total_tokens += Number(r.total_tokens || 0);
          acc.saved_tokens += Number(r.saved_tokens || 0);
          acc.estimated_cost_usd += Number(r.estimated_cost_usd || 0);
          acc.saved_cost_usd += Number(r.saved_cost_usd || 0);
          return acc;
        },
        { total_tokens: 0, saved_tokens: 0, estimated_cost_usd: 0, saved_cost_usd: 0 }
      );
      res.json({ ok: true, count: today.length, totals, entries: today });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/unified/history', requireKey, async (req, res) => {
    try {
      const days = Math.min(Number(req.query.days) || 30, 90);
      if (!pool) return res.json({ ok: true, days: [], note: 'no pool' });
      const { rows } = await pool.query(
        `SELECT DATE(logged_at) AS day,
                source_system,
                COUNT(*)::int AS entries,
                SUM(total_tokens)::bigint AS total_tokens,
                ROUND(SUM(estimated_cost_usd)::numeric, 6) AS estimated_cost_usd,
                ROUND(SUM(saved_cost_usd)::numeric, 6) AS saved_cost_usd
         FROM unified_token_accounting_report
         WHERE logged_at >= NOW() - ($1 || ' days')::interval
         GROUP BY DATE(logged_at), source_system
         ORDER BY day DESC, source_system`,
        [String(days)]
      ).catch(async () => {
        return pool.query(
          `SELECT DATE(logged_at) AS day, 'token_usage_log' AS source_system,
                  COUNT(*)::int AS entries,
                  SUM(input_tokens + output_tokens)::bigint AS total_tokens,
                  ROUND(SUM(cost_usd)::numeric, 6) AS estimated_cost_usd,
                  ROUND(SUM(saved_cost_usd)::numeric, 6) AS saved_cost_usd
           FROM token_usage_log
           WHERE logged_at >= NOW() - ($1 || ' days')::interval
           GROUP BY DATE(logged_at)
           ORDER BY day DESC`,
          [String(days)]
        );
      });
      res.json({ ok: true, days: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/unified/blind-spots', requireKey, async (req, res) => {
    try {
      const report = await tokenAccounting.getBlindSpots();
      res.json({ ok: true, ...report });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/unified/health', requireKey, async (req, res) => {
    try {
      const health = await tokenAccounting.getHealth();
      res.json({ ok: true, ...health });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/verify', requireKey, async (req, res) => {
    try {
      const state = await tokenAccounting.verifyCurrentState();
      res.json({ ok: true, ...state });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
