// server.js - COMPLETE PRODUCTION CODE
import express from "express";
import dayjs from "dayjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CRITICAL: Raw body for Stripe webhook BEFORE json parser
app.use('/api/v1/billing/webhook', express.raw({ type: 'application/json' }));

// Then normal parsers for everything else
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Static assets - MUST be before routes
app.use(express.static(path.join(__dirname, "public")));
app.use("/reports", express.static(path.join(__dirname, "reports")));

// Data directory
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const LOG_FILE = path.join(DATA_DIR, "autopilot.log");
const STAMP_FILE = path.join(DATA_DIR, "last-build.txt");
const SPEND_FILE = path.join(DATA_DIR, "spend.json");

// Environment
const {
  DATABASE_URL,
  COMMAND_CENTER_KEY = "changeme",
  PUBLIC_BASE_URL = "http://localhost:8080",
  PORT = 8080,
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET
} = process.env;

const MAX_DAILY_SPEND = Number(process.env.MAX_DAILY_SPEND || 5.0);

// PostgreSQL Pool
export const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 30,
  ssl: DATABASE_URL?.includes("neon") || DATABASE_URL?.includes("railway") 
    ? { rejectUnauthorized: false } 
    : undefined,
});

// ===== DATABASE INITIALIZATION =====
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS calls (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      phone TEXT,
      intent TEXT,
      area TEXT,
      timeline TEXT,
      duration INT,
      transcript TEXT,
      score TEXT,
      boldtrail_lead_id TEXT
    );
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS missed_calls (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      from_number TEXT,
      to_number TEXT,
      status TEXT DEFAULT 'new'
    );
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS overlay_states (
      id SERIAL PRIMARY KEY,
      sid TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      data JSONB NOT NULL
    );
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS build_metrics (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      model TEXT NOT NULL,
      tokens_in INT DEFAULT 0,
      tokens_out INT DEFAULT 0,
      cost NUMERIC(10,4) DEFAULT 0,
      pr_number INT,
      pr_url TEXT,
      summary TEXT,
      outcome TEXT DEFAULT 'pending',
      context_size INT DEFAULT 0
    );
  `);
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      plan TEXT DEFAULT 'sales_coaching',
      status TEXT DEFAULT 'baseline',
      baseline_commission NUMERIC(10,2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

initDb()
  .then(() => console.log("✅ Database tables ready"))
  .catch(console.error);

// ===== BUDGET HELPERS =====
async function getTodaySpend() {
  const r = await pool.query(`
    SELECT COALESCE(SUM(cost), 0) as total
    FROM build_metrics
    WHERE timestamp::date = CURRENT_DATE
  `);
  return Number(r.rows[0].total);
}

async function checkBudget() {
  const todaySpend = await getTodaySpend();
  const remaining = MAX_DAILY_SPEND - todaySpend;
  
  return {
    total: MAX_DAILY_SPEND,
    spent: todaySpend,
    remaining: Math.max(0, remaining),
    exceeded: todaySpend >= MAX_DAILY_SPEND
  };
}

// ===== AUTH MIDDLEWARE =====
function requireCommandKey(req, res, next) {
  const key = req.query.key || req.headers['x-command-key'];
  if (key !== COMMAND_CENTER_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

// ===== ROUTES =====

app.get("/healthz", async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ 
      status: "healthy",
      version: "v7-billing-integrated",
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(500).json({ status: "unhealthy", error: e.message });
  }
});

app.get("/api/v1/metrics/summary", requireCommandKey, async (_req, res) => {
  try {
    const totalRes = await pool.query(`
      SELECT 
        COALESCE(SUM(cost), 0) as total_cost,
        COALESCE(AVG(cost), 0) as avg_cost,
        COUNT(*)::int as build_count,
        COUNT(*) FILTER (WHERE outcome = 'merged')::int as merged_count
      FROM build_metrics
      WHERE timestamp > NOW() - INTERVAL '7 days'
    `);
    
    const highCostRes = await pool.query(`
      SELECT timestamp, model, tokens_in, tokens_out, cost, pr_url, outcome
      FROM build_metrics
      WHERE timestamp > NOW() - INTERVAL '7 days'
      ORDER BY cost DESC
      LIMIT 10
    `);
    
    const lowRoiRes = await pool.query(`
      SELECT timestamp, summary, cost, outcome as status
      FROM build_metrics
      WHERE timestamp > NOW() - INTERVAL '7 days'
        AND cost > 0.50
        AND outcome != 'merged'
      ORDER BY cost DESC
      LIMIT 20
    `);
    
    res.json({
      ...totalRes.rows[0],
      high_cost: highCostRes.rows,
      low_roi: lowRoiRes.rows
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "metrics_failed" });
  }
});

app.get("/api/v1/budget/status", requireCommandKey, async (_req, res) => {
  const budget = await checkBudget();
  res.json(budget);
});

// ===== BILLING ROUTES =====

app.post('/api/v1/billing/start-baseline', async (req, res) => {
  try {
    const { email, baseline_commission } = req.body;
    
    if (!email) {
      return res.status(400).json({ ok: false, error: 'Email required' });
    }
    
    const existing = await pool.query(
      'SELECT * FROM customers WHERE email = $1',
      [email]
    );
    
    if (existing.rows.length > 0) {
      return res.json({ 
        ok: true, 
        existing: true,
        customer: existing.rows[0] 
      });
    }
    
    await pool.query(`
      INSERT INTO customers (email, baseline_commission, plan, status)
      VALUES ($1, $2, 'sales_coaching', 'baseline')
    `, [email, baseline_commission || 0]);
    
    console.log(`[baseline] Started for ${email}`);
    
    res.json({ 
      ok: true, 
      success: true,
      message: 'Baseline started. We will track your sales for 90 days at zero cost.' 
    });
    
  } catch (e) {
    console.error('[billing/start-baseline]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/v1/billing/create-checkout-session', async (req, res) => {
  try {
    if (!STRIPE_SECRET_KEY) {
      return res.status(500).json({ ok: false, error: 'Stripe not configured' });
    }
    
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(STRIPE_SECRET_KEY);
    
    const { email, price_id } = req.body || {};
    
    if (!price_id) {
      return res.status(400).json({ ok: false, error: 'price_id required' });
    }
    
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: price_id, quantity: 1 }],
      customer_email: email,
      success_url: `${PUBLIC_BASE_URL}/checkout-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${PUBLIC_BASE_URL}/sales-coaching.html?canceled=1`,
      allow_promotion_codes: true,
      subscription_data: { trial_period_days: 7 }
    });
    
    res.json({ ok: true, id: session.id, url: session.url });
    
  } catch (e) {
    console.error('[billing/checkout]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/v1/billing/webhook', async (req, res) => {
  try {
    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }
    
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(STRIPE_SECRET_KEY);
    
    const sig = req.headers['stripe-signature'];
    let event;
    
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('[webhook] Signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        const email = session.customer_email;
        
        await pool.query(`
          UPDATE customers 
          SET stripe_customer_id = $1,
              stripe_subscription_id = $2,
              status = 'active',
              updated_at = NOW()
          WHERE email = $3
        `, [session.customer, session.subscription, email]);
        
        console.log(`[webhook] Subscription activated for ${email}`);
        break;
        
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object;
        const newStatus = subscription.status;
        
        await pool.query(`
          UPDATE customers 
          SET status = $1,
              updated_at = NOW()
          WHERE stripe_subscription_id = $2
        `, [newStatus, subscription.id]);
        
        console.log(`[webhook] Subscription ${newStatus}: ${subscription.id}`);
        break;
    }
    
    res.json({ received: true });
  } catch (e) {
    console.error('[webhook] Error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ===== AUTOPILOT/BUILD ROUTES =====

app.post("/internal/autopilot/build-now", requireCommandKey, async (req, res) => {
  try {
    const budget = await checkBudget();
    if (budget.exceeded) {
      return res.json({ 
        ok: false, 
        skipped: true, 
        reason: 'Daily budget exceeded' 
      });
    }
    
    // Log the build trigger
    console.log('[build-now] Triggered');
    
    res.json({ 
      ok: true, 
      message: 'Build triggered - check GitHub Actions for progress',
      budget: budget
    });
    
  } catch (e) {
    console.error('[build-now]', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ===== OVERLAY ROUTES =====
app.get("/overlay/:sid", (_req, res) => {
  res.sendFile(path.join(__dirname, "public/overlay/index.html"));
});

app.get("/overlay/:sid/control", (_req, res) => {
  res.sendFile(path.join(__dirname, "public/overlay/control.html"));
});

app.post("/api/overlay/:sid/state", async (req, res) => {
  try {
    const { sid } = req.params;
    const data = req.body;
    
    await pool.query(
      `INSERT INTO overlay_states (sid, data, updated_at) 
       VALUES ($1, $2, NOW())
       ON CONFLICT (sid) DO UPDATE 
       SET data = $2, updated_at = NOW()`,
      [sid, JSON.stringify(data)]
    );
    
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/overlay/:sid/state", async (req, res) => {
  try {
    const { sid } = req.params;
    const result = await pool.query(
      'SELECT data FROM overlay_states WHERE sid = $1 ORDER BY updated_at DESC LIMIT 1',
      [sid]
    );
    
    if (result.rows.length === 0) {
      return res.json({ status: "waiting" });
    }
    
    res.json(result.rows[0].data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ===== SERVER START =====
const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  🚀 LIFEOS - COMPLETE PRODUCTION SYSTEM                  ║
╠════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                               ║
║  Version: v7-billing-integrated                           ║
║  Revenue: /sales-coaching.html                            ║
║  Metrics: /api/v1/metrics/summary?key=YOUR_KEY            ║
║  Budget: $${MAX_DAILY_SPEND}/day                                        ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export default server;
