/**
 * SYNOPSIS: Exports createFinancialRevenueRoutes — routes/financial-revenue-routes.js.
 */
import express from 'express';

const POSITIVE_CURRENCIES = new Set(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'NZD', 'JPY']);

function normalizeText(value) {
  return String(value ?? '').trim();
}

function normalizeCurrency(value) {
  return normalizeText(value).toUpperCase();
}

function parseAmount(value) {
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function jsonOrEmpty(value) {
  return value == null ? {} : value;
}

function getOwnerId(req) {
  return req.lifeosUser?.sub || null;
}

function createFinancialRevenueService({ pool }) {
  async function getDashboard(ownerId) {
    const { rows } = await pool.query(
      `SELECT COALESCE(jsonb_build_object(
         'ownerId', $1,
         'generatedAt', NOW(),
         'revenueEvents', COALESCE(revenue_events, '[]'::jsonb),
         'spendingAnalysis', COALESCE(spending_analysis, '{}'::jsonb),
         'incomeDrones', COALESCE(income_drones, '[]'::jsonb)
       ), '{}'::jsonb) AS dashboard
       FROM (
         SELECT
           (SELECT jsonb_agg(to_jsonb(e) ORDER BY e.created_at DESC)
              FROM revenue_events e
             WHERE e.owner_id = $1) AS revenue_events,
           (SELECT to_jsonb(a)
              FROM financial_spending_analysis a
             WHERE a.owner_id = $1
             ORDER BY a.updated_at DESC NULLS LAST
             LIMIT 1) AS spending_analysis,
           (SELECT jsonb_agg(to_jsonb(d) ORDER BY d.created_at DESC)
              FROM income_drones_events d
             WHERE d.user_id = $1) AS income_drones
       ) s`,
      [ownerId],
    );

    return rows[0]?.dashboard || {};
  }

  async function recordRevenueEvent(ownerId, { description, amount, currency }) {
    const { rows } = await pool.query(
      `INSERT INTO revenue_events (owner_id, description, amount, currency)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [ownerId, description, amount, currency],
    );
    return rows[0]?.id || null;
  }

  async function getSpendingAnalysis(ownerId) {
    const { rows } = await pool.query(
      `SELECT to_jsonb(a) AS analysis
       FROM financial_spending_analysis a
       WHERE a.owner_id = $1
       ORDER BY a.updated_at DESC NULLS LAST
       LIMIT 1`,
      [ownerId],
    );
    return rows[0]?.analysis || {};
  }

  async function getIncomeDrones(ownerId) {
    const { rows } = await pool.query(
      `SELECT COALESCE(jsonb_agg(to_jsonb(d) ORDER BY d.created_at DESC), '[]'::jsonb) AS drones
       FROM income_drones_events d
       WHERE d.user_id = $1`,
      [ownerId],
    );
    return rows[0]?.drones || [];
  }

  return {
    getDashboard,
    recordRevenueEvent,
    getSpendingAnalysis,
    getIncomeDrones,
  };
}

export function createFinancialRevenueRoutes(app, ctx) {
  const router = express.Router();
  const { pool, requireKey, logger } = ctx || {};
  const service = createFinancialRevenueService({ pool });

  router.get('/api/v1/financial/dashboard', requireKey, async (req, res, next) => {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const dashboard = await service.getDashboard(ownerId);
      res.json({ ok: true, dashboard });
    } catch (err) {
      logger?.error?.({ err }, 'financial_revenue_dashboard_failed');
      next(err);
    }
  });

  router.post('/api/v1/revenue/event', requireKey, async (req, res, next) => {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const description = normalizeText(req.body?.description);
      const amount = parseAmount(req.body?.amount);
      const currency = normalizeCurrency(req.body?.currency);

      if (!description) return res.status(400).json({ ok: false, error: 'description_required' });
      if (amount == null) return res.status(400).json({ ok: false, error: 'amount_required' });
      if (!currency) return res.status(400).json({ ok: false, error: 'currency_required' });

      const eventId = await service.recordRevenueEvent(ownerId, { description, amount, currency });
      res.json({ ok: true, eventId });
    } catch (err) {
      logger?.error?.({ err }, 'financial_revenue_event_failed');
      next(err);
    }
  });

  router.get('/api/v1/spending/analysis', requireKey, async (req, res, next) => {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const analysis = await service.getSpendingAnalysis(ownerId);
      res.json({ ok: true, analysis });
    } catch (err) {
      logger?.error?.({ err }, 'financial_spending_analysis_failed');
      next(err);
    }
  });

  router.get('/api/v1/income/drones', requireKey, async (req, res, next) => {
    try {
      const ownerId = getOwnerId(req);
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const drones = await service.getIncomeDrones(ownerId);
      res.json({ ok: true, drones });
    } catch (err) {
      logger?.error?.({ err }, 'financial_income_drones_failed');
      next(err);
    }
  });

  return router;
}