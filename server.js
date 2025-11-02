// ════════════════════════════════════════════════════════════════════════════════
// UNIFIED COMMAND CENTER v18.0
// Orchestrator ↔ AI Musicians (Live) • Memory • Task Queue • P&L • Crypto • Files
// DeepSeek optional; auto-fallback to other models if offline/not configured
// ════════════════════════════════════════════════════════════════════════════════

import express from "express";
import dayjs from "dayjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import http from "http";
import WebSocket from "ws";
import crypto from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// RUNTIME BASICS
// ─────────────────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.text({ type: "text/plain", limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

const DATA_DIR = path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ─────────────────────────────────────────────────────────────────────────────
// ENV
// ─────────────────────────────────────────────────────────────────────────────
const {
  HOST = "0.0.0.0",
  PORT = 8080,
  AI_TIER = "medium",
  DATABASE_URL,
  COMMAND_CENTER_KEY = "",
  MAX_DAILY_SPEND = "50.0",
  AI_CALL_TIMEOUT = "30000",

  OPENAI_API_KEY,
  ANTHROPIC_API_KEY,
  GEMINI_API_KEY,
  DEEPSEEK_API_KEY,
  GROK_API_KEY,

  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET
} = process.env;

// ─────────────────────────────────────────────────────────────────────────────
// DB
// ─────────────────────────────────────────────────────────────────────────────
export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL?.includes("neon.tech")
    ? { rejectUnauthorized: false }
    : undefined
});

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversation_memory (
      id SERIAL PRIMARY KEY,
      memory_id TEXT UNIQUE NOT NULL,
      orchestrator_msg TEXT NOT NULL,
      ai_response TEXT NOT NULL,
      key_facts JSONB,
      context_metadata JSONB,
      memory_type TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS file_storage (
      id SERIAL PRIMARY KEY,
      file_id TEXT UNIQUE NOT NULL,
      filename TEXT,
      content TEXT,
      uploaded_by TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS financial_ledger (
      id SERIAL PRIMARY KEY,
      tx_id TEXT UNIQUE NOT NULL,
      type TEXT,                      -- income | expense
      amount DECIMAL(15,2),
      description TEXT,
      category TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS investments (
      id SERIAL PRIMARY KEY,
      inv_id TEXT UNIQUE NOT NULL,
      name TEXT,
      amount DECIMAL(15,2),
      expected_return DECIMAL(10,2),
      status TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS crypto_portfolio (
      id SERIAL PRIMARY KEY,
      crypto_id TEXT UNIQUE NOT NULL,
      symbol TEXT,
      amount DECIMAL(20,8),
      entry_price DECIMAL(15,2),
      current_price DECIMAL(15,2),
      gain_loss_percent DECIMAL(10,2),
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      task_id TEXT UNIQUE NOT NULL,
      description TEXT,
      type TEXT,
      status TEXT,
      priority TEXT,
      progress INT,
      result JSONB,
      error TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ
    );
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_mem_created ON conversation_memory(created_at);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_files_created ON file_storage(created_at);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_fin_created ON financial_ledger(created_at);`);

  console.log("✅ Database initialized");
}
initDb().catch(console.error);

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function requireCommandKey(req, res, next) {
  const key = req.query.key || req.headers["x-command-key"];
  if (!COMMAND_CENTER_KEY || key !== COMMAND_CENTER_KEY)
    return res.status(401).json({ error: "unauthorized" });
  next();
}

async function safeFetch(url, init = {}, retries = 2) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), Number(AI_CALL_TIMEOUT));
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeout);
      const text = await res.text();
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      return {
        ...res,
        json: async () => JSON.parse(text),
        text: async () => text
      };
    } catch (e) {
      lastErr = e;
      if (i === retries) break;
      await sleep(300 * Math.pow(2, i));
    }
  }
  throw lastErr;
}

function extractKeyFacts(message, response) {
  const facts = [];
  const patterns = [
    /(?:we|i|you)\s+(?:need to|should|will|must)\s+([^.!?\n]{10,160})/gi,
    /(?:priority|urgent|critical)\s*[:\-]\s*([^.!?\n]{10,160})/gi,
    /(?:decision|conclusion)\s*[:\-]\s*([^.!?\n]{10,160})/gi,
    /(?:problem|issue)\s*[:\-]\s*([^.!?\n]{10,160})/gi,
    /(?:solution|fix)\s*[:\-]\s*([^.!?\n]{10,160})/gi
  ];
  for (const p of patterns) {
    let m;
    while ((m = p.exec(message)) !== null) {
      if (m[1]) facts.push({ from: "orchestrator", text: m[1].trim() });
    }
  }
  for (const p of patterns) {
    let m;
    const r = String(response);
    while ((m = p.exec(r)) !== null) {
      if (m[1]) facts.push({ from: "ai", text: m[1].trim() });
    }
  }
  return facts.slice(0, 25);
}

async function storeMemory(orchestratorMessage, aiResponse, context = {}) {
  const memId = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const facts = extractKeyFacts(orchestratorMessage, aiResponse);
  await pool.query(
    `INSERT INTO conversation_memory (memory_id, orchestrator_msg, ai_response, key_facts, context_metadata, memory_type)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [memId, orchestratorMessage, aiResponse, JSON.stringify(facts), JSON.stringify(context), context.type || "conversation"]
  );
  return { memId, facts };
}

// ─────────────────────────────────────────────────────────────────────────────
// MODEL TIERS & COUNCIL
// ─────────────────────────────────────────────────────────────────────────────
const MODEL_TIERS = {
  light: {
    openai: "gpt-4o-mini",
    anthropic: "claude-3-haiku-20240307",
    google: "gemini-2.0-flash-exp",
    deepseek: "deepseek-chat"
  },
  medium: {
    openai: "gpt-4o",
    anthropic: "claude-3-5-sonnet-20241022",
    google: "gemini-2.0-flash-exp",
    deepseek: "deepseek-coder"
  },
  heavy: {
    openai: "gpt-4o",
    anthropic: "claude-3-5-sonnet-20241022",
    google: "gemini-2.0-flash-exp",
    deepseek: "deepseek-reasoner"
  }
};
let CURRENT_TIER = AI_TIER || "medium";

const COUNCIL = [
  { name: "Claude",   provider: "anthropic", model: () => MODEL_TIERS[CURRENT_TIER].anthropic, focus: "strategy & clarity" },
  { name: "ChatGPT",  provider: "openai",    model: () => MODEL_TIERS[CURRENT_TIER].openai,    focus: "execution & pragmatism" },
  { name: "Gemini",   provider: "google",    model: () => MODEL_TIERS[CURRENT_TIER].google,    focus: "creativity & variants" },
  { name: "DeepSeek", provider: "deepseek",  model: () => MODEL_TIERS[CURRENT_TIER].deepseek,  focus: "optimization & speed" }
  // { name: "Grok",  provider: "xai", model: "grok-beta" } // optional; add when ready
];

async function callCouncilMember(memberName, prompt, systemHint = "") {
  const cfg = COUNCIL.find(c => c.name.toLowerCase() === memberName.toLowerCase());
  if (!cfg) throw new Error(`Unknown council member: ${memberName}`);

  const modelName = typeof cfg.model === "function" ? cfg.model() : cfg.model;
  const baseSystem = systemHint ? systemHint : `You are ${cfg.name}. Focus: ${cfg.focus}.`;
  const headersJson = { "Content-Type": "application/json" };

  try {
    if (cfg.provider === "anthropic" && ANTHROPIC_API_KEY) {
      const r = await safeFetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { ...headersJson, "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: modelName,
          max_tokens: 1000,
          system: baseSystem,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const j = await r.json();
      return j.content?.[0]?.text || "";
    }
    if (cfg.provider === "openai" && OPENAI_API_KEY) {
      const r = await safeFetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { ...headersJson, Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: modelName,
          temperature: 0.7,
          max_tokens: 1000,
          messages: [
            { role: "system", content: baseSystem },
            { role: "user", content: prompt }
          ]
        })
      });
      const j = await r.json();
      return j.choices?.[0]?.message?.content || "";
    }
    if (cfg.provider === "google" && GEMINI_API_KEY) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
      const r = await safeFetch(url, {
        method: "POST",
        headers: headersJson,
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${baseSystem}\n\n${prompt}` }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
        })
      });
      const j = await r.json();
      return j.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }
    if (cfg.provider === "deepseek" && DEEPSEEK_API_KEY) {
      const r = await safeFetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: { ...headersJson, Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
        body: JSON.stringify({
          model: modelName,
          temperature: 0.7,
          max_tokens: 1000,
          messages: [
            { role: "system", content: baseSystem },
            { role: "user", content: prompt }
          ]
        })
      });
      const j = await r.json();
      return j.choices?.[0]?.message?.content || "";
    }
    // Grok (xAI) placeholder; add once you have a stable key/endpoint
    if (cfg.provider === "xai" && GROK_API_KEY) {
      // Example endpoint (subject to provider docs)
      throw new Error("Grok integration not finalized; skipping");
    }

    throw new Error(`No API key configured for ${cfg.name}`);
  } catch (e) {
    throw e;
  }
}

async function callWithFallback(prompt, preferred = ["Claude", "ChatGPT", "Gemini", "DeepSeek"]) {
  const errors = [];
  for (const name of preferred) {
    try {
      return { name, text: await callCouncilMember(name, prompt) };
    } catch (e) {
      errors.push(`${name}: ${e.message}`);
    }
  }
  return { name: "none", text: `All providers failed.\n${errors.join("\n")}` };
}

// ─────────────────────────────────────────────────────────────────────────────
// TASK QUEUE & EXECUTION
// ─────────────────────────────────────────────────────────────────────────────
class ExecutionQueue {
  constructor() {
    this.queue = [];
    this.active = null;
    this.history = [];
  }

  add(task) {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const full = {
      task_id: taskId,
      description: task.description || "",
      type: task.type || "code_generation",
      status: "queued",
      priority: task.priority || "normal",
      progress: 0,
      result: null,
      error: null,
      created_at: new Date().toISOString()
    };
    this.queue.push(full);
    this.broadcast("task_queued", full);
    pool.query(
      `INSERT INTO tasks (task_id, description, type, status, priority, progress) VALUES ($1,$2,$3,$4,$5,$6)`,
      [taskId, full.description, full.type, full.status, full.priority, full.progress]
    ).catch(() => {});
    return taskId;
  }

  async runNext() {
    if (this.active || this.queue.length === 0) return;
    this.active = this.queue.shift();
    this.active.status = "running";
    this.active.started_at = new Date().toISOString();
    this.broadcast("task_started", this.active);
    await pool.query(`UPDATE tasks SET status='running', started_at=NOW() WHERE task_id=$1`, [this.active.task_id]).catch(()=>{});

    try {
      const result = await this.execute(this.active);
      this.active.status = "completed";
      this.active.completed_at = new Date().toISOString();
      this.active.progress = 100;
      this.active.result = result;
      this.broadcast("task_completed", this.active);
      await pool.query(`UPDATE tasks SET status='completed', completed_at=NOW(), progress=100, result=$2 WHERE task_id=$1`,
        [this.active.task_id, JSON.stringify(result)]).catch(()=>{});
    } catch (e) {
      this.active.status = "failed";
      this.active.completed_at = new Date().toISOString();
      this.active.error = e.message;
      this.broadcast("task_failed", this.active);
      await pool.query(`UPDATE tasks SET status='failed', completed_at=NOW(), error=$2 WHERE task_id=$1`,
        [this.active.task_id, e.message]).catch(()=>{});
    }

    this.history.push(this.active);
    this.active = null;
    setTimeout(() => this.runNext(), 200); // run automatically
  }

  async execute(task) {
    if (task.type === "code_generation") {
      const prompt = `
Generate production-ready code for the following request.
Return ONLY code (no commentary).

Task description:
${task.description}
      `.trim();
      const ans = await callWithFallback(prompt);
      await storeMemory(`Task: ${task.description}`, ans.text, { type: "code_generation", from: ans.name });
      return { provider: ans.name, code: ans.text };
    }

    if (task.type === "memory_store") {
      const { msg, response, context } = task.data || {};
      return await storeMemory(msg || "", response || "", context || { type: "memory" });
    }

    if (task.type === "api_call") {
      const { endpoint, method = "GET", headers = {}, body } = task.data || {};
      const r = await safeFetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json", ...headers },
        body: body ? JSON.stringify(body) : undefined
      });
      const j = await r.json();
      await storeMemory(`API: ${endpoint}`, JSON.stringify(j).slice(0, 2000), { type: "api_execution" });
      return j;
    }

    return { ok: true, echo: task.description };
  }

  broadcast(event, task) {
    const payload = JSON.stringify({ type: "task_update", event, task, timestamp: new Date().toISOString() });
    for (const ws of clients.values()) if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  }

  status() {
    return {
      queued: this.queue.length,
      active: this.active,
      history: this.history.slice(-25)
    };
  }
}
const execQueue = new ExecutionQueue();

// ─────────────────────────────────────────────────────────────────────────────
// FINANCE (P&L / Investments / Crypto)
// ─────────────────────────────────────────────────────────────────────────────
const finance = {
  async record(type, amount, description, category = "general") {
    const txId = `tx_${Date.now()}`;
    await pool.query(
      `INSERT INTO financial_ledger (tx_id, type, amount, description, category) VALUES ($1,$2,$3,$4,$5)`,
      [txId, type, amount, description, category]
    );
    broadcast({ type: "financial_update", txId, type2: type, amount, description, category });
  },

  async addInvestment(name, amount, expectedReturn, status = "active") {
    const id = `inv_${Date.now()}`;
    await pool.query(
      `INSERT INTO investments (inv_id, name, amount, expected_return, status) VALUES ($1,$2,$3,$4,$5)`,
      [id, name, amount, expectedReturn, status]
    );
    broadcast({ type: "investment_update", id, name, amount, expectedReturn, status });
  },

  async addCrypto(symbol, amount, entryPrice, currentPrice) {
    const id = `crypto_${Date.now()}`;
    const gain = ((currentPrice - entryPrice) / entryPrice) * 100;
    await pool.query(
      `INSERT INTO crypto_portfolio (crypto_id, symbol, amount, entry_price, current_price, gain_loss_percent)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, symbol, amount, entryPrice, currentPrice, gain]
    );
    broadcast({ type: "crypto_update", id, symbol, amount, entryPrice, currentPrice, gain });
  },

  async dashboard() {
    const dayStart = dayjs().startOf("day").toDate();
    const dayEnd   = dayjs().endOf("day").toDate();
    const moStart  = dayjs().startOf("month").toDate();
    const moEnd    = dayjs().endOf("month").toDate();

    const dailyQ = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type='income' THEN amount END),0) daily_income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount END),0) daily_expenses
       FROM financial_ledger WHERE created_at BETWEEN $1 AND $2`,
      [dayStart, dayEnd]
    );
    const monthlyQ = await pool.query(
      `SELECT
        COALESCE(SUM(CASE WHEN type='income' THEN amount END),0) monthly_income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount END),0) monthly_expenses
       FROM financial_ledger WHERE created_at BETWEEN $1 AND $2`,
      [moStart, moEnd]
    );
    const invQ = await pool.query(`SELECT * FROM investments ORDER BY created_at DESC LIMIT 50`);
    const cryptoQ = await pool.query(`SELECT * FROM crypto_portfolio ORDER BY created_at DESC LIMIT 50`);
    const totalCryptoValue = cryptoQ.rows.reduce((s, r) => s + Number(r.amount) * Number(r.current_price), 0);
    const totalCryptoGain = cryptoQ.rows.reduce((s, r) => s + (Number(r.current_price) - Number(r.entry_price)) * Number(r.amount), 0);

    return {
      daily: {
        income: Number(dailyQ.rows[0].daily_income || 0),
        expenses: Number(dailyQ.rows[0].daily_expenses || 0),
        net: Number(dailyQ.rows[0].daily_income || 0) - Number(dailyQ.rows[0].daily_expenses || 0)
      },
      monthly: {
        income: Number(monthlyQ.rows[0].monthly_income || 0),
        expenses: Number(monthlyQ.rows[0].monthly_expenses || 0),
        net: Number(monthlyQ.rows[0].monthly_income || 0) - Number(monthlyQ.rows[0].monthly_expenses || 0)
      },
      investments: invQ.rows,
      crypto: {
        positions: cryptoQ.rows,
        totalValue: totalCryptoValue,
        totalGain: totalCryptoGain,
        gainPercent: totalCryptoValue ? (totalCryptoGain / (totalCryptoValue - totalCryptoGain)) * 100 : 0
      }
    };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// WEBSOCKETS (Control & Command)
// ─────────────────────────────────────────────────────────────────────────────
const clients = new Map();
function broadcast(obj) {
  const msg = JSON.stringify(obj);
  for (const ws of clients.values()) if (ws.readyState === WebSocket.OPEN) ws.send(msg);
}

wss.on("connection", (ws, req) => {
  const id = `client_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
  clients.set(id, ws);

  ws.send(JSON.stringify({
    type: "connection",
    status: "connected",
    clientId: id,
    message: "Connected to Unified Command Center v18.0"
  }));

  ws.on("message", async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      switch (msg.type) {
        case "conversation": {
          const historyContext = msg.context || {};
          const prompt = msg.text || "";
          // primary call with fallback
          const ans = await callWithFallback(prompt);
          await storeMemory(prompt, ans.text, { clientId: id, source: ans.name });
          ws.send(JSON.stringify({ type: "conversation_response", response: ans.text, memoryStored: true }));
          // auto-extract executable tasks
          const extracted = extractExecutableTasks(ans.text);
          for (const t of extracted) execQueue.add(t);
          execQueue.runNext();
          if (extracted.length > 0) {
            ws.send(JSON.stringify({ type: "tasks_queued", count: extracted.length, tasks: extracted }));
          }
          break;
        }
        case "command": {
          const cmd = msg.command;
          if (cmd === "start_queue") execQueue.runNext();
          if (cmd === "queue_status") ws.send(JSON.stringify({ type: "command_response", status: execQueue.status() }));
          if (cmd === "clear_queue") execQueue.queue = [];
          break;
        }
        case "memory_query": {
          const q = String(msg.query || "").slice(0, 100);
          const rows = await pool.query(
            `SELECT memory_id, orchestrator_msg, ai_response, key_facts, created_at
             FROM conversation_memory
             WHERE orchestrator_msg ILIKE $1 OR ai_response ILIKE $1
             ORDER BY created_at DESC LIMIT $2`,
            [`%${q}%`, Math.min(Number(msg.limit||20), 100)]
          );
          ws.send(JSON.stringify({
            type: "memory_results",
            count: rows.rows.length,
            memories: rows.rows.map(r => ({
              id: r.memory_id,
              orchestrator: r.orchestrator_msg,
              ai: r.ai_response,
              keyFacts: r.key_facts,
              date: r.created_at
            }))
          }));
          break;
        }
        case "upload_file": {
          const { filename = `file_${Date.now()}`, content = "" } = msg;
          const fileId = `file_${Date.now()}`;
          await pool.query(
            `INSERT INTO file_storage (file_id, filename, content, uploaded_by) VALUES ($1,$2,$3,$4)`,
            [fileId, filename, String(content), id]
          );
          await storeMemory(`File uploaded: ${filename}`, `Stored as ${fileId}`, { type: "file_upload", fileId, filename });
          ws.send(JSON.stringify({ type: "file_uploaded", fileId, filename, message: "File stored & indexed" }));
          break;
        }
        case "task_submit": {
          const { description, type, priority, context } = msg;
          const taskId = execQueue.add({ description, type, priority, context });
          execQueue.runNext();
          ws.send(JSON.stringify({ type: "task_submitted", taskId, message: "Queued" }));
          break;
        }
        case "financial_record": {
          const { transactionType, amount, description, category, investmentData, cryptoData } = msg;
          if (transactionType && amount) await finance.record(transactionType, amount, description, category);
          if (investmentData) await finance.addInvestment(investmentData.name, investmentData.amount, investmentData.expectedReturn);
          if (cryptoData) await finance.addCrypto(cryptoData.symbol, cryptoData.amount, cryptoData.entryPrice, cryptoData.currentPrice);
          ws.send(JSON.stringify({ type: "financial_recorded", ok: true }));
          break;
        }
        case "get_dashboard": {
          ws.send(JSON.stringify({ type: "dashboard_data", dashboard: await finance.dashboard() }));
          break;
        }
      }
    } catch (e) {
      ws.send(JSON.stringify({ type: "error", error: e.message }));
    }
  });

  ws.on("close", () => clients.delete(id));
});

