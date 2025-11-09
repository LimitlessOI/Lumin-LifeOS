/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                     🎼 SERVER.JS v21.0 - COMPLETE PRODUCTION                    ║
 * ║         2400+ LINES • ALL SYSTEMS • FRESH RAILWAY READS • OVERLAY READY          ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

import express from "express";
import dayjs from "dayjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { Pool } from "pg";
import { WebSocketServer } from "ws";
import { createServer } from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });


// ==================================================================================
// SECTION: ENVIRONMENT & FRESH RAILWAY VARIABLE READERS
// ==================================================================================

const getEnvConfig = () => ({
  DATABASE_URL: process.env.DATABASE_URL,
  COMMAND_CENTER_KEY: process.env.COMMAND_CENTER_KEY || "MySecretKey2025LifeOS",
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  GITHUB_REPO: process.env.GITHUB_REPO || "LimitlessOI/Lumin-LifeOS",
  DEEPSEEK_LOCAL_ENDPOINT: process.env.DEEPSEEK_LOCAL_ENDPOINT,
  DEEPSEEK_BRIDGE_ENABLED: process.env.DEEPSEEK_BRIDGE_ENABLED === "true",
  HOST: process.env.HOST || "0.0.0.0",
  PORT: parseInt(process.env.PORT || "8080"),
  MAX_DAILY_SPEND: parseFloat(process.env.MAX_DAILY_SPEND || "50.0"),
  AI_TIER: process.env.AI_TIER || "medium"
});

const getApiKeys = () => ({
  openai: (process.env.OPENAI_API_KEY || '').trim(),
  anthropic: (process.env.ANTHROPIC_API_KEY || '').trim(),
  gemini: (process.env.GEMINI_API_KEY || '').trim(),
  grok: (process.env.GROK_API_KEY || '').trim(),
  deepseek: (process.env.DEEPSEEK_API_KEY || '').trim()
});

let CURRENT_DEEPSEEK_ENDPOINT = (process.env.DEEPSEEK_LOCAL_ENDPOINT || '').trim() || null;
const CONFIG = getEnvConfig();

const roiTracker = {
  daily_revenue: 0,
  daily_ai_cost: 0,
  daily_tasks_completed: 0,
  total_tokens_saved: 0,
  roi_ratio: 0,
  last_reset: dayjs().format("YYYY-MM-DD")
};

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const SPEND_FILE = path.join(DATA_DIR, "spend.json");

function validateEnvironment() {
  const required = ["DATABASE_URL"];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error("❌ MISSING ENV:", missing);
    return false;
  }
  
  const keys = getApiKeys();
  console.log("🔑 API Key Status:");
  console.log(`  • OpenAI: ${keys.openai ? '✅ (' + keys.openai.length + ' chars)' : '❌'}`);
  console.log(`  • Anthropic: ${keys.anthropic ? '✅ (' + keys.anthropic.length + ' chars)' : '❌'}`);
  console.log(`  • Gemini: ${keys.gemini ? '✅ (' + keys.gemini.length + ' chars)' : '❌'}`);
  console.log(`  • Grok: ${keys.grok ? '✅ (' + keys.grok.length + ' chars)' : '❌'}`);
  console.log(`  • DeepSeek: ${keys.deepseek ? '✅ (' + keys.deepseek.length + ' chars)' : '❌'}`);
  return true;
}

// ==================================================================================
// SECTION: DATABASE INITIALIZATION
// ==================================================================================

