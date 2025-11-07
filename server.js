/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                  ║
 * ║          🎼 SERVER.JS v21.0 - COMPLETE AI ORCHESTRATION SYSTEM                  ║
 * ║                 "Clean, consolidated, paste-and-run" edition                    ║
 * ║                                                                                  ║
 * ║    GitHub + Railway • DeepSeek Bridge • LCTP v3 + MICRO v2.0 Compression        ║
 * ║    AI Council • Financial Dashboard • Real Estate • Revenue Bots • Income Drones ║
 * ║    Self-Repair • Protected Files • ROI Tracking                                  ║
 * ║                                                                                  ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 *
 * @system UNIFIED_COMMAND_CENTER_v21.0
 * @version 21.0.0
 * @author Adam Hopkins
 * @description Production-ready AI orchestration with compression + autonomy
 * @status PRODUCTION_READY
 * @deployment GitHub + Railway (Neon PostgreSQL)
 */

// =============================================================================
// IMPORTS AND SETUP (Node 18+ with global fetch)
// =============================================================================

import express from "express";
import dayjs from "dayjs";
import fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import crypto from "crypto";

const { dirname, join } = path;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// =============================================================================
// ENVIRONMENT & CONFIG
// =============================================================================

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
  DEEPSEEK_LOCAL_ENDPOINT,
  DEEPSEEK_BRIDGE_ENABLED = "false",
  HOST = "0.0.0.0",
  PORT = 8080,
  MAX_DAILY_SPEND = 50.0,
  AI_TIER = "medium",
  DATA_DIR: ENV_DATA_DIR
} = process.env;

let CURRENT_DEEPSEEK_ENDPOINT = (process.env.DEEPSEEK_LOCAL_ENDPOINT || '').trim() || null;

const DATA_DIR = ENV_DATA_DIR || join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const LOG_FILE = join(DATA_DIR, "autopilot.log");
const SPEND_FILE = join(DATA_DIR, "spend.json");

// 🔧 Safe file writing to apply self-repairs and prevent path traversal
function safeWriteProjectFile(relPath, content) {
  const normalized = path.normalize(relPath).replace(/^(\.{2}(\/|\|$))+/, "");
  const abs = join(__dirname, normalized);
  if (!abs.startsWith(__dirname)) throw new Error("Path traversal detected");
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, "utf8");
  return abs;
}

function validateEnvironment() {
  const required = ["DATABASE_URL"];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error("❌ MISSING ENV:", missing);
    return false;
  }
  console.log("✅ Environment validated");
  return true;
}

// =============================================================================
// DATABASE
// =============================================================================

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL?.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
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

    // Indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_memory_id ON conversation_memory(memory_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_memory_created ON conversation_memory(created_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_file_storage ON file_storage(file_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_financial_date ON financial_ledger(created_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_protected_files ON protected_files(file_path)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_memory_category ON shared_memory(category)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_council_pr ON council_reviews(pr_number)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_compression ON compression_stats(created_at)`);

    // Protect core files
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

// =============================================================================
// WEBSOCKET
// =============================================================================

const activeConnections = new Map();
const conversationHistory = new Map();

function broadcastToOrchestrator(message) {
  const broadcastData = JSON.stringify(message);
  for (const [, ws] of activeConnections.entries()) {
    if (ws && ws.readyState === 1) ws.send(broadcastData);
  }
}

// =============================================================================
// 3-LAYER MEMORY SYSTEM
// =============================================================================

