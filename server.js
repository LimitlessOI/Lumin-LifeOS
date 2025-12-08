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
import { Pool } from "pg";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import crypto from "crypto";
import process from "node:process";
import { exec } from "child_process";
import { promisify } from "util";

// Modular two-tier council system (loaded dynamically in startup)
let Tier0Council, Tier1Council, ModelRouter, OutreachAutomation, WhiteLabelConfig;

// Knowledge Base System
let KnowledgeBase, FileCleanupAnalyzer;

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
  COMMAND_CENTER_KEY = "MySecretKey2025LifeOS",
  OPENAI_API_KEY,
  ANTHROPIC_API_KEY,
  GEMINI_API_KEY,
  LIFEOS_ANTHROPIC_KEY,
  LIFEOS_GEMINI_KEY,
  DEEPSEEK_API_KEY,
  GROK_API_KEY,
  GITHUB_TOKEN,
  GITHUB_REPO = "LimitlessOI/Lumin-LifeOS",
  OLLAMA_ENDPOINT = "http://localhost:11434",
  DEEPSEEK_LOCAL_ENDPOINT = "",
  DEEPSEEK_BRIDGE_ENABLED = "false",
  ALLOWED_ORIGINS = "",
  HOST = "0.0.0.0",
  PORT = 8080,
  MAX_DAILY_SPEND = 50.0,
  NODE_ENV = "production",
  RAILWAY_PUBLIC_DOMAIN = "robust-magic-production.up.railway.app",
  // Stripe config
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET, // reserved for future webhook use
} = process.env;

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
  // Check for key in query parameter
  const key = req.query.key;
  
  // If key provided and valid, allow access
  if (key && key === COMMAND_CENTER_KEY) {
    const filePath = path.join(__dirname, "public", "overlay", "command-center.html");
    if (fs.existsSync(filePath)) {
      return res.sendFile(filePath);
    } else {
      return res.status(404).send("Command center not found. Please ensure command-center.html exists.");
    }
  }

  // If no key or invalid key, redirect to activation
  if (key && key !== COMMAND_CENTER_KEY) {
    return res.redirect('/activate?error=invalid_key');
  }

  // No key provided, redirect to activation
  res.redirect('/activate');
});

// ==================== MIDDLEWARE ====================
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.text({ type: "text/plain", limit: "50mb" }));

// Serve static files (after specific routes)
app.use(express.static(path.join(__dirname, "public")));

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
export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL?.includes("neon.tech")
    ? { rejectUnauthorized: false }
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

    console.log("✅ Database schema initialized (v26.1 - no Claude)");
  } catch (error) {
    console.error("❌ DB init error:", error.message);
    throw error;
  }
}

// ==================== ENHANCED AI COUNCIL MEMBERS (NO CLAUDE) ====================
const COUNCIL_MEMBERS = {
  chatgpt: {
    name: "ChatGPT",
    model: "gpt-4o",
    provider: "openai",
    role: "Technical Executor & User Preference Learning",
    focus: "implementation, execution, user patterns",
    maxTokens: 4096,
    tier: "heavy",
    specialties: ["execution", "user_modeling", "patterns"],
  },
  gemini: {
    name: "Gemini",
    model: "gemini-2.5-flash",
    provider: "google",
    role: "Research Analyst & Idea Generator",
    focus: "data analysis, creative solutions, daily ideas",
    maxTokens: 8192,
    tier: "medium",
    specialties: ["analysis", "creativity", "ideation"],
  },
  deepseek: {
    name: "DeepSeek",
    model: "deepseek-coder",
    provider: "deepseek",
    role: "Infrastructure & Sandbox Testing",
    focus: "optimization, performance, safe testing",
    maxTokens: 4096,
    tier: "medium",
    specialties: ["infrastructure", "testing", "performance"],
    useLocal: DEEPSEEK_BRIDGE_ENABLED === "true",
  },
  grok: {
    name: "Grok",
    model: "grok-2-1212",
    provider: "xai",
    role: "Innovation Scout & Reality Check",
    focus: "novel approaches, risk assessment, blind spots",
    maxTokens: 4096,
    tier: "light",
    specialties: ["innovation", "reality_check", "risk"],
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
        process.env.Deepseek_API_KEY?.trim() ||
        process.env.DEEPSEEK_API_KEY?.trim() ||
        process.env.DEEPSEEK_API_KEY?.trim()
      );
    case "xai":
      return process.env.GROK_API_KEY?.trim();
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
  
  // Simple tasks -> cheapest model
  if (taskComplexity === 'simple' || promptLength < 200) {
    compressionMetrics.model_downgrades++;
    return { member: 'deepseek', model: 'deepseek-coder', reason: 'simple_task' };
  }
  
  // Medium tasks -> medium cost
  if (taskComplexity === 'medium' || promptLength < 1000) {
    return { member: 'gemini', model: 'gemini-2.5-flash', reason: 'medium_task' };
  }
  
  // Complex tasks -> use requested member
  return null; // Use original member
}