export const pool = new Pool({
  connectionString: CONFIG.DATABASE_URL,
  ssl: CONFIG.DATABASE_URL?.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

async function initDb() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS conversation_memory (
      id SERIAL PRIMARY KEY,
      memory_id TEXT UNIQUE NOT NULL,
      orchestrator_msg TEXT NOT NULL,
      ai_response TEXT NOT NULL,
      key_facts JSONB,
      context_metadata JSONB,
      memory_type TEXT DEFAULT 'conversation',
      created_at TIMESTAMPTZ DEFAULT NOW()
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

    await pool.query(`CREATE TABLE IF NOT EXISTS file_storage (
      id SERIAL PRIMARY KEY,
      file_id TEXT UNIQUE NOT NULL,
      filename TEXT NOT NULL,
      content TEXT,
      uploaded_by TEXT,
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

    await pool.query(`CREATE TABLE IF NOT EXISTS calls (
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
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS build_metrics (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      pr_number INT,
      model TEXT,
      tokens_in INT DEFAULT 0,
      tokens_out INT DEFAULT 0,
      cost NUMERIC(10,4) DEFAULT 0,
      outcome TEXT DEFAULT 'pending',
      summary TEXT
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

    await pool.query(`CREATE TABLE IF NOT EXISTS task_outputs (
      id SERIAL PRIMARY KEY,
      task_id INT NOT NULL,
      output_type TEXT,
      content TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS compression_stats (
      id SERIAL PRIMARY KEY,
      task_id INT,
      original_tokens INT,
      compressed_tokens INT,
      compression_ratio INT,
      cost_saved NUMERIC(10,4),
      compression_type TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS approval_queue (
      id SERIAL PRIMARY KEY,
      file_path TEXT NOT NULL,
      proposed_content TEXT,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      approvals JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS session_dicts (
      id SERIAL PRIMARY KEY,
      category VARCHAR(50),
      custom_key VARCHAR(255),
      dict_id SMALLINT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(category, custom_key)
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_memory_id ON conversation_memory(memory_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_memory_created ON conversation_memory(created_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_file_storage ON file_storage(file_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_financial_date ON financial_ledger(created_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_protected_files ON protected_files(file_path)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_memory_category ON shared_memory(category)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_council_pr ON council_reviews(pr_number)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_compression ON compression_stats(created_at)`);

    await pool.query(`
      INSERT INTO protected_files (file_path, reason, can_read, can_write, requires_full_council) VALUES
      ('server.js', 'Core system', true, false, true),
      ('package.json', 'Dependencies', true, false, true),
      ('.github/workflows/autopilot-build.yml', 'Autopilot', true, false, true),
      ('public/overlay/command-center.html', 'Control panel', true, true, true)
      ON CONFLICT (file_path) DO NOTHING
    `);

    console.log("✅ Database schema initialized");
  } catch (error) {
    console.error("❌ DB init error:", error.message);
    throw error;
  }
}

// ==================================================================================
// SECTION: WEBSOCKET & BROADCAST
// ==================================================================================

const activeConnections = new Map();
const conversationHistory = new Map();

function broadcastToOrchestrator(message) {
  const broadcastData = JSON.stringify(message);
  for (const [, ws] of activeConnections.entries()) {
    if (ws && ws.readyState === 1) ws.send(broadcastData);
  }
}

// ==================================================================================
// SECTION: 3-LAYER MEMORY SYSTEM
// ==================================================================================

async function storeConversationMemory(orchestratorMessage, aiResponse, context = {}) {
  try {
    const memId = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const keyFacts = extractKeyFacts(orchestratorMessage, aiResponse);
    await pool.query(
      `INSERT INTO conversation_memory (memory_id, orchestrator_msg, ai_response, key_facts, context_metadata, memory_type, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())`,
      [memId, orchestratorMessage, aiResponse, JSON.stringify(keyFacts), JSON.stringify(context), context.type || 'conversation']
    );
    console.log(`✅ Memory: ${memId}`);
    return { memId, keyFacts };
  } catch (error) {
    console.error("❌ Memory store error:", error.message);
    return null;
  }
}

function extractKeyFacts(message, response) {
  const facts = [];
  const patterns = [
    { name: 'action', regex: /(?:we|i|you|team)\s+(?:need to|should|will|must)\s+([^.!?\n]{10,150})/gi },
    { name: 'priority', regex: /(?:priority|urgent|critical):\s*([^.!?\n]{10,150})/gi },
    { name: 'decision', regex: /(?:decision|decided):\s*([^.!?\n]{10,150})/gi },
    { name: 'problem', regex: /(?:problem|issue|bug):\s*([^.!?\n]{10,150})/gi },
    { name: 'solution', regex: /(?:solution|fix):\s*([^.!?\n]{10,150})/gi }
  ];
  [message, response].forEach((text, idx) => {
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        if (match[1]) facts.push({
          type: pattern.name,
          text: match[1].trim(),
          source: idx === 0 ? 'user' : 'ai',
          timestamp: new Date().toISOString()
        });
      }
    }
  });
  return facts;
}

async function recallConversationMemory(query, limit = 50) {
  try {
    const result = await pool.query(
      `SELECT memory_id, orchestrator_msg, ai_response, key_facts, created_at FROM conversation_memory
       WHERE orchestrator_msg ILIKE $1 OR ai_response ILIKE $1
       ORDER BY created_at DESC LIMIT $2`,
      [`%${query}%`, limit]
    );
    console.log(`✅ Memory recall: ${result.rows.length} results`);
    return result.rows;
  } catch (error) {
    console.error("❌ Memory recall error:", error.message);
    return [];
  }
}

// ==================================================================================
// SECTION: LCTP v3 COMPRESSION CODEC
// ==================================================================================

const b64u = {
  enc: (u8) => Buffer.from(u8).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''),
  dec: (s) => new Uint8Array(Buffer.from(s.replace(/-/g,'+').replace(/_/g,'/'), 'base64'))
};

function crc32(u8) {
  let c = 0 ^ -1;
  for (let i = 0; i < u8.length; i++) {
    c ^= u8[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & (-(c & 1)));
  }
  return (c ^ -1) >>> 0;
}

const DICT = {
  type: { directive: 1, briefing: 2, repair: 3, plan: 4, status: 5 },
  project: { lifeOS: 1, lumin: 1, ASHRanch: 2, GoVegas: 3 },
  integ: { Stripe: 1, Twilio: 2, Notion: 3, GitHub: 4, Anthropic: 5, OpenAI: 6, DeepSeek: 7 },
  flow: { 'auto-price': 1, 'add-sms': 2, 'repair-self': 3, 'codeGen': 4, 'deploy': 5 },
  signer: { System: 1, Claude: 2, Council: 3 }
};

function createReverseLookup(dict) {
  const reverse = {};
  Object.entries(dict).forEach(([key, val]) => { if (typeof val === 'number') reverse[val] = key; });
  return reverse;
}

const RDICT = Object.fromEntries(Object.entries(DICT).map(([k,map]) => [k, createReverseLookup(map)]));

function packBits(values) {
  const out = [];
  let cur = 0, used = 0;
  for (const {bits, val} of values) {
    let v = val >>> 0, b = bits;
    while (b > 0) {
      const fit = Math.min(8 - used, b);
      const mask = (1 << fit) - 1;
      cur |= ((v & mask) << used);
      used += fit;
      v >>>= fit;
      b -= fit;
      if (used === 8) { out.push(cur); cur = 0; used = 0; }
    }
  }
  if (used) out.push(cur);
  return Uint8Array.from(out);
}

function unpackBits(u8, spec) {
  const out = {};
  let bitPos = 0, idx = 0, cur = u8[0] || 0;
  for (const {bits, name} of spec) {
    let got = 0, val = 0, shift = 0;
    while (got < bits) {
      if (bitPos === 8) { idx++; cur = u8[idx] || 0; bitPos = 0; }
      const avail = Math.min(8 - bitPos, bits - got);
      const mask = (1 << avail) - 1;
      val |= ((cur >> bitPos) & mask) << shift;
      bitPos += avail; shift += avail; got += avail;
    }
    out[name] = val >>> 0;
  }
  return { out, offset: Math.ceil((spec.reduce((a, b) => a + b.bits, 0)) / 8) };
}

function encodeLCTP({v='3', type, project, flow, integration, monetization='0%', quorum=85, signer='System'}={}) {
  const vN = Number(v) & 0x7;
  const tN = DICT.type[type] || 0;
  const pN = DICT.project[project] || 0;
  const iN = DICT.integ[integration] || 0;
  const qN = Math.max(0, Math.min(100, quorum)) & 0x7f;
  const bps = Math.round(parseFloat(String(monetization).replace('%', '')) * 100) || 0;

  const head = packBits([
    { bits: 3, val: vN },
    { bits: 3, val: tN },
    { bits: 5, val: pN },
    { bits: 5, val: iN },
    { bits: 7, val: qN },
    { bits: 14, val: bps }
  ]);

  const body = [];
  if (flow && DICT.flow[flow]) {
    body.push(0xf0, 0x01, DICT.flow[flow] & 0xff);
  }

  let cBytes = new TextEncoder().encode((flow || '') + '|' + (signer || ''));
  const crc = crc32(cBytes);
  body.push(0xc0, 0x04, crc & 0xff, (crc >>> 8) & 0xff, (crc >>> 16) & 0xff, (crc >>> 24) & 0xff);

  if (DICT.signer[signer]) {
    body.push(0xd0, 0x01, DICT.signer[signer] & 0xff);
  }

  const u8 = new Uint8Array(head.length + body.length);
  u8.set(head, 0);
  u8.set(body, head.length);
  return b64u.enc(u8);
}

function decodeLCTP(b64) {
  const u8 = b64u.dec(b64);
  const spec = [
    { bits: 3, name: 'v' },
    { bits: 3, name: 't' },
    { bits: 5, name: 'p' },
    { bits: 5, name: 'i' },
    { bits: 7, name: 'q' },
    { bits: 14, name: 'bps' }
  ];

  const {out} = unpackBits(u8, spec);
  return {
    v: String(out.v),
    type: RDICT.type[out.t] || `t${out.t}`,
    project: RDICT.project[out.p] || `p${out.p}`,
    integration: RDICT.integ[out.i] || `i${out.i}`,
    quorum: out.q,
    monetization: (out.bps / 100).toFixed(2) + '%'
  };
}

// ==================================================================================
// SECTION: MICRO PROTOCOL v2.0
// ==================================================================================

const MICRO_PROTOCOL = {
  encode: (data) => {
    const parts = ["V:2.0"];
    if (data.operation) parts.push(`OP:${data.operation.charAt(0).toUpperCase()}`);
    if (data.description) {
      const compressed = data.description
        .replace(/generate/gi, "GEN").replace(/analyze/gi, "ANL")
        .replace(/create/gi, "CRT").replace(/build/gi, "BLD")
        .replace(/optimize/gi, "OPT").replace(/review/gi, "REV")
        .replace(/\s+/g, "~");
      parts.push(`D:${compressed.slice(0, 240)}`);
    }
    if (data.type) parts.push(`T:${data.type.charAt(0).toUpperCase()}`);
    if (data.returnFields) parts.push(`R:~${data.returnFields.join("~")}`);
    if (data.memory) parts.push(`MEM:${data.memory}`);
    return parts.join("|");
  },

  decode: (micro) => {
    const result = {};
    micro.split("|").forEach((part) => {
      const [key, value] = part.split(":");
      if (!value) return;
      switch (key) {
        case "V": result.version = value; break;
        case "OP":
          const ops = { G: "generate", A: "analyze", C: "create", B: "build", O: "optimize", R: "review" };
          result.operation = ops[value] || value;
          break;
        case "D":
          result.description = value.replace(/GEN/g, "generate").replace(/ANL/g, "analyze")
            .replace(/CRT/g, "create").replace(/BLD/g, "build").replace(/OPT/g, "optimize")
            .replace(/REV/g, "review").replace(/~/g, " ");
          break;
        case "T":
          const types = { S: "script", R: "report", L: "list", C: "code", A: "analysis" };
          result.type = types[value] || value;
          break;
        case "R": result.returnFields = value.split("~").filter(f => f); break;
        case "MEM": result.memory = value; break;
      }
    });
    return result;
  }
};

// ==================================================================================
// SECTION: ROI & COST TRACKING
// ==================================================================================

function updateROI(revenue=0, cost=0, tasksCompleted=0, tokensSaved=0) {
  const today = dayjs().format("YYYY-MM-DD");
  if (roiTracker.last_reset !== today) {
    roiTracker.daily_revenue = 0; roiTracker.daily_ai_cost = 0;
    roiTracker.daily_tasks_completed = 0; roiTracker.total_tokens_saved = 0;
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

function trackCost(usage, model="gpt-4o-mini") {
  const prices = {
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "gpt-4o": { input: 0.0025, output: 0.01 },
    "claude-3-5-sonnet-20241022": { input: 0.003, output: 0.015 },
    "gemini-2.0-flash-exp": { input: 0.0001, output: 0.0004 },
    "grok-beta": { input: 0.005, output: 0.015 },
    "deepseek-coder": { input: 0.0001, output: 0.0003 }
  };
  const price = prices[model] || prices["gpt-4o-mini"];
  const cost = ((usage?.prompt_tokens || 0) * price.input / 1000) + ((usage?.completion_tokens || 0) * price.output / 1000);
  updateROI(0, cost, 0, 0);
  return cost;
}

// ==================================================================================
// SECTION: TASK EXECUTION QUEUE
// ==================================================================================

class ExecutionQueue {
  constructor() {
    this.tasks = [];
    this.activeTask = null;
    this.history = [];
  }

  addTask(task) {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const fullTask = {
      id: taskId, ...task, status: 'queued',
      createdAt: new Date().toISOString(),
      startedAt: null, completedAt: null, progress: 0,
      result: null, error: null
    };
    this.tasks.push(fullTask);
    this.broadcastTaskUpdate('task_queued', fullTask);
    console.log(`✅ Task queued: ${taskId}`);
    return taskId;
  }

  async executeNext() {
    if (this.tasks.length === 0) {
      setTimeout(() => this.executeNext(), 5000);
      return null;
    }

    this.activeTask = this.tasks.shift();
    this.activeTask.status = 'running';
    this.activeTask.startedAt = new Date().toISOString();
    console.log(`⚡ Executing: ${this.activeTask.id}`);
    this.broadcastTaskUpdate('task_started', this.activeTask);

    try {
      const result = await this.executeTask(this.activeTask);
      this.activeTask.status = 'completed';
      this.activeTask.completedAt = new Date().toISOString();
      this.activeTask.result = result;
      this.activeTask.progress = 100;
      console.log(`✅ Task completed`);
      this.broadcastTaskUpdate('task_completed', this.activeTask);
    } catch (error) {
      this.activeTask.status = 'failed';
      this.activeTask.error = error.message;
      this.activeTask.completedAt = new Date().toISOString();
      console.error(`❌ Task failed`);
      this.broadcastTaskUpdate('task_failed', this.activeTask);
    }

    this.history.push(this.activeTask);
    this.activeTask = null;
    setTimeout(() => this.executeNext(), 500);
  }

  async executeTask(task) {
    if (task.type === 'code_generation') return await this.generateCode(task);
    else if (task.type === 'api_call') return { status: 'executed', timestamp: new Date().toISOString() };
    else if (task.type === 'memory_store') return await storeConversationMemory(task.data.msg, task.data.response, task.context);
    else if (task.type === 'income_generation') return { status: 'income_task_queued', details: task.description };
    return { status: 'executed', task: task.command || task.description };
  }

  async generateCode(task) {
    console.log(`🔧 Generating code: ${task.description}`);
    try {
      const generatedCode = await callCouncilMember('claude', `Generate complete, production-ready code for: ${task.description}`);
      return {
        generated: true, code: generatedCode, language: 'javascript',
        task: task.description, timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Code generation failed: ${error.message}`);
    }
  }

  broadcastTaskUpdate(eventType, taskData) {
    broadcastToOrchestrator({
      type: 'task_update', event: eventType, task: taskData,
      timestamp: new Date().toISOString()
    });
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

const executionQueue = new ExecutionQueue();
// ==================================================================================
// SECTION: API HEALTH MONITOR & FAILOVER
// ==================================================================================

class APIHealthMonitor {
  constructor() {
    this.apiStatus = {
      anthropic: { healthy: true, lastCheck: null, failCount: 0, provider: 'anthropic' },
      openai: { healthy: true, lastCheck: null, failCount: 0, provider: 'openai' },
      google: { healthy: true, lastCheck: null, failCount: 0, provider: 'google' },
      xai: { healthy: true, lastCheck: null, failCount: 0, provider: 'xai' },
      deepseek: { healthy: true, lastCheck: null, failCount: 0, provider: 'deepseek' }
    };
    this.systemStatus = {
      aiCount: 5,
      canDoProgramming: true,
      canUpgrade: true,
      maintenanceMode: false
    };
    this.recoveryTasks = [];
  }

  async healthCheck() {
    const results = {};
    const apiKeys = getApiKeys();
    const providers = [
      { name: 'anthropic', key: apiKeys.anthropic, member: 'claude' },
      { name: 'openai', key: apiKeys.openai, member: 'chatgpt' },
      { name: 'google', key: apiKeys.gemini, member: 'gemini' },
      { name: 'xai', key: apiKeys.grok, member: 'grok' },
      { name: 'deepseek', key: apiKeys.deepseek, member: 'deepseek' }
    ];

    for (const provider of providers) {
      try {
        if (!provider.key) {
          this.apiStatus[provider.name].healthy = false;
          this.apiStatus[provider.name].failCount++;
          results[provider.name] = false;
          continue;
        }

        const isHealthy = await this.testAPI(provider.name, provider.member);
        this.apiStatus[provider.name].healthy = isHealthy;
        this.apiStatus[provider.name].lastCheck = new Date();
        
        if (!isHealthy) {
          this.apiStatus[provider.name].failCount++;
        } else {
          this.apiStatus[provider.name].failCount = 0;
        }
        results[provider.name] = isHealthy;
      } catch (error) {
        this.apiStatus[provider.name].healthy = false;
        this.apiStatus[provider.name].failCount++;
        results[provider.name] = false;
      }
    }
    
    this.updateSystemStatus();
    return results;
  }

  async testAPI(providerName, member) {
    const config = COUNCIL_MEMBERS[member];
    const testPrompt = "Respond with: OK";
    const timeout = 5000;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      const apiKeys = getApiKeys();
      
      console.log(`  [DEBUG] Testing ${providerName} - Key length: ${providerName === 'anthropic' ? apiKeys.anthropic.length : providerName === 'openai' ? apiKeys.openai.length : providerName === 'google' ? apiKeys.gemini.length : providerName === 'xai' ? apiKeys.grok.length : apiKeys.deepseek.length}`);
      
      let response;
      
      if (providerName === 'anthropic' && apiKeys.anthropic) {
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKeys.anthropic.trim(),
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: 10,
            system: "Respond only with OK",
            messages: [{ role: 'user', content: testPrompt }]
          })
        });
      } else if (providerName === 'openai' && apiKeys.openai) {
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKeys.openai.trim()}`
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: 10,
            messages: [
              { role: 'system', content: "Respond only with OK" },
              { role: 'user', content: testPrompt }
            ]
          })
        });
      } else if (providerName === 'google' && apiKeys.gemini) {
        response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${apiKeys.gemini.trim()}`,
          {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: testPrompt }] }],
              generationConfig: { maxOutputTokens: 10 }
            })
          }
        );
      } else if (providerName === 'xai' && apiKeys.grok) {
        response = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKeys.grok.trim()}`
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: 10,
            messages: [
              { role: 'system', content: "Respond only with OK" },
              { role: 'user', content: testPrompt }
            ]
          })
        });
      } else if (providerName === 'deepseek' && apiKeys.deepseek) {
        response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKeys.deepseek.trim()}`
          },
          body: JSON.stringify({
            model: config.model,
            max_tokens: 10,
            messages: [
              { role: 'system', content: "Respond only with OK" },
              { role: 'user', content: testPrompt }
            ]
          })
        });
      }
      
      clearTimeout(timeoutId);
      const isOk = response?.ok === true;
      if (!isOk) {
        console.log(`⚠️ [HEALTH] ${providerName} returned status ${response?.status}`);
      } else {
        console.log(`✅ [HEALTH] ${providerName} OK`);
      }
      return isOk;
    } catch (error) {
      console.error(`❌ [HEALTH] ${providerName} test failed:`, error.message);
      return false;
    }
  }

  updateSystemStatus() {
    const healthyAPIs = Object.values(this.apiStatus).filter(s => s.healthy).length;
    
    this.systemStatus.aiCount = healthyAPIs;
    this.systemStatus.canDoProgramming = healthyAPIs >= 2;
    this.systemStatus.canUpgrade = healthyAPIs >= 3;
    this.systemStatus.maintenanceMode = healthyAPIs < 2;
    
    console.log(`\n📊 [HEALTH] Status: ${healthyAPIs}/5 APIs healthy`);
    console.log(`  • Programming: ${this.systemStatus.canDoProgramming ? '✅ YES' : '❌ NO'}`);
    console.log(`  • Upgrades: ${this.systemStatus.canUpgrade ? '✅ ALLOWED' : '❌ BLOCKED'}`);
    console.log(`  • Mode: ${this.systemStatus.maintenanceMode ? 'MAINTENANCE' : 'NORMAL'}`);
  }

  getHealthyProviders() {
    return Object.entries(this.apiStatus)
      .filter(([_, status]) => status.healthy)
      .map(([provider, _]) => provider);
  }

  async attemptRecovery(provider) {
    console.log(`🔧 [RECOVERY] Attempting to restore ${provider}...`);
    
    const recoveryTask = {
      provider,
      startedAt: new Date().toISOString(),
      attempts: 0,
      maxAttempts: 5,
      status: 'in_progress'
    };
    
    this.recoveryTasks.push(recoveryTask);
    
    while (recoveryTask.attempts < recoveryTask.maxAttempts) {
      recoveryTask.attempts++;
      console.log(`  Attempt ${recoveryTask.attempts}/${recoveryTask.maxAttempts}...`);
      
      const healthResults = await this.healthCheck();
      if (healthResults[provider]) {
        recoveryTask.status = 'recovered';
        console.log(`✅ [RECOVERY] ${provider} restored!`);
        return true;
      }
      
      await new Promise(r => setTimeout(r, 2000 * recoveryTask.attempts));
    }
    
    recoveryTask.status = 'failed';
    console.log(`❌ [RECOVERY] ${provider} recovery failed after ${recoveryTask.maxAttempts} attempts`);
    return false;
  }

  getRecoveryStatus() {
    return {
      activeRecoveries: this.recoveryTasks.filter(t => t.status === 'in_progress'),
      recoveredAPIs: this.recoveryTasks.filter(t => t.status === 'recovered'),
      failedRecoveries: this.recoveryTasks.filter(t => t.status === 'failed')
    };
  }
}

const apiHealthMonitor = new APIHealthMonitor();

// ==================================================================================
// SECTION: SYSTEM MODE CONTROLLER
// ==================================================================================

// ==================================================================================
// SECTION: SYSTEM MODE CONTROLLER
// ==================================================================================

class SystemModeController {
  constructor() {
    this.mode = 'NORMAL';
  }

  async updateMode() {
    const aiCount = apiHealthMonitor.systemStatus.aiCount;
    
    let newMode;
    if (aiCount === 0) {
      newMode = 'CRITICAL_FAILURE';
    } else if (aiCount === 1) {
      newMode = 'DEGRADED';
    } else if (aiCount === 2) {
      newMode = 'PROGRAMMING';
    } else {
      newMode = 'NORMAL';
    }
    
    if (this.mode !== newMode) {
      console.log(`\n📋 [MODE] ${this.mode} → ${newMode}`);
      this.mode = newMode;
      
      if (newMode === 'CRITICAL_FAILURE') {
        broadcastToOrchestrator({
          type: 'critical_alert',
          severity: 'CRITICAL',
          message: '🚨 ALL AI APIS OFFLINE - Manual intervention required',
          action: 'Check API keys, billing, network connectivity',
          timestamp: new Date().toISOString()
        });
      } else if (newMode === 'DEGRADED') {
        broadcastToOrchestrator({
          type: 'system_alert',
          severity: 'WARNING',
          message: '⚠️ Only 1 AI available - System in MINIMAL mode',
          action: 'No upgrades/system changes allowed - Recovery in progress',
          timestamp: new Date().toISOString()
        });
      } else if (newMode === 'PROGRAMMING') {
        broadcastToOrchestrator({
          type: 'system_status',
          severity: 'CAUTION',
          message: '🔧 2 AIs online - PROGRAMMING MODE ACTIVE',
          capabilities: ['code_generation', 'project_building', 'bug_fixes'],
          restrictions: ['NO system upgrades', 'NO core file changes'],
          timestamp: new Date().toISOString()
        });
      } else if (newMode === 'NORMAL') {
        broadcastToOrchestrator({
          type: 'system_status',
          severity: 'INFO',
          message: `✅ ${aiCount} AIs online - FULL CAPABILITY`,
          capabilities: ['code_generation', 'upgrades', 'maintenance', 'all_features'],
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  canUpgradeSystem() {
    return apiHealthMonitor.systemStatus.canUpgrade;
  }

  canDoProgramming() {
    return apiHealthMonitor.systemStatus.canDoProgramming;
  }

  getCapabilities() {
    switch (this.mode) {
      case 'NORMAL':
        return { programming: true, upgrades: true, maintenance: true, builds: true };
      case 'PROGRAMMING':
        return { programming: true, upgrades: false, maintenance: false, builds: true };
      case 'DEGRADED':
        return { programming: false, upgrades: false, maintenance: true, builds: false };
      case 'CRITICAL_FAILURE':
        return { programming: false, upgrades: false, maintenance: false, builds: false };
      default:
        return {};
    }
  }
}

const systemModeController = new SystemModeController();

// ==================================================================================
// SECTION: AI COUNCIL MEMBERS
// ==================================================================================

const COUNCIL_MEMBERS = {
  claude: {
    name: "Claude",
    official_name: "Claude Sonnet 3.5",
    role: "Strategic Oversight",
    model: "claude-3-5-sonnet-20241022",
    provider: "anthropic",
    focus: "long-term, code quality",
    tier: "heavy",
    maxTokens: 4096
  },
  chatgpt: {
    name: "ChatGPT",
    official_name: "GPT-4o",
    role: "Execution",
    model: "gpt-4o",
    provider: "openai",
    focus: "implementation, speed",
    tier: "heavy",
    maxTokens: 4096
  },
  gemini: {
    name: "Gemini",
    official_name: "Gemini 2.0 Flash",
    role: "Innovation",
    model: "gemini-2.0-flash-exp",
    provider: "google",
    focus: "creative solutions",
    tier: "medium",
    maxTokens: 8192
  },
  deepseek: {
    name: "DeepSeek",
    official_name: "DeepSeek-coder",
    role: "Technical Depth",
    model: "deepseek-coder",
    provider: "deepseek",
    focus: "optimization, performance",
    tier: "medium",
    maxTokens: 4096
  },
  grok: {
    name: "Grok",
    official_name: "Grok (XAI)",
    role: "Reality Checks",
    model: "grok-beta",
    provider: "xai",
    focus: "feasibility, risks",
    tier: "light",
    maxTokens: 4096
  }
};

// ==================================================================================
// SECTION: DEEPSEEK BRIDGE & FALLBACK HANDLERS
// ==================================================================================

async function callDeepSeekBridge(prompt, config) {
  const methods = [
    { name: 'local_bridge', endpoint: CURRENT_DEEPSEEK_ENDPOINT || CONFIG.DEEPSEEK_LOCAL_ENDPOINT, enabled: CONFIG.DEEPSEEK_BRIDGE_ENABLED && (!!CURRENT_DEEPSEEK_ENDPOINT || !!CONFIG.DEEPSEEK_LOCAL_ENDPOINT) },
    { name: 'cloud_api', endpoint: 'https://api.deepseek.com/v1/chat/completions', enabled: !!getApiKeys().deepseek },
    { name: 'fallback_claude', endpoint: null, enabled: true }
  ];

  for (const method of methods) {
    if (!method.enabled) continue;
    try {
      console.log(`🔄 [DEEPSEEK] Trying ${method.name}...`);
      let response;
      if (method.name === 'local_bridge') response = await tryLocalDeepSeek(prompt, config, method.endpoint);
      else if (method.name === 'cloud_api') response = await tryCloudDeepSeek(prompt, config);
      else response = await tryFallbackClaude(prompt, config);
      if (response.success) {
        console.log(`✅ [DEEPSEEK ${method.name.toUpperCase()}]`);
        return response.text;
      }
    } catch (error) {
      console.log(`❌ [DEEPSEEK ${method.name}] Failed`);
      continue;
    }
  }
  return await callCouncilMember('claude', prompt);
}

async function tryLocalDeepSeek(prompt, config, envEndpoint) {
  const endpoint = (CURRENT_DEEPSEEK_ENDPOINT || envEndpoint || '').replace(/\/$/, '');
  if (!endpoint) throw new Error('Endpoint not configured');
  const response = await fetch(`${endpoint}/api/v1/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: `You are ${config.name}. ${config.role}. ${config.focus}.` },
        { role: "user", content: prompt }
      ],
      max_tokens: config.maxTokens,
      temperature: 0.7
    }),
    timeout: 8000
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || data.response || 'No response';
  await storeConversationMemory(prompt, text, { ai_member: 'deepseek', context: 'local_bridge' });
  return { success: true, text };
}

