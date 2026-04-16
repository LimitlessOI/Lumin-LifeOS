/**
 * LifeOS Personal Finance API — mirror / clarity only; not investment advice.
 * Mounted at /api/v1/lifeos/finance
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import express from 'express';
import { createLifeOSFinance } from '../services/lifeos-finance.js';

export function createLifeOSFinanceRoutes({ pool, requireKey, logger }) {
  const router = express.Router();
  const log = logger || console;
  const finance = createLifeOSFinance({ pool });

  async function resolveUserId(handleOrId) {
    if (handleOrId == null || handleOrId === '') return null;
    const s = String(handleOrId).trim();
    if (/^\d+$/.test(s)) {
      const { rows } = await pool.query('SELECT id FROM lifeos_users WHERE id = $1', [s]);
      return rows[0]?.id ?? null;
    }
    const { rows } = await pool.query('SELECT id FROM lifeos_users WHERE user_handle = $1', [s]);
    return rows[0]?.id ?? null;
  }

  router.get('/disclaimer', (_req, res) => {
    res.json({
      ok: true,
      disclaimer:
        'Education and self-reflection only. Not tax, legal, or investment advice. Past simulations do not predict future results.',
    });
  });

  router.get('/accounts', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      res.json({ ok: true, accounts: await finance.listAccounts(userId) });
    } catch (err) {
      log.warn?.(err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/accounts', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const { name, account_type, currency, external_ref } = req.body;
      if (!name?.trim()) return res.status(400).json({ ok: false, error: 'name required' });
      const row = await finance.createAccount(userId, { name, account_type, currency, external_ref });
      res.status(201).json({ ok: true, account: row });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/categories', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      res.json({ ok: true, categories: await finance.listCategories(userId) });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/categories', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const { name, values_tag, monthly_cap, sort_order } = req.body;
      if (!name?.trim()) return res.status(400).json({ ok: false, error: 'name required' });
      const row = await finance.createCategory(userId, { name, values_tag, monthly_cap, sort_order });
      res.status(201).json({ ok: true, category: row });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/transactions', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const rows = await finance.listTransactions(userId, {
        limit: parseInt(req.query.limit || '100', 10),
        from: req.query.from,
        to: req.query.to,
      });
      res.json({ ok: true, transactions: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/transactions', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const { account_id, category_id, amount, txn_date, memo, source } = req.body;
      if (amount == null) return res.status(400).json({ ok: false, error: 'amount required' });
      const row = await finance.createTransaction(userId, {
        account_id,
        category_id,
        amount,
        txn_date,
        memo,
        source,
      });
      res.status(201).json({ ok: true, transaction: row });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/summary', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const s = await finance.summaryMonth(userId, req.query.month);
      res.json({ ok: true, summary: s });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/goals', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      res.json({ ok: true, goals: await finance.listGoals(userId) });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/goals', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const row = await finance.upsertGoal(userId, req.body);
      res.json({ ok: true, goal: row });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/ips', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      res.json({ ok: true, ips: await finance.getIps(userId) });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.put('/ips', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const row = await finance.putIps(userId, {
        statement_text: req.body.statement_text,
        risk_notes: req.body.risk_notes,
      });
      res.json({ ok: true, ips: row });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
