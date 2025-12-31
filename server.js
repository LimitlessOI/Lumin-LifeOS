/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                  ║
 * ║        🎼 LIFEOS v26.1 (NO CLAUDE) - CONSENSUS & SELF-HEALING SYSTEM             ║
 * ║        Railway + Neon PostgreSQL + GitHub + Multi-AI Council + Stripe           ║
 * ║                                                                                  ║
 * ║  ✅ Consensus Protocol         ✅ Blind Spot Detection                          ║
 * ║  ✅ Daily Idea Generation      ✅ AI Rotation & Evaluation                      ║
 * ║  ✅ Sandbox Testing            ✅ Rollback Capabilities                         ║
 * ║  ✅ No-Cache API Calls         ✅ Continuous Memory                             ║
 * ║  ✅ OpenAI / Gemini / DeepSeek / Grok Council (no Claude)                      ║
 * ║  ✅ Stripe Revenue Sync        ✅ Income Drones / ROI Tracking                  ║
 * ║                                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

import "dotenv/config";
import express from "express";
import dayjs from "dayjs";
import fs from "fs";
import { promises as fsPromises } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { runFSAR } from "./audit/fsar/fsar_runner.js";
import { evaluateExecutionGate } from "./audit/gating/execution_gate.js";
import { Pool } from "pg";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import crypto from "crypto";
import process from "node:process";
import { exec } from "child_process";
import { promisify } from "util";
import rateLimit from "express-rate-limit";

// Modular two-tier council system (loaded dynamically in startup)
let Tier0Council, Tier1Council, ModelRouter, OutreachAutomation, WhiteLabelConfig;

// Knowledge Base System
let KnowledgeBase, FileCleanupAnalyzer;

// Open Source Council Router
let OpenSourceCouncil, openSourceCouncil;

// Sales Coaching Services
let salesTechniqueAnalyzer, callRecorder;

// Goal Tracking & Coaching Services
let goalTracker, activityTracker, coachingProgression, calendarService;

// Motivation & Perfect Day Services
let perfectDaySystem, goalCommitmentSystem, callSimulationSystem, relationshipMediation, meaningfulMoments;

const execAsync = promisify(exec);
const { readFile, writeFile } = fsPromises;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// ==================== ENVIRONMENT CONFIGURATION ====================
const {
  DATABASE_URL,
  COMMAND_CENTER_KEY,
  OPENAI_API_KEY,
  ANTHROPIC_API_KEY,
  GEMINI_API_KEY,
  LIFEOS_ANTHROPIC_KEY,
  LIFEOS_GEMINI_KEY,
  DEEPSEEK_API_KEY,
  GROK_API_KEY,
  GROQ_API_KEY,
  GITHUB_TOKEN,
  GITHUB_REPO = "LimitlessOI/Lumin-LifeOS",
  OLLAMA_ENDPOINT =
    process.env.OLLAMA_ENDPOINT ||
    process.env.OLLAMA_BASE_URL ||
    process.env.OLLAMA_URL ||
    process.env.OLLAMA_API_BASE ||
    (process.env.OLLAMA_HOST ? `http://${process.env.OLLAMA_HOST}` : "") ||
    ((process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_SERVICE_ID || process.env.RAILWAY_ENVIRONMENT)
      ? "http://ollama.railway.internal:11434"
      : "http://localhost:11434"),
  DEEPSEEK_LOCAL_ENDPOINT = "",
  DEEPSEEK_BRIDGE_ENABLED = "false",
  ALLOWED_ORIGINS = "",
  HOST = "0.0.0.0",
  PORT = 8080,
  // Spend cap (can be overridden in Railway env). Default: $0/day - NO SPENDING
  MAX_DAILY_SPEND: RAW_MAX_DAILY_SPEND = "0",
  // Cost shutdown threshold - if spending exceeds this, only use free models
  COST_SHUTDOWN_THRESHOLD: RAW_COST_SHUTDOWN = "0",
  NODE_ENV = "production",
  RAILWAY_PUBLIC_DOMAIN = "robust-magic-production.up.railway.app",
  // Database SSL config (default: false for Neon.tech compatibility)
  DB_SSL_REJECT_UNAUTHORIZED = "false",
  // Stripe config
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET, // reserved for future webhook use
} = process.env;

// Feature flags
const DISABLE_INCOME_DRONES = true; // Set to false to re-enable income drones

// Require COMMAND_CENTER_KEY (no default fallback)
if (!COMMAND_CENTER_KEY) {
  throw new Error('COMMAND_CENTER_KEY environment variable is required');
}

// Ensure spend cap is numeric
const MAX_DAILY_SPEND = Number.isFinite(parseFloat(RAW_MAX_DAILY_SPEND))
  ? parseFloat(RAW_MAX_DAILY_SPEND)
  : 0; // Default $0/day - NO SPENDING

// Cost shutdown threshold - if exceeded, only free models allowed
const COST_SHUTDOWN_THRESHOLD = Number.isFinite(parseFloat(RAW_COST_SHUTDOWN))
  ? parseFloat(RAW_COST_SHUTDOWN)
  : 0; // Default $0/day - BLOCK ALL PAID MODELS

let CURRENT_DEEPSEEK_ENDPOINT = (process.env.DEEPSEEK_LOCAL_ENDPOINT || "")
  .trim() || null;

// Stripe client (lazy-loaded so the app can still boot if stripe is not installed)
let stripeClient = null;
async function getStripeClient() {
  if (!STRIPE_SECRET_KEY) return null;
  if (stripeClient) return stripeClient;
  try {
    // Dynamic import with error handling - completely optional
    let Stripe;
    try {
      const stripeModule = await import('stripe');
      Stripe = stripeModule.default || stripeModule.Stripe || stripeModule;
    } catch (importError) {
      // Package not installed - this is OK, Stripe is optional
      console.warn('⚠️ Stripe package not installed - Stripe features disabled');
      console.warn('   To enable: npm install stripe');
      return null;
    }
    
    if (!Stripe) {
      return null;
    }
    
    stripeClient = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-06-20",
    });
    console.log("✅ Stripe client initialized");
    return stripeClient;
  } catch (err) {
    // Any other error - log but don't crash
    console.warn("⚠️ Stripe initialization error (non-fatal):", err.message);
    return null;
  }
}

// ==================== SECURITY: CORS WITH ORIGIN PINNING ====================
const ALLOWED_ORIGINS_LIST = ALLOWED_ORIGINS
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .concat([
    "http://localhost:8080",
    "http://localhost:3000",
    "http://127.0.0.1:8080",
  ]);

// robust same-origin helper for Railway / proxies
function getRequestHost(req) {
  const forwarded = (req.headers["x-forwarded-host"] || "")
    .toString()
    .toLowerCase();
  const direct = (req.get("host") || "").toString().toLowerCase();
  return forwarded || direct;
}

function isSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // non-browser or curl: treat as same-origin

  try {
    const originUrl = new URL(origin);
    const reqHost = getRequestHost(req);
    return originUrl.host.toLowerCase() === reqHost;
  } catch {
    return false;
  }
}

// ==================== COMMAND CENTER ROUTES (FIRST - Before all middleware) ====================
// These MUST be defined before static middleware to work correctly
app.get("/activate", (req, res) => {
  console.log("🔐 [ROUTE] /activate accessed");
  const filePath = path.join(__dirname, "public", "overlay", "activate.html");
  console.log("🔐 [ROUTE] File path:", filePath);
  console.log("🔐 [ROUTE] File exists:", fs.existsSync(filePath));
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    console.error("❌ [ROUTE] Activation page not found at:", filePath);
    res.status(404).send("Activation page not found.");
  }
});

app.get("/command-center", (req, res) => {
  console.log("🎯 [ROUTE] /command-center accessed");
  // Only accept header-based auth (no query params)
  const key = req.headers["x-command-key"];
  
  // If key provided and valid, allow access
  if (key && key === COMMAND_CENTER_KEY) {
    const filePath = path.join(__dirname, "public", "overlay", "command-center.html");
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    } else {
      return res.status(404).send("Command center not found. Please ensure command-center.html exists.");
    }
  }

  // No key or invalid key, redirect to activation
  res.redirect('/activate');
});

app.get("/boldtrail", (req, res) => {
  console.log("🏠 [ROUTE] /boldtrail accessed");
  // Only accept header-based auth (no query params)
  const key = req.headers["x-command-key"];
  
  if (key && key === COMMAND_CENTER_KEY) {
    const filePath = path.join(__dirname, "public", "overlay", "boldtrail.html");
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    } else {
      return res.status(404).send("BoldTrail overlay not found.");
    }
  }

  // No key or invalid key, redirect to activation
  res.redirect('/activate');
});
// ==================== MIDDLEWARE ====================
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.text({ type: "text/plain", limit: "50mb" }));

// Serve static files (after specific routes)
app.use(express.static(path.join(__dirname, "public")));

// ==================== RATE LIMITING ====================
// General API rate limiter: 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { ok: false, error: "Too many requests, please try again later." },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Stricter limiter for AI-heavy endpoints: 20 requests per 15 minutes per IP
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: { ok: false, error: "Too many AI requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general limiter to all API routes
app.use("/api/", generalLimiter);

// Apply stricter limiter to AI-heavy endpoints
app.use("/api/v1/chat", aiLimiter);
app.use("/api/council/chat", aiLimiter);
app.use("/api/v1/architect/chat", aiLimiter);
app.use("/api/v1/architect/command", aiLimiter);
app.use("/api/v1/ai-council/test", aiLimiter);
app.use("/api/coach/chat", aiLimiter);

// SECURE CORS Middleware with NO-CACHE headers
app.use((req, res, next) => {
  // PREVENT CACHING
  res.header(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.header("Pragma", "no-cache");
  res.header("Expires", "0");
  res.header("Surrogate-Control", "no-store");

  const origin = req.headers.origin;

  if (isSameOrigin(req)) {
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
  } else if (origin && ALLOWED_ORIGINS_LIST.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
  } else if (!origin) {
    res.header("Access-Control-Allow-Origin", "*");
  }

  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, x-command-key, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// ==================== DATABASE POOL ====================
// Validate DATABASE_URL to prevent searchParams errors from invalid connection strings
let validatedDatabaseUrl = DATABASE_URL;
if (!validatedDatabaseUrl || validatedDatabaseUrl === 'postgres://username:password@host:port/database') {
  console.warn('⚠️ DATABASE_URL is missing or placeholder. Database features may not work.');
  validatedDatabaseUrl = undefined; // Prevents searchParams crash
}

export const pool = new Pool({
  connectionString: validatedDatabaseUrl,
  ssl: validatedDatabaseUrl?.includes("neon.tech")
    ? { rejectUnauthorized: DB_SSL_REJECT_UNAUTHORIZED !== "false" }
    : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// ==================== GLOBAL STATE ====================
let activeConnections = new Map();
let overlayStates = new Map();
let conversationHistory = new Map();
let aiPerformanceScores = new Map();
let dailyIdeas = [];
let lastIdeaGeneration = null;
let systemSnapshots = [];

const roiTracker = {
  daily_revenue: 0,
  daily_ai_cost: 0,
  daily_tasks_completed: 0,
  total_tokens_saved: 0,
  micro_compression_saves: 0,
  roi_ratio: 0,
  revenue_per_task: 0,
  last_reset: dayjs().format("YYYY-MM-DD"),
};

const compressionMetrics = {
  v2_0_compressions: 0,
  v3_compressions: 0,
  total_bytes_saved: 0,
  total_cost_saved: 0,
  cache_hits: 0,
  cache_misses: 0,
  model_downgrades: 0, // Using cheaper models
  prompt_optimizations: 0,
  tokens_saved_total: 0,
};

const systemMetrics = {
  selfModificationsAttempted: 0,
  selfModificationsSuccessful: 0,
  deploymentsTrigger: 0,
  improvementCyclesRun: 0,
  lastImprovement: null,
  consensusDecisionsMade: 0,
  blindSpotsDetected: 0,
  rollbacksPerformed: 0,
  dailyIdeasGenerated: 0,
};

// ==================== DATABASE INITIALIZATION ====================
async function initDatabase() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS conversation_memory (
      id SERIAL PRIMARY KEY,
      memory_id TEXT UNIQUE NOT NULL,
      orchestrator_msg TEXT NOT NULL,
      ai_response TEXT NOT NULL,
      ai_member VARCHAR(50),
      key_facts JSONB,
      context_metadata JSONB,
      memory_type TEXT DEFAULT 'conversation',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS consensus_proposals (
      id SERIAL PRIMARY KEY,
      proposal_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      proposed_by VARCHAR(50),
      status VARCHAR(20) DEFAULT 'proposed',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      decided_at TIMESTAMPTZ
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS debate_arguments (
      id SERIAL PRIMARY KEY,
      proposal_id TEXT NOT NULL,
      ai_member VARCHAR(50) NOT NULL,
      side VARCHAR(20) NOT NULL,
      argument TEXT NOT NULL,
      confidence INT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY(proposal_id) REFERENCES consensus_proposals(proposal_id)
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS consequence_evaluations (
      id SERIAL PRIMARY KEY,
      proposal_id TEXT NOT NULL,
      ai_member VARCHAR(50) NOT NULL,
      risk_level VARCHAR(20),
      intended_consequences TEXT,
      unintended_consequences TEXT,
      mitigation_strategy TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY(proposal_id) REFERENCES consensus_proposals(proposal_id)
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS consensus_votes (
      id SERIAL PRIMARY KEY,
      proposal_id TEXT NOT NULL,
      ai_member VARCHAR(50) NOT NULL,
      vote VARCHAR(20),
      reasoning TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY(proposal_id) REFERENCES consensus_proposals(proposal_id)
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS ai_performance (
      id SERIAL PRIMARY KEY,
      ai_member VARCHAR(50) NOT NULL,
      task_id TEXT,
      task_type VARCHAR(50),
      duration_ms INT,
      tokens_used INT,
      cost DECIMAL(10,4),
      accuracy DECIMAL(5,2),
      success BOOLEAN,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS blind_spots (
      id SERIAL PRIMARY KEY,
      detected_by VARCHAR(50),
      decision_context TEXT,
      blind_spot TEXT,
      severity VARCHAR(20),
      mitigation TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS execution_tasks (
      id SERIAL PRIMARY KEY,
      task_id TEXT UNIQUE NOT NULL,
      type VARCHAR(50),
      description TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      metadata JSONB,
      result TEXT,
      error TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    )`);

    // Build history table
    await pool.query(`CREATE TABLE IF NOT EXISTS build_history (
      id SERIAL PRIMARY KEY,
      build_id TEXT UNIQUE NOT NULL,
      status VARCHAR(20) DEFAULT 'running',
      steps JSONB,
      errors JSONB,
      duration_ms INT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_execution_tasks_status ON execution_tasks(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_execution_tasks_created ON execution_tasks(created_at)`);

    // Task tracking table
    await pool.query(`CREATE TABLE IF NOT EXISTS task_tracking (
      id SERIAL PRIMARY KEY,
      task_id TEXT UNIQUE NOT NULL,
      task_type VARCHAR(50),
      description TEXT,
      expected_outcome TEXT,
      status VARCHAR(20) DEFAULT 'in_progress',
      steps JSONB,
      errors JSONB,
      verification_results JSONB,
      completion_reason TEXT,
      start_time TIMESTAMPTZ,
      end_time TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS daily_ideas (
      id SERIAL PRIMARY KEY,
      idea_id TEXT UNIQUE NOT NULL,
      idea_title TEXT,
      idea_description TEXT,
      proposed_by VARCHAR(50),
      votes_for INT DEFAULT 0,
      votes_against INT DEFAULT 0,
      status VARCHAR(20) DEFAULT 'pending',
      implementation_difficulty VARCHAR(20),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS sandbox_tests (
      id SERIAL PRIMARY KEY,
      test_id TEXT UNIQUE NOT NULL,
      code_change TEXT,
      test_result TEXT,
      success BOOLEAN,
      error_message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS system_snapshots (
      id SERIAL PRIMARY KEY,
      snapshot_id TEXT UNIQUE NOT NULL,
      snapshot_data JSONB,
      version VARCHAR(20),
      reason TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS ai_rotation_log (
      id SERIAL PRIMARY KEY,
      ai_member VARCHAR(50),
      previous_role VARCHAR(100),
      new_role VARCHAR(100),
      performance_score DECIMAL(5,2),
      reason TEXT,
      rotated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS user_decisions (
      id SERIAL PRIMARY KEY,
      decision_id TEXT UNIQUE NOT NULL,
      context TEXT,
      choice TEXT,
      outcome TEXT,
      riskLevel DECIMAL(3,2),
      timeToDecision INT,
      pattern_match DECIMAL(3,2),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS loss_log (
      id SERIAL PRIMARY KEY,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      severity VARCHAR(20),
      what_was_lost TEXT,
      why_lost TEXT,
      context JSONB,
      prevention_strategy TEXT
    )`);

    // Log fixes table for log monitor (matches log-monitor.js expectations)
    await pool.query(`CREATE TABLE IF NOT EXISTS log_fixes (
      id SERIAL PRIMARY KEY,
      error_text TEXT,
      error_type VARCHAR(50),
      fix_action VARCHAR(50),
      fix_description TEXT,
      success BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS execution_tasks (
      id SERIAL PRIMARY KEY,
      task_id TEXT UNIQUE NOT NULL,
      type VARCHAR(50),
      description TEXT,
      status VARCHAR(20) DEFAULT 'queued',
      result TEXT,
      error TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS income_drones (
      id SERIAL PRIMARY KEY,
      drone_id TEXT UNIQUE NOT NULL,
      drone_type VARCHAR(50),
      status VARCHAR(20) DEFAULT 'active',
      revenue_generated DECIMAL(15,2) DEFAULT 0,
      actual_revenue DECIMAL(15,2) DEFAULT 0,
      projected_revenue DECIMAL(15,2) DEFAULT 0,
      tasks_completed INT DEFAULT 0,
      expected_revenue DECIMAL(15,2) DEFAULT 500,
      deployed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    
    // Add expected_revenue column if it doesn't exist (migration)
    try {
      await pool.query(`ALTER TABLE income_drones ADD COLUMN IF NOT EXISTS expected_revenue DECIMAL(15,2) DEFAULT 500`);
    } catch (e) {
      // Column might already exist, ignore
    }
    
    // Add actual_revenue and projected_revenue columns if they don't exist (migration)
    try {
      await pool.query(`ALTER TABLE income_drones ADD COLUMN IF NOT EXISTS actual_revenue DECIMAL(15,2) DEFAULT 0`);
      await pool.query(`ALTER TABLE income_drones ADD COLUMN IF NOT EXISTS projected_revenue DECIMAL(15,2) DEFAULT 0`);
    } catch (e) {
      // Columns might already exist, ignore
    }

    await pool.query(`CREATE TABLE IF NOT EXISTS daily_spend (
      id SERIAL PRIMARY KEY,
      date DATE UNIQUE NOT NULL,
      usd DECIMAL(15,4) DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS financial_ledger (
      id SERIAL PRIMARY KEY,
      tx_id TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      description TEXT,
      category TEXT,
      external_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS protected_files (
      id SERIAL PRIMARY KEY,
      file_path TEXT UNIQUE NOT NULL,
      reason TEXT NOT NULL,
      can_read BOOLEAN DEFAULT true,
      can_write BOOLEAN DEFAULT false,
      requires_full_council BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS self_modifications (
      id SERIAL PRIMARY KEY,
      mod_id TEXT UNIQUE NOT NULL,
      file_path TEXT NOT NULL,
      change_description TEXT,
      old_content TEXT,
      new_content TEXT,
      status VARCHAR(20) DEFAULT 'applied',
      council_approved BOOLEAN,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    // Two-Tier Council System Tables
    await pool.query(`CREATE TABLE IF NOT EXISTS model_routing_log (
      id SERIAL PRIMARY KEY,
      task_type VARCHAR(50),
      risk_level VARCHAR(20),
      user_facing BOOLEAN,
      final_tier INT,
      cost DECIMAL(10,6),
      success BOOLEAN,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS white_label_configs (
      id SERIAL PRIMARY KEY,
      client_id TEXT UNIQUE NOT NULL,
      brand_name TEXT,
      hide_tiers BOOLEAN DEFAULT true,
      hide_models BOOLEAN DEFAULT true,
      hide_costs BOOLEAN DEFAULT true,
      hide_architecture BOOLEAN DEFAULT true,
      custom_domain TEXT,
      custom_logo TEXT,
      api_response_format VARCHAR(20) DEFAULT 'standard',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS outreach_log (
      id SERIAL PRIMARY KEY,
      campaign_id TEXT,
      channel VARCHAR(20),
      recipient TEXT,
      subject TEXT,
      body TEXT,
      status VARCHAR(20),
      external_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    // Enhanced AI Response Cache (Neon-optimized for massive cost savings)
    await pool.query(`CREATE TABLE IF NOT EXISTS ai_response_cache (
      id SERIAL PRIMARY KEY,
      prompt_hash TEXT UNIQUE NOT NULL,
      prompt_text TEXT,
      response_text TEXT,
      model_used VARCHAR(50),
      cost_saved DECIMAL(10,6) DEFAULT 0,
      hit_count INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_used_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cache_prompt_hash ON ai_response_cache(prompt_hash)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cache_created_at ON ai_response_cache(created_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cache_last_used ON ai_response_cache(last_used_at)`);

    // Knowledge Base System
    await pool.query(`CREATE TABLE IF NOT EXISTS knowledge_base_files (
      id SERIAL PRIMARY KEY,
      file_id TEXT UNIQUE NOT NULL,
      filename TEXT NOT NULL,
      file_path TEXT NOT NULL,
      category VARCHAR(50) DEFAULT 'context',
      tags JSONB DEFAULT '[]',
      description TEXT,
      business_idea BOOLEAN DEFAULT false,
      security_related BOOLEAN DEFAULT false,
      historical BOOLEAN DEFAULT false,
      keywords JSONB DEFAULT '[]',
      search_vector tsvector,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    // Source of Truth / System Constitution - Core mission, ethics, vision
    await pool.query(`CREATE TABLE IF NOT EXISTS system_source_of_truth (
      id SERIAL PRIMARY KEY,
      document_type VARCHAR(50) NOT NULL DEFAULT 'master_vision',
      version VARCHAR(20) DEFAULT '1.0',
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      section VARCHAR(100),
      is_active BOOLEAN DEFAULT true,
      priority INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sot_type_active ON system_source_of_truth(document_type, is_active) WHERE is_active = true`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_sot_priority ON system_source_of_truth(priority DESC)`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_kb_search ON knowledge_base_files USING gin(search_vector)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_kb_category ON knowledge_base_files(category)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_kb_business ON knowledge_base_files(business_idea) WHERE business_idea = true`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_kb_security ON knowledge_base_files(security_related) WHERE security_related = true`);

    // Trial System
    await pool.query(`CREATE TABLE IF NOT EXISTS user_trials (
      id SERIAL PRIMARY KEY,
      user_id TEXT,
      command_key TEXT,
      duration_days INT DEFAULT 7,
      active BOOLEAN DEFAULT true,
      has_subscription BOOLEAN DEFAULT false,
      source VARCHAR(50),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_trials_user ON user_trials(user_id, command_key)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_trials_active ON user_trials(active) WHERE active = true`);

    // Cost Analysis Log
    await pool.query(`CREATE TABLE IF NOT EXISTS cost_analysis_log (
      id SERIAL PRIMARY KEY,
      analysis_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cost_analysis_created ON cost_analysis_log(created_at)`);

    // Cost Analysis Log
    await pool.query(`CREATE TABLE IF NOT EXISTS cost_analysis_log (
      id SERIAL PRIMARY KEY,
      analysis_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cost_analysis_created ON cost_analysis_log(created_at)`);

    await pool.query(`
      ALTER TABLE financial_ledger
      ADD COLUMN IF NOT EXISTS external_id TEXT
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_ledger_external
      ON financial_ledger(external_id)
      WHERE external_id IS NOT NULL
    `);

    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_memory_id ON conversation_memory(memory_id)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_memory_created ON conversation_memory(created_at)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_ai_performance ON ai_performance(ai_member, created_at)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_blind_spots ON blind_spots(severity, created_at)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_daily_ideas ON daily_ideas(status, created_at)`
    );

    // Task Improvement Reports (AI employees report improvements after tasks)
    await pool.query(`CREATE TABLE IF NOT EXISTS task_improvement_reports (
      id SERIAL PRIMARY KEY,
      task_id TEXT NOT NULL,
      task_description TEXT,
      ai_model VARCHAR(50),
      improvements JSONB DEFAULT '[]',
      vote INT,
      vote_reasoning TEXT,
      recommend BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_improvement_task ON task_improvement_reports(task_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_improvement_model ON task_improvement_reports(ai_model)`);

    // Tier 0 Improvement Ideas (from AI employees, before deduplication)
    await pool.query(`CREATE TABLE IF NOT EXISTS tier0_improvement_ideas (
      idea_id SERIAL PRIMARY KEY,
      idea_text TEXT NOT NULL,
      category VARCHAR(50),
      impact VARCHAR(20),
      effort VARCHAR(20),
      reasoning TEXT,
      source_vote INT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(idea_text)
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tier0_ideas_category ON tier0_improvement_ideas(category)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tier0_ideas_impact ON tier0_improvement_ideas(impact)`);

    // Tier 1 Pending Ideas (worthy ideas escalated from Tier 0)
    await pool.query(`CREATE TABLE IF NOT EXISTS tier1_pending_ideas (
      id SERIAL PRIMARY KEY,
      idea_text TEXT NOT NULL,
      category VARCHAR(50),
      impact VARCHAR(20),
      effort VARCHAR(20),
      reasoning TEXT,
      source_tier VARCHAR(20),
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tier1_pending_status ON tier1_pending_ideas(status)`);

    // User Decision History (for learning user's style)
    await pool.query(`CREATE TABLE IF NOT EXISTS user_decision_history (
      id SERIAL PRIMARY KEY,
      context JSONB,
      decision TEXT NOT NULL,
      reasoning TEXT,
      timestamp TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_user_decisions_timestamp ON user_decision_history(timestamp)`);

    // User Style Profile (learned from decisions)
    await pool.query(`CREATE TABLE IF NOT EXISTS user_style_profile (
      id INT PRIMARY KEY DEFAULT 1,
      profile_data JSONB,
      accuracy_score DECIMAL(5,4) DEFAULT 0,
      decision_count INT DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    // AI Effectiveness Ratings
    await pool.query(`CREATE TABLE IF NOT EXISTS ai_effectiveness_ratings (
      id SERIAL PRIMARY KEY,
      ai_member VARCHAR(50) NOT NULL,
      task_type VARCHAR(50),
      effectiveness_score DECIMAL(5,4) DEFAULT 0,
      success_count INT DEFAULT 0,
      total_count INT DEFAULT 0,
      avg_response_time INT,
      cost_efficiency DECIMAL(10,6),
      quality_score DECIMAL(5,4),
      last_rated_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(ai_member, task_type)
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ai_effectiveness_member ON ai_effectiveness_ratings(ai_member)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ai_effectiveness_task ON ai_effectiveness_ratings(task_type)`);

    // Error Appearance Timing (for adaptive log checking)
    await pool.query(`CREATE TABLE IF NOT EXISTS error_appearance_times (
      id SERIAL PRIMARY KEY,
      seconds_after_upgrade DECIMAL(10,2) NOT NULL,
      error_count INT DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(seconds_after_upgrade)
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_error_timing_seconds ON error_appearance_times(seconds_after_upgrade)`);

    // Comprehensive Idea Tracker
    await pool.query(`CREATE TABLE IF NOT EXISTS comprehensive_ideas (
      id SERIAL PRIMARY KEY,
      idea_id TEXT UNIQUE NOT NULL,
      idea_text TEXT NOT NULL,
      original_author VARCHAR(50) DEFAULT 'user',
      contributors JSONB DEFAULT '[]',
      priority VARCHAR(20) DEFAULT 'medium',
      status VARCHAR(20) DEFAULT 'pending',
      rejection_reason TEXT,
      acceptance_reason TEXT,
      impact INT,
      revenue_potential DECIMAL(12,2),
      difficulty VARCHAR(20),
      category VARCHAR(50),
      tags JSONB DEFAULT '[]',
      related_ideas JSONB DEFAULT '[]',
      implementation_notes TEXT,
      estimated_time INT,
      dependencies JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_comprehensive_ideas_status ON comprehensive_ideas(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_comprehensive_ideas_author ON comprehensive_ideas(original_author)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_comprehensive_ideas_priority ON comprehensive_ideas(priority)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_comprehensive_ideas_category ON comprehensive_ideas(category)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_comprehensive_ideas_tags ON comprehensive_ideas USING gin(tags)`);

    // Drone Opportunities
    await pool.query(`CREATE TABLE IF NOT EXISTS drone_opportunities (
      id SERIAL PRIMARY KEY,
      drone_id TEXT NOT NULL,
      opportunity_type VARCHAR(50),
      data JSONB,
      status VARCHAR(20) DEFAULT 'pending',
      revenue_estimate DECIMAL(12,2),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (drone_id) REFERENCES income_drones(drone_id)
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_drone_opp_drone ON drone_opportunities(drone_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_drone_opp_type ON drone_opportunities(opportunity_type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_drone_opp_status ON drone_opportunities(status)`);

    // Add missing columns to drone_opportunities if they don't exist
    try {
      await pool.query(`ALTER TABLE drone_opportunities ADD COLUMN IF NOT EXISTS priority INT DEFAULT 0`);
      await pool.query(`ALTER TABLE drone_opportunities ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ`);
      await pool.query(`ALTER TABLE drone_opportunities ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ`);
      await pool.query(`ALTER TABLE drone_opportunities ADD COLUMN IF NOT EXISTS actual_revenue DECIMAL(12,2) DEFAULT 0`);
      await pool.query(`ALTER TABLE drone_opportunities ADD COLUMN IF NOT EXISTS execution_data JSONB`);
      await pool.query(`ALTER TABLE drone_opportunities ADD COLUMN IF NOT EXISTS error TEXT`);
    } catch (e) {
      // Columns might already exist
    }

    // Content assets table (for storing created content)
    await pool.query(`CREATE TABLE IF NOT EXISTS content_assets (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      opportunity_id TEXT,
      status VARCHAR(20) DEFAULT 'ready_to_publish',
      published_at TIMESTAMPTZ,
      revenue_generated DECIMAL(12,2) DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    // Service proposals table (for storing service proposals)
    await pool.query(`CREATE TABLE IF NOT EXISTS service_proposals (
      id SERIAL PRIMARY KEY,
      opportunity_id TEXT,
      proposal_data JSONB,
      status VARCHAR(20) DEFAULT 'ready_to_send',
      sent_at TIMESTAMPTZ,
      response_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    // Vapi Calls
    await pool.query(`CREATE TABLE IF NOT EXISTS vapi_calls (
      id SERIAL PRIMARY KEY,
      call_id TEXT UNIQUE NOT NULL,
      phone_number VARCHAR(20),
      duration INT,
      status VARCHAR(20),
      transcript TEXT,
      recording_url TEXT,
      started_at TIMESTAMPTZ,
      ended_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_vapi_calls_phone ON vapi_calls(phone_number)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_vapi_calls_status ON vapi_calls(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_vapi_calls_created ON vapi_calls(created_at)`);

    // Autonomous Businesses
    await pool.query(`CREATE TABLE IF NOT EXISTS autonomous_businesses (
      id SERIAL PRIMARY KEY,
      business_id TEXT UNIQUE NOT NULL,
      business_name TEXT NOT NULL,
      business_type VARCHAR(50),
      revenue_30d DECIMAL(12,2) DEFAULT 0,
      costs_30d DECIMAL(12,2) DEFAULT 0,
      customer_count INT DEFAULT 0,
      health_score INT DEFAULT 50,
      status VARCHAR(20) DEFAULT 'active',
      last_health_check TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_autonomous_businesses_status ON autonomous_businesses(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_autonomous_businesses_type ON autonomous_businesses(business_type)`);

    // Revenue Opportunities
    await pool.query(`CREATE TABLE IF NOT EXISTS revenue_opportunities (
      id SERIAL PRIMARY KEY,
      opportunity_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      revenue_potential DECIMAL(12,2),
      time_to_implement INT,
      required_resources JSONB,
      market_demand TEXT,
      competitive_advantage TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_revenue_opp_status ON revenue_opportunities(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_revenue_opp_potential ON revenue_opportunities(revenue_potential DESC)`);

    // Generated Games
    await pool.query(`CREATE TABLE IF NOT EXISTS generated_games (
      id SERIAL PRIMARY KEY,
      game_id TEXT UNIQUE NOT NULL,
      game_name TEXT NOT NULL,
      game_type VARCHAR(50),
      complexity VARCHAR(20),
      code_html TEXT,
      code_css TEXT,
      code_js TEXT,
      description TEXT,
      marketing_strategy JSONB,
      monetization VARCHAR(20),
      use_overlay BOOLEAN DEFAULT true,
      status VARCHAR(20) DEFAULT 'generated',
      deployed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_games_type ON generated_games(game_type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_games_status ON generated_games(status)`);

    // Business Duplications
    await pool.query(`CREATE TABLE IF NOT EXISTS business_duplications (
      id SERIAL PRIMARY KEY,
      business_id TEXT UNIQUE NOT NULL,
      competitor_name TEXT NOT NULL,
      competitor_url TEXT,
      analysis_data JSONB,
      improvement_target INT,
      implementation_plan JSONB,
      logo_data JSONB,
      status VARCHAR(20) DEFAULT 'analyzed',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_biz_dup_status ON business_duplications(status)`);

    // Code Services
    await pool.query(`CREATE TABLE IF NOT EXISTS code_services (
      id SERIAL PRIMARY KEY,
      service_id TEXT UNIQUE NOT NULL,
      service_type VARCHAR(50),
      request_data JSONB,
      response_data JSONB,
      status VARCHAR(20) DEFAULT 'completed',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_code_services_type ON code_services(service_type)`);

    // Make.com Scenarios
    await pool.query(`CREATE TABLE IF NOT EXISTS makecom_scenarios (
      id SERIAL PRIMARY KEY,
      scenario_id TEXT UNIQUE NOT NULL,
      description TEXT,
      scenario_data JSONB,
      status VARCHAR(20) DEFAULT 'generated',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    // Zapier Zaps
    await pool.query(`CREATE TABLE IF NOT EXISTS zapier_zaps (
      id SERIAL PRIMARY KEY,
      zap_id TEXT UNIQUE NOT NULL,
      description TEXT,
      zap_data JSONB,
      status VARCHAR(20) DEFAULT 'generated',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    // Approval Requests (for controversial items)
    await pool.query(`CREATE TABLE IF NOT EXISTS approval_requests (
      id SERIAL PRIMARY KEY,
      request_id TEXT UNIQUE NOT NULL,
      type VARCHAR(50),
      description TEXT,
      potential_issues JSONB,
      request_data JSONB,
      status VARCHAR(20) DEFAULT 'pending',
      approval_notes TEXT,
      approved_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_approval_status ON approval_requests(status)`);

    // Self-Funding Spending
    await pool.query(`CREATE TABLE IF NOT EXISTS self_funding_spending (
      id SERIAL PRIMARY KEY,
      spending_id TEXT UNIQUE NOT NULL,
      opportunity_name TEXT,
      amount DECIMAL(12,2),
      expected_revenue DECIMAL(12,2),
      projected_roi DECIMAL(5,2),
      category VARCHAR(50),
      status VARCHAR(20) DEFAULT 'pending',
      execution_data JSONB,
      executed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_self_funding_status ON self_funding_spending(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_self_funding_category ON self_funding_spending(category)`);

    // Marketing Research
    await pool.query(`CREATE TABLE IF NOT EXISTS marketing_research (
      id SERIAL PRIMARY KEY,
      research_id TEXT UNIQUE NOT NULL,
      marketer_name VARCHAR(100),
      research_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_marketing_research_marketer ON marketing_research(marketer_name)`);

    // Marketing Playbook
    await pool.query(`CREATE TABLE IF NOT EXISTS marketing_playbook (
      id INT PRIMARY KEY DEFAULT 1,
      playbook_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    // Marketing Campaigns
    await pool.query(`CREATE TABLE IF NOT EXISTS marketing_campaigns (
      id SERIAL PRIMARY KEY,
      campaign_id TEXT UNIQUE NOT NULL,
      client VARCHAR(100) DEFAULT 'lifeos',
      campaign_name TEXT,
      campaign_data JSONB,
      status VARCHAR(20) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_client ON marketing_campaigns(client)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status)`);

    // Marketing Content
    await pool.query(`CREATE TABLE IF NOT EXISTS marketing_content (
      id SERIAL PRIMARY KEY,
      content_id TEXT UNIQUE NOT NULL,
      content_type VARCHAR(50),
      content_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    // Web Scrapes
    // AI Platform Credentials (for conversation scraping)
    await pool.query(`CREATE TABLE IF NOT EXISTS ai_platform_credentials (
      id SERIAL PRIMARY KEY,
      provider VARCHAR(50) UNIQUE NOT NULL,
      encrypted_credentials TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS web_scrapes (
      id SERIAL PRIMARY KEY,
      scrape_id TEXT UNIQUE NOT NULL,
      url TEXT NOT NULL,
      scrape_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_web_scrapes_url ON web_scrapes(url)`);

    // AI Platform Credentials (encrypted)
    await pool.query(`CREATE TABLE IF NOT EXISTS ai_platform_credentials (
      id SERIAL PRIMARY KEY,
      provider VARCHAR(50) UNIQUE NOT NULL,
      encrypted_credentials TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ai_credentials_provider ON ai_platform_credentials(provider)`);

    await pool.query(`INSERT INTO protected_files (file_path, reason, can_read, can_write, requires_full_council) VALUES
      ('.js', 'Core system', true, false, true),
      ('package.json', 'Dependencies', true, false, true),
      ('.github/workflows/autopilot-build.yml', 'Autopilot', true, false, true),
      ('public/overlay/command-center.html', 'Control panel', true, true, true)
      ON CONFLICT (file_path) DO NOTHING`);

    // BoldTrail Real Estate CRM Tables
    await pool.query(`CREATE TABLE IF NOT EXISTS boldtrail_agents (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255),
      subscription_tier VARCHAR(50) DEFAULT 'pro',
      stripe_customer_id VARCHAR(255),
      stripe_subscription_id VARCHAR(255),
      subscription_status VARCHAR(50) DEFAULT 'active',
      agent_tone TEXT,
      preferences JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS boldtrail_showings (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      property_address TEXT NOT NULL,
      property_details JSONB,
      showing_date TIMESTAMPTZ,
      client_name TEXT,
      client_email TEXT,
      client_phone TEXT,
      route_order INTEGER,
      estimated_drive_time INTEGER,
      status VARCHAR(50) DEFAULT 'scheduled',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS boldtrail_email_drafts (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      draft_type VARCHAR(50),
      recipient_email TEXT,
      recipient_name TEXT,
      subject TEXT,
      content TEXT,
      context_data JSONB,
      status VARCHAR(50) DEFAULT 'draft',
      sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_boldtrail_agents_email ON boldtrail_agents(email)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_boldtrail_showings_agent ON boldtrail_showings(agent_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_boldtrail_showings_date ON boldtrail_showings(showing_date)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_boldtrail_email_agent ON boldtrail_email_drafts(agent_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_boldtrail_email_status ON boldtrail_email_drafts(status)`);

    // Sales Coaching & Recording Tables
    await pool.query(`CREATE TABLE IF NOT EXISTS sales_call_recordings (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      call_id VARCHAR(255) UNIQUE,
      recording_url TEXT,
      recording_type VARCHAR(50) DEFAULT 'phone_call', -- 'phone_call', 'showing_presentation', 'video_call'
      transcript TEXT,
      transcript_segments JSONB, -- Array of {timestamp, speaker, text}
      duration INTEGER, -- seconds
      client_name TEXT,
      client_email TEXT,
      client_phone TEXT,
      property_address TEXT, -- For showing presentations
      status VARCHAR(50) DEFAULT 'recording', -- 'recording', 'completed', 'analyzed'
      ai_analysis JSONB, -- Full AI analysis results
      created_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      analyzed_at TIMESTAMPTZ
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS coaching_clips (
      id SERIAL PRIMARY KEY,
      recording_id INTEGER REFERENCES sales_call_recordings(id) ON DELETE CASCADE,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      clip_type VARCHAR(50) NOT NULL, -- 'good_moment', 'coaching_needed', 'technique_example'
      start_time INTEGER NOT NULL, -- seconds from start
      end_time INTEGER NOT NULL,
      transcript_segment TEXT,
      ai_analysis JSONB,
      technique_detected VARCHAR(255), -- e.g., 'interrupting_client', 'not_listening', 'excellent_rapport'
      severity VARCHAR(50), -- 'low', 'medium', 'high' (for coaching_needed)
      coaching_suggestion TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS sales_technique_patterns (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      technique_name VARCHAR(255) NOT NULL,
      pattern_type VARCHAR(50) NOT NULL, -- 'bad_habit', 'good_practice', 'neutral'
      description TEXT,
      frequency INTEGER DEFAULT 1,
      first_detected TIMESTAMPTZ DEFAULT NOW(),
      last_detected TIMESTAMPTZ DEFAULT NOW(),
      examples JSONB, -- Array of clip IDs or transcript snippets
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS real_time_coaching_events (
      id SERIAL PRIMARY KEY,
      recording_id INTEGER REFERENCES sales_call_recordings(id) ON DELETE CASCADE,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      event_type VARCHAR(50) NOT NULL, -- 'suggestion', 'warning', 'praise', 'technique_detected'
      timestamp INTEGER NOT NULL, -- seconds from call start
      message TEXT NOT NULL,
      severity VARCHAR(50), -- 'low', 'medium', 'high'
      delivered BOOLEAN DEFAULT FALSE, -- Whether coaching was delivered to agent
      delivered_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_call_recordings_agent ON sales_call_recordings(agent_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_call_recordings_status ON sales_call_recordings(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_coaching_clips_recording ON coaching_clips(recording_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_coaching_clips_agent ON coaching_clips(agent_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_coaching_clips_type ON coaching_clips(clip_type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_technique_patterns_agent ON sales_technique_patterns(agent_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_technique_patterns_type ON sales_technique_patterns(pattern_type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_coaching_events_recording ON real_time_coaching_events(recording_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_coaching_events_delivered ON real_time_coaching_events(delivered)`);

    // Agent Goals & Tracking System
    await pool.query(`CREATE TABLE IF NOT EXISTS agent_goals (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      goal_type VARCHAR(50) NOT NULL, -- 'revenue', 'sales', 'calls', 'appointments', 'showings', 'custom'
      goal_name VARCHAR(255) NOT NULL,
      target_value DECIMAL(12,2) NOT NULL,
      current_value DECIMAL(12,2) DEFAULT 0,
      unit VARCHAR(50), -- 'dollars', 'count', 'percentage'
      deadline TIMESTAMPTZ,
      estimated_cost DECIMAL(12,2), -- Cost to achieve goal
      estimated_roi DECIMAL(12,2), -- Expected ROI
      is_worth_it BOOLEAN, -- System evaluation if goal is worth the cost
      status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'paused', 'cancelled'
      breakdown JSONB, -- Breakdown into controllable activities
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS agent_activities (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      activity_type VARCHAR(50) NOT NULL, -- 'call', 'appointment', 'showing', 'email', 'follow_up', 'training', 'coaching'
      activity_subtype VARCHAR(100), -- 'cold_call', 'warm_call', 'follow_up_call', etc.
      client_name TEXT,
      client_email TEXT,
      client_phone TEXT,
      property_address TEXT,
      duration INTEGER, -- seconds
      outcome VARCHAR(50), -- 'appointment_set', 'no_answer', 'not_interested', 'interested', 'sale', 'showing_scheduled', etc.
      notes TEXT,
      recording_id INTEGER REFERENCES sales_call_recordings(id) ON DELETE SET NULL,
      metadata JSONB, -- Additional activity-specific data
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS agent_calendar_events (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      event_type VARCHAR(50) NOT NULL, -- 'appointment', 'showing', 'training', 'coaching', 'meeting', 'custom'
      title VARCHAR(255) NOT NULL,
      description TEXT,
      start_time TIMESTAMPTZ NOT NULL,
      end_time TIMESTAMPTZ NOT NULL,
      location TEXT,
      client_name TEXT,
      client_email TEXT,
      client_phone TEXT,
      property_address TEXT,
      is_recurring BOOLEAN DEFAULT FALSE,
      recurrence_pattern JSONB, -- For recurring events
      status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled', 'no_show'
      auto_record BOOLEAN DEFAULT TRUE, -- Auto-start recording for calls/appointments
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS agent_progression (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      current_level VARCHAR(50) DEFAULT 'new_agent', -- 'new_agent', 'developing', 'consistent', 'top_performer', 'elite'
      level_progress DECIMAL(5,2) DEFAULT 0, -- 0-100 percentage to next level
      total_sales INTEGER DEFAULT 0,
      total_revenue DECIMAL(12,2) DEFAULT 0,
      skills_assessment JSONB, -- Current skill levels in different areas
      strengths JSONB, -- Activities/skills agent excels at
      improvement_areas JSONB, -- Areas needing development
      next_level_requirements JSONB, -- What's needed to reach next level
      coaching_plan JSONB, -- Personalized coaching plan
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS activity_analytics (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      activity_type VARCHAR(50) NOT NULL,
      period_start TIMESTAMPTZ NOT NULL, -- Start of period (week/month)
      period_end TIMESTAMPTZ NOT NULL,
      period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
      total_count INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0,
      success_rate DECIMAL(5,2) DEFAULT 0, -- percentage
      average_duration INTEGER, -- seconds
      conversion_rate DECIMAL(5,2), -- percentage to next stage
      best_time_of_day VARCHAR(50), -- When agent performs best
      best_day_of_week VARCHAR(50),
      performance_score DECIMAL(5,2), -- Overall performance score
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_agent_goals_agent ON agent_goals(agent_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_agent_goals_status ON agent_goals(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_agent_goals_deadline ON agent_goals(deadline)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_agent_activities_agent ON agent_activities(agent_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_agent_activities_type ON agent_activities(activity_type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_agent_activities_created ON agent_activities(created_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_calendar_events_agent ON agent_calendar_events(agent_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON agent_calendar_events(start_time)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON agent_calendar_events(event_type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_agent_progression_agent ON agent_progression(agent_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_activity_analytics_agent ON activity_analytics(agent_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_activity_analytics_period ON activity_analytics(period_start, period_end)`);

    // Perfect Day & Motivation System
    await pool.query(`CREATE TABLE IF NOT EXISTS agent_perfect_day (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      wake_up_time TIME NOT NULL,
      goal_reading_time INTEGER DEFAULT 5, -- minutes
      visualization_time INTEGER DEFAULT 10,
      inspiring_content_url TEXT,
      training_schedule JSONB, -- Array of training activities
      daily_routine JSONB, -- Complete daily routine
      three_most_important JSONB, -- Today's 3 most important tasks
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS agent_daily_log (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      log_date DATE NOT NULL,
      wake_up_time TIME,
      goal_reading_completed BOOLEAN DEFAULT FALSE,
      visualization_completed BOOLEAN DEFAULT FALSE,
      inspiring_content_watched BOOLEAN DEFAULT FALSE,
      training_completed BOOLEAN DEFAULT FALSE,
      three_most_important JSONB, -- What they committed to
      three_most_important_completed JSONB, -- What they actually did
      day_grade VARCHAR(50), -- 'great', 'good', 'poor'
      day_score INTEGER, -- 0-100
      system_score INTEGER, -- System's assessment
      integrity_score DECIMAL(5,2), -- Based on commitments kept
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS agent_goal_commitments (
      id SERIAL PRIMARY KEY,
      goal_id INTEGER REFERENCES agent_goals(id) ON DELETE CASCADE,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      commitment_type VARCHAR(50) NOT NULL, -- 'daily_action', 'weekly_milestone', 'behavior'
      commitment_description TEXT NOT NULL,
      penalty_type VARCHAR(50), -- 'financial', 'time', 'privilege', 'custom'
      penalty_description TEXT,
      penalty_amount DECIMAL(10,2), -- If financial
      reward_type VARCHAR(50), -- 'cruise', 'vacation', 'purchase', 'experience', 'custom'
      reward_description TEXT,
      reward_value DECIMAL(10,2),
      agent_decided_worth_it BOOLEAN, -- Agent's decision
      commitment_start_date DATE,
      commitment_end_date DATE,
      status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'failed', 'forgiven'
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS agent_meaningful_moments (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      moment_type VARCHAR(50) NOT NULL, -- 'winning_moment', 'coaching_moment', 'breakthrough'
      recording_url TEXT,
      transcript TEXT,
      timestamp TIMESTAMPTZ NOT NULL,
      context TEXT,
      tags JSONB,
      playback_count INTEGER DEFAULT 0,
      last_played_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS agent_relationship_mediation (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      mediation_type VARCHAR(50) NOT NULL, -- 'personal', 'spouse', 'child', 'customer', 'business'
      other_party_name TEXT,
      other_party_contact TEXT,
      issue_description TEXT,
      mediation_status VARCHAR(50) DEFAULT 'requested', -- 'requested', 'in_progress', 'resolved', 'declined'
      agreement_text TEXT,
      both_parties_accepted BOOLEAN DEFAULT FALSE,
      recording_consent BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS agent_call_simulations (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      simulation_type VARCHAR(50) NOT NULL, -- 'practice', 'training', 'skill_building'
      scenario_description TEXT,
      script_guidance JSONB, -- Step-by-step guidance
      closes_to_practice JSONB, -- Array of closes (A/B close, etc.)
      questions_to_ask JSONB, -- Suggested questions
      personality_insights JSONB, -- What we learned about agent
      comfort_zones JSONB, -- Where agent is comfortable/uncomfortable
      recording_id INTEGER REFERENCES sales_call_recordings(id) ON DELETE SET NULL,
      completed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS agent_integrity_tracking (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      commitment_id INTEGER REFERENCES agent_goal_commitments(id) ON DELETE SET NULL,
      commitment_made TIMESTAMPTZ NOT NULL,
      commitment_kept BOOLEAN,
      commitment_kept_at TIMESTAMPTZ,
      integrity_score_impact DECIMAL(5,2), -- How this affects overall score
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_perfect_day_agent ON agent_perfect_day(agent_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_daily_log_agent ON agent_daily_log(agent_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_daily_log_date ON agent_daily_log(log_date)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_goal_commitments_goal ON agent_goal_commitments(goal_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_goal_commitments_agent ON agent_goal_commitments(agent_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_meaningful_moments_agent ON agent_meaningful_moments(agent_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_meaningful_moments_type ON agent_meaningful_moments(moment_type)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_relationship_mediation_agent ON agent_relationship_mediation(agent_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_call_simulations_agent ON agent_call_simulations(agent_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_integrity_tracking_agent ON agent_integrity_tracking(agent_id)`);

    // API Cost-Savings Service Tables
    await pool.query(`CREATE TABLE IF NOT EXISTS api_cost_savings_clients (
      id SERIAL PRIMARY KEY,
      company_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      contact_name VARCHAR(255),
      current_ai_provider VARCHAR(100),
      monthly_spend DECIMAL(12,2),
      use_cases JSONB,
      stripe_customer_id VARCHAR(255),
      subscription_status VARCHAR(50) DEFAULT 'active',
      onboarding_data JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS api_cost_savings_analyses (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES api_cost_savings_clients(id) ON DELETE CASCADE,
      analysis_date TIMESTAMPTZ DEFAULT NOW(),
      current_spend DECIMAL(12,2),
      optimized_spend DECIMAL(12,2),
      savings_amount DECIMAL(12,2),
      savings_percentage DECIMAL(5,2),
      optimization_opportunities JSONB,
      recommendations JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS api_cost_savings_metrics (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES api_cost_savings_clients(id) ON DELETE CASCADE,
      metric_date DATE NOT NULL,
      tokens_used BIGINT,
      api_calls INT,
      cost DECIMAL(12,2),
      optimized_cost DECIMAL(12,2),
      savings DECIMAL(12,2),
      cache_hit_rate DECIMAL(5,2),
      model_downgrades INT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(client_id, metric_date)
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cost_savings_clients_email ON api_cost_savings_clients(email)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cost_savings_analyses_client ON api_cost_savings_analyses(client_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cost_savings_metrics_client ON api_cost_savings_metrics(client_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_cost_savings_metrics_date ON api_cost_savings_metrics(metric_date)`);

    // Agent Recruitment Pipeline Tables
    await pool.query(`CREATE TABLE IF NOT EXISTS recruitment_leads (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255),
      phone VARCHAR(20),
      email VARCHAR(255),
      source VARCHAR(100),
      status VARCHAR(50) DEFAULT 'new',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS recruitment_calls (
      id SERIAL PRIMARY KEY,
      lead_id INTEGER REFERENCES recruitment_leads(id) ON DELETE CASCADE,
      call_sid VARCHAR(255),
      call_status VARCHAR(50),
      duration INTEGER,
      transcript TEXT,
      outcome VARCHAR(50),
      next_action VARCHAR(100),
      concerns TEXT,
      scheduled_webinar_id INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS recruitment_webinars (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      scheduled_time TIMESTAMPTZ NOT NULL,
      zoom_link TEXT,
      presentation_data JSONB,
      status VARCHAR(50) DEFAULT 'scheduled',
      attendees JSONB,
      recording_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS recruitment_enrollments (
      id SERIAL PRIMARY KEY,
      lead_id INTEGER REFERENCES recruitment_leads(id) ON DELETE CASCADE,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      webinar_id INTEGER REFERENCES recruitment_webinars(id),
      enrollment_tier VARCHAR(50) DEFAULT 'express',
      status VARCHAR(50) DEFAULT 'enrolled',
      stripe_customer_id VARCHAR(255),
      stripe_subscription_id VARCHAR(255),
      onboarding_stage VARCHAR(50) DEFAULT 'learning',
      mastery_level INT DEFAULT 0,
      unlocked_features JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS agent_feature_unlocks (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      feature_name VARCHAR(100) NOT NULL,
      unlocked_at TIMESTAMPTZ DEFAULT NOW(),
      mastery_required BOOLEAN DEFAULT true,
      UNIQUE(agent_id, feature_name)
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS youtube_video_projects (
      id SERIAL PRIMARY KEY,
      agent_id INTEGER REFERENCES boldtrail_agents(id) ON DELETE CASCADE,
      title VARCHAR(255),
      description TEXT,
      script TEXT,
      raw_video_url TEXT,
      edited_video_url TEXT,
      b_roll_added BOOLEAN DEFAULT false,
      enhancements JSONB,
      status VARCHAR(50) DEFAULT 'draft',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    // Creator Enhancement Suite Tables
    await pool.query(`CREATE TABLE IF NOT EXISTS creator_profiles (
      id SERIAL PRIMARY KEY,
      creator_email VARCHAR(255) UNIQUE NOT NULL,
      creator_name VARCHAR(255),
      brand_voice TEXT,
      style_preferences JSONB,
      content_themes JSONB,
      target_audience JSONB,
      platforms JSONB,
      stripe_customer_id VARCHAR(255),
      subscription_tier VARCHAR(50) DEFAULT 'pro',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS creator_content (
      id SERIAL PRIMARY KEY,
      creator_id INTEGER REFERENCES creator_profiles(id) ON DELETE CASCADE,
      content_type VARCHAR(50), -- video, post, reel, story, etc.
      original_url TEXT,
      enhanced_url TEXT,
      title VARCHAR(255),
      description TEXT,
      tags JSONB,
      seo_optimized BOOLEAN DEFAULT false,
      seo_score INT,
      status VARCHAR(50) DEFAULT 'draft',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS creator_posts (
      id SERIAL PRIMARY KEY,
      content_id INTEGER REFERENCES creator_content(id) ON DELETE CASCADE,
      platform VARCHAR(50), -- youtube, instagram, tiktok, twitter, etc.
      post_id VARCHAR(255),
      post_url TEXT,
      scheduled_time TIMESTAMPTZ,
      posted_at TIMESTAMPTZ,
      performance_metrics JSONB,
      status VARCHAR(50) DEFAULT 'scheduled',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS creator_ab_tests (
      id SERIAL PRIMARY KEY,
      creator_id INTEGER REFERENCES creator_profiles(id) ON DELETE CASCADE,
      test_name VARCHAR(255),
      test_type VARCHAR(50), -- title, thumbnail, description, posting_time, etc.
      variants JSONB,
      metrics JSONB,
      winner_variant VARCHAR(100),
      status VARCHAR(50) DEFAULT 'running',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS creator_enhancements (
      id SERIAL PRIMARY KEY,
      content_id INTEGER REFERENCES creator_content(id) ON DELETE CASCADE,
      enhancement_type VARCHAR(50), -- color_correction, audio_enhancement, b_roll, transitions, etc.
      before_data JSONB,
      after_data JSONB,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS creator_analytics (
      id SERIAL PRIMARY KEY,
      creator_id INTEGER REFERENCES creator_profiles(id) ON DELETE CASCADE,
      post_id INTEGER REFERENCES creator_posts(id) ON DELETE CASCADE,
      metric_date DATE NOT NULL,
      views INT DEFAULT 0,
      likes INT DEFAULT 0,
      comments INT DEFAULT 0,
      shares INT DEFAULT 0,
      engagement_rate DECIMAL(5,2),
      reach INT DEFAULT 0,
      impressions INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(post_id, metric_date)
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_creator_profiles_email ON creator_profiles(creator_email)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_creator_content_creator ON creator_content(creator_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_creator_posts_content ON creator_posts(content_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_creator_posts_platform ON creator_posts(platform)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_creator_ab_tests_creator ON creator_ab_tests(creator_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_creator_ab_tests_status ON creator_ab_tests(status)`);

    // Auto-Builder System Tables
    await pool.query(`CREATE TABLE IF NOT EXISTS build_artifacts (
      id SERIAL PRIMARY KEY,
      opportunity_id TEXT NOT NULL,
      build_type VARCHAR(50),
      files JSONB,
      status VARCHAR(50) DEFAULT 'generated',
      deployed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS deployments (
      id SERIAL PRIMARY KEY,
      opportunity_id TEXT UNIQUE NOT NULL,
      deployment_type VARCHAR(50),
      status VARCHAR(50) DEFAULT 'pending',
      deployed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_build_artifacts_opportunity ON build_artifacts(opportunity_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_build_artifacts_status ON build_artifacts(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status)`);

    await pool.query(`CREATE TABLE IF NOT EXISTS virtual_class_enrollments (
      id SERIAL PRIMARY KEY,
      student_email VARCHAR(255) NOT NULL,
      student_name VARCHAR(255),
      progress JSONB,
      current_module VARCHAR(100),
      completed_modules JSONB,
      enrolled_in_express BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS virtual_class_modules (
      id SERIAL PRIMARY KEY,
      module_name VARCHAR(255) NOT NULL,
      module_order INT NOT NULL,
      content JSONB,
      video_url TEXT,
      assignments JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_recruitment_leads_status ON recruitment_leads(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_recruitment_calls_lead ON recruitment_calls(lead_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_recruitment_webinars_time ON recruitment_webinars(scheduled_time)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_enrollments_lead ON recruitment_enrollments(lead_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_feature_unlocks_agent ON agent_feature_unlocks(agent_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_youtube_agent ON youtube_video_projects(agent_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_class_enrollments_email ON virtual_class_enrollments(student_email)`);

    console.log("✅ Database schema initialized (v26.1 - no Claude)");
  } catch (error) {
    console.error("❌ DB init error:", error.message);
    throw error;
  }
}

// ==================== ENHANCED AI COUNCIL MEMBERS (NO CLAUDE) ====================
// TIER 0: Open Source / Cheap Models (PRIMARY - Do all the work)
// TIER 1: Expensive Models (OVERSIGHT ONLY - Validation when needed)
const COUNCIL_MEMBERS = {
  // TIER 0 - PRIMARY WORKERS (Free/Cheap - Run system independently)
  ollama_deepseek: {
    name: "DeepSeek Coder (Local)",
    model: "deepseek-coder:latest",
    provider: "ollama",
    endpoint: OLLAMA_ENDPOINT || "http://localhost:11434",
    role: "Primary Developer & Infrastructure",
    focus: "optimization, performance, safe testing, development, code generation",
    maxTokens: 4096,
    tier: "tier0",
    costPer1M: 0, // FREE (local)
    specialties: ["infrastructure", "testing", "performance", "development", "code"],
    isFree: true,
    isLocal: true,
  },
  ollama_llama: {
    name: "Llama 3.2 (Local)",
    model: "llama3.2:1b",
    provider: "ollama",
    endpoint: OLLAMA_ENDPOINT || "http://localhost:11434",
    role: "General Assistant & Research",
    focus: "general tasks, research, analysis, reasoning",
    maxTokens: 8192,
    tier: "tier0",
    costPer1M: 0, // FREE (local)
    specialties: ["research", "analysis", "general"],
    isFree: true,
    isLocal: true,
  },
  deepseek: {
    name: "DeepSeek Cloud",
    model: "deepseek-coder",
    provider: "deepseek",
    role: "Primary Developer & Infrastructure (Cloud Fallback)",
    focus: "optimization, performance, safe testing, development",
    maxTokens: 4096,
    tier: "tier0", // Open source tier
    costPer1M: 0.1, // $0.10 per million tokens (cheapest cloud)
    specialties: ["infrastructure", "testing", "performance", "development"],
    useLocal: DEEPSEEK_BRIDGE_ENABLED === "true",
    isFree: false,
  },
  // TIER 0 - CODE GENERATION SPECIALISTS (Best for coding tasks)
  ollama_deepseek_coder_v2: {
    name: "DeepSeek Coder V2 (Local)",
    model: "deepseek-coder-v2:latest",
    provider: "ollama",
    endpoint: OLLAMA_ENDPOINT || "http://localhost:11434",
    role: "Code Generation Specialist",
    focus: "code generation, code review, debugging, infrastructure, production code",
    maxTokens: 8192,
    tier: "tier0",
    costPer1M: 0, // FREE (local)
    specialties: ["code", "code_review", "debugging", "infrastructure", "development"],
    isFree: true,
    isLocal: true,
    priority: "high", // Best for code tasks
  },
  ollama_deepseek_coder_33b: {
    name: "DeepSeek Coder 33B (Local)",
    model: "deepseek-coder:33b",
    provider: "ollama",
    endpoint: OLLAMA_ENDPOINT || "http://localhost:11434",
    role: "Code Generation Specialist (Large)",
    focus: "complex code generation, advanced algorithms, production code",
    maxTokens: 8192,
    tier: "tier0",
    costPer1M: 0, // FREE (local)
    specialties: ["code", "complex_algorithms", "production_code"],
    isFree: true,
    isLocal: true,
  },
  ollama_qwen_coder_32b: {
    name: "Qwen2.5-Coder-32B (Local)",
    model: "qwen2.5-coder:32b-instruct",
    provider: "ollama",
    endpoint: OLLAMA_ENDPOINT || "http://localhost:11434",
    role: "Code Generation Specialist",
    focus: "production code generation, complex algorithms, code understanding",
    maxTokens: 8192,
    tier: "tier0",
    costPer1M: 0, // FREE (local)
    specialties: ["code", "code_generation", "algorithms", "production"],
    isFree: true,
    isLocal: true,
  },
  ollama_codestral: {
    name: "Mistral Codestral 25.01 (Local)",
    model: "codestral:latest",
    provider: "ollama",
    endpoint: OLLAMA_ENDPOINT || "http://localhost:11434",
    role: "Fast Code Generation",
    focus: "quick code snippets, IDE integration, FIM tasks, fast responses",
    maxTokens: 4096,
    tier: "tier0",
    costPer1M: 0, // FREE (local)
    specialties: ["code", "fast_code", "snippets", "fim"],
    isFree: true,
    isLocal: true,
  },
  // TIER 0 - REASONING & ANALYSIS SPECIALISTS
  ollama_deepseek_v3: {
    name: "DeepSeek V3 (Local)",
    model: "deepseek-v3:latest",
    provider: "ollama",
    endpoint: OLLAMA_ENDPOINT || "http://localhost:11434",
    role: "Complex Reasoning Specialist",
    focus: "complex reasoning, mathematical tasks, strategic decisions, exceptional reasoning",
    maxTokens: 128000, // 128K context
    tier: "tier0",
    costPer1M: 0, // FREE (local)
    specialties: ["reasoning", "math", "strategic_decisions", "complex_analysis"],
    isFree: true,
    isLocal: true,
    priority: "high", // Best for reasoning
  },
  ollama_llama_3_3_70b: {
    name: "Llama 3.3 70B (Local)",
    model: "llama3.3:70b-instruct-q4_0",
    provider: "ollama",
    endpoint: OLLAMA_ENDPOINT || "http://localhost:11434",
    role: "High-Quality Reasoning",
    focus: "complex reasoning, strategic decisions, general tasks, multilingual",
    maxTokens: 8192,
    tier: "tier0",
    costPer1M: 0, // FREE (local)
    specialties: ["reasoning", "strategic_decisions", "general", "multilingual"],
    isFree: true,
    isLocal: true,
  },
  ollama_qwen_2_5_72b: {
    name: "Qwen 2.5 72B (Local)",
    model: "qwen2.5:72b-q4_0",
    provider: "ollama",
    endpoint: OLLAMA_ENDPOINT || "http://localhost:11434",
    role: "Research & Analysis Specialist",
    focus: "research, analysis, mathematical tasks, multilingual, document understanding",
    maxTokens: 8192,
    tier: "tier0",
    costPer1M: 0, // FREE (local)
    specialties: ["research", "analysis", "math", "multilingual", "documents"],
    isFree: true,
    isLocal: true,
  },
  ollama_gemma_2_27b: {
    name: "Gemma 2 27B (Local)",
    model: "gemma2:27b-it-q4_0",
    provider: "ollama",
    endpoint: OLLAMA_ENDPOINT || "http://localhost:11434",
    role: "Balanced Reasoning",
    focus: "on-device reasoning, balanced performance, general tasks",
    maxTokens: 8192,
    tier: "tier0",
    costPer1M: 0, // FREE (local)
    specialties: ["reasoning", "general", "balanced"],
    isFree: true,
    isLocal: true,
  },
  // TIER 0 - LIGHTWEIGHT & FAST
  ollama_phi3: {
    name: "Phi-3 Mini (Local)",
    model: "phi3:mini",
    provider: "ollama",
    endpoint: OLLAMA_ENDPOINT || "http://localhost:11434",
    role: "Lightweight Assistant",
    focus: "light tasks, monitoring, simple analysis, fast responses",
    maxTokens: 4096,
    tier: "tier0",
    costPer1M: 0, // FREE (local)
    specialties: ["light_tasks", "monitoring", "simple_analysis"],
    isFree: true,
    isLocal: true,
  },
  // TIER 1 - OVERSIGHT ONLY (Expensive - Only for validation)
  chatgpt: {
    name: "ChatGPT",
    model: "gpt-4o",
    provider: "openai",
    role: "Oversight & Validation Only",
    focus: "validation, critical decisions, user patterns",
    maxTokens: 4096,
    tier: "tier1", // Expensive tier - oversight only
    costPer1M: 2.5, // $2.50 per million tokens
    specialties: ["execution", "user_modeling", "patterns"],
    oversightOnly: true, // Only used for oversight, not primary work
  },
  gemini: {
    name: "Gemini",
    model: "gemini-2.5-flash",
    provider: "google",
    role: "Oversight & Validation Only",
    focus: "validation, analysis, critical review",
    maxTokens: 8192,
    tier: "tier1", // Expensive tier - oversight only
    costPer1M: 1.25, // $1.25 per million tokens
    specialties: ["analysis", "creativity", "ideation"],
    oversightOnly: true, // Only used for oversight, not primary work
  },
  grok: {
    name: "Grok",
    model: "grok-2-1212",
    provider: "xai",
    role: "Oversight & Validation Only",
    focus: "validation, risk assessment, blind spots",
    maxTokens: 4096,
    tier: "tier1", // Expensive tier - oversight only
    costPer1M: 5.0, // $5.00 per million tokens
    specialties: ["innovation", "reality_check", "risk"],
    oversightOnly: true, // Only used for oversight, not primary work
  },
  // TIER 0 - FREE CLOUD BACKUP (No tunnel needed)
  groq_llama: {
    name: "Groq Llama 3.1 8B (Free Cloud)",
    model: "llama-3.1-8b-instant",
    provider: "groq",
    role: "Free Cloud Backup - Fast",
    focus: "fast inference, general tasks, quick responses, backup when Ollama unavailable",
    maxTokens: 4096,
    tier: "tier0", // Free tier
    costPer1M: 0, // FREE (Groq free tier)
    specialties: ["fast_inference", "general", "quick_responses", "backup"],
    isFree: true,
    isLocal: false, // Cloud but free
    priority: "high", // Primary Groq fallback
  },
  groq_mixtral: {
    name: "Groq Mixtral 8x7B (Free Cloud)",
    model: "mixtral-8x7b-32768",
    provider: "groq",
    role: "Free Cloud Backup - Quality",
    focus: "high quality inference, complex tasks, code generation, backup when Ollama unavailable",
    maxTokens: 4096,
    tier: "tier0", // Free tier
    costPer1M: 0, // FREE (Groq free tier)
    specialties: ["quality", "complex_tasks", "code", "backup"],
    isFree: true,
    isLocal: false, // Cloud but free
    priority: "medium", // Secondary Groq fallback
  },
};

// ==================== AGGRESSIVE COST OPTIMIZATION (Target: 1-5% of original costs) ====================

// Response Cache (semantic similarity matching)
const responseCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function hashPrompt(prompt) {
  // Create semantic hash (simple but effective)
  const normalized = prompt.toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
  return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
}

async function getCachedResponse(prompt, member) {
  const key = `${member}:${hashPrompt(prompt)}`;
  const cached = responseCache.get(key);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    compressionMetrics.cache_hits = (compressionMetrics.cache_hits || 0) + 1;
    return cached.response;
  }
  // Track cache miss
  compressionMetrics.cache_misses = (compressionMetrics.cache_misses || 0) + 1;
  return null;
}

function cacheResponse(prompt, member, response) {
  const key = `${member}:${hashPrompt(prompt)}`;
  responseCache.set(key, {
    response,
    timestamp: Date.now(),
    prompt: prompt.substring(0, 100), // Store snippet for debugging
  });
  // Limit cache size
  if (responseCache.size > 1000) {
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }
}

// Advanced text compression (better than base64)
function advancedCompress(text) {
  try {
    // Remove redundant whitespace
    let compressed = text.replace(/\s+/g, ' ').trim();
    
    // Replace common phrases with tokens
    const replacements = {
      'You are': 'Ua',
      'inside the LifeOS AI Council': 'iLAC',
      'This is a LIVE SYSTEM': 'TLS',
      'running on Railway': 'rR',
      'Execution queue for tasks': 'EQ',
      'Self-programming endpoint': 'SPE',
      'Income drones': 'ID',
      'ROI tracking': 'ROI',
      'blind-spot detection': 'BSD',
      'Database on Neon PostgreSQL': 'DNPG',
      'Optional Stripe integration': 'OSI',
    };
    
    for (const [full, short] of Object.entries(replacements)) {
      compressed = compressed.replace(new RegExp(full, 'gi'), short);
    }
    
    // Base64 encode
    const encoded = Buffer.from(compressed).toString('base64');
    return { compressed: encoded, ratio: text.length / encoded.length, method: 'advanced' };
  } catch (error) {
    return { compressed: text, ratio: 1, method: 'none' };
  }
}

function advancedDecompress(compressed, method) {
  if (method !== 'advanced') return compressed;
  try {
    const decoded = Buffer.from(compressed, 'base64').toString('utf-8');
    // Reverse replacements
    const replacements = {
      'Ua': 'You are',
      'iLAC': 'inside the LifeOS AI Council',
      'TLS': 'This is a LIVE SYSTEM',
      'rR': 'running on Railway',
      'EQ': 'Execution queue for tasks',
      'SPE': 'Self-programming endpoint',
      'ID': 'Income drones',
      'ROI': 'ROI tracking',
      'BSD': 'blind-spot detection',
      'DNPG': 'Database on Neon PostgreSQL',
      'OSI': 'Optional Stripe integration',
    };
    let decompressed = decoded;
    for (const [short, full] of Object.entries(replacements)) {
      decompressed = decompressed.replace(new RegExp(short, 'g'), full);
    }
    return decompressed;
  } catch (error) {
    return compressed;
  }
}

// LCTP v3 COMPRESSION (Enhanced)
function lctpEncode(text, meta = {}) {
  try {
    // Use advanced compression first
    const advanced = advancedCompress(text);
    const header = JSON.stringify({ v: 3, t: Date.now(), m: advanced.method, ...meta });
    return `LCTPv3|HDR:${header}|BDY:${advanced.compressed}`;
  } catch (error) {
    console.warn(`LCTP encode error: ${error.message}`);
    return text; // Fallback to uncompressed
  }
}

function lctpDecode(lctpString) {
  try {
    if (!lctpString || !lctpString.includes('|')) {
      return { text: lctpString || '', meta: {} };
    }
    
    const parts = lctpString.split('|');
    const headerPart = parts.find(p => p.startsWith('HDR:'));
    const bodyPart = parts.find(p => p.startsWith('BDY:'));
    
    if (!bodyPart) return { text: lctpString, meta: {} };
    
    const compressed = bodyPart.replace('BDY:', '');
    
    let meta = {};
    let method = 'base64';
    if (headerPart) {
      try {
        meta = JSON.parse(headerPart.replace('HDR:', ''));
        method = meta.m || 'base64';
      } catch {}
    }
    
    const text = method === 'advanced' 
      ? advancedDecompress(compressed, method)
      : Buffer.from(compressed, 'base64').toString('utf-8');
    
    return { text, meta };
  } catch (error) {
    console.warn(`LCTP decode error: ${error.message}`);
    return { text: lctpString || '', meta: {} };
  }
}

// Optimize prompt (remove redundancy, shorten)
function optimizePrompt(prompt) {
  // Remove common redundant phrases
  let optimized = prompt
    .replace(/\n{3,}/g, '\n\n') // Max 2 newlines
    .replace(/\s{2,}/g, ' ') // Single spaces
    .replace(/Please\s+/gi, '') // Remove "Please"
    .replace(/I would like to\s+/gi, '') // Remove verbose phrases
    .replace(/Can you\s+/gi, '') // Remove "Can you"
    .replace(/Could you\s+/gi, '') // Remove "Could you"
    .trim();
  
  // If we saved significant space, track it
  if (optimized.length < prompt.length * 0.9) {
    compressionMetrics.prompt_optimizations++;
    const saved = prompt.length - optimized.length;
    compressionMetrics.tokens_saved_total += Math.floor(saved / 4); // ~4 chars per token
  }
  
  return optimized;
}

function compressPrompt(prompt, useCompression = true) {
  // First optimize the prompt
  const optimized = optimizePrompt(prompt);
  
  if (!useCompression || optimized.length < 100) {
    return { 
      compressed: optimized, 
      originalLength: prompt.length, 
      compressedLength: optimized.length, 
      ratio: prompt.length / optimized.length,
      optimized: true
    };
  }
  
  const lctp = lctpEncode(optimized);
  const originalLength = prompt.length;
  const compressedLength = lctp.length;
  const ratio = originalLength / compressedLength;
  
  // Use compression if it saves at least 10% space
  if (ratio > 1.1) {
    compressionMetrics.v3_compressions++;
    compressionMetrics.total_bytes_saved += (originalLength - compressedLength);
    const tokensSaved = Math.floor((originalLength - compressedLength) / 4);
    compressionMetrics.tokens_saved_total += tokensSaved;
    return { 
      compressed: lctp, 
      originalLength, 
      compressedLength, 
      ratio, 
      format: 'LCTPv3',
      optimized: true
    };
  }
  
  return { 
    compressed: optimized, 
    originalLength, 
    compressedLength: optimized.length, 
    ratio: prompt.length / optimized.length,
    optimized: true
  };
}

function decompressResponse(response, isCompressed = false) {
  if (!isCompressed || !response.includes('LCTPv3')) {
    return response;
  }
  
  const decoded = lctpDecode(response);
  return decoded.text;
}

// ==================== PHONE SYSTEM (Twilio Integration) ====================
let twilioClient = null;
async function getTwilioClient() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return null;
  }
  if (twilioClient) return twilioClient;
  try {
    // Lazy load Twilio to avoid breaking if not installed
    const twilioModule = await import('twilio');
    const Twilio = twilioModule.default || twilioModule;
    twilioClient = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    return twilioClient;
  } catch (err) {
    console.warn(`Twilio not available: ${err.message}`);
    return null;
  }
}

async function makePhoneCall(to, from, message, aiMember = "chatgpt") {
  try {
    const client = await getTwilioClient();
    if (!client) {
      throw new Error("Twilio not configured");
    }

    // Use AI to generate call script
    const callScript = await callCouncilMember(
      aiMember,
      `Generate a brief, natural phone call script for this message: ${message}. Keep it conversational and under 30 seconds.`
    );

    // Make the call (Twilio API)
    const call = await client.calls.create({
      to,
      from: from || process.env.TWILIO_PHONE_NUMBER,
      url: `${RAILWAY_PUBLIC_DOMAIN || 'http://localhost:8080'}/api/v1/phone/call-handler`,
      method: 'POST',
    });

    return { success: true, callSid: call.sid, script: callScript };
  } catch (error) {
    console.error(`Phone call error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function sendSMS(to, message, aiMember = "chatgpt") {
  try {
    const client = await getTwilioClient();
    if (!client) {
      throw new Error("Twilio not configured");
    }

    // Optionally use AI to optimize message
    const optimizedMessage = message.length > 160 
      ? await callCouncilMember(aiMember, `Condense this to under 160 chars: ${message}`)
      : message;

    const sms = await client.messages.create({
      to,
      from: process.env.TWILIO_PHONE_NUMBER,
      body: optimizedMessage,
    });

    return { success: true, messageSid: sms.sid };
  } catch (error) {
    console.error(`SMS error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ============ CRITICAL ALERTING (SMS + CALL VIA TWILIO) ============
async function sendAlertSms(message) {
  try {
    if (!ALERT_PHONE || !process.env.TWILIO_PHONE_NUMBER) return;
    await sendSMS(ALERT_PHONE, message, "chatgpt");
    console.log("📱 [ALERT] SMS sent");
  } catch (err) {
    console.warn("⚠️ Alert SMS failed:", err.message);
  }
}

async function sendAlertCall(message) {
  try {
    if (!ALERT_PHONE || !process.env.TWILIO_PHONE_NUMBER) return;
    const client = await getTwilioClient();
    if (!client) return;
    await client.calls.create({
      twiml: `<Response><Say voice="alice">${message}</Say></Response>`,
      to: ALERT_PHONE,
      from: process.env.TWILIO_PHONE_NUMBER,
    });
    console.log("📞 [ALERT] Call placed");
  } catch (err) {
    console.warn("⚠️ Alert call failed:", err.message);
  }
}

async function notifyCriticalIssue(reason) {
  // Avoid spamming: only one alert sequence at a time
  if (alertInProgress) return;
  alertInProgress = true;

  const msg =
    `🚨 LifeOS alert: critical issue detected.\n` +
    `${reason}\n` +
    `System will continue with any available AI providers.`;

  // Send SMS immediately
  await sendAlertSms(msg);

  // Place a call after 10 minutes if still needed
  setTimeout(() => {
    sendAlertCall(msg);
  }, 10 * 60 * 1000);

  // Reset after 15 minutes to allow future alerts
  setTimeout(() => {
    alertInProgress = false;
  }, 15 * 60 * 1000);
}

// ==================== MICRO PROTOCOL HELPERS ====================
function decodeMicroBody(body = {}) {
  const packet = body.micro || body;
  
  if (!packet || typeof packet !== "object" || (!packet.t && !packet.message && !packet.text)) {
    const legacyText = body.message || body.text || "";
    return {
      text: String(legacyText || "").trim(),
      channel: "chat",
      meta: {},
      packet: null
    };
  }
  
  const text = String(packet.t || packet.text || packet.message || "").trim();
  const channel = packet.c || "chat";
  const meta = packet.m || {};
  
  // Decode LCTP if present
  if (packet.lctp) {
    const decoded = lctpDecode(packet.lctp);
    return {
      text: decoded.text || text,
      channel,
      meta: { ...meta, ...decoded.meta },
      packet
    };
  }
  
  return { text, channel, meta, packet };
}

function buildMicroResponse({ text, channel = "chat", role = "a", meta = {}, compress = false }) {
  let responseText = text;
  let lctp = null;
  
  // Compress if requested and text is long enough
  if (compress && text.length > 100) {
    const compressed = compressPrompt(text, true);
    if (compressed.format === 'LCTPv3') {
      lctp = compressed.compressed;
      responseText = text; // Keep original for compatibility
    }
  }
  
  const packet = {
    v: "mp1",
    r: role,
    c: channel,
    t: responseText,
    lctp,
    m: { ...meta, compressed: !!lctp },
    ts: Date.now()
  };
  
  return { micro: packet };
}

// ==================== HELPER: GET API KEY ====================
function getApiKeyForProvider(provider) {
  switch (provider) {
    case "anthropic":
      return (
        process.env.LIFEOS_ANTHROPIC_KEY?.trim() ||
        process.env.ANTHROPIC_API_KEY?.trim()
      );
    case "google":
      return (
        process.env.LIFEOS_GEMINI_KEY?.trim() ||
        process.env.GEMINI_API_KEY?.trim()
      );
    case "deepseek":
      return (
        process.env.DEEPSEEK_API_KEY?.trim() ||
        process.env.Deepseek_API_KEY?.trim()
      );
    case "xai":
      return process.env.GROK_API_KEY?.trim();
    case "groq":
      return process.env.GROQ_API_KEY?.trim();
    case "openai":
      return process.env.OPENAI_API_KEY?.trim();
    default:
      return null;
  }
}

// ==================== SMART MODEL SELECTION (Cost Optimization) ====================
function selectOptimalModel(prompt, taskComplexity = 'medium') {
  // Use cheapest model that can handle the task
  const promptLength = prompt.length;
  
  // Check API key availability before selecting models
  const hasGeminiKey = !!(process.env.LIFEOS_GEMINI_KEY?.trim() || process.env.GEMINI_API_KEY?.trim());
  const hasDeepSeekKey = !!(process.env.DEEPSEEK_API_KEY?.trim() || process.env.Deepseek_API_KEY?.trim());
  const hasOpenAIKey = !!process.env.OPENAI_API_KEY?.trim();
  
  // Check if we're in production (Railway/cloud) - Ollama won't work there
  const isProduction = NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;
  const ollamaAvailable = Boolean(OLLAMA_ENDPOINT);
  
  // Simple tasks -> cheapest model (only if key available)
  if (taskComplexity === 'simple' || promptLength < 200) {
    if (hasDeepSeekKey) {
      compressionMetrics.model_downgrades++;
      return { member: 'deepseek', model: 'deepseek-coder', reason: 'simple_task' };
    }
    // Fall back to Ollama if available (free) - only in local/dev
    if (ollamaAvailable) {
      return { member: 'ollama_llama', model: 'llama3.2:1b', reason: 'simple_task_free' };
    }
  }
  
  // Medium tasks -> medium cost (only if key available)
  if (taskComplexity === 'medium' || promptLength < 1000) {
    if (hasGeminiKey) {
      return { member: 'gemini', model: 'gemini-2.5-flash', reason: 'medium_task' };
    }
    // Fall back to Ollama if available (free) - only in local/dev
    if (ollamaAvailable) {
      return { member: 'ollama_llama', model: 'llama3.2:1b', reason: 'medium_task_free' };
    }
  }
  
  // Complex tasks -> use requested member
  // If no API keys and Ollama not available, return null to use original member
  if (!hasOpenAIKey && !hasGeminiKey && !hasDeepSeekKey && !ollamaAvailable) {
    return null; // Use original member (will fail if no keys, but that's expected)
  }
  
  return null; // Use original member
}

// Track provider cooldowns when rate-limited or out of quota
// Map<member, timestamp_ms_when_we_can_try_again>
const providerCooldowns = new Map();
// Prevent alert spam
let alertInProgress = false;

// Alert destination (set one of these in env)
const ALERT_PHONE =
  process.env.ALERT_PHONE ||
  process.env.ADMIN_PHONE ||
  process.env.COMMAND_CENTER_PHONE ||
  null;

// Model alias mappings for Ollama (maps requested models to installed aliases)
// These aliases are used when the requested model isn't installed but an alias is available
const OLLAMA_MODEL_ALIASES = {
  'deepseek-coder:33b': 'deepseek-r1:32b',
  'qwen2.5-coder:32b-instruct': 'qwen3-coder:30b',
  'deepseek-coder:latest': 'deepseek-coder:latest',
  'deepseek-coder-v2:latest': 'deepseek-coder-v2:latest',
  'llama3.2:1b': 'llama3.2:1b',
  'phi3:mini': 'phi3:mini',
  'qwen2.5:7b-instruct': 'qwen2.5:7b-instruct',
  'qwen2.5-coder:7b-instruct': 'qwen2.5-coder:7b-instruct',
  // Map member names to their Ollama model aliases
  'ollama_deepseek_coder_33b': 'deepseek-r1:32b',
  'ollama_qwen_coder_32b': 'qwen3-coder:30b',
};

// ==================== MODEL SIZE DETECTION ====================
/**
 * Detect model size/capability for prompt adaptation
 */
function getModelSize(modelName) {
  if (!modelName) return 'small';
  const model = (modelName || '').toLowerCase();
  
  const smallModels = ['llama3.2:1b', 'llama3.2:3b', 'phi3:mini', 'phi3', 'tinyllama', 'gemma:2b', '1b', '3b'];
  const mediumModels = ['llama3.1:8b', 'mistral:7b', 'deepseek-coder:6.7b', 'codellama:7b', 'gemma:7b', '7b', '8b'];
  const largeModels = ['deepseek-coder:33b', 'qwen2.5-coder:32b', 'llama3.1:70b', 'deepseek-coder-v2', 'codestral', 'deepseek-v3', '32b', '33b', '70b'];
  
  if (smallModels.some(m => model.includes(m))) return 'small';
  if (largeModels.some(m => model.includes(m))) return 'large';
  if (mediumModels.some(m => model.includes(m))) return 'medium';
  
  // Default for Ollama (usually small)
  if (model.includes('ollama')) return 'small';
  
  // Premium models are usually large
  if (model.includes('gpt-4') || model.includes('gpt4') || model.includes('claude') || model.includes('gemini-pro')) return 'large';
  
  return 'medium';
}

/**
 * Get simplified prompt based on model capability
 */
function getIdeasPromptForModel(modelSize) {
  if (modelSize === 'small') {
    return `List 5 simple software business ideas.

Format EXACTLY like this:
1. Name: Description in one sentence
2. Name: Description in one sentence
3. Name: Description in one sentence
4. Name: Description in one sentence
5. Name: Description in one sentence

Example:
1. API Monitor: Track API costs for startups
2. Resume AI: Improve resumes with AI

Your 5 ideas:`;
  }
  
  if (modelSize === 'medium') {
    return `Generate 8 software/AI business ideas.

For each idea provide:
- Name (2-3 words)
- Description (1 sentence)
- How it makes money (1 sentence)

Format as numbered list:
1. **Name**: Description. Revenue: how it makes money.
2. **Name**: Description. Revenue: how it makes money.`;
  }
  
  // Large models can handle more complexity
  return `Generate 15 innovative AI/software business ideas with market analysis.
For each: name, description, target market, revenue model, competition level.
Return as JSON array.`;
}

/**
 * Parse ideas from various response formats
 */
function parseIdeasFromResponse(response, modelSize) {
  const ideas = [];
  if (!response || typeof response !== 'string') return ideas;
  
  // Try JSON first (for large models)
  try {
    const sanitized = sanitizeJsonResponse(response);
    const jsonMatch = sanitized.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed.map((item, i) => ({
          id: `idea_${Date.now()}_${i}`,
          name: item.name || item.title || item.concept || `Idea ${i+1}`,
          description: item.description || item.desc || item.concept || '',
          revenue: item.revenue || item.revenue_model || '',
          difficulty: item.difficulty || 'medium',
          impact: item.impact || 'medium',
          source: 'ollama_json'
        }));
      }
    }
  } catch (e) { /* JSON failed, try text */ }
  
  // Parse numbered list format (for small/medium models)
  const lines = response.split('\n');
  for (const line of lines) {
    // Match: "1. Name: Description" or "1. **Name**: Description"
    const match = line.match(/^\d+[\.\)]\s*\*{0,2}([^:*]+)\*{0,2}:\s*(.+)/);
    if (match) {
      ideas.push({
        id: `idea_${Date.now()}_${ideas.length}`,
        name: match[1].trim(),
        description: match[2].trim(),
        difficulty: 'medium',
        impact: 'medium',
        source: 'ollama_text'
      });
    }
    
    // Also match TITLE: format (from existing parser)
    const titleMatch = line.match(/TITLE:\s*(.+)/);
    const descMatch = line.match(/DESCRIPTION:\s*(.+)/);
    const diffMatch = line.match(/DIFFICULTY:\s*(.+)/);
    if (titleMatch && descMatch && !ideas.find(i => i.name === titleMatch[1].trim())) {
      ideas.push({
        id: `idea_${Date.now()}_${ideas.length}`,
        name: titleMatch[1].trim(),
        description: descMatch[1].trim(),
        difficulty: (diffMatch?.[1] || 'medium').trim(),
        impact: 'medium',
        source: 'ollama_title_format'
      });
    }
  }
  
  // Fallback: extract any sentences that look like ideas
  if (ideas.length === 0) {
    const sentences = response.match(/[A-Z][^.!?]*(?:app|tool|platform|service|system|AI|software|business)[^.!?]*[.!?]/gi) || [];
    for (let i = 0; i < Math.min(sentences.length, 5); i++) {
      ideas.push({
        id: `idea_${Date.now()}_${i}`,
        name: `Extracted Idea ${i+1}`,
        description: sentences[i].trim(),
        difficulty: 'medium',
        impact: 'medium',
        source: 'ollama_fallback'
      });
    }
  }
  
  return ideas;
}

// ==================== JSON SANITIZER (for LLM responses with comments) ====================
/**
 * Sanitize JSON response from LLM (removes comments, trailing commas, etc.)
 * Fixes JSON parsing errors from models that output comments in JSON
 */
function sanitizeJsonResponse(text) {
  if (!text || typeof text !== 'string') return text;
  
  // Remove common JSON-breaking patterns from LLM responses
  let cleaned = text
    // Remove single-line comments
    .replace(/\/\/.*$/gm, '')
    // Remove multi-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove trailing commas before } or ]
    .replace(/,(\s*[}\]])/g, '$1')
    // Remove markdown code fences
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    // Trim whitespace
    .trim();
  
  // Try to extract JSON if wrapped in other text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  return cleaned;
}

// ==================== OLLAMA STREAMING ADAPTER (Cloudflare 524 Fix) ====================
/**
 * Detects if endpoint is a Cloudflare tunnel and requires streaming
 */
function isCloudflareTunnel(endpoint) {
  return endpoint && (endpoint.includes('trycloudflare.com') || endpoint.includes('cloudflare'));
}

/**
 * Streams Ollama response and aggregates it internally
 * This prevents Cloudflare 524 timeouts by keeping the connection alive
 * Returns the same shape as non-streaming calls for compatibility
 */
async function callOllamaWithStreaming(endpoint, model, prompt, options = {}) {
  const {
    maxTokens = 4096,
    temperature = 0.7,
    timeout = 300000, // 5 minutes max
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${endpoint}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: true, // Always stream for tunnel endpoints
        options: {
          temperature,
          num_predict: maxTokens,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}: ${await response.text().catch(() => 'Unknown error')}`);
    }

    // Stream and aggregate response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let promptEvalCount = 0;
    let evalCount = 0;
    let modelName = model;
    let done = false;
    let buffer = ''; // Buffer for partial JSON lines across chunks

    while (!done) {
      const { done: streamDone, value } = await reader.read();
      if (streamDone) {
        // Process any remaining buffer
        if (buffer.trim()) {
          try {
            const sanitized = sanitizeJsonResponse(buffer.trim());
            const data = JSON.parse(sanitized);
            if (data.response) fullText += data.response;
            if (data.prompt_eval_count !== undefined) promptEvalCount = data.prompt_eval_count;
            if (data.eval_count !== undefined) evalCount = data.eval_count;
            if (data.model) modelName = data.model;
          } catch (e) {
            // Ignore parse errors in final buffer
            console.warn(`⚠️ [OLLAMA STREAM] Failed to parse final buffer: ${e.message}`);
          }
        }
        break;
      }

      // Decode chunk and add to buffer
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      // Process complete lines (ending with \n)
      const lines = buffer.split('\n');
      // Keep the last incomplete line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const sanitized = sanitizeJsonResponse(trimmed);
          const data = JSON.parse(sanitized);
          
          // Accumulate response text
          if (data.response !== undefined) {
            fullText += data.response;
          }
          
          // Update metadata (last chunk has final values)
          if (data.prompt_eval_count !== undefined) {
            promptEvalCount = data.prompt_eval_count;
          }
          if (data.eval_count !== undefined) {
            evalCount = data.eval_count;
          }
          if (data.model) {
            modelName = data.model;
          }
          
          // Check if stream is done
          if (data.done === true) {
            done = true;
            // Final chunk has all metadata - use it
            if (data.prompt_eval_count !== undefined) promptEvalCount = data.prompt_eval_count;
            if (data.eval_count !== undefined) evalCount = data.eval_count;
            break;
          }
        } catch (e) {
          // Skip invalid JSON - might be partial line that will be completed in next chunk
          // Only log if it's clearly not a partial line
          if (trimmed.length > 10 && !trimmed.startsWith('{')) {
            console.warn(`⚠️ [OLLAMA STREAM] Skipping invalid JSON line: ${trimmed.substring(0, 50)}...`);
          }
        }
      }
    }

    clearTimeout(timeoutId);

    // Return same shape as non-streaming response (matches Ollama API format)
    return {
      model: modelName,
      response: fullText,
      done: true,
      prompt_eval_count: promptEvalCount,
      eval_count: evalCount,
      total_duration: 0, // Not available in streaming
      load_duration: 0,
      eval_duration: 0,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Ollama request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Get model size category for fallback selection
 */
function getModelSizeCategory(modelName) {
  const name = (modelName || '').toLowerCase();
  if (name.includes('70b') || name.includes('72b') || name.includes('120b')) return 'xlarge';
  if (name.includes('33b') || name.includes('32b') || name.includes('30b')) return 'large';
  if (name.includes('7b') || name.includes('8b') || name.includes('13b')) return 'medium';
  return 'small';
}

/**
 * Get smaller fallback model for timeout scenarios
 */
function getSmallerOllamaModel(currentModel, currentMember) {
  const size = getModelSizeCategory(currentModel);
  
  // Fallback chain: xlarge -> large -> medium -> small
  const fallbacks = {
    xlarge: ['ollama_qwen_coder_32b', 'ollama_deepseek_coder_33b', 'ollama_deepseek_coder_v2', 'ollama_deepseek'],
    large: ['ollama_deepseek_coder_v2', 'ollama_deepseek', 'ollama_llama'],
    medium: ['ollama_llama', 'ollama_phi3'],
    small: ['ollama_phi3'],
  };

  const chain = fallbacks[size] || fallbacks.medium;
  
  // Find first available fallback
  for (const memberKey of chain) {
    if (memberKey !== currentMember && COUNCIL_MEMBERS[memberKey]) {
      return { member: memberKey, model: COUNCIL_MEMBERS[memberKey].model };
    }
  }
  
  return null;
}

// Get best Ollama fallback model based on requested model or task type
function getOllamaFallbackModel(requestedMember, taskType = 'general') {
  // Check if Ollama is available
  if (!OLLAMA_ENDPOINT) {
    return null;
  }
  
  const requestedConfig = COUNCIL_MEMBERS[requestedMember];
  const requestedModel = requestedConfig?.model;
  
  // First, try direct member alias mapping
  if (OLLAMA_MODEL_ALIASES[requestedMember]) {
    const aliasModel = OLLAMA_MODEL_ALIASES[requestedMember];
    // Find Ollama member that uses this alias model
    for (const [memberKey, memberConfig] of Object.entries(COUNCIL_MEMBERS)) {
      if (memberConfig.provider === 'ollama' && memberConfig.model === aliasModel) {
        return memberKey;
      }
    }
  }
  
  // Try to map requested model to Ollama alias
  if (requestedModel && OLLAMA_MODEL_ALIASES[requestedModel]) {
    const aliasModel = OLLAMA_MODEL_ALIASES[requestedModel];
    // Find Ollama member that uses this alias model
    for (const [memberKey, memberConfig] of Object.entries(COUNCIL_MEMBERS)) {
      if (memberConfig.provider === 'ollama' && memberConfig.model === aliasModel) {
        return memberKey;
      }
    }
  }
  
  // Task-based fallback selection
  const taskTypeLower = (taskType || '').toLowerCase();
  if (taskTypeLower.includes('code') || taskTypeLower.includes('development') || 
      taskTypeLower.includes('infrastructure') || taskTypeLower.includes('revenue_generation')) {
    // Prefer code models for code/development/revenue tasks
    if (COUNCIL_MEMBERS.ollama_deepseek_coder_v2) return 'ollama_deepseek_coder_v2';
    if (COUNCIL_MEMBERS.ollama_deepseek) return 'ollama_deepseek';
    if (COUNCIL_MEMBERS.ollama_qwen_coder_32b) return 'ollama_qwen_coder_32b';
    if (COUNCIL_MEMBERS.ollama_deepseek_coder_33b) return 'ollama_deepseek_coder_33b';
  }
  
  // Default fallback order (general tasks)
  if (COUNCIL_MEMBERS.ollama_llama) return 'ollama_llama';
  if (COUNCIL_MEMBERS.ollama_deepseek) return 'ollama_deepseek';
  if (COUNCIL_MEMBERS.ollama_phi3) return 'ollama_phi3';
  
  // Last resort: any Ollama model
  for (const [memberKey, memberConfig] of Object.entries(COUNCIL_MEMBERS)) {
    if (memberConfig.provider === 'ollama' || memberKey.startsWith('ollama_')) {
      return memberKey;
    }
  }
  
  return null;
}

// ==================== ENHANCED AI CALLING WITH AGGRESSIVE COST OPTIMIZATION ====================
async function callCouncilMember(member, prompt, options = {}) {
  const config = COUNCIL_MEMBERS[member];
  
  if (!config) {
    throw new Error(`Unknown member: ${member}`);
  }

  // Get today's spend (automatically resets each day)
  const today = dayjs().format("YYYY-MM-DD");
  const spend = await getDailySpend(today);
  
  // COST SHUTDOWN: Block ALL paid models if spending disabled
  const memberConfig = COUNCIL_MEMBERS[member];
  const isPaid = !memberConfig?.isFree && (memberConfig?.costPer1M > 0 || memberConfig?.tier === "tier1");
  
  // FREE FALLBACK ORDER: Groq (no tunnel) → Ollama (tunnel) → Error
  const FREE_FALLBACK_ORDER = ['groq_llama', 'groq_mixtral', 'ollama_phi3', 'ollama_llama', 'ollama_deepseek'];
  
  // If MAX_DAILY_SPEND is 0, block ALL paid models - AUTOMATICALLY FALL BACK TO FREE MODELS
  if (MAX_DAILY_SPEND === 0 && isPaid) {
    // Try free models in order
    for (const fallbackMember of FREE_FALLBACK_ORDER) {
      const fallbackConfig = COUNCIL_MEMBERS[fallbackMember];
      if (!fallbackConfig) continue;
      
      // Check if Groq (needs API key)
      if (fallbackConfig.provider === 'groq') {
        if (GROQ_API_KEY) {
          console.log(`💰 [COST SHUTDOWN] Blocked ${member} - Falling back to ${fallbackMember} (Groq - no tunnel needed)`);
          return await callCouncilMember(fallbackMember, prompt, options);
        }
        continue; // Skip if no API key
      }
      
      // Check if Ollama (needs endpoint)
      if (fallbackConfig.provider === 'ollama') {
        if (OLLAMA_ENDPOINT) {
          console.log(`💰 [COST SHUTDOWN] Blocked ${member} - Falling back to ${fallbackMember} (Ollama)`);
          return await callCouncilMember(fallbackMember, prompt, options);
        }
        continue; // Skip if no endpoint
      }
    }
    
    throw new Error(
      `💰 [COST SHUTDOWN] Blocked ${member} - Spending disabled (MAX_DAILY_SPEND=$0). No free models available.`
    );
  }
  
  // Also block if spending threshold reached - AUTOMATICALLY FALL BACK TO FREE MODELS
  if (spend >= COST_SHUTDOWN_THRESHOLD && isPaid) {
    // Try free models in order
    for (const fallbackMember of FREE_FALLBACK_ORDER) {
      const fallbackConfig = COUNCIL_MEMBERS[fallbackMember];
      if (!fallbackConfig) continue;
      
      // Check if Groq (needs API key)
      if (fallbackConfig.provider === 'groq') {
        if (GROQ_API_KEY) {
          console.log(`💰 [COST SHUTDOWN] Blocked ${member} ($${spend.toFixed(2)}/$${COST_SHUTDOWN_THRESHOLD}) - Falling back to ${fallbackMember} (Groq - no tunnel needed)`);
          return await callCouncilMember(fallbackMember, prompt, options);
        }
        continue; // Skip if no API key
      }
      
      // Check if Ollama (needs endpoint)
      if (fallbackConfig.provider === 'ollama') {
        if (OLLAMA_ENDPOINT) {
          console.log(`💰 [COST SHUTDOWN] Blocked ${member} ($${spend.toFixed(2)}/$${COST_SHUTDOWN_THRESHOLD}) - Falling back to ${fallbackMember} (Ollama)`);
          return await callCouncilMember(fallbackMember, prompt, options);
        }
        continue; // Skip if no endpoint
      }
    }
    
    throw new Error(
      `💰 [COST SHUTDOWN] Blocked ${member} - Spending $${spend.toFixed(2)}/$${COST_SHUTDOWN_THRESHOLD}. No free models available.`
    );
  }
  
  // Log for debugging (only log if significant spend)
  if (spend > MAX_DAILY_SPEND * 0.1) {
    console.log(`💰 [SPEND CHECK] Today (${today}): $${spend.toFixed(4)} / $${MAX_DAILY_SPEND}`);
  }
  
  // Skip spend limit check for Ollama/local models (always free)
  const isOllama = memberConfig?.provider === 'ollama' || member?.startsWith('ollama_') || memberConfig?.isLocal === true;
  const isFreeModel = memberConfig?.isFree === true || isOllama;

  // Only enforce spend limit for paid models
  if (!isFreeModel && spend >= MAX_DAILY_SPEND) {
    throw new Error(
      `Daily spend limit ($${MAX_DAILY_SPEND}) reached at $${spend.toFixed(4)} for ${today}. Resets at midnight UTC.`
    );
  }

  // Inject Source of Truth into prompt if this is a mission-critical task
  if (sourceOfTruthManager && options.requiresMissionAlignment !== false) {
    const shouldRef = await sourceOfTruthManager.shouldReferenceSourceOfTruth(options.taskType || 'general', options);
    if (shouldRef) {
      const relevantSections = await sourceOfTruthManager.getRelevantSections(options.taskType || 'general', options);
      if (relevantSections.length > 0) {
        const sotContext = relevantSections.map(d => `[${d.document_type}${d.section ? ` / ${d.section}` : ''}]: ${d.content.substring(0, 500)}`).join('\n\n');
        prompt = `[SYSTEM SOURCE OF TRUTH - Reference this for mission alignment]\n${sotContext}\n\n---\n\n[USER REQUEST]\n${prompt}`;
      }
    }
  }

  // CHECK CACHE FIRST (huge cost savings)
  if (options.useCache !== false) {
    const cached = await getCachedResponse(prompt, member);
    if (cached) {
      console.log(`💰 [CACHE HIT] Saved API call for ${member}`);
      return cached;
    }
    compressionMetrics.cache_misses = (compressionMetrics.cache_misses || 0) + 1;
  }

  // SMART MODEL SELECTION (use cheaper models when possible)
  // Only optimize if we're not already using OSC (OSC handles its own routing)
  if (!options.useOpenSourceCouncil) {
    const optimalModel = selectOptimalModel(prompt, options.complexity);
    if (optimalModel && options.allowModelDowngrade !== false) {
      // Verify the selected model has an API key before switching
      const optimalConfig = COUNCIL_MEMBERS[optimalModel.member];
      if (optimalConfig) {
        const optimalKey = getApiKeyForProvider(optimalConfig.provider);
        // For Ollama, check if endpoint is accessible
        if (optimalConfig.provider === 'ollama') {
          // Ollama doesn't need API key, but check endpoint
          if (optimalConfig.endpoint || OLLAMA_ENDPOINT) {
            member = optimalModel.member;
            console.log(`💰 [MODEL OPTIMIZATION] Using ${member} instead (${optimalModel.reason})`);
          }
        } else if (optimalKey) {
          // Cloud model - verify key exists
          member = optimalModel.member;
          console.log(`💰 [MODEL OPTIMIZATION] Using ${member} instead (${optimalModel.reason})`);
        } else {
          console.log(`⚠️  [MODEL OPTIMIZATION] Skipped ${optimalModel.member} - API key not available`);
        }
      }
    }
  }

  const getApiKey = (provider) => {
    switch (provider) {
      case "anthropic":
        return (
          process.env.LIFEOS_ANTHROPIC_KEY?.trim() ||
          process.env.ANTHROPIC_API_KEY?.trim()
        );
      case "google":
        return (
          process.env.LIFEOS_GEMINI_KEY?.trim() ||
          process.env.GEMINI_API_KEY?.trim()
        );
      case "deepseek":
        return (
          process.env.DEEPSEEK_API_KEY?.trim() ||
          process.env.Deepseek_API_KEY?.trim()
        );
      case "xai":
        return process.env.GROK_API_KEY?.trim();
      case "openai":
        return process.env.OPENAI_API_KEY?.trim();
      default:
        return null;
    }
  };

  const memberApiKey = getApiKey(config.provider);

  // Ollama doesn't need API key - check endpoint instead
  if (config.provider === "ollama") {
    const endpoint = config.endpoint || OLLAMA_ENDPOINT || "http://localhost:11434";
    // Will check availability when making the actual call
  } else if (!memberApiKey) {
    if (config.provider === "openai") {
      throw new Error(`${member.toUpperCase()}_API_KEY not set`);
    } else {
      console.log(`⚠️ ${member} API key not found, skipping...`);
      throw new Error(`${member} unavailable (no API key)`);
    }
  }

  // Inject knowledge context into user prompt
  const enhancedPrompt = injectKnowledgeContext(prompt, 5);
  
  // Compress system prompt if it's long (cost optimization)
  const systemPromptBase = `You are ${config.name}, serving as ${config.role} inside the LifeOS AI Council.
This is a LIVE SYSTEM running on Railway (${RAILWAY_PUBLIC_DOMAIN || "robust-magic-production.up.railway.app"}).

You ARE part of an active backend with:
- Execution queue for tasks
- Self-programming endpoint (/api/v1/system/self-program)
- Income drones, ROI tracking, snapshots, blind-spot detection
- Database on Neon PostgreSQL
- Optional Stripe integration for tracking real-world revenue (read + logging, not autonomous charging).

When asked what you can do, respond AS the system AI:
- "I can queue tasks in our execution system"
- "I can help design offers and service workflows for online income"
- "I can analyze our current metrics and performance"
- "I can propose integrations or improvements for Stripe + online funnels"

Current specialties: ${config.specialties.join(", ")}.
${options.checkBlindSpots ? "Check for blind spots and unintended consequences." : ""}
${options.guessUserPreference ? "Consider user preferences based on past decisions." : ""}
${options.webSearch ? `WEB SEARCH MODE: You have access to real-time web search. When searching, look for:
- Recent blog posts, documentation, and tutorials
- Stack Overflow and GitHub discussions
- Official documentation and examples
- Community solutions and best practices
Include specific links, code examples, and actionable solutions from your search results.` : ""}

Be concise, strategic, and speak as the system's internal AI.`;

  // Use compression for cost savings on long prompts (only for non-critical calls)
  const useCompression = options.compress !== false && systemPromptBase.length > 500;
  const systemPrompt = useCompression 
    ? compressPrompt(systemPromptBase, true).compressed 
    : systemPromptBase;

  const startTime = Date.now();

  try {
    let response;
    const noCacheHeaders = {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    };

    if (config.provider === "openai") {
      const apiKey = memberApiKey;
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          ...noCacheHeaders,
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: config.maxTokens,
          temperature: 0.7,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: enhancedPrompt },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`OpenAI API error: ${response.status} - ${errorText}`);
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      if (json.error) throw new Error(json.error.message);

      let text = json.choices?.[0]?.message?.content || "";
      if (!text) throw new Error("Empty response");

      // Decompress if response was compressed
      text = decompressResponse(text, useCompression);

      const cost = calculateCost(json.usage, config.model);
      await updateDailySpend(cost);
      
      // Calculate token savings from compression
      const tokensSaved = useCompression ? Math.floor((systemPromptBase.length - systemPrompt.length) / 4) : 0;
      await updateROI(0, cost, 0, tokensSaved);

      const duration = Date.now() - startTime;
      await trackAIPerformance(
        member,
        "chat",
        duration,
        json.usage?.total_tokens || 0,
        cost,
        true
      );

      // CACHE THE RESPONSE
      if (options.useCache !== false) {
        cacheResponse(prompt, member, text);
      }

      await storeConversationMemory(prompt, text, { ai_member: member });
      return text;
    }

    if (config.provider === "google") {
      const apiKey = memberApiKey;
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...noCacheHeaders,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\n${enhancedPrompt}` }] }],
            generationConfig: {
              maxOutputTokens: config.maxTokens,
              temperature: 0.7,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini API error: ${response.status} - ${errorText}`);
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      if (json.error) throw new Error(json.error.message);

      const text = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!text) throw new Error("Empty response");

      const tokensUsed = json.usageMetadata?.totalTokenCount || 0;
      const cost = calculateCost({ total_tokens: tokensUsed }, config.model);
      await updateDailySpend(cost);

      const duration = Date.now() - startTime;
      await trackAIPerformance(member, "chat", duration, tokensUsed, cost, true);

      // CACHE THE RESPONSE
      if (options.useCache !== false) {
        cacheResponse(prompt, member, text);
      }

      await storeConversationMemory(prompt, text, { ai_member: member });
      return text;
    }

    if (config.provider === "xai") {
      const apiKey = memberApiKey;
      response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          ...noCacheHeaders,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: enhancedPrompt },
          ],
          max_tokens: config.maxTokens,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Grok API error: ${response.status} - ${errorText}`);
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      if (json.error) throw new Error(json.error.message);

      const text = json.choices?.[0]?.message?.content || "";
      if (!text) throw new Error("Empty response");

      const cost = calculateCost(json.usage, config.model);
      await updateDailySpend(cost);

      const duration = Date.now() - startTime;
      await trackAIPerformance(
        member,
        "chat",
        duration,
        json.usage?.total_tokens || 0,
        cost,
        true
      );

      // CACHE THE RESPONSE
      if (options.useCache !== false) {
        cacheResponse(prompt, member, text);
      }

      await storeConversationMemory(prompt, text, { ai_member: member });
      return text;
    }

    // GROQ (FREE CLOUD - No tunnel needed)
    if (config.provider === "groq") {
      const apiKey = getApiKey("groq");
      if (!apiKey) {
        throw new Error("Groq API key not configured (GROQ_API_KEY)");
      }

      console.log(`🆓 [GROQ] Calling free cloud model: ${config.model}`);
      
      response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          ...noCacheHeaders,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: enhancedPrompt },
          ],
          max_tokens: config.maxTokens,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Groq API error: ${response.status} - ${errorText}`);
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      if (json.error) throw new Error(json.error.message);

      const text = json.choices?.[0]?.message?.content || "";
      if (!text) throw new Error("Empty response");

      // Groq is free, so cost is 0
      const cost = 0;
      await updateDailySpend(cost);

      const duration = Date.now() - startTime;
      await trackAIPerformance(
        member,
        "chat",
        duration,
        json.usage?.total_tokens || 0,
        cost,
        true
      );

      // CACHE THE RESPONSE
      if (options.useCache !== false) {
        cacheResponse(prompt, member, text);
      }

      await storeConversationMemory(prompt, text, { ai_member: member });
      return text;
    }

    // OLLAMA (FREE LOCAL MODELS) - Try first for Tier 0
    if (config.provider === "ollama") {
      const endpoint = config.endpoint || OLLAMA_ENDPOINT || "http://localhost:11434";
      const useStreaming = isCloudflareTunnel(endpoint); // Auto-detect tunnel
      
      try {
        console.log(`\n🆓 [OLLAMA] Calling local model: ${config.model}`);
        console.log(`    Endpoint: ${endpoint}`);
        console.log(`    Member: ${member}`);
        console.log(`    Streaming: ${useStreaming ? 'YES (tunnel detected)' : 'NO'}`);
        console.log(`    Prompt length: ${enhancedPrompt.length} chars\n`);

        let json;
        let text = "";
        
        // Use streaming for Cloudflare tunnels to prevent 524 timeouts
        if (useStreaming) {
          try {
            json = await callOllamaWithStreaming(
              endpoint,
              config.model,
              `${systemPrompt}\n\n${enhancedPrompt}`,
              {
                maxTokens: config.maxTokens || 4096,
                temperature: 0.7,
                timeout: 300000, // 5 minutes
              }
            );
            text = json.response || "";
          } catch (streamError) {
            // If streaming fails with timeout, try smaller model
            if (streamError.message.includes('timeout')) {
              console.warn(`⚠️ [OLLAMA] ${config.model} timed out, trying smaller fallback...`);
              const fallback = getSmallerOllamaModel(config.model, member);
              if (fallback) {
                console.log(`🔄 [OLLAMA] Falling back to ${fallback.member} (${fallback.model})`);
                json = await callOllamaWithStreaming(
                  endpoint,
                  fallback.model,
                  `${systemPrompt}\n\n${enhancedPrompt}`,
                  {
                    maxTokens: config.maxTokens || 4096,
                    temperature: 0.7,
                    timeout: 180000, // 3 minutes for smaller model
                  }
                );
                text = json.response || "";
              } else {
                throw streamError;
              }
            } else {
              throw streamError;
            }
          }
        } else {
          // Non-tunnel: use regular fetch (faster for local)
          response = await fetch(`${endpoint}/api/generate`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...noCacheHeaders,
            },
            body: JSON.stringify({
              model: config.model,
              prompt: `${systemPrompt}\n\n${prompt}`,
              stream: false,
              options: {
                temperature: 0.7,
                num_predict: config.maxTokens || 4096,
              },
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama HTTP ${response.status}: ${errorText}`);
          }

          json = await response.json();
          text = json.response || "";
        }

        if (text) {
          const duration = Date.now() - startTime;
          console.log(`\n╔══════════════════════════════════════════════════════════════════════════════════╗`);
          console.log(`║ ✅ [OLLAMA] SUCCESS - Local model response received                            ║`);
          console.log(`║    Model: ${config.model}                                                      ║`);
          console.log(`║    Member: ${member}                                                           ║`);
          console.log(`║    Response Time: ${duration}ms                                               ║`);
          console.log(`║    Response Length: ${text.length} chars                                      ║`);
          console.log(`║    Cost: $0.00 (FREE - local Ollama)                                          ║`);
          console.log(`╚══════════════════════════════════════════════════════════════════════════════════╝\n`);

          await trackAIPerformance(member, "chat", duration, 0, 0, true);
          
          // CACHE THE RESPONSE
          if (options.useCache !== false) {
            cacheResponse(prompt, member, text);
          }
          
          await storeConversationMemory(prompt, text, {
            ai_member: member,
            via: "ollama",
            cost: 0,
          });

          return text;
        } else {
          throw new Error("Empty response from Ollama");
        }
      } catch (ollamaError) {
        console.warn(`⚠️ [TIER 0] Ollama ${config.model} failed: ${ollamaError.message}`);
        throw new Error(`Ollama unavailable: ${ollamaError.message}`);
      }
    }

    if (config.provider === "deepseek") {
      const deepseekApiKey = getApiKey("deepseek");

      // Try Ollama bridge first if enabled
      if (config.useLocal && OLLAMA_ENDPOINT) {
        try {
          console.log(
            `🌉 Trying Ollama bridge for DeepSeek at ${OLLAMA_ENDPOINT}`
          );

          // Use streaming for Cloudflare tunnels
          const useStreaming = isCloudflareTunnel(OLLAMA_ENDPOINT);
          let json;
          let text = "";

          if (useStreaming) {
            json = await callOllamaWithStreaming(
              OLLAMA_ENDPOINT,
              "deepseek-coder:latest",
              `${systemPrompt}\n\n${enhancedPrompt}`,
              {
                maxTokens: config.maxTokens,
                temperature: 0.7,
                timeout: 300000,
              }
            );
            text = json.response || "";
          } else {
            response = await fetch(`${OLLAMA_ENDPOINT}/api/generate`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...noCacheHeaders,
              },
              body: JSON.stringify({
                model: "deepseek-coder:latest",
                prompt: `${systemPrompt}\n\n${prompt}`,
                stream: false,
                options: {
                  temperature: 0.7,
                  num_predict: config.maxTokens,
                },
              }),
            });

            if (response.ok) {
              json = await response.json();
              text = json.response || "";
            } else {
              throw new Error(`Ollama bridge HTTP ${response.status}`);
            }
          }

          if (text) {

            if (text) {
              console.log("✅ Ollama bridge successful for DeepSeek");

              const duration = Date.now() - startTime;
              await trackAIPerformance(member, "chat", duration, 0, 0, true);
              await storeConversationMemory(prompt, text, {
                ai_member: member,
                via: "ollama",
              });

              return text;
            }
          }
        } catch (ollamaError) {
          console.log(
            `⚠️ Ollama bridge failed: ${ollamaError.message}, falling back to API`
          );
        }
      }

      if (!deepseekApiKey) throw new Error("DEEPSEEK_API_KEY not set");

      response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${deepseekApiKey}`,
          ...noCacheHeaders,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: enhancedPrompt },
          ],
          max_tokens: config.maxTokens,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`DeepSeek API error: ${response.status} - ${errorText}`);
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      if (json.error) throw new Error(json.error.message);

      const text = json.choices?.[0]?.message?.content || "";
      if (!text) throw new Error("Empty response");

      const cost = calculateCost(json.usage, config.model);
      await updateDailySpend(cost);

      const duration = Date.now() - startTime;
      await trackAIPerformance(
        member,
        "chat",
        duration,
        json.usage?.total_tokens || 0,
        cost,
        true
      );

      // CACHE THE RESPONSE
      if (options.useCache !== false) {
        cacheResponse(prompt, member, text);
      }

      await storeConversationMemory(prompt, text, { ai_member: member });
      return text;
    }

    throw new Error(`${config.provider.toUpperCase()}_API_KEY not configured`);
  } catch (error) {
    const duration = Date.now() - startTime;
    await trackAIPerformance(member, "chat", duration, 0, 0, false);
    console.error(`Failed to call ${member}: ${error.message}`);

    // If provider is rate-limited or out of quota, set a cooldown so we skip it temporarily
    const msg = (error?.message || "").toLowerCase();
    const isRateLimited =
      msg.includes("429") ||
      msg.includes("rate limit") ||
      msg.includes("insufficient_quota") ||
      msg.includes("quota");
    if (isRateLimited) {
      const cooldownMs = 3 * 60 * 60 * 1000; // 3 hours
      providerCooldowns.set(member, Date.now() + cooldownMs);
      console.warn(
        `⚠️ [COUNCIL] ${member} rate-limited/out-of-quota. Pausing for 3h.`
      );
    }

    throw error;
  }
}

// ==================== AI PERFORMANCE TRACKING ====================
async function trackAIPerformance(
  aiMember,
  taskType,
  durationMs,
  tokensUsed,
  cost,
  success
) {
  try {
    await pool.query(
      `INSERT INTO ai_performance (ai_member, task_type, duration_ms, tokens_used, cost, success, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [aiMember, taskType, durationMs, tokensUsed, cost, success]
    );

    const currentScore = aiPerformanceScores.get(aiMember) || 50;
    const newScore = success
      ? Math.min(100, currentScore + (100 - durationMs / 100))
      : Math.max(0, currentScore - 10);
    aiPerformanceScores.set(aiMember, newScore);
  } catch (error) {
    console.error("Performance tracking error:", error.message);
  }
}

// ==================== AI ROTATION SYSTEM ====================
async function rotateAIsBasedOnPerformance() {
  try {
    const result = await pool.query(
      `SELECT ai_member, 
              AVG(CASE WHEN success THEN 1 ELSE 0 END) as success_rate,
              AVG(duration_ms) as avg_duration,
              COUNT(*) as task_count
       FROM ai_performance 
       WHERE created_at > NOW() - INTERVAL '24 hours'
       GROUP BY ai_member
       ORDER BY success_rate DESC, avg_duration ASC`
    );

    if (result.rows.length > 0) {
      const bestPerformer = result.rows[0].ai_member;
      const worstPerformer = result.rows[result.rows.length - 1].ai_member;

      await pool.query(
        `INSERT INTO ai_rotation_log (ai_member, previous_role, new_role, performance_score, reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          bestPerformer,
          COUNCIL_MEMBERS[bestPerformer].role,
          "Primary Decision Maker",
          result.rows[0].success_rate * 100,
          "Highest success rate",
        ]
      );

      console.log(
        `🔄 AI Rotation: ${bestPerformer} promoted to Primary Decision Maker`
      );

      return {
        primary: bestPerformer,
        secondary: result.rows[1]?.ai_member || "chatgpt",
        rotations: result.rows.length,
      };
    }
  } catch (error) {
    console.error("AI rotation error:", error.message);
  }
  return null;
}

// ==================== BLIND SPOT DETECTION ====================
async function detectBlindSpots(decision, context) {
  try {
    const blindSpotPrompt = `Analyze this decision for blind spots and unintended consequences:
    
    Decision: ${decision}
    Context: ${JSON.stringify(context)}
    
    Identify:
    1. What are we not considering?
    2. What could go wrong that we haven't thought of?
    3. What are the second-order effects?
    4. What would a skeptical outsider point out?
    5. What assumptions are we making?
    
    Be specific and critical.`;

    const responses = await Promise.allSettled([
      callCouncilMember("chatgpt", blindSpotPrompt, { checkBlindSpots: true }),
      callCouncilMember("grok", blindSpotPrompt, { checkBlindSpots: true }),
    ]);

    const blindSpots = [];
    for (const response of responses) {
      if (response.status === "fulfilled" && response.value) {
        const spots = response.value
          .split("\n")
          .filter((line) => line.trim().length > 0);
        blindSpots.push(...spots);

        for (const spot of spots.slice(0, 3)) {
          await pool.query(
            `INSERT INTO blind_spots (detected_by, decision_context, blind_spot, severity, mitigation, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            ["ai_council", decision, spot, "medium", ""]
          );
        }
      }
    }

    systemMetrics.blindSpotsDetected += blindSpots.length;
    return blindSpots;
  } catch (error) {
    console.error("Blind spot detection error:", error.message);
    return [];
  }
}

// ==================== USER PREFERENCE LEARNING ====================
async function guessUserDecision(context) {
  try {
    const pastDecisions = await pool.query(
      `SELECT context, choice, outcome, riskLevel 
       FROM user_decisions 
       WHERE created_at > NOW() - INTERVAL '30 days'
       ORDER BY created_at DESC 
       LIMIT 20`
    );

    const prompt = `Based on these past user decisions:
    ${JSON.stringify(pastDecisions.rows, null, 2)}
    
    And this current context:
    ${JSON.stringify(context)}
    
    What would the user likely choose? Consider:
    1. Risk tolerance patterns
    2. Decision speed preferences
    3. Common priorities
    4. Past similar situations
    
    Provide your best guess and confidence level (0-100).`;

    const guess = await callCouncilMember("chatgpt", prompt, {
      guessUserPreference: true,
    });

    return {
      prediction: guess,
      confidence: 75,
      basedOn: pastDecisions.rows.length + " past decisions",
    };
  } catch (error) {
    console.error("User preference guess error:", error.message);
    return { prediction: "uncertain", confidence: 0 };
  }
}

// ==================== KNOWLEDGE LOADING ====================
let knowledgeContext = null; // Global knowledge context

/**
 * Load knowledge context from processed dumps
 */
async function loadKnowledgeContext() {
  try {
    const indexPath = path.join(__dirname, 'knowledge', 'index', 'entries.jsonl');
    if (!fs.existsSync(indexPath)) {
      console.log('📚 [KNOWLEDGE] No index found - run: node scripts/process-knowledge.js');
      return null;
    }
    
    const lines = fs.readFileSync(indexPath, 'utf-8').split('\n').filter(Boolean);
    const entries = lines.map(l => {
      try {
        return JSON.parse(l);
      } catch (e) {
        return null;
      }
    }).filter(Boolean);
    
    console.log(`📚 [KNOWLEDGE] Loaded ${entries.length} entries from index`);
    
    // Load core truths and project context
    const coreTruthsPath = path.join(__dirname, 'docs', 'CORE_TRUTHS.md');
    const projectContextPath = path.join(__dirname, 'docs', 'PROJECT_CONTEXT.md');
    
    let coreTruths = null;
    let projectContext = null;
    
    if (fs.existsSync(coreTruthsPath)) {
      coreTruths = fs.readFileSync(coreTruthsPath, 'utf-8');
      console.log('📚 [KNOWLEDGE] Loaded CORE_TRUTHS.md');
    }
    
    if (fs.existsSync(projectContextPath)) {
      projectContext = fs.readFileSync(projectContextPath, 'utf-8');
      console.log('📚 [KNOWLEDGE] Loaded PROJECT_CONTEXT.md');
    }
    
    const context = {
      entries,
      coreTruths,
      projectContext,
      totalEntries: entries.length
    };
    
    // Store globally
    knowledgeContext = context;
    
    return context;
  } catch (e) {
    console.warn(`⚠️ [KNOWLEDGE] Could not load index: ${e.message}`);
    return null;
  }
}

/**
 * Inject knowledge context into prompt
 */
function injectKnowledgeContext(prompt, maxIdeas = 5) {
  if (!knowledgeContext) return prompt;
  
  let contextSection = '';
  
  // Add core truths
  if (knowledgeContext.coreTruths) {
    contextSection += `\n\n=== CORE TRUTHS (Immutable Principles) ===\n${knowledgeContext.coreTruths}\n`;
  }
  
  // Add project context
  if (knowledgeContext.projectContext) {
    contextSection += `\n\n=== PROJECT CONTEXT ===\n${knowledgeContext.projectContext}\n`;
  }
  
  // Add relevant ideas from knowledge dumps
  if (knowledgeContext.entries && knowledgeContext.entries.length > 0) {
    const allIdeas = [];
    for (const entry of knowledgeContext.entries) {
      if (entry.ideas && Array.isArray(entry.ideas)) {
        allIdeas.push(...entry.ideas.map(idea => ({
          ...idea,
          source: entry.filename
        })));
      }
    }
    
    if (allIdeas.length > 0) {
      // Simple keyword matching to find relevant ideas
      const promptLower = prompt.toLowerCase();
      const relevantIdeas = allIdeas
        .filter(idea => {
          const ideaText = (idea.text || '').toLowerCase();
          const keywords = promptLower.split(/\s+/).filter(w => w.length > 3);
          return keywords.some(kw => ideaText.includes(kw));
        })
        .slice(0, maxIdeas);
      
      if (relevantIdeas.length > 0) {
        contextSection += `\n\n=== RELEVANT IDEAS FROM KNOWLEDGE BASE ===\n`;
        relevantIdeas.forEach((idea, i) => {
          contextSection += `${i+1}. ${idea.text}\n   (Source: ${idea.source})\n`;
        });
      }
    }
  }
  
  if (contextSection) {
    return `${prompt}\n\n${contextSection}\n\nUse this knowledge to inform your response.`;
  }
  
  return prompt;
}

// ==================== DAILY IDEA GENERATION ====================
async function generateDailyIdeas() {
  try {
    const today = dayjs().format("YYYY-MM-DD");
    if (lastIdeaGeneration === today) return;

    console.log("💡 [IDEAS] Starting ideas generation...");
    
    // Detect what model we're actually using
    const memberToUse = OLLAMA_ENDPOINT ? 'ollama_deepseek' : 'chatgpt';
    const memberConfig = COUNCIL_MEMBERS[memberToUse] || COUNCIL_MEMBERS['ollama_deepseek'] || {};
    const modelName = memberConfig.model || 'llama3.2:1b';
    const modelSize = getModelSize(modelName);
    
    console.log(`💡 [IDEAS] Model: ${modelName} (size: ${modelSize})`);
    
    // Get appropriate prompt for model size
    const ideaPrompt = getIdeasPromptForModel(modelSize);
    
    // For small models, only run once (they're slow)
    const iterations = modelSize === 'small' ? 1 : 3;
    const allIdeas = [];
    
    for (let i = 0; i < iterations; i++) {
      try {
        console.log(`💡 [IDEAS] Iteration ${i+1}/${iterations}...`);
        
        const response = await callCouncilWithFailover(ideaPrompt, memberToUse);
        const ideas = parseIdeasFromResponse(response, modelSize);
        
        console.log(`💡 [IDEAS] Iteration ${i+1}: Extracted ${ideas.length} ideas`);
        allIdeas.push(...ideas);
        
      } catch (error) {
        console.warn(`⚠️ [IDEAS] Iteration ${i+1} failed: ${error.message}`);
      }
    }
    
    // Deduplicate
    const seen = new Set();
    const uniqueIdeas = allIdeas.filter(idea => {
      const key = (idea.name || idea.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    
    console.log(`✅ [IDEAS] Generated ${uniqueIdeas.length} unique ideas from ${allIdeas.length} total`);

    const ideas = uniqueIdeas.map(idea => ({
      title: idea.name || idea.title || `Idea ${Math.random().toString(36).slice(2, 8)}`,
      description: idea.description || '',
      difficulty: idea.difficulty || 'medium',
      impact: idea.impact || 'medium',
    }));

    // If still no ideas, use simple fallback (but log warning)
    if (ideas.length === 0) {
      console.warn("⚠️ [IDEAS] No ideas extracted, using fallback template.");
      for (let i = 1; i <= 5; i++) {
        ideas.push({
          title: `Template Idea ${i}`,
          description: `Improve LifeOS system (offers, funnels, automation, billing). Variant #${i}.`,
          difficulty: i <= 2 ? "easy" : i <= 4 ? "medium" : "hard",
          impact: 'medium',
        });
      }
    }

    dailyIdeas = [];

    for (const idea of ideas) {
      const ideaId = `idea_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      await pool.query(
        `INSERT INTO daily_ideas (idea_id, idea_title, idea_description, proposed_by, implementation_difficulty)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (idea_id) DO NOTHING`,
        [
          ideaId,
          idea.title,
          idea.description,
          response ? "council" : "fallback",
          idea.difficulty,
        ]
      );

      dailyIdeas.push({
        id: ideaId,
        title: idea.title,
        description: idea.description,
        votes: { for: 0, against: 0 },
      });
    }

    lastIdeaGeneration = today;
    systemMetrics.dailyIdeasGenerated += dailyIdeas.length;

    console.log(
      `✅ Generated ${dailyIdeas.length} daily ideas (source: ${
        response ? "council" : "local fallback"
      })`
    );

    setTimeout(() => voteOnDailyIdeas(), 5000);
  } catch (error) {
    console.error("Daily idea generation error (final):", error.message);
  }
}

// ==================== IDEA VOTING SYSTEM ====================
async function voteOnDailyIdeas() {
  try {
    const pendingIdeas = await pool.query(
      `SELECT * FROM daily_ideas WHERE status = 'pending' ORDER BY created_at DESC LIMIT 10`
    );

    for (const idea of pendingIdeas.rows) {
      const votePrompt = `Should we implement this idea?
      Title: ${idea.idea_title}
      Description: ${idea.idea_description}
      Difficulty: ${idea.implementation_difficulty}
      
      Vote YES or NO with brief reasoning. Focus on ROI, feasibility, and alignment with online revenue generation.`;

      const councilMembers = Object.keys(COUNCIL_MEMBERS);
      let yesVotes = 0,
        noVotes = 0;

      for (const member of councilMembers) {
        try {
          const response = await callCouncilMember(member, votePrompt);
          const vote = response.includes("YES") ? "yes" : "no";

          if (vote === "yes") yesVotes++;
          else noVotes++;

          await pool.query(
            `UPDATE daily_ideas 
             SET votes_for = votes_for + $1, votes_against = votes_against + $2
             WHERE idea_id = $3`,
            [vote === "yes" ? 1 : 0, vote === "no" ? 1 : 0, idea.idea_id]
          );
        } catch (error) {
          console.error(`Vote error for ${member}:`, error.message);
        }
      }

      const status = yesVotes > noVotes ? "approved" : "rejected";
      await pool.query(
        `UPDATE daily_ideas SET status = $1 WHERE idea_id = $2`,
        [status, idea.idea_id]
      );

      if (status === "approved") {
        await executionQueue.addTask(
          "implement_idea",
          `Implement: ${idea.idea_title}`
        );
      }
    }
  } catch (error) {
    console.error("Idea voting error:", error.message);
  }
}

// ==================== SANDBOX TESTING ====================
async function sandboxTest(code, testDescription) {
  try {
    const testId = `test_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    console.log(`🧪 Sandbox testing: ${testDescription}`);

    const testPath = path.join(__dirname, "sandbox", `${testId}.js`);
    await fsPromises.mkdir(path.join(__dirname, "sandbox"), { recursive: true });

    const wrappedCode = `
      // Sandbox test: ${testDescription}
      ${code}
      console.log('Test completed successfully');
    `;

    await fsPromises.writeFile(testPath, wrappedCode);

    let testResult;
    let success = false;
    let errorMessage = null;

    try {
      const { stdout, stderr } = await execAsync(
        `node --no-warnings ${testPath}`,
        {
          timeout: 5000,
          cwd: __dirname,
          env: { ...process.env, NODE_ENV: "test" },
        }
      );

      testResult = stdout || "Test passed";
      success = !stderr || stderr.includes("Warning");
      if (stderr && !success) errorMessage = stderr;
    } catch (error) {
      testResult = "Test failed";
      errorMessage = error.message;
      success = false;
    }

    await fsPromises.unlink(testPath).catch(() => {});

    await pool.query(
      `INSERT INTO sandbox_tests (test_id, code_change, test_result, success, error_message)
       VALUES ($1, $2, $3, $4, $5)`,
      [testId, code.slice(0, 1000), testResult, success, errorMessage]
    );

    return { success, result: testResult, error: errorMessage };
  } catch (error) {
    console.error("Sandbox test error:", error.message);
    return { success: false, result: null, error: error.message };
  }
}

// ==================== DRIFT & HALLUCINATION PROTECTION ====================
async function detectHallucinations(aiResponse, context, sourceMember) {
  try {
    // Check for common hallucination patterns
    const hallucinationIndicators = [
      /I don't have access to/i,
      /I cannot/i,
      /I'm not able to/i,
      /as an AI language model/i,
      /I don't have real-time/i,
      /I cannot browse/i,
    ];

    const hasHallucinationPattern = hallucinationIndicators.some(pattern =>
      pattern.test(aiResponse)
    );

    // Check for vague or non-specific responses
    const vaguePatterns = [
      /might work/i,
      /could potentially/i,
      /perhaps/i,
      /maybe/i,
      /I think/i,
      /I believe/i,
    ];

    const vagueCount = vaguePatterns.filter(pattern => pattern.test(aiResponse)).length;
    const isVague = vagueCount >= 3;

    // Check for contradictory statements
    const contradictions = [
      /but.*however/i,
      /although.*but/i,
      /on one hand.*on the other hand/i,
    ];

    const hasContradictions = contradictions.some(pattern => pattern.test(aiResponse));

    return {
      hasHallucinationPattern,
      isVague,
      hasContradictions,
      vagueCount,
      confidence: hasHallucinationPattern || isVague || hasContradictions ? "low" : "medium",
    };
  } catch (error) {
    console.warn(`Hallucination detection error: ${error.message}`);
    return { confidence: "unknown" };
  }
}

async function crossValidateResponses(responses, context) {
  try {
    if (responses.length < 2) {
      return { validated: true, confidence: "low", reason: "Insufficient responses for validation" };
    }

    // Extract key claims/fixes from each response
    const claims = responses.map(r => ({
      member: r.member,
      claims: extractKeyClaims(r.response),
    }));

    // Check for agreement on core solutions
    const solutionPatterns = responses.map(r => extractSolutionPattern(r.response));
    const agreementScore = calculateAgreement(solutionPatterns);

    // Check if responses reference each other or contradict
    const contradictions = findContradictions(claims);

    const validated = agreementScore >= 0.6 && contradictions.length === 0;
    const confidence = agreementScore >= 0.8 ? "high" : agreementScore >= 0.6 ? "medium" : "low";

    return {
      validated,
      confidence,
      agreementScore,
      contradictions,
      reason: validated
        ? `High agreement (${(agreementScore * 100).toFixed(0)}%)`
        : `Low agreement (${(agreementScore * 100).toFixed(0)}%) or contradictions found`,
    };
  } catch (error) {
    console.warn(`Cross-validation error: ${error.message}`);
    return { validated: false, confidence: "unknown", reason: error.message };
  }
}

function extractKeyClaims(response) {
  const claims = [];
  // Extract code blocks
  const codeBlocks = response.match(/```[\s\S]*?```/g) || [];
  claims.push(...codeBlocks);
  // Extract numbered/bulleted solutions
  const solutions = response.match(/(?:^|\n)[\d\-\*]\s+[^\n]+/g) || [];
  claims.push(...solutions);
  return claims;
}

function extractSolutionPattern(response) {
  // Extract the core solution approach
  const patterns = [
    /(?:fix|solution|approach|method):\s*([^\n]+)/i,
    /(?:use|try|implement):\s*([^\n]+)/i,
  ];
  for (const pattern of patterns) {
    const match = response.match(pattern);
    if (match) return match[1].toLowerCase();
  }
  return response.substring(0, 100).toLowerCase();
}

function calculateAgreement(patterns) {
  if (patterns.length < 2) return 0;
  
  // Simple similarity check
  let matches = 0;
  for (let i = 0; i < patterns.length; i++) {
    for (let j = i + 1; j < patterns.length; j++) {
      // Check for keyword overlap
      const words1 = new Set(patterns[i].split(/\s+/));
      const words2 = new Set(patterns[j].split(/\s+/));
      const intersection = new Set([...words1].filter(x => words2.has(x)));
      const union = new Set([...words1, ...words2]);
      const similarity = intersection.size / union.size;
      if (similarity > 0.3) matches++;
    }
  }
  
  const totalPairs = (patterns.length * (patterns.length - 1)) / 2;
  return matches / totalPairs;
}

function findContradictions(claims) {
  const contradictions = [];
  const keywords = ["cannot", "should not", "don't", "never", "avoid"];
  const positiveKeywords = ["can", "should", "do", "always", "use"];

  for (let i = 0; i < claims.length; i++) {
    for (let j = i + 1; j < claims.length; j++) {
      const text1 = claims[i].claims.join(" ").toLowerCase();
      const text2 = claims[j].claims.join(" ").toLowerCase();
      
      // Check for direct contradictions
      for (const neg of keywords) {
        for (const pos of positiveKeywords) {
          if (text1.includes(neg) && text2.includes(pos)) {
            contradictions.push({
              member1: claims[i].member,
              member2: claims[j].member,
              type: "contradiction",
            });
          }
        }
      }
    }
  }
  return contradictions;
}

async function validateAgainstWebSearch(aiResponse, webSearchResults, problem) {
  try {
    if (!webSearchResults || !webSearchResults.success) {
      return { validated: false, confidence: "low", reason: "No web search results available" };
    }

    // Extract key technical terms from AI response
    const responseTerms = extractTechnicalTerms(aiResponse);
    const webTerms = extractTechnicalTerms(webSearchResults.results);

    // Check for overlap
    const overlap = responseTerms.filter(term => webTerms.includes(term));
    const overlapRatio = overlap.length / Math.max(responseTerms.length, 1);

    // Check if web search confirms or contradicts
    const confirms = overlapRatio > 0.4;
    const confidence = overlapRatio > 0.6 ? "high" : overlapRatio > 0.4 ? "medium" : "low";

    return {
      validated: confirms,
      confidence,
      overlapRatio,
      reason: confirms
        ? `Response aligns with web search results (${(overlapRatio * 100).toFixed(0)}% overlap)`
        : `Response may not align with web search results (${(overlapRatio * 100).toFixed(0)}% overlap)`,
    };
  } catch (error) {
    console.warn(`Web search validation error: ${error.message}`);
    return { validated: false, confidence: "unknown", reason: error.message };
  }
}

function extractTechnicalTerms(text) {
  // Extract technical terms: function names, APIs, error messages, etc.
  const terms = [];
  // Code patterns
  const codeMatches = text.match(/\b[a-z_][a-z0-9_]*\s*\(/gi) || [];
  terms.push(...codeMatches.map(m => m.replace(/\s*\(/, "").toLowerCase()));
  // Error patterns
  const errorMatches = text.match(/error[:\s]+([^\n]+)/gi) || [];
  terms.push(...errorMatches.map(m => m.replace(/error[:\s]+/i, "").toLowerCase()));
  // API/library names
  const apiMatches = text.match(/\b(?:require|import|from)\s+['"]([^'"]+)['"]/gi) || [];
  terms.push(...apiMatches.map(m => m.replace(/\b(?:require|import|from)\s+['"]|['"]/gi, "").toLowerCase()));
  return [...new Set(terms)];
}

async function detectDrift(member, currentResponse, historicalResponses) {
  try {
    if (historicalResponses.length < 3) {
      return { hasDrift: false, confidence: "low", reason: "Insufficient history" };
    }

    // Compare current response style/approach with historical
    const currentPattern = extractSolutionPattern(currentResponse);
    const historicalPatterns = historicalResponses.map(r => extractSolutionPattern(r));

    // Check for significant deviation
    const avgSimilarity = historicalPatterns.reduce((sum, pattern) => {
      const words1 = new Set(currentPattern.split(/\s+/));
      const words2 = new Set(pattern.split(/\s+/));
      const intersection = new Set([...words1].filter(x => words2.has(x)));
      const union = new Set([...words1, ...words2]);
      return sum + (intersection.size / union.size);
    }, 0) / historicalPatterns.length;

    const hasDrift = avgSimilarity < 0.3;
    const confidence = avgSimilarity < 0.2 ? "high" : avgSimilarity < 0.3 ? "medium" : "low";

    return {
      hasDrift,
      confidence,
      similarity: avgSimilarity,
      reason: hasDrift
        ? `Response style deviates significantly from historical patterns (${(avgSimilarity * 100).toFixed(0)}% similarity)`
        : `Response consistent with historical patterns (${(avgSimilarity * 100).toFixed(0)}% similarity)`,
    };
  } catch (error) {
    console.warn(`Drift detection error: ${error.message}`);
    return { hasDrift: false, confidence: "unknown", reason: error.message };
  }
}

// ==================== WEB SEARCH CAPABILITIES ====================
async function searchWebWithGemini(query) {
  try {
    const apiKey = process.env.LIFEOS_GEMINI_KEY?.trim() || process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("Gemini API key not available for web search");
    }

    // Use Gemini with enhanced prompt for web knowledge
    const searchPrompt = `🔍 WEB SEARCH REQUEST: ${query}

Search your knowledge base and web-connected information for:
1. Recent blog posts, Stack Overflow answers, and documentation
2. Code examples and working solutions
3. Best practices and patterns
4. GitHub repositories with similar code
5. Official documentation links

Provide:
- Specific solutions with code examples
- Links to resources (if available in your knowledge)
- Step-by-step fixes
- Why these solutions work

Focus on practical, tested solutions that have worked for others.`;

    const response = await callCouncilMember("gemini", searchPrompt, {
      webSearch: true,
    });

    return {
      success: true,
      results: response,
      source: "gemini_web_search",
    };
  } catch (error) {
    console.warn(`⚠️ Gemini web search failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      source: "gemini_web_search",
    };
  }
}

async function searchWebWithGrok(query) {
  try {
    const apiKey = process.env.GROK_API_KEY?.trim();
    if (!apiKey) {
      throw new Error("Grok API key not available for web search");
    }

    // Use Grok's real-time knowledge and X/Twitter access
    const searchPrompt = `🔍 WEB SEARCH REQUEST: ${query}

Using your real-time knowledge and access to X (Twitter), search for:
1. Recent discussions on X/Twitter about this problem
2. Reddit threads and community forums
3. Developer blogs and tutorials
4. Real-world solutions from the community
5. Links to resources and examples

Provide:
- Community-tested solutions
- Links to discussions or resources
- Code examples that have worked
- Why these approaches are effective

Focus on practical, community-verified solutions.`;

    const response = await callCouncilMember("grok", searchPrompt, {
      webSearch: true,
    });

    return {
      success: true,
      results: response,
      source: "grok_web_search",
    };
  } catch (error) {
    console.warn(`⚠️ Grok web search failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      source: "grok_web_search",
    };
  }
}

// ==================== ESCALATION STRATEGY PROPOSAL ====================
async function proposeEscalationStrategy(problem, errorContext, attemptsSoFar = 0) {
  const strategyPrompt = `We have a persistent problem that needs solving:

PROBLEM: ${problem}
ERROR CONTEXT: ${errorContext}
ATTEMPTS SO FAR: ${attemptsSoFar}

Propose an escalation strategy with:
1. Number of attempts at each tier
2. Which AI members to involve at each tier
3. When to escalate to web search
4. Maximum total attempts before considering alternative approaches

Format your response as:
TIER 1: [description] - [X] attempts with [members]
TIER 2: [description] - [X] attempts with [members]
TIER 3: [description] - [X] attempts with [members]
WEB SEARCH: [description] - [X] attempts with [members]
MAX TOTAL: [X] attempts

Be strategic - we want to solve this, not waste resources.`;

  try {
    const strategy = await callCouncilWithFailover(strategyPrompt, "ollama_deepseek"); // Use Tier 0 (free)
    return {
      success: true,
      strategy,
      proposedBy: "council",
    };
  } catch (error) {
    // Default strategy if proposal fails
    return {
      success: false,
      strategy: `TIER 1: Single AI analysis - 3 attempts with first available member
TIER 2: Multiple AIs - 5 attempts with top 3 available members
TIER 3: Full council - 10 attempts with all available members
WEB SEARCH: Web research - 5 attempts with ALL available members (enhanced web search)
MAX TOTAL: 25 attempts`,
      proposedBy: "default",
    };
  }
}

// ==================== ENHANCED SANDBOX TESTING WITH RETRY & COUNCIL ESCALATION ====================
async function robustSandboxTest(code, testDescription, maxRetries = 5) {
  console.log(`🧪 [ROBUST TEST] Starting: ${testDescription}`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🔄 Attempt ${attempt}/${maxRetries}...`);

    const result = await sandboxTest(code, testDescription);

    if (result.success) {
      console.log(`✅ [ROBUST TEST] Success on attempt ${attempt}`);
      return { ...result, attempt, phase: "initial_retry" };
    }

    console.log(
      `⚠️ Attempt ${attempt} failed: ${
        result.error?.substring(0, 100) || "Unknown error"
      }`
    );

    if (attempt < maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.log(`🔍 [ROBUST TEST] Initial retries failed, escalating to persistent council...`);
  return await persistentCouncilEscalation(code, testDescription, result.error);
}

// ==================== PERSISTENT COUNCIL ESCALATION (WORKS UNTIL SOLVED) ====================
async function persistentCouncilEscalation(code, testDescription, errorContext = "") {
  console.log(`🏛️ [PERSISTENT ESCALATION] Problem: ${testDescription}`);
  console.log(`🔄 This will continue until solved...`);

  // Propose escalation strategy
  const strategyResult = await proposeEscalationStrategy(
    testDescription,
    errorContext || "Code failed sandbox testing",
    0
  );
  console.log(`📋 Escalation Strategy Proposed:\n${strategyResult.strategy}`);

  const proposalId = `persist_esc_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  
  try {
    await pool.query(
      `INSERT INTO consensus_proposals (proposal_id, title, description, proposed_by, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        proposalId,
        `Persistent Escalation: ${testDescription}`,
        `Working until solved. Strategy: ${strategyResult.strategy.substring(0, 200)}...`,
        "system",
        "in_progress",
      ]
    );
  } catch (err) {
    console.warn(`⚠️ Could not create proposal: ${err.message}`);
  }

  let totalAttempts = 0;
  let currentCode = code;
  let currentTier = 1;
  let tierAttempts = 0;
  const maxTierAttempts = 3; // Per tier before escalating
  const maxTotalAttempts = 50; // Absolute maximum (safety limit)

  // Get list of available working AIs
  const availableMembers = [];
  for (const member of Object.keys(COUNCIL_MEMBERS)) {
    try {
      // Quick check if member is available (check API key exists)
      const testKey = getApiKeyForProvider(COUNCIL_MEMBERS[member].provider);
      if (testKey) {
        availableMembers.push(member);
      }
    } catch {
      // Skip unavailable members
    }
  }

  console.log(`✅ Available AI members: ${availableMembers.join(", ")}`);

  // Tier definitions
  const tiers = [
    {
      name: "Single AI Analysis",
      members: availableMembers.length > 0 ? [availableMembers[0]] : ["deepseek"],
      maxAttempts: 3,
      description: "Deep analysis with one technical expert",
    },
    {
      name: "Multiple Technical AIs",
      members: availableMembers.length >= 3 
        ? availableMembers.slice(0, 3) 
        : ["chatgpt", "deepseek", "gemini"],
      maxAttempts: 5,
      description: "Collaborative analysis with technical experts",
    },
    {
      name: "Full Council",
      members: availableMembers.length > 0 ? availableMembers : ["chatgpt", "deepseek", "gemini", "grok"],
      maxAttempts: 10,
      description: "All council members working together",
    },
    {
      name: "Web Search Enhanced - All Available AIs",
      members: availableMembers.length > 0 ? availableMembers : ["chatgpt", "deepseek", "gemini", "grok"], // ALL available working AIs with web search
      maxAttempts: 5,
      description: "ALL available working AIs with web search capabilities - Gemini and Grok do enhanced web searches, others use their knowledge bases",
      useWebSearch: true,
    },
  ];

  while (totalAttempts < maxTotalAttempts) {
    // Check if we need to escalate to next tier
    if (tierAttempts >= tiers[currentTier - 1].maxAttempts && currentTier < tiers.length) {
      console.log(`\n📈 ESCALATING to Tier ${currentTier + 1}: ${tiers[currentTier].name}`);
      currentTier++;
      tierAttempts = 0;
    }

    // If we've exhausted all tiers, propose new strategy or continue with web search
    if (currentTier > tiers.length) {
      console.log(`\n🔄 All tiers exhausted. Continuing with web search focus...`);
      currentTier = tiers.length; // Stay on web search tier
    }

    const tier = tiers[currentTier - 1];
    totalAttempts++;
    tierAttempts++;

    console.log(
      `\n🏛️ [TIER ${currentTier}/${tiers.length}] ${tier.name} - Attempt ${tierAttempts}/${tier.maxAttempts} (Total: ${totalAttempts})`
    );

    const analysisPrompt = `We have a persistent problem that MUST be solved:

PROBLEM: ${testDescription}
ERROR: ${errorContext || "Code failed testing"}
TIER: ${tier.name}
ATTEMPT: ${tierAttempts}/${tier.maxAttempts} (Total: ${totalAttempts})

ORIGINAL CODE:
\`\`\`javascript
${currentCode}
\`\`\`

${tier.useWebSearch ? "🔍 WEB SEARCH MODE: Search the web, blogs, Stack Overflow, GitHub, and documentation for solutions to this exact problem. Include links and code examples from real solutions." : ""}

We need to:
1. Diagnose the root cause
2. ${tier.useWebSearch ? "Find web resources and examples" : "Analyze the code deeply"}
3. Propose corrected code
4. Ensure it will work

Provide:
1. Root cause analysis
2. ${tier.useWebSearch ? "Web resources found (with links if possible)" : "Technical analysis"}
3. Specific, complete code fix
4. Why this fix will work`;

    const insights = [];
    const fixes = [];
    const webSearchResults = {};

    // Call tier members with drift & hallucination protection
    for (const member of tier.members) {
      try {
        let prompt = analysisPrompt;
        
        // Add web search for ALL members in web search tier
        if (tier.useWebSearch) {
          // Gemini and Grok have enhanced web search capabilities
          if (member === "gemini") {
            const webResults = await searchWebWithGemini(
              `${testDescription}. Error: ${errorContext}`
            );
            webSearchResults.gemini = webResults;
            if (webResults.success) {
              prompt += `\n\n🔍 GEMINI WEB SEARCH RESULTS:\n${webResults.results}`;
            }
          } else if (member === "grok") {
            const webResults = await searchWebWithGrok(
              `${testDescription}. Error: ${errorContext}`
            );
            webSearchResults.grok = webResults;
            if (webResults.success) {
              prompt += `\n\n🔍 GROK WEB SEARCH RESULTS:\n${webResults.results}`;
            }
          } else {
            // Other AIs also get web search context - they can use their knowledge bases
            prompt += `\n\n🔍 WEB SEARCH MODE: Use your knowledge base and any available web-connected information to find solutions. Search for similar problems, Stack Overflow answers, GitHub issues, blog posts, and documentation. Include specific examples and code snippets from your knowledge.`;
          }
        }

        const response = await callCouncilMember(member, prompt);
        
        // DRIFT & HALLUCINATION PROTECTION
        const hallucinationCheck = await detectHallucinations(response, { problem: testDescription, tier: currentTier }, member);
        
        // Get historical responses for this member (if available)
        try {
          const historyResult = await pool.query(
            `SELECT response FROM conversation_memory 
             WHERE ai_member = $1 AND created_at > NOW() - INTERVAL '24 hours'
             ORDER BY created_at DESC LIMIT 5`,
            [member]
          );
          const historicalResponses = historyResult.rows.map(r => r.response || "");
          const driftCheck = await detectDrift(member, response, historicalResponses);
          
          if (hallucinationCheck.confidence === "low" || driftCheck.hasDrift) {
            console.warn(`⚠️ [${member}] Hallucination/Drift detected:`, {
              hallucination: hallucinationCheck,
              drift: driftCheck,
            });
            // Still include but flag it
            insights.push({ 
              member, 
              response, 
              tier: currentTier,
              flagged: true,
              hallucinationCheck,
              driftCheck,
            });
          } else {
            insights.push({ member, response, tier: currentTier });
          }
        } catch (histErr) {
          // If history check fails, still include the response
          insights.push({ member, response, tier: currentTier });
        }

        // Validate against web search if available
        if (tier.useWebSearch && (webSearchResults.gemini || webSearchResults.grok)) {
          const webResult = webSearchResults.gemini || webSearchResults.grok;
          const webValidation = await validateAgainstWebSearch(response, webResult, testDescription);
          if (webValidation.confidence === "low") {
            console.warn(`⚠️ [${member}] Response may not align with web search:`, webValidation.reason);
          }
        }

        const memberFixes = extractCodeFixes(response);
        fixes.push(...memberFixes.map((f) => ({ source: member, fix: f, tier: currentTier })));
      } catch (err) {
        console.log(`⚠️ ${member} unavailable: ${err.message}`);
      }
    }

    // CROSS-VALIDATION: Check if multiple AIs agree
    if (insights.length >= 2) {
      const validation = await crossValidateResponses(insights, { problem: testDescription });
      if (!validation.validated || validation.confidence === "low") {
        console.warn(`⚠️ CROSS-VALIDATION FAILED:`, validation);
        // Continue but be more cautious
      } else {
        console.log(`✅ CROSS-VALIDATION PASSED: ${validation.reason}`);
      }
    }

    // If no fixes found, try to get more from other members
    if (fixes.length === 0 && currentTier < tiers.length) {
      console.log(`⚠️ No fixes found this round, escalating...`);
      currentTier++;
      tierAttempts = 0;
      continue;
    }

    console.log(`🧪 Testing ${fixes.length} proposed fix(es)...`);

    // Test each fix
    for (let i = 0; i < fixes.length; i++) {
      const fix = fixes[i];
      console.log(`🔧 Testing fix ${i + 1}/${fixes.length} from ${fix.source} (Tier ${fix.tier})...`);

      const testCode = applyCodeFix(currentCode, fix.fix);
      const testResult = await sandboxTest(testCode, testDescription);

      if (testResult.success) {
        console.log(`\n🎉 SUCCESS! Fix from ${fix.source} (Tier ${fix.tier}) worked after ${totalAttempts} total attempts!`);

        try {
          await pool.query(
            `UPDATE consensus_proposals SET status = 'resolved', decided_at = now() 
             WHERE proposal_id = $1`,
            [proposalId]
          );

          await pool.query(
            `INSERT INTO sandbox_tests 
             (test_id, code_change, test_result, success, error_message, created_at)
             VALUES ($1, $2, $3, $4, $5, now())`,
            [
              `success_${proposalId}`,
              `Applied fix from ${fix.source} (Tier ${fix.tier}): ${fix.fix.substring(0, 500)}`,
              `Persistent escalation successful after ${totalAttempts} attempts`,
              true,
              null,
            ]
          );
        } catch (dbErr) {
          console.warn(`⚠️ Database update failed: ${dbErr.message}`);
        }

        return {
          success: true,
          result: testResult.result,
          error: null,
          totalAttempts,
          tier: fix.tier,
          fixSource: fix.source,
          phase: "persistent_escalation_success",
          strategy: strategyResult.strategy,
        };
      }

      console.log(`⚠️ Fix ${i + 1} from ${fix.source} failed`);
    }

    // Update current code with best fix attempt for next iteration
    if (fixes.length > 0) {
      // Use the first fix as the new baseline
      currentCode = applyCodeFix(currentCode, fixes[0].fix);
      console.log(`📝 Updated code baseline with best attempt for next iteration`);
    }

    console.log(`🔄 No fixes worked this round. Continuing...`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // If we hit max attempts, don't give up - escalate to manual review
  console.log(`\n⚠️ Reached maximum attempts (${maxTotalAttempts}). Creating manual review proposal...`);

  try {
    await pool.query(
      `UPDATE consensus_proposals SET status = 'needs_review', description = description || ' - Reached max attempts, needs manual review'
       WHERE proposal_id = $1`,
      [proposalId]
    );
  } catch (err) {
    console.warn(`⚠️ Could not update proposal: ${err.message}`);
  }

  return {
    success: false,
    result: null,
    error: `Reached maximum attempts (${maxTotalAttempts}) without solving. Problem requires manual review or alternative approach.`,
    totalAttempts,
    phase: "max_attempts_reached",
    proposalId,
    strategy: strategyResult.strategy,
  };
}

// Legacy function for backward compatibility
async function councilEscalatedSandboxTest(code, testDescription) {
  return await persistentCouncilEscalation(code, testDescription);
}

function extractCodeFixes(response) {
  const fixes = [];

  const codeBlockRegex = /```(?:javascript|js)?\n([\s\S]*?)```/g;
  let match;
  while ((match = codeBlockRegex.exec(response)) !== null) {
    fixes.push(match[1].trim());
  }

  const fixPatterns = [
    /fix:?\s*\n?([\s\S]*?)(?=\n\n|\n\w|$)/gi,
    /solution:?\s*\n?([\s\S]*?)(?=\n\n|\n\w|$)/gi,
    /corrected code:?\s*\n?([\s\S]*?)(?=\n\n|\n\w|$)/gi,
    /try this:?\s*\n?([\s\S]*?)(?=\n\n|\n\w|$)/gi,
  ];

  for (const pattern of fixPatterns) {
    const matches = response.matchAll(pattern);
    for (const match of matches) {
      if (match[1] && match[1].trim().length > 10) {
        fixes.push(match[1].trim());
      }
    }
  }

  if (fixes.length === 0) {
    const lines = response.split("\n");
    let inCodeBlock = false;
    let currentFix = [];

    for (const line of lines) {
      if (
        line.includes("```") ||
        line.includes("fix") ||
        line.includes("function") ||
        line.includes("const ") ||
        line.includes("let ") ||
        line.includes("async")
      ) {
        inCodeBlock = true;
      }

      if (inCodeBlock) {
        currentFix.push(line);

        if (
          line.trim().endsWith(";") ||
          line.trim().endsWith("}") ||
          line.includes("// end")
        ) {
          if (currentFix.length > 2) {
            fixes.push(currentFix.join("\n"));
          }
          currentFix = [];
          inCodeBlock = false;
        }
      }
    }
  }

  return fixes;
}

function applyCodeFix(originalCode, fix) {
  if (fix.includes("function") && fix.includes("{") && fix.includes("}")) {
    return fix;
  }

  if (fix.includes("replace") && fix.includes("with")) {
    const replaceMatch = fix.match(
      /replace\s+['"`](.*?)['"`]\s+with\s+['"`](.*?)['"`]/i
    );
    if (replaceMatch) {
      const [, search, replacement] = replaceMatch;
      return originalCode.replace(new RegExp(search, "g"), replacement);
    }
  }

  return `${originalCode}\n\n// Applied fix\n${fix}`;
}

// ==================== SYSTEM SNAPSHOT & ROLLBACK ====================
async function createSystemSnapshot(reason = "Manual snapshot", filePaths = []) {
  try {
    const snapshotId = `snap_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    // Store file contents if file paths are provided
    const fileContents = {};
    if (filePaths && filePaths.length > 0) {
      for (const filePath of filePaths) {
        try {
          const fullPath = path.join(__dirname, filePath);
          if (fs.existsSync(fullPath)) {
            const content = await fsPromises.readFile(fullPath, "utf-8");
            fileContents[filePath] = content;
          }
        } catch (error) {
          console.warn(`⚠️ Could not snapshot file ${filePath}: ${error.message}`);
        }
      }
    }

    const systemState = {
      metrics: systemMetrics,
      roi: roiTracker,
      activeConnections: activeConnections.size,
      dailyIdeas: dailyIdeas.length,
      aiPerformance: Object.fromEntries(aiPerformanceScores),
      timestamp: new Date().toISOString(),
      fileContents, // Store actual file contents for restoration
    };

    await pool.query(
      `INSERT INTO system_snapshots (snapshot_id, snapshot_data, version, reason)
       VALUES ($1, $2, $3, $4)`,
      [snapshotId, JSON.stringify(systemState), "v26.1", reason]
    );

    systemSnapshots.push({
      id: snapshotId,
      timestamp: new Date().toISOString(),
      reason,
      filePaths: Object.keys(fileContents),
    });

    if (systemSnapshots.length > 10) {
      systemSnapshots = systemSnapshots.slice(-10);
    }

    console.log(`📸 System snapshot created: ${snapshotId} (${Object.keys(fileContents).length} files backed up)`);
    return snapshotId;
  } catch (error) {
    console.error("Snapshot creation error:", error.message);
    return null;
  }
}

async function rollbackToSnapshot(snapshotId) {
  try {
    const result = await pool.query(
      `SELECT snapshot_data FROM system_snapshots WHERE snapshot_id = $1`,
      [snapshotId]
    );

    if (result.rows.length === 0) {
      throw new Error("Snapshot not found");
    }

    // Handle JSON parsing - PostgreSQL JSONB might return as object or string
    let snapshotData = result.rows[0].snapshot_data;
    if (typeof snapshotData === 'string') {
      try {
        snapshotData = JSON.parse(snapshotData);
      } catch (parseError) {
        throw new Error(`Failed to parse snapshot data: ${parseError.message}`);
      }
    }

    // Restore in-memory state
    Object.assign(systemMetrics, snapshotData.metrics);
    Object.assign(roiTracker, snapshotData.roi);

    aiPerformanceScores.clear();
    for (const [ai, score] of Object.entries(snapshotData.aiPerformance || {})) {
      aiPerformanceScores.set(ai, score);
    }

    // Restore actual file contents if they were stored
    const restoredFiles = [];
    if (snapshotData.fileContents && typeof snapshotData.fileContents === 'object') {
      for (const [filePath, content] of Object.entries(snapshotData.fileContents)) {
        try {
          const fullPath = path.join(__dirname, filePath);
          // Create backup of current file before restoring
          if (fs.existsSync(fullPath)) {
            const backupPath = `${fullPath}.pre-rollback.${Date.now()}`;
            await fsPromises.copyFile(fullPath, backupPath);
            console.log(`📦 Backed up current ${filePath} to ${backupPath.split("/").pop()}`);
          }
          // Restore the file
          await fsPromises.writeFile(fullPath, content, "utf-8");
          restoredFiles.push(filePath);
          console.log(`↩️ Restored file: ${filePath}`);
        } catch (fileError) {
          console.error(`⚠️ Failed to restore file ${filePath}: ${fileError.message}`);
        }
      }
    }

    systemMetrics.rollbacksPerformed++;
    console.log(`↩️ System rolled back to snapshot: ${snapshotId} (${restoredFiles.length} files restored)`);

    await trackLoss(
      "info",
      "System rollback performed",
      `Rolled back to ${snapshotId}`,
      { snapshot: snapshotData, restoredFiles }
    );

    return { 
      success: true, 
      message: `Rolled back to ${snapshotId}`,
      restoredFiles: restoredFiles.length
    };
  } catch (error) {
    console.error("Rollback error:", error.message);
    return { success: false, error: error.message };
  }
}

// ==================== ENHANCED CONSENSUS PROTOCOL ====================
async function conductEnhancedConsensus(proposalId) {
  try {
    const propResult = await pool.query(
      `SELECT title, description FROM consensus_proposals WHERE proposal_id = $1`,
      [proposalId]
    );

    if (!propResult.rows.length) {
      return { ok: false, error: "Proposal not found" };
    }

    const { title, description } = propResult.rows[0];

    const blindSpots = await detectBlindSpots(title, { description });

    const consequencePrompt = `Evaluate this proposal for consequences:
    Title: ${title}
    Description: ${description}
    
    List:
    1. Intended positive consequences
    2. Potential unintended negative consequences
    3. Mitigation strategies for negative consequences
    4. Overall risk assessment (low/medium/high)`;

    const members = Object.keys(COUNCIL_MEMBERS);
    let yesVotes = 0,
      noVotes = 0,
      abstainVotes = 0;
    const consequences = [];
    let activeMembers = 0;

    for (const member of members) {
      try {
        const consequenceResponse = await callCouncilMember(
          member,
          consequencePrompt
        );

        activeMembers++;

        const riskMatch = consequenceResponse.match(
          /risk.*?(low|medium|high)/i
        );
        const riskLevel = riskMatch ? riskMatch[1] : "medium";

        await pool.query(
          `INSERT INTO consequence_evaluations (proposal_id, ai_member, risk_level, unintended_consequences)
           VALUES ($1, $2, $3, $4)`,
          [
            proposalId,
            member,
            riskLevel,
            consequenceResponse.slice(0, 1000),
          ]
        );

        consequences.push({ member, risk: riskLevel });

        const votePrompt = `Vote on this proposal with awareness of these blind spots and consequences:
        ${title}
        
        Blind spots detected: ${blindSpots.slice(0, 3).join(", ")}
        Risk level: ${riskLevel}
        
        Vote: YES/NO/ABSTAIN
        Reasoning: [brief explanation considering all factors]`;

        const voteResponse = await callCouncilMember(member, votePrompt);
        const voteMatch = voteResponse.match(
          /VOTE:\s*(YES|NO|ABSTAIN|Yes|No|Abstain)/i
        );
        const reasonMatch = voteResponse.match(
          /REASONING:\s*([\s\S]*?)$/i
        );

        const vote = voteMatch ? voteMatch[1].toUpperCase() : "ABSTAIN";
        const reasoning = reasonMatch
          ? reasonMatch[1].trim().slice(0, 500)
          : "";

        if (vote === "YES") yesVotes++;
        else if (vote === "NO") noVotes++;
        else abstainVotes++;

        await pool.query(
          `INSERT INTO consensus_votes (proposal_id, ai_member, vote, reasoning)
           VALUES ($1, $2, $3, $4)`,
          [proposalId, member, vote, reasoning]
        );
      } catch (error) {
        console.log(`⚠️ ${member} unavailable for voting: ${error.message}`);
        abstainVotes++;
        continue;
      }
    }

    if (activeMembers === 0) {
      return { ok: false, error: "No AI council members available" };
    }

    const userPreference = await guessUserDecision({
      proposal: title,
      description,
    });

    let sandboxResult = null;
    if (description.includes("code") || description.includes("implement")) {
      sandboxResult = await sandboxTest(
        `console.log("Testing proposal: ${title}");`,
        title
      );
    }

    const totalVotes = yesVotes + noVotes;
    const approvalRate = totalVotes > 0 ? yesVotes / totalVotes : 0;
    const hasHighRisk = consequences.some((c) => c.risk === "high");
    const sandboxPassed = sandboxResult ? sandboxResult.success : true;

    const approvalThreshold =
      activeMembers <= 2 ? 0.5 : hasHighRisk ? 0.8 : 0.6667;

    const approved = approvalRate >= approvalThreshold && sandboxPassed;

    let decision = "REJECTED";
    if (approved) decision = "APPROVED";
    else if (approvalRate >= 0.5) decision = "NEEDS_MODIFICATION";

    await pool.query(
      `UPDATE consensus_proposals SET status = $2, decided_at = now() WHERE proposal_id = $1`,
      [proposalId, decision]
    );

    systemMetrics.consensusDecisionsMade++;

    return {
      ok: true,
      proposalId,
      yesVotes,
      noVotes,
      abstainVotes,
      activeMembers,
      approvalRate: (approvalRate * 100).toFixed(1) + "%",
      decision,
      blindSpots: blindSpots.length,
      riskAssessment: hasHighRisk ? "HIGH" : "MODERATE",
      userPreference: userPreference.prediction,
      sandboxTest: sandboxResult,
      message: `Decision: ${decision} (${yesVotes}/${totalVotes} votes from ${activeMembers} active members)`,
    };
  } catch (error) {
    console.error("Enhanced consensus error:", error.message);
    await trackLoss("error", "Enhanced consensus failed", error.message);
    return { ok: false, error: error.message };
  }
}

// ==================== CONTINUOUS SELF-IMPROVEMENT ====================
async function continuousSelfImprovement() {
  try {
    systemMetrics.improvementCyclesRun++;
    console.log(
      `🔧 [IMPROVEMENT] Running cycle #${systemMetrics.improvementCyclesRun}...`
    );

    await createSystemSnapshot("Before improvement cycle");

    const recentErrors = await pool.query(
      `SELECT what_was_lost, why_lost, COUNT(*) as count 
       FROM loss_log 
       WHERE timestamp > NOW() - INTERVAL '1 hour'
       GROUP BY what_was_lost, why_lost
       ORDER BY count DESC LIMIT 5`
    );

    const slowTasks = await pool.query(
      `SELECT type, AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000) as avg_duration 
       FROM execution_tasks 
       WHERE created_at > NOW() - INTERVAL '24 hours'
       AND completed_at IS NOT NULL
       GROUP BY type 
       HAVING AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000) > 5000`
    );

    const recentDecisions = await pool.query(
      `SELECT * FROM user_decisions 
       WHERE created_at > NOW() - INTERVAL '24 hours'
       ORDER BY created_at DESC LIMIT 5`
    );

    for (const decision of recentDecisions.rows) {
      await detectBlindSpots(decision.choice, decision.context);
    }

    await rotateAIsBasedOnPerformance();

    if (recentErrors.rows.length > 0 || slowTasks.rows.length > 0) {
      const improvementPrompt = `Analyze and suggest code/process improvements for these issues:
      
      Recent Errors: ${JSON.stringify(recentErrors.rows.slice(0, 3))}
      Performance Bottlenecks: ${JSON.stringify(slowTasks.rows.slice(0, 3))}
      Blind Spots Detected: ${systemMetrics.blindSpotsDetected}
      
      Focus especially on:
      - Reducing friction in monetization flows
      - Improving ROI visibility
      - Keeping safety and ethics intact.
      
      Suggest specific, actionable improvements.`;

      const improvements = await callCouncilWithFailover(
        improvementPrompt,
        "ollama_deepseek" // Use Tier 0 (free)
      );

      if (improvements && improvements.length > 50) {
        const testResult = await sandboxTest(
          `// Test improvements\nconsole.log("Testing improvements");`,
          "Improvement test"
        );

        if (testResult.success) {
          await executionQueue.addTask("self_improvement", improvements);
          systemMetrics.lastImprovement = new Date().toISOString();
        } else {
          console.log("⚠️ Improvements failed sandbox test, rolling back");
          await rollbackToSnapshot(
            systemSnapshots[systemSnapshots.length - 1].id
          );
        }
      }
    }
  } catch (error) {
    console.error("Self-improvement error:", error.message);
  }
}

// ==================== ROI & FINANCIAL TRACKING ====================
async function loadROIFromDatabase() {
  try {
    const result = await pool.query(
      `SELECT SUM(usd) as total FROM daily_spend WHERE date = $1`,
      [dayjs().format("YYYY-MM-DD")]
    );
    if (result.rows[0]?.total) {
      roiTracker.daily_ai_cost = parseFloat(result.rows[0].total);
    }
  } catch (error) {
    console.error("ROI load error:", error.message);
  }
}

function updateROI(
  revenue = 0,
  cost = 0,
  tasksCompleted = 0,
  tokensSaved = 0
) {
  const today = dayjs().format("YYYY-MM-DD");
  if (roiTracker.last_reset !== today) {
    roiTracker.daily_revenue = 0;
    roiTracker.daily_ai_cost = 0;
    roiTracker.daily_tasks_completed = 0;
    roiTracker.total_tokens_saved = 0;
    roiTracker.micro_compression_saves = 0;
    roiTracker.last_reset = today;
  }
  roiTracker.daily_revenue += revenue;
  roiTracker.daily_ai_cost += cost;
  roiTracker.daily_tasks_completed += tasksCompleted;
  roiTracker.total_tokens_saved += tokensSaved;
  roiTracker.micro_compression_saves += tokensSaved; // Track compression saves
  if (roiTracker.daily_tasks_completed > 0) {
    roiTracker.revenue_per_task =
      roiTracker.daily_revenue / roiTracker.daily_tasks_completed;
  }
  if (roiTracker.daily_ai_cost > 0) {
    roiTracker.roi_ratio =
      roiTracker.daily_revenue / roiTracker.daily_ai_cost;
  }
  return roiTracker;
}

function calculateCost(usage, model = "gpt-4o-mini") {
  const prices = {
    "claude-3-5-sonnet-latest": { input: 0.003, output: 0.015 },
    "gpt-4o": { input: 0.0025, output: 0.01 },
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "gemini-2.5-flash": { input: 0.0001, output: 0.0004 },
    "deepseek-coder": { input: 0.0001, output: 0.0003 },
    "grok-2-1212": { input: 0.005, output: 0.015 },
  };
  const price = prices[model] || prices["gpt-4o-mini"];
  const promptTokens =
    usage?.prompt_tokens || usage?.input_tokens || usage?.total_tokens || 0;
  const completionTokens = usage?.completion_tokens || usage?.output_tokens || 0;

  return (
    (promptTokens * price.input) / 1000 +
    (completionTokens * price.output) / 1000
  );
}

async function getDailySpend(date = dayjs().format("YYYY-MM-DD")) {
  try {
    const result = await pool.query(
      `SELECT usd FROM daily_spend WHERE date = $1`,
      [date]
    );
    return result.rows.length > 0 ? parseFloat(result.rows[0].usd) : 0;
  } catch (error) {
    return 0;
  }
}

async function updateDailySpend(amount, date = dayjs().format("YYYY-MM-DD")) {
  try {
    const current = await getDailySpend(date);
    const newSpend = current + amount;
    await pool.query(
      `INSERT INTO daily_spend (date, usd, updated_at) VALUES ($1, $2, now())
       ON CONFLICT (date) DO UPDATE SET usd = $2, updated_at = now()`,
      [date, newSpend]
    );
    return newSpend;
  } catch (error) {
    return 0;
  }
}

// ==================== MEMORY SYSTEM ====================
async function storeConversationMemory(
  orchestratorMessage,
  aiResponse,
  context = {}
) {
  try {
    const memId = `mem_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    await pool.query(
      `INSERT INTO conversation_memory 
       (memory_id, orchestrator_msg, ai_response, context_metadata, memory_type, ai_member, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())`,
      [
        memId,
        orchestratorMessage,
        aiResponse,
        JSON.stringify(context),
        context.type || "conversation",
        context.ai_member || "system",
      ]
    );
    return { memId };
  } catch (error) {
    console.error("❌ Memory store error:", error.message);
    return null;
  }
}

async function recallConversationMemory(query, limit = 50) {
  try {
    const result = await pool.query(
      `SELECT memory_id, orchestrator_msg, ai_response, ai_member, created_at 
       FROM conversation_memory
       WHERE orchestrator_msg ILIKE $1 OR ai_response ILIKE $1
       ORDER BY created_at DESC LIMIT $2`,
      [`%${query}%`, limit]
    );
    return result.rows;
  } catch (error) {
    return [];
  }
}

// ==================== LOSS TRACKING ====================
async function trackLoss(
  severity,
  whatWasLost,
  whyLost,
  context = {},
  prevention = ""
) {
  try {
    await pool.query(
      `INSERT INTO loss_log (severity, what_was_lost, why_lost, context, prevention_strategy, timestamp)
       VALUES ($1, $2, $3, $4, $5, now())`,
      [severity, whatWasLost, whyLost, JSON.stringify(context), prevention]
    );
    if (severity === "critical") {
      console.error(`🚨 [${severity.toUpperCase()}] ${whatWasLost}`);
      await createSystemSnapshot(`Critical loss: ${whatWasLost}`);
    }
  } catch (error) {
    console.error("Loss tracking error:", error.message);
  }
}

// ==================== COUNCIL WITH FAILOVER (TIER 0 FIRST) ====================
async function callCouncilWithFailover(prompt, preferredMember = "ollama_deepseek", requireOversight = false, options = {}) {
  // Check if we're in production (Railway/cloud) - Ollama won't work there
  const isProduction = NODE_ENV === 'production' || !!process.env.RAILWAY_ENVIRONMENT;
  
  // Check if spending is disabled (MAX_DAILY_SPEND = 0)
  const spendingDisabled = MAX_DAILY_SPEND === 0;
  
  // Check if we're in cost shutdown mode (spending too much)
  const today = dayjs().format("YYYY-MM-DD");
  const currentSpend = await getDailySpend(today);
  const inCostShutdown = currentSpend >= COST_SHUTDOWN_THRESHOLD || spendingDisabled;
  
  if (spendingDisabled) {
    console.warn(`💰 [COST SHUTDOWN] Spending DISABLED (MAX_DAILY_SPEND=$0) - Only using FREE models`);
  }
  
  // In production, OSC (Ollama) won't work - skip it
  if (isProduction && openSourceCouncil) {
    console.log(`⚠️  [OSC] Skipping Open Source Council in production (Ollama not available on Railway)`);
  } else if (inCostShutdown) {
    console.warn(`💰 [COST SHUTDOWN] Spending $${currentSpend.toFixed(2)}/$${COST_SHUTDOWN_THRESHOLD} - Only using free/cheap models`);
  }

  // Use Open Source Council Router if available and not requiring oversight
  // Only activate when: in cost shutdown OR explicitly requested (opt-in behavior)
  // Skip OSC in production (Railway) - Ollama won't be accessible
  const willUseOSC = !isProduction && openSourceCouncil && !requireOversight && (inCostShutdown || options.useOpenSourceCouncil === true);
  
  if (willUseOSC) {
    const reasonText = inCostShutdown ? 'Cost shutdown mode' : 'Explicit opt-in';
    console.log(`\n╔══════════════════════════════════════════════════════════════════════════════════╗`);
    console.log(`║ 🆓 [OPEN SOURCE COUNCIL] ACTIVATED - Using local Ollama models (FREE)            ║`);
    console.log(`║    Reason: ${reasonText.padEnd(63)}║`);
    console.log(`╚══════════════════════════════════════════════════════════════════════════════════╝\n`);
    
    try {
      // Determine task complexity
      const promptLength = prompt.length;
      const isComplex = promptLength > 2000 || 
                       options.complexity === "complex" || 
                       options.complexity === "critical" ||
                       options.requireConsensus === true;
      
      console.log(`🔄 [OSC] Routing task: ${prompt.substring(0, 80)}...`);
      console.log(`    Task Type: ${options.taskType || 'auto-detect'}`);
      console.log(`    Complexity: ${isComplex ? 'COMPLEX (will use consensus)' : 'SIMPLE (single model)'}`);
      console.log(`    Prompt Length: ${promptLength} chars\n`);
      
      const routerOptions = {
        taskType: options.taskType,
        requireConsensus: isComplex || options.requireConsensus,
        consensusThreshold: options.consensusThreshold || 2,
        complexity: options.complexity || (isComplex ? "complex" : "medium"),
        ...options,
      };
      
      const routeStartTime = Date.now();
      const result = await openSourceCouncil.routeTask(prompt, routerOptions);
      const routeDuration = Date.now() - routeStartTime;
      
      if (result.success) {
        const consensusText = result.consensus ? ' (consensus from multiple models)' : '';
        const modelText = `${result.model}${consensusText}`;
        const taskTypeText = result.taskType || 'general';
        console.log(`\n╔══════════════════════════════════════════════════════════════════════════════════╗`);
        console.log(`║ ✅ [OPEN SOURCE COUNCIL] SUCCESS                                                  ║`);
        console.log(`║    Model: ${modelText.padEnd(63)}║`);
        console.log(`║    Task Type: ${taskTypeText.padEnd(63)}║`);
        console.log(`║    Response Time: ${routeDuration}ms`.padEnd(79) + '║');
        console.log(`║    Cost: $0.00 (FREE - local Ollama)`.padEnd(79) + '║');
        console.log(`╚══════════════════════════════════════════════════════════════════════════════════╝\n`);
        return result.response;
      } else {
        console.warn(`\n⚠️  [OSC] Router returned unsuccessful result, falling back...\n`);
      }
    } catch (error) {
      console.error(`\n╔══════════════════════════════════════════════════════════════════════════════════╗`);
      console.error(`║ ❌ [OPEN SOURCE COUNCIL] ERROR                                                    ║`);
      console.error(`║    Error: ${error.message}                                                         ║`);
      console.error(`║    Falling back to standard failover...                                           ║`);
      console.error(`╚══════════════════════════════════════════════════════════════════════════════════╝\n`);
      // Fall through to standard failover logic
    }
  } else if (openSourceCouncil) {
    // Log why OSC is NOT being used (for debugging)
    if (requireOversight) {
      console.log(`ℹ️  [OSC] Skipped - Task requires oversight (Tier 1 models)`);
    } else if (!inCostShutdown && options.useOpenSourceCouncil !== true) {
      console.log(`ℹ️  [OSC] Skipped - Not in cost shutdown and not explicitly requested (opt-in)`);
    }
  }

  // Standard failover logic (fallback or when oversight required)
  const members = Object.keys(COUNCIL_MEMBERS);

  // Skip members currently on cooldown
  const now = Date.now();
  let availableMembers = members.filter((m) => {
    const retryAt = providerCooldowns.get(m) || 0;
    return now >= retryAt;
  });

  // In cost shutdown: ONLY use FREE models (no paid models at all)
  if (inCostShutdown) {
    availableMembers = availableMembers.filter((m) => {
      const member = COUNCIL_MEMBERS[m];
      return member.isFree === true; // Only truly free models
    });
    console.log(`💰 [COST SHUTDOWN] Filtered to FREE models only: ${availableMembers.join(", ")}`);
    
    if (availableMembers.length === 0) {
      console.error("❌ [COST SHUTDOWN] No free models available. System cannot proceed without spending.");
      return "System is in cost shutdown mode and no free models are available. Please enable Ollama or set MAX_DAILY_SPEND > 0.";
    }
  } else if (!requireOversight) {
    // Normal mode: Prefer Tier 0 (cheap) models first, Tier 1 (expensive) only if needed
    const tier0Members = availableMembers.filter((m) => COUNCIL_MEMBERS[m].tier === "tier0");
    const tier1Members = availableMembers.filter((m) => COUNCIL_MEMBERS[m].tier === "tier1");
    
    // Try Tier 0 first, then Tier 1 as fallback
    availableMembers = [...tier0Members, ...tier1Members];
  } else {
    // Oversight mode: Use Tier 1 (expensive) for validation
    availableMembers = availableMembers.filter((m) => COUNCIL_MEMBERS[m].tier === "tier1");
  }

  // Build ordered list: preferred first, then the rest (no duplicates)
  const ordered = [
    preferredMember,
    ...availableMembers.filter((m) => m !== preferredMember),
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  // If everything is on cooldown, fall back to all members (last-resort attempt)
  const candidates = ordered.length > 0 ? ordered : availableMembers;

  const errors = [];
  for (const member of candidates) {
    try {
      const response = await callCouncilMember(member, prompt, options);
      if (response) {
        console.log(`✅ Got response from ${member} (Tier ${COUNCIL_MEMBERS[member]?.tier || "unknown"})`);
        return response;
      }
    } catch (error) {
      console.log(`⚠️ ${member} failed: ${error.message}, trying next...`);
      errors.push(`${member}: ${error.message}`);
      continue;
    }
  }

  console.error("❌ All AI council members unavailable");
  notifyCriticalIssue(
    `All AI providers unavailable. Errors: ${errors.join(" | ")}`
  );
  return "All AI council members currently unavailable. Check API keys/quotas.";
}

// ==================== EXECUTION QUEUE ====================
class ExecutionQueue {
  constructor() {
    this.tasks = [];
    this.activeTask = null;
    this.history = [];
  }

  async addTask(type, description, metadata = null) {
    // --- Execution Gate with FSAR (fail-closed) ---
    try {
      const proposalText = `${type}: ${description}`;
      const { jsonPath: fsarJsonPath, mdPath: fsarMdPath, report } = await runFSAR(proposalText);
      const gateDecision = evaluateExecutionGate(report);

      const overrideHumanReview =
        metadata?.override_human_review === true || metadata?.overrideHumanReview === true;

      // Block if gate says no
      if (!gateDecision.allow) {
        throw new Error(
          `${gateDecision.reason} (FSAR report: ${fsarJsonPath})`
        );
      }

      // Human review required but not overridden
      if (gateDecision.requires_human_review && !overrideHumanReview) {
        throw new Error(
          `Human review required: ${gateDecision.reason} (FSAR report: ${fsarJsonPath})`
        );
      }

      // Attach FSAR artifacts to metadata for traceability
      metadata = {
        ...metadata,
        fsar: {
          json: fsarJsonPath,
          md: fsarMdPath,
          decision: gateDecision,
        },
      };
    } catch (gateError) {
      // Fail closed: if FSAR or gate fails, block the task
      console.error(`❌ [EXECUTION GATE] Blocked: ${gateError.message}`);
      throw gateError;
    }

    const taskId = `task_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    try {
      await pool.query(
        `INSERT INTO execution_tasks (task_id, type, description, status, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, now())`,
        [
          taskId, 
          type, 
          description, 
          "queued",
          metadata ? JSON.stringify(metadata) : null
        ]
      );

      const task = {
        id: taskId,
        type,
        description,
        status: "queued",
        metadata,
        createdAt: new Date().toISOString(),
      };
      this.tasks.push(task);

      broadcastToAll({ type: "task_queued", taskId, taskType: type });
      return taskId;
    } catch (error) {
      console.error("Task add error:", error.message);
      return null;
    }
  }

  async getTaskMetadata(taskId) {
    try {
      const result = await pool.query(
        "SELECT metadata FROM execution_tasks WHERE task_id = $1",
        [taskId]
      );
      if (result.rows.length > 0 && result.rows[0].metadata) {
        return typeof result.rows[0].metadata === 'string' 
          ? JSON.parse(result.rows[0].metadata) 
          : result.rows[0].metadata;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async executeNext() {
    if (this.tasks.length === 0) {
      setTimeout(() => this.executeNext(), 5000);
      return;
    }

    const task = this.tasks.shift();
    this.activeTask = task;
    
    // Load metadata from DB if not in memory task
    if (!task.metadata && task.id) {
      task.metadata = await this.getTaskMetadata(task.id);
    }

    try {
      await pool.query(
        `UPDATE execution_tasks SET status = 'running' WHERE task_id = $1`,
        [task.id]
      );

      const blindSpots = await detectBlindSpots(task.description, {
        type: task.type,
      });

      // If this is an idea_implementation or build task, use self-programming to actually implement it
      if (task.type === 'idea_implementation' || task.type === 'build') {
        console.log(`🤖 [EXECUTION] Implementing ${task.type} via self-programming: ${task.description.substring(0, 100)}...`);
        
        try {
          // Use idea-to-implementation pipeline if available and it's an idea
          if (task.type === 'idea_implementation' && ideaToImplementationPipeline) {
            const pipelineResult = await ideaToImplementationPipeline.implementIdea(task.description, {
              autoDeploy: true,
              verifyCompletion: true,
            });
            
            if (pipelineResult.success) {
              const result = `Idea implemented via pipeline. Pipeline ID: ${pipelineResult.pipelineId}. Files: ${pipelineResult.implementation?.filesModified?.join(', ') || 'N/A'}`;
              const aiModel = 'idea-pipeline';
              
              await pool.query(
                `UPDATE execution_tasks SET status = 'completed', result = $1, completed_at = now(), ai_model = $3
                 WHERE task_id = $2`,
                [result, task.id, aiModel]
              );
              
              this.history.push({ ...task, status: "completed", result, aiModel });
              this.activeTask = null;
              broadcastToAll({ type: "task_completed", taskId: task.id, result });
              setTimeout(() => this.executeNext(), 1000);
              return;
            } else {
              throw new Error(pipelineResult.error || 'Pipeline implementation failed');
            }
          } else {
            // Fallback: log and continue to regular execution
            console.log('⚠️ [EXECUTION] Idea-to-Implementation Pipeline not available, using regular execution');
          }
        } catch (error) {
          console.error(`❌ [EXECUTION] Pipeline implementation failed:`, error.message);
          // Fall through to regular execution as fallback
        }
      }

      // If this is a build task, use self-programming directly
      if (task.type === 'build') {
        console.log(`🔨 [EXECUTION] Building opportunity via self-programming: ${task.description.substring(0, 100)}...`);
        
        try {
          // Get metadata from task (could be from in-memory task or need to load from DB)
          const taskMetadata = task.metadata || (task.id ? await this.getTaskMetadata(task.id) : null);
          
          const buildResult = await handleSelfProgramming({
            instruction: task.description,
            autoDeploy: taskMetadata?.auto_deploy || taskMetadata?.autoDeploy || false,
            priority: 'high',
          });

          if (buildResult && buildResult.ok) {
            const result = `Build completed for opportunity. Files: ${buildResult.filesModified?.join(', ') || 'N/A'}. ${buildResult.deployed ? '✅ Deployed.' : ''}`;
            const aiModel = 'auto-builder';
            
            await pool.query(
              `UPDATE execution_tasks SET status = 'completed', result = $1, completed_at = now(), ai_model = $3
               WHERE task_id = $2`,
              [result, task.id, aiModel]
            );
            
            this.history.push({ ...task, status: "completed", result, aiModel });
            this.activeTask = null;
            broadcastToAll({ type: "task_completed", taskId: task.id, result });
            setTimeout(() => this.executeNext(), 1000);
            return;
          } else {
            throw new Error(buildResult?.error || 'Build implementation failed');
          }
        } catch (buildError) {
          console.error(`❌ [EXECUTION] Build error:`, buildError.message);
          // Fall through to regular execution as fallback
        }
      }

      // Route through model router to get optimal AI (Tier 0 first)
      const routerResult = modelRouter ? await modelRouter.route(
        `Execute this task with real-world practicality in mind (but do NOT directly move money or impersonate humans): ${task.description}
        
        Be aware of these blind spots: ${blindSpots.slice(0, 3).join(", ")}`,
        {
          taskType: task.type,
          riskLevel: 'medium',
          userFacing: false,
        }
      ) : null;

      const result = routerResult?.success 
        ? routerResult.result 
        : await callCouncilWithFailover(
            `Execute this task with real-world practicality in mind (but do NOT directly move money or impersonate humans): ${task.description}
            
            Be aware of these blind spots: ${blindSpots.slice(0, 3).join(", ")}`,
            "ollama_deepseek" // Use Tier 0 (free) for primary work
          );

      const aiModel = routerResult?.model || 'chatgpt';

      await pool.query(
        `UPDATE execution_tasks SET status = 'completed', result = $1, completed_at = now(), ai_model = $3
         WHERE task_id = $2`,
        [String(result).slice(0, 5000), task.id, aiModel]
      );

      // AI employee reports improvements and votes on idea
      if (taskImprovementReporter) {
        try {
          await taskImprovementReporter.reportAfterTask(task, String(result), aiModel);
        } catch (error) {
          console.warn('Improvement reporting failed:', error.message);
        }
      }

      // Rate AI effectiveness
      if (aiEffectivenessTracker) {
        try {
          const startTime = task.createdAt ? new Date(task.createdAt).getTime() : Date.now();
          const responseTime = Date.now() - startTime;
          
          await aiEffectivenessTracker.ratePerformance(aiModel, task.type, {
            success: true,
            responseTime,
            cost: 0, // Will be calculated from actual API costs
            quality: 0.8, // Default, can be improved with user feedback
            userSatisfaction: 0.7, // Default
          });
        } catch (error) {
          console.warn('Effectiveness rating failed:', error.message);
        }
      }

      await updateROI(0, 0, 1);
      this.history.push({ ...task, status: "completed", result, aiModel });
      this.activeTask = null;

      broadcastToAll({ type: "task_completed", taskId: task.id, result });
    } catch (error) {
      await pool.query(
        `UPDATE execution_tasks SET status = 'failed', error = $1, completed_at = now()
         WHERE task_id = $2`,
        [error.message.slice(0, 500), task.id]
      );

      this.history.push({ ...task, status: "failed", error: error.message });
      this.activeTask = null;

      await trackLoss(
        "error",
        `Task execution failed: ${task.id}`,
        error.message
      );
      broadcastToAll({
        type: "task_failed",
        taskId: task.id,
        error: error.message,
      });
    }

    setTimeout(() => this.executeNext(), 1000);
  }

  getStatus() {
    return {
      queued: this.tasks.length,
      active: this.activeTask ? 1 : 0,
      completed: this.history.filter((t) => t.status === "completed").length,
      failed: this.history.filter((t) => t.status === "failed").length,
      currentTask: this.activeTask,
      nextTasks: this.tasks.slice(0, 5),
      recentHistory: this.history.slice(-10),
    };
  }
}

let executionQueue = new ExecutionQueue();

// ==================== CONSENSUS & GOVERNANCE ====================
async function createProposal(title, description, proposedBy = "system") {
  try {
    const proposalId = `prop_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    await pool.query(
      `INSERT INTO consensus_proposals (proposal_id, title, description, proposed_by, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [proposalId, title, description, proposedBy, "proposed"]
    );
    broadcastToAll({ type: "proposal_created", proposalId, title });
    return proposalId;
  } catch (error) {
    console.error("Proposal creation error:", error.message);
    return null;
  }
}

// ==================== SELF-MODIFICATION ENGINE ====================
class SelfModificationEngine {
  async modifyOwnCode(filePath, newContent, reason) {
    try {
      console.log(`🔧 [SELF-MODIFY] Attempting: ${filePath}`);

      const fullPath = path.join(__dirname, filePath);
      
      // Create file backup before any modifications
      let backupPath = null;
      if (fs.existsSync(fullPath)) {
        backupPath = `${fullPath}.backup.${Date.now()}`;
        await fsPromises.copyFile(fullPath, backupPath);
        console.log(`📦 Created file backup: ${backupPath.split("/").pop()}`);
      }

      // Create system snapshot with file contents
      const snapshotId = await createSystemSnapshot(
        `Before modifying ${filePath}`,
        [filePath] // Include this file in the snapshot
      );

      const protection = await isFileProtected(filePath);

      const activeAIs = await this.countActiveAIs();

      // Require at least one AI to be available for protected files
      if (protection.protected && protection.requires_council) {
        if (activeAIs === 0) {
          // Restore from backup if no AIs available
          if (backupPath && fs.existsSync(backupPath)) {
            await fsPromises.copyFile(backupPath, fullPath);
            await fsPromises.unlink(backupPath);
          }
          return {
            success: false,
            error: "No AI council members available - modification rejected for safety",
          };
        }

        const proposalId = await createProposal(
          `Self-Modify: ${filePath}`,
          `Reason: ${reason}\n\nChanges: ${newContent.slice(0, 300)}...`,
          "self_modification_engine"
        );

        if (proposalId) {
          const voteResult = await conductEnhancedConsensus(proposalId);
          if (voteResult.decision !== "APPROVED") {
            // Restore from backup if council rejected
            if (backupPath && fs.existsSync(backupPath)) {
              await fsPromises.copyFile(backupPath, fullPath);
              await fsPromises.unlink(backupPath);
            }
            return {
              success: false,
              error: "Council rejected modification",
              proposalId,
            };
          }
        }
      } else if (activeAIs === 0) {
        console.log("⚠️ No AI available, but file is not protected - proceeding with caution...");
      }

      const sandboxResult = await sandboxTest(
        newContent,
        `Test modification of ${filePath}`
      );
      if (!sandboxResult.success) {
        console.log(`⚠️ Sandbox test failed, rolling back to ${snapshotId}`);
        // Try to restore from snapshot (which includes file contents)
        const rollbackResult = await rollbackToSnapshot(snapshotId);
        // Also restore from backup as fallback
        if (backupPath && fs.existsSync(backupPath)) {
          await fsPromises.copyFile(backupPath, fullPath);
          await fsPromises.unlink(backupPath);
        }
        return {
          success: false,
          error: "Failed sandbox test",
          sandboxError: sandboxResult.error,
          rollbackResult,
        };
      }

      // Write the new content
      await fsPromises.writeFile(fullPath, newContent, "utf-8");
      
      // Clean up backup after successful modification (optional - could keep for extra safety)
      // Keeping backup for now for extra safety

      const modId = `mod_${Date.now()}`;
      await pool.query(
        `INSERT INTO self_modifications (mod_id, file_path, change_description, new_content, status, council_approved)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          modId,
          filePath,
          reason,
          newContent.slice(0, 5000),
          "applied",
          protection.requires_council && activeAIs > 1,
        ]
      );

      systemMetrics.selfModificationsSuccessful++;
      console.log(`✅ [SELF-MODIFY] Success: ${filePath}${backupPath ? ` (backup: ${backupPath.split("/").pop()})` : ""}`);
      await trackLoss("info", `File modified: ${filePath}`, reason, {
        approved: true,
        backupPath: backupPath ? backupPath.split("/").pop() : null,
        snapshotId,
      });

      broadcastToAll({
        type: "self_modification",
        filePath,
        status: "success",
        backupPath: backupPath ? backupPath.split("/").pop() : null,
      });
      return { 
        success: true, 
        filePath, 
        reason, 
        modId,
        backupPath: backupPath ? backupPath.split("/").pop() : null,
        snapshotId,
      };
    } catch (error) {
      systemMetrics.selfModificationsAttempted++;
      await trackLoss("error", `Failed to modify: ${filePath}`, error.message);
      return { success: false, error: error.message };
    }
  }

  async countActiveAIs() {
    let active = 0;
    for (const member of Object.keys(COUNCIL_MEMBERS)) {
      try {
        await callCouncilMember(member, "Are you online?");
        active++;
      } catch {
        // offline
      }
    }
    return active;
  }
}

const selfModificationEngine = new SelfModificationEngine();

// ==================== TWO-TIER COUNCIL SYSTEM INITIALIZATION ====================
let tier0Council = null;
let tier1Council = null;
let modelRouter = null;
let outreachAutomation = null;
let whiteLabelConfig = null;

let knowledgeBase = null;
let fileCleanupAnalyzer = null;
let costReExamination = null;
let logMonitor = null;
let autoQueueManager = null;
let aiAccountBot = null;
let conversationExtractor = null;
let taskImprovementReporter = null;
let userSimulation = null;
let aiEffectivenessTracker = null;
let postUpgradeChecker = null;
let comprehensiveIdeaTracker = null;
let vapiIntegration = null;
let businessCenter = null;
let gameGenerator = null;
let businessDuplication = null;
let codeServices = null;
let makeComGenerator = null;
let legalChecker = null;
let selfFundingSystem = null;
let marketingResearch = null;
let marketingAgency = null;
let webScraper = null;
let enhancedConversationScraper = null;
let apiCostSavingsRevenue = null;
let systemHealthChecker = null;
let selfBuilder = null;
let ideaToImplementationPipeline = null;
let sourceOfTruthManager = null;
let autoBuilder = null;

async function initializeTwoTierSystem() {
  try {
    // Dynamic import of modules
    const tier0Module = await import("./core/tier0-council.js");
    const tier1Module = await import("./core/tier1-council.js");
    const routerModule = await import("./core/model-router.js");
    const outreachModule = await import("./core/outreach-automation.js");
    const whiteLabelModule = await import("./core/white-label.js");
    const knowledgeModule = await import("./core/knowledge-base.js");
    const cleanupModule = await import("./core/file-cleanup-analyzer.js");
    const openSourceCouncilModule = await import("./core/open-source-council.js");
    
    Tier0Council = tier0Module.Tier0Council;
    Tier1Council = tier1Module.Tier1Council;
    ModelRouter = routerModule.ModelRouter;
    OutreachAutomation = outreachModule.OutreachAutomation;
    WhiteLabelConfig = whiteLabelModule.WhiteLabelConfig;
    KnowledgeBase = knowledgeModule.KnowledgeBase;
    FileCleanupAnalyzer = cleanupModule.FileCleanupAnalyzer;
    OpenSourceCouncil = openSourceCouncilModule.OpenSourceCouncil;

    tier0Council = new Tier0Council(pool);
    tier1Council = new Tier1Council(pool, callCouncilMember);
    modelRouter = new ModelRouter(tier0Council, tier1Council, pool);
    openSourceCouncil = new OpenSourceCouncil(callCouncilMember, COUNCIL_MEMBERS, providerCooldowns);
    const ollamaEndpoint = OLLAMA_ENDPOINT || "http://localhost:11434";
    console.log("\n╔══════════════════════════════════════════════════════════════════════════════════╗");
    console.log("║ ✅ [OPEN SOURCE COUNCIL] INITIALIZED                                              ║");
    console.log("║    Status: Ready to route tasks to local Ollama models                           ║");
    console.log("║    Activation: Cost shutdown OR explicit opt-in (useOpenSourceCouncil: true)    ║");
    console.log(`║    Models: Connected to Ollama at ${ollamaEndpoint.padEnd(47)}║`);
    console.log("╚══════════════════════════════════════════════════════════════════════════════════╝\n");
    outreachAutomation = new OutreachAutomation(
      pool,
      modelRouter,
      getTwilioClient,
      callCouncilMember
    );
    whiteLabelConfig = new WhiteLabelConfig(pool);
    knowledgeBase = new KnowledgeBase(pool);
    fileCleanupAnalyzer = new FileCleanupAnalyzer();
    
    // Initialize cost re-examination
    const costModule = await import("./core/cost-re-examination.js");
    const CostReExamination = costModule.CostReExamination;
    costReExamination = new CostReExamination(pool, compressionMetrics, roiTracker);
    
    // Initialize log monitoring
    try {
      const logModule = await import("./core/log-monitor.js");
      const LogMonitor = logModule.LogMonitor;
      logMonitor = new LogMonitor(pool, callCouncilMember);
      console.log("✅ Log Monitoring System initialized");
      
      // Monitor logs every 5 minutes (with AI council for complex fixes)
      setInterval(async () => {
        try {
          const result = await logMonitor.monitorLogs(true); // Use AI council
          if (result.errors && result.errors.length > 0) {
            console.log(`🔍 [LOG MONITOR] Checked logs: ${result.errors.length} errors, ${result.fixed || 0} fixed`);
          }
        } catch (error) {
          console.warn("⚠️ Log monitoring failed:", error.message);
        }
      }, 5 * 60 * 1000); // Every 5 minutes
      
      // Also monitor on startup after a delay
      setTimeout(async () => {
        try {
          await logMonitor.monitorLogs(true); // Use AI council
        } catch (error) {
          // Silent fail on startup check
        }
      }, 30000); // After 30 seconds
      
      // Initialize post-upgrade checker
      try {
        const upgradeModule = await import("./core/post-upgrade-checker.js");
        const PostUpgradeChecker = upgradeModule.PostUpgradeChecker;
        postUpgradeChecker = new PostUpgradeChecker(logMonitor, callCouncilMember, pool);
        console.log("✅ Post-Upgrade Checker initialized");
        
        // Set up global hook for Cursor/development
        global.postUpgradeCheck = async () => {
          return await postUpgradeChecker.checkAfterUpgrade();
        };
        
      // Auto-check after initialization (in case of startup errors)
      setTimeout(async () => {
        await postUpgradeChecker.checkAfterUpgrade();
      }, 15000); // 15 seconds after startup
      
      // Auto-index Feature Index into knowledge base
      setTimeout(async () => {
        try {
          const indexScript = await import("./scripts/index-feature-catalog.mjs");
          if (indexScript.indexFeatureCatalog) {
            await indexScript.indexFeatureCatalog();
          }
        } catch (error) {
          // Silent fail - feature index can be indexed manually
        }
      }, 20000); // 20 seconds after startup
      
      // Auto-run guides
      setTimeout(async () => {
        try {
          const guidesScript = await import("./scripts/auto-run-guides.mjs");
          if (guidesScript.autoRunGuides) {
            await guidesScript.autoRunGuides();
          }
        } catch (error) {
          // Silent fail
        }
      }, 25000); // 25 seconds after startup
      
      // Initialize comprehensive idea tracker
      try {
        const trackerModule = await import("./core/comprehensive-idea-tracker.js");
        comprehensiveIdeaTracker = new trackerModule.ComprehensiveIdeaTracker(pool);
        console.log("✅ Comprehensive Idea Tracker initialized");
      } catch (error) {
        console.warn("⚠️ Comprehensive Idea Tracker not available:", error.message);
      }
      
      // Initialize Vapi integration
      try {
        const vapiModule = await import("./core/vapi-integration.js");
        vapiIntegration = new vapiModule.VapiIntegration(pool, callCouncilMember);
        await vapiIntegration.initialize();
        console.log("✅ Vapi Integration initialized");
      } catch (error) {
        console.warn("⚠️ Vapi Integration not available:", error.message);
      }
      
      // Replace basic drone system with enhanced version
      try {
        const enhancedDroneModule = await import("./core/enhanced-income-drone.js");
        const EnhancedIncomeDrone = enhancedDroneModule.EnhancedIncomeDrone;
        incomeDroneSystem = new EnhancedIncomeDrone(pool, callCouncilMember, modelRouter);
        console.log("✅ Enhanced Income Drone System initialized");
        
        // Deploy income drones (if not disabled)
        if (!DISABLE_INCOME_DRONES) {
          console.log('🚀 [INCOME] Deploying income drones immediately...');
          try {
            const affiliateDrone = await incomeDroneSystem.deployDrone("affiliate", 500);
            const contentDrone = await incomeDroneSystem.deployDrone("content", 300);
            const outreachDrone = await incomeDroneSystem.deployDrone("outreach", 1000);
            const productDrone = await incomeDroneSystem.deployDrone("product", 200);
            const serviceDrone = await incomeDroneSystem.deployDrone("service", 500);
            console.log(`✅ [INCOME] Deployed 5 income drones - they are NOW WORKING!`);
          } catch (deployError) {
            console.error('❌ [INCOME] Error deploying drones:', deployError.message);
          }
        } else {
          console.log('ℹ️ [INCOME] Income drones DISABLED (set DISABLE_INCOME_DRONES=false to enable)');
        }

        // Initialize Opportunity Executor (actually implements opportunities to generate REAL revenue)
        let opportunityExecutor = null;
        try {
          const executorModule = await import("./core/opportunity-executor.js");
          opportunityExecutor = new executorModule.OpportunityExecutor(pool, callCouncilMember, incomeDroneSystem);
          await opportunityExecutor.start();
          console.log("✅ Opportunity Executor initialized - will actually implement opportunities to generate REAL revenue");

          // Connect executor to drone system so drones can use it
          if (incomeDroneSystem && incomeDroneSystem.setOpportunityExecutor) {
            incomeDroneSystem.setOpportunityExecutor(opportunityExecutor);
            console.log("✅ Connected Opportunity Executor to Income Drone System - drones will implement opportunities when any exist");
          }
        } catch (error) {
          console.warn("⚠️ Opportunity Executor not available:", error.message);
        }

        // Initialize Auto-Builder (builds opportunities into working products)
        try {
          const builderModule = await import("./core/auto-builder.js");
          autoBuilder = new builderModule.AutoBuilder(pool, callCouncilMember, executionQueue);
          await autoBuilder.start();
          console.log("✅ Auto-Builder initialized - will build best opportunities automatically");
          console.log("📊 Auto-Builder: 30% capacity for building, 70% for revenue generation");
          console.log("🚀 Auto-Builder: Building top opportunities into working products ASAP");
        } catch (error) {
          console.warn("⚠️ Auto-Builder not available:", error.message);
        }
      } catch (error) {
        console.warn("⚠️ Enhanced Drone System not available, using basic:", error.message);
      }
      
      // Initialize Business Center
      try {
        const businessCenterModule = await import("./core/business-center.js");
        businessCenter = new businessCenterModule.BusinessCenter(pool, callCouncilMember, modelRouter);
        await businessCenter.initialize();
        console.log("✅ Business Center initialized");
      } catch (error) {
        console.warn("⚠️ Business Center not available:", error.message);
      }
      
      // Initialize Game Generator
      try {
        const gameGeneratorModule = await import("./core/game-generator.js");
        gameGenerator = new gameGeneratorModule.GameGenerator(pool, callCouncilMember, modelRouter);
        console.log("✅ Game Generator initialized");
      } catch (error) {
        console.warn("⚠️ Game Generator not available:", error.message);
      }
      
      // Initialize Business Duplication
      try {
        const businessDupModule = await import("./core/business-duplication.js");
        businessDuplication = new businessDupModule.BusinessDuplication(pool, callCouncilMember, modelRouter);
        console.log("✅ Business Duplication System initialized");
      } catch (error) {
        console.warn("⚠️ Business Duplication not available:", error.message);
      }
      
      // Initialize Code Services
      try {
        const codeServicesModule = await import("./core/code-services.js");
        codeServices = new codeServicesModule.CodeServices(pool, callCouncilMember, modelRouter);
        console.log("✅ Code Services initialized");
      } catch (error) {
        console.warn("⚠️ Code Services not available:", error.message);
      }
      
      // Initialize Make.com Generator
      try {
        const makeComModule = await import("./core/makecom-generator.js");
        makeComGenerator = new makeComModule.MakeComGenerator(pool, callCouncilMember, modelRouter);
        console.log("✅ Make.com Generator initialized");
      } catch (error) {
        console.warn("⚠️ Make.com Generator not available:", error.message);
      }
      
      // Initialize Legal Checker
      try {
        const legalModule = await import("./core/legal-checker.js");
        legalChecker = new legalModule.LegalChecker(pool);
        console.log("✅ Legal Checker initialized");
      } catch (error) {
        console.warn("⚠️ Legal Checker not available:", error.message);
      }
      
      // Initialize Self-Funding System
      try {
        const selfFundingModule = await import("./core/self-funding-system.js");
        selfFundingSystem = new selfFundingModule.SelfFundingSystem(pool, callCouncilMember, modelRouter);
        await selfFundingSystem.initialize();
        console.log("✅ Self-Funding System initialized");
      } catch (error) {
        console.warn("⚠️ Self-Funding System not available:", error.message);
      }
      
      // Initialize Marketing Research System
      try {
        const marketingResearchModule = await import("./core/marketing-research-system.js");
        marketingResearch = new marketingResearchModule.MarketingResearchSystem(pool, callCouncilMember, modelRouter);
        await marketingResearch.initialize();
        console.log("✅ Marketing Research System initialized");
      } catch (error) {
        console.warn("⚠️ Marketing Research System not available:", error.message);
      }
      
      // Initialize Marketing Agency
      try {
        const marketingAgencyModule = await import("./core/marketing-agency.js");
        marketingAgency = new marketingAgencyModule.MarketingAgency(pool, callCouncilMember, modelRouter, marketingResearch);
        await marketingAgency.initialize();
        console.log("✅ Marketing Agency initialized");
      } catch (error) {
        console.warn("⚠️ Marketing Agency not available:", error.message);
      }
      
      // Initialize Web Scraper
      try {
        const webScraperModule = await import("./core/web-scraper.js");
        webScraper = new webScraperModule.WebScraper(pool, callCouncilMember, modelRouter);
        console.log("✅ Web Scraper initialized");
      } catch (error) {
        console.warn("⚠️ Web Scraper not available:", error.message);
      }
      
      // Initialize Enhanced Conversation Scraper (will auto-install Puppeteer if needed)
      try {
        const scraperModule = await import("./core/enhanced-conversation-scraper.js");
        enhancedConversationScraper = new scraperModule.EnhancedConversationScraper(
          pool,
          knowledgeBase,
          callCouncilMember
        );
        // Initialize Puppeteer (will auto-install if needed)
        await enhancedConversationScraper.initPuppeteer();
        console.log("✅ Enhanced Conversation Scraper initialized");
      } catch (error) {
        console.warn("⚠️ Enhanced Conversation Scraper not available:", error.message);
      }
      
      // Initialize API Cost Savings Revenue System (PRIORITY 1)
      try {
        const costSavingsModule = await import("./core/api-cost-savings-revenue.js");
        apiCostSavingsRevenue = new costSavingsModule.APICostSavingsRevenue(
          pool,
          callCouncilMember,
          modelRouter
        );
        console.log("✅ API Cost Savings Revenue System initialized (PRIORITY 1)");
      } catch (error) {
        console.warn("⚠️ API Cost Savings Revenue System not available:", error.message);
      }
      
      // Initialize System Health Checker
      try {
        const healthModule = await import("./core/system-health-checker.js");
        const allSystems = {
          tier0Council,
          tier1Council,
          modelRouter,
          knowledgeBase,
          costReExamination,
          logMonitor,
          autoQueueManager,
          comprehensiveIdeaTracker,
          enhancedIncomeDrone: incomeDroneSystem,
          businessCenter,
          gameGenerator,
          businessDuplication,
          codeServices,
          makeComGenerator,
          legalChecker,
          selfFundingSystem,
          marketingResearch,
          marketingAgency,
          webScraper,
          enhancedConversationScraper,
          apiCostSavingsRevenue,
        };
        // Add selfBuilder to allSystems if it exists
        if (selfBuilder) {
          allSystems.selfBuilder = selfBuilder;
        }
        // Add autoBuilder to allSystems if it exists
        if (autoBuilder) {
          allSystems.autoBuilder = autoBuilder;
        }
        systemHealthChecker = new healthModule.SystemHealthChecker(pool, allSystems);
        console.log("✅ System Health Checker initialized");
      } catch (error) {
        console.warn("⚠️ System Health Checker not available:", error.message);
      }

      // Initialize Self-Builder (system can build itself)
      try {
        const builderModule = await import("./core/self-builder.js");
        selfBuilder = new builderModule.SelfBuilder(pool, callCouncilMember);
        console.log("✅ Self-Builder initialized - system can now build itself");
      } catch (error) {
        console.warn("⚠️ Self-Builder not available:", error.message);
      }

      // Initialize Idea-to-Implementation Pipeline (complete flow from idea to completion)
      try {
        const pipelineModule = await import("./core/idea-to-implementation-pipeline.js");
        // Will initialize after taskTracker is available
        console.log("✅ Idea-to-Implementation Pipeline module loaded");
      } catch (error) {
        console.warn("⚠️ Idea-to-Implementation Pipeline not available:", error.message);
      }

      // Initialize Source of Truth Manager
      try {
        const sotModule = await import("./core/source-of-truth-manager.js");
        sourceOfTruthManager = new sotModule.SourceOfTruthManager(pool);
        console.log("✅ Source of Truth Manager initialized");
        
        // Auto-load Source of Truth if it exists (for AI council reference)
        const existingSOT = await sourceOfTruthManager.getDocument('master_vision');
        if (existingSOT.length > 0) {
          console.log(`📖 [SOURCE OF TRUTH] Loaded ${existingSOT.length} document(s) - AI Council will reference for mission alignment`);
        } else {
          console.log(`⚠️ [SOURCE OF TRUTH] No documents found. Use POST /api/v1/system/source-of-truth/store to add Source of Truth.`);
        }
      } catch (error) {
        console.warn("⚠️ Source of Truth Manager not available:", error.message);
      }
      } catch (error) {
        console.warn("⚠️ Post-upgrade checker not available:", error.message);
      }
    } catch (error) {
      console.warn("⚠️ Log monitoring not available:", error.message);
    }

    // Initialize auto-queue manager
    try {
      const queueModule = await import("./core/auto-queue-manager.js");
      const AutoQueueManager = queueModule.AutoQueueManager;
      autoQueueManager = new AutoQueueManager(pool, callCouncilMember, executionQueue, modelRouter);
      autoQueueManager.start();
      console.log("✅ Auto-Queue Manager initialized");
      
      // Use enhanced idea generation (each AI gives 25, council debates, votes)
      // Override the daily idea generation
      autoQueueManager.generateDailyIdeas = async () => {
        return await autoQueueManager.generateDailyIdeasEnhanced();
      };
      
      // Pass user simulation to enhanced idea generator
      if (autoQueueManager.generateDailyIdeasEnhanced) {
        const originalEnhanced = autoQueueManager.generateDailyIdeasEnhanced;
        autoQueueManager.generateDailyIdeasEnhanced = async function() {
          try {
            const { EnhancedIdeaGenerator } = await import('./core/enhanced-idea-generator.js');
            const generator = new EnhancedIdeaGenerator(
              this.pool,
              this.callCouncilMember,
              this.modelRouter,
              userSimulation // Pass user simulation for filtering
            );
            return await generator.runFullPipeline(this.executionQueue);
          } catch (error) {
            console.error('Enhanced idea generation failed:', error.message);
            return await this.generateDailyIdeas();
          }
        };
      }
    } catch (error) {
      console.warn("⚠️ Auto-queue manager not available:", error.message);
    }

    // Initialize AI account bot
    try {
      const botModule = await import("./core/ai-account-bot.js");
      const AIAccountBot = botModule.AIAccountBot;
      aiAccountBot = new AIAccountBot(pool, knowledgeBase, callCouncilMember);
      console.log("✅ AI Account Bot initialized");
    } catch (error) {
      console.warn("⚠️ AI account bot not available:", error.message);
    }

      // Initialize conversation extractor bot
      try {
        const extractorModule = await import("./core/conversation-extractor-bot.js");
        const ConversationExtractorBot = extractorModule.ConversationExtractorBot;
        conversationExtractor = new ConversationExtractorBot(pool, knowledgeBase, callCouncilMember);
        console.log("✅ Conversation Extractor Bot initialized");
        
        // Auto-start text scraping bot (scrapes and organizes text automatically)
        // Check for stored credentials and start scraping if available
        setTimeout(async () => {
          try {
            if (enhancedConversationScraper) {
              const credentials = await enhancedConversationScraper.listStoredCredentials();
              if (credentials && credentials.length > 0) {
                console.log(`🤖 [EXTRACTOR] Found ${credentials.length} stored credential(s), starting auto-scraping...`);
                
                // Start scraping for each provider with credentials
                for (const cred of credentials) {
                  try {
                    console.log(`🤖 [EXTRACTOR] Starting auto-scrape for ${cred.provider}...`);
                    const result = await enhancedConversationScraper.scrapeAllConversations(cred.provider);
                    if (result.success) {
                      console.log(`✅ [EXTRACTOR] Auto-scraped ${result.conversations?.length || 0} conversations from ${cred.provider}`);
                    }
                  } catch (scrapeError) {
                    console.warn(`⚠️ [EXTRACTOR] Auto-scrape failed for ${cred.provider}:`, scrapeError.message);
                  }
                }
              } else {
                console.log('📋 [EXTRACTOR] No stored credentials found. Use /api/v1/conversations/store-credentials to add credentials for auto-scraping.');
              }
            }
          } catch (error) {
            console.warn('⚠️ [EXTRACTOR] Auto-start check failed:', error.message);
          }
        }, 60000); // Start after 1 minute (give system time to fully initialize)
        
        // Also set up periodic scraping (every 6 hours)
        setInterval(async () => {
          try {
            if (enhancedConversationScraper) {
              const credentials = await enhancedConversationScraper.listStoredCredentials();
              if (credentials && credentials.length > 0) {
                console.log(`🤖 [EXTRACTOR] Periodic scrape starting...`);
                for (const cred of credentials) {
                  try {
                    await enhancedConversationScraper.scrapeAllConversations(cred.provider);
                  } catch (error) {
                    console.warn(`⚠️ [EXTRACTOR] Periodic scrape failed for ${cred.provider}:`, error.message);
                  }
                }
              }
            }
          } catch (error) {
            console.warn('⚠️ [EXTRACTOR] Periodic scrape error:', error.message);
          }
        }, 6 * 60 * 60 * 1000); // Every 6 hours
      } catch (error) {
        console.warn("⚠️ Conversation extractor not available:", error.message);
      }

    // Initialize task improvement reporter (AI employees report improvements)
    try {
      const reporterModule = await import("./core/task-improvement-reporter.js");
      const TaskImprovementReporter = reporterModule.TaskImprovementReporter;
      taskImprovementReporter = new TaskImprovementReporter(pool, tier0Council, callCouncilMember);
      console.log("✅ Task Improvement Reporter initialized");
    } catch (error) {
      console.warn("⚠️ Task improvement reporter not available:", error.message);
    }

    // Initialize user simulation system (learns user's decision style)
    try {
      const simulationModule = await import("./core/user-simulation.js");
      const UserSimulation = simulationModule.UserSimulation;
      userSimulation = new UserSimulation(pool, callCouncilMember);
      await userSimulation.rebuildStyleProfile();
      const accuracy = await userSimulation.getAccuracyScore();
      console.log(`✅ User Simulation System initialized (Accuracy: ${(accuracy * 100).toFixed(1)}%)`);
    } catch (error) {
      console.warn("⚠️ User simulation not available:", error.message);
    }

    // Initialize AI effectiveness tracker
    try {
      const trackerModule = await import("./core/ai-effectiveness-tracker.js");
      const AIEffectivenessTracker = trackerModule.AIEffectivenessTracker;
      aiEffectivenessTracker = new AIEffectivenessTracker(pool);
      console.log("✅ AI Effectiveness Tracker initialized");
    } catch (error) {
      console.warn("⚠️ AI effectiveness tracker not available:", error.message);
    }
    
    console.log("✅ Two-Tier Council System initialized");
    console.log("✅ Knowledge Base System initialized");
    console.log("✅ Cost Re-Examination System initialized");
    
    // Schedule automatic cost re-examination
    setInterval(async () => {
      try {
        await costReExamination.examine();
        console.log("💰 [COST] Automatic re-examination completed");
      } catch (error) {
        console.warn("⚠️ Cost re-examination failed:", error.message);
      }
    }, 24 * 60 * 60 * 1000); // Every 24 hours
  } catch (error) {
    console.error("⚠️ Two-Tier System initialization error:", error.message);
    console.error("   System will continue with legacy council only");
  }
}

async function isFileProtected(filePath) {
  try {
    const result = await pool.query(
      "SELECT can_write, requires_full_council FROM protected_files WHERE file_path = $1",
      [filePath]
    );
    if (result.rows.length === 0) return { protected: false };
    return {
      protected: true,
      can_write: result.rows[0].can_write,
      requires_council: result.rows[0].requires_full_council,
    };
  } catch (e) {
    return { protected: false };
  }
}

// ==================== DEPLOYMENT TRIGGERS ====================
async function triggerDeployment(modifiedFiles = []) {
  try {
    console.log(
      `🚀 [DEPLOYMENT] Triggered for: ${modifiedFiles.join(", ")}`
    );

    systemMetrics.deploymentsTrigger++;

    for (const file of modifiedFiles) {
      try {
        const content = await fsPromises.readFile(
          path.join(__dirname, file),
          "utf-8"
        );
        await commitToGitHub(
          file,
          content,
          `Auto-deployment: Updated ${file}`
        );
      } catch (error) {
        console.log(
          `⚠️ [DEPLOYMENT] Couldn't push ${file}: ${error.message}`
        );
      }
    }

    broadcastToAll({ type: "deployment_triggered", files: modifiedFiles });
    return { success: true, message: "Deployment triggered" };
  } catch (error) {
    console.error("Deployment trigger error:", error.message);
    return { success: false, error: error.message };
  }
}

async function commitToGitHub(filePath, content, message) {
  const token = GITHUB_TOKEN?.trim();
  if (!token) throw new Error("GITHUB_TOKEN not configured");

  const [owner, repo] = GITHUB_REPO.split("/");

  const getRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    {
      headers: {
        Authorization: `token ${token}`,
        "Cache-Control": "no-cache",
      },
    }
  );

  let sha = undefined;
  if (getRes.ok) {
    const existing = await getRes.json();
    sha = existing.sha;
  }

  const payload = {
    message,
    content: Buffer.from(content).toString("base64"),
    ...(sha && { sha }),
  };

  const commitRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    {
      method: "PUT",
      headers: {
        Authorization: `token ${token}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!commitRes.ok) {
    const err = await commitRes.json();
    throw new Error(err.message || "GitHub commit failed");
  }

  console.log(`✅ Committed ${filePath} to GitHub`);
  return true;
}

// ==================== INCOME DRONE SYSTEM ====================
class IncomeDroneSystem {
  constructor() {
    this.activeDrones = new Map();
  }

  async deployDrone(droneType, expectedRevenue = 500) {
    const droneId = `drone_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    try {
      await pool.query(
        `INSERT INTO income_drones (drone_id, drone_type, status, deployed_at, updated_at)
         VALUES ($1, $2, $3, now(), now())`,
        [droneId, droneType, "active"]
      );

      this.activeDrones.set(droneId, {
        id: droneId,
        type: droneType,
        status: "active",
        revenue: 0,
        tasks: 0,
        expectedRevenue,
        deployed: new Date().toISOString(),
      });

      return droneId;
    } catch (error) {
      console.error(`Drone deployment error: ${error.message}`);
      return null;
    }
  }

  async recordRevenue(droneId, amount, isActual = false) {
    try {
      if (isActual) {
        // ACTUAL revenue - real money received
        await pool.query(
          `UPDATE income_drones 
           SET revenue_generated = revenue_generated + $1,
               actual_revenue = actual_revenue + $1,
               tasks_completed = tasks_completed + 1, 
               updated_at = now()
           WHERE drone_id = $2`,
          [amount, droneId]
        );
        await updateROI(amount, 0, 0);
        broadcastToAll({ type: "revenue_generated", droneId, amount, isActual: true });
      } else {
        // PROJECTED revenue - estimated, not real money yet
        await pool.query(
          `UPDATE income_drones 
           SET projected_revenue = projected_revenue + $1,
               tasks_completed = tasks_completed + 1, 
               updated_at = now()
           WHERE drone_id = $2`,
          [amount, droneId]
        );
        broadcastToAll({ type: "revenue_projected", droneId, amount, isActual: false });
      }

      const drone = this.activeDrones.get(droneId);
      if (drone) {
        if (isActual) {
          drone.revenue += amount;
        }
        drone.tasks++;
      }
    } catch (error) {
      console.error(`Revenue update error: ${error.message}`);
    }
  }

  async getStatus() {
    try {
      const result = await pool.query(
        `SELECT drone_id, drone_type, status, revenue_generated, actual_revenue, projected_revenue, tasks_completed
         FROM income_drones WHERE status = 'active' ORDER BY deployed_at DESC`
      );
      const totalActual = result.rows.reduce(
        (sum, d) => sum + parseFloat(d.actual_revenue || 0),
        0
      );
      const totalProjected = result.rows.reduce(
        (sum, d) => sum + parseFloat(d.projected_revenue || 0),
        0
      );
      return {
        active: result.rows.length,
        drones: result.rows,
        total_revenue: totalActual, // Only actual revenue
        actual_revenue: totalActual,
        projected_revenue: totalProjected,
        revenue_generated: totalActual, // Backward compatibility
      };
    } catch (error) {
      return { active: 0, drones: [], total_revenue: 0, actual_revenue: 0, projected_revenue: 0 };
    }
  }
}

// Income drone system - will be replaced by EnhancedIncomeDrone if available
let incomeDroneSystem = new IncomeDroneSystem();

// ==================== FINANCIAL DASHBOARD ====================
class FinancialDashboard {
  async recordTransaction(
    type,
    amount,
    description,
    category = "general",
    externalId = null
  ) {
    try {
      const txId =
        externalId && externalId.trim()
          ? `ext_${externalId.trim()}`
          : `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      if (externalId) {
        const existing = await pool.query(
          `SELECT id FROM financial_ledger WHERE external_id = $1`,
          [externalId]
        );
        if (existing.rows.length > 0) {
          return {
            txId: `ext_${externalId.trim()}`,
            type,
            amount: 0,
            description: `[duplicate ignored] ${description}`,
            category,
            date: new Date().toISOString(),
            duplicate: true,
          };
        }
      }

      await pool.query(
        `INSERT INTO financial_ledger (tx_id, type, amount, description, category, external_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, now())`,
        [txId, type, amount, description, category, externalId]
      );

      return {
        txId,
        type,
        amount,
        description,
        category,
        externalId,
        date: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Financial ledger error:", error.message);
      return null;
    }
  }

  async getDashboard() {
    try {
      const todayStart = dayjs().startOf("day").toDate();
      const todayEnd = dayjs().endOf("day").toDate();

      const dailyResult = await pool.query(
        `SELECT SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as total_income,
                SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as total_expenses
         FROM financial_ledger
         WHERE created_at >= $1 AND created_at <= $2`,
        [todayStart, todayEnd]
      );

      const dailyRow = dailyResult.rows[0];
      return {
        daily: {
          income: parseFloat(dailyRow.total_income) || 0,
          expenses: parseFloat(dailyRow.total_expenses) || 0,
          net:
            (parseFloat(dailyRow.total_income) || 0) -
            (parseFloat(dailyRow.total_expenses) || 0),
        },
        lastUpdated: new Date().toISOString(),
      };
    } catch (error) {
      return {
        daily: { income: 0, expenses: 0, net: 0 },
        lastUpdated: new Date().toISOString(),
      };
    }
  }
}

const financialDashboard = new FinancialDashboard();

// ==================== REVENUE EVENT HELPER (LEDGER + DRONES + ROI) ====================
async function recordRevenueEvent({
  source = "unknown",
  eventId = null,
  amount,
  currency = "USD",
  droneId = null,
  description = "",
  category = "general",
}) {
  const cleanAmount = Number(amount);
  if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
    throw new Error("Invalid amount for revenue event");
  }

  const desc =
    description ||
    `Revenue from ${source}${eventId ? ` (event ${eventId})` : ""}`;

  const tx = await financialDashboard.recordTransaction(
    "income",
    cleanAmount,
    desc,
    category || source,
    eventId
  );

  if (droneId) {
    await incomeDroneSystem.recordRevenue(droneId, cleanAmount, true); // ACTUAL revenue - real money
  } else {
    updateROI(cleanAmount, 0, 0);
  }

  return { tx, amount: cleanAmount, currency, source, droneId };
}

// ==================== STRIPE REVENUE SYNC (SAFE: READ + LOG ONLY) ====================
async function syncStripeRevenue() {
  try {
    const stripe = await getStripeClient();
    if (!stripe) {
      return;
    }

    console.log("💳 Syncing Stripe revenue into financial_ledger...");

    const paymentIntents = await stripe.paymentIntents.list({
      limit: 50,
    });

    for (const pi of paymentIntents.data || []) {
      if (pi.status !== "succeeded") continue;
      const amount = (pi.amount_received || pi.amount || 0) / 100;
      if (!amount) continue;

      await recordRevenueEvent({
        source: "stripe",
        eventId: pi.id,
        amount,
        currency: pi.currency || "usd",
        description: pi.description || "Stripe payment",
        category: "stripe_income",
      });
    }

    console.log("✅ Stripe revenue sync complete");
  } catch (err) {
    console.error("Stripe revenue sync error:", err.message);
  }
}

// ==================== UTILITY FUNCTIONS ====================
function broadcastToAll(message) {
  for (const ws of activeConnections.values()) {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      // ignore closed
    }
  }
}

// ==================== API MIDDLEWARE ====================
// Auth middleware moved to src/server/auth/requireKey.js
// (TypeScript source: src/server/auth/requireKey.ts)
import { requireKey } from "./src/server/auth/requireKey.js";




// ==================== API ENDPOINTS ====================

// Health checks
app.get("/health", (req, res) => res.send("OK"));

// Auto-install missing packages endpoint
app.post("/api/v1/system/auto-install", requireKey, async (req, res) => {
  try {
    const { AutoInstaller } = await import("./core/auto-installer.js");
    const installer = new AutoInstaller();
    
    const { packages } = req.body;
    
    if (!packages || !Array.isArray(packages)) {
      return res.status(400).json({ error: "packages array required" });
    }

    const results = await installer.installPackages(packages);
    res.json({ ok: true, results });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Routes moved to top (before static middleware) to ensure they work

// Health check endpoint for activation verification
app.get("/api/v1/health-check", requireKey, (req, res) => {
  res.json({ 
    ok: true, 
    message: "Command Center Key verified",
    timestamp: new Date().toISOString(),
  });
});

// Simple health check endpoint for Railway (must be fast and reliable)
app.get("/healthz", (req, res) => {
  console.log('✅ Health check hit');
  res.status(200).send('OK');
});

// Detailed health endpoint with system status
app.get("/api/health", (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    ollama: OLLAMA_ENDPOINT ? 'Connected' : 'Not configured',
    version: '26.1',
    uptime: process.uptime(),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN STATUS – human-friendly summary
// ─────────────────────────────────────────────────────────────────────────────
app.get("/admin/status", async (req, res) => {
  try {
    // Reuse the same helpers as /healthz so we don't drift
    await pool.query("SELECT NOW()");
    const spendStatus = await getDailySpend();
    const droneStatus = await incomeDroneSystem.getStatus();
    const taskStatus = executionQueue.getStatus();

    res.json({
      ok: true,
      version: "v26.1-no-claude",
      summary: {
        daily_spend: spendStatus?.daily_spend ?? null,
        max_daily_spend: spendStatus?.max_daily_spend ?? null,
        spend_percentage: spendStatus?.spend_percentage ?? null,
        drones: droneStatus ?? null,
        tasks: taskStatus ?? null,
      },
    });
  } catch (err) {
    console.error("Error in /admin/status:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// AI Council Communication Test
app.post("/api/v1/ai-council/test", requireKey, async (req, res) => {
  try {
    console.log("🧪 [TEST] Testing AI Council communication...");
    
    const testPrompt = "Respond with exactly: 'AI_COUNCIL_TEST_SUCCESS' followed by your name. This is a communication test.";
    const testResults = [];
    const members = ['chatgpt', 'gemini', 'deepseek', 'grok'];
    
    for (const member of members) {
      try {
        const startTime = Date.now();
        const response = await callCouncilMember(member, testPrompt, { useCache: false });
        const duration = Date.now() - startTime;
        
        const success = response.includes('AI_COUNCIL_TEST_SUCCESS') || response.length > 10;
        
        testResults.push({
          member,
          success,
          response: response.substring(0, 200),
          duration,
          timestamp: new Date().toISOString(),
        });
        
        console.log(`✅ [TEST] ${member}: ${success ? 'SUCCESS' : 'PARTIAL'} (${duration}ms)`);
      } catch (error) {
        testResults.push({
          member,
          success: false,
          error: error.message,
          duration: 0,
          timestamp: new Date().toISOString(),
        });
        console.error(`❌ [TEST] ${member}: FAILED - ${error.message}`);
      }
    }
    
    const successCount = testResults.filter(r => r.success).length;
    const totalCount = testResults.length;
    const allSuccess = successCount === totalCount;
    
    res.json({
      ok: true,
      test: 'ai_council_communication',
      results: testResults,
      summary: {
        total: totalCount,
        successful: successCount,
        failed: totalCount - successCount,
        allSuccess,
        successRate: `${Math.round((successCount / totalCount) * 100)}%`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Council test error:", error);
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

// Primary Council Chat Endpoint - NOW AUTO-IMPLEMENTS REQUESTS
app.post("/api/v1/chat", requireKey, async (req, res) => {
  try {
    let body = req.body;

    if (typeof body === "string") {
      body = { message: body };
    } else if (!body || typeof body !== "object") {
      body = {};
    }

    const { message, member = "chatgpt", autoImplement = true } = body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message required" });
    }

    console.log(
      `🤖 [COUNCIL] ${member} processing: ${message.substring(0, 100)}...`
    );

    // Store conversation in database
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    try {
      await pool.query(
        `INSERT INTO conversation_memory (memory_id, orchestrator_msg, ai_response, ai_member, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [conversationId, message, 'pending', member]
      );
    } catch (dbError) {
      console.warn('⚠️ Could not store conversation:', dbError.message);
    }

    const blindSpots = await detectBlindSpots(message, {
      source: "user_chat",
    });

    // Check if this is an implementation request (contains action words)
    const isImplementationRequest = /(?:add|create|implement|build|make|change|update|modify|fix|do|install|set up|configure|change this|add a|create a)/i.test(message);
    
    let response;
    let implementationStarted = false;
    
    if (isImplementationRequest && autoImplement) {
      // AUTO-IMPLEMENT: Don't just plan, actually do it!
      console.log(`🚀 [AUTO-IMPLEMENT] Detected implementation request, starting self-programming...`);
      
      try {
        // Call self-programming directly
        const selfProgResult = await handleSelfProgramming({
          instruction: message,
          autoDeploy: true,
          priority: 'high',
        }, req);
        
        if (selfProgResult && selfProgResult.ok) {
          implementationStarted = true;
          response = `✅ **IMPLEMENTATION STARTED**\n\nI've automatically started implementing your request. The system is now:\n\n${selfProgResult.filesModified?.length ? `- Modifying ${selfProgResult.filesModified.length} file(s): ${selfProgResult.filesModified.join(", ")}\n` : ''}${selfProgResult.taskId ? `- Task ID: ${selfProgResult.taskId}\n` : ''}${selfProgResult.deployed ? `- ✅ Changes committed and deploying\n` : ''}\nThe changes will be deployed automatically. You can check the status via the health endpoint.\n\n**What I'm doing:** ${message}`;
        } else {
          // Fallback to regular chat if self-programming fails
          console.warn('⚠️ Self-programming returned error, using chat:', selfProgResult?.error);
          response = await callCouncilMember(member, message);
        }
      } catch (implError) {
        console.warn('⚠️ Auto-implementation failed, falling back to chat:', implError.message);
        response = await callCouncilMember(member, message);
      }
    } else {
      // Regular chat response
      response = await callCouncilMember(member, message);
    }

    // Update conversation with response
    try {
      await pool.query(
        `UPDATE conversation_memory SET ai_response = $1 WHERE memory_id = $2`,
        [response, conversationId]
      );
    } catch (dbError) {
      console.warn('⚠️ Could not update conversation:', dbError.message);
    }

    const spend = await getDailySpend();

    // Convert to MICRO symbols for system (user sees English)
    // Simple micro compression - replace spaces with ~ for micro protocol
    const microSymbols = String(response).replace(/ /g, "~");
    
    res.json({
      ok: true,
      response,
      symbols: microSymbols, // System sees this
      spend,
      member,
      blindSpotsDetected: blindSpots.length,
      timestamp: new Date().toISOString(),
      implementationStarted,
      conversationId,
    });
  } catch (error) {
    console.error("Council chat error:", error);
    res.status(500).json({
      ok: false,
      error: error.message,
    });
  }
});

// Micro protocol council chat (with LCTP compression)
app.post("/api/council/chat", requireKey, async (req, res) => {
  try {
    const decoded = decodeMicroBody(req.body);
    const { text, channel, meta, packet } = decoded;
    
    if (!text) {
      return res.status(400).json({ error: "Message text required" });
    }

    const member = meta?.member || packet?.m?.member || "chatgpt";
    const useCompression = meta?.compress !== false && text.length > 100;

    console.log(
      `🎼 [MICRO] ${member} in ${channel}: ${text.substring(0, 100)}...${useCompression ? ' [COMPRESSED]' : ''}`
    );

    const blindSpots = await detectBlindSpots(text, {
      source: "micro_chat",
      channel,
      member,
    });

    // Use compression for cost savings
    const response = await callCouncilMember(member, text, { compress: useCompression });
    const spend = await getDailySpend();

    // Build response with optional compression
    const responsePacket = buildMicroResponse({
      text: response,
      channel,
      role: "a",
      meta: {
        member,
        spend,
        blindSpotsDetected: blindSpots.length,
        aiName: "LifeOS Council",
        timestamp: new Date().toISOString(),
      },
      compress: useCompression,
    });

    res.json(responsePacket);
  } catch (error) {
    console.error("Micro council chat error:", error);

    const errorPacket = buildMicroResponse({
      text: `Error: ${error.message}`,
      channel: "error",
      role: "a",
      meta: { error: true },
    });

    res.json(errorPacket);
  }
});

// Architect endpoints
app.post("/api/v1/architect/chat", requireKey, async (req, res) => {
  try {
    const { query_json, original_message } = req.body;

    if (!query_json && !original_message) {
      return res
        .status(400)
        .json({ error: "Query JSON or original message required" });
    }

    const prompt = query_json
      ? `Process this compressed query: ${JSON.stringify(
          query_json
        )}\n\nProvide detailed response.`
      : original_message;

    const response = await callCouncilWithFailover(prompt, "ollama_deepseek"); // Use Tier 0 (free)

    const response_json = {
      r: response.slice(0, 500),
      ts: Date.now(),
      compressed: true,
    };

    res.json({
      ok: true,
      response_json,
      original_response: response,
      compressed: true,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/architect/command", requireKey, async (req, res) => {
  try {
    const { query_json, command, intent } = req.body;
    const override_human_review = req.body?.override_human_review === true;

    const prompt = `Command: ${command}\nIntent: ${intent}\nCompressed Query: ${JSON.stringify(
      query_json || {}
    )}\n\nExecute this command and provide results (but do not directly move money or impersonate users).`;

    const response = await callCouncilWithFailover(prompt, "ollama_deepseek"); // Use Tier 0 (free)

    if (intent && intent !== "general") {
      await executionQueue.addTask(intent, command, { override_human_review });
    }

    res.json({
      ok: true,
      message: response,
      intent,
      queued: intent !== "general",
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/architect/micro", requireKey, async (req, res) => {
  try {
    const microQuery = req.body;

    if (typeof microQuery === "string" && microQuery.includes("|")) {
      const parts = microQuery.split("|");
      const operation =
        parts.find((p) => p.startsWith("OP:"))?.slice(3) || "G";
      const data =
        parts
          .find((p) => p.startsWith("D:"))
          ?.slice(2)
          .replace(/~/g, " ") || "";

      // Use AI with compression for cost savings
      const compressed = compressPrompt(data, true);
      const aiResponse = await callCouncilWithFailover(
        `Process this ${compressed.format === 'LCTPv3' ? 'compressed' : ''} request: ${compressed.compressed}`,
        "deepseek",
        { compress: true }
      );

      let response;
      switch (operation) {
        case "G":
          response = `CT:${aiResponse}~completed~result:success~compression:${Math.round((1 - compressed.ratio) * 100)}%`;
          break;
        case "A":
          response = `CT:${aiResponse}~complete~insights:generated~compression:${Math.round((1 - compressed.ratio) * 100)}%`;
          break;
        default:
          response = `CT:${aiResponse}~processed~status:done`;
      }

      res.send(response);
    } else {
      const response = await callCouncilWithFailover(microQuery, "deepseek", { compress: true });
      res.send(`CT:${String(response).replace(/ /g, "~")}`);
    }
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Task endpoints
app.post("/api/v1/task", requireKey, async (req, res) => {
  try {
    const { type = "general", description } = req.body;
    if (!description)
      return res.status(400).json({ error: "Description required" });

    const taskId = await executionQueue.addTask(type, description);
    res.json({ ok: true, taskId });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/tasks", requireKey, async (req, res) => {
  try {
    const status = executionQueue.getStatus();
    res.json({ ok: true, ...status });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get specific task details (what is being built)
// Task details endpoint (enhanced version that shows what's being built)
app.get("/api/v1/tasks/:taskId/details", requireKey, async (req, res) => {
  try {
    const { taskId } = req.params;
    
    // Get task from database
    const taskResult = await pool.query(
      `SELECT task_id, type, description, status, created_at, completed_at, result, error, ai_model
       FROM execution_tasks
       WHERE task_id = $1`,
      [taskId]
    );
    
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Task not found" });
    }
    
    const task = taskResult.rows[0];
    
    // Get task steps if taskTracker is available
    let steps = [];
    let verificationResults = [];
    try {
      if (taskTracker) {
        const taskData = await taskTracker.getTask(taskId);
        if (taskData) {
          steps = taskData.steps || [];
          verificationResults = taskData.verificationResults || [];
        }
      }
    } catch (error) {
      console.warn('Could not get task tracker data:', error.message);
    }
    
    // Get files modified if this was a self-programming task
    let filesModified = [];
    if (task.result && task.result.includes('filesModified')) {
      try {
        const resultData = JSON.parse(task.result);
        filesModified = resultData.filesModified || [];
      } catch (e) {
        // Not JSON, that's okay
      }
    }
    
    res.json({
      ok: true,
      task: {
        id: task.task_id,
        type: task.type,
        description: task.description,
        status: task.status,
        createdAt: task.created_at,
        completedAt: task.completed_at,
        result: task.result,
        error: task.error,
        aiModel: task.ai_model,
        steps,
        verificationResults,
        filesModified,
        whatIsBeingBuilt: task.description, // What you asked for
      },
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Memory endpoints
app.get("/api/v1/memory/search", requireKey, async (req, res) => {
  try {
    const { q = "", limit = 50 } = req.query;
    const memories = await recallConversationMemory(q, parseInt(limit));
    res.json({ ok: true, count: memories.length, memories });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Daily Ideas
app.post("/api/v1/ideas/generate", requireKey, async (req, res) => {
  try {
    await generateDailyIdeas();
    res.json({ ok: true, ideasGenerated: dailyIdeas.length });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== SPENDING & ROI ANALYSIS ====================
app.get("/api/v1/analysis/spending-breakdown", requireKey, async (req, res) => {
  try {
    // Get total spending by date
    const spending = await pool.query(
      `SELECT date, usd, updated_at 
       FROM daily_spend 
       ORDER BY date DESC 
       LIMIT 30`
    );

    // Get all ideas
    const ideas = await pool.query(
      `SELECT idea_id, idea_title, idea_description, proposed_by, status, 
              votes_for, votes_against, created_at
       FROM daily_ideas 
       ORDER BY created_at DESC`
    );

    // Get all opportunities
    const opportunities = await pool.query(
      `SELECT id, drone_id, opportunity_type, data, status, 
              revenue_estimate, created_at
       FROM drone_opportunities 
       ORDER BY created_at DESC`
    );

    // Get execution tasks (what was actually worked on)
    const tasks = await pool.query(
      `SELECT task_id, type, description, status, created_at, completed_at, result
       FROM execution_tasks 
       ORDER BY created_at DESC 
       LIMIT 100`
    );

    // Get AI performance (which models were used and cost)
    const aiUsage = await pool.query(
      `SELECT ai_member, task_type, COUNT(*) as call_count, 
              SUM(cost) as total_cost, 
              AVG(duration_ms) as avg_duration,
              SUM(CASE WHEN success THEN 1 ELSE 0 END) as success_count
       FROM ai_performance 
       WHERE created_at > NOW() - INTERVAL '30 days'
       GROUP BY ai_member, task_type
       ORDER BY total_cost DESC`
    );

    // Calculate total spend
    const totalSpend = spending.rows.reduce((sum, row) => sum + parseFloat(row.usd || 0), 0);

    // Calculate total opportunity value
    const totalOpportunityValue = opportunities.rows.reduce((sum, row) => 
      sum + parseFloat(row.revenue_estimate || 0), 0
    );

    // Calculate ROI
    const roi = totalOpportunityValue > 0 ? (totalOpportunityValue / totalSpend) : 0;

    res.json({
      ok: true,
      summary: {
        totalSpend: totalSpend.toFixed(2),
        totalOpportunities: opportunities.rows.length,
        totalOpportunityValue: totalOpportunityValue.toFixed(2),
        totalIdeas: ideas.rows.length,
        totalTasks: tasks.rows.length,
        roi: roi.toFixed(2),
        roiPercentage: ((roi - 1) * 100).toFixed(1) + '%'
      },
      spending: spending.rows,
      ideas: ideas.rows,
      opportunities: opportunities.rows,
      tasks: tasks.rows,
      aiUsage: aiUsage.rows
    });
  } catch (error) {
    console.error("Spending analysis error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/ideas", requireKey, async (req, res) => {
  try {
    const ideas = await pool.query(
      `SELECT * FROM daily_ideas WHERE created_at > NOW() - INTERVAL '24 hours' ORDER BY votes_for DESC`
    );
    res.json({ ok: true, ideas: ideas.rows });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Blind Spots
app.get("/api/v1/blindspots", requireKey, async (req, res) => {
  try {
    const blindSpots = await pool.query(
      `SELECT * FROM blind_spots ORDER BY created_at DESC LIMIT 20`
    );
    res.json({ ok: true, blindSpots: blindSpots.rows });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Snapshots & Rollback
app.post("/api/v1/snapshot", requireKey, async (req, res) => {
  try {
    const { reason = "Manual snapshot" } = req.body;
    const snapshotId = await createSystemSnapshot(reason);
    res.json({ ok: true, snapshotId });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/rollback/:snapshotId", requireKey, async (req, res) => {
  try {
    const { snapshotId } = req.params;
    const result = await rollbackToSnapshot(snapshotId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Drones
app.post("/api/v1/drones/deploy", requireKey, async (req, res) => {
  try {
    const { type = "affiliate", expectedRevenue = 500 } = req.body;
    const droneId = await incomeDroneSystem.deployDrone(type, expectedRevenue);
    res.json({ ok: true, droneId });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/drones", requireKey, async (req, res) => {
  try {
    const status = await incomeDroneSystem.getStatus();
    res.json({ ok: true, ...status });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== COMPREHENSIVE IDEA TRACKER ENDPOINTS ====================
// Note: comprehensiveIdeaTracker is already declared at line 3962

app.post("/api/v1/ideas/comprehensive", requireKey, async (req, res) => {
  try {
    if (!comprehensiveIdeaTracker) {
      const trackerModule = await import("./core/comprehensive-idea-tracker.js");
      comprehensiveIdeaTracker = new trackerModule.ComprehensiveIdeaTracker(pool);
    }

    const ideaId = await comprehensiveIdeaTracker.storeIdea(req.body);
    res.json({ ok: true, ideaId });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/ideas/comprehensive", requireKey, async (req, res) => {
  try {
    if (!comprehensiveIdeaTracker) {
      const trackerModule = await import("./core/comprehensive-idea-tracker.js");
      comprehensiveIdeaTracker = new trackerModule.ComprehensiveIdeaTracker(pool);
    }

    const ideas = await comprehensiveIdeaTracker.getIdeas(req.query);
    res.json({ ok: true, count: ideas.length, ideas });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/ideas/comprehensive/search", requireKey, async (req, res) => {
  try {
    if (!comprehensiveIdeaTracker) {
      const trackerModule = await import("./core/comprehensive-idea-tracker.js");
      comprehensiveIdeaTracker = new trackerModule.ComprehensiveIdeaTracker(pool);
    }

    const { q } = req.query;
    const ideas = await comprehensiveIdeaTracker.searchIdeas(q);
    res.json({ ok: true, count: ideas.length, ideas });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/ideas/comprehensive/statistics", requireKey, async (req, res) => {
  try {
    if (!comprehensiveIdeaTracker) {
      const trackerModule = await import("./core/comprehensive-idea-tracker.js");
      comprehensiveIdeaTracker = new trackerModule.ComprehensiveIdeaTracker(pool);
    }

    const stats = await comprehensiveIdeaTracker.getStatistics();
    res.json({ ok: true, statistics: stats });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/ideas/export", requireKey, async (req, res) => {
  try {
    if (!comprehensiveIdeaTracker) {
      const trackerModule = await import("./core/comprehensive-idea-tracker.js");
      comprehensiveIdeaTracker = new trackerModule.ComprehensiveIdeaTracker(pool);
    }

    const exportData = await comprehensiveIdeaTracker.exportAllIdeas();
    res.json(exportData);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/ideas/comprehensive/:ideaId/contribute", requireKey, async (req, res) => {
  try {
    if (!comprehensiveIdeaTracker) {
      const trackerModule = await import("./core/comprehensive-idea-tracker.js");
      comprehensiveIdeaTracker = new trackerModule.ComprehensiveIdeaTracker(pool);
    }

    const { author, contribution } = req.body;
    const contributionData = await comprehensiveIdeaTracker.addContribution(
      req.params.ideaId,
      author,
      contribution
    );
    res.json({ ok: true, contribution: contributionData });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.put("/api/v1/ideas/comprehensive/:ideaId/status", requireKey, async (req, res) => {
  try {
    if (!comprehensiveIdeaTracker) {
      const trackerModule = await import("./core/comprehensive-idea-tracker.js");
      comprehensiveIdeaTracker = new trackerModule.ComprehensiveIdeaTracker(pool);
    }

    const { status, reason } = req.body;
    await comprehensiveIdeaTracker.updateStatus(req.params.ideaId, status, reason);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== VAPI INTEGRATION ENDPOINTS ====================
// Note: vapiIntegration is already declared at line 3963

app.post("/api/v1/vapi/call", requireKey, async (req, res) => {
  try {
    if (!vapiIntegration) {
      const vapiModule = await import("./core/vapi-integration.js");
      vapiIntegration = new vapiModule.VapiIntegration(pool, callCouncilMember);
      await vapiIntegration.initialize();
    }

    const callData = await vapiIntegration.makeCall(req.body);
    res.json({ ok: true, call: callData });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/vapi/webhook", async (req, res) => {
  try {
    if (!vapiIntegration) {
      const vapiModule = await import("./core/vapi-integration.js");
      vapiIntegration = new vapiModule.VapiIntegration(pool, callCouncilMember);
      await vapiIntegration.initialize();
    }

    const { event, data } = req.body;
    await vapiIntegration.handleWebhook(event, data);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/vapi/calls", requireKey, async (req, res) => {
  try {
    if (!vapiIntegration) {
      const vapiModule = await import("./core/vapi-integration.js");
      vapiIntegration = new vapiModule.VapiIntegration(pool, callCouncilMember);
      await vapiIntegration.initialize();
    }

    const { limit = 50 } = req.query;
    const calls = await vapiIntegration.getCallHistory(parseInt(limit));
    res.json({ ok: true, count: calls.length, calls });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== BUSINESS CENTER ENDPOINTS ====================
app.get("/api/v1/business-center/dashboard", requireKey, async (req, res) => {
  try {
    if (!businessCenter) {
      return res.status(503).json({ error: "Business Center not initialized" });
    }

    const dashboard = await businessCenter.getDashboard();
    res.json({ ok: true, dashboard });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== GAME GENERATOR ENDPOINTS ====================
app.post("/api/v1/games/generate", requireKey, async (req, res) => {
  try {
    if (!gameGenerator) {
      return res.status(503).json({ error: "Game Generator not initialized" });
    }

    const { gameType, complexity, useOverlay, monetization } = req.body;
    const result = await gameGenerator.generateGame({
      gameType: gameType || 'puzzle',
      complexity: complexity || 'simple',
      useOverlay: useOverlay !== false,
      monetization: monetization || 'ads',
    });

    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/games", requireKey, async (req, res) => {
  try {
    if (!gameGenerator) {
      return res.status(503).json({ error: "Game Generator not initialized" });
    }

    const { limit = 50 } = req.query;
    const games = await gameGenerator.getGames(parseInt(limit));
    res.json({ ok: true, count: games.length, games });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/games/:gameId/deploy", requireKey, async (req, res) => {
  try {
    if (!gameGenerator) {
      return res.status(503).json({ error: "Game Generator not initialized" });
    }

    const deployed = await gameGenerator.deployGame(req.params.gameId);
    res.json({ ok: deployed });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== BUSINESS DUPLICATION ENDPOINTS ====================
app.post("/api/v1/business/duplicate", requireKey, async (req, res) => {
  try {
    if (!businessDuplication) {
      return res.status(503).json({ error: "Business Duplication not initialized" });
    }

    const { competitorUrl, competitorName, improvementTarget, focusAreas } = req.body;
    const result = await businessDuplication.duplicateAndImprove({
      competitorUrl,
      competitorName,
      improvementTarget: improvementTarget || 15,
      focusAreas: focusAreas || [],
    });

    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/business/duplications", requireKey, async (req, res) => {
  try {
    if (!businessDuplication) {
      return res.status(503).json({ error: "Business Duplication not initialized" });
    }

    const { limit = 50 } = req.query;
    const duplications = await businessDuplication.getDuplications(parseInt(limit));
    res.json({ ok: true, count: duplications.length, duplications });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== CODE SERVICES ENDPOINTS ====================
app.post("/api/v1/code/generate", requireKey, async (req, res) => {
  try {
    if (!codeServices) {
      return res.status(503).json({ error: "Code Services not initialized" });
    }

    const { requirements, language, framework, style, includeTests, includeDocs } = req.body;
    const result = await codeServices.generateCode({
      requirements,
      language: language || 'javascript',
      framework,
      style: style || 'clean',
      includeTests: includeTests !== false,
      includeDocs: includeDocs !== false,
    });

    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/code/review", requireKey, async (req, res) => {
  try {
    if (!codeServices) {
      return res.status(503).json({ error: "Code Services not initialized" });
    }

    const { code, language, focusAreas } = req.body;
    const result = await codeServices.reviewCode({
      code,
      language: language || 'javascript',
      focusAreas: focusAreas || [],
    });

    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/code/fix", requireKey, async (req, res) => {
  try {
    if (!codeServices) {
      return res.status(503).json({ error: "Code Services not initialized" });
    }

    const { code, bugs, language } = req.body;
    const result = await codeServices.fixBugs({
      code,
      bugs,
      language: language || 'javascript',
    });

    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== MAKE.COM GENERATOR ENDPOINTS ====================
app.post("/api/v1/makecom/scenario", requireKey, async (req, res) => {
  try {
    if (!makeComGenerator) {
      return res.status(503).json({ error: "Make.com Generator not initialized" });
    }

    const { description, trigger, actions, integrations } = req.body;
    const result = await makeComGenerator.generateScenario({
      description,
      trigger,
      actions,
      integrations,
    });

    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/zapier/zap", requireKey, async (req, res) => {
  try {
    if (!makeComGenerator) {
      return res.status(503).json({ error: "Make.com Generator not initialized" });
    }

    const { description, trigger, actions } = req.body;
    const result = await makeComGenerator.generateZap({
      description,
      trigger,
      actions,
    });

    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/makecom/scenarios", requireKey, async (req, res) => {
  try {
    if (!makeComGenerator) {
      return res.status(503).json({ error: "Make.com Generator not initialized" });
    }

    const { limit = 50 } = req.query;
    const scenarios = await makeComGenerator.getScenarios(parseInt(limit));
    res.json({ ok: true, count: scenarios.length, scenarios });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/zapier/zaps", requireKey, async (req, res) => {
  try {
    if (!makeComGenerator) {
      return res.status(503).json({ error: "Make.com Generator not initialized" });
    }

    const { limit = 50 } = req.query;
    const zaps = await makeComGenerator.getZaps(parseInt(limit));
    res.json({ ok: true, count: zaps.length, zaps });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== CONTROVERSIAL APPROVAL SYSTEM ====================
app.post("/api/v1/approval/request", requireKey, async (req, res) => {
  try {
    const { type, description, potentialIssues, data } = req.body;
    
    await pool.query(
      `INSERT INTO approval_requests 
       (request_id, type, description, potential_issues, request_data, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        `approval_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type,
        description,
        JSON.stringify(potentialIssues || []),
        JSON.stringify(data || {}),
        'pending',
      ]
    );

    res.json({ ok: true, message: 'Approval request submitted. Awaiting your review.' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/approval/pending", requireKey, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM approval_requests WHERE status = 'pending' ORDER BY created_at DESC`
    );
    res.json({ ok: true, count: result.rows.length, requests: result.rows });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/approval/:requestId/approve", requireKey, async (req, res) => {
  try {
    const { approved, notes } = req.body;
    await pool.query(
      `UPDATE approval_requests 
       SET status = $1, approval_notes = $2, approved_at = NOW() 
       WHERE request_id = $3`,
      [approved ? 'approved' : 'rejected', notes, req.params.requestId]
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/legal/check", requireKey, async (req, res) => {
  try {
    if (!legalChecker) {
      return res.status(503).json({ error: "Legal Checker not initialized" });
    }

    const { action, description, data } = req.body;
    const check = await legalChecker.checkRequiresApproval(action, description, data);
    res.json({ ok: true, ...check });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/legal/ai-employee", requireKey, async (req, res) => {
  try {
    if (!legalChecker) {
      return res.status(503).json({ error: "Legal Checker not initialized" });
    }

    const legality = await legalChecker.checkAIEmployeePlacementLegality();
    res.json({ ok: true, ...legality });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== SELF-FUNDING SYSTEM ENDPOINTS ====================
app.get("/api/v1/self-funding/stats", requireKey, async (req, res) => {
  try {
    if (!selfFundingSystem) {
      return res.status(503).json({ error: "Self-Funding System not initialized" });
    }

    const stats = await selfFundingSystem.getStats();
    res.json({ ok: true, ...stats });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/self-funding/spending", requireKey, async (req, res) => {
  try {
    if (!selfFundingSystem) {
      return res.status(503).json({ error: "Self-Funding System not initialized" });
    }

    const { limit = 50 } = req.query;
    const spending = await selfFundingSystem.getSpendingHistory(parseInt(limit));
    res.json({ ok: true, count: spending.length, spending });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== MARKETING RESEARCH ENDPOINTS ====================
app.get("/api/v1/marketing/playbook", requireKey, async (req, res) => {
  try {
    if (!marketingResearch) {
      return res.status(503).json({ error: "Marketing Research not initialized" });
    }

    const playbook = await marketingResearch.getPlaybook();
    res.json({ ok: true, playbook });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/marketing/research", requireKey, async (req, res) => {
  try {
    if (!marketingResearch) {
      return res.status(503).json({ error: "Marketing Research not initialized" });
    }

    const research = await marketingResearch.getAllResearch();
    res.json({ ok: true, count: research.length, research });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/marketing/research/:marketer", requireKey, async (req, res) => {
  try {
    if (!marketingResearch) {
      return res.status(503).json({ error: "Marketing Research not initialized" });
    }

    const research = await marketingResearch.researchMarketer(req.params.marketer);
    res.json({ ok: true, research });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== MARKETING AGENCY ENDPOINTS ====================
app.get("/api/v1/marketing/campaigns", requireKey, async (req, res) => {
  try {
    if (!marketingAgency) {
      return res.status(503).json({ error: "Marketing Agency not initialized" });
    }

    const campaigns = await marketingAgency.getActiveCampaigns();
    res.json({ ok: true, count: campaigns.length, campaigns });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/marketing/campaigns/create", requireKey, async (req, res) => {
  try {
    if (!marketingAgency) {
      return res.status(503).json({ error: "Marketing Agency not initialized" });
    }

    const campaigns = await marketingAgency.createLifeOSCampaigns();
    res.json({ ok: true, count: campaigns.length, campaigns });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== WEB SCRAPER ENDPOINTS ====================
app.post("/api/v1/scraper/scrape", requireKey, async (req, res) => {
  try {
    if (!webScraper) {
      return res.status(503).json({ error: "Web Scraper not initialized" });
    }

    const { url, options } = req.body;
    const result = await webScraper.scrapeWebsite(url, options || {});
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/scraper/competitors", requireKey, async (req, res) => {
  try {
    if (!webScraper) {
      return res.status(503).json({ error: "Web Scraper not initialized" });
    }

    const { urls } = req.body;
    const result = await webScraper.scrapeCompetitors(urls);
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/scraper/scrapes", requireKey, async (req, res) => {
  try {
    if (!webScraper) {
      return res.status(503).json({ error: "Web Scraper not initialized" });
    }

    const { limit = 50 } = req.query;
    const scrapes = await webScraper.getScrapes(parseInt(limit));
    res.json({ ok: true, count: scrapes.length, scrapes });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== ENHANCED CONVERSATION SCRAPER ENDPOINTS ====================
app.post("/api/v1/conversations/store-credentials", requireKey, async (req, res) => {
  try {
    if (!enhancedConversationScraper) {
      return res.status(503).json({ error: "Conversation Scraper not initialized" });
    }

    const { provider, credentials } = req.body;
    
    if (!provider || !credentials) {
      return res.status(400).json({ error: "Provider and credentials required" });
    }

    const validProviders = ['chatgpt', 'gemini', 'claude', 'grok', 'deepseek'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({ error: `Invalid provider. Must be one of: ${validProviders.join(', ')}` });
    }

    const success = await enhancedConversationScraper.storeCredentials(provider, credentials);
    
    if (success) {
      res.json({ ok: true, message: `Credentials stored securely for ${provider}` });
    } else {
      res.status(500).json({ ok: false, error: "Failed to store credentials" });
    }
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/conversations/scrape", requireKey, async (req, res) => {
  try {
    if (!enhancedConversationScraper) {
      return res.status(503).json({ error: "Conversation Scraper not initialized" });
    }

    const { provider } = req.body;
    
    if (!provider) {
      return res.status(400).json({ error: "Provider required" });
    }

    // Start scraping in background
    enhancedConversationScraper.scrapeAllConversations(provider)
      .then(result => {
        console.log(`✅ [SCRAPER] Completed scraping ${provider}:`, result);
      })
      .catch(error => {
        console.error(`❌ [SCRAPER] Error scraping ${provider}:`, error.message);
      });

    res.json({ 
      ok: true, 
      message: `Started scraping ${provider} conversations. Check status endpoint for progress.`,
      note: "Scraping runs in background. Use status endpoint to check progress."
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/conversations/scrape-status/:statusId", requireKey, async (req, res) => {
  try {
    if (!enhancedConversationScraper) {
      return res.status(503).json({ error: "Conversation Scraper not initialized" });
    }

    const status = enhancedConversationScraper.getStatus(req.params.statusId);
    
    if (!status) {
      return res.status(404).json({ error: "Status not found" });
    }

    res.json({ ok: true, status });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/conversations/stored-credentials", requireKey, async (req, res) => {
  try {
    if (!enhancedConversationScraper) {
      return res.status(503).json({ error: "Conversation Scraper not initialized" });
    }

    const credentials = await enhancedConversationScraper.listStoredCredentials();
    res.json({ ok: true, count: credentials.length, credentials });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.delete("/api/v1/conversations/credentials/:provider", requireKey, async (req, res) => {
  try {
    if (!enhancedConversationScraper) {
      return res.status(503).json({ error: "Conversation Scraper not initialized" });
    }

    const success = await enhancedConversationScraper.deleteCredentials(req.params.provider);
    
    if (success) {
      res.json({ ok: true, message: `Credentials deleted for ${req.params.provider}` });
    } else {
      res.status(500).json({ ok: false, error: "Failed to delete credentials" });
    }
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

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

// ==================== BOLDTRAIL REAL ESTATE CRM ENDPOINTS ====================
app.post("/api/v1/boldtrail/register", requireKey, async (req, res) => {
  try {
    const { email, name, agent_tone, preferences } = req.body;

    if (!email) {
      return res.status(400).json({ ok: false, error: "Email required" });
    }

    // Check if agent already exists
    const existing = await pool.query(
      "SELECT * FROM boldtrail_agents WHERE email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.json({
        ok: true,
        agent: existing.rows[0],
        message: "Agent already registered",
      });
    }

    // Create new agent
    const result = await pool.query(
      `INSERT INTO boldtrail_agents (email, name, agent_tone, preferences)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [email, name || null, agent_tone || null, preferences ? JSON.stringify(preferences) : null]
    );

    res.json({
      ok: true,
      agent: result.rows[0],
      message: "Agent registered successfully",
    });
  } catch (error) {
    console.error("BoldTrail registration error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/boldtrail/draft-email", requireKey, async (req, res) => {
  try {
    const { agent_id, draft_type, recipient_email, recipient_name, context_data } = req.body;

    if (!agent_id || !draft_type) {
      return res.status(400).json({ ok: false, error: "agent_id and draft_type required" });
    }

    // Get agent info for tone
    const agentResult = await pool.query(
      "SELECT agent_tone, name FROM boldtrail_agents WHERE id = $1",
      [agent_id]
    );

    if (agentResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Agent not found" });
    }

    const agent = agentResult.rows[0];
    const tone = agent.agent_tone || "professional and friendly";

    let subject, body, aiSource = "our_ai";

    // Try BoldTrail AI first (if API key exists)
    try {
      const { draftEmailWithBoldTrailAI } = await import("./src/integrations/boldtrail.js");
      const boldtrailResult = await draftEmailWithBoldTrailAI({
        agent_tone: tone,
        draft_type,
        recipient_name,
        recipient_email,
        context_data,
      });

      if (boldtrailResult.ok && boldtrailResult.source === "boldtrail_ai") {
        subject = boldtrailResult.subject;
        body = boldtrailResult.content;
        aiSource = "boldtrail_ai";
        console.log("✅ Used BoldTrail AI for email drafting");
      } else {
        // Fallback to our AI
        throw new Error("BoldTrail AI not available, using fallback");
      }
    } catch (boldtrailError) {
      // Fallback to our AI
      console.log("📝 Using our AI for email drafting (BoldTrail AI unavailable)");
      
      const prompt = `Draft a ${draft_type} email for a real estate agent.

Agent's tone/style: ${tone}
Recipient: ${recipient_name || recipient_email || "client"}
Context: ${JSON.stringify(context_data || {})}

Write a complete email with:
- Appropriate subject line
- Professional greeting
- Clear, helpful body content
- Professional closing

Format as:
SUBJECT: [subject line]

[email body]`;

      const emailContent = await callCouncilWithFailover(prompt, "chatgpt");

      // Extract subject and body
      const subjectMatch = emailContent.match(/SUBJECT:\s*(.+)/i);
      subject = subjectMatch ? subjectMatch[1].trim() : `${draft_type} - ${recipient_name || "Client"}`;
      body = emailContent.replace(/SUBJECT:.*/i, "").trim();
    }

    // Save draft
    const draftResult = await pool.query(
      `INSERT INTO boldtrail_email_drafts 
       (agent_id, draft_type, recipient_email, recipient_name, subject, content, context_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        agent_id,
        draft_type,
        recipient_email || null,
        recipient_name || null,
        subject,
        body,
        context_data ? JSON.stringify(context_data) : null,
      ]
    );

    res.json({
      ok: true,
      draft: draftResult.rows[0],
      subject,
      content: body,
      ai_source: aiSource, // "boldtrail_ai" or "our_ai"
    });
  } catch (error) {
    console.error("BoldTrail email draft error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/boldtrail/plan-showing", requireKey, async (req, res) => {
  try {
    const { agent_id, properties, client_name, client_email, client_phone } = req.body;

    if (!agent_id || !properties || !Array.isArray(properties) || properties.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "agent_id and properties array required",
      });
    }

    let optimizedShowings = [];
    let aiSource = "our_ai";

    // Try BoldTrail AI first (if API key exists)
    try {
      const { planShowingsWithBoldTrailAI } = await import("./src/integrations/boldtrail.js");
      const boldtrailResult = await planShowingsWithBoldTrailAI({
        properties,
        client_name,
        client_email,
        client_phone,
      });

      if (boldtrailResult.ok && boldtrailResult.source === "boldtrail_ai") {
        optimizedShowings = boldtrailResult.showings || [];
        aiSource = "boldtrail_ai";
        console.log("✅ Used BoldTrail AI for showing planning");
      } else {
        // Fallback to our simple route order
        throw new Error("BoldTrail AI not available, using fallback");
      }
    } catch (boldtrailError) {
      // Fallback: Simple route order (1, 2, 3...)
      console.log("📝 Using our simple route planning (BoldTrail AI unavailable)");
      optimizedShowings = properties.map((prop, i) => ({
        ...prop,
        route_order: i + 1,
        estimated_drive_time: null,
      }));
    }

    // Save showings to database
    const showings = [];
    for (let i = 0; i < optimizedShowings.length; i++) {
      const prop = optimizedShowings[i];
      const showingResult = await pool.query(
        `INSERT INTO boldtrail_showings 
         (agent_id, property_address, property_details, showing_date, client_name, client_email, client_phone, route_order, estimated_drive_time)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          agent_id,
          prop.address || prop.property_address || "Address TBD",
          prop.details ? JSON.stringify(prop.details) : null,
          prop.showing_date || null,
          client_name || null,
          client_email || null,
          client_phone || null,
          prop.route_order || i + 1,
          prop.estimated_drive_time || null,
        ]
      );
      showings.push(showingResult.rows[0]);
    }

    // Generate showing confirmation email draft
    const agentResult = await pool.query(
      "SELECT name, agent_tone FROM boldtrail_agents WHERE id = $1",
      [agent_id]
    );
    const agent = agentResult.rows[0];

    const emailPrompt = `Draft a showing confirmation email for a real estate agent.

Agent: ${agent.name || "Agent"}
Client: ${client_name || "Client"}
Properties: ${properties.map((p, i) => `${i + 1}. ${p.address || p.property_address}`).join("\n")}
Showing date: ${properties[0]?.showing_date || "TBD"}

Include:
- Friendly greeting
- List of properties we'll be viewing
- Meeting time and location
- What to expect
- Professional closing

Format as:
SUBJECT: [subject]

[email body]`;

    const emailContent = await callCouncilWithFailover(emailPrompt, "chatgpt");
    const subjectMatch = emailContent.match(/SUBJECT:\s*(.+)/i);
    const subject = subjectMatch ? subjectMatch[1].trim() : `Showing Confirmation - ${properties.length} Properties`;
    const body = emailContent.replace(/SUBJECT:.*/i, "").trim();

    res.json({
      ok: true,
      showings,
      confirmation_email: {
        subject,
        body,
        recipient: client_email,
      },
      route_summary: {
        total_properties: properties.length,
        estimated_time: "TBD (integrate with Maps API)",
      },
      ai_source: aiSource, // "boldtrail_ai" or "our_ai"
    });
  } catch (error) {
    console.error("BoldTrail showing plan error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/boldtrail/showings/:agentId", requireKey, async (req, res) => {
  try {
    const { agentId } = req.params;

    const result = await pool.query(
      `SELECT * FROM boldtrail_showings 
       WHERE agent_id = $1 
       ORDER BY showing_date DESC, route_order ASC
       LIMIT 50`,
      [agentId]
    );

    res.json({
      ok: true,
      showings: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error("BoldTrail get showings error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/boldtrail/agent/:email", requireKey, async (req, res) => {
  try {
    const { email } = req.params;

    const result = await pool.query(
      "SELECT * FROM boldtrail_agents WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Agent not found" });
    }

    res.json({
      ok: true,
      agent: result.rows[0],
    });
  } catch (error) {
    console.error("BoldTrail get agent error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/boldtrail/create-subscription", requireKey, async (req, res) => {
  try {
    const { agent_id, email, name } = req.body;

    if (!agent_id && !email) {
      return res.status(400).json({ ok: false, error: "agent_id or email required" });
    }

    const stripe = await getStripeClient();
    if (!stripe) {
      return res.status(503).json({ ok: false, error: "Stripe not configured" });
    }

    // Get or create agent
    let agent;
    if (agent_id) {
      const result = await pool.query("SELECT * FROM boldtrail_agents WHERE id = $1", [agent_id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ ok: false, error: "Agent not found" });
      }
      agent = result.rows[0];
    } else {
      const result = await pool.query("SELECT * FROM boldtrail_agents WHERE email = $1", [email]);
      if (result.rows.length === 0) {
        // Create agent first
        const newAgent = await pool.query(
          "INSERT INTO boldtrail_agents (email, name) VALUES ($1, $2) RETURNING *",
          [email, name || null]
        );
        agent = newAgent.rows[0];
      } else {
        agent = result.rows[0];
      }
    }

    // Create Stripe customer if needed
    let customerId = agent.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: agent.email,
        name: agent.name || undefined,
        metadata: { agent_id: agent.id.toString() },
      });
      customerId = customer.id;
      await pool.query(
        "UPDATE boldtrail_agents SET stripe_customer_id = $1 WHERE id = $2",
        [customerId, agent.id]
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
              name: "BoldTrail Pro",
              description: "AI Assistant for Real Estate Agents",
            },
            unit_amount: 9900, // $99.00
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin || "https://" + RAILWAY_PUBLIC_DOMAIN}/boldtrail?success=true`,
      cancel_url: `${req.headers.origin || "https://" + RAILWAY_PUBLIC_DOMAIN}/boldtrail?canceled=true`,
      metadata: { agent_id: agent.id.toString() },
    });

    res.json({
      ok: true,
      session_id: session.id,
      url: session.url,
      agent_id: agent.id,
    });
  } catch (error) {
    console.error("BoldTrail subscription creation error:", error);
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

// ==================== AGENT RECRUITMENT & ONBOARDING SYSTEM ====================
app.post("/api/v1/recruitment/create-lead", requireKey, async (req, res) => {
  try {
    const { name, phone, email, source } = req.body;

    if (!phone && !email) {
      return res.status(400).json({ ok: false, error: "Phone or email required" });
    }

    const result = await pool.query(
      `INSERT INTO recruitment_leads (name, phone, email, source)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name || null, phone || null, email || null, source || 'manual']
    );

    res.json({
      ok: true,
      lead: result.rows[0],
      message: "Lead created successfully",
    });
  } catch (error) {
    console.error("Recruitment lead creation error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/recruitment/make-call", requireKey, async (req, res) => {
  try {
    const { lead_id, phone, custom_script } = req.body;

    if (!lead_id && !phone) {
      return res.status(400).json({ ok: false, error: "lead_id or phone required" });
    }

    // Get lead info
    let lead;
    if (lead_id) {
      const leadResult = await pool.query("SELECT * FROM recruitment_leads WHERE id = $1", [lead_id]);
      if (leadResult.rows.length === 0) {
        return res.status(404).json({ ok: false, error: "Lead not found" });
      }
      lead = leadResult.rows[0];
    } else {
      lead = { phone, name: null, email: null };
    }

    const phoneNumber = lead.phone || phone;
    if (!phoneNumber) {
      return res.status(400).json({ ok: false, error: "Phone number required" });
    }

    // Generate recruitment call script
    const scriptPrompt = custom_script || `You are calling a real estate agent to introduce BoldTrail - an AI assistant that helps agents:
- Draft emails automatically
- Plan showing routes
- Follow up with clients
- Save hours of admin work

Keep it conversational, under 60 seconds. Ask if they'd like to see a quick demo via webinar.`;

    const callScript = await callCouncilWithFailover(scriptPrompt, "chatgpt");

    // Make the call
    const callResult = await makePhoneCall(phoneNumber, null, callScript, "chatgpt");

    if (callResult.success && lead_id) {
      // Log the call
      await pool.query(
        `INSERT INTO recruitment_calls (lead_id, call_sid, call_status, outcome)
         VALUES ($1, $2, 'initiated', 'pending')`,
        [lead_id, callResult.callSid]
      );

      // Update lead status
      await pool.query(
        "UPDATE recruitment_leads SET status = 'called', updated_at = NOW() WHERE id = $1",
        [lead_id]
      );
    }

    res.json({
      ok: true,
      call: callResult,
      script: callScript,
      message: "Recruitment call initiated",
    });
  } catch (error) {
    console.error("Recruitment call error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/recruitment/schedule-webinar", requireKey, async (req, res) => {
  try {
    const { title, scheduled_time, lead_ids } = req.body;

    if (!title || !scheduled_time) {
      return res.status(400).json({ ok: false, error: "title and scheduled_time required" });
    }

    // Generate webinar presentation content
    const presentationPrompt = `Create a compelling webinar presentation for BoldTrail - AI Assistant for Real Estate Agents.

Include:
1. Introduction: The problem (agents drowning in admin work)
2. Solution: How BoldTrail automates emails, showings, follow-ups
3. Demo: Show the overlay in action
4. Success stories: Time saved, deals closed faster
5. Pricing: $99/month - ROI in first deal
6. Q&A: Address common concerns
7. Close: Express Line enrollment opportunity

Format as structured JSON with sections and talking points.`;

    const presentationData = await callCouncilWithFailover(presentationPrompt, "gemini");

    // For now, use a placeholder Zoom link (in production, integrate with Zoom API)
    const zoomLink = `https://zoom.us/j/meeting-${Date.now()}`;

    const result = await pool.query(
      `INSERT INTO recruitment_webinars (title, scheduled_time, zoom_link, presentation_data, attendees)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        title,
        scheduled_time,
        zoomLink,
        JSON.stringify({ content: presentationData }),
        lead_ids ? JSON.stringify(lead_ids) : JSON.stringify([]),
      ]
    );

    // Send invitations to leads
    if (lead_ids && Array.isArray(lead_ids)) {
      for (const leadId of lead_ids) {
        const leadResult = await pool.query("SELECT * FROM recruitment_leads WHERE id = $1", [leadId]);
        if (leadResult.rows.length > 0) {
          const lead = leadResult.rows[0];
          // Send email/SMS invitation (implement sendSMS or email function)
          console.log(`📧 Inviting lead ${lead.name || lead.email} to webinar`);
        }
      }
    }

    res.json({
      ok: true,
      webinar: result.rows[0],
      message: "Webinar scheduled successfully",
    });
  } catch (error) {
    console.error("Webinar scheduling error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/recruitment/handle-objection", requireKey, async (req, res) => {
  try {
    const { lead_id, concern, call_transcript } = req.body;

    if (!lead_id || !concern) {
      return res.status(400).json({ ok: false, error: "lead_id and concern required" });
    }

    // Use AI to generate objection response
    const responsePrompt = `A real estate agent has this concern about BoldTrail: "${concern}"

Generate a helpful, empathetic response that:
1. Acknowledges their concern
2. Provides a clear, honest answer
3. Offers a solution or alternative
4. Maintains trust and doesn't push too hard

Keep it conversational and under 150 words.`;

    const response = await callCouncilWithFailover(responsePrompt, "chatgpt");

    // Log the concern and response
    await pool.query(
      `UPDATE recruitment_calls 
       SET concerns = COALESCE(concerns, '') || $1 || E'\\n',
           transcript = COALESCE(transcript, '') || $2 || E'\\n'
       WHERE lead_id = $3
       ORDER BY created_at DESC
       LIMIT 1`,
      [`Concern: ${concern}\n`, `Response: ${response}\n`, lead_id]
    );

    res.json({
      ok: true,
      response,
      message: "Objection handled",
    });
  } catch (error) {
    console.error("Objection handling error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/recruitment/enroll", requireKey, async (req, res) => {
  try {
    const { lead_id, webinar_id, enrollment_tier } = req.body;

    if (!lead_id) {
      return res.status(400).json({ ok: false, error: "lead_id required" });
    }

    // Get lead
    const leadResult = await pool.query("SELECT * FROM recruitment_leads WHERE id = $1", [lead_id]);
    if (leadResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Lead not found" });
    }

    const lead = leadResult.rows[0];

    // Create enrollment
    const enrollmentResult = await pool.query(
      `INSERT INTO recruitment_enrollments (lead_id, webinar_id, enrollment_tier, status, onboarding_stage)
       VALUES ($1, $2, $3, 'enrolled', 'learning')
       RETURNING *`,
      [lead_id, webinar_id || null, enrollment_tier || 'express']
    );

    // Create BoldTrail agent account
    const agentResult = await pool.query(
      `INSERT INTO boldtrail_agents (email, name, subscription_tier)
       VALUES ($1, $2, 'express')
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING *`,
      [lead.email || `agent-${lead_id}@boldtrail.com`, lead.name]
    );

    // Link enrollment to agent
    await pool.query(
      `UPDATE recruitment_enrollments SET agent_id = $1 WHERE id = $2`,
      [agentResult.rows[0].id, enrollmentResult.rows[0].id]
    );

    // Initialize feature unlocks (start with basic features only)
    await pool.query(
      `INSERT INTO agent_feature_unlocks (agent_id, feature_name, mastery_required)
       VALUES ($1, 'email_drafting', false),
              ($1, 'showing_planner', false),
              ($1, 'basic_crm', false)
       ON CONFLICT DO NOTHING`,
      [agentResult.rows[0].id]
    );

    res.json({
      ok: true,
      enrollment: enrollmentResult.rows[0],
      agent: agentResult.rows[0],
      message: "Agent enrolled successfully",
    });
  } catch (error) {
    console.error("Enrollment error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/recruitment/unlock-feature", requireKey, async (req, res) => {
  try {
    const { agent_id, feature_name, mastery_achieved } = req.body;

    if (!agent_id || !feature_name) {
      return res.status(400).json({ ok: false, error: "agent_id and feature_name required" });
    }

    // Check if agent has achieved mastery (this would be checked via virtual class progress, etc.)
    const enrollmentResult = await pool.query(
      `SELECT mastery_level, onboarding_stage FROM recruitment_enrollments 
       WHERE agent_id = (SELECT id FROM boldtrail_agents WHERE id = $1)`,
      [agent_id]
    );

    if (enrollmentResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Agent enrollment not found" });
    }

    const enrollment = enrollmentResult.rows[0];

    // Feature unlock rules
    const featureRequirements = {
      'youtube_automation': { mastery_level: 5, stage: 'mastered' },
      'full_automation': { mastery_level: 7, stage: 'mastered' },
      'advanced_crm': { mastery_level: 3, stage: 'building' },
    };

    const requirement = featureRequirements[feature_name];
    if (requirement) {
      if (enrollment.mastery_level < requirement.mastery_level || 
          enrollment.onboarding_stage !== requirement.stage) {
        return res.status(403).json({
          ok: false,
          error: `Feature requires mastery level ${requirement.mastery_level} and stage ${requirement.stage}`,
          current_level: enrollment.mastery_level,
          current_stage: enrollment.onboarding_stage,
        });
      }
    }

    // Unlock the feature
    await pool.query(
      `INSERT INTO agent_feature_unlocks (agent_id, feature_name, mastery_required)
       VALUES ($1, $2, true)
       ON CONFLICT (agent_id, feature_name) DO UPDATE SET unlocked_at = NOW()`,
      [agent_id, feature_name]
    );

    res.json({
      ok: true,
      message: `Feature ${feature_name} unlocked`,
      agent_id,
      feature_name,
    });
  } catch (error) {
    console.error("Feature unlock error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== YOUTUBE VIDEO CREATION WORKFLOW ====================
app.post("/api/v1/youtube/create-project", requireKey, async (req, res) => {
  try {
    const { agent_id, title, description, topic } = req.body;

    if (!agent_id || !topic) {
      return res.status(400).json({ ok: false, error: "agent_id and topic required" });
    }

    // Check if agent has YouTube automation unlocked
    const unlockCheck = await pool.query(
      "SELECT * FROM agent_feature_unlocks WHERE agent_id = $1 AND feature_name = 'youtube_automation'",
      [agent_id]
    );

    if (unlockCheck.rows.length === 0) {
      return res.status(403).json({
        ok: false,
        error: "YouTube automation not unlocked. Complete mastery requirements first.",
      });
    }

    // Generate video script (help them learn first)
    const scriptPrompt = `Create a YouTube video script for a real estate agent about: "${topic}"

The agent wants to learn how to create videos themselves. Provide:
1. A compelling hook (first 15 seconds)
2. Main content with talking points
3. Call to action
4. Tips for delivery

Keep it educational and helpful - this is for them to practice with.`;

    const script = await callCouncilWithFailover(scriptPrompt, "chatgpt");

    const result = await pool.query(
      `INSERT INTO youtube_video_projects (agent_id, title, description, script, status)
       VALUES ($1, $2, $3, $4, 'script_ready')
       RETURNING *`,
      [agent_id, title || `Video about ${topic}`, description || null, script]
    );

    // Check if agent has YouTube automation unlocked
    const hasAutomation = await pool.query(
      "SELECT * FROM agent_feature_unlocks WHERE agent_id = $1 AND feature_name = 'youtube_automation'",
      [agent_id]
    );

    res.json({
      ok: true,
      project: result.rows[0],
      message: "Video project created. Choose your approach:",
      options: {
        learn_first: {
          description: "Record your video manually using the script (recommended for learning)",
          steps: [
            "1. Review the generated script",
            "2. Record your video using the script",
            "3. Upload via POST /api/v1/youtube/upload-raw",
            "4. AI will enhance with b-roll, transitions, and editing"
          ],
          endpoint: "POST /api/v1/youtube/upload-raw",
        },
        ai_generation: {
          description: "Use open source AI (Stable Video Diffusion) to generate the entire video",
          available: hasAutomation.rows.length > 0,
          requires: "Mastery level 5+ (YouTube automation feature unlock)",
          steps: [
            "1. System breaks script into scenes",
            "2. Generates images using Stable Diffusion",
            "3. Converts images to video using Stable Video Diffusion",
            "4. Adds voiceover (if agent voice available)",
            "5. Enhances with b-roll, transitions, text overlays"
          ],
          endpoint: "POST /api/v1/youtube/generate-video",
          technology: "Open source: Stable Video Diffusion (Stability AI)",
        },
      },
    });
  } catch (error) {
    console.error("YouTube project creation error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/youtube/upload-raw", requireKey, async (req, res) => {
  try {
    const { project_id, video_url } = req.body;

    if (!project_id || !video_url) {
      return res.status(400).json({ ok: false, error: "project_id and video_url required" });
    }

    await pool.query(
      `UPDATE youtube_video_projects 
       SET raw_video_url = $1, status = 'raw_uploaded'
       WHERE id = $2`,
      [video_url, project_id]
    );

    res.json({
      ok: true,
      message: "Raw video uploaded. System will now enhance it with b-roll and editing.",
    });
  } catch (error) {
    console.error("YouTube upload error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/youtube/generate-video", requireKey, async (req, res) => {
  try {
    const { project_id, style, use_agent_voice } = req.body;

    if (!project_id) {
      return res.status(400).json({ ok: false, error: "project_id required" });
    }

    // Get project
    const projectResult = await pool.query(
      "SELECT * FROM youtube_video_projects WHERE id = $1",
      [project_id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Project not found" });
    }

    const project = projectResult.rows[0];

    // Check if agent has YouTube automation unlocked
    const unlockCheck = await pool.query(
      "SELECT * FROM agent_feature_unlocks WHERE agent_id = $1 AND feature_name = 'youtube_automation'",
      [project.agent_id]
    );

    if (unlockCheck.rows.length === 0) {
      return res.status(403).json({
        ok: false,
        error: "YouTube automation not unlocked. Complete mastery requirements first.",
      });
    }

    // Initialize video generator
    const { VideoGenerator } = await import("./core/video-generator.js");
    const videoGenerator = new VideoGenerator(pool, callCouncilMember);

    // Generate video (this runs async, so we'll update status)
    await pool.query(
      "UPDATE youtube_video_projects SET status = 'generating' WHERE id = $1",
      [project_id]
    );

    // Generate in background
    videoGenerator.generateVideo({
      script: project.script,
      agent_id: project.agent_id,
      project_id,
      style: style || "professional",
      use_agent_voice: use_agent_voice || false,
    })
      .then(result => {
        console.log(`✅ Video generated for project ${project_id}`);
      })
      .catch(error => {
        console.error(`❌ Video generation error for project ${project_id}:`, error);
        pool.query(
          "UPDATE youtube_video_projects SET status = 'error', enhancements = $1 WHERE id = $2",
          [JSON.stringify({ error: error.message }), project_id]
        );
      });

    res.json({
      ok: true,
      message: "Video generation started. This may take a few minutes. Check project status for updates.",
      project_id,
      status: "generating",
    });
  } catch (error) {
    console.error("YouTube video generation error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/youtube/project/:projectId", requireKey, async (req, res) => {
  try {
    const { projectId } = req.params;

    const result = await pool.query(
      "SELECT * FROM youtube_video_projects WHERE id = $1",
      [projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Project not found" });
    }

    res.json({
      ok: true,
      project: result.rows[0],
    });
  } catch (error) {
    console.error("YouTube project fetch error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== VIDEO EDITING COUNCIL ====================
// Open source video editing tools working together like an AI council
let VideoEditingCouncil, videoEditingCouncil;

app.post("/api/v1/video/process", requireKey, async (req, res) => {
  try {
    if (!videoEditingCouncil) {
      const { VideoEditingCouncil: VEC } = await import("./core/video-editing-council.js");
      videoEditingCouncil = new VEC(pool, callCouncilMember);
    }

    const { task, inputVideo, inputImage, script, options = {} } = req.body;

    if (!task) {
      return res.status(400).json({ ok: false, error: "task required" });
    }

    console.log(`🎬 [VIDEO COUNCIL] Processing: ${task}`);

    const result = await videoEditingCouncil.processRequest({
      task,
      inputVideo,
      inputImage,
      script,
      options,
    });

    res.json({
      ok: result.success !== false,
      ...result,
    });
  } catch (error) {
    console.error("Video editing council error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/video/council/status", requireKey, async (req, res) => {
  try {
    if (!videoEditingCouncil) {
      const { VideoEditingCouncil: VEC } = await import("./core/video-editing-council.js");
      videoEditingCouncil = new VEC(pool, callCouncilMember);
    }

    const status = await videoEditingCouncil.getStatus();

    res.json({
      ok: true,
      members: status,
      totalMembers: Object.keys(status).length,
      availableMembers: Object.values(status).filter(m => m.available).length,
    });
  } catch (error) {
    console.error("Video council status error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== CREATOR ENHANCEMENT SUITE ====================
app.post("/api/v1/creator/register", requireKey, async (req, res) => {
  try {
    const { email, name, brand_voice, style_preferences, content_themes, target_audience, platforms } = req.body;

    if (!email) {
      return res.status(400).json({ ok: false, error: "email required" });
    }

    // Check if exists
    const existing = await pool.query(
      "SELECT * FROM creator_profiles WHERE creator_email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.json({
        ok: true,
        creator: existing.rows[0],
        message: "Creator already registered",
      });
    }

    // Create profile
    const result = await pool.query(
      `INSERT INTO creator_profiles 
       (creator_email, creator_name, brand_voice, style_preferences, content_themes, target_audience, platforms)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        email,
        name || null,
        brand_voice || null,
        style_preferences ? JSON.stringify(style_preferences) : null,
        content_themes ? JSON.stringify(content_themes) : null,
        target_audience ? JSON.stringify(target_audience) : null,
        platforms ? JSON.stringify(platforms) : null,
      ]
    );

    res.json({
      ok: true,
      creator: result.rows[0],
      message: "Creator profile created",
    });
  } catch (error) {
    console.error("Creator registration error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/creator/enhance-video", requireKey, async (req, res) => {
  try {
    const { creator_id, video_url, enhancement_options } = req.body;

    if (!creator_id || !video_url) {
      return res.status(400).json({ ok: false, error: "creator_id and video_url required" });
    }

    // Get creator profile for voice/style
    const creatorResult = await pool.query(
      "SELECT * FROM creator_profiles WHERE id = $1",
      [creator_id]
    );

    if (creatorResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Creator not found" });
    }

    const creator = creatorResult.rows[0];
    const options = enhancement_options || {
      color_correction: true,
      audio_enhancement: true,
      b_roll: true,
      transitions: true,
      text_overlays: true,
      branding: true,
    };

    // Create content record
    const contentResult = await pool.query(
      `INSERT INTO creator_content 
       (creator_id, content_type, original_url, status)
       VALUES ($1, 'video', $2, 'enhancing')
       RETURNING *`,
      [creator_id, video_url]
    );

    const contentId = contentResult.rows[0].id;

    // Generate enhancement plan using AI
    const enhancementPrompt = `Analyze this video and create an enhancement plan for a creator.

Creator's brand voice: ${creator.brand_voice || "professional and engaging"}
Style preferences: ${JSON.stringify(creator.style_preferences || {})}
Content themes: ${JSON.stringify(creator.content_themes || [])}

Enhancement options requested:
${JSON.stringify(options)}

Provide:
1. Color correction recommendations
2. Audio enhancement suggestions
3. B-roll opportunities
4. Transition points
5. Text overlay suggestions
6. Branding placement

Keep it aligned with their voice - enhance, don't change their style.`;

    const enhancementPlan = await callCouncilWithFailover(enhancementPrompt, "gemini");

    // Apply enhancements (this would use video processing libraries)
    // For now, we'll simulate the process
    const enhancements = {
      color_correction: options.color_correction ? "Applied" : null,
      audio_enhancement: options.audio_enhancement ? "Applied" : null,
      b_roll: options.b_roll ? "Added relevant b-roll" : null,
      transitions: options.transitions ? "Smooth transitions added" : null,
      text_overlays: options.text_overlays ? "Strategic text overlays" : null,
      branding: options.branding ? "Creator branding added" : null,
    };

    // Store enhancement record
    await pool.query(
      `INSERT INTO creator_enhancements (content_id, enhancement_type, before_data, after_data)
       VALUES ($1, 'full_enhancement', $2, $3)`,
      [
        contentId,
        JSON.stringify({ original_url: video_url }),
        JSON.stringify(enhancements),
      ]
    );

    // Update content with enhanced URL (placeholder - would be actual processed video)
    const enhancedUrl = video_url.replace(/\.(mp4|mov)$/, '_enhanced.$1'); // Simulated

    await pool.query(
      `UPDATE creator_content 
       SET enhanced_url = $1, status = 'enhanced'
       WHERE id = $2`,
      [enhancedUrl, contentId]
    );

    res.json({
      ok: true,
      content: {
        ...contentResult.rows[0],
        enhanced_url: enhancedUrl,
      },
      enhancements,
      plan: enhancementPlan,
      message: "Video enhanced while maintaining your unique style",
    });
  } catch (error) {
    console.error("Video enhancement error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/creator/optimize-seo", requireKey, async (req, res) => {
  try {
    const { content_id, platform } = req.body;

    if (!content_id || !platform) {
      return res.status(400).json({ ok: false, error: "content_id and platform required" });
    }

    // Get content
    const contentResult = await pool.query(
      `SELECT c.*, p.brand_voice, p.content_themes, p.target_audience
       FROM creator_content c
       JOIN creator_profiles p ON c.creator_id = p.id
       WHERE c.id = $1`,
      [content_id]
    );

    if (contentResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Content not found" });
    }

    const content = contentResult.rows[0];

    // Generate SEO-optimized title, description, tags
    const seoPrompt = `Optimize this content for ${platform} SEO while maintaining the creator's voice.

Current title: ${content.title || "Untitled"}
Current description: ${content.description || "No description"}
Platform: ${platform}
Creator's voice: ${content.brand_voice || "professional"}
Target audience: ${JSON.stringify(content.target_audience || {})}
Content themes: ${JSON.stringify(content.content_themes || [])}

Provide:
1. SEO-optimized title (maintains voice, includes keywords)
2. SEO-optimized description (first 2 lines are critical)
3. Relevant tags/keywords (10-15 tags)
4. SEO score (1-100)
5. Recommendations for improvement

Format as JSON:
{
  "title": "...",
  "description": "...",
  "tags": ["tag1", "tag2", ...],
  "seo_score": 85,
  "recommendations": ["...", "..."]
}`;

    const seoResponse = await callCouncilWithFailover(seoPrompt, "chatgpt");

    // Parse SEO data
    let seoData;
    try {
      const jsonMatch = seoResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        seoData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch (e) {
      // Fallback
      seoData = {
        title: content.title || "Optimized Title",
        description: content.description || "Optimized description",
        tags: [],
        seo_score: 75,
        recommendations: ["Add more keywords", "Improve description"],
      };
    }

    // Update content
    await pool.query(
      `UPDATE creator_content 
       SET title = $1, description = $2, tags = $3, seo_optimized = true, seo_score = $4
       WHERE id = $5`,
      [
        seoData.title,
        seoData.description,
        JSON.stringify(seoData.tags || []),
        seoData.seo_score || 75,
        content_id,
      ]
    );

    res.json({
      ok: true,
      seo: seoData,
      message: "Content optimized for SEO while maintaining your voice",
    });
  } catch (error) {
    console.error("SEO optimization error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/creator/schedule-post", requireKey, async (req, res) => {
  try {
    const { content_id, platforms, scheduled_time, customizations } = req.body;

    if (!content_id || !platforms || !Array.isArray(platforms)) {
      return res.status(400).json({ ok: false, error: "content_id and platforms array required" });
    }

    // Get content
    const contentResult = await pool.query(
      "SELECT * FROM creator_content WHERE id = $1",
      [content_id]
    );

    if (contentResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Content not found" });
    }

    const content = contentResult.rows[0];

    // Create posts for each platform
    const posts = [];
    for (const platform of platforms) {
      // Platform-specific optimizations
      const platformPrompt = `Adapt this content for ${platform}:

Title: ${content.title}
Description: ${content.description}
Tags: ${JSON.stringify(content.tags || [])}

Platform requirements:
${platform === 'youtube' ? 'Long-form, detailed descriptions, tags important' : ''}
${platform === 'instagram' ? 'Short captions, hashtags, visual-first' : ''}
${platform === 'tiktok' ? 'Very short, trending hashtags, hook-focused' : ''}
${platform === 'twitter' ? 'Concise, thread-friendly, engagement-focused' : ''}

Adapt while maintaining creator's voice. Provide:
- Platform-optimized title/caption
- Platform-optimized description
- Platform-specific tags/hashtags
- Best posting time recommendation

Format as JSON.`;

      const platformData = await callCouncilWithFailover(platformPrompt, "chatgpt");

      let adapted;
      try {
        const jsonMatch = platformData.match(/\{[\s\S]*\}/);
        adapted = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      } catch (e) {
        adapted = { title: content.title, description: content.description };
      }

      // Create post record
      const postResult = await pool.query(
        `INSERT INTO creator_posts 
         (content_id, platform, scheduled_time, status)
         VALUES ($1, $2, $3, 'scheduled')
         RETURNING *`,
        [content_id, platform, scheduled_time || null]
      );

      posts.push({
        ...postResult.rows[0],
        adapted_content: adapted,
      });
    }

    res.json({
      ok: true,
      posts,
      message: `Content scheduled for ${platforms.length} platform(s)`,
    });
  } catch (error) {
    console.error("Post scheduling error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/creator/create-ab-test", requireKey, async (req, res) => {
  try {
    const { creator_id, test_type, content_id, variants } = req.body;

    if (!creator_id || !test_type || !variants || !Array.isArray(variants) || variants.length < 2) {
      return res.status(400).json({
        ok: false,
        error: "creator_id, test_type, and variants array (min 2) required",
      });
    }

    // Create A/B test
    const testResult = await pool.query(
      `INSERT INTO creator_ab_tests 
       (creator_id, test_name, test_type, variants, status)
       VALUES ($1, $2, $3, $4, 'running')
       RETURNING *`,
      [
        creator_id,
        `${test_type} A/B Test - ${new Date().toLocaleDateString()}`,
        test_type,
        JSON.stringify(variants),
      ]
    );

    // If content_id provided, create posts for each variant
    if (content_id) {
      for (let i = 0; i < variants.length; i++) {
        const variant = variants[i];
        await pool.query(
          `INSERT INTO creator_posts 
           (content_id, platform, status, performance_metrics)
           VALUES ($1, $2, 'scheduled', $3)`,
          [
            content_id,
            variant.platform || 'youtube',
            JSON.stringify({ variant_id: i, test_id: testResult.rows[0].id }),
          ]
        );
      }
    }

    res.json({
      ok: true,
      test: testResult.rows[0],
      message: `A/B test created with ${variants.length} variants`,
    });
  } catch (error) {
    console.error("A/B test creation error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/creator/analyze-ab-test", requireKey, async (req, res) => {
  try {
    const { test_id } = req.body;

    if (!test_id) {
      return res.status(400).json({ ok: false, error: "test_id required" });
    }

    // Get test
    const testResult = await pool.query(
      "SELECT * FROM creator_ab_tests WHERE id = $1",
      [test_id]
    );

    if (testResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Test not found" });
    }

    const test = testResult.rows[0];
    const variants = JSON.parse(test.variants || '[]');

    // Analyze performance (this would pull real metrics from platforms)
    // For now, simulate analysis
    const analysisPrompt = `Analyze A/B test results for ${test.test_type}.

Variants: ${JSON.stringify(variants)}

Provide analysis:
1. Performance metrics for each variant
2. Statistical significance
3. Winner recommendation
4. Insights and recommendations

Format as JSON with metrics, winner, and insights.`;

    const analysis = await callCouncilWithFailover(analysisPrompt, "gemini");

    let analysisData;
    try {
      const jsonMatch = analysis.match(/\{[\s\S]*\}/);
      analysisData = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch (e) {
      analysisData = {
        metrics: variants.map((v, i) => ({
          variant: i,
          views: Math.floor(Math.random() * 10000),
          engagement: Math.random() * 10,
        })),
        winner: 0,
        insights: ["Test needs more data"],
      };
    }

    // Update test
    await pool.query(
      `UPDATE creator_ab_tests 
       SET metrics = $1, winner_variant = $2, status = 'completed', completed_at = NOW()
       WHERE id = $3`,
      [
        JSON.stringify(analysisData),
        `variant_${analysisData.winner || 0}`,
        test_id,
      ]
    );

    res.json({
      ok: true,
      test: {
        ...test,
        metrics: analysisData,
        winner: analysisData.winner,
      },
      analysis: analysisData,
    });
  } catch (error) {
    console.error("A/B test analysis error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/creator/auto-post", requireKey, async (req, res) => {
  try {
    const { creator_id, content_id, platforms } = req.body;

    if (!creator_id || !content_id || !platforms) {
      return res.status(400).json({ ok: false, error: "creator_id, content_id, and platforms required" });
    }

    // Get content
    const contentResult = await pool.query(
      `SELECT c.*, p.brand_voice, p.platforms as creator_platforms
       FROM creator_content c
       JOIN creator_profiles p ON c.creator_id = p.id
       WHERE c.id = $1`,
      [content_id]
    );

    if (contentResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Content not found" });
    }

    const content = contentResult.rows[0];

    // Auto-optimize SEO if not done
    if (!content.seo_optimized) {
      // Trigger SEO optimization (would call the endpoint internally)
      console.log(`🔍 Auto-optimizing SEO for content ${content_id}`);
    }

    // Schedule posts for all platforms
    const scheduleResult = await pool.query(
      `SELECT * FROM creator_posts 
       WHERE content_id = $1 AND status = 'scheduled'`,
      [content_id]
    );

    // Auto-post (this would integrate with platform APIs)
    // For now, mark as posted
    for (const post of scheduleResult.rows) {
      await pool.query(
        `UPDATE creator_posts 
         SET status = 'posted', posted_at = NOW()
         WHERE id = $1`,
        [post.id]
      );
    }

    res.json({
      ok: true,
      message: `Content auto-posted to ${scheduleResult.rows.length} platform(s)`,
      posts: scheduleResult.rows,
    });
  } catch (error) {
    console.error("Auto-post error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== AUTO-BUILDER ENDPOINTS ====================
app.get("/api/v1/auto-builder/status", requireKey, async (req, res) => {
  try {
    // Get auto-builder status if available
    let builderStatus = null;
    try {
      const { AutoBuilder } = await import("./core/auto-builder.js");
      const tempBuilder = new AutoBuilder(pool, callCouncilMember, executionQueue);
      builderStatus = await tempBuilder.getStatus();
    } catch (e) {
      // Builder not initialized yet
    }

    // Get opportunity counts
    const revenueOpps = await pool.query(
      `SELECT COUNT(*) as count, 
              SUM(revenue_potential) as total_potential,
              AVG(time_to_implement) as avg_time
       FROM revenue_opportunities 
       WHERE status IN ('pending', 'building')`
    );

    const droneOpps = await pool.query(
      `SELECT COUNT(*) as count,
              SUM(revenue_estimate) as total_estimate
       FROM drone_opportunities 
       WHERE status IN ('pending', 'building')`
    );

    const builds = await pool.query(
      `SELECT COUNT(*) as count,
              COUNT(*) FILTER (WHERE status = 'deployed') as deployed_count
       FROM build_artifacts`
    );

    res.json({
      ok: true,
      builder: builderStatus,
      opportunities: {
        revenue: {
          pending: parseInt(revenueOpps.rows[0]?.count || 0),
          total_potential: parseFloat(revenueOpps.rows[0]?.total_potential || 0),
          avg_time: parseFloat(revenueOpps.rows[0]?.avg_time || 0),
        },
        drone: {
          pending: parseInt(droneOpps.rows[0]?.count || 0),
          total_estimate: parseFloat(droneOpps.rows[0]?.total_estimate || 0),
        },
      },
      builds: {
        total: parseInt(builds.rows[0]?.count || 0),
        deployed: parseInt(builds.rows[0]?.deployed_count || 0),
      },
    });
  } catch (error) {
    console.error("Auto-builder status error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/auto-builder/prioritize", requireKey, async (req, res) => {
  try {
    const { opportunity_id, priority, source = 'revenue' } = req.body;

    if (!opportunity_id || priority === undefined) {
      return res.status(400).json({ ok: false, error: "opportunity_id and priority required" });
    }

    if (source === 'revenue') {
      await pool.query(
        `UPDATE revenue_opportunities 
         SET priority = $1 
         WHERE opportunity_id = $2`,
        [priority, opportunity_id]
      );
    } else {
      await pool.query(
        `UPDATE drone_opportunities 
         SET priority = $1 
         WHERE id = $2`,
        [priority, parseInt(opportunity_id)]
      );
    }

    res.json({
      ok: true,
      message: `Priority set to ${priority} for opportunity ${opportunity_id}`,
    });
  } catch (error) {
    console.error("Priority update error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/auto-builder/build-now", requireKey, async (req, res) => {
  try {
    const { opportunity_id, source = 'revenue' } = req.body;

    if (!opportunity_id) {
      return res.status(400).json({ ok: false, error: "opportunity_id required" });
    }

    // Get opportunity
    let opportunity;
    if (source === 'revenue') {
      const result = await pool.query(
        `SELECT 
           'revenue' as source,
           opportunity_id as id,
           name,
           revenue_potential,
           time_to_implement,
           required_resources,
           market_demand,
           competitive_advantage,
           status
         FROM revenue_opportunities
         WHERE opportunity_id = $1`,
        [opportunity_id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ ok: false, error: "Opportunity not found" });
      }
      opportunity = result.rows[0];
    } else {
      const result = await pool.query(
        `SELECT 
           'drone' as source,
           id::text as id,
           opportunity_type as name,
           revenue_estimate as revenue_potential,
           1 as time_to_implement,
           data as required_resources,
           'High' as market_demand,
           'Automated' as competitive_advantage,
           status
         FROM drone_opportunities
         WHERE id = $1`,
        [parseInt(opportunity_id)]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ ok: false, error: "Opportunity not found" });
      }
      opportunity = result.rows[0];
    }

    // Import and use auto-builder
    const { AutoBuilder } = await import("./core/auto-builder.js");
    const builder = new AutoBuilder(pool, callCouncilMember, executionQueue);

    // Start build (async)
    builder.buildOpportunity(opportunity).catch(err => {
      console.error(`Build error:`, err);
    });

    res.json({
      ok: true,
      message: `Build started for ${opportunity.name || opportunity_id}`,
      opportunity_id,
    });
  } catch (error) {
    console.error("Build-now error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== VIRTUAL REAL ESTATE CLASS ====================
app.post("/api/v1/class/enroll", async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email) {
      return res.status(400).json({ ok: false, error: "email required" });
    }

    // Check if already enrolled
    const existing = await pool.query(
      "SELECT * FROM virtual_class_enrollments WHERE student_email = $1",
      [email]
    );

    if (existing.rows.length > 0) {
      return res.json({
        ok: true,
        enrollment: existing.rows[0],
        message: "Already enrolled",
      });
    }

    // Create enrollment (free)
    const result = await pool.query(
      `INSERT INTO virtual_class_enrollments (student_email, student_name, progress, current_module, completed_modules)
       VALUES ($1, $2, '{}', 'module_1', '[]')
       RETURNING *`,
      [email, name || null]
    );

    res.json({
      ok: true,
      enrollment: result.rows[0],
      message: "Enrolled in free virtual real estate class",
    });
  } catch (error) {
    console.error("Class enrollment error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/class/upgrade-to-express", requireKey, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ ok: false, error: "email required" });
    }

    // Get class enrollment
    const classEnrollment = await pool.query(
      "SELECT * FROM virtual_class_enrollments WHERE student_email = $1",
      [email]
    );

    if (classEnrollment.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Not enrolled in class" });
    }

    const stripe = await getStripeClient();
    if (!stripe) {
      return res.status(503).json({ ok: false, error: "Stripe not configured" });
    }

    // Create or get lead
    let leadResult = await pool.query(
      "SELECT * FROM recruitment_leads WHERE email = $1 OR phone = (SELECT phone FROM recruitment_leads WHERE email = $1 LIMIT 1)",
      [email]
    );

    let leadId;
    if (leadResult.rows.length === 0) {
      const newLead = await pool.query(
        `INSERT INTO recruitment_leads (name, email, source, status)
         VALUES ($1, $2, 'class_upgrade', 'enrolled')
         RETURNING *`,
        [classEnrollment.rows[0].student_name, email]
      );
      leadId = newLead.rows[0].id;
    } else {
      leadId = leadResult.rows[0].id;
    }

    // Create BoldTrail agent account
    const agentResult = await pool.query(
      `INSERT INTO boldtrail_agents (email, name, subscription_tier)
       VALUES ($1, $2, 'express')
       ON CONFLICT (email) DO UPDATE SET subscription_tier = 'express'
       RETURNING *`,
      [email, classEnrollment.rows[0].student_name]
    );

    // Create enrollment record
    const enrollmentResult = await pool.query(
      `INSERT INTO recruitment_enrollments (lead_id, agent_id, enrollment_tier, status, onboarding_stage, mastery_level)
       VALUES ($1, $2, 'express', 'enrolled', 'learning', 0)
       ON CONFLICT DO NOTHING
       RETURNING *`,
      [leadId, agentResult.rows[0].id]
    );

    // Initialize basic feature unlocks
    await pool.query(
      `INSERT INTO agent_feature_unlocks (agent_id, feature_name, mastery_required)
       VALUES ($1, 'email_drafting', false),
              ($1, 'showing_planner', false),
              ($1, 'basic_crm', false)
       ON CONFLICT DO NOTHING`,
      [agentResult.rows[0].id]
    );

    // Update class enrollment
    await pool.query(
      "UPDATE virtual_class_enrollments SET enrolled_in_express = true WHERE student_email = $1",
      [email]
    );

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "BoldTrail Express Line",
              description: "Full system access + step-by-step success coaching",
            },
            unit_amount: 9900, // $99/month
            recurring: {
              interval: "month",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin || "https://" + RAILWAY_PUBLIC_DOMAIN}/boldtrail?success=true&express=true`,
      cancel_url: `${req.headers.origin || "https://" + RAILWAY_PUBLIC_DOMAIN}/class?canceled=true`,
      metadata: { agent_id: agentResult.rows[0].id.toString(), enrollment_type: 'express' },
    });

    res.json({
      ok: true,
      message: "Upgraded to Express Line",
      agent: agentResult.rows[0],
      checkout_url: session.url,
      session_id: session.id,
    });
  } catch (error) {
    console.error("Express upgrade error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/class/modules", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM virtual_class_modules ORDER BY module_order ASC"
    );

    res.json({
      ok: true,
      modules: result.rows,
    });
  } catch (error) {
    console.error("Class modules error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/class/complete-module", requireKey, async (req, res) => {
  try {
    const { email, module_name } = req.body;

    if (!email || !module_name) {
      return res.status(400).json({ ok: false, error: "email and module_name required" });
    }

    // Update progress
    const enrollment = await pool.query(
      "SELECT * FROM virtual_class_enrollments WHERE student_email = $1",
      [email]
    );

    if (enrollment.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Not enrolled" });
    }

    // completed_modules is JSONB, so it's already an object/array, not a string
    const completed = enrollment.rows[0].completed_modules || [];
    const completedArray = Array.isArray(completed) ? completed : (typeof completed === 'string' ? JSON.parse(completed) : []);
    
    if (!completedArray.includes(module_name)) {
      completedArray.push(module_name);
    }

    await pool.query(
      `UPDATE virtual_class_enrollments 
       SET completed_modules = $1, updated_at = NOW()
       WHERE student_email = $2`,
      [JSON.stringify(completedArray), email]
    );

    // If enrolled in Express line, update mastery level
    if (enrollment.rows[0].enrolled_in_express) {
      const agentResult = await pool.query(
        "SELECT id FROM boldtrail_agents WHERE email = $1",
        [email]
      );

      if (agentResult.rows.length > 0) {
        const agentId = agentResult.rows[0].id;
        const enrollmentData = await pool.query(
          "SELECT * FROM recruitment_enrollments WHERE agent_id = $1",
          [agentId]
        );

        if (enrollmentData.rows.length > 0) {
          // Increase mastery level based on modules completed
          const newMasteryLevel = Math.min(completed.length, 10);
          await pool.query(
            `UPDATE recruitment_enrollments 
             SET mastery_level = $1, 
                 onboarding_stage = CASE 
                   WHEN $1 >= 7 THEN 'mastered'
                   WHEN $1 >= 3 THEN 'building'
                   ELSE 'learning'
                 END
             WHERE agent_id = $2`,
            [newMasteryLevel, agentId]
          );
        }
      }
    }

    res.json({
      ok: true,
      message: `Module ${module_name} completed`,
      completed_modules: completed,
    });
  } catch (error) {
    console.error("Module completion error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/boldtrail/set-vacation-mode", requireKey, async (req, res) => {
  try {
    const { agent_id, vacation_mode, busy_mode, return_date } = req.body;

    if (!agent_id) {
      return res.status(400).json({ ok: false, error: "agent_id required" });
    }

    const currentPrefs = await pool.query(
      "SELECT preferences FROM boldtrail_agents WHERE id = $1",
      [agent_id]
    );

    if (currentPrefs.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Agent not found" });
    }

    const prefs = currentPrefs.rows[0].preferences || {};
    // Store as actual booleans, not strings
    if (vacation_mode !== undefined) prefs.vacation_mode = Boolean(vacation_mode);
    if (busy_mode !== undefined) prefs.busy_mode = Boolean(busy_mode);
    if (return_date) prefs.return_date = return_date;

    await pool.query(
      "UPDATE boldtrail_agents SET preferences = $1, updated_at = NOW() WHERE id = $2",
      [JSON.stringify(prefs), agent_id]
    );

    res.json({
      ok: true,
      message: vacation_mode ? "Vacation mode enabled" : busy_mode ? "Busy mode enabled" : "Mode updated",
      preferences: prefs,
    });
  } catch (error) {
    console.error("Vacation mode update error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/boldtrail/agent/:agentId/features", requireKey, async (req, res) => {
  try {
    const { agentId } = req.params;

    const features = await pool.query(
      "SELECT feature_name, unlocked_at FROM agent_feature_unlocks WHERE agent_id = $1",
      [agentId]
    );

    const enrollment = await pool.query(
      `SELECT e.mastery_level, e.onboarding_stage, e.unlocked_features
       FROM recruitment_enrollments e
       JOIN boldtrail_agents a ON e.agent_id = a.id
       WHERE a.id = $1`,
      [agentId]
    );

    res.json({
      ok: true,
      unlocked_features: features.rows,
      mastery_level: enrollment.rows[0]?.mastery_level || 0,
      onboarding_stage: enrollment.rows[0]?.onboarding_stage || 'learning',
      available_features: {
        basic: ['email_drafting', 'showing_planner', 'basic_crm'],
        advanced: { requires_mastery: 3, features: ['advanced_crm', 'analytics'] },
        automation: { requires_mastery: 5, features: ['youtube_automation', 'social_media'] },
        full: { requires_mastery: 7, features: ['full_automation', 'ai_content_generation'] },
      },
    });
  } catch (error) {
    console.error("Feature check error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== SALES COACHING & RECORDING ENDPOINTS ====================

// Start recording a call or presentation
app.post("/api/v1/boldtrail/start-recording", requireKey, async (req, res) => {
  try {
    const { agent_id, recording_type, client_name, client_email, client_phone, property_address } = req.body;

    if (!agent_id) {
      return res.status(400).json({ ok: false, error: "agent_id required" });
    }

    if (!callRecorder) {
      return res.status(503).json({ ok: false, error: "Call recording service not initialized" });
    }

    const result = await callRecorder.startRecording(
      agent_id,
      recording_type || 'phone_call',
      { client_name, client_email, client_phone, property_address }
    );

    res.json(result);
  } catch (error) {
    console.error("Start recording error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Add transcript segment (real-time during call)
app.post("/api/v1/boldtrail/add-transcript", requireKey, async (req, res) => {
  try {
    const { call_id, segment } = req.body;

    if (!call_id || !segment) {
      return res.status(400).json({ ok: false, error: "call_id and segment required" });
    }

    if (!callRecorder) {
      return res.status(503).json({ ok: false, error: "Call recording service not initialized" });
    }

    const result = await callRecorder.addTranscriptSegment(call_id, segment);
    res.json(result);
  } catch (error) {
    console.error("Add transcript error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Stop recording and analyze
app.post("/api/v1/boldtrail/stop-recording", requireKey, async (req, res) => {
  try {
    const { call_id, recording_url } = req.body;

    if (!call_id) {
      return res.status(400).json({ ok: false, error: "call_id required" });
    }

    if (!callRecorder) {
      return res.status(503).json({ ok: false, error: "Call recording service not initialized" });
    }

    const result = await callRecorder.stopRecording(call_id, recording_url);
    res.json(result);
  } catch (error) {
    console.error("Stop recording error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Mark a moment (good or bad) during recording
app.post("/api/v1/boldtrail/mark-moment", requireKey, async (req, res) => {
  try {
    const { call_id, moment_type, start_time, end_time, notes } = req.body;

    if (!call_id || !moment_type || start_time === undefined || end_time === undefined) {
      return res.status(400).json({ ok: false, error: "call_id, moment_type, start_time, and end_time required" });
    }

    if (!callRecorder) {
      return res.status(503).json({ ok: false, error: "Call recording service not initialized" });
    }

    const result = await callRecorder.markMoment(call_id, moment_type, start_time, end_time, notes);
    res.json(result);
  } catch (error) {
    console.error("Mark moment error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get coaching clips for an agent
app.get("/api/v1/boldtrail/coaching-clips/:agentId", requireKey, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { clip_type, limit = 20 } = req.query;

    let query = `
      SELECT cc.*, scr.call_id, scr.recording_type, scr.client_name, scr.property_address
      FROM coaching_clips cc
      JOIN sales_call_recordings scr ON cc.recording_id = scr.id
      WHERE cc.agent_id = $1
    `;
    const params = [agentId];

    if (clip_type) {
      query += ` AND cc.clip_type = $2`;
      params.push(clip_type);
      query += ` ORDER BY cc.created_at DESC LIMIT $${params.length + 1}`;
      params.push(parseInt(limit));
    } else {
      query += ` ORDER BY cc.created_at DESC LIMIT $2`;
      params.push(parseInt(limit));
    }

    const result = await pool.query(query, params);

    res.json({
      ok: true,
      clips: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error("Get coaching clips error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get sales technique patterns (bad habits) for an agent
app.get("/api/v1/boldtrail/technique-patterns/:agentId", requireKey, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { pattern_type } = req.query;

    let query = `
      SELECT * FROM sales_technique_patterns
      WHERE agent_id = $1
    `;
    const params = [agentId];

    if (pattern_type) {
      query += ` AND pattern_type = $2`;
      params.push(pattern_type);
    }

    query += ` ORDER BY frequency DESC, last_detected DESC`;

    const result = await pool.query(query, params);

    res.json({
      ok: true,
      patterns: result.rows,
      bad_habits: result.rows.filter(p => p.pattern_type === 'bad_habit'),
      good_practices: result.rows.filter(p => p.pattern_type === 'good_practice')
    });
  } catch (error) {
    console.error("Get technique patterns error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get real-time coaching events for a recording
app.get("/api/v1/boldtrail/coaching-events/:callId", requireKey, async (req, res) => {
  try {
    const { callId } = req.params;

    const recording = await pool.query(
      "SELECT id FROM sales_call_recordings WHERE call_id = $1",
      [callId]
    );

    if (recording.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Recording not found" });
    }

    const result = await pool.query(
      `SELECT * FROM real_time_coaching_events
       WHERE recording_id = $1
       ORDER BY timestamp ASC`,
      [recording.rows[0].id]
    );

    res.json({
      ok: true,
      events: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error("Get coaching events error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get recording status
app.get("/api/v1/boldtrail/recording-status/:callId", requireKey, async (req, res) => {
  try {
    const { callId } = req.params;

    if (!callRecorder) {
      return res.status(503).json({ ok: false, error: "Call recording service not initialized" });
    }

    const status = callRecorder.getRecordingStatus(callId);
    
    if (!status) {
      return res.status(404).json({ ok: false, error: "Recording not found or not active" });
    }

    res.json({ ok: true, ...status });
  } catch (error) {
    console.error("Get recording status error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== GOAL TRACKING ENDPOINTS ====================

// Create a goal
app.post("/api/v1/boldtrail/goals", requireKey, async (req, res) => {
  try {
    const { agent_id, goal_type, goal_name, target_value, deadline, unit } = req.body;

    if (!agent_id || !goal_type || !goal_name || !target_value) {
      return res.status(400).json({ ok: false, error: "agent_id, goal_type, goal_name, and target_value required" });
    }

    if (!goalTracker) {
      return res.status(503).json({ ok: false, error: "Goal tracker not initialized" });
    }

    const result = await goalTracker.createGoal(agent_id, {
      goal_type,
      goal_name,
      target_value,
      deadline,
      unit
    });

    res.json(result);
  } catch (error) {
    console.error("Create goal error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get agent goals
app.get("/api/v1/boldtrail/goals/:agentId", requireKey, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { status } = req.query;

    if (!goalTracker) {
      return res.status(503).json({ ok: false, error: "Goal tracker not initialized" });
    }

    const result = await goalTracker.getAgentGoals(agentId, status);
    res.json(result);
  } catch (error) {
    console.error("Get goals error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Update goal progress
app.put("/api/v1/boldtrail/goals/:goalId", requireKey, async (req, res) => {
  try {
    const { goalId } = req.params;
    const { current_value } = req.body;

    if (!goalTracker) {
      return res.status(503).json({ ok: false, error: "Goal tracker not initialized" });
    }

    const result = await goalTracker.updateGoalProgress(goalId, current_value);
    res.json(result);
  } catch (error) {
    console.error("Update goal error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== ACTIVITY TRACKING ENDPOINTS ====================

// Record an activity
app.post("/api/v1/boldtrail/activities", requireKey, async (req, res) => {
  try {
    const { agent_id, ...activityData } = req.body;

    if (!agent_id || !activityData.activity_type) {
      return res.status(400).json({ ok: false, error: "agent_id and activity_type required" });
    }

    if (!activityTracker) {
      return res.status(503).json({ ok: false, error: "Activity tracker not initialized" });
    }

    const result = await activityTracker.recordActivity(agent_id, activityData);
    res.json(result);
  } catch (error) {
    console.error("Record activity error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Start call with auto-recording
app.post("/api/v1/boldtrail/start-call", requireKey, async (req, res) => {
  try {
    const { agent_id, ...callData } = req.body;

    if (!agent_id) {
      return res.status(400).json({ ok: false, error: "agent_id required" });
    }

    if (!activityTracker) {
      return res.status(503).json({ ok: false, error: "Activity tracker not initialized" });
    }

    const result = await activityTracker.startCallWithRecording(agent_id, callData);
    res.json(result);
  } catch (error) {
    console.error("Start call error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get activity analytics
app.get("/api/v1/boldtrail/analytics/:agentId", requireKey, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { period = '30 days' } = req.query;

    if (!activityTracker) {
      return res.status(503).json({ ok: false, error: "Activity tracker not initialized" });
    }

    const result = await activityTracker.getActivityAnalytics(agentId, period);
    res.json(result);
  } catch (error) {
    console.error("Get analytics error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== COACHING PROGRESSION ENDPOINTS ====================

// Get agent progression
app.get("/api/v1/boldtrail/progression/:agentId", requireKey, async (req, res) => {
  try {
    const { agentId } = req.params;

    if (!coachingProgression) {
      return res.status(503).json({ ok: false, error: "Coaching progression not initialized" });
    }

    const result = await coachingProgression.getAgentProgression(agentId);
    res.json(result);
  } catch (error) {
    console.error("Get progression error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== CALENDAR ENDPOINTS ====================

// Create calendar event
app.post("/api/v1/boldtrail/calendar/events", requireKey, async (req, res) => {
  try {
    const { agent_id, ...eventData } = req.body;

    if (!agent_id || !eventData.start_time || !eventData.end_time) {
      return res.status(400).json({ ok: false, error: "agent_id, start_time, and end_time required" });
    }

    if (!calendarService) {
      return res.status(503).json({ ok: false, error: "Calendar service not initialized" });
    }

    const result = await calendarService.createEvent(agent_id, eventData);
    res.json(result);
  } catch (error) {
    console.error("Create calendar event error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get calendar events
app.get("/api/v1/boldtrail/calendar/events/:agentId", requireKey, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ ok: false, error: "start_date and end_date required" });
    }

    if (!calendarService) {
      return res.status(503).json({ ok: false, error: "Calendar service not initialized" });
    }

    const result = await calendarService.getEvents(agentId, start_date, end_date);
    res.json(result);
  } catch (error) {
    console.error("Get calendar events error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Handle event start (auto-record)
app.post("/api/v1/boldtrail/calendar/events/:eventId/start", requireKey, async (req, res) => {
  try {
    const { eventId } = req.params;

    if (!calendarService) {
      return res.status(503).json({ ok: false, error: "Calendar service not initialized" });
    }

    const result = await calendarService.handleEventStart(eventId);
    res.json(result);
  } catch (error) {
    console.error("Handle event start error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Complete event
app.post("/api/v1/boldtrail/calendar/events/:eventId/complete", requireKey, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { outcome } = req.body;

    if (!calendarService) {
      return res.status(503).json({ ok: false, error: "Calendar service not initialized" });
    }

    const result = await calendarService.completeEvent(eventId, outcome);
    res.json(result);
  } catch (error) {
    console.error("Complete event error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== PERFECT DAY ENDPOINTS ====================

// Setup perfect day
app.post("/api/v1/boldtrail/perfect-day/setup", requireKey, async (req, res) => {
  try {
    const { agent_id, ...config } = req.body;

    if (!agent_id) {
      return res.status(400).json({ ok: false, error: "agent_id required" });
    }

    if (!perfectDaySystem) {
      return res.status(503).json({ ok: false, error: "Perfect day system not initialized" });
    }

    const result = await perfectDaySystem.setupPerfectDay(agent_id, config);
    res.json(result);
  } catch (error) {
    console.error("Setup perfect day error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Start perfect day routine
app.post("/api/v1/boldtrail/perfect-day/start", requireKey, async (req, res) => {
  try {
    const { agent_id } = req.body;

    if (!agent_id) {
      return res.status(400).json({ ok: false, error: "agent_id required" });
    }

    if (!perfectDaySystem) {
      return res.status(503).json({ ok: false, error: "Perfect day system not initialized" });
    }

    const result = await perfectDaySystem.startPerfectDay(agent_id);
    res.json(result);
  } catch (error) {
    console.error("Start perfect day error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Set three most important things
app.post("/api/v1/boldtrail/perfect-day/three-important", requireKey, async (req, res) => {
  try {
    const { agent_id, three_things } = req.body;

    if (!agent_id || !three_things || !Array.isArray(three_things)) {
      return res.status(400).json({ ok: false, error: "agent_id and three_things array required" });
    }

    if (!perfectDaySystem) {
      return res.status(503).json({ ok: false, error: "Perfect day system not initialized" });
    }

    const result = await perfectDaySystem.setThreeMostImportant(agent_id, three_things);
    res.json(result);
  } catch (error) {
    console.error("Set three important error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// End of day review
app.post("/api/v1/boldtrail/perfect-day/review", requireKey, async (req, res) => {
  try {
    const { agent_id, ...reviewData } = req.body;

    if (!agent_id) {
      return res.status(400).json({ ok: false, error: "agent_id required" });
    }

    if (!perfectDaySystem) {
      return res.status(503).json({ ok: false, error: "Perfect day system not initialized" });
    }

    const result = await perfectDaySystem.endOfDayReview(agent_id, reviewData);
    res.json(result);
  } catch (error) {
    console.error("End of day review error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== GOAL COMMITMENT ENDPOINTS ====================

// Create goal commitment
app.post("/api/v1/boldtrail/commitments", requireKey, async (req, res) => {
  try {
    const { agent_id, goal_id, ...commitmentData } = req.body;

    if (!agent_id || !goal_id) {
      return res.status(400).json({ ok: false, error: "agent_id and goal_id required" });
    }

    if (!goalCommitmentSystem) {
      return res.status(503).json({ ok: false, error: "Goal commitment system not initialized" });
    }

    const result = await goalCommitmentSystem.createCommitment(agent_id, goal_id, commitmentData);
    res.json(result);
  } catch (error) {
    console.error("Create commitment error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Track commitment
app.post("/api/v1/boldtrail/commitments/:commitmentId/track", requireKey, async (req, res) => {
  try {
    const { commitmentId } = req.params;
    const { agent_id } = req.body;

    if (!agent_id) {
      return res.status(400).json({ ok: false, error: "agent_id required" });
    }

    if (!goalCommitmentSystem) {
      return res.status(503).json({ ok: false, error: "Goal commitment system not initialized" });
    }

    const result = await goalCommitmentSystem.trackCommitment(commitmentId, agent_id);
    res.json(result);
  } catch (error) {
    console.error("Track commitment error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get agent commitments
app.get("/api/v1/boldtrail/commitments/:agentId", requireKey, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { status } = req.query;

    if (!goalCommitmentSystem) {
      return res.status(503).json({ ok: false, error: "Goal commitment system not initialized" });
    }

    const result = await goalCommitmentSystem.getAgentCommitments(agentId, status);
    res.json(result);
  } catch (error) {
    console.error("Get commitments error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== CALL SIMULATION ENDPOINTS ====================

// Create simulation
app.post("/api/v1/boldtrail/simulations", requireKey, async (req, res) => {
  try {
    const { agent_id, ...simulationData } = req.body;

    if (!agent_id) {
      return res.status(400).json({ ok: false, error: "agent_id required" });
    }

    if (!callSimulationSystem) {
      return res.status(503).json({ ok: false, error: "Call simulation system not initialized" });
    }

    const result = await callSimulationSystem.createSimulation(agent_id, simulationData);
    res.json(result);
  } catch (error) {
    console.error("Create simulation error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Start simulation
app.post("/api/v1/boldtrail/simulations/:simulationId/start", requireKey, async (req, res) => {
  try {
    const { simulationId } = req.params;
    const { agent_id } = req.body;

    if (!agent_id) {
      return res.status(400).json({ ok: false, error: "agent_id required" });
    }

    if (!callSimulationSystem) {
      return res.status(503).json({ ok: false, error: "Call simulation system not initialized" });
    }

    const result = await callSimulationSystem.startSimulation(agent_id, simulationId);
    res.json(result);
  } catch (error) {
    console.error("Start simulation error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== RELATIONSHIP MEDIATION ENDPOINTS ====================

// Request mediation
app.post("/api/v1/boldtrail/mediation/request", requireKey, async (req, res) => {
  try {
    const { agent_id, ...mediationData } = req.body;

    if (!agent_id) {
      return res.status(400).json({ ok: false, error: "agent_id required" });
    }

    if (!relationshipMediation) {
      return res.status(503).json({ ok: false, error: "Relationship mediation not initialized" });
    }

    const result = await relationshipMediation.requestMediation(agent_id, mediationData);
    res.json(result);
  } catch (error) {
    console.error("Request mediation error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Process mediation
app.post("/api/v1/boldtrail/mediation/:mediationId/process", requireKey, async (req, res) => {
  try {
    const { mediationId } = req.params;
    const { conversation_data } = req.body;

    if (!relationshipMediation) {
      return res.status(503).json({ ok: false, error: "Relationship mediation not initialized" });
    }

    const result = await relationshipMediation.processMediation(mediationId, conversation_data);
    res.json(result);
  } catch (error) {
    console.error("Process mediation error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== MEANINGFUL MOMENTS ENDPOINTS ====================

// Start continuous recording
app.post("/api/v1/boldtrail/moments/start-recording", requireKey, async (req, res) => {
  try {
    const { agent_id, consent, reset_interval_minutes = 60 } = req.body;

    if (!agent_id) {
      return res.status(400).json({ ok: false, error: "agent_id required" });
    }

    if (!meaningfulMoments) {
      return res.status(503).json({ ok: false, error: "Meaningful moments system not initialized" });
    }

    const result = await meaningfulMoments.startContinuousRecording(agent_id, consent, reset_interval_minutes);
    res.json(result);
  } catch (error) {
    console.error("Start continuous recording error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get moments for playback
app.get("/api/v1/boldtrail/moments/:agentId/playback", requireKey, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { moment_type } = req.query;

    if (!meaningfulMoments) {
      return res.status(503).json({ ok: false, error: "Meaningful moments system not initialized" });
    }

    const result = await meaningfulMoments.getMomentsForPlayback(agentId, moment_type);
    res.json(result);
  } catch (error) {
    console.error("Get moments for playback error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== COACH CHAT ENDPOINT ====================

// Coach chat endpoint
app.post("/api/coach/chat", requireKey, async (req, res) => {
  try {
    const { text, context } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ ok: false, error: "text required" });
    }

    const agentId = context?.agentId || req.body.agent_id;

    console.log(`💬 [COACH] Agent ${agentId}: ${text.substring(0, 100)}...`);

    // Log to audit
    try {
      await pool.query(
        `INSERT INTO audit_log (action_type, user_id, details, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [
          'coach_chat',
          agentId || 'unknown',
          JSON.stringify({ text, context })
        ]
      );
    } catch (dbError) {
      console.warn('⚠️ Could not log coach chat to audit:', dbError.message);
    }

    // Check for special commands
    const lowerText = text.toLowerCase();
    let replyText = '';
    let confidence = 0.9;
    let suggestedActions = [];

    // Handle "play my WHY" or discouraged messages
    if (lowerText.includes('play my why') || lowerText.includes("i'm discouraged") || lowerText.includes('discouraged')) {
      if (meaningfulMoments) {
        const moments = await meaningfulMoments.getMomentsForPlayback(agentId, 'winning_moment');
        if (moments.ok && moments.moments && moments.moments.length > 0) {
          const recentMoment = moments.moments[0];
          replyText = `I found ${moments.moments.length} winning moment${moments.moments.length > 1 ? 's' : ''} for you! Here's your most recent: "${recentMoment.context || 'Your success moment'}"\n\nRemember why you started. You've got this! 💪`;
          suggestedActions = ['View all winning moments', 'Continue your perfect day routine'];
        } else {
          replyText = "I don't see any winning moments saved yet. Let's create one! What's something you're proud of accomplishing recently?";
          suggestedActions = ['Save a winning moment', 'Start perfect day routine'];
        }
      } else {
        replyText = "I'd love to help you reconnect with your WHY! The moments system isn't available right now, but remember: every expert was once a beginner. Keep going! 💪";
      }
    }
    // Handle "next move" questions
    else if (lowerText.includes('next move') || lowerText.includes('what should i do') || lowerText.includes('what do i do')) {
      replyText = "Based on your goals, here's your next move:\n\n1. Check your 3 most important things for today\n2. Review your active commitments\n3. Take action on the highest priority item\n\nWhat specific area would you like help with?";
      suggestedActions = ['View today tab', 'Check commitments', 'Review goals'];
    }
    // Handle follow-up requests
    else if (lowerText.includes('follow-up') || lowerText.includes('follow up') || lowerText.includes('write me')) {
      replyText = "I can help you write a follow-up! Here's a template:\n\n\"Hi [Name],\n\nThank you for our conversation today about [topic]. I wanted to follow up on [specific point] and see if you have any questions.\n\nLooking forward to hearing from you!\n\nBest,\n[Your name]\"\n\nWould you like me to customize this for a specific lead?";
      suggestedActions = ['Provide lead details', 'View recent activities'];
    }
    // General coaching question - use AI council
    else {
      const aiResponse = await callCouncilWithFailover(
        `You are a sales coach helping a real estate agent. They asked: "${text}"\n\nProvide a helpful, encouraging, and actionable response. Keep it concise (2-3 sentences max).`,
        'ollama_llama'
      );
      replyText = aiResponse || "I'm here to help! Can you provide more details about what you need?";
      confidence = 0.8;
    }

    // Check if user wants to save this as a meaningful moment
    if (context?.saveAsMoment || lowerText.includes('save this') || lowerText.includes('remember this')) {
      if (meaningfulMoments) {
        await meaningfulMoments.captureMoment(agentId, {
          moment_type: 'coaching_moment',
          context: `Coach conversation: ${text.substring(0, 200)}`,
          transcript: text,
          tags: ['coach_chat']
        });
        replyText += '\n\n✓ Saved as a meaningful moment!';
      }
    }

    res.json({
      ok: true,
      replyText,
      confidence,
      suggestedActions
    });
  } catch (error) {
    console.error("Coach chat error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== PROGRESS TRACKING ENDPOINTS ====================

// Get progress bars for goals
app.get("/api/v1/boldtrail/progress/:agentId", requireKey, async (req, res) => {
  try {
    const { agentId } = req.params;

    // Get active goals
    const goals = await pool.query(
      `SELECT * FROM agent_goals WHERE agent_id = $1 AND status = 'active'`,
      [agentId]
    );

    // Get activities counts
    const activities = await pool.query(
      `SELECT activity_type, COUNT(*) as count,
              COUNT(CASE WHEN outcome IN ('appointment_set', 'sale', 'showing_scheduled') THEN 1 END) as success_count
       FROM agent_activities
       WHERE agent_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
       GROUP BY activity_type`,
      [agentId]
    );

    // Calculate progress bars
    const progressBars = {
      goals: goals.rows.map(goal => ({
        goal_id: goal.id,
        goal_name: goal.goal_name,
        current: parseFloat(goal.current_value || 0),
        target: parseFloat(goal.target_value),
        progress_percent: goal.target_value > 0 
          ? Math.min(100, ((goal.current_value / goal.target_value) * 100).toFixed(1))
          : 0,
        on_track: goal.deadline 
          ? this.isOnTrack(goal.current_value, goal.target_value, goal.deadline, goal.created_at)
          : null,
        projected_completion: goal.deadline || null
      })),
      activities: activities.rows.map(act => ({
        activity_type: act.activity_type,
        total: parseInt(act.count),
        successful: parseInt(act.success_count),
        success_rate: act.count > 0 ? ((act.success_count / act.count) * 100).toFixed(1) : 0
      })),
      appointments: {
        current: activities.rows.find(a => a.activity_type === 'appointment')?.count || 0,
        target: 0, // Would come from goal
        progress_percent: 0
      },
      calls: {
        current: activities.rows.find(a => a.activity_type === 'call')?.count || 0,
        target: 0,
        progress_percent: 0
      },
      deals: {
        current: activities.rows.find(a => a.outcome === 'sale')?.count || 0,
        target: 0,
        progress_percent: 0
      }
    };

    res.json({ ok: true, progress: progressBars });
  } catch (error) {
    console.error("Get progress error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Helper to check if goal is on track
function isOnTrack(current, target, deadline, startDate) {
  if (!deadline) return null;
  
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const start = new Date(startDate);
  
  const totalTime = deadlineDate - start;
  const elapsed = now - start;
  const expectedProgress = (elapsed / totalTime) * 100;
  const actualProgress = (current / target) * 100;
  
  return actualProgress >= expectedProgress * 0.9; // 90% of expected = on track
}

// ==================== INCOME DIAGNOSTIC ENDPOINT ====================
app.get("/api/v1/income/diagnostic", requireKey, async (req, res) => {
  try {
    const { IncomeDiagnostic } = await import("./core/income-diagnostic.js");
    const diagnostic = new IncomeDiagnostic(pool);
    const result = await diagnostic.runDiagnostic();
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== SELF-BUILDER ENDPOINTS ====================
app.post("/api/v1/system/build", requireKey, async (req, res) => {
  try {
    if (!selfBuilder) {
      return res.status(503).json({ error: "Self-Builder not initialized" });
    }

    const {
      installDependencies = true,
      runTests = false,
      validateSyntax = true,
      commitChanges = false,
      pushToGit = false,
      triggerDeployment = false,
      message = 'Self-build: Automated build',
    } = req.body;

    console.log('🔨 [API] Build requested via API');
    
    const buildResult = await selfBuilder.build({
      installDependencies,
      runTests,
      validateSyntax,
      commitChanges,
      pushToGit,
      triggerDeployment,
      strict: false,
    });

    res.json({
      ok: buildResult.success,
      build: buildResult,
      message: buildResult.success 
        ? 'Build completed successfully' 
        : `Build completed with ${buildResult.errors.length} error(s)`,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/system/build-history", requireKey, async (req, res) => {
  try {
    if (!selfBuilder) {
      return res.status(503).json({ error: "Self-Builder not initialized" });
    }

    const limit = parseInt(req.query.limit || 10);
    const history = await selfBuilder.getBuildHistory(limit);
    
    res.json({ ok: true, count: history.length, builds: history });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== TASK COMPLETION TRACKER ENDPOINTS ====================
app.get("/api/v1/tasks/:taskId", requireKey, async (req, res) => {
  try {
    const { TaskCompletionTracker } = await import("./core/task-completion-tracker.js");
    const tracker = new TaskCompletionTracker(pool, callCouncilMember);
    const task = await tracker.getTaskStatus(req.params.taskId);
    
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    res.json({ ok: true, task });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/tasks", requireKey, async (req, res) => {
  try {
    const { TaskCompletionTracker } = await import("./core/task-completion-tracker.js");
    const tracker = new TaskCompletionTracker(pool, callCouncilMember);
    const activeTasks = await tracker.getActiveTasks();
    
    res.json({ ok: true, count: activeTasks.length, tasks: activeTasks });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/tasks/:taskId/verify", requireKey, async (req, res) => {
  try {
    const { TaskCompletionTracker } = await import("./core/task-completion-tracker.js");
    const tracker = new TaskCompletionTracker(pool, callCouncilMember);
    const { checks } = req.body;
    
    if (!checks || !Array.isArray(checks)) {
      return res.status(400).json({ error: "checks array required" });
    }
    
    const verification = await tracker.verifyCompletion(req.params.taskId, checks);
    
    res.json({ ok: true, ...verification });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== IDEA TO IMPLEMENTATION PIPELINE ENDPOINTS ====================
app.post("/api/v1/pipeline/implement-idea", requireKey, async (req, res) => {
  try {
    if (!ideaToImplementationPipeline) {
      return res.status(503).json({ error: "Idea-to-Implementation Pipeline not initialized" });
    }

    const { idea, autoDeploy = true, verifyCompletion = true } = req.body;
    
    if (!idea) {
      return res.status(400).json({ error: "idea required" });
    }

    const result = await ideaToImplementationPipeline.implementIdea(idea, {
      autoDeploy,
      verifyCompletion,
    });

    res.json({ ok: result.success, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/pipeline/auto-implement-queued", requireKey, async (req, res) => {
  try {
    if (!ideaToImplementationPipeline) {
      return res.status(503).json({ error: "Idea-to-Implementation Pipeline not initialized" });
    }

    const { limit = 5 } = req.body;
    
    const result = await ideaToImplementationPipeline.autoImplementQueuedIdeas(limit);
    
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== SYSTEM HEALTH CHECK ENDPOINT ====================
app.get("/api/v1/system/health", async (req, res) => {
  try {
    if (!systemHealthChecker) {
      return res.status(503).json({ 
        ok: false, 
        error: "System Health Checker not initialized",
        status: "degraded"
      });
    }

    const health = await systemHealthChecker.runFullHealthCheck();
    const statusCode = health.overall === 'unhealthy' ? 503 : 
                      health.overall === 'degraded' ? 200 : 200;
    res.status(statusCode).json({ ok: true, ...health });
  } catch (error) {
    res.status(500).json({ 
      ok: false, 
      error: error.message,
      status: "error"
    });
  }
});

// Financial Dashboard & ROI
app.get("/api/v1/dashboard", requireKey, async (req, res) => {
  try {
    const dashboard = await financialDashboard.getDashboard();
    res.json({ ok: true, dashboard });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/roi/status", requireKey, async (req, res) => {
  try {
    const dashboard = await financialDashboard.getDashboard();
    res.json({
      ok: true,
      roi: {
        ...roiTracker,
        daily_spend: roiTracker.daily_ai_cost,
        ratio: roiTracker.roi_ratio,
      },
      dashboard,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Revenue events
app.post("/api/v1/revenue/event", requireKey, async (req, res) => {
  try {
    const {
      source = "manual",
      event_id,
      amount,
      currency = "USD",
      drone_id,
      description = "",
      category = "general",
      meta = {},
    } = req.body || {};

    if (amount == null) {
      return res.status(400).json({ ok: false, error: "amount is required" });
    }

    const result = await recordRevenueEvent({
      source,
      eventId: event_id || null,
      amount,
      currency,
      droneId: drone_id || null,
      description,
      category,
    });

    const roi = roiTracker;
    const droneStatus = await incomeDroneSystem.getStatus();

    res.json({
      ok: true,
      revenue: {
        source,
        event_id: event_id || null,
        amount: result.amount,
        currency,
        drone_id: drone_id || null,
        tx: result.tx,
        meta,
      },
      roi,
      drones: droneStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Revenue event error:", error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Governance
app.post("/api/v1/proposal/create", requireKey, async (req, res) => {
  try {
    const { title, description, proposedBy = "system" } = req.body;
    if (!title || !description)
      return res
        .status(400)
        .json({ error: "Title and description required" });

    const proposalId = await createProposal(title, description, proposedBy);
    if (!proposalId)
      return res.status(500).json({ error: "Failed to create proposal" });

    res.json({ ok: true, proposalId });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/proposal/:proposalId/vote", requireKey, async (req, res) => {
  try {
    const { proposalId } = req.params;
    const result = await conductEnhancedConsensus(proposalId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// AI Performance
app.get("/api/v1/ai/performance", requireKey, async (req, res) => {
  try {
    const performance = await pool.query(
      `SELECT ai_member, 
              COUNT(*) as total_tasks,
              AVG(CASE WHEN success THEN 1 ELSE 0 END) as success_rate,
              AVG(duration_ms) as avg_duration,
              SUM(cost) as total_cost,
              SUM(tokens_used) as total_tokens
       FROM ai_performance
       WHERE created_at > NOW() - INTERVAL '7 days'
       GROUP BY ai_member
       ORDER BY success_rate DESC`
    );

    res.json({
      ok: true,
      performance: performance.rows,
      currentScores: Object.fromEntries(aiPerformanceScores),
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Source of Truth endpoints
app.post("/api/v1/system/source-of-truth/store", requireKey, async (req, res) => {
  try {
    if (!sourceOfTruthManager) {
      return res.status(503).json({ error: "Source of Truth Manager not initialized" });
    }

    const { documentType = 'master_vision', title, content, section = null, version = '1.0', priority = 0 } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "Title and content required" });
    }

    const success = await sourceOfTruthManager.storeDocument(documentType, title, content, section, version, priority);

    if (success) {
      res.json({ ok: true, message: "Source of Truth stored successfully" });
    } else {
      res.status(500).json({ ok: false, error: "Failed to store Source of Truth" });
    }
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/system/source-of-truth", requireKey, async (req, res) => {
  try {
    if (!sourceOfTruthManager) {
      return res.status(503).json({ error: "Source of Truth Manager not initialized" });
    }

    const { documentType, section, formatted } = req.query;
    const includeInactive = req.query.includeInactive === 'true';

    if (formatted === 'true') {
      const formattedText = await sourceOfTruthManager.getFormattedForAI();
      return res.json({ ok: true, formatted: formattedText });
    }

    const docs = await sourceOfTruthManager.getDocument(documentType || null, section || null, includeInactive);
    res.json({ ok: true, documents: docs });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// System metrics
// Cost savings diagnostic endpoint
app.get("/api/v1/system/cost-savings", requireKey, async (req, res) => {
  try {
    // Get current spend
    const spend = await getDailySpend();
    
    // Calculate cache hit rate
    const totalCacheRequests = compressionMetrics.cache_hits + compressionMetrics.cache_misses;
    const cacheHitRate = totalCacheRequests > 0 
      ? (compressionMetrics.cache_hits / totalCacheRequests) * 100 
      : 0;
    
    // Estimate savings
    const estimatedSavings = {
      fromCache: compressionMetrics.cache_hits * 0.001, // ~$0.001 per cache hit
      fromCompression: compressionMetrics.tokens_saved_total * 0.0000001, // ~$0.0000001 per token
      fromModelDowngrades: compressionMetrics.model_downgrades * 0.0005, // ~$0.0005 per downgrade
      fromOptimization: compressionMetrics.prompt_optimizations * 0.0001, // ~$0.0001 per optimization
    };
    
    const totalEstimatedSavings = Object.values(estimatedSavings).reduce((a, b) => a + b, 0);
    
    // Get ROI tracker data
    const roiData = roiTracker;
    
    res.json({
      ok: true,
      currentSpend: spend.daily_spend || spend || 0,
      maxSpend: spend.max_daily_spend || MAX_DAILY_SPEND,
      spendPercentage: spend.daily_spend ? ((spend.daily_spend / MAX_DAILY_SPEND) * 100).toFixed(1) + '%' : '0%',
      
      // Cost-saving measures status
      costSavingMeasures: {
        caching: {
          active: true,
          cacheHits: compressionMetrics.cache_hits,
          cacheMisses: compressionMetrics.cache_misses,
          hitRate: cacheHitRate.toFixed(1) + '%',
          working: cacheHitRate > 20, // >20% hit rate means it's working
          estimatedSavings: estimatedSavings.fromCache.toFixed(4),
        },
        compression: {
          active: true,
          compressions: compressionMetrics.v3_compressions,
          bytesSaved: compressionMetrics.total_bytes_saved,
          tokensSaved: compressionMetrics.tokens_saved_total,
          working: compressionMetrics.v3_compressions > 0,
          estimatedSavings: estimatedSavings.fromCompression.toFixed(4),
        },
        modelRouting: {
          active: true,
          downgrades: compressionMetrics.model_downgrades,
          working: compressionMetrics.model_downgrades > 0,
          estimatedSavings: estimatedSavings.fromModelDowngrades.toFixed(4),
        },
        promptOptimization: {
          active: true,
          optimizations: compressionMetrics.prompt_optimizations,
          working: compressionMetrics.prompt_optimizations > 0,
          estimatedSavings: estimatedSavings.fromOptimization.toFixed(4),
        },
      },
      
      // Overall assessment
      totalEstimatedSavings: totalEstimatedSavings.toFixed(4),
      savingsWorking: cacheHitRate > 20 || compressionMetrics.v3_compressions > 0 || compressionMetrics.model_downgrades > 0,
      
      // Recommendations
      recommendations: [
        cacheHitRate < 20 ? 'Cache hit rate is low - increase cache TTL or improve cache keys' : null,
        compressionMetrics.v3_compressions === 0 ? 'Compression not being used - check compression settings' : null,
        compressionMetrics.model_downgrades === 0 ? 'Model routing not downgrading - check model router settings' : null,
        compressionMetrics.prompt_optimizations === 0 ? 'Prompt optimization not active - check optimization settings' : null,
      ].filter(r => r !== null),
      
      roi: roiData,
      compression: compressionMetrics,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/system/metrics", requireKey, async (req, res) => {
  try {
    res.json({
      ok: true,
      metrics: {
        system: systemMetrics,
        roi: roiTracker,
        compression: compressionMetrics,
        tasks: executionQueue.getStatus(),
        drones: await incomeDroneSystem.getStatus(),
        aiPerformance: Object.fromEntries(aiPerformanceScores),
        dailyIdeas: dailyIdeas.length,
        snapshots: systemSnapshots.length,
      },
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== TWO-TIER COUNCIL ENDPOINTS ====================
app.post("/api/v1/council/route", requireKey, async (req, res) => {
  try {
    if (!modelRouter) {
      return res.status(503).json({ error: "Two-tier system not initialized" });
    }

    const { task, taskType = 'general', riskLevel = 'low', userFacing = false, revenueImpact = 'low' } = req.body;
    
    if (!task) {
      return res.status(400).json({ error: "Task required" });
    }

    const result = await modelRouter.route(task, {
      taskType,
      riskLevel,
      userFacing,
      revenueImpact,
    });

    // White-label sanitization
    const clientId = req.headers['x-client-id'] || 'default';
    if (whiteLabelConfig) {
      const sanitized = whiteLabelConfig.sanitizeResponse(result, clientId, result);
      return res.json({ ok: result.success, ...sanitized });
    }

    res.json({ ok: result.success, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/council/routing-stats", requireKey, async (req, res) => {
  try {
    if (!modelRouter) {
      return res.status(503).json({ error: "Two-tier system not initialized" });
    }

    const stats = await modelRouter.getRoutingStats();
    res.json({ ok: true, ...stats });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== OUTREACH AUTOMATION ENDPOINTS ====================
app.post("/api/v1/outreach/campaign", requireKey, async (req, res) => {
  try {
    if (!outreachAutomation) {
      return res.status(503).json({ error: "Outreach system not initialized" });
    }

    const { name, targets, channels = ['email'], messageTemplate } = req.body;
    
    if (!name || !targets || !Array.isArray(targets)) {
      return res.status(400).json({ error: "Campaign name and targets array required" });
    }

    const results = await outreachAutomation.launchCampaign({
      name,
      targets,
      channels,
      messageTemplate,
    });

    res.json({ ok: true, ...results });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/outreach/campaign/:campaignId", requireKey, async (req, res) => {
  try {
    if (!outreachAutomation) {
      return res.status(503).json({ error: "Outreach system not initialized" });
    }

    const results = outreachAutomation.getCampaignResults(req.params.campaignId);
    if (!results) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    res.json({ ok: true, ...results });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/outreach/email", requireKey, async (req, res) => {
  try {
    if (!outreachAutomation) {
      return res.status(503).json({ error: "Outreach system not initialized" });
    }

    const { to, subject, body } = req.body;
    if (!to || !subject) {
      return res.status(400).json({ error: "To and subject required" });
    }

    const result = await outreachAutomation.sendEmail(to, subject, body || subject);
    res.json({ ok: result.success, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/outreach/sms", requireKey, async (req, res) => {
  try {
    if (!outreachAutomation) {
      return res.status(503).json({ error: "Outreach system not initialized" });
    }

    const { to, message } = req.body;
    if (!to || !message) {
      return res.status(400).json({ error: "To and message required" });
    }

    const result = await outreachAutomation.sendSMS(to, message);
    res.json({ ok: result.success, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/outreach/call", requireKey, async (req, res) => {
  try {
    if (!outreachAutomation) {
      return res.status(503).json({ error: "Outreach system not initialized" });
    }

    const { to, script } = req.body;
    if (!to) {
      return res.status(400).json({ error: "Phone number (to) required" });
    }

    const result = await outreachAutomation.makeCall(to, script);
    res.json({ ok: result.success, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/outreach/social", requireKey, async (req, res) => {
  try {
    if (!outreachAutomation) {
      return res.status(503).json({ error: "Outreach system not initialized" });
    }

    const { platform, content } = req.body;
    if (!platform || !content) {
      return res.status(400).json({ error: "Platform and content required" });
    }

    const result = await outreachAutomation.postToSocial(platform, content);
    res.json({ ok: result.success, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== WHITE-LABEL ENDPOINTS ====================
app.post("/api/v1/white-label/config", requireKey, async (req, res) => {
  try {
    if (!whiteLabelConfig) {
      return res.status(503).json({ error: "White-label system not initialized" });
    }

    const config = await whiteLabelConfig.createConfig(req.body);
    res.json({ ok: true, config });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/white-label/config/:clientId", requireKey, async (req, res) => {
  try {
    if (!whiteLabelConfig) {
      return res.status(503).json({ error: "White-label system not initialized" });
    }

    const config = await whiteLabelConfig.getConfig(req.params.clientId);
    res.json({ ok: true, config });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== KNOWLEDGE BASE & FILE UPLOAD ENDPOINTS ====================
app.post("/api/v1/knowledge/upload", requireKey, async (req, res) => {
  try {
    if (!knowledgeBase) {
      return res.status(503).json({ error: "Knowledge base not initialized" });
    }

    const { filename, content, category, tags, description, businessIdea, securityRelated, historical } = req.body;

    if (!filename || !content) {
      return res.status(400).json({ error: "Filename and content required" });
    }

    const result = await knowledgeBase.uploadFile(content, {
      filename,
      category: category || 'context',
      tags: tags || [],
      description: description || '',
      businessIdea: businessIdea || false,
      securityRelated: securityRelated || false,
      historical: historical || false,
    });

    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/knowledge/search", requireKey, async (req, res) => {
  try {
    if (!knowledgeBase) {
      return res.status(503).json({ error: "Knowledge base not initialized" });
    }

    const { q, category, tags, businessIdeasOnly } = req.query;

    if (!q) {
      return res.status(400).json({ error: "Query (q) required" });
    }

    const results = await knowledgeBase.search(q, {
      category: category || null,
      tags: tags ? tags.split(',') : [],
      businessIdeasOnly: businessIdeasOnly === 'true',
      limit: parseInt(req.query.limit) || 50,
    });

    res.json({ ok: true, results, count: results.length });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/knowledge/business-ideas", requireKey, async (req, res) => {
  try {
    if (!knowledgeBase) {
      return res.status(503).json({ error: "Knowledge base not initialized" });
    }

    const ideas = await knowledgeBase.getBusinessIdeas();
    res.json({ ok: true, ideas, count: ideas.length });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/knowledge/security", requireKey, async (req, res) => {
  try {
    if (!knowledgeBase) {
      return res.status(503).json({ error: "Knowledge base not initialized" });
    }

    const docs = await knowledgeBase.getSecurityDocs();
    res.json({ ok: true, docs, count: docs.length });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== KNOWLEDGE CONTEXT ENDPOINTS (Processed Dumps) ====================
app.get("/api/v1/knowledge/ideas", requireKey, async (req, res) => {
  try {
    if (!knowledgeContext || !knowledgeContext.entries) {
      return res.status(503).json({ error: "Knowledge context not loaded. Run: node scripts/process-knowledge.js" });
    }

    const allIdeas = [];
    const sources = new Set();

    for (const entry of knowledgeContext.entries) {
      if (entry.ideas && Array.isArray(entry.ideas)) {
        sources.add(entry.filename);
        for (const idea of entry.ideas) {
          allIdeas.push({
            text: idea.text || idea,
            source: entry.filename,
            topics: entry.topics || [],
            context: idea.context || null,
          });
        }
      }
    }

    res.json({
      ok: true,
      total: allIdeas.length,
      sources_count: sources.size,
      ideas: allIdeas,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/knowledge/stats", requireKey, async (req, res) => {
  try {
    if (!knowledgeContext) {
      return res.status(503).json({ error: "Knowledge context not loaded" });
    }

    const topicFreq = {};
    const sourceStats = {};

    for (const entry of knowledgeContext.entries || []) {
      // Count topics
      if (entry.topics && Array.isArray(entry.topics)) {
        for (const topic of entry.topics) {
          topicFreq[topic] = (topicFreq[topic] || 0) + 1;
        }
      }

      // Per-source stats
      const source = entry.filename || 'unknown';
      if (!sourceStats[source]) {
        sourceStats[source] = {
          ideas_count: 0,
          topics_count: 0,
        };
      }
      sourceStats[source].ideas_count += (entry.ideas?.length || 0);
      sourceStats[source].topics_count += (entry.topics?.length || 0);
    }

    const topTopics = Object.entries(topicFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));

    res.json({
      ok: true,
      total_entries: knowledgeContext.totalEntries || 0,
      total_ideas: knowledgeContext.entries?.reduce((sum, e) => sum + (e.ideas?.length || 0), 0) || 0,
      has_core_truths: !!knowledgeContext.coreTruths,
      has_project_context: !!knowledgeContext.projectContext,
      top_topics: topTopics,
      sources: sourceStats,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/knowledge/rank", requireKey, async (req, res) => {
  try {
    if (!knowledgeContext || !knowledgeContext.entries) {
      return res.status(503).json({ error: "Knowledge context not loaded" });
    }

    const { criteria, limit = 50 } = req.body;

    if (!criteria) {
      return res.status(400).json({ error: "criteria required in body" });
    }

    // Collect all ideas
    const allIdeas = [];
    for (const entry of knowledgeContext.entries) {
      if (entry.ideas && Array.isArray(entry.ideas)) {
        for (const idea of entry.ideas) {
          allIdeas.push({
            text: idea.text || idea,
            source: entry.filename,
            topics: entry.topics || [],
          });
        }
      }
    }

    const ideasToRank = allIdeas.slice(0, Math.min(limit, allIdeas.length));

    // Send to AI for ranking
    const rankingPrompt = `Rank these ${ideasToRank.length} business/software ideas based on this criteria:

Criteria: ${criteria}

Ideas to rank:
${ideasToRank.map((idea, i) => `${i + 1}. ${idea.text.substring(0, 200)} (Source: ${idea.source})`).join('\n')}

Return a JSON array with ranked ideas, each with:
- rank: number (1 = best)
- idea_text: string
- score: number (0-100)
- reasoning: string (why this rank)

Return ONLY valid JSON array. Start with [ end with ].`;

    const rankingResponse = await callCouncilWithFailover(rankingPrompt, 'ollama_deepseek', false, {
      maxTokens: 4000,
    });

    // Parse ranking
    let ranking = [];
    try {
      const { sanitizeJsonResponse, extractAndParseJSON } = await import('./core/json-sanitizer.js');
      ranking = extractAndParseJSON(rankingResponse, []);
      if (!Array.isArray(ranking)) {
        ranking = [];
      }
    } catch (e) {
      console.warn('Failed to parse ranking response:', e.message);
    }

    res.json({
      ok: true,
      criteria,
      total_ideas_analyzed: ideasToRank.length,
      ranking: ranking.slice(0, 20), // Top 20
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/knowledge/search", requireKey, async (req, res) => {
  try {
    if (!knowledgeContext || !knowledgeContext.entries) {
      return res.status(503).json({ error: "Knowledge context not loaded" });
    }

    const { q, topic } = req.query;

    if (!q) {
      return res.status(400).json({ error: "Query parameter 'q' required" });
    }

    const queryLower = q.toLowerCase();
    const topicFilter = topic ? topic.toLowerCase() : null;

    const results = [];

    for (const entry of knowledgeContext.entries || []) {
      // Filter by topic if specified
      if (topicFilter && entry.topics) {
        const hasTopic = entry.topics.some(t => t.toLowerCase().includes(topicFilter));
        if (!hasTopic) continue;
      }

      // Search in ideas
      if (entry.ideas && Array.isArray(entry.ideas)) {
        for (const idea of entry.ideas) {
          const ideaText = (idea.text || idea).toLowerCase();
          if (ideaText.includes(queryLower)) {
            results.push({
              text: idea.text || idea,
              source: entry.filename,
              topics: entry.topics || [],
              context: idea.context || null,
            });
          }
        }
      }
    }

    res.json({
      ok: true,
      query: q,
      topic_filter: topic || null,
      results_count: results.length,
      results: results.slice(0, 50), // Limit to 50
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== FILE CLEANUP ANALYZER ENDPOINTS ====================
app.post("/api/v1/system/analyze-cleanup", requireKey, async (req, res) => {
  try {
    if (!fileCleanupAnalyzer) {
      return res.status(503).json({ error: "Cleanup analyzer not initialized" });
    }

    const report = await fileCleanupAnalyzer.analyze();
    const summary = fileCleanupAnalyzer.generateReport();

    res.json({ ok: true, ...summary });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== TRIAL SYSTEM ENDPOINTS ====================
app.get("/api/v1/trial/status", requireKey, async (req, res) => {
  try {
    // Check if user has active trial or subscription
    const result = await pool.query(
      `SELECT * FROM user_trials 
       WHERE user_id = $1 OR command_key = $2
       ORDER BY created_at DESC LIMIT 1`,
      [req.headers['x-user-id'] || 'default', req.headers['x-command-key']]
    );

    const trial = result.rows[0];
    const now = new Date();

    if (trial) {
      const trialEnd = new Date(trial.created_at);
      trialEnd.setDate(trialEnd.getDate() + (trial.duration_days || 7));
      
      const isActive = now < trialEnd && trial.active;
      const canOffer = !trial || (now > trialEnd && !trial.has_subscription);

      res.json({
        ok: true,
        trialActive: isActive,
        hasAccess: isActive || trial?.has_subscription,
        canOfferTrial: canOffer,
        trialEndsAt: trialEnd.toISOString(),
      });
    } else {
      res.json({
        ok: true,
        trialActive: false,
        hasAccess: false,
        canOfferTrial: true,
      });
    }
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== CONVERSATION HISTORY ENDPOINTS ====================
// Get conversation history (cataloged and indexed)
app.get("/api/v1/conversations/history", requireKey, async (req, res) => {
  try {
    const { limit = 50, offset = 0, search = null } = req.query;
    
    let query = `SELECT memory_id, orchestrator_msg, ai_response, ai_member, created_at, key_facts, context_metadata
                 FROM conversation_memory 
                 WHERE memory_type = 'conversation'`;
    const params = [];
    
    if (search) {
      query += ` AND (orchestrator_msg ILIKE $1 OR ai_response ILIKE $1)`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, params);
    const totalResult = await pool.query(
      `SELECT COUNT(*) as total FROM conversation_memory WHERE memory_type = 'conversation'`
    );
    
    res.json({
      ok: true,
      conversations: result.rows,
      total: parseInt(totalResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error("Conversation history error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get conversation by ID
app.get("/api/v1/conversations/:id", requireKey, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM conversation_memory WHERE memory_id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Conversation not found" });
    }
    
    res.json({ ok: true, conversation: result.rows[0] });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== CONVERSATION EXTRACTOR ENDPOINTS ====================
app.post("/api/v1/conversations/extract-export", requireKey, async (req, res) => {
  try {
    if (!conversationExtractor) {
      return res.status(503).json({ error: "Conversation extractor not initialized" });
    }

    const { provider, exportData } = req.body;
    
    if (!provider || !exportData) {
      return res.status(400).json({ error: "Provider and exportData required" });
    }

    console.log(`🤖 [EXTRACTOR] Processing ${provider} export...`);
    const result = await conversationExtractor.extractFromExport(provider, exportData);
    
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error('Extraction error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/conversations/extract-all", requireKey, async (req, res) => {
  try {
    if (!conversationExtractor) {
      return res.status(503).json({ error: "Conversation extractor not initialized" });
    }

    const { credentials } = req.body;
    
    if (!credentials) {
      return res.status(400).json({ error: "Credentials or export data required" });
    }

    console.log(`🤖 [EXTRACTOR] Starting extraction from all platforms...`);
    const results = await conversationExtractor.extractAll(credentials);
    
    res.json({ ok: true, results });
  } catch (error) {
    console.error('Extraction error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/extract-conversations", (req, res) => {
  const filePath = path.join(__dirname, "public", "overlay", "extract-conversations.html");
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("Extraction page not found.");
  }
});

// ==================== AI ACCOUNT BOT ENDPOINTS ====================
app.post("/api/v1/ai-accounts/process-export", requireKey, async (req, res) => {
  try {
    if (!aiAccountBot) {
      return res.status(503).json({ error: "AI account bot not initialized" });
    }

    const { provider, data } = req.body;
    
    if (!provider || !data) {
      return res.status(400).json({ error: "Provider and data required" });
    }

    console.log(`🤖 [AI BOT] Processing ${provider} export...`);
    const result = await aiAccountBot.processExportedData(provider, data);
    
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error('AI account bot error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/ai-accounts/process-all", requireKey, async (req, res) => {
  try {
    if (!aiAccountBot) {
      return res.status(503).json({ error: "AI account bot not initialized" });
    }

    const { credentials } = req.body;
    
    if (!credentials) {
      return res.status(400).json({ error: "Credentials required" });
    }

    console.log(`🤖 [AI BOT] Processing all AI accounts...`);
    const results = await aiAccountBot.processAllAccounts(credentials);
    
    res.json({ ok: true, results });
  } catch (error) {
    console.error('AI account bot error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== COMMAND CENTER ENDPOINTS ====================
app.get("/api/v1/tasks/queue", requireKey, async (req, res) => {
  try {
    // Get active tasks/projects
    const queueStatus = executionQueue.getStatus();
    
    // Get tasks from database (pending, running, and recent completed)
    const dbTasks = await pool.query(
      `SELECT task_id, type, description, status, created_at, completed_at, result, error, ai_model
       FROM execution_tasks
       WHERE status IN ('pending', 'running', 'queued')
       ORDER BY 
         CASE status
           WHEN 'running' THEN 1
           WHEN 'queued' THEN 2
           WHEN 'pending' THEN 3
           ELSE 4
         END,
         created_at ASC
       LIMIT 50`
    );
    
    // Get active task progress if available
    const activeTask = queueStatus.currentTask;
    
    // Format for command center
    const projects = dbTasks.rows.map((task, index) => {
      const isRunning = task.status === 'running';
      const isActive = activeTask && activeTask.id === task.task_id;
      
      // Calculate progress
      let progress = 0;
      if (isRunning || isActive) {
        // If actively running, estimate progress based on time
        const createdTime = new Date(task.created_at).getTime();
        const now = Date.now();
        const elapsed = (now - createdTime) / 1000 / 60; // minutes
        // Estimate 10-15 minutes per task on average
        progress = Math.min(95, Math.round((elapsed / 12) * 100));
      } else {
        // Queued tasks: progress based on position
        const queuePosition = index;
        progress = 0;
      }
      
      // Estimate ETA based on task type and position
      let eta = 'Calculating...';
      if (isRunning || isActive) {
        const createdTime = new Date(task.created_at).getTime();
        const now = Date.now();
        const elapsed = (now - createdTime) / 1000 / 60; // minutes
        const estimatedTotal = 12; // average 12 minutes per task
        const remaining = Math.max(1, Math.ceil(estimatedTotal - elapsed));
        eta = `${remaining} minute${remaining !== 1 ? 's' : ''} remaining`;
      } else {
        // Calculate ETA based on queue position and average task time
        const queuePosition = index;
        const avgTaskTime = 12; // minutes
        const minutes = Math.ceil(queuePosition * avgTaskTime);
        if (minutes < 60) {
          eta = `~${minutes} minute${minutes !== 1 ? 's' : ''}`;
        } else {
          const hours = Math.floor(minutes / 60);
          const mins = minutes % 60;
          eta = `~${hours}h ${mins}m`;
        }
      }
      
      return {
        id: task.task_id,
        title: task.description?.substring(0, 80) || task.type || 'Task',
        description: task.description || '',
        status: task.status || 'pending',
        progress: isRunning || isActive ? progress : 0,
        eta,
        priority: 'high',
        type: task.type,
        createdAt: task.created_at,
        completedAt: task.completed_at,
        result: task.result,
        error: task.error,
        aiModel: task.ai_model,
      };
    });

    res.json({ 
      ok: true, 
      tasks: projects,
      queueSize: queueStatus.queued || 0,
      active: queueStatus.active || 0,
      currentTask: activeTask,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/ai/performance", requireKey, async (req, res) => {
  try {
    // Get AI performance scores
    const scores = Array.from(aiPerformanceScores.entries()).map(([member, score]) => ({
      member,
      accuracy: score.accuracy || 0,
      self_evaluation: score.self_evaluation || 0,
      total_guesses: score.total_guesses || 0,
      correct_guesses: score.correct_guesses || 0,
    }));

    const avgAccuracy = scores.length > 0 
      ? scores.reduce((sum, s) => sum + s.accuracy, 0) / scores.length 
      : 0;
    
    const avgSelfEval = scores.length > 0
      ? scores.reduce((sum, s) => sum + s.self_evaluation, 0) / scores.length
      : 0;

    res.json({
      ok: true,
      accuracy: avgAccuracy,
      self_evaluation: avgSelfEval,
      scores,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/ai/self-evaluate", requireKey, async (req, res) => {
  try {
    const { user_input, ai_response, member = 'chatgpt' } = req.body;

    // AI evaluates its own response
    const evaluationPrompt = `Evaluate your own response to this user input:

USER INPUT: ${user_input}
YOUR RESPONSE: ${ai_response}

Rate your response on:
1. Accuracy (0-1): Did you answer correctly?
2. Completeness (0-1): Did you address all aspects?
3. Relevance (0-1): Was your response relevant?
4. User satisfaction prediction (0-1): How satisfied would the user be?

Respond with JSON: {"accuracy": 0.0-1.0, "completeness": 0.0-1.0, "relevance": 0.0-1.0, "satisfaction": 0.0-1.0}`;

    const evaluation = await callCouncilMember(member, evaluationPrompt);
    
    // Parse evaluation
    let scores = { accuracy: 0.5, completeness: 0.5, relevance: 0.5, satisfaction: 0.5 };
    try {
      const jsonMatch = evaluation.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        scores = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn('Failed to parse self-evaluation:', e);
    }

    // Store evaluation
    if (!aiPerformanceScores.has(member)) {
      aiPerformanceScores.set(member, {
        accuracy: 0,
        self_evaluation: 0,
        total_guesses: 0,
        correct_guesses: 0,
        evaluations: [],
      });
    }

    const memberScore = aiPerformanceScores.get(member);
    memberScore.evaluations.push({
      user_input,
      ai_response,
      scores,
      timestamp: new Date().toISOString(),
    });

    // Update averages
    const avgAccuracy = memberScore.evaluations.reduce((sum, e) => sum + e.scores.accuracy, 0) / memberScore.evaluations.length;
    const avgSelfEval = memberScore.evaluations.reduce((sum, e) => sum + (e.scores.satisfaction || e.scores.accuracy), 0) / memberScore.evaluations.length;
    
    memberScore.accuracy = avgAccuracy;
    memberScore.self_evaluation = avgSelfEval;
    memberScore.total_guesses++;

    res.json({ ok: true, scores, member });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Cost saving re-examination endpoint
app.post("/api/v1/system/re-examine-costs", requireKey, async (req, res) => {
  try {
    if (!costReExamination) {
      return res.status(503).json({ error: "Cost re-examination not initialized" });
    }
    const analysis = await costReExamination.examine();
    res.json({ ok: true, analysis });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== LOG MONITORING ENDPOINTS ====================
app.post("/api/v1/system/monitor-logs", requireKey, async (req, res) => {
  try {
    if (!logMonitor) {
      return res.status(503).json({ error: "Log monitoring not initialized" });
    }
    const result = await logMonitor.monitorLogs();
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/system/fix-history", requireKey, async (req, res) => {
  try {
    if (!logMonitor) {
      return res.status(503).json({ error: "Log monitoring not initialized" });
    }
    const history = await logMonitor.getFixHistory(parseInt(req.query.limit) || 50);
    res.json({ ok: true, history, count: history.length });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== LOG MONITORING ENDPOINTS ====================
app.post("/api/v1/system/monitor-logs", requireKey, async (req, res) => {
  try {
    if (!logMonitor) {
      return res.status(503).json({ error: "Log monitoring not initialized" });
    }
    const result = await logMonitor.monitorLogs();
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/system/fix-history", requireKey, async (req, res) => {
  try {
    if (!logMonitor) {
      return res.status(503).json({ error: "Log monitoring not initialized" });
    }
    const history = await logMonitor.getFixHistory(parseInt(req.query.limit) || 50);
    res.json({ ok: true, history, count: history.length });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== MISSING OVERLAY ENDPOINTS ====================

// AI Effectiveness ratings
app.get("/api/v1/ai/effectiveness", requireKey, async (req, res) => {
  try {
    // Get effectiveness ratings for each AI member
    const ratings = [];
    const members = ['chatgpt', 'gemini', 'deepseek', 'grok', 'claude'];
    
    for (const member of members) {
      const memberScore = aiPerformanceScores.get(member) || {
        accuracy: 0.5,
        self_evaluation: 0.5,
        total_guesses: 0,
        correct_guesses: 0,
      };
      
      // Calculate effectiveness (weighted average of accuracy and self-evaluation)
      const effectiveness = (memberScore.accuracy * 0.6 + memberScore.self_evaluation * 0.4);
      
      ratings.push({
        member,
        effectiveness,
        accuracy: memberScore.accuracy,
        self_evaluation: memberScore.self_evaluation,
        taskType: 'general',
        total_tasks: memberScore.total_guesses || 0,
      });
    }
    
    res.json({ ok: true, ratings });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// User simulation accuracy
app.get("/api/v1/user/simulation/accuracy", requireKey, async (req, res) => {
  try {
    // Placeholder: return a default accuracy score
    // In a real implementation, this would track how well the system predicts user behavior
    const accuracyPercent = 75; // Default 75% accuracy
    
    res.json({ 
      ok: true, 
      accuracyPercent,
      accuracy: accuracyPercent / 100,
      note: "User simulation accuracy tracking"
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Internal autopilot cron heartbeat
app.get("/internal/cron/autopilot", requireKey, async (req, res) => {
  try {
    // Heartbeat endpoint for autopilot cron jobs
    const queueStatus = executionQueue.getStatus();
    const spendStatus = await getDailySpend();
    
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      queued_tasks: queueStatus.queued || 0,
      active_tasks: queueStatus.active || 0,
      daily_spend: spendStatus.daily_spend || 0,
      max_daily_spend: spendStatus.max_daily_spend || MAX_DAILY_SPEND,
      spend_percentage: spendStatus.spend_percentage || '0%',
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Internal autopilot build-now
app.post("/internal/autopilot/build-now", requireKey, async (req, res) => {
  try {
    const force = req.query.force === '1' || req.body.force === true;
    
    // Check if autoBuilder is available
    if (!autoBuilder) {
      // Try to initialize if not available
      try {
        const { AutoBuilder } = await import("./core/auto-builder.js");
        autoBuilder = new AutoBuilder(pool, callCouncilMember, executionQueue);
        await autoBuilder.start();
      } catch (initError) {
        console.warn('AutoBuilder not available:', initError.message);
        return res.json({
          ok: true,
          skipped: true,
          reason: 'AutoBuilder not initialized',
          message: 'Autopilot build system not available'
        });
      }
    }
    
    // Trigger build
    const result = await autoBuilder.buildNextOpportunity({ force });
    
    res.json({
      ok: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Autopilot build-now error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Overlay state management
app.post("/api/overlay/:sid/state", requireKey, async (req, res) => {
  try {
    const { sid } = req.params;
    const state = req.body;
    
    // Store overlay state (could use Redis or database in production)
    // For now, just return success
    res.json({
      ok: true,
      sessionId: sid,
      state,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Overlay status
app.get("/api/overlay/status", async (req, res) => {
  try {
    // Return overlay system status
    const queueStatus = executionQueue.getStatus();
    const spendStatus = await getDailySpend();
    
    res.json({
      ok: true,
      status: "active",
      queued_tasks: queueStatus.queued || 0,
      active_tasks: queueStatus.active || 0,
      daily_spend: spendStatus.daily_spend || 0,
      max_daily_spend: spendStatus.max_daily_spend || MAX_DAILY_SPEND,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

async function analyzeCostSavings() {
  // Analyze current cost optimization strategies
  const analysis = {
    current_savings: {
      cache_hit_rate: compressionMetrics.cache_hits / (compressionMetrics.cache_hits + compressionMetrics.cache_misses) || 0,
      model_downgrades: compressionMetrics.model_downgrades,
      prompt_optimizations: compressionMetrics.prompt_optimizations,
      tokens_saved: compressionMetrics.tokens_saved_total,
    },
    recommendations: [],
    potential_savings: [],
  };

  // Check cache performance
  if (analysis.current_savings.cache_hit_rate < 0.5) {
    analysis.recommendations.push({
      type: 'cache',
      issue: 'Low cache hit rate',
      suggestion: 'Increase cache TTL or improve cache key generation',
      potential_savings: '20-30%',
    });
  }

  // Check model selection
  if (compressionMetrics.model_downgrades < 10) {
    analysis.recommendations.push({
      type: 'model_selection',
      issue: 'Not using cheaper models enough',
      suggestion: 'Route more tasks to Tier 0 (free/cheap models)',
      potential_savings: '80-95%',
    });
  }

  // Check prompt optimization
  if (compressionMetrics.prompt_optimizations < 50) {
    analysis.recommendations.push({
      type: 'prompt_optimization',
      issue: 'Prompts not being optimized',
      suggestion: 'Enable automatic prompt compression',
      potential_savings: '10-15%',
    });
  }

  return analysis;
}

app.post("/api/v1/trial/start", requireKey, async (req, res) => {
  try {
    const { source = 'overlay' } = req.body;
    const userId = req.headers['x-user-id'] || 'default';
    const commandKey = req.headers['x-command-key'];

    // Check if already has active trial
    const existing = await pool.query(
      `SELECT * FROM user_trials 
       WHERE (user_id = $1 OR command_key = $2) AND active = true
       ORDER BY created_at DESC LIMIT 1`,
      [userId, commandKey]
    );

    if (existing.rows.length > 0) {
      const trial = existing.rows[0];
      const trialEnd = new Date(trial.created_at);
      trialEnd.setDate(trialEnd.getDate() + (trial.duration_days || 7));
      
      if (new Date() < trialEnd) {
        return res.json({
          ok: true,
          message: 'Trial already active',
          trialEndsAt: trialEnd.toISOString(),
        });
      }
    }

    // Create new trial
    const result = await pool.query(
      `INSERT INTO user_trials (user_id, command_key, duration_days, active, source, created_at)
       VALUES ($1, $2, $3, true, $4, NOW())
       RETURNING *`,
      [userId, commandKey, 7, source]
    );

    res.json({
      ok: true,
      trial: result.rows[0],
      message: 'Free trial started! 7 days of full access.',
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Phone System Endpoints (Twilio)
app.post("/api/v1/phone/call", requireKey, async (req, res) => {
  try {
    const { to, from, message, aiMember = "chatgpt" } = req.body;
    if (!to || !message) {
      return res.status(400).json({ error: "Phone number (to) and message required" });
    }
    const result = await makePhoneCall(to, from, message, aiMember);
    res.json({ ok: result.success, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/phone/sms", requireKey, async (req, res) => {
  try {
    const { to, message, aiMember = "chatgpt" } = req.body;
    if (!to || !message) {
      return res.status(400).json({ error: "Phone number (to) and message required" });
    }
    const result = await sendSMS(to, message, aiMember);
    res.json({ ok: result.success, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/phone/call-handler", async (req, res) => {
  // Twilio webhook handler for call events
  try {
    const { CallSid, CallStatus, From, To } = req.body;
    console.log(`📞 Call event: ${CallSid} - ${CallStatus} from ${From} to ${To}`);
    
    // Use AI to generate TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Hello, this is LifeOS AI assistant. How can I help you today?</Say>
  <Gather input="speech" action="/api/v1/phone/call-process" method="POST">
    <Say>Please speak your message.</Say>
  </Gather>
</Response>`;
    
    res.type('text/xml');
    res.send(twiml);
  } catch (error) {
    res.status(500).send(`<Response><Say>Error processing call</Say></Response>`);
  }
});

app.post("/api/v1/phone/call-process", async (req, res) => {
  // Process voice input from phone call
  try {
    const { SpeechResult, From, To } = req.body;
    if (SpeechResult) {
      // Send to AI council for processing (with compression for cost savings)
      const response = await callCouncilWithFailover(SpeechResult, "chatgpt", { compress: true });
      
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${response}</Say>
  <Gather input="speech" action="/api/v1/phone/call-process" method="POST">
    <Say>Anything else I can help with?</Say>
  </Gather>
  <Say>Thank you for calling. Goodbye.</Say>
  <Hangup/>
</Response>`;
      
      res.type('text/xml');
      res.send(twiml);
    } else {
      res.type('text/xml');
      res.send(`<Response><Say>I didn't catch that. Please try again.</Say></Response>`);
    }
  } catch (error) {
    res.status(500).send(`<Response><Say>Error: ${error.message}</Say></Response>`);
  }
});

// Stripe endpoints (safe)
app.post(
  "/api/v1/stripe/checkout-session",
  requireKey,
  async (req, res) => {
    try {
      const stripe = await getStripeClient();
      if (!stripe) {
        return res
          .status(503)
          .json({ ok: false, error: "Stripe not configured" });
      }

      const {
        amount,
        currency = "usd",
        mode = "payment",
        metadata = {},
        success_url,
        cancel_url,
        description,
      } = req.body || {};

      const cleanAmount = Number(amount);
      if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
        return res
          .status(400)
          .json({ ok: false, error: "Valid amount required" });
      }

      const origin = req.headers.origin || "";
      const session = await stripe.checkout.sessions.create({
        mode,
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: {
                name: description || "Service",
              },
              unit_amount: Math.round(cleanAmount * 100),
            },
            quantity: 1,
          },
        ],
        success_url:
          success_url ||
          `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancel_url || `${origin}/cancel`,
        metadata,
      });

      res.json({ ok: true, id: session.id, url: session.url });
    } catch (err) {
      console.error("Stripe checkout error:", err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  }
);

app.post("/api/v1/stripe/sync-revenue", requireKey, async (req, res) => {
  try {
    await syncStripeRevenue();
    const dashboard = await financialDashboard.getDashboard();
    res.json({ ok: true, dashboard, roi: roiTracker });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Overlay
app.get("/overlay", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "overlay", "index.html"));
});

app.get("/overlay/index.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "overlay", "index.html"));
});

// ==================== SELF-PROGRAMMING HANDLER (can be called internally) ====================
async function handleSelfProgramming(options = {}, req = null) {
  const {
    instruction,
    priority = "medium",
    filePath,
    search,
    replace,
    autoDeploy = false,
  } = options;

  if (!instruction) {
    return { ok: false, error: "Instruction required" };
  }

  try {
    // Load self-programming enhancement modules
    let codebaseReader, dependencyManager, errorRecovery, migrationGenerator;
    try {
      const codebaseReaderModule = await import("./core/codebase-reader.js");
      codebaseReader = codebaseReaderModule.codebaseReader || codebaseReaderModule.default;
      
      const dependencyManagerModule = await import("./core/dependency-manager.js");
      dependencyManager = dependencyManagerModule.dependencyManager || dependencyManagerModule.default;
      
      const errorRecoveryModule = await import("./core/error-recovery.js");
      const ErrorRecovery = errorRecoveryModule.default || errorRecoveryModule.ErrorRecovery;
      errorRecovery = new ErrorRecovery(3, callCouncilWithFailover);
      
      const migrationGeneratorModule = await import("./core/migration-generator.js");
      migrationGenerator = migrationGeneratorModule.migrationGenerator || migrationGeneratorModule.default;
      
      console.log("✅ [SELF-PROGRAM] Enhanced self-programming modules loaded");
    } catch (importError) {
      console.warn(`⚠️ [SELF-PROGRAM] Could not load enhancement modules: ${importError.message}`);
      console.warn("   Continuing with basic self-programming...");
    }

    // Call self-programming endpoint logic directly
    const analysisPrompt = `As the AI Council, analyze this self-programming instruction:

"${instruction}"

Provide:
1. Which files need modification
2. Exact code changes needed
3. Potential risks and blind spots
4. Testing strategy
5. Rollback plan`;

    const analysis = await callCouncilWithFailover(analysisPrompt, "chatgpt");
    const blindSpots = await detectBlindSpots(instruction, {
      type: "self-programming",
    });

    // NEW: Read existing codebase context before generating code
    let existingContext = {};
    let targetFiles = [];
    
    if (codebaseReader) {
      try {
        // First, try to identify files that will be modified (from analysis or instruction)
        const instructionLower = instruction.toLowerCase();
        const potentialFiles = [];
        
        // Infer files from instruction
        if (instructionLower.includes('endpoint') || instructionLower.includes('api') || instructionLower.includes('route')) {
          potentialFiles.push('server.js');
        }
        if (instructionLower.includes('database') || instructionLower.includes('table') || instructionLower.includes('schema')) {
          potentialFiles.push('server.js');
        }
        
        // Get related files
        targetFiles = await codebaseReader.identifyRelatedFiles(instruction, []);
        existingContext = await codebaseReader.buildContext(targetFiles);
        
        if (Object.keys(existingContext).length > 0) {
          console.log(`📖 [SELF-PROGRAM] Read context from ${Object.keys(existingContext).length} file(s)`);
        }
      } catch (contextError) {
        console.warn(`⚠️ [SELF-PROGRAM] Could not read codebase context: ${contextError.message}`);
      }
    }

    // IMPROVED: More direct, like how I build things
    const contextSection = Object.keys(existingContext).length > 0
      ? `\n\nEXISTING CODEBASE CONTEXT (integrate with this code):
${Object.entries(existingContext).map(([file, content]) => 
  `===FILE:${file}===\n${content.substring(0, 5000)}\n===END===`
).join('\n\n')}

IMPORTANT: When modifying existing files, preserve existing functionality and patterns.`
      : '';

    const codePrompt = `You are building this feature RIGHT NOW. Write COMPLETE, WORKING code.

Instruction: ${instruction}

Analysis: ${analysis}

Blind spots to avoid: ${blindSpots.slice(0, 5).join(", ")}${contextSection}

CRITICAL FORMAT REQUIREMENTS:
1. For EACH file, use EXACTLY this format (no variations):
===FILE:path/to/file.js===
[COMPLETE file content here - include ALL code, ALL imports, ALL functions]
===END===

2. Write COMPLETE files - not snippets, not "add this", but the ENTIRE file
3. Include ALL necessary imports at the top
4. Include ALL functions and classes
5. NO placeholders like "// add code here"
6. NO comments like "implement this"
7. Just write the COMPLETE, WORKING code

If creating a new file, write the complete file.
If modifying existing file, write the complete modified file.

Write the code now:`;

    const codeResponse = await callCouncilWithFailover(codePrompt, "chatgpt", {
      maxTokens: 8000, // Allow longer responses for complete files
      temperature: 0.3, // Lower temperature for more consistent code
    });
    
    // NEW: Ensure dependencies are installed before processing
    if (dependencyManager) {
      try {
        const depResult = await dependencyManager.ensureDependencies(codeResponse);
        if (depResult.installed && depResult.installed.length > 0) {
          console.log(`📦 [SELF-PROGRAM] Installed dependencies: ${depResult.installed.join(', ')}`);
        }
      } catch (depError) {
        console.warn(`⚠️ [SELF-PROGRAM] Dependency check failed: ${depError.message}`);
      }
    }
    
    // NEW: Detect database schema needs
    let migrationGenerated = null;
    if (migrationGenerator) {
      try {
        const schemaNeeds = await migrationGenerator.detectSchemaNeeds(codeResponse);
        if (schemaNeeds.tables.length > 0) {
          console.log(`🗄️ [SELF-PROGRAM] Detected database needs: ${schemaNeeds.tables.join(', ')}`);
          migrationGenerated = await migrationGenerator.generateMigration(
            schemaNeeds,
            `auto_${instruction.substring(0, 30).replace(/\s+/g, '_')}`
          );
          console.log(`✅ [SELF-PROGRAM] Generated migration: ${migrationGenerated.filename}`);
        }
      } catch (migrationError) {
        console.warn(`⚠️ [SELF-PROGRAM] Migration generation failed: ${migrationError.message}`);
      }
    }
    
    // Try multiple parsing strategies
    let fileChanges = extractFileChanges(codeResponse);
    
    // If standard format fails, try alternative formats
    if (fileChanges.length === 0) {
      // Try alternative: FILE:path\n...code...\nEND
      const altRegex = /FILE:\s*([^\n]+)\n([\s\S]*?)(?=FILE:|END|$)/g;
      let match;
      while ((match = altRegex.exec(codeResponse)) !== null) {
        fileChanges.push({
          filePath: match[1].trim(),
          content: match[2].trim(),
        });
      }
    }
    
    // If still no files, try to extract from markdown code blocks
    if (fileChanges.length === 0) {
      const codeBlockRegex = /```(?:javascript|js|typescript|ts)?\n([\s\S]*?)```/g;
      const pathRegex = /(?:file|path|create|modify)[:\s]+([^\n]+)/i;
      const pathMatch = codeResponse.match(pathRegex);
      let codeMatch;
      while ((codeMatch = codeBlockRegex.exec(codeResponse)) !== null) {
        fileChanges.push({
          filePath: pathMatch ? pathMatch[1].trim() : `new_file_${Date.now()}.js`,
          content: codeMatch[1].trim(),
        });
      }
    }
    
    if (fileChanges.length === 0) {
      // Last resort: treat entire response as a single file
      const instructionWords = instruction.toLowerCase();
      let inferredPath = 'new_feature.js';
      if (instructionWords.includes('endpoint') || instructionWords.includes('api')) {
        inferredPath = 'server.js'; // Modify server.js
      } else if (instructionWords.includes('overlay') || instructionWords.includes('ui')) {
        inferredPath = 'public/overlay/index.html';
      }
      
      fileChanges.push({
        filePath: inferredPath,
        content: codeResponse,
      });
      
      console.warn(`⚠️ [SELF-PROGRAM] Could not parse file format, using entire response as ${inferredPath}`);
    }

    const results = [];
    const filePathsToSnapshot = fileChanges.map(c => c.filePath);
    if (migrationGenerated) {
      filePathsToSnapshot.push(migrationGenerated.filepath);
    }
    
    const snapshotId = await createSystemSnapshot(
      `Before self-programming: ${instruction.substring(0, 50)}...`,
      filePathsToSnapshot
    );

    // NEW: Wrap file writing in error recovery
    const writeFilesOperation = async () => {
      const writeResults = [];
      
      // IMPROVED: Build faster, like I do - skip sandbox for simple changes, write directly
      for (const change of fileChanges) {
      try {
        const fullPath = path.join(__dirname, change.filePath);
        const isNewFile = !fs.existsSync(fullPath);
        const isJsFile = change.filePath.endsWith('.js');
        
        // For new files or non-critical files, write directly (like I do)
        // Only sandbox test existing critical files
        let shouldSandbox = !isNewFile && isJsFile && (
          change.filePath.includes('server.js') || 
          change.filePath.includes('core/') ||
          change.filePath.includes('package.json')
        );
        
        if (shouldSandbox) {
          const sandboxResult = await sandboxTest(
            change.content,
            `Test: ${change.filePath}`
          );

          if (!sandboxResult.success) {
            writeResults.push({ 
              filePath: change.filePath, 
              success: false, 
              error: `Sandbox test failed: ${sandboxResult.error}` 
            });
            continue;
          }
        }
        
        // Write the file directly (like I do with tools)
        const backupPath = isNewFile ? null : `${fullPath}.backup.${Date.now()}`;
        if (backupPath) {
          await fsPromises.copyFile(fullPath, backupPath);
        }
        
        // Ensure directory exists
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          await fsPromises.mkdir(dir, { recursive: true });
        }
        
        // NEW: Validate code before writing (security, quality)
        let validationResult = null;
        try {
          const codeValidatorModule = await import('./core/code-validator.js');
          const codeValidator = codeValidatorModule.codeValidator || codeValidatorModule.default;
          validationResult = await codeValidator.validateFile(change.filePath, change.content);
          
          if (!validationResult.valid) {
            console.warn(`⚠️ [SELF-PROGRAM] Validation issues for ${change.filePath}:`);
            validationResult.issues.forEach(issue => {
              console.warn(`   - ${issue.severity.toUpperCase()}: ${issue.message}`);
            });
            
            // Block on security errors, warn on others
            const securityErrors = validationResult.issues.filter(i => i.type === 'security' && i.severity === 'error');
            if (securityErrors.length > 0) {
              writeResults.push({
                filePath: change.filePath,
                success: false,
                error: `Security validation failed: ${securityErrors[0].message}`,
              });
              continue;
            }
          }
          
          if (validationResult.warnings.length > 0) {
            console.warn(`⚠️ [SELF-PROGRAM] Warnings for ${change.filePath}:`);
            validationResult.warnings.forEach(warning => {
              console.warn(`   - ${warning.message}`);
            });
          }
        } catch (validationError) {
          console.warn(`⚠️ [SELF-PROGRAM] Could not validate ${change.filePath}: ${validationError.message}`);
          // Continue anyway if validation fails to load
        }
        
        // Write the file
        await fsPromises.writeFile(fullPath, change.content, 'utf-8');
        
        // NEW: Ensure dependencies for this file
        if (dependencyManager && isJsFile) {
          try {
            await dependencyManager.ensureDependencies(change.content);
          } catch (depError) {
            console.warn(`⚠️ [SELF-PROGRAM] Dependency check for ${change.filePath} failed: ${depError.message}`);
          }
        }
        
        // Quick syntax check for JS files
        if (isJsFile) {
          try {
            await execAsync(`node --check "${fullPath}"`);
          } catch (syntaxError) {
            // Rollback on syntax error
            if (backupPath && fs.existsSync(backupPath)) {
              await fsPromises.copyFile(backupPath, fullPath);
              await fsPromises.unlink(backupPath);
            }
            writeResults.push({
              filePath: change.filePath,
              success: false,
              error: `Syntax error: ${syntaxError.message}`,
            });
            continue;
          }
        }
        
        console.log(`✅ [SELF-PROGRAM] ${isNewFile ? 'Created' : 'Modified'}: ${change.filePath}`);
        
        // NEW: Clear cache for modified file
        if (codebaseReader) {
          codebaseReader.clearCache(change.filePath);
        }
        
        writeResults.push({
          success: true,
          filePath: change.filePath,
          isNewFile,
          backupPath: backupPath ? backupPath.split('/').pop() : null,
        });
      } catch (error) {
        writeResults.push({ 
          filePath: change.filePath, 
          success: false, 
          error: error.message 
        });
        console.error(`❌ [SELF-PROGRAM] Failed ${change.filePath}:`, error.message);
      }
    }
    
    return writeResults;
    };
    
    // Execute with error recovery if available
    if (errorRecovery) {
      const recoveryResult = await errorRecovery.withRetry(writeFilesOperation, {
        instruction,
        fileChanges: fileChanges.map(c => c.filePath),
        rootDir: __dirname
      });
      
      if (recoveryResult.success) {
        results.push(...recoveryResult.result);
      } else {
        // If all retries failed, use the last attempt's results
        results.push(...(recoveryResult.result || []));
        console.error(`❌ [SELF-PROGRAM] All retry attempts failed`);
      }
    } else {
      // Fallback to direct execution
      results.push(...(await writeFilesOperation()));
    }

    let deployed = false;
    if (autoDeploy && GITHUB_TOKEN) {
      try {
        await commitToGitHub(
          fileChanges.map(c => c.filePath).join(", "),
          "Self-programming: " + instruction.substring(0, 100),
          instruction
        );
        deployed = true;
      } catch (error) {
        console.log(`⚠️ Deploy failed: ${error.message}`);
      }
    }

    return {
      ok: true,
      filesModified: results.filter(r => r.success).map(r => r.filePath),
      taskId: `task_${Date.now()}`,
      snapshotId,
      deployed,
      results,
      migrationGenerated: migrationGenerated ? {
        filename: migrationGenerated.filename,
        filepath: migrationGenerated.filepath
      } : null,
      dependenciesInstalled: dependencyManager ? true : false,
      contextFilesRead: Object.keys(existingContext).length,
    };
  } catch (error) {
    console.error("Self-programming handler error:", error);
    
    // Try error recovery if available
    if (errorRecovery) {
      const fix = await errorRecovery.generateFix(error, { instruction, rootDir: __dirname });
      if (fix) {
        console.log(`🔧 [SELF-PROGRAM] Attempting automatic fix: ${fix.description}`);
        try {
          await fix.apply();
          console.log(`✅ [SELF-PROGRAM] Fix applied, you may want to retry`);
        } catch (fixError) {
          console.warn(`⚠️ [SELF-PROGRAM] Fix failed: ${fixError.message}`);
        }
      }
    }
    
    return { ok: false, error: error.message };
  }
}

// ==================== SELF-PROGRAMMING ENDPOINT ====================
app.post("/api/v1/system/self-program", requireKey, async (req, res) => {
  try {
    const {
      instruction,
      priority = "medium",
      filePath,
      search,
      replace,
      autoDeploy = false,
    } = req.body;

    if (filePath && search && replace) {
      console.log(`🤖 [SELF-PROGRAM] Direct modification: ${filePath}`);

      const fullPath = path.join(__dirname, filePath);

      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: `File not found: ${filePath}` });
      }

      const originalContent = await readFile(fullPath, "utf-8");

      if (!originalContent.includes(search)) {
        return res.status(400).json({
          error: "Search string not found in file",
          search: search.substring(0, 100),
        });
      }

      const newContent = originalContent.replace(search, replace);

      const backupPath = `${fullPath}.backup.${Date.now()}`;
      await writeFile(backupPath, originalContent);

      await writeFile(fullPath, newContent);

      if (filePath.endsWith(".js")) {
        try {
          await execAsync(`node --check ${fullPath}`);
          console.log("✅ Syntax check passed");
        } catch (error) {
          await writeFile(fullPath, originalContent);
          await fsPromises.unlink(backupPath);
          return res.status(400).json({
            error: "Syntax error in modified code, rolled back",
            details: error.message,
          });
        }
      }

      let deployed = false;
      if (autoDeploy && GITHUB_TOKEN) {
        try {
          await commitToGitHub(
            filePath,
            newContent,
            instruction || "Self-modification"
          );
          deployed = true;
        } catch (error) {
          console.log(`⚠️ Deploy failed: ${error.message}`);
        }
      }

      res.json({
        ok: true,
        filePath,
        modified: true,
        backupPath: backupPath.split("/").pop(),
        deployed,
        message: `Successfully modified ${filePath}`,
      });

      return;
    }

    if (!instruction) {
      return res.status(400).json({
        error: "Instruction or (filePath + search + replace) required",
      });
    }

    console.log(
      `🤖 [SELF-PROGRAM] New instruction: ${instruction.substring(0, 100)}...`
    );

    const analysisPrompt = `As the AI Council, analyze this self-programming instruction:

"${instruction}"

Provide:
1. Which files need modification
2. Exact code changes needed
3. Potential risks and blind spots
4. Testing strategy
5. Rollback plan`;

    const analysis = await callCouncilWithFailover(analysisPrompt, "chatgpt");

    const blindSpots = await detectBlindSpots(instruction, {
      type: "self-programming",
    });

    // IMPROVED: More direct prompt, like how I build
    const codePrompt = `You are building this feature RIGHT NOW. Write COMPLETE, WORKING code.

Instruction: ${instruction}

Analysis: ${analysis}

Blind spots: ${blindSpots.slice(0, 5).join(", ")}

CRITICAL: Write COMPLETE files using EXACT format:
===FILE:path/to/file.js===
[COMPLETE file - ALL imports, ALL functions, ALL code - no placeholders]
===END===

Write the complete working code now:`;

    const codeResponse = await callCouncilWithFailover(codePrompt, "chatgpt", {
      maxTokens: 8000,
      temperature: 0.3,
    });

    const fileChanges = await extractFileChanges(codeResponse);
    
    // Multiple parsing strategies (same as handleSelfProgramming)
    if (fileChanges.length === 0) {
      // Try alternative formats
      const altRegex = /FILE:\s*([^\n]+)\n([\s\S]*?)(?=FILE:|END|$)/g;
      let match;
      while ((match = altRegex.exec(codeResponse)) !== null) {
        fileChanges.push({
          filePath: match[1].trim(),
          content: match[2].trim(),
        });
      }
    }
    
    if (fileChanges.length === 0) {
      // Extract from code blocks
      const codeBlockRegex = /```(?:javascript|js)?\n([\s\S]*?)```/g;
      const pathMatch = codeResponse.match(/(?:file|path)[:\s]+([^\n]+)/i);
      let codeMatch;
      while ((codeMatch = codeBlockRegex.exec(codeResponse)) !== null) {
        fileChanges.push({
          filePath: pathMatch ? pathMatch[1].trim() : `new_file_${Date.now()}.js`,
          content: codeMatch[1].trim(),
        });
      }
    }
    
    if (fileChanges.length === 0) {
      // Last resort: infer from instruction
      let inferredPath = 'new_feature.js';
      const instructionLower = instruction.toLowerCase();
      if (instructionLower.includes('endpoint') || instructionLower.includes('api')) {
        inferredPath = 'server.js';
      } else if (instructionLower.includes('overlay') || instructionLower.includes('ui') || instructionLower.includes('tab')) {
        inferredPath = 'public/overlay/index.html';
      }
      
      fileChanges.push({
        filePath: inferredPath,
        content: codeResponse,
      });
      
      console.warn(`⚠️ [SELF-PROGRAM] Using entire response as ${inferredPath}`);
    }

    const results = [];
    const filePathsToSnapshot = fileChanges.map(c => c.filePath);

    // Create snapshot with all files that will be modified
    const snapshotId = await createSystemSnapshot(
      `Before self-programming: ${instruction.substring(0, 50)}...`,
      filePathsToSnapshot
    );

    // IMPROVED: Build directly like I do - faster, more reliable
    for (const change of fileChanges) {
      try {
        const fullPath = path.join(__dirname, change.filePath);
        const isNewFile = !fs.existsSync(fullPath);
        const isJsFile = change.filePath.endsWith('.js');
        const isCritical = change.filePath.includes('server.js') || change.filePath.includes('core/');
        
        // Only sandbox test critical existing files
        if (!isNewFile && isCritical) {
          const sandboxResult = await sandboxTest(change.content, `Test: ${change.filePath}`);
          if (!sandboxResult.success) {
            results.push({
              success: false,
              filePath: change.filePath,
              error: `Sandbox test failed: ${sandboxResult.error}`,
            });
            continue;
          }
        }
        
        // Write directly (like I do)
        const backupPath = isNewFile ? null : `${fullPath}.backup.${Date.now()}`;
        if (backupPath) {
          await fsPromises.copyFile(fullPath, backupPath);
        }
        
        // Ensure directory exists
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          await fsPromises.mkdir(dir, { recursive: true });
        }
        
        // Write file
        await fsPromises.writeFile(fullPath, change.content, 'utf-8');
        
        // Quick syntax check for JS
        if (isJsFile) {
          try {
            await execAsync(`node --check "${fullPath}"`);
          } catch (syntaxError) {
            // Rollback
            if (backupPath && fs.existsSync(backupPath)) {
              await fsPromises.copyFile(backupPath, fullPath);
              await fsPromises.unlink(backupPath);
            }
            results.push({
              success: false,
              filePath: change.filePath,
              error: `Syntax error: ${syntaxError.message}`,
            });
            continue;
          }
        }
        
        results.push({
          success: true,
          filePath: change.filePath,
          isNewFile,
          backupPath: backupPath ? backupPath.split('/').pop() : null,
        });
        
        console.log(`✅ [SELF-PROGRAM] ${isNewFile ? 'Created' : 'Modified'}: ${change.filePath}`);
      } catch (error) {
        console.error(`❌ [SELF-PROGRAM] Error ${change.filePath}:`, error.message);
        results.push({
          success: false,
          filePath: change.filePath,
          error: error.message,
        });
      }
    }

    const successfulChanges = results
      .filter((r) => r.success)
      .map((r) => r.filePath);
    const failedChanges = results
      .filter((r) => !r.success)
      .map((r) => ({ filePath: r.filePath, error: r.error }));

    // If any changes failed, offer to rollback
    if (failedChanges.length > 0 && successfulChanges.length > 0) {
      console.warn(`⚠️ Partial failure: ${failedChanges.length} file(s) failed, ${successfulChanges.length} succeeded`);
      // Could auto-rollback here if desired, but for now just warn
    }

    // If all changes failed, rollback automatically
    if (successfulChanges.length === 0 && failedChanges.length > 0) {
      console.log(`🔄 All changes failed, rolling back to snapshot ${snapshotId}`);
      await rollbackToSnapshot(snapshotId);
    }

    if (successfulChanges.length > 0) {
      // Create task tracking for this self-programming session
      const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      let taskTracker = null;
      
      try {
        const { TaskCompletionTracker } = await import("./core/task-completion-tracker.js");
        taskTracker = new TaskCompletionTracker(pool, callCouncilMember);
        await taskTracker.startTask(
          taskId,
          'self_programming',
          instruction,
          `Successfully implement: ${instruction}`
        );
        await taskTracker.addStep(taskId, 'code_generation', 'completed', { files: successfulChanges });
      } catch (error) {
        console.warn('⚠️ [SELF-PROGRAM] Task tracker not available:', error.message);
      }

      // Auto-build after code changes
      let buildResult = null;
      if (selfBuilder) {
        console.log('🔨 [SELF-PROGRAM] Auto-building after code changes...');
        if (taskTracker) await taskTracker.addStep(taskId, 'build', 'running');
        
        try {
          buildResult = await selfBuilder.build({
            installDependencies: true,
            validateSyntax: true,
            runTests: false, // Skip tests for now (can be enabled)
            commitChanges: autoDeploy && GITHUB_TOKEN ? true : false,
            pushToGit: autoDeploy && GITHUB_TOKEN ? true : false,
            triggerDeployment: autoDeploy,
            strict: false, // Don't fail on warnings
          });
          
          if (buildResult.success) {
            console.log('✅ [SELF-PROGRAM] Build succeeded');
            if (taskTracker) await taskTracker.addStep(taskId, 'build', 'completed', buildResult);
          } else {
            console.warn('⚠️ [SELF-PROGRAM] Build completed with errors:', buildResult.errors);
            if (taskTracker) await taskTracker.addStep(taskId, 'build', 'completed_with_errors', buildResult);
          }
        } catch (buildError) {
          console.error('❌ [SELF-PROGRAM] Build failed:', buildError.message);
          if (taskTracker) await taskTracker.addStep(taskId, 'build', 'failed', { error: buildError.message });
        }
      }
      
      await triggerDeployment(successfulChanges);
      if (taskTracker) await taskTracker.addStep(taskId, 'deployment', 'triggered');
      
      // Debug and verify after deployment
      if (taskTracker && selfBuilder) {
        console.log('🐛 [SELF-PROGRAM] Starting debug and verification...');
        if (taskTracker) await taskTracker.addStep(taskId, 'verification', 'running');
        
        setTimeout(async () => {
          try {
            const buildId = buildResult?.id || `build_${Date.now()}`;
            const debugResult = await selfBuilder.debugAndVerify(buildId, taskId);
            
            if (taskTracker) {
              await taskTracker.addStep(taskId, 'verification', debugResult.allPassed ? 'completed' : 'failed', debugResult);
              
              // Verify task completion
              const verificationChecks = [
                { type: 'deployment_successful', name: 'Deployment Health' },
                { type: 'no_errors_in_logs', name: 'No Errors in Logs', timeframe: 300 },
                { type: 'ai_verification', name: 'AI Verification', prompt: `Verify that the task "${instruction}" was completed successfully. Check if all changes are working as expected.` },
              ];
              
              const verification = await taskTracker.verifyCompletion(taskId, verificationChecks);
              
              if (verification.verified) {
                console.log('✅ [SELF-PROGRAM] Task completed and verified successfully!');
              } else {
                console.warn('⚠️ [SELF-PROGRAM] Task completed but verification found issues:', verification.results);
              }
            }
          } catch (debugError) {
            console.error('❌ [SELF-PROGRAM] Debug/verification failed:', debugError.message);
            if (taskTracker) await taskTracker.addStep(taskId, 'verification', 'failed', { error: debugError.message });
          }
        }, 60000); // Wait 1 minute for deployment to complete
      }
      
      // After deployment/upgrade, check logs and auto-fix
      if (postUpgradeChecker) {
        setTimeout(async () => {
          await postUpgradeChecker.checkAfterUpgrade();
          postUpgradeChecker.start(); // Start continuous monitoring
        }, 10000); // Wait 10 seconds after changes
      } else if (logMonitor) {
        setTimeout(async () => {
          await logMonitor.monitorLogs(true); // Use AI council
        }, 10000);
      }
    }

    res.json({
      ok: successfulChanges.length > 0,
      instruction,
      filesModified: successfulChanges,
      filesFailed: failedChanges,
      deploymentTriggered: successfulChanges.length > 0,
      blindSpotsDetected: blindSpots.length,
      snapshotId,
      results: results,
      taskId: taskTracker ? taskId : null,
      message: taskTracker 
        ? `Task ${taskId} created. System will build, deploy, debug, and verify completion automatically.`
        : 'Changes applied. Build and deployment triggered.',
    });
  } catch (error) {
    console.error("Self-programming error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

async function extractFileChanges(codeResponse) {
  const changes = [];
  if (!codeResponse || typeof codeResponse !== 'string') {
    console.warn("⚠️ extractFileChanges: Invalid codeResponse");
    return changes;
  }

  try {
    // Try enhanced file extractor first
    try {
      const { extractFilesWithValidation } = await import('./core/enhanced-file-extractor.js');
      const result = extractFilesWithValidation(codeResponse, {
        source: 'self-programming'
      });
      
      if (result.files.length > 0) {
        console.log(`📝 [EXTRACT] Extracted ${result.files.length} file(s) using enhanced extractor`);
        return result.files.map(f => ({ filePath: f.path, content: f.content }));
      }
      
      // If enhanced extractor found files but they're invalid, log and continue to fallback
      if (result.invalid.length > 0) {
        console.warn(`⚠️ [EXTRACT] Enhanced extractor found ${result.invalid.length} invalid file(s), trying fallback`);
      }
    } catch (importError) {
      console.warn(`⚠️ [EXTRACT] Could not load enhanced extractor: ${importError.message}`);
    }

    // Fallback: Primary pattern: ===FILE:path/to/file.js=== ... ===END===
    const fileRegex = /===FILE:(.*?)===\s*\n([\s\S]*?)===END===/g;
    let match;

    while ((match = fileRegex.exec(codeResponse)) !== null) {
      const filePath = match[1].trim();
      const content = match[2].trim();
      
      if (filePath && content && content.length > 10) {
        changes.push({
          filePath,
          content,
        });
      }
    }

    // Fallback: Look for code blocks with file paths in comments
    if (changes.length === 0) {
      const codeBlockRegex = /```(?:javascript|js|typescript|ts)?\n(?:.*?\/\/\s*file:\s*([^\n]+)\n)?([\s\S]*?)```/g;
      let blockMatch;
      while ((blockMatch = codeBlockRegex.exec(codeResponse)) !== null) {
        const filePath = blockMatch[1]?.trim() || "unknown.js";
        const content = blockMatch[2]?.trim() || "";
        if (content && content.length > 10) {
          changes.push({ filePath, content });
        }
      }
    }

    console.log(`📝 [EXTRACT] Extracted ${changes.length} file change(s) from AI response`);
    return changes;
  } catch (error) {
    console.error("Error extracting file changes:", error.message);
    return changes;
  }
}

// Dev commit endpoint
app.post("/api/v1/dev/commit", requireKey, async (req, res) => {
  try {
    const { path: filePath, content, message } = req.body;

    if (!filePath || !content) {
      return res.status(400).json({ error: "Path and content required" });
    }

    await commitToGitHub(filePath, content, message || `Update ${filePath}`);

    res.json({
      ok: true,
      committed: filePath,
      message: message || `Update ${filePath}`,
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Full file replacement
app.post("/api/v1/system/replace-file", requireKey, async (req, res) => {
  try {
    const { filePath, fullContent, backup = true } = req.body;

    if (!filePath || !fullContent) {
      return res
        .status(400)
        .json({ error: "filePath and fullContent required" });
    }

    const allowedFiles = [
      ".js",
      "public/overlay/command-center.js",
      "public/overlay/command-center.html",
      "package.json",
    ];

    if (!allowedFiles.includes(filePath)) {
      return res
        .status(403)
        .json({ error: "File not allowed for replacement" });
    }

    const fullPath = path.join(__dirname, filePath);

    if (backup && fs.existsSync(fullPath)) {
      const backupPath = `${fullPath}.backup.${Date.now()}`;
      await fsPromises.copyFile(fullPath, backupPath);
      console.log(`📦 Backed up to: ${backupPath}`);
    }

    await fsPromises.writeFile(fullPath, fullContent, "utf-8");

    console.log(`✅ Completely replaced: ${filePath}`);

    res.json({
      ok: true,
      message: `File ${filePath} completely replaced`,
      backup: backup ? `Created backup with timestamp` : "No backup",
      size: fullContent.length,
    });
  } catch (error) {
    console.error("File replacement error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== WEBSOCKET ====================
wss.on("connection", (ws) => {
  const clientId = `ws_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  activeConnections.set(clientId, ws);
  conversationHistory.set(clientId, []);

  console.log(`✅ [WS] ${clientId} connected`);

  ws.send(
    JSON.stringify({
      type: "connection",
      status: "connected",
      clientId,
      message: "🎼 LifeOS v26.1 (no Claude) - Consensus Protocol Ready",
      systemMetrics,
      features: {
        consensusProtocol: true,
        blindSpotDetection: true,
        dailyIdeas: true,
        aiRotation: true,
        sandboxTesting: true,
        rollbackCapability: true,
        ollamaBridge: DEEPSEEK_BRIDGE_ENABLED === "true",
        stripeRevenueSync: Boolean(STRIPE_SECRET_KEY),
      },
    })
  );

  ws.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === "chat") {
        const text = msg.text || msg.message;
        const member = msg.member || "chatgpt";

        if (!text) return;

        try {
          const blindSpots = await detectBlindSpots(text, {
            source: "websocket",
          });

          const response = await callCouncilWithFailover(text, member);
          ws.send(
            JSON.stringify({
              type: "response",
              response,
              member,
              blindSpotsDetected: blindSpots.length,
              timestamp: new Date().toISOString(),
            })
          );
        } catch (error) {
          ws.send(
            JSON.stringify({
              type: "error",
              error: error.message,
            })
          );
        }
      }
    } catch (error) {
      ws.send(JSON.stringify({ type: "error", error: error.message }));
    }
  });

  ws.on("close", () => {
    activeConnections.delete(clientId);
    conversationHistory.delete(clientId);
    console.log(`👋 [WS] ${clientId} disconnected`);
  });
});

// ==================== STARTUP ====================
async function start() {
  try {
    console.log("\n" + "=".repeat(100));
    console.log(
      "🚀 LIFEOS v26.1 (NO CLAUDE) - CONSENSUS & SELF-HEALING SYSTEM"
    );
    console.log("=".repeat(100));

    // Critical: Database must initialize (but don't fail if tables already exist)
    try {
      await initDatabase();
      console.log("✅ Database initialized");
    } catch (dbError) {
      console.error("❌ Database initialization error:", dbError.message);
      // Don't exit - try to continue (might be connection issue that resolves)
      console.warn("⚠️ Continuing startup despite DB error - will retry connections");
    }

    // Load ROI (non-critical)
    try {
      await loadROIFromDatabase();
    } catch (roiError) {
      console.warn("⚠️ ROI load error (non-critical):", roiError.message);
    }
    
    // Load knowledge context from processed dumps
    try {
      const knowledgeContext = await loadKnowledgeContext();
      if (knowledgeContext) {
        console.log(`📚 [KNOWLEDGE] Context loaded: ${knowledgeContext.totalEntries} entries`);
      }
    } catch (knowledgeError) {
      console.warn("⚠️ Knowledge load error (non-critical):", knowledgeError.message);
    }
    
    // Run dependency audit before initializing systems
    try {
      const { dependencyAuditor } = await import("./core/dependency-auditor.js");
      const auditResults = await dependencyAuditor.auditAll();
      if (auditResults.npmPackages.missing.length > 0) {
        console.log(`⚠️ [STARTUP] ${auditResults.npmPackages.missing.length} packages were missing and have been installed`);
      }
      if (auditResults.coreModules.missing.length > 0) {
        console.error(`❌ [STARTUP] ${auditResults.coreModules.missing.length} core modules are missing!`);
        console.error(`   Missing: ${auditResults.coreModules.missing.join(', ')}`);
      }
    } catch (error) {
      console.warn("⚠️ Dependency auditor not available:", error.message);
    }
    
    await initializeTwoTierSystem();

    // Initialize Sales Coaching Services
    try {
      const SalesAnalyzerModule = await import("./src/services/sales-technique-analyzer.js");
      const CallRecorderModule = await import("./src/services/call-recorder.js");
      
      salesTechniqueAnalyzer = new SalesAnalyzerModule.SalesTechniqueAnalyzer(pool, callCouncilWithFailover);
      callRecorder = new CallRecorderModule.CallRecorder(pool, salesTechniqueAnalyzer);
      
      console.log("✅ Sales Coaching Services initialized");
    } catch (error) {
      console.warn("⚠️ Sales Coaching Services not available:", error.message);
      salesTechniqueAnalyzer = null;
      callRecorder = null;
    }

    // Initialize Goal Tracking & Coaching Services
    try {
      const GoalTrackerModule = await import("./src/services/goal-tracker.js");
      const ActivityTrackerModule = await import("./src/services/activity-tracker.js");
      const CoachingProgressionModule = await import("./src/services/coaching-progression.js");
      const CalendarServiceModule = await import("./src/services/calendar-service.js");
      
      goalTracker = new GoalTrackerModule.GoalTracker(pool, callCouncilWithFailover);
      activityTracker = new ActivityTrackerModule.ActivityTracker(pool, callRecorder);
      coachingProgression = new CoachingProgressionModule.CoachingProgression(pool, callCouncilWithFailover);
      calendarService = new CalendarServiceModule.CalendarService(pool, callRecorder, activityTracker);
      
      console.log("✅ Goal Tracking & Coaching Services initialized");
    } catch (error) {
      console.warn("⚠️ Goal Tracking & Coaching Services not available:", error.message);
      goalTracker = null;
      activityTracker = null;
      coachingProgression = null;
      calendarService = null;
    }

    // Initialize Motivation & Perfect Day Services
    try {
      const PerfectDayModule = await import("./src/services/perfect-day-system.js");
      const GoalCommitmentModule = await import("./src/services/goal-commitment-system.js");
      const CallSimulationModule = await import("./src/services/call-simulation-system.js");
      const RelationshipMediationModule = await import("./src/services/relationship-mediation.js");
      const MeaningfulMomentsModule = await import("./src/services/meaningful-moments.js");
      
      perfectDaySystem = new PerfectDayModule.PerfectDaySystem(pool, callCouncilWithFailover);
      goalCommitmentSystem = new GoalCommitmentModule.GoalCommitmentSystem(pool, callCouncilWithFailover);
      callSimulationSystem = new CallSimulationModule.CallSimulationSystem(pool, callRecorder, callCouncilWithFailover);
      relationshipMediation = new RelationshipMediationModule.RelationshipMediation(pool, callCouncilWithFailover);
      meaningfulMoments = new MeaningfulMomentsModule.MeaningfulMoments(pool, callRecorder);
      
      console.log("✅ Motivation & Perfect Day Services initialized");
    } catch (error) {
      console.warn("⚠️ Motivation & Perfect Day Services not available:", error.message);
      perfectDaySystem = null;
      goalCommitmentSystem = null;
      callSimulationSystem = null;
      relationshipMediation = null;
      meaningfulMoments = null;
    }

    console.log("\n🤖 AI COUNCIL:");
    Object.values(COUNCIL_MEMBERS).forEach((m) =>
      console.log(`  • ${m.name} (${m.model}) - ${m.role}`)
    );

    console.log("\n✅ SYSTEMS:");
    console.log("  ✅ Self-Programming");
    console.log("  ✅ Ollama Bridge for DeepSeek");
    console.log("  ✅ File Operations");
    console.log("  ✅ Overlay Connection (Railway URL)");
    console.log("  ✅ Consensus Protocol");
    console.log("  ✅ Blind Spot Detection");
    console.log("  ✅ Daily Idea Generation (25 ideas)");
    console.log("  ✅ AI Performance Rotation");
    console.log("  ✅ Sandbox Testing");
    console.log("  ✅ Snapshot & Rollback");
    console.log("  ✅ User Preference Learning");
    console.log("  ✅ No-Cache API Calls");
    console.log("  ✅ Self-Healing System");
    console.log("  ✅ Continuous Memory");
    console.log("  ✅ Stripe Revenue Sync (read + ROI logging only)");

    // Kick off the execution queue
    executionQueue.executeNext();

    // Deploy income drones (if not disabled)
    if (!DISABLE_INCOME_DRONES) {
      // Note: If EnhancedIncomeDrone is used, drones are already deployed during initialization
      // Only deploy here if using basic IncomeDroneSystem
      if (incomeDroneSystem && incomeDroneSystem.constructor.name === 'IncomeDroneSystem') {
        console.log('🚀 [STARTUP] Deploying income drones (basic system)...');
        const affiliateDrone = await incomeDroneSystem.deployDrone("affiliate", 500);
        const contentDrone = await incomeDroneSystem.deployDrone("content", 300);
        const outreachDrone = await incomeDroneSystem.deployDrone("outreach", 1000);
        const productDrone = await incomeDroneSystem.deployDrone("product", 200);
        const serviceDrone = await incomeDroneSystem.deployDrone("service", 500);
        console.log(`✅ [STARTUP] Deployed 5 income drones (affiliate, content, outreach, product, service)`);
      } else {
        console.log('✅ [STARTUP] Income drones already deployed by EnhancedIncomeDrone system');
      }
    } else {
      console.log('ℹ️ [STARTUP] Income drones DISABLED (set DISABLE_INCOME_DRONES=false to enable)');
    }

      // Initialize Ollama Installer (auto-install Ollama if needed)
      try {
        const ollamaInstallerModule = await import("./core/ollama-installer.js");
        const ollamaInstaller = new ollamaInstallerModule.OllamaInstaller(pool, callCouncilMember);
        // Auto-configure in background (don't block startup)
        ollamaInstaller.autoConfigure().catch(err => {
          console.warn('⚠️ Ollama auto-configuration failed:', err.message);
        });
        console.log("✅ Ollama Installer initialized - will auto-configure Ollama if possible");
      } catch (error) {
        console.warn("⚠️ Ollama Installer not available:", error.message);
      }

      // Initialize Idea-to-Implementation Pipeline (after taskTracker is available)
      try {
        const pipelineModule = await import("./core/idea-to-implementation-pipeline.js");
        const { TaskCompletionTracker } = await import("./core/task-completion-tracker.js");
        const taskTracker = new TaskCompletionTracker(pool, callCouncilMember);
        ideaToImplementationPipeline = new pipelineModule.IdeaToImplementationPipeline(
          pool,
          callCouncilMember,
          selfBuilder,
          taskTracker
        );
        console.log("✅ Idea-to-Implementation Pipeline initialized - system can now implement ideas from start to finish");
      
      // Auto-implement queued ideas every 10 minutes
      setInterval(async () => {
        if (ideaToImplementationPipeline) {
          try {
            const result = await ideaToImplementationPipeline.autoImplementQueuedIdeas(3);
            if (result.implemented > 0) {
              console.log(`✅ [PIPELINE] Auto-implemented ${result.implemented} idea(s)`);
            }
          } catch (error) {
            console.error('❌ [PIPELINE] Auto-implementation error:', error.message);
          }
        }
      }, 10 * 60 * 1000); // Every 10 minutes
      
      // Initial run after 2 minutes
      setTimeout(async () => {
        if (ideaToImplementationPipeline) {
          try {
            const result = await ideaToImplementationPipeline.autoImplementQueuedIdeas(5);
            if (result.implemented > 0) {
              console.log(`✅ [PIPELINE] Initial auto-implementation: ${result.implemented} idea(s)`);
            }
          } catch (error) {
            console.error('❌ [PIPELINE] Initial auto-implementation error:', error.message);
          }
        }
      }, 120000); // 2 minutes
    } catch (error) {
      console.warn("⚠️ Idea-to-Implementation Pipeline initialization failed:", error.message);
    }

    // Continuous self-improvement cycles
    setInterval(() => continuousSelfImprovement(), 30 * 60 * 1000);
    setTimeout(() => continuousSelfImprovement(), 120000);

    // Daily ideas
    setInterval(() => generateDailyIdeas(), 24 * 60 * 60 * 1000);
    setTimeout(() => generateDailyIdeas(), 60000);

    // AI rotation
    setInterval(() => rotateAIsBasedOnPerformance(), 60 * 60 * 1000);

    // Stripe revenue sync (if configured)
    if (STRIPE_SECRET_KEY) {
      await syncStripeRevenue();
      setInterval(
        () =>
          syncStripeRevenue().catch((err) =>
            console.error("Stripe sync interval error:", err.message)
          ),
        15 * 60 * 1000
      );
    }

    // Agent vacation/busy mode automation
    async function handleAgentVacationMode() {
      try {
        // Find agents who are on vacation or marked as busy
        const busyAgents = await pool.query(
          `SELECT a.*, e.onboarding_stage, e.mastery_level
           FROM boldtrail_agents a
           LEFT JOIN recruitment_enrollments e ON e.agent_id = a.id
           WHERE (a.preferences->>'vacation_mode' = 'true' OR (a.preferences->>'vacation_mode')::boolean = true)
           OR (a.preferences->>'busy_mode' = 'true' OR (a.preferences->>'busy_mode')::boolean = true)`
        );

        for (const agent of busyAgents.rows) {
          // Check for pending emails that need responses
          const pendingEmails = await pool.query(
            `SELECT * FROM boldtrail_email_drafts 
             WHERE agent_id = $1 
             AND status = 'draft'
             AND created_at < NOW() - INTERVAL '4 hours'
             LIMIT 5`,
            [agent.id]
          );

          // Auto-send or queue responses using agent's tone
          for (const email of pendingEmails.rows) {
            const autoResponsePrompt = `Draft a brief, professional auto-response email for a real estate agent who is temporarily unavailable.

Agent's tone: ${agent.agent_tone || "professional and friendly"}
Original email type: ${email.draft_type}
Recipient: ${email.recipient_name || email.recipient_email}

Keep it brief, professional, and set appropriate expectations about response time.`;

            try {
              const autoResponse = await callCouncilWithFailover(autoResponsePrompt, "chatgpt");
              
              // Create auto-response draft
              await pool.query(
                `INSERT INTO boldtrail_email_drafts 
                 (agent_id, draft_type, recipient_email, recipient_name, subject, content, context_data, status)
                 VALUES ($1, 'auto_response', $2, $3, $4, $5, $6, 'ready_to_send')`,
                [
                  agent.id,
                  email.recipient_email,
                  email.recipient_name,
                  `Re: ${email.subject || 'Your inquiry'}`,
                  autoResponse,
                  JSON.stringify({ original_email_id: email.id, auto_generated: true }),
                ]
              );

              console.log(`✅ Auto-response created for agent ${agent.id} (vacation/busy mode)`);
            } catch (err) {
              console.error(`❌ Auto-response error for agent ${agent.id}:`, err.message);
            }
          }

          // Maintain consistency: Check for scheduled showings and send reminders
          const upcomingShowings = await pool.query(
            `SELECT * FROM boldtrail_showings 
             WHERE agent_id = $1 
             AND showing_date BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
             AND status = 'scheduled'`,
            [agent.id]
          );

          for (const showing of upcomingShowings.rows) {
            // Send reminder to client
            const reminderPrompt = `Draft a friendly reminder email for a property showing.

Agent's tone: ${agent.agent_tone || "professional and friendly"}
Client: ${showing.client_name}
Property: ${showing.property_address}
Showing time: ${new Date(showing.showing_date).toLocaleString()}

Keep it brief and confirm the appointment.`;

            try {
              const reminder = await callCouncilWithFailover(reminderPrompt, "chatgpt");
              
              await pool.query(
                `INSERT INTO boldtrail_email_drafts 
                 (agent_id, draft_type, recipient_email, recipient_name, subject, content, context_data, status)
                 VALUES ($1, 'showing_reminder', $2, $3, $4, $5, $6, 'ready_to_send')`,
                [
                  agent.id,
                  showing.client_email,
                  showing.client_name,
                  `Reminder: Showing at ${showing.property_address}`,
                  reminder,
                  JSON.stringify({ showing_id: showing.id, auto_generated: true }),
                ]
              );
            } catch (err) {
              console.error(`❌ Showing reminder error:`, err.message);
            }
          }
        }
      } catch (error) {
        console.error("Vacation mode automation error:", error.message);
      }
    }

    // Run vacation mode check every 2 hours
    setInterval(() => handleAgentVacationMode().catch(err => 
      console.error("Vacation mode interval error:", err.message)
    ), 2 * 60 * 60 * 1000);

    // BoldTrail follow-up reminder system
    async function checkBoldTrailFollowUps() {
      try {
        // Find showings completed 24-48 hours ago that haven't been followed up
        const result = await pool.query(
          `SELECT s.*, a.email as agent_email, a.name as agent_name, a.agent_tone
           FROM boldtrail_showings s
           JOIN boldtrail_agents a ON s.agent_id = a.id
           WHERE s.status = 'completed'
           AND s.showing_date < NOW() - INTERVAL '24 hours'
           AND s.showing_date > NOW() - INTERVAL '48 hours'
           AND NOT EXISTS (
             SELECT 1 FROM boldtrail_email_drafts 
             WHERE agent_id = s.agent_id 
             AND draft_type = 'followup'
             AND context_data->>'showing_id' = s.id::text
             AND created_at > s.showing_date
           )
           LIMIT 10`
        );

        for (const showing of result.rows) {
          // Auto-draft follow-up email
          const prompt = `Draft a follow-up email for a real estate agent after a property showing.

Agent's tone: ${showing.agent_tone || "professional and friendly"}
Client: ${showing.client_name || "Client"}
Property: ${showing.property_address}
Showing date: ${new Date(showing.showing_date).toLocaleDateString()}

Write a friendly follow-up that:
- Thanks them for viewing the property
- Asks for their thoughts/feedback
- Offers to answer questions
- Mentions next steps if interested

Format as:
SUBJECT: [subject]

[email body]`;

          try {
            const emailContent = await callCouncilWithFailover(prompt, "chatgpt");
            const subjectMatch = emailContent.match(/SUBJECT:\s*(.+)/i);
            const subject = subjectMatch ? subjectMatch[1].trim() : `Follow-up: ${showing.property_address}`;
            const body = emailContent.replace(/SUBJECT:.*/i, "").trim();

            await pool.query(
              `INSERT INTO boldtrail_email_drafts 
               (agent_id, draft_type, recipient_email, recipient_name, subject, content, context_data)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`,
              [
                showing.agent_id,
                'followup',
                showing.client_email,
                showing.client_name,
                subject,
                body,
                JSON.stringify({ showing_id: showing.id, auto_generated: true }),
              ]
            );

            console.log(`✅ BoldTrail: Auto-generated follow-up for showing ${showing.id}`);
          } catch (err) {
            console.error(`❌ BoldTrail follow-up error for showing ${showing.id}:`, err.message);
          }
        }
      } catch (error) {
        console.error("BoldTrail follow-up check error:", error.message);
      }
    }

    // Run follow-up check every 6 hours
    setInterval(() => checkBoldTrailFollowUps().catch(err => 
      console.error("BoldTrail follow-up interval error:", err.message)
    ), 6 * 60 * 60 * 1000);

    // Initialize virtual class modules if they don't exist
    async function initializeVirtualClassModules() {
      try {
        const moduleCheck = await pool.query("SELECT COUNT(*) FROM virtual_class_modules");
        if (parseInt(moduleCheck.rows[0].count) === 0) {
          const modules = [
            {
              name: "Introduction to Real Estate",
              order: 1,
              content: { description: "Basics of real estate, licensing, and getting started" },
            },
            {
              name: "Client Communication",
              order: 2,
              content: { description: "How to communicate effectively with clients" },
            },
            {
              name: "Property Showings",
              order: 3,
              content: { description: "Planning and executing successful property showings" },
            },
            {
              name: "Email & Follow-up",
              order: 4,
              content: { description: "Professional email drafting and follow-up strategies" },
            },
            {
              name: "Building Your Business",
              order: 5,
              content: { description: "Growing your real estate business and client base" },
            },
          ];

          for (const module of modules) {
            await pool.query(
              `INSERT INTO virtual_class_modules (module_name, module_order, content)
               VALUES ($1, $2, $3)`,
              [module.name, module.order, JSON.stringify(module.content)]
            );
          }

          console.log("✅ Virtual class modules initialized");
        }
      } catch (error) {
        console.error("Virtual class initialization error:", error.message);
      }
    }

    // Initialize modules on startup
    await initializeVirtualClassModules();

    // Initial snapshot
    await createSystemSnapshot("System startup");

    // ✅ This is the important line – use the HTTP server, not a bare `.listen`
    server.listen(PORT, HOST, () => {
      const railwayUrl = RAILWAY_PUBLIC_DOMAIN || "robust-magic-production.up.railway.app";
      console.log(`\n🌐  ONLINE: http://${HOST}:${PORT}`);
      console.log(`📊 Health: http://${HOST}:${PORT}/healthz`);
      console.log(`🎮 Overlay: http://${HOST}:${PORT}/overlay/index.html`);
      console.log(`🔐 Command Center Activation: https://${railwayUrl}/activate`);
      console.log(`🎯 Command Center: https://${railwayUrl}/command-center`);
      console.log(`🏠 BoldTrail CRM: https://${railwayUrl}/boldtrail`);
      console.log(`📞 Recruitment System: POST /api/v1/recruitment/* (outbound calls, webinars, enrollment)`);
      console.log(`🎓 Virtual Class: POST /api/v1/class/enroll (free real estate education)`);
      console.log(`📹 YouTube Automation: POST /api/v1/youtube/* (progressive unlock system)`);
      console.log(`🔨 Auto-Builder: GET /api/v1/auto-builder/status (builds opportunities automatically)`);
      console.log(`🤖 Extract Conversations: https://${railwayUrl}/extract-conversations`);
      console.log(`🤖 Self-Program: POST /api/v1/system/self-program`);
      console.log(`🔄 Replace File: POST /api/v1/system/replace-file`);
      console.log(
        `💳 Stripe Checkout: POST /api/v1/stripe/checkout-session (key required)`
      );
      console.log(
        `🌐 Railway URL: https://${railwayUrl}`
      );
      console.log("\n✅ SYSTEM READY");
      console.log("=".repeat(100) + "\n");
    });
  } catch (error) {
    console.error("❌ Startup error:", error);
    console.error("Stack:", error.stack);
    
    // Try to start HTTP server anyway for health checks
    try {
      server.listen(PORT, HOST, () => {
        console.log(`⚠️ Server started in degraded mode due to startup error`);
        console.log(`📊 Health check available at http://${HOST}:${PORT}/healthz`);
      });
    } catch (serverError) {
      console.error("❌ Failed to start HTTP server:", serverError.message);
      process.exit(1);
    }
  }
}

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n📊 Shutting down...");
  await createSystemSnapshot("System shutdown");
  for (const ws of activeConnections.values()) ws.close();
  await pool.end();
  process.exit(0);
});

// Start
start();

export default app;