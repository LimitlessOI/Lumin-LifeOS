// server.js - Minimal Working Version
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import { billingRouter } from "./src/routes/billing.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CRITICAL: Raw body for Stripe webhook BEFORE json parser
app.use('/api/v1/billing/webhook', express.raw({ type: 'application/json' }));

// Normal parsers
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Static assets
app.use(express.static(path.join(__dirname, "public")));

const {
  DATABASE_URL,
  COMMAND_CENTER_KEY,
  PORT = 8080,
} = process.env;

// PostgreSQL Pool
export const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 30,
  ssl: DATABASE_URL?.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
});

// Initialize Database
async function initDb() {
  console.log('[db] Initializing tables...');
  
  await pool.query(`CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT,
    email TEXT NOT NULL,
    plan TEXT NOT NULL,
    status TEXT DEFAULT 'trialing',
    phone_number TEXT,
    baseline_commission NUMERIC DEFAULT 0,
    current_commission NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );`);
  
  await pool.query(`CREATE TABLE IF NOT EXISTS pods (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    focus TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );`);
  
  const podCount = await pool.query('SELECT COUNT(*) FROM pods');
  if (Number(podCount.rows[0].count) === 0) {
    await pool.query(`INSERT INTO pods (name, focus) VALUES ('Alpha', 'system_building'), ('Bravo', 'revenue_generation')`);
  }
  
  console.log('[db] ✅ Database ready');
}

initDb().catch(console.error);

// Helpers
function requireCommandKey(req, res, next) {
  const key = req.header("X-Command-Key") || req.query.key;
  if (!COMMAND_CENTER_KEY || key !== COMMAND_CENTER_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

// Routes
app.get("/api/v1/pods", requireCommandKey, async (_req, res) => {
  try {
    const pods = await pool.query(`SELECT * FROM pods ORDER BY id`);
    res.json({ ok: true, pods: pods.rows });
  } catch (e) {
    console.error('[pods]', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Billing routes
app.use("/api/v1/billing", billingRouter(pool));

// Health
app.get("/healthz", async (_req, res) => {
  try {
    const r = await pool.query("SELECT NOW()");
    res.json({ 
      status: "healthy", 
      database: "connected", 
      timestamp: r.rows[0].now, 
      version: "v7-billing-integrated" 
    });
  } catch {
    res.status(500).json({ status: "unhealthy" });
  }
});

// Start
const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  🚀 LIFEOS - REVENUE SYSTEM LIVE                          ║
╠════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                               ║
║  Version: v7-billing-integrated                           ║
║  Revenue: /sales-coaching.html                            ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export default server;
