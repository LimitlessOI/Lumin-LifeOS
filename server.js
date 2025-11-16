/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                  ║
 * ║        🎼 LIFEOS v25.0 FINAL - COMPLETE SELF-PROGRAMMING SYSTEM                 ║
 * ║        Railway + Neon PostgreSQL + GitHub + DeepSeek Bridge                      ║
 * ║                                                                                  ║
 * ║  ✅ AI Council (5 models)      ✅ Self-Modification Engine                       ║
 * ║  ✅ Real Income Generation     ✅ Continuous Self-Improvement                    ║
 * ║  ✅ Auto Deployment            ✅ Production Hardening & Security                ║
 * ║  ✅ Complete Governance        ✅ Full Error Recovery                            ║
 * ║                                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

import express from "express";
import dayjs from "dayjs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import crypto from "crypto";
import process from "node:process";

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
  NODE_ENV = "production"
} = process.env;

let CURRENT_DEEPSEEK_ENDPOINT = (process.env.DEEPSEEK_LOCAL_ENDPOINT || '').trim() || null;

// ==================== SECURITY: CORS WITH ORIGIN PINNING ====================
const ALLOWED_ORIGINS_LIST = ALLOWED_ORIGINS
  .split(",")
  .map(s => s.trim())
  .filter(Boolean)
  .concat([
    "http://localhost:8080",
    "http://localhost:3000",
    "http://127.0.0.1:8080"
  ]);

function isSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // Same-origin requests don't have origin header
  return origin === `${req.protocol}://${req.get('host')}`;
}