// Extract executable tasks by pattern
function extractExecutableTasks(text) {
  const tasks = [];
  const patterns = [
    /(?:^|\n)\s*generate\s*:\s*([^.\n]{10,200})/gi,
    /(?:^|\n)\s*create\s*:\s*([^.\n]{10,200})/gi,
    /(?:^|\n)\s*build\s*:\s*([^.\n]{10,200})/gi,
    /(?:^|\n)\s*execute\s*:\s*([^.\n]{10,200})/gi
  ];
  for (const p of patterns) {
    let m;
    while ((m = p.exec(text)) !== null) {
      const desc = m[1].trim();
      tasks.push({ type: "code_generation", description: desc, priority: "high" });
    }
  }
  return tasks.slice(0, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// REST: health, dashboard, memory search (backup for UI)
// ─────────────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.send("OK"));

app.get("/healthz", async (_req, res) => {
  try {
    await pool.query("SELECT now()");
    res.json({
      status: "healthy",
      version: "v18.0",
      tier: CURRENT_TIER,
      connections: clients.size,
      features: [
        "WebSocket live chat",
        "Automatic memory",
        "Task queue",
        "Financial dashboard",
        "Crypto tracking",
        "File upload/indexing",
        "Council with fallback"
      ]
    });
  } catch (e) {
    res.status(500).json({ status: "unhealthy", error: String(e) });
  }
});

app.get("/api/v1/dashboard", async (_req, res) => {
  try {
    res.json({ ok: true, dashboard: await finance.dashboard() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/v1/memory/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").slice(0, 100);
    const rows = await pool.query(
      `SELECT * FROM conversation_memory
       WHERE orchestrator_msg ILIKE $1 OR ai_response ILIKE $1
       ORDER BY created_at DESC LIMIT 50`,
      [`%${q}%`]
    );
    res.json({ ok: true, count: rows.rows.length, results: rows.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Optional: protect some admin routes
app.get("/api/v1/queue/status", requireCommandKey, (_req, res) => res.json({ ok: true, status: execQueue.status() }));

// ─────────────────────────────────────────────────────────────────────────────
// START
// ─────────────────────────────────────────────────────────────────────────────
server.listen(Number(PORT), HOST, () => {
  console.log(`\n${"═".repeat(80)}`);
  console.log(`✅ UNIFIED COMMAND CENTER v18.0`);
  console.log(`${"═".repeat(80)}`);
  console.log(`Server:  http://${HOST}:${PORT}`);
  console.log(`Overlay: http://${HOST}:${PORT}/overlay/command-center.html`);
  console.log(`Tier: ${CURRENT_TIER} | Connections: 0`);
  console.log(`${"═".repeat(80)}\n`);
});