async function storeConversationMemory(orchestratorMessage, aiResponse, context = {}) {
  try {
    const memId = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const keyFacts = extractKeyFacts(orchestratorMessage, aiResponse);
    await pool.query(
      `INSERT INTO conversation_memory 
       (memory_id, orchestrator_msg, ai_response, key_facts, context_metadata, memory_type, created_at)
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
          type: pattern.name, text: match[1].trim(),
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
      `SELECT memory_id, orchestrator_msg, ai_response, key_facts, created_at 
       FROM conversation_memory
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

// =============================================================================
// LCTP v3 COMPRESSION CODEC + MICRO v2.0
// =============================================================================

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

const DICT = {
  type: { directive: 1, briefing: 2, repair: 3, plan: 4, status: 5 },
  project: { lifeOS: 1, lumin: 1, ASHRanch: 2, GoVegas: 3 },
  integ: { Stripe: 1, Twilio: 2, Notion: 3, GitHub: 4, Anthropic: 5, OpenAI: 6, DeepSeek: 7 },
  flow: { 'auto-price': 1, 'add-sms': 2, 'repair-self': 3, 'codeGen': 4, 'deploy': 5 },
  signer: { System: 1, Claude: 2, Council: 3 }
};

function createReverseLookup(dict) {
  const reverse = {};
  Object.entries(dict).forEach(([key, val]) => {
    if (typeof val === 'number') reverse[val] = key;
  });
  return reverse;
}
const RDICT = Object.fromEntries(Object.entries(DICT).map(([k,map]) => [k, createReverseLookup(map)]));

function encodeLCTP({v='3', type, project, flow, integration, monetization='0%', quorum=85, ethics=[], signer='System', dict=DICT}={}) {
  const vN = Number(v) & 0x7;
  const tN = dict.type[type] || 0;
  const pN = dict.project[project] || 0;
  const iN = dict.integ[integration] || 0;
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
  if (flow && dict.flow[flow]) { body.push(0xf0, 0x01, dict.flow[flow] & 0xff); }

  let cBytes = new TextEncoder().encode((flow || '') + '|' + (signer || ''));
  const crc = crc32(cBytes);
  body.push(0xc0, 0x04, crc & 0xff, (crc >>> 8) & 0xff, (crc >>> 16) & 0xff, (crc >>> 24) & 0xff);

  if (dict.signer[signer]) { body.push(0xd0, 0x01, dict.signer[signer] & 0xff); }

  const u8 = new Uint8Array(head.length + body.length);
  u8.set(head, 0);
  u8.set(body, head.length);
  return b64u.enc(u8);
}

function decodeLCTP(b64, dict=DICT) {
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
          result.operation = ops[value] || value; break;
        case "D":
          result.description = value.replace(/GEN/g, "generate").replace(/ANL/g, "analyze")
            .replace(/CRT/g, "create").replace(/BLD/g, "build").replace(/OPT/g, "optimize")
            .replace(/REV/g, "review").replace(/~/g, " ");
          break;
        case "T":
          const types = { S: "script", R: "report", L: "list", C: "code", A: "analysis" };
          result.type = types[value] || value; break;
        case "R": result.returnFields = value.split("~").filter(f => f); break;
        case "CT": result.content = value.replace(/~/g, " "); break;
        case "KP": result.keyPoints = value.split("~").filter(p => p); break;
        case "MEM": result.memory = value; break;
      }
    });
    return result;
  }
};

// =============================================================================
// ROI & COST TRACKING
// =============================================================================

const roiTracker = {
  daily_revenue: 0, daily_ai_cost: 0, daily_tasks_completed: 0,
  total_tokens_saved: 0, micro_compression_saves: 0, roi_ratio: 0,
  last_reset: dayjs().format("YYYY-MM-DD")
};

const compressionMetrics = {
  v2_0_compressions: 0, v3_compressions: 0,
  total_bytes_saved: 0, total_cost_saved: 0
};