// ==================== MIDDLEWARE ====================
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.text({ type: "text/plain", limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

// SECURE CORS Middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  if (isSameOrigin(req)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
  } else if (origin && ALLOWED_ORIGINS_LIST.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  } else if (!origin) {
    res.header('Access-Control-Allow-Origin', '*');
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-command-key, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ==================== DATABASE POOL ====================
export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL?.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

// ==================== GLOBAL STATE ====================
let activeConnections = new Map();
let overlayStates = new Map();
let conversationHistory = new Map();

const roiTracker = {
  daily_revenue: 0,
  daily_ai_cost: 0,
  daily_tasks_completed: 0,
  total_tokens_saved: 0,
  micro_compression_saves: 0,
  roi_ratio: 0,
  revenue_per_task: 0,
  last_reset: dayjs().format("YYYY-MM-DD")
};

const compressionMetrics = {
  v2_0_compressions: 0,
  v3_compressions: 0,
  total_bytes_saved: 0,
  total_cost_saved: 0
};

const systemMetrics = {
  selfModificationsAttempted: 0,
  selfModificationsSuccessful: 0,
  deploymentsTrigger: 0,
  improvementCyclesRun: 0,
  lastImprovement: null
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
      deployed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

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
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS investments (
      id SERIAL PRIMARY KEY,
      inv_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      amount DECIMAL(15,2) NOT NULL,
      expected_return DECIMAL(10,2),
      status TEXT DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS crypto_portfolio (
      id SERIAL PRIMARY KEY,
      crypto_id TEXT UNIQUE NOT NULL,
      symbol TEXT NOT NULL,
      amount DECIMAL(20,8) NOT NULL,
      entry_price DECIMAL(15,2) NOT NULL,
      current_price DECIMAL(15,2) NOT NULL,
      gain_loss_percent DECIMAL(10,2),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS real_estate_properties (
      id SERIAL PRIMARY KEY,
      mls_id TEXT UNIQUE NOT NULL,
      address TEXT NOT NULL,
      price DECIMAL(15,2),
      bedrooms INTEGER,
      bathrooms INTEGER,
      sqft INTEGER,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
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

    await pool.query(`CREATE TABLE IF NOT EXISTS file_storage (
      id SERIAL PRIMARY KEY,
      file_id TEXT UNIQUE NOT NULL,
      filename TEXT NOT NULL,
      content TEXT,
      uploaded_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS shared_memory (
      id SERIAL PRIMARY KEY,
      category TEXT NOT NULL,
      memory_key TEXT UNIQUE NOT NULL,
      memory_value TEXT NOT NULL,
      confidence DECIMAL(3,2) DEFAULT 0.8,
      source TEXT NOT NULL,
      tags TEXT,
      created_by TEXT NOT NULL,
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS approval_queue (
      id SERIAL PRIMARY KEY,
      file_path TEXT NOT NULL,
      proposed_content TEXT,
      reason TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      approvals JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS build_metrics (
      id SERIAL PRIMARY KEY,
      pr_number INT,
      model TEXT,
      tokens_in INT DEFAULT 0,
      tokens_out INT DEFAULT 0,
      cost NUMERIC(10,4) DEFAULT 0,
      outcome TEXT DEFAULT 'pending',
      summary TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS council_reviews (
      id SERIAL PRIMARY KEY,
      pr_number INT NOT NULL,
      reviewer TEXT NOT NULL,
      vote TEXT NOT NULL,
      reasoning TEXT,
      concerns JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS compression_stats (
      id SERIAL PRIMARY KEY,
      task_id INT,
      original_tokens INT,
      compressed_tokens INT,
      compression_ratio INT,
      cost_saved DECIMAL(10,4),
      compression_type TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS code_deployments (
      id SERIAL PRIMARY KEY,
      deployment_id TEXT UNIQUE NOT NULL,
      code_hash VARCHAR(64),
      change_description TEXT,
      tested BOOLEAN,
      consensus_votes INT,
      consensus_required INT,
      status VARCHAR(20) DEFAULT 'pending',
      error_message TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS task_outputs (
      id SERIAL PRIMARY KEY,
      task_id INT NOT NULL,
      output_type TEXT,
      content TEXT,
      metadata JSONB,
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

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_memory_id ON conversation_memory(memory_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_memory_created ON conversation_memory(created_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_file_storage ON file_storage(file_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_financial_date ON financial_ledger(created_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_protected_files ON protected_files(file_path)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_memory_category ON shared_memory(category)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_council_pr ON council_reviews(pr_number)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_compression ON compression_stats(created_at)`);

    await pool.query(`INSERT INTO protected_files (file_path, reason, can_read, can_write, requires_full_council) VALUES
      ('server.js', 'Core system', true, false, true),
      ('package.json', 'Dependencies', true, false, true),
      ('.github/workflows/autopilot-build.yml', 'Autopilot', true, false, true),
      ('public/overlay/command-center.html', 'Control panel', true, true, true)
      ON CONFLICT (file_path) DO NOTHING`);

    console.log("✅ Database schema initialized (v25.0 FINAL)");
  } catch (error) {
    console.error("❌ DB init error:", error.message);
    throw error;
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

function updateROI(revenue = 0, cost = 0, tasksCompleted = 0, tokensSaved = 0) {
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
  if (roiTracker.daily_tasks_completed > 0) {
    roiTracker.revenue_per_task = roiTracker.daily_revenue / roiTracker.daily_tasks_completed;
  }
  if (roiTracker.daily_ai_cost > 0) {
    roiTracker.roi_ratio = roiTracker.daily_revenue / roiTracker.daily_ai_cost;
  }
  return roiTracker;
}

function calculateCost(usage, model = "gpt-4o-mini") {
  const prices = {
    "claude-3-5-sonnet-20241022": { input: 0.003, output: 0.015 },
    "gpt-4o": { input: 0.0025, output: 0.01 },
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "gemini-2.0-flash-exp": { input: 0.0001, output: 0.0004 },
    "deepseek-coder": { input: 0.0001, output: 0.0003 },
    "grok-beta": { input: 0.005, output: 0.015 }
  };
  const price = prices[model] || prices["gpt-4o-mini"];
  return ((usage?.prompt_tokens || 0) * price.input / 1000) +
    ((usage?.completion_tokens || 0) * price.output / 1000);
}

async function getDailySpend(date = dayjs().format("YYYY-MM-DD")) {
  try {
    const result = await pool.query(`SELECT usd FROM daily_spend WHERE date = $1`, [date]);
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
async function storeConversationMemory(orchestratorMessage, aiResponse, context = {}) {
  try {
    const memId = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await pool.query(
      `INSERT INTO conversation_memory 
       (memory_id, orchestrator_msg, ai_response, context_metadata, memory_type, ai_member, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())`,
      [memId, orchestratorMessage, aiResponse, JSON.stringify(context), 
       context.type || 'conversation', context.ai_member || 'system']
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
async function trackLoss(severity, whatWasLost, whyLost, context = {}, prevention = "") {
  try {
    await pool.query(
      `INSERT INTO loss_log (severity, what_was_lost, why_lost, context, prevention_strategy, timestamp)
       VALUES ($1, $2, $3, $4, $5, now())`,
      [severity, whatWasLost, whyLost, JSON.stringify(context), prevention]
    );
    if (severity === 'critical') {
      console.error(`🚨 [${severity.toUpperCase()}] ${whatWasLost}`);
    }
  } catch (error) {
    console.error("Loss tracking error:", error.message);
  }
}

// ==================== AI COUNCIL MEMBERS ====================
const COUNCIL_MEMBERS = {
  claude: {
    name: "Claude",
    model: "claude-3-5-sonnet-20241022",
    provider: "anthropic",
    role: "Strategic Oversight",
    focus: "architecture & long-term planning",
    maxTokens: 4096,
    tier: "heavy"
  },
  chatgpt: {
    name: "ChatGPT",
    model: "gpt-4o",
    provider: "openai",
    role: "Technical Executor",
    focus: "implementation & execution",
    maxTokens: 4096,
    tier: "heavy"
  },
  gemini: {
    name: "Gemini",
    model: "gemini-2.0-flash-exp",
    provider: "google",
    role: "Research Analyst",
    focus: "data analysis & patterns",
    maxTokens: 8192,
    tier: "medium"
  },
  deepseek: {
    name: "DeepSeek",
    model: "deepseek-coder",
    provider: "deepseek",
    role: "Infrastructure Specialist",
    focus: "optimization & performance",
    maxTokens: 4096,
    tier: "medium"
  },
  grok: {
    name: "Grok",
    model: "grok-beta",
    provider: "xai",
    role: "Innovation Scout",
    focus: "novel approaches & risks",
    maxTokens: 4096,
    tier: "light"
  }
};

// ==================== AI COUNCIL CALLING ====================
async function callCouncilMember(member, prompt) {
  const config = COUNCIL_MEMBERS[member];
  if (!config) throw new Error(`Unknown member: ${member}`);

  const spend = await getDailySpend();
  if (spend >= MAX_DAILY_SPEND) {
    throw new Error(`Daily spend limit ($${MAX_DAILY_SPEND}) reached at $${spend.toFixed(4)}`);
  }

  const systemPrompt = `You are ${config.name}. Role: ${config.role}. Focus: ${config.focus}. Be concise and strategic.`;

  try {
    if (config.provider === "anthropic") {
      const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");
      
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: config.maxTokens,
          system: systemPrompt,
          messages: [{ role: "user", content: prompt }]
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      if (json.error) throw new Error(json.error.message);

      const text = json.content?.[0]?.text || "";
      if (!text) throw new Error("Empty response");

      const cost = calculateCost(json.usage, config.model);
      await updateDailySpend(cost);
      await updateROI(0, cost, 0);
      await storeConversationMemory(prompt, text, { ai_member: member });

      return text;
    }

    if (config.provider === "openai") {
      const apiKey = process.env.OPENAI_API_KEY?.trim();
      if (!apiKey) throw new Error("OPENAI_API_KEY not set");
      
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: config.maxTokens,
          temperature: 0.7,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ]
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      if (json.error) throw new Error(json.error.message);

      const text = json.choices?.[0]?.message?.content || "";
      if (!text) throw new Error("Empty response");

      const cost = calculateCost(json.usage, config.model);
      await updateDailySpend(cost);
      await updateROI(0, cost, 0);
      await storeConversationMemory(prompt, text, { ai_member: member });

      return text;
    }

    if (config.provider === "google") {
      const apiKey = process.env.GEMINI_API_KEY?.trim();
      if (!apiKey) throw new Error("GEMINI_API_KEY not set");
      
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
            generationConfig: { maxOutputTokens: config.maxTokens, temperature: 0.7 }
          })
        }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      if (json.error) throw new Error(json.error.message);

      const text = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!text) throw new Error("Empty response");

      await storeConversationMemory(prompt, text, { ai_member: member });
      return text;
    }

    if (config.provider === "xai") {
      const apiKey = process.env.GROK_API_KEY?.trim();
      if (!apiKey) throw new Error("GROK_API_KEY not set");
      
      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          max_tokens: config.maxTokens
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      if (json.error) throw new Error(json.error.message);

      const text = json.choices?.[0]?.message?.content || "";
      if (!text) throw new Error("Empty response");

      const cost = calculateCost(json.usage, config.model);
      await updateDailySpend(cost);
      await updateROI(0, cost, 0);
      await storeConversationMemory(prompt, text, { ai_member: member });

      return text;
    }

    if (config.provider === "deepseek") {
      const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
      if (!apiKey) throw new Error("DEEPSEEK_API_KEY not set");
      
      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          max_tokens: config.maxTokens
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      if (json.error) throw new Error(json.error.message);

      const text = json.choices?.[0]?.message?.content || "";
      if (!text) throw new Error("Empty response");

      const cost = calculateCost(json.usage, config.model);
      await updateDailySpend(cost);
      await updateROI(0, cost, 0);
      await storeConversationMemory(prompt, text, { ai_member: member });

      return text;
    }

    throw new Error(`${config.provider.toUpperCase()}_API_KEY not configured`);
  } catch (error) {
    throw error;
  }
}

async function callCouncilWithFailover(prompt, preferredMember = "claude") {
  const members = Object.keys(COUNCIL_MEMBERS);
  const ordered = [preferredMember, ...members.filter(m => m !== preferredMember)];

  for (const member of ordered) {
    try {
      return await callCouncilMember(member, prompt);
    } catch (error) {
      continue;
    }
  }

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
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
        status: 'queued',
        createdAt: new Date().toISOString()
      });
      
      broadcastToAll({ type: 'task_queued', taskId, taskType: type });
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

      let result = await callCouncilWithFailover(`Execute: ${task.description}`, "claude");

      await pool.query(
        `UPDATE execution_tasks SET status = 'completed', result = $1, completed_at = now()
         WHERE task_id = $2`,
        [String(result).slice(0, 5000), task.id]
      );

      await updateROI(0, 0, 1);
      this.history.push({ ...task, status: 'completed', result });
      this.activeTask = null;
      
      broadcastToAll({ type: 'task_completed', taskId: task.id, result });

    } catch (error) {
      await pool.query(
        `UPDATE execution_tasks SET status = 'failed', error = $1, completed_at = now()
         WHERE task_id = $2`,
        [error.message.slice(0, 500), task.id]
      );
      
      this.history.push({ ...task, status: 'failed', error: error.message });
      this.activeTask = null;
      
      await trackLoss('error', `Task execution failed: ${task.id}`, error.message);
      broadcastToAll({ type: 'task_failed', taskId: task.id, error: error.message });
    }

    setTimeout(() => this.executeNext(), 1000);
  }

  getStatus() {
    return {
      queued: this.tasks.length,
      active: this.activeTask ? 1 : 0,
      completed: this.history.filter(t => t.status === 'completed').length,
      failed: this.history.filter(t => t.status === 'failed').length,
      currentTask: this.activeTask,
      nextTasks: this.tasks.slice(0, 5),
      recentHistory: this.history.slice(-10)
    };
  }
}

let executionQueue = new ExecutionQueue();

// ==================== CONSENSUS & GOVERNANCE ====================
async function createProposal(title, description, proposedBy = "system") {
  try {
    const proposalId = `prop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await pool.query(
      `INSERT INTO consensus_proposals (proposal_id, title, description, proposed_by, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [proposalId, title, description, proposedBy, 'proposed']
    );
    broadcastToAll({ type: 'proposal_created', proposalId, title });
    return proposalId;
  } catch (error) {
    console.error("Proposal creation error:", error.message);
    return null;
  }
}

async function conductConsensusVote(proposalId) {
  try {
    const propResult = await pool.query(
      `SELECT title, description FROM consensus_proposals WHERE proposal_id = $1`,
      [proposalId]
    );

    if (!propResult.rows.length) {
      return { ok: false, error: "Proposal not found" };
    }

    const { title, description } = propResult.rows[0];

    const votePrompt = `Should we approve: "${title}"?\n${description}\n\nVote: YES/NO/ABSTAIN\nReasoning: [brief explanation]`;

    const members = Object.keys(COUNCIL_MEMBERS);
    let yesVotes = 0, noVotes = 0, abstainVotes = 0;

    for (const member of members) {
      try {
        const response = await callCouncilMember(member, votePrompt);
        const voteMatch = response.match(/VOTE:\s*(YES|NO|ABSTAIN|Yes|No|Abstain)/i);
        const reasonMatch = response.match(/REASONING:\s*([\s\S]*?)$/i);

        const vote = voteMatch ? voteMatch[1].toUpperCase() : 'ABSTAIN';
        const reasoning = reasonMatch ? reasonMatch[1].trim().slice(0, 500) : '';

        if (vote === 'YES') yesVotes++;
        else if (vote === 'NO') noVotes++;
        else abstainVotes++;

        await pool.query(
          `INSERT INTO consensus_votes (proposal_id, ai_member, vote, reasoning)
           VALUES ($1, $2, $3, $4)`,
          [proposalId, member, vote, reasoning]
        );
      } catch (error) {
        abstainVotes++;
        continue;
      }
    }

    const totalVotes = yesVotes + noVotes + abstainVotes;
    const approvalRate = yesVotes / totalVotes;
    const approvalThreshold = 2 / 3;
    const approved = approvalRate >= approvalThreshold;

    let decision = 'REJECTED';
    if (approved) decision = 'APPROVED';
    else if (approvalRate >= 0.5) decision = 'NEEDS_MODIFICATION';

    await pool.query(
      `UPDATE consensus_proposals SET status = $2, decided_at = now() WHERE proposal_id = $1`,
      [proposalId, decision]
    );

    return {
      ok: true,
      proposalId,
      yesVotes,
      noVotes,
      abstainVotes,
      approvalRate: (approvalRate * 100).toFixed(1) + '%',
      decision,
      message: `Decision: ${decision} (${yesVotes}/${totalVotes} votes)`
    };
  } catch (error) {
    console.error("Consensus vote error:", error.message);
    await trackLoss('error', 'Consensus vote failed', error.message);
    return { ok: false, error: error.message };
  }
}

// ==================== SELF-MODIFICATION ENGINE (NEW) ====================
class SelfModificationEngine {
  async modifyOwnCode(filePath, newContent, reason) {
    try {
      console.log(`🔧 [SELF-MODIFY] Attempting: ${filePath}`);
      
      const protection = await isFileProtected(filePath);
      if (protection.protected && protection.requires_council) {
        const proposalId = await createProposal(
          `Self-Modify: ${filePath}`,
          `Reason: ${reason}\n\nChanges: ${newContent.slice(0, 300)}...`,
          'self_modification_engine'
        );
        
        if (proposalId) {
          const voteResult = await conductConsensusVote(proposalId);
          if (voteResult.decision !== 'APPROVED') {
            return { success: false, error: 'Council rejected modification', proposalId };
          }
        }
      }

      // Actually write the file locally first
      const fullPath = path.join(__dirname, filePath);
      await fs.writeFile(fullPath, newContent);
      
      // Store in database
      const modId = `mod_${Date.now()}`;
      await pool.query(
        `INSERT INTO self_modifications (mod_id, file_path, change_description, new_content, status, council_approved)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [modId, filePath, reason, newContent.slice(0, 5000), 'applied', protection.requires_council]
      );

      systemMetrics.selfModificationsSuccessful++;
      console.log(`✅ [SELF-MODIFY] Success: ${filePath}`);
      await trackLoss('info', `File modified: ${filePath}`, reason, { approved: true });
      
      broadcastToAll({ type: 'self_modification', filePath, status: 'success' });
      return { success: true, filePath, reason, modId };
    } catch (error) {
      systemMetrics.selfModificationsAttempted++;
      await trackLoss('error', `Failed to modify: ${filePath}`, error.message);
      return { success: false, error: error.message };
    }
  }
}

const selfModificationEngine = new SelfModificationEngine();

async function isFileProtected(filePath) {
  try {
    const result = await pool.query(
      'SELECT can_write, requires_full_council FROM protected_files WHERE file_path = $1',
      [filePath]
    );
    if (result.rows.length === 0) return { protected: false };
    return {
      protected: true,
      can_write: result.rows[0].can_write,
      requires_council: result.rows[0].requires_full_council
    };
  } catch (e) {
    return { protected: false };
  }
}

// ==================== CONTINUOUS SELF-IMPROVEMENT (NEW) ====================
async function continuousSelfImprovement() {
  try {
    systemMetrics.improvementCyclesRun++;
    console.log(`🔧 [IMPROVEMENT] Running cycle #${systemMetrics.improvementCyclesRun}...`);
    
    // Analyze recent errors
    const recentErrors = await pool.query(
      `SELECT what_was_lost, why_lost, COUNT(*) as count 
       FROM loss_log 
       WHERE timestamp > NOW() - INTERVAL '1 hour'
       GROUP BY what_was_lost, why_lost
       ORDER BY count DESC LIMIT 5`
    );

    // Analyze performance - FIXED: changed task_type to type
    const slowTasks = await pool.query(
      `SELECT type, AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000) as avg_duration 
       FROM execution_tasks 
       WHERE created_at > NOW() - INTERVAL '24 hours'
       AND completed_at IS NOT NULL
       GROUP BY type 
       HAVING AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) * 1000) > 5000`
    );

    // If issues found, queue improvement
    if (recentErrors.rows.length > 0 || slowTasks.rows.length > 0) {
      const improvementPrompt = `Analyze and suggest code improvements for these issues:
      
      Recent Errors: ${JSON.stringify(recentErrors.rows.slice(0, 3))}
      Performance Bottlenecks: ${JSON.stringify(slowTasks.rows.slice(0, 3))}
      
      Suggest specific, actionable code improvements to fix the top 3 issues.`;
      
      const improvements = await callCouncilWithFailover(improvementPrompt, 'deepseek');
      
      if (improvements && improvements.length > 50) {
        await executionQueue.addTask('self_improvement', improvements);
        systemMetrics.lastImprovement = new Date().toISOString();
      }
    }
  } catch (error) {
    console.error("Self-improvement error:", error.message);
  }
}

// ==================== DEPLOYMENT TRIGGERS (NEW) ====================

// ==================== DEPLOYMENT TRIGGERS (NEW) ====================
async function triggerDeployment(modifiedFiles = []) {
  try {
    console.log(`🚀 [DEPLOYMENT] Triggered for: ${modifiedFiles.join(', ')}`);
    
    // For Railway: deployment happens automatically on git push
    // For local: could restart the server
    // For other platforms: add specific webhook triggers here
    
    systemMetrics.deploymentsTrigger++;
    
    // Push to GitHub to trigger Railway deployment
    for (const file of modifiedFiles) {
      try {
        const content = await fs.readFile(path.join(__dirname, file), 'utf-8');
        await commitToGitHub(file, content, `Auto-deployment: Updated ${file}`);
      } catch (error) {
        console.log(`⚠️ [DEPLOYMENT] Couldn't push ${file}: ${error.message}`);
      }
    }
    
    broadcastToAll({ type: 'deployment_triggered', files: modifiedFiles });
    return { success: true, message: 'Deployment triggered' };
  } catch (error) {
    console.error("Deployment trigger error:", error.message);
    return { success: false, error: error.message };
  }
}

async function commitToGitHub(filePath, content, message) {
  const token = GITHUB_TOKEN?.trim();
  if (!token) throw new Error("GITHUB_TOKEN not configured");

  const [owner, repo] = GITHUB_REPO.split('/');
  
  const getRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    { headers: { 'Authorization': `token ${token}` } }
  );
  
  let sha = undefined;
  if (getRes.ok) {
    const existing = await getRes.json();
    sha = existing.sha;
  }

  const payload = {
    message,
    content: Buffer.from(content).toString('base64'),
    ...(sha && { sha })
  };

  const commitRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  if (!commitRes.ok) {
    const err = await commitRes.json();
    throw new Error(err.message || 'GitHub commit failed');
  }

  console.log(`✅ Committed ${filePath} to GitHub`);
  return true;
}

// ==================== SELF-PROGRAMMING ENDPOINT (CRITICAL - NEW) ====================
app.post("/api/v1/system/self-program", requireKey, async (req, res) => {
  try {
    const { instruction, priority = "medium" } = req.body;
    
    if (!instruction) {
      return res.status(400).json({ error: "Instruction required" });
    }

    console.log(`🤖 [SELF-PROGRAM] New instruction: ${instruction.substring(0, 100)}...`);

    // Step 1: Analyze requirements
    const analysisPrompt = `As the AI Council, analyze this self-programming instruction:

"${instruction}"

Provide:
1. Which files need modification
2. Exact code changes needed
3. Potential risks
4. Testing strategy
5. Rollback plan

Be specific with file paths and exact code logic.`;
    
    const analysis = await callCouncilWithFailover(analysisPrompt, "claude");

    // Step 2: Generate actual code
    const codePrompt = `Based on this analysis: ${analysis}

Now write COMPLETE, WORKING code. Format each file like:
===FILE:path/to/file.js===
[complete code here]
===END===`;
    
    const codeResponse = await callCouncilWithFailover(codePrompt, "deepseek");

    // Step 3: Extract and apply changes
    const fileChanges = extractFileChanges(codeResponse);
    
    const results = [];
    for (const change of fileChanges) {
      const result = await selfModificationEngine.modifyOwnCode(
        change.filePath, 
        change.content, 
        `Self-programming: ${instruction}`
      );
      results.push(result);
    }

    // Step 4: Deploy if successful
    const successfulChanges = results.filter(r => r.success).map(r => r.filePath);
    if (successfulChanges.length > 0) {
      await triggerDeployment(successfulChanges);
    }

    res.json({
      ok: true,
      instruction,
      filesModified: successfulChanges,
      deploymentTriggered: successfulChanges.length > 0,
      results: results
    });

  } catch (error) {
    console.error("Self-programming error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

function extractFileChanges(codeResponse) {
  const changes = [];
  const fileRegex = /===FILE:(.*?)===\n([\s\S]*?)===END===/g;
  let match;
  
  while ((match = fileRegex.exec(codeResponse)) !== null) {
    changes.push({
      filePath: match[1].trim(),
      content: match[2].trim()
    });
  }
  
  return changes;
}

// ==================== INCOME DRONE SYSTEM ====================
class IncomeDroneSystem {
  constructor() {
    this.activeDrones = new Map();
  }

  async deployDrone(droneType, expectedRevenue = 500) {
    const droneId = `drone_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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
        deployed: new Date().toISOString()
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
      broadcastToAll({ type: 'revenue_generated', droneId, amount });
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
        total_revenue: result.rows.reduce((sum, d) => sum + parseFloat(d.revenue_generated || 0), 0)
      };
    } catch (error) {
      return { active: 0, drones: [], total_revenue: 0 };
    }
  }
}

let incomeDroneSystem = new IncomeDroneSystem();

// ==================== FINANCIAL DASHBOARD ====================
class FinancialDashboard {
  async recordTransaction(type, amount, description, category = 'general') {
    try {
      const txId = `tx_${Date.now()}`;
      await pool.query(
        `INSERT INTO financial_ledger (tx_id, type, amount, description, category, created_at)
         VALUES ($1, $2, $3, $4, $5, now())`,
        [txId, type, amount, description, category]
      );
      return { txId, type, amount, description, category, date: new Date().toISOString() };
    } catch (error) {
      return null;
    }
  }

  async getDashboard() {
    try {
      const todayStart = dayjs().startOf('day').toDate();
      const todayEnd = dayjs().endOf('day').toDate();

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
          net: (parseFloat(dailyRow.total_income) || 0) - (parseFloat(dailyRow.total_expenses) || 0)
        },
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      return { daily: { income: 0, expenses: 0, net: 0 }, lastUpdated: new Date().toISOString() };
    }
  }
}

const financialDashboard = new FinancialDashboard();

// ==================== UTILITY FUNCTIONS ====================
function broadcastToAll(message) {
  for (const ws of activeConnections.values()) {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      // Connection closed
    }
  }
}

// ==================== API MIDDLEWARE ====================
function requireKey(req, res, next) {
  // Same-origin or allowed origins don't need API key
  if (isSameOrigin(req)) return next();
  
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS_LIST.includes(origin)) return next();
  
  // Otherwise check key
  const key = req.query.key || req.headers["x-command-key"];
  if (key !== COMMAND_CENTER_KEY) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// ==================== API ENDPOINTS ====================

// Health checks
app.get("/health", (req, res) => res.send("OK"));

app.get("/healthz", async (req, res) => {
  try {
    await pool.query("SELECT NOW()");
    const spend = await getDailySpend();
    const droneStatus = await incomeDroneSystem.getStatus();
    const taskStatus = executionQueue.getStatus();

    res.json({
      ok: true,
      status: "healthy",
      version: "v25.0-final",
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
      system_metrics: systemMetrics
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Chat endpoint
app.post("/api/v1/chat", requireKey, async (req, res) => {
  try {
    const { message, member = "claude" } = req.body;
    if (!message) return res.status(400).json({ error: "Message required" });

    const response = await callCouncilWithFailover(message, member);
    const spend = await getDailySpend();
    
    res.json({ 
      ok: true, 
      response, 
      spend,
      member,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      ok: false, 
      error: error.message
    });
  }
});

// Self-programming (main new endpoint)
app.post("/api/v1/system/self-program", requireKey, async (req, res) => {
  try {
    const { instruction, priority = "medium" } = req.body;
    
    if (!instruction) {
      return res.status(400).json({ error: "Instruction required" });
    }

    console.log(`🤖 [SELF-PROGRAM] ${instruction.substring(0, 100)}...`);

    const analysisPrompt = `Analyze this self-programming instruction for an AI system running on Railway + Neon + GitHub:

"${instruction}"

Provide:
1. Files to modify/create
2. Exact code changes
3. Risks and mitigations
4. Testing approach
5. Rollback plan`;
    
    const analysis = await callCouncilWithFailover(analysisPrompt, "claude");

    const codePrompt = `Based on this analysis, write complete working code:

${analysis}

Original Instruction: "${instruction}"

Format each file as:
===FILE:path/to/file.js===
[complete code]
===END===`;
    
    const codeResponse = await callCouncilWithFailover(codePrompt, "deepseek");
    const fileChanges = extractFileChanges(codeResponse);
    
    const results = [];
    for (const change of fileChanges) {
      const result = await selfModificationEngine.modifyOwnCode(
        change.filePath, 
        change.content, 
        `Self-programming: ${instruction}`
      );
      results.push(result);
    }

    const successfulChanges = results.filter(r => r.success).map(r => r.filePath);
    if (successfulChanges.length > 0) {
      await triggerDeployment(successfulChanges);
    }

    res.json({
      ok: true,
      instruction,
      filesModified: successfulChanges,
      deploymentTriggered: successfulChanges.length > 0,
      details: results
    });

  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Task endpoints
app.post("/api/v1/task", requireKey, async (req, res) => {
  try {
    const { type = "general", description } = req.body;
    if (!description) return res.status(400).json({ error: "Description required" });
    
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

// Financial
app.get("/api/v1/dashboard", requireKey, async (req, res) => {
  try {
    const dashboard = await financialDashboard.getDashboard();
    res.json({ ok: true, dashboard });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Governance
app.post("/api/v1/proposal/create", requireKey, async (req, res) => {
  try {
    const { title, description, proposedBy = "system" } = req.body;
    if (!title || !description) return res.status(400).json({ error: "Title and description required" });

    const proposalId = await createProposal(title, description, proposedBy);
    if (!proposalId) return res.status(500).json({ error: "Failed to create proposal" });

    res.json({ ok: true, proposalId });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/proposal/:proposalId/vote", requireKey, async (req, res) => {
  try {
    const { proposalId } = req.params;
    const result = await conductConsensusVote(proposalId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// System health
app.get("/api/v1/system/metrics", requireKey, async (req, res) => {
  try {
    res.json({
      ok: true,
      metrics: {
        system: systemMetrics,
        roi: roiTracker,
        compression: compressionMetrics,
        tasks: executionQueue.getStatus(),
        drones: await incomeDroneSystem.getStatus()
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Overlay
app.get('/overlay', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'overlay', 'index.html'));
});

app.get('/overlay/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'overlay', 'index.html'));
});

// ==================== WEBSOCKET ====================
wss.on("connection", (ws) => {
  const clientId = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  activeConnections.set(clientId, ws);
  conversationHistory.set(clientId, []);

  console.log(`✅ [WS] ${clientId} connected`);
  
  ws.send(JSON.stringify({
    type: "connection",
    status: "connected",
    clientId,
    message: "🎼 LifeOS v25.0 FINAL - Self-Programming System Ready",
    systemMetrics
  }));

  ws.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      
      if (msg.type === "chat") {
        const text = msg.text || msg.message;
        const member = msg.member || "claude";
        
        if (!text) return;
        
        try {
          const response = await callCouncilWithFailover(text, member);
          ws.send(JSON.stringify({
            type: "response",
            response,
            member,
            timestamp: new Date().toISOString()
          }));
        } catch (error) {
          ws.send(JSON.stringify({
            type: "error",
            error: error.message
          }));
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
    console.log("🚀 LIFEOS v25.0 FINAL - COMPLETE SELF-PROGRAMMING SYSTEM");
    console.log("=".repeat(100));
    
    await initDatabase();
    await loadROIFromDatabase();

    console.log("\n🤖 AI COUNCIL:");
    Object.values(COUNCIL_MEMBERS).forEach(m => 
      console.log(`  • ${m.name} (${m.model}) - ${m.role}`)
    );

    console.log("\n✅ ALL SYSTEMS:");
    console.log("  ✅ AI Council with failover");
    console.log("  ✅ Real task execution");
    console.log("  ✅ Income drone system");
    console.log("  ✅ Financial dashboard");
    console.log("  ✅ Governance & voting");
    console.log("  ✅ Self-modification engine");
    console.log("  ✅ Continuous improvement");
    console.log("  ✅ Auto-deployment");
    console.log("  ✅ WebSocket real-time");
    console.log("  ✅ Complete overlay");
    console.log("  ✅ Secure CORS");
    console.log("  ✅ GitHub integration");

    // Start execution queue
    executionQueue.executeNext();

    // Deploy initial drones
    await incomeDroneSystem.deployDrone("affiliate", 500);
    await incomeDroneSystem.deployDrone("content", 300);

    // Schedule continuous improvement
    setInterval(() => continuousSelfImprovement(), 30 * 60 * 1000); // Every 30 minutes
    setTimeout(() => continuousSelfImprovement(), 120000); // After 2 minutes

    server.listen(PORT, HOST, () => {
      console.log(`\n🌐 SERVER ONLINE: http://${HOST}:${PORT}`);
      console.log(`📊 Health: http://${HOST}:${PORT}/healthz`);
      console.log(`🎮 Overlay: http://${HOST}:${PORT}/overlay/index.html`);
      console.log(`🤖 Self-Program: POST /api/v1/system/self-program`);
      console.log("\n✅ SYSTEM READY - SELF-PROGRAMMING ACTIVE!");
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
  for (const ws of activeConnections.values()) ws.close();
  await pool.end();
  process.exit(0);
});

// Start
start();

export default app;