async function tryCloudDeepSeek(prompt, config) {
  const apiKeys = getApiKeys();
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKeys.deepseek}` },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: `You are ${config.name}. ${config.role}. ${config.focus}.` },
        { role: "user", content: prompt }
      ],
      max_tokens: config.maxTokens,
      temperature: 0.7
    })
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || 'No response';
  await storeConversationMemory(prompt, text, { ai_member: 'deepseek', context: 'cloud_api' });
  return { success: true, text };
}

async function tryFallbackClaude(prompt, config) {
  const enhancedPrompt = `[DEEPSEEK FALLBACK - Acting as ${config.name}]\nRole: ${config.role}\nFocus: ${config.focus}\n\n${prompt}\n\nRespond with ${config.focus} focus.`;
  const text = await callCouncilMember('claude', enhancedPrompt);
  await storeConversationMemory(prompt, text, { ai_member: 'deepseek', context: 'fallback' });
  return { success: true, text };
}

// ==================================================================================
// SECTION: AI COUNCIL CALL HANDLER WITH FAILOVER
// ==================================================================================

async function attemptAICall(member, config, prompt) {
  const modelName = config.model;
  const systemPrompt = `You are ${config.name}. Role: ${config.role}. Focus: ${config.focus}. Respond naturally and concisely.`;
  
  const timeoutMs = 8000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const apiKeys = getApiKeys();
    let response, json, text;
    
    if (config.provider === 'anthropic' && apiKeys.anthropic) {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKeys.anthropic,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: modelName,
          max_tokens: config.maxTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      json = await response.json();
      if (json.error) throw new Error(`API_ERROR: ${json.error.message || JSON.stringify(json.error)}`);
      text = json.content?.[0]?.text || '';
    } else if (config.provider === 'openai' && apiKeys.openai) {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKeys.openai}`
        },
        body: JSON.stringify({
          model: modelName,
          temperature: 0.7,
          max_tokens: config.maxTokens,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ]
        })
      });
      json = await response.json();
      if (json.error) throw new Error(`API_ERROR`);
      text = json.choices?.[0]?.message?.content || '';
    } else if (config.provider === 'google' && apiKeys.gemini) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${apiKeys.gemini}`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: config.maxTokens }
          })
        }
      );
      json = await response.json();
      if (json.error) throw new Error(`API_ERROR`);
      text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } else if (config.provider === 'xai' && apiKeys.grok) {
      response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKeys.grok}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          max_tokens: config.maxTokens,
          temperature: 0.7
        })
      });
      json = await response.json();
      if (json.error) throw new Error(`API_ERROR`);
      text = json.choices?.[0]?.message?.content || '';
    } else if (config.provider === 'deepseek' && apiKeys.deepseek) {
      response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKeys.deepseek}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          max_tokens: config.maxTokens,
          temperature: 0.7
        })
      });
      json = await response.json();
      if (json.error) throw new Error(`API_ERROR`);
      text = json.choices?.[0]?.message?.content || '';
    }
    
    clearTimeout(timeoutId);
    
    if (!text) {
      return { success: false, error: 'Empty response from API' };
    }
    
    trackCost(json?.usage || {}, modelName);
    return { success: true, text };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error(`  Error: ${error.message}`);
    throw error;
  }
}

async function callCouncilMember(member, prompt) {
  const config = COUNCIL_MEMBERS[member];
  if (!config) throw new Error(`Unknown: ${member}`);
  
  if (systemModeController.mode === 'CRITICAL_FAILURE') {
    throw new Error('🚨 CRITICAL: System offline - all AI APIs unavailable. Check API keys and billing.');
  }

  try {
    if (member === 'deepseek') {
      return await callDeepSeekBridge(prompt, config);
    }
    
    const result = await attemptAICall(member, config, prompt);
    
    if (result.success) {
      await storeConversationMemory(prompt, result.text, { 
        ai_member: member, 
        attempt: 1,
        timestamp: new Date().toISOString()
      });
      return result.text;
    }
  } catch (error) {
    console.error(`❌ [${member}] Primary call failed:`, error.message);
    apiHealthMonitor.apiStatus[config.provider].failCount++;
    
    if (error.message.includes('BILLING_ERROR') || error.message.includes('AUTH_ERROR')) {
      broadcastToOrchestrator({
        type: 'critical_alert',
        provider: config.provider,
        message: `⚠️ CRITICAL: ${member} - ${error.message}`,
        action: 'REQUIRES_MANUAL_INTERVENTION',
        timestamp: new Date().toISOString()
      });
    }
  }

  console.log(`🔄 [FAILOVER] Primary ${member} failed, scanning for alternatives...`);
  const healthyProviders = apiHealthMonitor.getHealthyProviders();
  
  for (const altProvider of healthyProviders) {
    if (altProvider === config.provider) continue;
    
    const altMember = Object.entries(COUNCIL_MEMBERS)
      .find(([, m]) => m.provider === altProvider)?.[0];
    
    if (!altMember) continue;
    
    try {
      console.log(`  → Trying ${altMember}...`);
      const altConfig = COUNCIL_MEMBERS[altMember];
      const result = await attemptAICall(altMember, altConfig, prompt);
      
      if (result.success) {
        await storeConversationMemory(
          prompt, 
          result.text, 
          { 
            ai_member: altMember, 
            fallback_from: member,
            attempt: 2,
            timestamp: new Date().toISOString()
          }
        );
        console.log(`✅ [FAILOVER] Success with ${altMember}`);
        return result.text;
      }
    } catch (error) {
      console.log(`  ✗ ${altMember} also failed`);
      continue;
    }
  }

  setImmediate(() => {
    apiHealthMonitor.attemptRecovery(config.provider);
  });

  const fallbackMsg = `[SYSTEM NOTICE - ${member} temporarily unavailable]\n\nAll primary and fallback AIs are currently unavailable for: ${prompt.slice(0, 50)}...\n\nRecovery in progress. Check /api/v1/system/health-detailed for status.`;
  
  return fallbackMsg;
}

// ==================================================================================
// SECTION: SELF-REPAIR ENGINE
// ==================================================================================

class SelfRepairEngine {
  constructor() {
    this.repairHistory = [];
  }

  async analyzeSystemHealth() {
    const issues = [];
    try {
      try {
        await pool.query('SELECT NOW()');
      } catch (dbError) {
        issues.push({
          severity: 'critical', component: 'database',
          description: `DB connection failed`,
          suggestion: 'Verify DATABASE_URL'
        });
      }

      if (activeConnections.size === 0) {
        issues.push({
          severity: 'low', component: 'websocket',
          description: 'No WebSocket connections',
          suggestion: 'Normal when no clients'
        });
      }

      return {
        healthy: issues.filter(i => i.severity === 'critical').length === 0,
        issues, timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        issues: [{
          severity: 'critical', component: 'system',
          description: `Health analysis failed`,
          suggestion: 'Immediate review'
        }],
        timestamp: new Date().toISOString()
      };
    }
  }

  async repairFile(filePath, issueDescription) {
    try {
      console.log(`🔧 [REPAIR] Analyzing: ${filePath}`);
      const protection = await isFileProtected(filePath);
      if (protection.protected && !protection.can_write) {
        return { success: false, error: `Protected: ${filePath}`, needs_council: protection.needs_council };
      }

      const repairPrompt = `FILE: ${filePath}\nISSUE: ${issueDescription}\n\nProvide complete corrected version.`;
      const fixedContent = await callCouncilMember('deepseek', repairPrompt);

      const repairResult = {
        filePath, fixedContent, issue: issueDescription,
        repairedAt: new Date().toISOString(),
        repairedBy: 'self_repair_system'
      };
      this.repairHistory.push(repairResult);
      console.log(`✅ [REPAIR] Generated`);
      return { success: true, repair: repairResult };
    } catch (error) {
      console.error(`❌ [REPAIR] Failed`);
      return { success: false, error: error.message };
    }
  }

  getRepairHistory() {
    return this.repairHistory.slice(-10);
  }
}

const selfRepairEngine = new SelfRepairEngine();

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
      needs_council: result.rows[0].requires_full_council
    };
  } catch (e) {
    console.error('[protection] Check failed');
    return { protected: false };
  }
}

// ==================================================================================
// SECTION: FINANCIAL DASHBOARD
// ==================================================================================

class FinancialDashboard {
  async recordTransaction(type, amount, description, category='general') {
    try {
      const txId = `tx_${Date.now()}`;
      await pool.query(
        `INSERT INTO financial_ledger (tx_id, type, amount, description, category, created_at)
         VALUES ($1, $2, $3, $4, $5, now())`,
        [txId, type, amount, description, category]
      );
      const tx = { txId, type, amount, description, category, date: new Date().toISOString() };
      broadcastToOrchestrator({ type: 'financial_update', event: 'transaction_recorded', transaction: tx });
      console.log(`✅ Transaction: ${txId}`);
      return tx;
    } catch (error) {
      console.error("❌ Transaction error:", error.message);
      return null;
    }
  }

  async addInvestment(name, amount, expectedReturn, status='active') {
    try {
      const invId = `inv_${Date.now()}`;
      await pool.query(
        `INSERT INTO investments (inv_id, name, amount, expected_return, status, created_at)
         VALUES ($1, $2, $3, $4, $5, now())`,
        [invId, name, amount, expectedReturn, status]
      );
      const inv = { invId, name, amount, expectedReturn, status, date: new Date().toISOString() };
      broadcastToOrchestrator({ type: 'investment_update', event: 'investment_added', investment: inv });
      console.log(`✅ Investment: ${invId}`);
      return inv;
    } catch (error) {
      console.error("❌ Investment error:", error.message);
      return null;
    }
  }

  async addCryptoPosition(symbol, amount, entryPrice, currentPrice) {
    try {
      const cryptoId = `crypto_${Date.now()}`;
      const gain = ((currentPrice - entryPrice) / entryPrice) * 100;
      await pool.query(
        `INSERT INTO crypto_portfolio (crypto_id, symbol, amount, entry_price, current_price, gain_loss_percent, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, now())`,
        [cryptoId, symbol, amount, entryPrice, currentPrice, gain]
      );
      const position = { cryptoId, symbol, amount, entryPrice, currentPrice, gain, date: new Date().toISOString() };
      broadcastToOrchestrator({ type: 'crypto_update', event: 'position_added', position });
      console.log(`✅ Crypto: ${symbol}`);
      return position;
    } catch (error) {
      console.error("❌ Crypto error:", error.message);
      return null;
    }
  }

  async getDashboard() {
    try {
      const todayStart = dayjs().startOf('day').toDate();
      const todayEnd = dayjs().endOf('day').toDate();
      const monthStart = dayjs().startOf('month').toDate();
      const monthEnd = dayjs().endOf('month').toDate();

      const dailyResult = await pool.query(
        `SELECT SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as total_income,
                SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as total_expenses,
                COUNT(*) as transaction_count
         FROM financial_ledger
         WHERE created_at >= $1 AND created_at <= $2`,
        [todayStart, todayEnd]
      );

      const dailyRow = dailyResult.rows[0];
      const dailyPnL = {
        income: parseFloat(dailyRow.total_income) || 0,
        expenses: parseFloat(dailyRow.total_expenses) || 0,
        net: (parseFloat(dailyRow.total_income) || 0) - (parseFloat(dailyRow.total_expenses) || 0),
        transactions: Number(dailyRow.transaction_count || 0)
      };

      const monthlyResult = await pool.query(
        `SELECT SUM(CASE WHEN type='income' THEN amount ELSE 0 END) as total_income,
                SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) as total_expenses
         FROM financial_ledger
         WHERE created_at >= $1 AND created_at <= $2`,
        [monthStart, monthEnd]
      );

      const monthlyRow = monthlyResult.rows[0];
      const monthlyPnL = {
        income: parseFloat(monthlyRow.total_income) || 0,
        expenses: parseFloat(monthlyRow.total_expenses) || 0,
        net: (parseFloat(monthlyRow.total_income) || 0) - (parseFloat(monthlyRow.total_expenses) || 0)
      };

      const investmentsResult = await pool.query(`SELECT * FROM investments ORDER BY created_at DESC LIMIT 20`);
      const cryptoResult = await pool.query(`SELECT * FROM crypto_portfolio ORDER BY created_at DESC LIMIT 20`);

      const totalCryptoValue = cryptoResult.rows.reduce((sum, pos) => sum + (parseFloat(pos.amount) * parseFloat(pos.current_price)), 0);
      const totalCryptoGain = cryptoResult.rows.reduce((sum, pos) => sum + ((parseFloat(pos.current_price) - parseFloat(pos.entry_price)) * parseFloat(pos.amount)), 0);

      return {
        daily: dailyPnL,
        monthly: monthlyPnL,
        investments: investmentsResult.rows,
        crypto: {
          positions: cryptoResult.rows,
          totalValue: totalCryptoValue,
          totalGain: totalCryptoGain,
          gainPercent: totalCryptoValue > 0 ? (totalCryptoGain / (totalCryptoValue - totalCryptoGain)) * 100 : 0
        },
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error("❌ Dashboard error:", error.message);
      return {
        daily: { income: 0, expenses: 0, net: 0, transactions: 0 },
        monthly: { income: 0, expenses: 0, net: 0 },
        investments: [],
        crypto: { positions: [], totalValue: 0, totalGain: 0, gainPercent: 0 },
        lastUpdated: new Date().toISOString()
      };
    }
  }
}

const financialDashboard = new FinancialDashboard();

// ==================================================================================
// SECTION: REAL ESTATE ENGINE
// ==================================================================================

class RealEstateEngine {
  async addProperty(data) {
    const { mls_id, address, price, bedrooms, bathrooms, sqft } = data;
    const result = await pool.query(
      `INSERT INTO real_estate_properties (mls_id, address, price, bedrooms, bathrooms, sqft)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (mls_id) DO UPDATE SET updated_at = now()
       RETURNING *`,
      [mls_id, address, price, bedrooms, bathrooms, sqft]
    );
    return result.rows[0];
  }

  async getProperties(filter={}) {
    let query = "SELECT * FROM real_estate_properties WHERE 1=1";
    const params = [];
    let paramCount = 1;
    if (filter.status) {
      query += ` AND status = $${paramCount}`;
      params.push(filter.status);
      paramCount++;
    }
    query += " ORDER BY updated_at DESC LIMIT 100";
    const result = await pool.query(query, params);
    return result.rows;
  }
}

const realEstateEngine = new RealEstateEngine();

// ==================================================================================
// SECTION: REVENUE BOT ENGINE
// ==================================================================================

class RevenueBotEngine {
  constructor() {
    this.opportunities = [];
  }

  async scanForOpportunities() {
    const opportunities = [
      { source: "Pay-Per-Decision", description: "AI decisions ($50-500)", estimated_revenue: 5000, effort: "easy", priority: 9 },
      { source: "Real Estate", description: "Commissions (6% avg)", estimated_revenue: 18000, effort: "medium", priority: 10 },
      { source: "SaaS", description: "AI Council ($500-5000/mo)", estimated_revenue: 12000, effort: "medium", priority: 9 }
    ];
    this.opportunities = opportunities;
    return {
      total_opportunities: opportunities.length,
      total_potential_revenue: opportunities.reduce((sum, o) => sum + o.estimated_revenue, 0),
      opportunities: opportunities.sort((a, b) => b.priority - a.priority)
    };
  }
}

const revenueBotEngine = new RevenueBotEngine();

// ==================================================================================
// SECTION: INCOME DRONE SYSTEM
// ==================================================================================

class IncomeDroneSystem {
  constructor() {
    this.activeDrones = new Map();
    this.incomeStreams = [];
    this.revenueTargets = { immediate: 100, daily: 500, weekly: 3000 };
  }

  async deployIncomeDrones() {
    console.log('🚀 DEPLOYING INCOME DRONES...');
    const configs = [
      { id: 'affiliate-drone', type: 'affiliate_marketing', target: 'AI tools', expectedRevenue: 200, effort: 'low', deploymentTime: 'immediate' },
      { id: 'micro-saas-drone', type: 'micro_saas', target: 'Browser ext', expectedRevenue: 500, effort: 'medium', deploymentTime: '24h' },
      { id: 'content-drone', type: 'content_creation', target: 'YouTube', expectedRevenue: 300, effort: 'low', deploymentTime: 'immediate' },
      { id: 'consultation-drone', type: 'ai_consultation', target: 'Small biz', expectedRevenue: 1000, effort: 'high', deploymentTime: '48h' }
    ];
    for (const config of configs) await this.deployDrone(config);
  }

  async deployDrone(config) {
    console.log(`🛸 DEPLOYING: ${config.id} - $${config.expectedRevenue}`);
    const drone = { ...config, deployedAt: new Date().toISOString(), status: 'active', revenueGenerated: 0, tasks: [] };
    this.activeDrones.set(config.id, drone);

    const tasks = await this.generateIncomeTasks(config);
    drone.tasks = tasks;

    for (const task of tasks) {
      executionQueue.addTask({
        type: 'income_generation', description: task.description,
        droneId: config.id, priority: 'critical',
        expectedRevenue: task.expectedRevenue, deadline: task.deadline
      });
    }
    console.log(`✅ DRONE: ${tasks.length} tasks`);
  }

  async generateIncomeTasks(droneConfig) {
    const prompt = `GENERATE INCOME TASKS NOW. Type: ${droneConfig.type}. Target: $${droneConfig.expectedRevenue}. Return JSON array: [{"description":"...", "expectedRevenue":X, "deadline":"Yh"}]`;
    
    try {
      const response = await callCouncilMember('claude', prompt);
      
      if (response.includes('Demo]') || response.includes('API key')) {
        console.log(`🔄 [DRONE] Using fallback tasks for ${droneConfig.id}`);
        return this.getFallbackIncomeTasks(droneConfig);
      }
      
      const tasks = this.parseIncomeTasks(response);
      return tasks.slice(0, 5);
    } catch (error) {
      console.error(`❌ [DRONE] Task generation failed, using fallback`);
      return this.getFallbackIncomeTasks(droneConfig);
    }
  }

  parseIncomeTasks(aiResponse) {
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('JSON parse failed, trying alternative parsing');
    }
    
    const tasks = [];
    const lines = aiResponse.split('\n').filter(line => 
      line.trim() && (line.includes('description') || line.includes('$') || line.includes('deadline'))
    );
    
    for (const line of lines.slice(0, 5)) {
      tasks.push({
        description: line.slice(0, 100),
        expectedRevenue: 25,
        deadline: "4h"
      });
    }
    
    return tasks.length > 0 ? tasks : this.getFallbackIncomeTasks({ type: 'general' });
  }

  getFallbackIncomeTasks(droneConfig) {
    const templates = {
      affiliate_marketing: [
        { description: "Research top 10 AI tools for affiliate promotions", expectedRevenue: 50, deadline: "6h" },
        { description: "Create AI tool comparison blog post", expectedRevenue: 30, deadline: "3h" },
        { description: "Set up social media promotion schedule", expectedRevenue: 20, deadline: "2h" }
      ],
      micro_saas: [
        { description: "Develop browser extension MVP", expectedRevenue: 100, deadline: "24h" },
        { description: "Create landing page for SaaS product", expectedRevenue: 50, deadline: "8h" },
        { description: "Set up user feedback system", expectedRevenue: 30, deadline: "4h" }
      ],
      content_creation: [
        { description: "Create 5 AI tutorial YouTube shorts", expectedRevenue: 40, deadline: "8h" },
        { description: "Write 3 blog posts about AI trends", expectedRevenue: 25, deadline: "6h" },
        { description: "Design social media content calendar", expectedRevenue: 15, deadline: "3h" }
      ],
      ai_consultation: [
        { description: "Develop AI consultation service package", expectedRevenue: 200, deadline: "24h" },
        { description: "Create client onboarding process", expectedRevenue: 150, deadline: "12h" },
        { description: "Set up consultation scheduling system", expectedRevenue: 100, deadline: "6h" }
      ]
    };
    return templates[droneConfig.type] || [
      { description: `Research ${droneConfig.type} opportunities`, expectedRevenue: 25, deadline: "4h" },
      { description: `Develop ${droneConfig.type} strategy`, expectedRevenue: 35, deadline: "6h" }
    ];
  }

  async trackRevenue() {
    let totalRevenue = 0, todayRevenue = 0;
    for (const [, drone] of this.activeDrones) {
      totalRevenue += drone.revenueGenerated;
      const today = new Date().toDateString();
      if (new Date(drone.deployedAt).toDateString() === today) todayRevenue += drone.revenueGenerated;
    }
    return {
      totalRevenue, todayRevenue, activeDrones: this.activeDrones.size,
      targetToday: this.revenueTargets.immediate,
      onTrack: todayRevenue >= this.revenueTargets.immediate * 0.3
    };
  }
}

const incomeDroneSystem = new IncomeDroneSystem();

// ==================================================================================
// SECTION: WEBSOCKET CONNECTION & MESSAGE HANDLERS
// ==================================================================================

wss.on('connection', (ws, req) => {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const clientIP = req.socket.remoteAddress;
  
  activeConnections.set(clientId, ws);
  conversationHistory.set(clientId, []);

  console.log(`✅ [WS] Connected: ${clientId} from ${clientIP}`);

  const connectionMessage = {
    type: 'connection',
    status: 'connected',
    clientId,
    message: '🎼 AI Orchestration v21.0 - UNIVERSAL OVERLAY READY',
    system_status: {
      ai_council: {
        members: Object.keys(COUNCIL_MEMBERS).map(key => ({
          name: COUNCIL_MEMBERS[key].name,
          status: getApiKeyStatus(COUNCIL_MEMBERS[key].provider),
          provider: COUNCIL_MEMBERS[key].provider,
          role: COUNCIL_MEMBERS[key].role
        }))
      },
      features: {
        websocket: 'active',
        memory: 'active',
        task_queue: 'running',
        income_drones: 'deployed',
        real_time_keys: 'enabled',
        universal_overlay: 'connected'
      },
      timestamp: new Date().toISOString()
    }
  };

  ws.send(JSON.stringify(connectionMessage));

  const heartbeat = setInterval(() => {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      }));
    }
  }, 30000);

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`📨 [WS] ${message.type} from ${clientId}`);

      switch (message.type) {
        case 'conversation': 
          await handleConversation(clientId, message, ws); 
          break;
        case 'command': 
          await handleCommand(clientId, message, ws); 
          break;
        case 'memory_query': 
          await handleMemoryQuery(clientId, message, ws); 
          break;
        case 'upload_file': 
          await handleFileUpload(clientId, message, ws); 
          break;
        case 'task_submit': 
          await handleTaskSubmit(clientId, message, ws); 
          break;
        case 'financial_record': 
          await handleFinancialRecord(clientId, message, ws); 
          break;
        case 'get_dashboard': 
          await handleDashboardRequest(clientId, message, ws); 
          break;
        case 'code_generation': 
          await handleCodeGeneration(clientId, message, ws); 
          break;
        case 'get_system_status': 
          await handleSystemStatus(clientId, ws); 
          break;
        case 'system_repair': 
          await handleSystemRepair(clientId, message, ws); 
          break;
        case 'system_health': 
          await handleSystemHealth(clientId, ws); 
          break;
        case 'get_ai_status':
          await handleAIStatus(clientId, ws);
          break;
        case 'ping':
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          break;
        default: 
          ws.send(JSON.stringify({ type: 'error', error: `Unknown message type: ${message.type}` }));
      }
    } catch (error) {
      console.error(`❌ [WS] Error from ${clientId}:`, error.message);
      ws.send(JSON.stringify({ 
        type: 'error', 
        error: error.message,
        timestamp: new Date().toISOString()
      }));
    }
  });

  ws.on('close', () => {
    clearInterval(heartbeat);
    activeConnections.delete(clientId);
    conversationHistory.delete(clientId);
    console.log(`👋 [WS] Disconnected: ${clientId}`);
  });

  ws.on('error', (error) => {
    console.error(`❌ [WS] Error for ${clientId}:`, error.message);
    clearInterval(heartbeat);
  });
});

function getApiKeyStatus(provider) {
  const apiKeys = getApiKeys();
  const keyGetters = {
    anthropic: () => apiKeys.anthropic,
    openai: () => apiKeys.openai,
    google: () => apiKeys.gemini,
    xai: () => apiKeys.grok,
    deepseek: () => apiKeys.deepseek
  };
  
  const getter = keyGetters[provider];
  return getter && getter() ? 'ready' : 'needs_api_key';
}

async function handleConversation(clientId, message, ws) {
  const { text } = message;
  let history = conversationHistory.get(clientId) || [];
  history.push({ role: 'user', content: text, timestamp: Date.now() });

  try {
    const response = await callCouncilMember('claude', text);
    history.push({ role: 'ai', content: response, timestamp: Date.now() });
    conversationHistory.set(clientId, history);

    ws.send(JSON.stringify({ type: 'conversation_response', response, memoryStored: true, timestamp: new Date().toISOString() }));
  } catch (error) {
    ws.send(JSON.stringify({ type: 'error', error: error.message }));
  }
}

async function handleCommand(clientId, message, ws) {
  const { command } = message;
  switch (command) {
    case 'start_queue': executionQueue.executeNext(); ws.send(JSON.stringify({ type: 'command_response', status: 'Queue started' })); break;
    case 'queue_status': ws.send(JSON.stringify({ type: 'command_response', status: executionQueue.getStatus() })); break;
    case 'clear_queue': executionQueue.tasks = []; ws.send(JSON.stringify({ type: 'command_response', status: 'Queue cleared' })); break;
    default: ws.send(JSON.stringify({ type: 'error', error: `Unknown command` }));
  }
}

async function handleMemoryQuery(clientId, message, ws) {
  const { query, limit } = message;
  const memories = await recallConversationMemory(query, limit || 50);
  ws.send(JSON.stringify({ type: 'memory_results', count: memories.length, memories: memories.map(m => ({ id: m.memory_id, orchestrator: m.orchestrator_msg.slice(0, 100), ai: m.ai_response.slice(0, 100), date: m.created_at })) }));
}

async function handleFileUpload(clientId, message, ws) {
  const { filename, content } = message;
  const fileId = `file_${Date.now()}`;
  await pool.query(`INSERT INTO file_storage (file_id, filename, content, uploaded_by, created_at) VALUES ($1, $2, $3, $4, now())`, [fileId, filename, content, clientId]);
  await storeConversationMemory(`File: ${filename}`, `Stored: ${fileId}`, { type: 'file_upload' });
  ws.send(JSON.stringify({ type: 'file_uploaded', fileId, filename, message: 'Stored' }));
}

async function handleTaskSubmit(clientId, message, ws) {
  const { description, type, context, priority } = message;
  const taskId = executionQueue.addTask({ description, type: type || 'code_generation', context, priority: priority || 'normal' });
  ws.send(JSON.stringify({ type: 'task_submitted', taskId, message: 'Queued' }));
}

async function handleFinancialRecord(clientId, message, ws) {
  const { transactionType, amount, description, category } = message;
  if (transactionType) await financialDashboard.recordTransaction(transactionType, amount, description, category);
  ws.send(JSON.stringify({ type: 'financial_recorded', message: 'Recorded' }));
}

async function handleDashboardRequest(clientId, message, ws) {
  const dashboard = await financialDashboard.getDashboard();
  ws.send(JSON.stringify({ type: 'dashboard_data', dashboard, timestamp: new Date().toISOString() }));
}

async function handleCodeGeneration(clientId, message, ws) {
  const { description, type='code_generation' } = message;
  try {
    const taskId = executionQueue.addTask({ type, description, command: `Generate: ${description}`, priority: 'high' });
    ws.send(JSON.stringify({ type: 'code_generation_started', taskId, message: 'Queued' }));
  } catch (error) {
    ws.send(JSON.stringify({ type: 'error', error: error.message }));
  }
}

async function handleSystemStatus(clientId, ws) {
  const taskStatus = executionQueue.getStatus();
  ws.send(JSON.stringify({ type: 'system_status', status: 'operational', version: 'v21.0', timestamp: new Date().toISOString(), tasks: taskStatus }));
}

async function handleSystemHealth(clientId, ws) {
  try {
    const health = await selfRepairEngine.analyzeSystemHealth();
    ws.send(JSON.stringify({ type: 'system_health', health, timestamp: new Date().toISOString() }));
  } catch (error) {
    ws.send(JSON.stringify({ type: 'health_error', error: error.message }));
  }
}

async function handleSystemRepair(clientId, message, ws) {
  const { filePath, issue } = message;
  try {
    const repair = await selfRepairEngine.repairFile(filePath, issue);
    ws.send(JSON.stringify({ type: 'repair_response', repair, timestamp: new Date().toISOString() }));
  } catch (error) {
    ws.send(JSON.stringify({ type: 'error', error: error.message }));
  }
}

async function handleAIStatus(clientId, ws) {
  const aiStatus = Object.keys(COUNCIL_MEMBERS).map(key => {
    const member = COUNCIL_MEMBERS[key];
    
    return {
      name: member.name,
      official_name: member.official_name,
      provider: member.provider,
      status: getApiKeyStatus(member.provider),
      has_key: !!getApiKeyStatus(member.provider),
      role: member.role,
      focus: member.focus
    };
  });

  ws.send(JSON.stringify({
    type: 'ai_status',
    members: aiStatus,
    total_ready: aiStatus.filter(m => m.status === 'ready').length,
    total_members: aiStatus.length,
    timestamp: new Date().toISOString()
  }));
}

// ==================================================================================
// SECTION: REST API MIDDLEWARE & AUTHENTICATION
// ==================================================================================

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.text({ type: "text/plain", limit: "50mb" }));
app.use(express.static(join(__dirname, "public")));

function requireCommandKey(req, res, next) {
  const key = req.query.key || req.headers["x-command-key"];
  if (!CONFIG.COMMAND_CENTER_KEY || key !== CONFIG.COMMAND_CENTER_KEY)
    return res.status(401).json({ error: "unauthorized" });
  next();
}

function normalizeUrl(u) {
  try {
    const x = new URL(u);
    return x.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

// ==================================================================================
// SECTION: REST API ENDPOINTS - BRIDGE & SETUP
// ==================================================================================

app.post('/api/v1/bridge/register', requireCommandKey, async (req, res) => {
  try {
    const { url } = req.body || {};
    const normalized = normalizeUrl(url);
    if (!normalized) return res.status(400).json({ ok: false, error: 'Invalid URL' });

    CURRENT_DEEPSEEK_ENDPOINT = normalized;
    console.log(`🔌 [BRIDGE] Registered: ${normalized}`);
    res.json({ ok: true, endpoint: normalized });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get('/api/v1/bridge/endpoint', requireCommandKey, (_req, res) =>
  res.json({ ok: true, endpoint: CURRENT_DEEPSEEK_ENDPOINT || CONFIG.DEEPSEEK_LOCAL_ENDPOINT || null })
);

// ==================================================================================
// SECTION: REST API ENDPOINTS - HEALTH & STATUS
// ==================================================================================

app.get("/health", (req, res) => res.send("OK"));

app.get("/healthz", async (_req, res) => {
  try {
    await pool.query("SELECT NOW()");
    const taskStatus = executionQueue.getStatus();
    const health = await selfRepairEngine.analyzeSystemHealth();

    res.json({
      status: 'healthy', version: 'v21.0', timestamp: new Date().toISOString(),
      system: { database: 'connected', websocket_connections: activeConnections.size, health: health.healthy ? 'green' : 'red' },
      tasks: taskStatus,
      ai_council: {
        enabled: true,
        members: Object.keys(COUNCIL_MEMBERS).length,
        models: Object.values(COUNCIL_MEMBERS).map(m => m.official_name)
      },
      mode: systemModeController.mode,
      aiCount: apiHealthMonitor.systemStatus.aiCount,
      canUpgrade: systemModeController.canUpgradeSystem(),
      canDoProgramming: systemModeController.canDoProgramming(),
      deployment: 'GitHub + Railway'
    });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', error: error.message });
  }
});

app.get('/api/v1/system/health-detailed', requireCommandKey, (req, res) => {
  res.json({
    ok: true,
    mode: systemModeController.mode,
    aiCount: apiHealthMonitor.systemStatus.aiCount,
    canUpgrade: systemModeController.canUpgradeSystem(),
    canDoProgramming: systemModeController.canDoProgramming(),
    capabilities: systemModeController.getCapabilities(),
    apiStatus: Object.fromEntries(
      Object.entries(apiHealthMonitor.apiStatus).map(([k, v]) => [k, {
        healthy: v.healthy,
        lastCheck: v.lastCheck,
        failCount: v.failCount
      }])
    ),
    recoveryStatus: apiHealthMonitor.getRecoveryStatus(),
    timestamp: new Date().toISOString()
  });
});

// ==================================================================================
// SECTION: REST API ENDPOINTS - MEMORY & QUEUE
// ==================================================================================

app.get('/api/v1/memory/search', requireCommandKey, async (req, res) => {
  try {
    const { q, limit } = req.query;
    const memories = await recallConversationMemory(q, limit || 50);
    res.json({ ok: true, count: memories.length, memories });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get('/api/v1/queue/status', requireCommandKey, (req, res) => {
  res.json({ ok: true, status: executionQueue.getStatus() });
});

// ==================================================================================
// SECTION: REST API ENDPOINTS - FINANCIAL & DASHBOARD
// ==================================================================================

app.get('/api/v1/dashboard', requireCommandKey, async (req, res) => {
  try {
    const dashboard = await financialDashboard.getDashboard();
    res.json({ ok: true, dashboard });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================================================================================
// SECTION: REST API ENDPOINTS - CODE GENERATION
// ==================================================================================

app.post('/api/v1/code/generate', requireCommandKey, async (req, res) => {
  try {
    const { description, type='code_generation' } = req.body;
    const taskId = executionQueue.addTask({ type, description, command: `Generate: ${description}`, priority: 'high' });
    res.json({ ok: true, taskId, message: 'Queued' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================================================================================
// SECTION: REST API ENDPOINTS - COMPRESSION & ARCHITECT
// ==================================================================================

app.post('/api/v1/architect/micro', requireCommandKey, async (req, res) => {
  try {
    const rawBody = typeof req.body === "string" ? req.body : (req.body?.micro || req.body?.text || "");
    if (!rawBody) {
      try {
        const v3 = encodeLCTP({ v: '3', type: 'directive', project: 'lifeOS', flow: 'auto-price', integration: 'Stripe', quorum: 85, signer: 'System' });
        return res.type("text/plain").send(v3);
      } catch (e) {
        return res.status(400).type("text/plain").send("V:2.0|CT:missing~input");
      }
    }

    let microOut;
    if (String(rawBody).startsWith("V:3") || (rawBody.length > 30 && /^[A-Za-z0-9\-_]+$/.test(rawBody))) {
      try {
        const decoded = decodeLCTP(rawBody);
        microOut = encodeLCTP(decoded);
      } catch (e) {
        microOut = `V:2.0|CT:v3~error`;
      }
    } else {
      const r = await callCouncilMember("claude", rawBody);
      trackCost({}, "claude-3-5-sonnet-20241022");
      microOut = String(r || "").trim();
      if (!microOut.startsWith("V:")) {
        microOut = MICRO_PROTOCOL.encode({ operation: 'generate', description: microOut.slice(0, 200), type: 'response' });
      }
    }

    return res.type("text/plain").send(microOut || "V:2.0|CT:empty");
  } catch (e) {
    console.error("[architect.micro]", e);
    return res.status(500).type("text/plain").send(`V:2.0|CT:error`);
  }
});

// ==================================================================================
// SECTION: REST API ENDPOINTS - FILE UPLOAD
// ==================================================================================

app.post('/api/v1/files/upload', requireCommandKey, async (req, res) => {
  try {
    const { filename, content, uploaded_by='api' } = req.body;
    const fileId = `file_${Date.now()}`;
    await pool.query(`INSERT INTO file_storage (file_id, filename, content, uploaded_by, created_at) VALUES ($1, $2, $3, $4, now())`, [fileId, filename, content, uploaded_by]);
    await storeConversationMemory(`File: ${filename}`, `Stored: ${fileId}`, { type: 'file_upload' });
    res.json({ ok: true, fileId, filename, message: 'Stored' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================================================================================
// SECTION: REST API ENDPOINTS - REAL ESTATE
// ==================================================================================

app.get('/api/v1/realestate/properties', requireCommandKey, async (req, res) => {
  try {
    const properties = await realEstateEngine.getProperties(req.query);
    res.json({ ok: true, count: properties.length, properties });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/v1/realestate/properties', requireCommandKey, async (req, res) => {
  try {
    const property = await realEstateEngine.addProperty(req.body);
    res.json({ ok: true, property });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================================================================================
// SECTION: REST API ENDPOINTS - DEBUG & UTILITIES
// ==================================================================================

app.get('/api/debug/env-check', requireCommandKey, (req, res) => {
  const apiKeys = getApiKeys();
  res.json({
    openai: { has_key: !!apiKeys.openai, length: apiKeys.openai ? apiKeys.openai.length : 0, preview: apiKeys.openai ? apiKeys.openai.slice(0, 8) + '...' : 'none' },
    anthropic: { has_key: !!apiKeys.anthropic, length: apiKeys.anthropic ? apiKeys.anthropic.length : 0, preview: apiKeys.anthropic ? apiKeys.anthropic.slice(0, 8) + '...' : 'none' },
    gemini: { has_key: !!apiKeys.gemini, length: apiKeys.gemini ? apiKeys.gemini.length : 0, preview: apiKeys.gemini ? apiKeys.gemini.slice(0, 8) + '...' : 'none' },
    grok: { has_key: !!apiKeys.grok, length: apiKeys.grok ? apiKeys.grok.length : 0, preview: apiKeys.grok ? apiKeys.grok.slice(0, 8) + '...' : 'none' },
    deepseek: { has_key: !!apiKeys.deepseek, length: apiKeys.deepseek ? apiKeys.deepseek.length : 0, preview: apiKeys.deepseek ? apiKeys.deepseek.slice(0, 8) + '...' : 'none' },
    timestamp: new Date().toISOString(),
    server_uptime: process.uptime()
  });
});

app.get('/overlay/debug', (req, res) => {
  const apiKeys = getApiKeys();
  res.json({
    websocket_connections: activeConnections.size,
    overlay_endpoints: {
      command_center: '/overlay/command-center.html',
      architect: '/overlay/architect.html', 
      portal: '/overlay/portal.html',
      control: '/overlay/control.html'
    },
    system_status: {
      ai_council: Object.keys(COUNCIL_MEMBERS).map(key => ({
        name: COUNCIL_MEMBERS[key].name,
        provider: COUNCIL_MEMBERS[key].provider,
        status: getApiKeyStatus(COUNCIL_MEMBERS[key].provider),
        has_key: !!getApiKeyStatus(COUNCIL_MEMBERS[key].provider)
      })),
      websocket_enabled: true,
      memory_system: 'active',
      real_time_keys: 'enabled'
    }
  });
});

app.get('/overlay/command-center.html', (req, res) => {
  res.sendFile(join(__dirname, "public/overlay/command-center.html"));
});

// ==================================================================================
// SECTION: SERVER STARTUP & INITIALIZATION
// ==================================================================================

async function startServer() {
  try {
    if (!validateEnvironment()) process.exit(1);

    await initDb();

    console.log("🏥 Starting API health monitoring...");
    await apiHealthMonitor.healthCheck();
    await systemModeController.updateMode();
    
    setInterval(async () => {
      await apiHealthMonitor.healthCheck();
      await systemModeController.updateMode();
    }, 30000);

    console.log("🚀 Starting execution queue...");
    executionQueue.executeNext();

    console.log("🛸 DEPLOYING INCOME-GENERATING DRONES...");
    incomeDroneSystem.deployIncomeDrones().catch(console.error);

    server.listen(CONFIG.PORT, CONFIG.HOST, () => {
      console.log(`\n${'═'.repeat(90)}`);
      console.log(`✅ SERVER.JS v21.0 - COMPLETE AI ORCHESTRATION SYSTEM ONLINE`);
      console.log(`${'═'.repeat(90)}`);
      
      console.log(`\n🌐 SERVER INTERFACE:
  • Server:        http://${CONFIG.HOST}:${CONFIG.PORT}
  • WebSocket:     ws://${CONFIG.HOST}:${CONFIG.PORT}
  • Health:        http://${CONFIG.HOST}:${CONFIG.PORT}/healthz
  • Overlay UI:    http://${CONFIG.HOST}:${CONFIG.PORT}/overlay/command-center.html`);

      console.log(`\n🤖 AI COUNCIL (${Object.keys(COUNCIL_MEMBERS).length} MODELS):`);
      Object.entries(COUNCIL_MEMBERS).forEach(([, member]) => 
        console.log(`  • ${member.name} (${member.official_name}) - ${member.role}`)
      );
      
      console.log(`\n🌉 DEEPSEEK BRIDGE: ${CONFIG.DEEPSEEK_BRIDGE_ENABLED ? 'ENABLED' : 'DISABLED'}`);
      if (CONFIG.DEEPSEEK_BRIDGE_ENABLED) {
        console.log(`  Endpoint: ${CURRENT_DEEPSEEK_ENDPOINT || CONFIG.DEEPSEEK_LOCAL_ENDPOINT || 'Not configured'}`);
      }
      
      console.log(`\n📊 COMPLETE FEATURE SET:
  ✅ WebSocket real-time communication
  ✅ 3-layer automatic memory system (extraction + recall)
  ✅ Task execution queue with code generation
  ✅ Financial dashboard (P&L, Investments, Crypto)
  ✅ Real estate business engine
  ✅ Revenue opportunity bot + Income drones
  ✅ AI council integration (5 models with parallel voting)
  ✅ Protected file system with council approval
  ✅ Self-repair capabilities (auto-analysis + fix)
  ✅ LCTP v3 Compression (80-95% reduction)
  ✅ MICRO Protocol v2.0 (70-80% reduction)
  ✅ CRC32 integrity checking
  ✅ Bit-packing + Dictionary substitution
  ✅ File upload & indexing
  ✅ Complete overlay system
  ✅ ROI tracking + cost optimization
  ✅ API Health Monitoring & Failover
  ✅ System Mode Controller
  ✅ Fresh Railway Environment Variable Reads
  ✅ Universal Overlay Integration`);
      
      console.log(`\n🚀 DEPLOYMENT: GitHub + Railway
  • System hosted on Railway
  • Code managed on GitHub (LimitlessOI/Lumin-LifeOS)
  • Database: Neon PostgreSQL (SSL enabled)
  • DeepSeek runs locally (when available)
  • Council works with or without local DeepSeek\n`);

      console.log("🎼 READY - AI ORCHESTRATION SYSTEM ACTIVE");
      console.log("The system will work with or without your local DeepSeek instance.");
      console.log("When your laptop is offline, the council continues with other AIs.\n");
    });
  } catch (error) {
    console.error("❌ Server startup error:", error);
    process.exit(1);
  }
}

// ==================================================================================
// SECTION: GRACEFUL SHUTDOWN
// ==================================================================================

function handleGracefulShutdown() {
  console.log("\n📊 Graceful shutdown initiated...");
  for (const [, ws] of activeConnections.entries()) {
    try { ws.close(1000, "Server shutting down"); } 
    catch {}
  }
  pool.end(() => console.log("✅ Database pool closed"));
  server.close(() => {
    console.log("✅ Server closed");
    process.exit(0);
  });
  setTimeout(() => {
    console.error("❌ Forcing shutdown");
    process.exit(1);
  }, 10000);
}

process.on('SIGINT', handleGracefulShutdown);
process.on('SIGTERM', handleGracefulShutdown);

startServer();

export default app;