function updateROI(revenue=0, cost=0, tasksCompleted=0, tokensSaved=0) {
  const today = dayjs().format("YYYY-MM-DD");
  if (roiTracker.last_reset !== today) {
    roiTracker.daily_revenue = 0; roiTracker.daily_ai_cost = 0;
    roiTracker.daily_tasks_completed = 0; roiTracker.total_tokens_saved = 0;
    roiTracker.micro_compression_saves = 0; roiTracker.last_reset = today;
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

function readSpend() {
  try { return JSON.parse(fs.readFileSync(SPEND_FILE, "utf8")); }
  catch { return { day: dayjs().format("YYYY-MM-DD"), usd: 0 }; }
}
function writeSpend(s) {
  try { fs.writeFileSync(SPEND_FILE, JSON.stringify(s)); }
  catch (e) { console.error("Failed to write spend:", e); }
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
  let spend = readSpend();
  const today = dayjs().format("YYYY-MM-DD");
  if (spend.day !== today) spend = { day: today, usd: 0 };
  spend.usd += cost;
  writeSpend(spend);
  updateROI(0, cost, 0, 0);
  return cost;
}

// =============================================================================
// TASK QUEUE
// =============================================================================

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
      createdAt: new Date().toISOString(), startedAt: null,
      completedAt: null, progress: 0, result: null, error: null
    };
    this.tasks.push(fullTask);
    this.broadcastTaskUpdate('task_queued', fullTask);
    console.log(`✅ Task queued: ${taskId}`);
    return taskId;
  }
  async executeNext() {
    if (this.tasks.length === 0) { setTimeout(() => this.executeNext(), 5000); return null; }
    this.activeTask = this.tasks.shift();
    this.activeTask.status = 'running';
    this.activeTask.startedAt = new Date().toISOString();
    console.log(`⚡ Executing: ${this.activeTask.id}`);
    this.broadcastTaskUpdate('task_started', this.activeTask);
    try {
      const result = await this.executeTask(this.activeTask);
      this.activeTask.status = 'completed';
      this.activeTask.completedAt = new Date().toISOString();
      this.activeTask.result = result; this.activeTask.progress = 100;
      console.log(`✅ Task completed`);
      this.broadcastTaskUpdate('task_completed', this.activeTask);
    } catch (error) {
      this.activeTask.status = 'failed';
      this.activeTask.error = error.message; this.activeTask.completedAt = new Date().toISOString();
      console.error(`❌ Task failed:`, error.message);
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
      return { generated: true, code: generatedCode, language: 'javascript', task: task.description, timestamp: new Date().toISOString() };
    } catch (error) { throw new Error(`Code generation failed: ${error.message}`); }
  }
  broadcastTaskUpdate(eventType, taskData) {
    broadcastToOrchestrator({ type: 'task_update', event: eventType, task: taskData, timestamp: new Date().toISOString() });
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

// =============================================================================
// FINANCIAL DASHBOARD
// =============================================================================

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

// =============================================================================
// AI COUNCIL
// =============================================================================

const COUNCIL_MEMBERS = {
  claude: {
    name: "Claude", official_name: "Claude Sonnet 3.5",
    role: "Strategic Oversight", model: "claude-3-5-sonnet-20241022",
    provider: "anthropic", focus: "long-term, code quality",
    tier: "heavy", maxTokens: 4096, costPer1kTokens: 0.003
  },
  chatgpt: {
    name: "ChatGPT", official_name: "GPT-4o",
    role: "Execution", model: "gpt-4o",
    provider: "openai", focus: "implementation, speed",
    tier: "heavy", maxTokens: 4096, costPer1kTokens: 0.015
  },
  gemini: {
    name: "Gemini", official_name: "Gemini 2.0 Flash",
    role: "Innovation", model: "gemini-2.0-flash-exp",
    provider: "google", focus: "creative solutions",
    tier: "medium", maxTokens: 8192, costPer1kTokens: 0.00075
  },
  deepseek: {
    name: "DeepSeek", official_name: "DeepSeek-coder",
    role: "Technical Depth", model: "deepseek-coder",
    provider: "deepseek", focus: "optimization, performance",
    tier: "medium", maxTokens: 4096, costPer1kTokens: 0.0001
  },
  grok: {
    name: "Grok", official_name: "Grok (XAI)",
    role: "Reality Checks", model: "grok-beta",
    provider: "xai", focus: "feasibility, risks",
    tier: "light", maxTokens: 4096, costPer1kTokens: 0.00015
  }
};

// =============================================================================
// DEEPSEEK BRIDGE (Local → Cloud → Claude fallback)
// =============================================================================

async function callDeepSeekBridge(prompt, config) {
  const methods = [
    { name: 'local_bridge', endpoint: CURRENT_DEEPSEEK_ENDPOINT || DEEPSEEK_LOCAL_ENDPOINT, enabled: DEEPSEEK_BRIDGE_ENABLED === "true" && (!!CURRENT_DEEPSEEK_ENDPOINT || !!DEEPSEEK_LOCAL_ENDPOINT) },
    { name: 'cloud_api', endpoint: 'https://api.deepseek.com/v1/chat/completions', enabled: !!DEEPSEEK_API_KEY },
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
      if (response.success) { console.log(`✅ [DEEPSEEK ${method.name.toUpperCase()}]`); return response.text; }
    } catch (error) { console.log(`❌ [DEEPSEEK ${method.name}] Failed`); continue; }
  }
  return await callCouncilMember('claude', prompt);
}