// ==================== ENHANCED AI CALLING WITH AGGRESSIVE COST OPTIMIZATION ====================
async function callCouncilMember(member, prompt, options = {}) {
  const config = COUNCIL_MEMBERS[member];
  if (!config) throw new Error(`Unknown member: ${member}`);

  const spend = await getDailySpend();
  if (spend >= MAX_DAILY_SPEND) {
    throw new Error(
      `Daily spend limit ($${MAX_DAILY_SPEND}) reached at $${spend.toFixed(4)}`
    );
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
  const optimalModel = selectOptimalModel(prompt, options.complexity);
  if (optimalModel && options.allowModelDowngrade !== false) {
    member = optimalModel.member;
    console.log(`💰 [MODEL OPTIMIZATION] Using ${member} instead (${optimalModel.reason})`);
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
          process.env.Deepseek_API_KEY?.trim() ||
          process.env.DEEPSEEK_API_KEY?.trim() ||
          process.env.DEEPSEEK_API_KEY?.trim()
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

  if (!memberApiKey) {
    if (config.provider === "openai") {
      throw new Error(`${member.toUpperCase()}_API_KEY not set`);
    } else {
      console.log(`⚠️ ${member} API key not found, skipping...`);
      throw new Error(`${member} unavailable (no API key)`);
    }
  }

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
            { role: "user", content: prompt },
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
            contents: [{ parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
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
            { role: "user", content: prompt },
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

    if (config.provider === "deepseek") {
      const deepseekApiKey = getApiKey("deepseek");

      if (config.useLocal && OLLAMA_ENDPOINT) {
        try {
          console.log(
            `🌉 Trying Ollama bridge for DeepSeek at ${OLLAMA_ENDPOINT}`
          );

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
            const json = await response.json();
            const text = json.response || "";

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
            { role: "user", content: prompt },
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

// ==================== DAILY IDEA GENERATION ====================
async function generateDailyIdeas() {
  try {
    const today = dayjs().format("YYYY-MM-DD");
    if (lastIdeaGeneration === today) return;

    console.log("💡 Generating 25 daily ideas...");

    const ideaPrompt = `Generate 25 unique and revenue-focused ideas to improve the LifeOS system as an online business operator.
    Include things like:
    - Finding and structuring service offers (logos, code review, automation setup)
    - Improving funnels and client onboarding
    - Reducing manual work for the founder
    - Improving ROI tracking and Stripe integration

    Format each idea as:
    TITLE: [short title]
    DESCRIPTION: [one sentence description]
    DIFFICULTY: [easy/medium/hard]
    IMPACT: [low/medium/high]`;

    let response;
    try {
      response = await callCouncilWithFailover(ideaPrompt, "gemini");
    } catch (err) {
      console.error("Daily idea council error, using fallback:", err.message);
      response = null;
    }

    const ideas = [];
    if (response && typeof response === "string" && response.length > 50) {
      const blocks = response.split("\n\n").filter((b) => b.includes("TITLE:"));
      for (const ideaText of blocks.slice(0, 25)) {
        const titleMatch = ideaText.match(/TITLE:\s*(.+)/);
        const descMatch = ideaText.match(/DESCRIPTION:\s*(.+)/);
        const diffMatch = ideaText.match(/DIFFICULTY:\s*(.+)/);

        if (titleMatch && descMatch) {
          ideas.push({
            title: titleMatch[1].trim(),
            description: descMatch[1].trim(),
            difficulty: (diffMatch?.[1] || "medium").trim(),
          });
        }
      }
    }

    if (ideas.length === 0) {
      console.warn("Daily idea generation fell back to local template ideas.");
      for (let i = 1; i <= 25; i++) {
        ideas.push({
          title: `Fallback Idea ${i}`,
          description: `Improve one lifecycle of LifeOS (offers, funnels, drones, billing, or self-repair). Variant #${i}.`,
          difficulty: i < 10 ? "easy" : i < 20 ? "medium" : "hard",
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
    const strategy = await callCouncilWithFailover(strategyPrompt, "chatgpt");
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
        "deepseek"
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

// ==================== COUNCIL WITH FAILOVER ====================
async function callCouncilWithFailover(prompt, preferredMember = "chatgpt") {
  const members = Object.keys(COUNCIL_MEMBERS);
  const ordered = [
    preferredMember,
    ...members.filter((m) => m !== preferredMember),
  ];

  for (const member of ordered) {
    try {
      const response = await callCouncilMember(member, prompt);
      if (response) {
        console.log(`✅ Got response from ${member}`);
        return response;
      }
    } catch (error) {
      console.log(`⚠️ ${member} failed: ${error.message}, trying next...`);
      continue;
    }
  }

  console.error("❌ All AI council members unavailable");
  return "All AI council members currently unavailable. Check API keys in Railway environment.";
}

// ==================== EXECUTION QUEUE ====================
class ExecutionQueue {
  constructor() {
    this.tasks = [];
    this.activeTask = null;
    this.history = [];
  }

  async addTask(type, description) {
    const taskId = `task_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    try {
      await pool.query(
        `INSERT INTO execution_tasks (task_id, type, description, status, created_at)
         VALUES ($1, $2, $3, $4, now())`,
        [taskId, type, description, "queued"]
      );

      this.tasks.push({
        id: taskId,
        type,
        description,
        status: "queued",
        createdAt: new Date().toISOString(),
      });

      broadcastToAll({ type: "task_queued", taskId, taskType: type });
      return taskId;
    } catch (error) {
      console.error("Task add error:", error.message);
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

    try {
      await pool.query(
        `UPDATE execution_tasks SET status = 'running' WHERE task_id = $1`,
        [task.id]
      );

      const blindSpots = await detectBlindSpots(task.description, {
        type: task.type,
      });

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
            "chatgpt"
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
    
    Tier0Council = tier0Module.Tier0Council;
    Tier1Council = tier1Module.Tier1Council;
    ModelRouter = routerModule.ModelRouter;
    OutreachAutomation = outreachModule.OutreachAutomation;
    WhiteLabelConfig = whiteLabelModule.WhiteLabelConfig;
    KnowledgeBase = knowledgeModule.KnowledgeBase;
    FileCleanupAnalyzer = cleanupModule.FileCleanupAnalyzer;

    tier0Council = new Tier0Council(pool);
    tier1Council = new Tier1Council(pool, callCouncilMember);
    modelRouter = new ModelRouter(tier0Council, tier1Council, pool);
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
        
        // IMMEDIATELY deploy all 5 drones to start generating income
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

  async recordRevenue(droneId, amount) {
    try {
      await pool.query(
        `UPDATE income_drones SET revenue_generated = revenue_generated + $1, tasks_completed = tasks_completed + 1, updated_at = now()
         WHERE drone_id = $2`,
        [amount, droneId]
      );

      const drone = this.activeDrones.get(droneId);
      if (drone) {
        drone.revenue += amount;
        drone.tasks++;
      }

      await updateROI(amount, 0, 0);
      broadcastToAll({ type: "revenue_generated", droneId, amount });
    } catch (error) {
      console.error(`Revenue update error: ${error.message}`);
    }
  }

  async getStatus() {
    try {
      const result = await pool.query(
        `SELECT drone_id, drone_type, status, revenue_generated, tasks_completed
         FROM income_drones WHERE status = 'active' ORDER BY deployed_at DESC`
      );
      return {
        active: result.rows.length,
        drones: result.rows,
        total_revenue: result.rows.reduce(
          (sum, d) => sum + parseFloat(d.revenue_generated || 0),
          0
        ),
      };
    } catch (error) {
      return { active: 0, drones: [], total_revenue: 0 };
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
    await incomeDroneSystem.recordRevenue(droneId, cleanAmount);
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
function requireKey(req, res, next) {
  if (isSameOrigin(req)) return next();

  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS_LIST.includes(origin)) return next();

  const key = req.query.key || req.headers["x-command-key"];
  if (key !== COMMAND_CENTER_KEY)
    return res.status(401).json({ error: "Unauthorized" });
  next();
}

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

app.get("/healthz", async (req, res) => {
  try {
    await pool.query("SELECT NOW()");
    const spend = await getDailySpend();
    const droneStatus = await incomeDroneSystem.getStatus();
    const taskStatus = executionQueue.getStatus();
    let rotationStatus = null;
    try {
      rotationStatus = await rotateAIsBasedOnPerformance();
    } catch (rotationError) {
      console.warn("⚠️ Health check: AI rotation check failed (non-critical):", rotationError.message);
    }

    res.json({
      ok: true,
      status: "healthy",
      version: "v26.1-no-claude",
      timestamp: new Date().toISOString(),
      database: "connected",
      websockets: activeConnections.size,
      daily_spend: spend,
      max_daily_spend: MAX_DAILY_SPEND,
      spend_percentage: ((spend / MAX_DAILY_SPEND) * 100).toFixed(1) + "%",
      roi: roiTracker,
      drones: droneStatus,
      tasks: taskStatus,
      deployment: "Railway + Neon + GitHub",
      system_metrics: systemMetrics,
      ai_rotation: rotationStatus,
      daily_ideas: dailyIdeas.length,
      blind_spots_detected: systemMetrics.blindSpotsDetected,
      snapshots_available: systemSnapshots.length,
      stripe_enabled: Boolean(STRIPE_SECRET_KEY),
      railway_url:
        RAILWAY_PUBLIC_DOMAIN || "robust-magic-production.up.railway.app",
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

  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
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

// Primary Council Chat Endpoint
app.post("/api/v1/chat", requireKey, async (req, res) => {
  try {
    let body = req.body;

    if (typeof body === "string") {
      body = { message: body };
    } else if (!body || typeof body !== "object") {
      body = {};
    }

    const { message, member = "chatgpt" } = body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message required" });
    }

    console.log(
      `🤖 [COUNCIL] ${member} processing: ${message.substring(0, 100)}...`
    );

    const blindSpots = await detectBlindSpots(message, {
      source: "user_chat",
    });

    const response = await callCouncilMember(member, message);
    const spend = await getDailySpend();

    // Convert to MICRO symbols for system (user sees English)
    const microSymbols = compressToMicroSimple(response);
    
    res.json({
      ok: true,
      response,
      symbols: microSymbols, // System sees this
      spend,
      member,
      blindSpotsDetected: blindSpots.length,
      timestamp: new Date().toISOString(),
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

    const response = await callCouncilWithFailover(prompt, "gemini");

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

    const prompt = `Command: ${command}\nIntent: ${intent}\nCompressed Query: ${JSON.stringify(
      query_json || {}
    )}\n\nExecute this command and provide results (but do not directly move money or impersonate users).`;

    const response = await callCouncilWithFailover(prompt, "chatgpt");

    if (intent && intent !== "general") {
      await executionQueue.addTask(intent, command);
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

// System metrics
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
    
    // Get tasks from database
    const dbTasks = await pool.query(
      `SELECT task_id, type, description, status, created_at, completed_at
       FROM execution_tasks
       WHERE status IN ('pending', 'running')
       ORDER BY created_at DESC
       LIMIT 50`
    );
    
    // Format for command center
    const projects = dbTasks.rows.map((task, index) => {
      const totalTasks = dbTasks.rows.length;
      const progress = task.status === 'running' ? 50 : (index / totalTasks) * 100;
      
      // Estimate ETA based on task type
      let eta = 'Calculating...';
      if (task.status === 'running') {
        eta = 'In progress...';
      } else {
        const minutes = Math.ceil((totalTasks - index) * 5); // ~5 min per task
        eta = `${minutes} minutes`;
      }
      
      return {
        id: task.task_id,
        title: task.description?.substring(0, 50) || task.type || 'Task',
        status: task.status || 'pending',
        progress: Math.round(progress),
        eta,
        priority: 'high',
        type: task.type,
        createdAt: task.created_at,
      };
    });

    res.json({ 
      ok: true, 
      tasks: projects,
      queueSize: queueStatus.queued || 0,
      active: queueStatus.active || 0,
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

    const codePrompt = `Based on this analysis: ${analysis}

Consider these blind spots: ${blindSpots.slice(0, 5).join(", ")}

Now write COMPLETE, WORKING code. ENSURE ALL CODE IS PURE JAVASCRIPT/NODE.JS AND CONTAINS NO TRIPLE BACKTICKS. Format each file like:
===FILE:path/to/file.js===
[complete code here]
===END===`;

    const codeResponse = await callCouncilWithFailover(codePrompt, "deepseek");

    const fileChanges = extractFileChanges(codeResponse);
    
    if (fileChanges.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "No file changes could be extracted from AI response. The AI may not have followed the required format (===FILE:path=== ... ===END===).",
        codeResponsePreview: codeResponse.substring(0, 500),
      });
    }

    const results = [];
    const filePathsToSnapshot = fileChanges.map(c => c.filePath);

    // Create snapshot with all files that will be modified
    const snapshotId = await createSystemSnapshot(
      `Before self-programming: ${instruction.substring(0, 50)}...`,
      filePathsToSnapshot
    );

    for (const change of fileChanges) {
      try {
        const sandboxResult = await sandboxTest(
          change.content,
          `Test: ${change.filePath}`
        );

        if (sandboxResult.success) {
          const result = await selfModificationEngine.modifyOwnCode(
            change.filePath,
            change.content,
            `Self-programming: ${instruction}`
          );
          results.push(result);
        } else {
          results.push({
            success: false,
            filePath: change.filePath,
            error: "Failed sandbox test",
            sandboxError: sandboxResult.error,
          });
        }
      } catch (error) {
        console.error(`Error processing change for ${change.filePath}:`, error.message);
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

function extractFileChanges(codeResponse) {
  const changes = [];
  if (!codeResponse || typeof codeResponse !== 'string') {
    console.warn("⚠️ extractFileChanges: Invalid codeResponse");
    return changes;
  }

  try {
    // Primary pattern: ===FILE:path/to/file.js=== ... ===END===
    const fileRegex = /===FILE:(.*?)===\n([\s\S]*?)===END===/g;
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

    console.log(`📝 Extracted ${changes.length} file change(s) from AI response`);
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

    await initDatabase();
    await loadROIFromDatabase();
    
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

    // Deploy income drones (IMMEDIATELY START WORKING)
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
    process.exit(1);
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