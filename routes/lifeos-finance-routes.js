/**
 * LifeOS Personal Finance API — mirror / clarity only; not investment advice.
 * Mounted at /api/v1/lifeos/finance
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import express from 'express';
import { createLifeOSFinance } from '../services/lifeos-finance.js';
import { createMoneyDecisionBridge } from '../services/lifeos-money-decision-bridge.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';
import { safeInt, safeId } from '../services/lifeos-request-helpers.js';

export function createLifeOSFinanceRoutes({ pool, requireKey, logger, callCouncilMember = null }) {
  const router = express.Router();
  const log = logger || console;
  const finance = createLifeOSFinance({ pool });

  // AI helper for Second Opinion surfacing
  const callAI = callCouncilMember
    ? async (prompt) => {
        const r = await callCouncilMember('anthropic', prompt);
        return typeof r === 'string' ? r : r?.content || r?.text || '';
      }
    : null;

  const moneyDecisionBridge = createMoneyDecisionBridge({ pool, callAI, logger: log });

  // Helper: resolve user_id (shared, case-insensitive)
  const resolveUserId = makeLifeOSUserResolver(pool);

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
        includeShared: req.query.shared === '1' || req.query.shared === 'true',
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
      const s = await finance.summaryMonth(userId, req.query.month, {
        includeShared: req.query.shared === '1' || req.query.shared === 'true',
      });
      res.json({ ok: true, summary: s });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Household sharing ─────────────────────────────────────────────────────
  // Explicit per-category VIEW grants to linked household members.

  router.get('/shares', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const [granted, incoming, viewers] = await Promise.all([
        finance.listShareScopes(userId),
        finance.listIncomingShares(userId),
        finance.listLinkedViewers(userId),
      ]);
      res.json({ ok: true, granted, incoming, linked_viewers: viewers });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/shares', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const category_id    = safeId(req.body.category_id);
      const viewer_user_id = safeId(req.body.viewer_user_id);
      if (!category_id || !viewer_user_id) {
        return res.status(400).json({ ok: false, error: 'category_id and viewer_user_id required' });
      }
      const scope = await finance.grantShareScope(userId, { category_id, viewer_user_id });
      res.status(201).json({ ok: true, scope });
    } catch (err) {
      const status = /not found|not linked|required/i.test(err.message) ? 400 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  router.post('/shares/:id/revoke', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const scopeId = safeId(req.params.id);
      if (!scopeId) return res.status(400).json({ ok: false, error: 'scope id required' });
      const scope = await finance.revokeShareScope(userId, scopeId);
      res.json({ ok: true, scope });
    } catch (err) {
      const status = /not found/i.test(err.message) ? 404 : 500;
      res.status(status).json({ ok: false, error: err.message });
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

  // ── CSV Import ──────────────────────────────────────────────────────────────
  // POST /finance/import/csv
  // Body: { user, csv_text, account_id, date_col, amount_col, memo_col, date_format }
  // Supports common bank export formats. No new packages — pure string parsing.
  router.post('/import/csv', requireKey, async (req, res) => {
    try {
      const { csv_text, account_id, date_col = 0, amount_col = 1, memo_col = 2, skip_header = true } = req.body;
      const userId = await resolveUserId(req.body.user || req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      if (!csv_text || typeof csv_text !== 'string') {
        return res.status(400).json({ ok: false, error: 'csv_text is required' });
      }

      const lines = csv_text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const start = skip_header ? 1 : 0;
      let imported = 0;
      let skipped  = 0;
      const errors = [];

      for (let i = start; i < lines.length; i++) {
        try {
          // Handle quoted CSV fields
          const cols = parseCSVLine(lines[i]);
          const rawDate   = (cols[date_col]   || '').trim().replace(/^"|"$/g, '');
          const rawAmount = (cols[amount_col] || '').trim().replace(/[^0-9.\-]/g, '');
          const rawMemo   = (cols[memo_col]   || '').trim().replace(/^"|"$/g, '');

          if (!rawDate || !rawAmount) { skipped++; continue; }

          const txnDate = parseDateFlexible(rawDate);
          const amount  = parseFloat(rawAmount);
          if (!txnDate || isNaN(amount)) { skipped++; continue; }

          await finance.createTransaction(userId, {
            account_id: account_id || null,
            category_id: null,
            amount,
            txn_date: txnDate,
            memo: rawMemo || null,
            source: 'csv_import',
          });
          imported++;
        } catch (rowErr) {
          errors.push({ line: i + 1, error: rowErr.message });
        }
      }

      log.info({ userId, imported, skipped }, '[LIFEOS-FINANCE] CSV import complete');
      res.json({ ok: true, imported, skipped, errors });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Money-Decision bridge (Phase 16 / Amendment 21 Layer 12)
  // Hooks the Finance surface into Decision Intelligence. Money decisions
  // above the user-configured threshold or marked irreversible automatically
  // trigger a Second Opinion.
  //
  //   GET  /decisions/threshold          — read the per-user threshold
  //   PUT  /decisions/threshold          — update the per-user threshold
  //   POST /decisions/log                — log a money decision (+ optional 2nd opinion)
  //   POST /decisions/second-opinion     — explicit 2nd opinion for an existing decision
  // ──────────────────────────────────────────────────────────────────────────

  router.get('/decisions/threshold', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const threshold = await moneyDecisionBridge.getThreshold(userId);
      res.json({ ok: true, threshold, default: moneyDecisionBridge.DEFAULT_THRESHOLD });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.put('/decisions/threshold', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body?.user || req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const threshold = safeInt(req.body?.threshold, { min: 1, max: 1_000_000, fallback: null });
      if (threshold == null) {
        return res.status(400).json({ ok: false, error: 'threshold must be a positive integer (dollars)' });
      }
      // Merge into flourishing_prefs JSON to avoid clobbering other prefs
      await pool.query(
        `UPDATE lifeos_users
         SET flourishing_prefs =
           COALESCE(flourishing_prefs, '{}'::jsonb)
           || jsonb_build_object('money_decision_threshold', $2::int)
         WHERE id = $1`,
        [userId, threshold]
      );
      res.json({ ok: true, threshold });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/decisions/log', requireKey, async (req, res) => {
    try {
      const body = req.body || {};
      const userId = await resolveUserId(body.user || req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      if (!body.title)  return res.status(400).json({ ok: false, error: 'title required' });
      if (body.amount == null || body.amount === '') {
        return res.status(400).json({ ok: false, error: 'amount required' });
      }

      const result = await moneyDecisionBridge.logMoneyDecision({
        userId,
        title:                  body.title,
        amount:                 body.amount,
        direction:              body.direction || 'out',
        account:                body.account || null,
        category:               body.category || null,
        alternativesConsidered: body.alternatives || body.alternatives_considered || null,
        emotionalState:         body.emotional_state || null,
        isIrreversible:         body.is_irreversible === true || body.is_irreversible === 'true',
        linkedTransactionId:    safeId(body.linked_transaction_id),
        linkedGoalId:           safeId(body.linked_goal_id),
        forceSecondOpinion:     body.force_second_opinion === true,
      });

      res.status(201).json({ ok: true, ...result });
    } catch (err) {
      const status = /required|amount must|title/.test(err.message) ? 400 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  router.post('/decisions/second-opinion', requireKey, async (req, res) => {
    try {
      const body = req.body || {};
      const userId = await resolveUserId(body.user || req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const decisionId = safeId(body.decision_id);
      if (!decisionId) return res.status(400).json({ ok: false, error: 'decision_id required' });

      const result = await moneyDecisionBridge.requestSecondOpinion({
        userId,
        decisionId,
        extraContext: body.extra_context || null,
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      const status = /not found|required|not configured/.test(err.message) ? 400 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  return router;
}

// ── CSV helpers ───────────────────────────────────────────────────────────────

function parseCSVLine(line) {
  const cols = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      cols.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  cols.push(cur);
  return cols;
}

function parseDateFlexible(raw) {
  // Try ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  // Try MM/DD/YYYY or M/D/YYYY
  const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2,'0')}-${mdy[2].padStart(2,'0')}`;
  // Try DD/MM/YYYY (European)
  const dmy = raw.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;
  // Try Month DD, YYYY
  const mdy2 = raw.match(/^(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (mdy2) {
    const months = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
    const m = months[mdy2[1].toLowerCase().slice(0,3)];
    if (m) return `${mdy2[3]}-${String(m).padStart(2,'0')}-${mdy2[2].padStart(2,'0')}`;
  }
  return null;
}
