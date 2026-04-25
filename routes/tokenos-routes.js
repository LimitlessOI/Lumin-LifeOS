/**
 * @ssot docs/projects/AMENDMENT_10_API_COST_SAVINGS.md
 *
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                         TOKENOS API ROUTES                                        ║
 * ║   Full B2B API surface: proxy, onboarding, dashboard, admin                      ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 *
 * Routes (all under /api/v1/tokenos):
 *
 *  Public (API-key auth via Bearer token in Authorization header):
 *    POST   /proxy           — optimized AI proxy (main product)
 *    GET    /dashboard       — customer savings dashboard
 *    GET    /report          — detailed savings report with daily breakdown
 *    GET    /invoice/:year/:month — monthly invoice + our revenue
 *    POST   /rotate-key      — rotate your API key
 *
 *  Self-serve onboarding (no auth required):
 *    POST   /register        — register new customer, returns API key
 *
 *  Admin (requireKey — internal COMMAND_CENTER_KEY):
 *    GET    /admin/customers           — list all customers
 *    GET    /admin/customers/:id       — single customer detail
 *    POST   /admin/customers/:id/status — suspend/activate
 *    GET    /admin/platform-savings    — Lumin's own internal savings
 *    GET    /admin/quality-test        — run quality check against a test prompt
 */

import express from 'express';
import { createTokenOSService } from '../services/tokenos-service.js';
import { TCOTracker } from '../core/tco-tracker.js';
import { runQualityGate, extractSemanticMarkers, scoreResponseQuality } from '../services/tokenos-quality-check.js';

/**
 * @param {{ pool, requireKey, callCouncilMember, logger }} opts
 * @returns {(app: express.Application) => void}
 */
