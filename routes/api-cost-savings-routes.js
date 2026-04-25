/**
 * API Cost Savings Routes
 * Extracted from server.js
 * @ssot docs/projects/AMENDMENT_10_API_COST_SAVINGS.md
 */
import logger from '../services/logger.js';

export function createApiCostSavingsRoutes(app, ctx) {
  const {
    pool,
    requireKey,
    apiCostSavingsRevenue,
    getStripeClient,
    RAILWAY_PUBLIC_DOMAIN,
  } = ctx;

// ==================== API COST SAVINGS REVENUE ENDPOINTS (PRIORITY 1) ====================
app.get("/api/v1/revenue/api-cost-savings/status", requireKey, async (req, res) => {
  try {
    if (!apiCostSavingsRevenue) {
      return res.status(503).json({ error: "API Cost Savings Revenue System not initialized" });
    }

    const status = await apiCostSavingsRevenue.getStatusAndProjections();
    res.json({ ok: true, ...status });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/revenue/api-cost-savings/action-plan", requireKey, async (req, res) => {
  try {
    if (!apiCostSavingsRevenue) {
      return res.status(503).json({ error: "API Cost Savings Revenue System not initialized" });
    }

    const plan = await apiCostSavingsRevenue.generateActionPlan();
    res.json({ ok: true, plan });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== API COST-SAVINGS SERVICE ENDPOINTS ====================
app.post("/api/v1/cost-savings/register", requireKey, async (req, res) => {
  try {
    const { company_name, email, contact_name, current_ai_provider, monthly_spend, use_cases } = req.body;

    if (!company_name || !email) {
      return res.status(400).json({ ok: false, error: "company_name and email required" });
    }

    // Check if client already exists
    const existing = await pool.query(
      "SELECT * FROM api_cost_savings_clients WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.json({
        ok: true,
        client: existing.rows[0],
        message: "Client already registered",
      });
    }

    // Create new client
    const result = await pool.query(
      `INSERT INTO api_cost_savings_clients 
       (company_name, email, contact_name, current_ai_provider, monthly_spend, use_cases)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        company_name,
        email,
        contact_name || null,
        current_ai_provider || null,
        monthly_spend ? parseFloat(monthly_spend) : null,
        use_cases ? JSON.stringify(use_cases) : null,
      ]
    );

    res.json({
      ok: true,
      client: result.rows[0],
      message: "Client registered successfully",
    });
  } catch (error) {
    console.error("Cost-savings registration error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/cost-savings/analyze", requireKey, async (req, res) => {
  try {
    const { client_id, current_spend, usage_data } = req.body;

    if (!client_id || !current_spend) {
      return res.status(400).json({ ok: false, error: "client_id and current_spend required" });
    }

    // Get client info
    const clientResult = await pool.query(
      "SELECT * FROM api_cost_savings_clients WHERE id = $1",
      [client_id]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Client not found" });
    }

    const client = clientResult.rows[0];

    // Use existing API cost savings system if available
    let optimizedSpend = current_spend * 0.5; // Default 50% savings estimate
    let savingsAmount = current_spend - optimizedSpend;
    let savingsPercentage = 50;

    if (apiCostSavingsRevenue) {
      try {
        const analysis = await apiCostSavingsRevenue.analyzeClientUsage(client, usage_data);
        optimizedSpend = analysis.optimized_spend || optimizedSpend;
        savingsAmount = analysis.savings || savingsAmount;
        savingsPercentage = analysis.savings_percentage || savingsPercentage;
      } catch (err) {
        console.warn("API cost savings analysis error, using defaults:", err.message);
      }
    }

    // Save analysis
    const analysisResult = await pool.query(
      `INSERT INTO api_cost_savings_analyses 
       (client_id, current_spend, optimized_spend, savings_amount, savings_percentage, optimization_opportunities)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        client_id,
        parseFloat(current_spend),
        optimizedSpend,
        savingsAmount,
        savingsPercentage,
        JSON.stringify({
          model_routing: "Route low-risk tasks to cheaper models",
          caching: "Implement response caching for repeated queries",
          prompt_compression: "Optimize prompts to reduce token usage",
        }),
      ]
    );

    res.json({
      ok: true,
      analysis: analysisResult.rows[0],
      current_spend: parseFloat(current_spend),
      optimized_spend: optimizedSpend,
      savings_amount: savingsAmount,
      savings_percentage: savingsPercentage,
    });
  } catch (error) {
    console.error("Cost-savings analysis error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/cost-savings/dashboard/:clientId", requireKey, async (req, res) => {
  try {
    const { clientId } = req.params;

    // Get client
    const clientResult = await pool.query(
      "SELECT * FROM api_cost_savings_clients WHERE id = $1",
      [clientId]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Client not found" });
    }

    // Get latest analysis
    const analysisResult = await pool.query(
      `SELECT * FROM api_cost_savings_analyses 
       WHERE client_id = $1 
       ORDER BY analysis_date DESC 
       LIMIT 1`,
      [clientId]
    );

    // Get recent metrics (last 30 days)
    const metricsResult = await pool.query(
      `SELECT * FROM api_cost_savings_metrics 
       WHERE client_id = $1 
       AND metric_date >= CURRENT_DATE - INTERVAL '30 days'
       ORDER BY metric_date DESC`,
      [clientId]
    );

    // Calculate totals
    const totalSavings = metricsResult.rows.reduce((sum, m) => sum + parseFloat(m.savings || 0), 0);
    const totalCost = metricsResult.rows.reduce((sum, m) => sum + parseFloat(m.cost || 0), 0);
    const totalOptimized = metricsResult.rows.reduce((sum, m) => sum + parseFloat(m.optimized_cost || 0), 0);

    res.json({
      ok: true,
      client: clientResult.rows[0],
      latest_analysis: analysisResult.rows[0] || null,
      metrics: {
        last_30_days: {
          total_cost: totalCost,
          total_optimized: totalOptimized,
          total_savings: totalSavings,
          savings_percentage: totalCost > 0 ? ((totalSavings / totalCost) * 100).toFixed(2) : 0,
        },
        daily: metricsResult.rows,
      },
    });
  } catch (error) {
    console.error("Cost-savings dashboard error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/cost-savings/create-subscription", requireKey, async (req, res) => {
  try {
    const { client_id, savings_amount } = req.body;

    if (!client_id || !savings_amount) {
      return res.status(400).json({ ok: false, error: "client_id and savings_amount required" });
    }

    const stripe = await getStripeClient();
    if (!stripe) {
      return res.status(503).json({ ok: false, error: "Stripe not configured" });
    }

    // Get client
    const clientResult = await pool.query(
      "SELECT * FROM api_cost_savings_clients WHERE id = $1",
      [client_id]
    );

    if (clientResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Client not found" });
    }

    const client = clientResult.rows[0];

    // Calculate fee (25% of savings)
    const monthlyFee = parseFloat(savings_amount) * 0.25;
    const feeInCents = Math.round(monthlyFee * 100);

    // Create Stripe customer if needed
    let customerId = client.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: client.email,
        name: client.contact_name || client.company_name,
        metadata: { client_id: client.id.toString() },
      });
      customerId = customer.id;
      await pool.query(
        "UPDATE api_cost_savings_clients SET stripe_customer_id = $1 WHERE id = $2",
        [customerId, client.id]
      );
    }

    // Create subscription
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "AI Cost Optimization Service",
              description: `25% of monthly savings ($${monthlyFee.toFixed(2)}/month)`,
            },
            unit_amount: feeInCents,
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin || "https://" + RAILWAY_PUBLIC_DOMAIN}/cost-savings?success=true`,
      cancel_url: `${req.headers.origin || "https://" + RAILWAY_PUBLIC_DOMAIN}/cost-savings?canceled=true`,
      metadata: { client_id: client.id.toString(), savings_amount: savings_amount.toString() },
    });

    res.json({
      ok: true,
      session_id: session.id,
      url: session.url,
      client_id: client.id,
      monthly_fee: monthlyFee,
      savings_amount: parseFloat(savings_amount),
    });
  } catch (error) {
    console.error("Cost-savings subscription creation error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

  // ---------------------------------------------------------------------------
  // TSOS SAVINGS REPORT — unified proof of value for monetization
  // GET  /api/v1/tsos/savings/report?days=30   — daily breakdown + totals
  // POST /api/v1/tsos/savings/session          — log a conductor cold-start event
  // GET  /api/v1/tsos/savings/baselines        — reference token counts (audit trail)
  // ---------------------------------------------------------------------------

  app.get('/api/v1/tsos/savings/report', requireKey, async (req, res) => {
    try {
      const days = Math.min(Math.max(parseInt(req.query.days) || 30, 1), 365);
      const ledger = ctx.savingsLedger;
      if (!ledger?.getSavingsReport) {
        return res.status(503).json({ ok: false, error: 'savingsLedger not initialised' });
      }
      const report = await ledger.getSavingsReport({ days });
      if (!report) return res.status(500).json({ ok: false, error: 'report query failed' });

      const t = report.totals;
      // Build a monetization-ready summary: baseline vs actual vs savings%
      const hasSavings = t.total_baseline_cost_usd > 0;
      const summaryLine = hasSavings
        ? `BASELINE $${Number(t.total_baseline_cost_usd).toFixed(4)}` +
          ` → ACTUAL $${Number(t.total_actual_cost_usd).toFixed(4)}` +
          ` → SAVED $${Number(t.total_saved_usd).toFixed(4)} (${t.overall_savings_pct}%)` +
          ` | free_routing $${Number(t.saved_by_free_routing_usd).toFixed(4)}` +
          ` | compression $${Number(t.saved_by_compression_usd).toFixed(4)}` +
          ` | cache $${Number(t.saved_by_cache_usd).toFixed(4)}` +
          ` | compact_rules $${Number(t.saved_by_compact_rules_usd).toFixed(4)}` +
          ` | ${t.total_ai_calls} calls` +
          ` | tracking since ${t.tracking_since || 'N/A'}`
        : 'No savings recorded yet — AI calls will populate this automatically.';

      res.json({ ok: true, summary: summaryLine, ...report });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/v1/tsos/savings/session', requireKey, async (req, res) => {
    try {
      const { compact_tokens, full_tokens, source, agent_hint, session_id, notes } = req.body || {};
      if (!compact_tokens || !full_tokens) {
        return res.status(400).json({ ok: false, error: 'compact_tokens and full_tokens are required' });
      }
      const ledger = ctx.savingsLedger;
      if (!ledger?.conductorSession) {
        return res.status(503).json({ ok: false, error: 'savingsLedger not initialised' });
      }
      await ledger.conductorSession({
        compactTokens: Number(compact_tokens),
        fullTokens:    Number(full_tokens),
        source:        source || 'cold_start',
        agentHint:     agent_hint || null,
        sessionId:     session_id || null,
        notes:         notes || null,
      });
      const saved = Number(full_tokens) - Number(compact_tokens);
      const pct   = Math.round((saved / Number(full_tokens)) * 100);
      res.json({
        ok: true,
        saved_tokens:     saved,
        savings_pct:      pct,
        cost_avoided_usd: +(saved / 1000000 * 3.00).toFixed(6),
        tsos_machine:     `[TSOS-MACHINE] KNOW: STATE=RECEIPT VERB=BUILD | conductor_session saved=${saved} tokens (${pct}%) | NEXT=RECEIPT SSOT row`,
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/v1/tsos/savings/baselines', requireKey, async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT label, token_count, cost_per_m_usd, notes, recorded_at FROM tcos_baseline_config ORDER BY label',
      );
      res.json({ ok: true, baselines: result.rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

}