async function tryLocalDeepSeek(prompt, config, envEndpoint) {
  const endpoint = (CURRENT_DEEPSEEK_ENDPOINT || envEndpoint || '').replace(/\/$/, '');
  if (!endpoint) throw new Error('Endpoint not configured');
  const response = await fetch(`${endpoint}/api/v1/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      messages: [ { role: "system", content: `You are ${config.name}. ${config.role}. ${config.focus}.` }, { role: "user", content: prompt } ],
      max_tokens: config.maxTokens, temperature: 0.7
    })
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || data.response || 'No response';
  await storeConversationMemory(prompt, text, { ai_member: 'deepseek', context: 'local_bridge' });
  return { success: true, text };
}

async function tryCloudDeepSeek(prompt, config) {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model: config.model,
      messages: [ { role: "system", content: `You are ${config.name}. ${config.role}. ${config.focus}.` }, { role: "user", content: prompt } ],
      max_tokens: config.maxTokens, temperature: 0.7
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

async function callCouncilMember(member, prompt) {
  const config = COUNCIL_MEMBERS[member];
  if (!config) throw new Error(`Unknown: ${member}`);
  if (member === 'deepseek') return await callDeepSeekBridge(prompt, config);

  // Spend-cap guard: avoid paid calls when over MAX_DAILY_SPEND
  try {
    const spend = readSpend();
    if (Number(spend.usd || 0) >= Number(MAX_DAILY_SPEND || 0)) {
      const msg = `[spend-cap] Daily spend (${Number(spend.usd).toFixed(4)}) ≥ MAX_DAILY_SPEND (${MAX_DAILY_SPEND}). Running in demo/offline mode.`;
      await storeConversationMemory(prompt, msg, { ai_member: member, demo: true, spend_cap: true });
      return msg;
    }
  } catch {}

  const modelName = config.model;
  const systemPrompt = `You are ${config.name}. Role: ${config.role}. Focus: ${config.focus}. Respond naturally.`;

  const ensureText = (json) => {
    const t =
      json?.content?.[0]?.text ??
      json?.choices?.[0]?.message?.content ??
      json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return (typeof t === "string" ? t : "").trim();
  };

  const throwIfBad = async (resp) => {
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      throw new Error(`HTTP ${resp.status} ${body.slice(0, 400)}`);
    }
  };

  const throwIfErrorShape = (json) => {
    if (json?.error) {
      const m = json.error?.message || json.error?.type || "provider error";
      throw new Error(m);
    }
  };

  try {
    // Anthropic (Claude)
    if (config.provider === 'anthropic' && ANTHROPIC_API_KEY) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: modelName,
          max_tokens: config.maxTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt }]
        })
      });
      await throwIfBad(response);
      const json = await response.json();
      throwIfErrorShape(json);
      const text = ensureText(json);
      if (!text) throw new Error('Anthropic returned empty text');
      await storeConversationMemory(prompt, text, { ai_member: member });
      trackCost({ prompt_tokens: json.usage?.input_tokens, completion_tokens: json.usage?.output_tokens }, modelName);
      return text;
    }

    // OpenAI (ChatGPT)
    if (config.provider === 'openai' && OPENAI_API_KEY) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
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
      await throwIfBad(response);
      const json = await response.json();
      throwIfErrorShape(json);
      const text = ensureText(json);
      if (!text) throw new Error('OpenAI returned empty text');
      await storeConversationMemory(prompt, text, { ai_member: member });
      trackCost(json.usage, modelName);
      return text;
    }

    // Google (Gemini)
    if (config.provider === 'google' && GEMINI_API_KEY) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt ? `${systemPrompt}

${prompt}` : prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: config.maxTokens }
          })
        }
      );
      await throwIfBad(response);
      const json = await response.json();
      throwIfErrorShape(json);
      const text = ensureText(json);
      if (!text) throw new Error('Gemini returned empty text');
      await storeConversationMemory(prompt, text, { ai_member: member });
      return text;
    }

    // X.AI (Grok)
    if (config.provider === 'xai' && GROK_API_KEY) {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/jso
          # Syntax check
node --check server.js

# Start server
npm start

# Test repair system
curl -X POST "http://localhost:8080/api/v1/system/repair?key=MySecretKey2025LifeOS" \
  -H "Content-Type: application/json" \
  -d '{"file_path":"README.md","issue":"add documentation","auto_apply":true}'