export function createTokenOSRoutes({ pool, requireKey, callCouncilMember, logger = console }) {
  const router = express.Router();
  const tokenOS = createTokenOSService({ pool, logger });
  const tcoTracker = new TCOTracker(pool);

  // ── Customer-facing auth middleware ─────────────────────────────────────────
  // Customers authenticate with their TokenOS API key (not the system COMMAND_CENTER_KEY)
  async function requireCustomerKey(req, res, next) {
    const authHeader = req.headers['authorization'] || '';
    const apiKey = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!apiKey) {
      return res.status(401).json({
        error: 'Missing API key',
        message: 'Include your TokenOS API key: Authorization: Bearer tok_live_...',
      });
    }

    const customer = await tokenOS.getCustomerByKey(apiKey);
    if (!customer) {
      return res.status(401).json({
        error: 'Invalid API key',
        message: 'API key not found or account inactive. Visit /token-os to register.',
      });
    }

    req.tokenosCustomer = customer;
    next();
  }

  // ── Self-serve registration ─────────────────────────────────────────────────

  /**
   * POST /api/v1/tokenos/register
   * No auth required. Returns API key (shown only once).
   */
  router.post('/register', async (req, res) => {
    try {
      const { name, email, company, plan, provider_keys } = req.body;

      if (!name || !email) {
        return res.status(400).json({ error: 'name and email are required' });
      }

      const result = await tokenOS.onboardCustomer({
        name,
        email,
        company,
        plan: plan || 'starter',
        providerKeys: provider_keys || {},
      });

      if (!result.success) {
        return res.status(409).json({
          error: result.error,
          message: 'An account with that email already exists. Contact support to retrieve your key.',
        });
      }

      logger.info?.({ email, plan }, '[TOKENOS] Registration complete');
      res.status(201).json(result);
    } catch (err) {
      logger.error?.({ err }, '[TOKENOS] Registration error');
      res.status(500).json({ error: err.message });
    }
  });

  // ── Main proxy ───────────────────────────────────────────────────────────────

  /**
   * POST /api/v1/tokenos/proxy
   * Drop-in replacement for OpenAI/Anthropic/Google API calls.
   * Compresses prompts, routes to cheapest capable model, tracks savings.
   *
   * Body: { provider, model, messages|prompt, max_tokens?, temperature?, tco_mode?, tco_failover? }
   * Headers: Authorization: Bearer <tokenos-api-key>
   */
  router.post('/proxy', requireCustomerKey, async (req, res) => {
    const customer = req.tokenosCustomer;
    const startTime = Date.now();

    try {
      const {
        provider,
        model,
        messages,
        prompt,
        max_tokens,
        temperature,
        tco_mode = 'optimized', // optimized | direct | ab_test
        tco_failover = true,
      } = req.body;

      if (!provider || !model) {
        return res.status(400).json({ error: 'provider and model are required' });
      }

      const input = messages || prompt;
      if (!input) {
        return res.status(400).json({ error: 'messages or prompt is required' });
      }

      // Estimate original cost before optimization
      const originalTokens = estimateTokens(input);
      const originalCost = estimateCost(provider, model, originalTokens);

      let response, actualTokens, actualCost, qualityScore = null;
      let compressionUsed = false, cacheHit = false, failedOver = false;
      let abTestResults = null;

      if (tco_mode === 'direct') {
        // Direct mode: no compression, just proxy through (for A/B baseline)
        const result = await runDirect({ input, provider, model, max_tokens, temperature, callCouncilMember });
        response = result.response;
        actualTokens = result.tokens;
        actualCost = estimateCost(provider, model, actualTokens);
      } else if (tco_mode === 'ab_test') {
        // A/B mode: run both in parallel, compare, return optimized result
        const [optimized, direct] = await Promise.allSettled([
          runOptimized({ input, max_tokens, temperature, callCouncilMember }),
          runDirect({ input, provider, model, max_tokens, temperature, callCouncilMember }),
        ]);

        const optResult = optimized.status === 'fulfilled' ? optimized.value : null;
        const dirResult = direct.status === 'fulfilled' ? direct.value : null;

        if (optResult && dirResult) {
          const markers = extractSemanticMarkers(input);
          const optQuality = runQualityGate({
            prompt: input,
            compressedResponse: optResult.response,
            directResponse: dirResult.response,
            markers,
          });

          abTestResults = {
            optimized: { tokens: optResult.tokens, cost: estimateCost(provider, model, optResult.tokens), quality: optQuality.score },
            direct: { tokens: dirResult.tokens, cost: estimateCost(provider, model, dirResult.tokens) },
            verdict: optQuality.verdict,
            savings_pct: (1 - (optResult.tokens / dirResult.tokens)) * 100,
          };

          response = optQuality.verdict !== 'fail' ? optResult.response : dirResult.response;
          actualTokens = optQuality.verdict !== 'fail' ? optResult.tokens : dirResult.tokens;
          compressionUsed = optQuality.verdict !== 'fail';
          qualityScore = optQuality.score;
        } else {
          response = optResult?.response || dirResult?.response;
          actualTokens = estimateTokens(response);
        }
        actualCost = estimateCost(provider, model, actualTokens);
      } else {
        // OPTIMIZED (default): compress + route to best cheap model + quality gate
        let optResult;
        try {
          optResult = await runOptimized({ input, max_tokens, temperature, callCouncilMember });
          compressionUsed = true;

          // TCO-C01/C02: quality gate
          const markers = extractSemanticMarkers(input);
          const gate = runQualityGate({ prompt: input, compressedResponse: optResult.response, markers });
          qualityScore = gate.score;

          if (gate.verdict === 'fail' && tco_failover) {
            logger.warn?.({ verdict: gate.verdict, score: gate.score, customerId: customer.id }, '[TOKENOS] Quality gate failed — falling back to direct');
            const fallback = await runDirect({ input, provider, model, max_tokens, temperature, callCouncilMember });
            response = fallback.response;
            actualTokens = fallback.tokens;
            failedOver = true;
            compressionUsed = false;
          } else {
            response = optResult.response;
            actualTokens = optResult.tokens;
          }
        } catch (err) {
          if (!tco_failover) {
            return res.status(500).json({ error: 'Optimization failed', message: err.message });
          }
          logger.warn?.({ err: err.message }, '[TOKENOS] Optimization error — falling back');
          const fallback = await runDirect({ input, provider, model, max_tokens, temperature, callCouncilMember });
          response = fallback.response;
          actualTokens = fallback.tokens;
          failedOver = true;
        }
        actualCost = estimateCost(provider, model, actualTokens);
      }

      const latencyMs = Date.now() - startTime;
      const savings = Math.max(0, originalCost - actualCost);
      const savingsPct = originalCost > 0 ? (savings / originalCost) * 100 : 0;

      // Record to savings ledger
      await tcoTracker.trackRequest({
        customerId: customer.id,
        customerApiKey: customer.api_key,
        originalProvider: provider,
        originalModel: model,
        actualProvider: 'council',
        actualModel: 'routed',
        originalTokens,
        actualTokens,
        originalCost,
        actualCost,
        savings,
        savingsPercent: savingsPct,
        cacheHit,
        compressionUsed,
        qualityScore,
        latencyMs,
        requestMetadata: { tco_mode, failed_over: failedOver, ab_test: !!abTestResults },
      });

      // Return OpenAI-compatible format
      res.json({
        id: `tco-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{ index: 0, message: { role: 'assistant', content: response }, finish_reason: 'stop' }],
        usage: {
          prompt_tokens: originalTokens,
          completion_tokens: actualTokens,
          total_tokens: originalTokens + actualTokens,
        },
        tco_metrics: {
          savings_usd: savings.toFixed(6),
          savings_pct: savingsPct.toFixed(1),
          quality_score: qualityScore,
          compression_used: compressionUsed,
          failed_over: failedOver,
          latency_ms: latencyMs,
          ab_test: abTestResults,
        },
      });
    } catch (err) {
      logger.error?.({ err, customerId: customer?.id }, '[TOKENOS] Proxy error');
      res.status(500).json({ error: 'Proxy error', message: err.message });
    }
  });

  // ── Customer self-service ────────────────────────────────────────────────────

  /**
   * GET /api/v1/tokenos/dashboard
   * Returns aggregate savings summary for the authenticated customer.
   */
  router.get('/dashboard', requireCustomerKey, async (req, res) => {
    try {
      const days = parseInt(req.query.days) || 30;
      const report = await tokenOS.getSavingsSummary(req.tokenosCustomer.id, { days });
      res.json(report);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/v1/tokenos/report
   * Detailed savings report with daily breakdown and by-model breakdown.
   */
  router.get('/report', requireCustomerKey, async (req, res) => {
    try {
      const { days = 30, start_date, end_date } = req.query;
      const opts = start_date && end_date
        ? { startDate: start_date, endDate: end_date }
        : { days: parseInt(days) };
      const report = await tokenOS.getSavingsSummary(req.tokenosCustomer.id, opts);
      res.json(report);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/v1/tokenos/invoice/:year/:month
   * Monthly invoice with total savings + our 20% fee.
   */
  router.get('/invoice/:year/:month', requireCustomerKey, async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      if (!year || !month || month < 1 || month > 12) {
        return res.status(400).json({ error: 'Invalid year or month' });
      }
      const invoice = await tokenOS.getMonthlyInvoice(req.tokenosCustomer.id, year, month);
      res.json(invoice);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/v1/tokenos/rotate-key
   * Rotate API key. Old key immediately invalid after this call.
   */
  router.post('/rotate-key', requireCustomerKey, async (req, res) => {
    try {
      const result = await tokenOS.rotateApiKey(req.tokenosCustomer.id);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/v1/tokenos/store-keys
   * Let customers store their provider API keys (encrypted at rest).
   * Body: { openai?, anthropic?, google? }
   */
  router.post('/store-keys', requireCustomerKey, async (req, res) => {
    try {
      const allowedKeys = ['openai', 'anthropic', 'google'];
      const providerKeys = {};
      for (const k of allowedKeys) {
        if (req.body[k]) providerKeys[k] = req.body[k];
      }
      if (Object.keys(providerKeys).length === 0) {
        return res.status(400).json({ error: 'No provider keys provided' });
      }
      const result = await tokenOS.storeProviderKeys(req.tokenosCustomer.id, providerKeys);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Admin ────────────────────────────────────────────────────────────────────

  /**
   * GET /api/v1/tokenos/admin/customers
   */
  router.get('/admin/customers', requireKey, async (req, res) => {
    try {
      const { limit = 50, offset = 0, status } = req.query;
      const result = await tokenOS.listCustomers({ limit: parseInt(limit), offset: parseInt(offset), status });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/v1/tokenos/admin/customers/:id
   */
  router.get('/admin/customers/:id', requireKey, async (req, res) => {
    try {
      const custResult = await pool.query(
        'SELECT id, name, email, company, plan, status, monthly_budget, meta, created_at FROM tco_customers WHERE id = $1',
        [parseInt(req.params.id)]
      );
      if (!custResult.rows[0]) return res.status(404).json({ error: 'Customer not found' });

      const savings = await tokenOS.getSavingsSummary(parseInt(req.params.id), { days: 30 });
      res.json({ customer: custResult.rows[0], savings: savings.summary });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/v1/tokenos/admin/customers/:id/status
   * Body: { status: 'active' | 'suspended' | 'cancelled' }
   */
  router.post('/admin/customers/:id/status', requireKey, async (req, res) => {
    try {
      const result = await tokenOS.setCustomerStatus(parseInt(req.params.id), req.body.status);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/v1/tokenos/admin/platform-savings
   * Lumin's own internal compression savings (from token_usage_log).
   */
  router.get('/admin/platform-savings', requireKey, async (req, res) => {
    try {
      const days = parseInt(req.query.days) || 30;
      const result = await tokenOS.getPlatformSavings({ days });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * POST /api/v1/tokenos/admin/quality-test
   * Run quality gate against a test prompt + response without making a real AI call.
   * Body: { prompt, response }
   */
  router.post('/admin/quality-test', requireKey, async (req, res) => {
    try {
      const { prompt, response } = req.body;
      if (!prompt || !response) {
        return res.status(400).json({ error: 'prompt and response are required' });
      }
      const gate = runQualityGate({ prompt, compressedResponse: response });
      const quality = scoreResponseQuality(response, prompt);
      res.json({ gate, quality });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/v1/tokenos/admin/stats
   * Overall platform stats: total customers, total B2B savings, revenue.
   */
  router.get('/admin/stats', requireKey, async (req, res) => {
    try {
      const days = parseInt(req.query.days) || 30;

      const [custCount, savingsAgg, platformSavings] = await Promise.all([
        pool.query("SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'active') AS active FROM tco_customers"),
        pool.query(
          `SELECT
             COALESCE(SUM(savings), 0) AS total_b2b_savings,
             COALESCE(SUM(savings) * 0.20, 0) AS our_revenue,
             COUNT(*) AS total_requests,
             AVG(savings_percent) AS avg_savings_pct
           FROM tco_requests
           WHERE created_at >= NOW() - ($1 * INTERVAL '1 day')`,
          [days]
        ),
        tokenOS.getPlatformSavings({ days }),
      ]);

      res.json({
        period: `last ${days} days`,
        customers: custCount.rows[0],
        b2b: savingsAgg.rows[0],
        platform: platformSavings,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── route mounting helper ────────────────────────────────────────────────────
  return function mount(app) {
    // Static landing page
    app.get('/token-os', (_req, res) => {
      res.sendFile('tokenos-landing.html', { root: new URL('../public/overlay', import.meta.url).pathname });
    });
    // Client dashboard
    app.get('/token-os/dashboard', (_req, res) => {
      res.sendFile('tokenos-dashboard.html', { root: new URL('../public/overlay', import.meta.url).pathname });
    });

    app.use('/api/v1/tokenos', router);
    logger.info?.('✅ [TOKENOS] Routes mounted at /api/v1/tokenos + /token-os + /token-os/dashboard');
  };
}

export default createTokenOSRoutes;

// ── Internal helpers ─────────────────────────────────────────────────────────

function estimateTokens(input) {
  const text = typeof input === 'string' ? input
    : Array.isArray(input) ? input.map(m => m.content || '').join('\n')
    : String(input || '');
  return Math.ceil(text.length / 4); // ~4 chars per token
}

function estimateCost(provider, model, tokens) {
  // Cost per 1K tokens (approximate input pricing)
  const rates = {
    openai: { 'gpt-4': 0.03, 'gpt-4-turbo': 0.01, 'gpt-4o': 0.005, 'gpt-3.5-turbo': 0.002 },
    anthropic: { 'claude-3-opus': 0.015, 'claude-3-sonnet': 0.003, 'claude-3-haiku': 0.00025, 'claude-opus-4': 0.015, 'claude-sonnet-4': 0.003 },
    google: { 'gemini-pro': 0.00025, 'gemini-ultra': 0.01, 'gemini-1.5-pro': 0.00125 },
  };
  const rate = rates[provider]?.[model] ?? 0.01;
  return (tokens / 1000) * rate;
}

async function runOptimized({ input, max_tokens, temperature, callCouncilMember }) {
  if (!callCouncilMember) throw new Error('Council not available for optimization');
  const promptStr = Array.isArray(input)
    ? input.map(m => `${m.role}: ${m.content}`).join('\n')
    : String(input);

  const response = await callCouncilMember('gemini', promptStr, {
    maxTokens: max_tokens,
    temperature,
    useTwoTier: true,
  });

  return { response: typeof response === 'string' ? response : JSON.stringify(response), tokens: estimateTokens(response) };
}

async function runDirect({ input, provider, model, max_tokens, temperature, callCouncilMember }) {
  if (!callCouncilMember) throw new Error('Council not available');
  const promptStr = Array.isArray(input)
    ? input.map(m => `${m.role}: ${m.content}`).join('\n')
    : String(input);

  // Map provider/model to council member key
  const memberMap = {
    'openai': 'openai', 'anthropic': 'claude', 'google': 'gemini',
  };
  const member = memberMap[provider] || provider;

  const response = await callCouncilMember(member, promptStr, { maxTokens: max_tokens, temperature });
  return { response: typeof response === 'string' ? response : JSON.stringify(response), tokens: estimateTokens(response) };
}
