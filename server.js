/**
 * ╔═════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                                                 ║
 * ║   🎼 UNIFIED COMMAND CENTER v18.0 — SELF-HEALING • COUNCIL • SCALING • UI       ║
 * ║                                                                                 ║
 * ║   Merges your 2k-line spec + short server: DB schema, council, routing,        ║
 * ║   fallbacks, self-repair, improvement loop, GitHub commits, backups, overlay.   ║
 * ║                                                                                 ║
 * ╚═════════════════════════════════════════════════════════════════════════════════╝
 */

import "dotenv/config";
import express from "express";
import dayjs from "dayjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import axios from "axios";
import crypto from "crypto";
import { Pool } from "pg";
import { WebSocketServer } from "ws";

// ──────────────────────────────────────────────────────────────────────────────
// Setup
// ──────────────────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Data dirs for self-healing state & backups
const DATA_DIR = path.join(__dirname, "data");
const BACKUP_DIR = path.join(DATA_DIR, "backups");
const STATE_FILE = path.join(DATA_DIR, "system-state.json");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

// ──────────────────────────────────────────────────────────────────────────────
/** ENV */
// ──────────────────────────────────────────────────────────────────────────────
const {
  // Platform
  HOST = "0.0.0.0",
  PORT = 8080,
  LOG_LEVEL = "info",
  AI_TIER = "medium",

  // Keys & DB
  COMMAND_CENTER_KEY,
  DATABASE_URL,

  // Providers
  ANTHROPIC_API_KEY,
  OPENAI_API_KEY,
  GEMINI_API_KEY,
  DEEPSEEK_API_KEY,
  XAI_API_KEY,
  TOGETHER_API_KEY,
  HUGGING_FACE_API_KEY,

  // DeepSeek local first
  DEEPSEEK_URL,

  // GitHub
  GITHUB_TOKEN,
  GITHUB_REPO = "LimitlessOI/Lumin-LifeOS"
} = process.env;

// ──────────────────────────────────────────────────────────────────────────────
/** Logger */
// ──────────────────────────────────────────────────────────────────────────────
class Logger {
  constructor(level = LOG_LEVEL) {
    this.level = level;
    this.map = { debug: 0, info: 1, warn: 2, error: 3 };
  }
  ok(lvl) { return this.map[lvl] >= this.map[this.level]; }
  log(lvl, section, msg, data) {
    if (!this.ok(lvl)) return;
    const emoji = { debug: "🔍", info: "ℹ️", warn: "⚠️", error: "❌" }[lvl];
    const ts = new Date().toISOString();
    console.log(`${emoji} [${ts}] [${section}] ${msg}`, data ?? "");
  }
  debug(s, m, d) { this.log("debug", s, m, d); }
  info(s, m, d)  { this.log("info", s, m, d); }
  warn(s, m, d)  { this.log("warn", s, m, d); }
  error(s, m, d) { this.log("error", s, m, d); }
}
const logger = new Logger();

// ──────────────────────────────────────────────────────────────────────────────
/** DB (optional) + helpers */
// ──────────────────────────────────────────────────────────────────────────────
let pool = null;
if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });
}

async function dbQuery(sql, params = []) {
  if (!pool) {
    logger.warn("DATABASE", "No DATABASE_URL set — skipping DB write.");
    return { rows: [], rowCount: 0 };
  }
  return pool.query(sql, params);
}

async function initDb() {
  if (!pool) { logger.warn("DATABASE", "Skipping schema init (no DB)."); return; }
  logger.info("DATABASE", "Initializing schema...");
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS conversation_memory(
      id SERIAL PRIMARY KEY,
      memory_id TEXT UNIQUE NOT NULL,
      orchestrator_msg TEXT NOT NULL,
      ai_response TEXT NOT NULL,
      key_facts JSONB,
      context_metadata JSONB,
      memory_type TEXT DEFAULT 'conversation',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_memory_id ON conversation_memory(memory_id);
    CREATE INDEX IF NOT EXISTS idx_memory_created ON conversation_memory(created_at);
  `);

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS ai_council_improvements(
      id SERIAL PRIMARY KEY,
      improvement_id TEXT UNIQUE NOT NULL,
      ai_member TEXT NOT NULL,
      proposal TEXT NOT NULL,
      rationale TEXT,
      risk_level TEXT DEFAULT 'low',
      benefit_score DECIMAL(3,1),
      risk_score DECIMAL(3,1),
      complexity_score DECIMAL(3,1),
      status TEXT DEFAULT 'proposed',
      adoption_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      proposed_date TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_improvement_ai ON ai_council_improvements(ai_member);
    CREATE INDEX IF NOT EXISTS idx_improvement_status ON ai_council_improvements(status);
  `);

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS improvement_adoption(
      id SERIAL PRIMARY KEY,
      improvement_id TEXT NOT NULL,
      adopted_by_ai TEXT,
      adoption_date TIMESTAMPTZ DEFAULT NOW(),
      success_metric DECIMAL(5,2),
      failures_count INTEGER DEFAULT 0,
      rollback_attempted BOOLEAN DEFAULT FALSE,
      notes TEXT,
      FOREIGN KEY (improvement_id) REFERENCES ai_council_improvements(improvement_id)
    );
  `);

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS api_error_log(
      id SERIAL PRIMARY KEY,
      error_id TEXT UNIQUE NOT NULL,
      api_provider TEXT NOT NULL,
      model_name TEXT,
      error_type TEXT,
      error_message TEXT,
      status_code INTEGER,
      request_tokens INTEGER,
      response_tokens INTEGER,
      recovery_action TEXT,
      recovery_successful BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_error_provider ON api_error_log(api_provider);
    CREATE INDEX IF NOT EXISTS idx_error_created ON api_error_log(created_at);
  `);

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS model_performance(
      id SERIAL PRIMARY KEY,
      model_name TEXT NOT NULL,
      provider TEXT NOT NULL,
      total_requests INTEGER DEFAULT 0,
      successful_requests INTEGER DEFAULT 0,
      failed_requests INTEGER DEFAULT 0,
      avg_response_time_ms DECIMAL(10,2),
      avg_cost_per_request DECIMAL(8,6),
      last_used TIMESTAMPTZ,
      reliability_score DECIMAL(5,2),
      cost_efficiency_score DECIMAL(5,2),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS sandbox_tests(
      id SERIAL PRIMARY KEY,
      test_id TEXT UNIQUE NOT NULL,
      improvement_id TEXT NOT NULL,
      test_input TEXT,
      expected_output TEXT,
      actual_output TEXT,
      test_result TEXT,
      success BOOLEAN,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      FOREIGN KEY (improvement_id) REFERENCES ai_council_improvements(improvement_id)
    );
  `);

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS daily_diagnostics(
      id SERIAL PRIMARY KEY,
      diagnostic_id TEXT UNIQUE NOT NULL,
      diagnostic_date DATE,
      total_api_calls INTEGER,
      failed_api_calls INTEGER,
      avg_response_time DECIMAL(10,2),
      error_recovery_rate DECIMAL(5,2),
      improvements_proposed INTEGER,
      improvements_adopted INTEGER,
      system_health_score DECIMAL(5,2),
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  logger.info("DATABASE", "Schema initialized.");
}

// ──────────────────────────────────────────────────────────────────────────────
/** AI Council config */
// ──────────────────────────────────────────────────────────────────────────────
const COUNCIL_MEMBERS = {
  claude: {
    name: "Claude",
    official_name: "Claude Sonnet 3.5",
    model: "claude-3-5-sonnet-20241022",
    provider: "anthropic",
    role: "Strategy & Architecture",
    focus: "long-term strategy, code quality, system design",
    tier: "heavy",
    maxTokens: 4096,
    costPer1kTokens: 0.003,
    active: !!ANTHROPIC_API_KEY,
    fallbacks: ["chatgpt", "gemini"]
  },
  chatgpt: {
    name: "ChatGPT",
    official_name: "GPT-4o",
    model: "gpt-4o",
    provider: "openai",
    role: "Execution & Debugging",
    focus: "practical solutions, speed, debugging",
    tier: "heavy",
    maxTokens: 4096,
    costPer1kTokens: 0.015,
    active: !!OPENAI_API_KEY,
    fallbacks: ["claude", "gemini"]
  },
  gemini: {
    name: "Gemini",
    official_name: "Gemini 2.0 Flash (exp)",
    model: "gemini-2.0-flash-exp",
    provider: "google",
    role: "Innovation & Multimodal",
    focus: "novel approaches, multimodal analysis",
    tier: "medium",
    maxTokens: 8192,
    costPer1kTokens: 0.00075,
    active: !!GEMINI_API_KEY,
    fallbacks: ["claude", "mistral-large"]
  },
  deepseek: {
    name: "DeepSeek",
    official_name: "DeepSeek-Chat",
    model: "deepseek-chat",
    provider: "deepseek",
    role: "Optimization & Efficiency",
    focus: "optimization, edge cases",
    tier: "medium",
    maxTokens: 4096,
    costPer1kTokens: 0.0001,
    active: !!DEEPSEEK_API_KEY || !!DEEPSEEK_URL,
    fallbacks: ["gemini", "mistral-large"]
  },
  grok: {
    name: "Grok",
    official_name: "XAI Grok",
    model: "grok-beta",
    provider: "xai",
    role: "Feasibility & Risk",
    focus: "reality checks, risk assessment",
    tier: "light",
    maxTokens: 4096,
    costPer1kTokens: 0.00015,
    active: !!XAI_API_KEY,
    fallbacks: ["claude", "mistral-medium"]
  },
  "mistral-large": {
    name: "Mistral Large",
    official_name: "Mistral Large Instruct",
    model: "mistralai/Mistral-Large-Instruct-2407",
    provider: "together",
    role: "Technical Excellence",
    focus: "code generation, reasoning, efficiency",
    tier: "medium",
    maxTokens: 8192,
    costPer1kTokens: 0.0002,
    active: !!TOGETHER_API_KEY,
    fallbacks: ["claude", "mistral-medium"]
  },
  "mistral-medium": {
    name: "Mistral Medium",
    official_name: "Mistral 7B Instruct v0.3",
    model: "mistralai/Mistral-7B-Instruct-v0.3",
    provider: "together",
    role: "Fast Execution",
    focus: "lightweight tasks",
    tier: "light",
    maxTokens: 4096,
    costPer1kTokens: 0.00005,
    active: !!TOGETHER_API_KEY,
    fallbacks: ["mistral-large", "claude"]
  },
  "llama-3.1": {
    name: "Llama 3.1",
    official_name: "Meta Llama 3.1 70B",
    model: "meta-llama/Llama-3.1-70b-Instruct-Turbo",
    provider: "together",
    role: "General Purpose",
    focus: "balanced multi-domain",
    tier: "heavy",
    maxTokens: 8192,
    costPer1kTokens: 0.00009,
    active: !!TOGETHER_API_KEY,
    fallbacks: ["mistral-large", "claude"]
  },
  "qwen-72b": {
    name: "Qwen 72B",
    official_name: "Alibaba Qwen-72B",
    model: "Qwen/Qwen-72B-Chat",
    provider: "together",
    role: "Multilingual",
    focus: "multilingual + culture",
    tier: "heavy",
    maxTokens: 4096,
    costPer1kTokens: 0.0001,
    active: !!TOGETHER_API_KEY,
    fallbacks: ["llama-3.1", "mistral-large"]
  }
};

const MODEL_TIERS = {
  light:  { models: ["grok", "mistral-medium"], maxCostPerCall: 0.01,  parallelLimit: 5 },
  medium: { models: ["deepseek", "gemini", "mistral-large"], maxCostPerCall: 0.05, parallelLimit: 3 },
  heavy:  { models: ["claude", "chatgpt", "llama-3.1"], maxCostPerCall: 0.15, parallelLimit: 1 }
};

// ──────────────────────────────────────────────────────────────────────────────
/** Model Router */
// ──────────────────────────────────────────────────────────────────────────────
class ModelRouter {
  constructor() { this.modelStats = new Map(); }
  selectModel(complexity, budget, available = null) {
    const active = (available || Object.keys(COUNCIL_MEMBERS))
      .filter(m => COUNCIL_MEMBERS[m]?.active);
    if (!active.length) return "claude";
    const tier = complexity > 7 ? "heavy" : complexity > 3 ? "medium" : "light";
    const tierList = MODEL_TIERS[tier].models.filter(m => active.includes(m));
    if (!tierList.length) return active[0];
    let best = tierList[0], bestScore = -Infinity;
    for (const m of tierList) {
      const s = this.modelStats.get(m) || { reliability: 0.9, costEfficiency: 0.8 };
      const score = (s.reliability * 0.6) + (s.costEfficiency * 0.4);
      if (score > bestScore) { best = m; bestScore = score; }
    }
    return best;
  }
  update(model, success, ms, cost) {
    const s = this.modelStats.get(model) || {
      totalRequests: 0, successfulRequests: 0, avgResponseTime: 0, avgCost: 0,
      reliability: 0.9, costEfficiency: 0.8
    };
    s.totalRequests++; if (success) s.successfulRequests++;
    s.avgResponseTime = (s.avgResponseTime * (s.totalRequests - 1) + ms) / s.totalRequests;
    s.avgCost = (s.avgCost * (s.totalRequests - 1) + cost) / s.totalRequests;
    s.reliability = s.successfulRequests / s.totalRequests;
    s.costEfficiency = s.avgCost > 0 ? 1 / s.avgCost : 1;
    this.modelStats.set(model, s);
  }
}
const modelRouter = new ModelRouter();

// ──────────────────────────────────────────────────────────────────────────────
/** AI callers */
// ──────────────────────────────────────────────────────────────────────────────
async function callCouncilMember(member, prompt, options = {}) {
  const start = Date.now();
  const cfg = COUNCIL_MEMBERS[member];
  if (!cfg) return { success: false, error: `Unknown member: ${member}` };
  if (!cfg.active) return { success: false, error: `Member ${member} is not active (no API key)` };

  const systemPrompt = `You are ${cfg.name}. Role: ${cfg.role}. Focus: ${cfg.focus}.`;

  try {
    let result;
    switch (cfg.provider) {
      case "anthropic": result = await callAnthropic(cfg.model, systemPrompt, prompt); break;
      case "openai":    result = await callOpenAI(cfg.model, systemPrompt, prompt); break;
      case "google":    result = await callGoogle(cfg.model, systemPrompt, prompt); break;
      case "deepseek":  result = await callDeepSeek(cfg.model, systemPrompt, prompt); break;
      case "xai":       result = await callXAI(cfg.model, systemPrompt, prompt); break;
      case "together":  result = await callTogether(cfg.model, systemPrompt, prompt); break;
      default: throw new Error(`Unknown provider: ${cfg.provider}`);
    }
    const ms = Date.now() - start;
    modelRouter.update(member, true, ms, result.cost || 0);
    return { ...result, responseTime: ms, member };
  } catch (err) {
    const ms = Date.now() - start;
    logger.error("CALL_COUNCIL", `[${member}] ${err.message}`);
    await logAPIError(member, cfg.model, err);
    modelRouter.update(member, false, ms, 0);
    return { success: false, error: err.message, responseTime: ms, member };
  }
}

async function callAnthropic(model, system, user) {
  const r = await axios.post("https://api.anthropic.com/v1/messages", {
    model, max_tokens: 4096, system, messages: [{ role: "user", content: user }]
  }, {
    headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" }, timeout: 30000
  });
  const text = r.data.content?.[0]?.text || "";
  const inTok = r.data.usage?.input_tokens || 0, outTok = r.data.usage?.output_tokens || 0;
  const cost = (inTok * 0.003 + outTok * 0.015) / 1000;
  return { success: true, response: text, inputTokens: inTok, outputTokens: outTok, cost };
}

async function callOpenAI(model, system, user) {
  const r = await axios.post("https://api.openai.com/v1/chat/completions", {
    model, temperature: 0.7, max_tokens: 4096,
    messages: [{ role: "system", content: system }, { role: "user", content: user }]
  }, {
    headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` }, timeout: 30000
  });
  const text = r.data.choices?.[0]?.message?.content || "";
  const inTok = r.data.usage?.prompt_tokens || 0, outTok = r.data.usage?.completion_tokens || 0;
  const cost = (inTok * 0.015 + outTok * 0.06) / 1000;
  return { success: true, response: text, inputTokens: inTok, outputTokens: outTok, cost };
}

async function callGoogle(model, system, user) {
  const r = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    { system_instruction: { parts: [{ text: system }] }, contents: [{ parts: [{ text: user }] }] },
    { params: { key: GEMINI_API_KEY }, timeout: 30000 }
  );
  const text = r.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const inTok = r.data.usageMetadata?.prompt_token_count || 0;
  const outTok = r.data.usageMetadata?.candidates_token_count || 0;
  const cost = (inTok * 0.00075 + outTok * 0.003) / 1000;
  return { success: true, response: text, inputTokens: inTok, outputTokens: outTok, cost };
}

async function callDeepSeek(model, system, user) {
  // Try local gateway first
  if (DEEPSEEK_URL) {
    try {
      const r = await axios.post(`${DEEPSEEK_URL}/v1/chat/completions`, {
        model, messages: [{ role: "system", content: system }, { role: "user", content: user }], max_tokens: 1024
      }, { timeout: 20000 });
      const text = r.data.choices?.[0]?.message?.content || "";
      return { success: true, response: text, inputTokens: 0, outputTokens: 0, cost: 0 };
    } catch (e) {
      logger.warn("DEEPSEEK", `Local failed: ${e.message}, trying cloud...`);
    }
  }
  if (!DEEPSEEK_API_KEY) throw new Error("DeepSeek not configured");
  const r = await axios.post("https://api.deepseek.com/v1/chat/completions", {
    model, messages: [{ role: "system", content: system }, { role: "user", content: user }], max_tokens: 1024
  }, { headers: { "Authorization": `Bearer ${DEEPSEEK_API_KEY}` }, timeout: 30000 });
  const text = r.data.choices?.[0]?.message?.content || "";
  const inTok = r.data.usage?.prompt_tokens || 0, outTok = r.data.usage?.completion_tokens || 0;
  const cost = (inTok * 0.0001 + outTok * 0.0002) / 1000;
  return { success: true, response: text, inputTokens: inTok, outputTokens: outTok, cost };
}

async function callXAI(model, system, user) {
  const r = await axios.post("https://api.x.ai/v1/chat/completions", {
    model, messages: [{ role: "system", content: system }, { role: "user", content: user }], max_tokens: 4096
  }, { headers: { "Authorization": `Bearer ${XAI_API_KEY}` }, timeout: 30000 });
  const text = r.data.choices?.[0]?.message?.content || "";
  const inTok = r.data.usage?.prompt_tokens || 0, outTok = r.data.usage?.completion_tokens || 0;
  const cost = (inTok * 0.00015 + outTok * 0.0006) / 1000;
  return { success: true, response: text, inputTokens: inTok, outputTokens: outTok, cost };
}

async function callTogether(model, system, user) {
  const r = await axios.post("https://api.together.xyz/v1/chat/completions", {
    model, temperature: 0.7, max_tokens: 4096,
    messages: [{ role: "system", content: system }, { role: "user", content: user }]
  }, { headers: { "Authorization": `Bearer ${TOGETHER_API_KEY}` }, timeout: 30000 });
  const text = r.data.choices?.[0]?.message?.content || "";
  const inTok = r.data.usage?.prompt_tokens || 0, outTok = r.data.usage?.completion_tokens || 0;
  const cost = (inTok * 0.00005 + outTok * 0.00015) / 1000;
  return { success: true, response: text, inputTokens: inTok, outputTokens: outTok, cost };
}

// ──────────────────────────────────────────────────────────────────────────────
/** Fallback chain */
// ──────────────────────────────────────────────────────────────────────────────
async function callCouncilMemberWithFallback(member, prompt, depth = 0) {
  const cfg = COUNCIL_MEMBERS[member];
  if (!cfg) return { success: false, error: `Unknown member: ${member}` };
  const res = await callCouncilMember(member, prompt);
  if (res.success) return res;
  if (!cfg.fallbacks?.length || depth >= 3) return { ...res, error: res.error || "All models failed" };
  for (const fb of cfg.fallbacks) {
    const r = await callCouncilMemberWithFallback(fb, prompt, depth + 1);
    if (r.success) return { ...r, original_member: member, fallback_chain: true };
  }
  return { success: false, error: "All fallbacks exhausted", tried_members: [member, ...cfg.fallbacks] };
}

// ──────────────────────────────────────────────────────────────────────────────
/** Error log */
// ──────────────────────────────────────────────────────────────────────────────
async function logAPIError(member, model, error) {
  const id = `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await dbQuery(
    `INSERT INTO api_error_log(error_id, api_provider, model_name, error_type, error_message, created_at)
     VALUES($1,$2,$3,$4,$5,now())`,
    [id, member, model, error.code || "UNKNOWN", error.message || "Unknown error"]
  );
  return id;
}

// ──────────────────────────────────────────────────────────────────────────────
/** Consensus & Debate */
// ──────────────────────────────────────────────────────────────────────────────
async function checkUnanimity(question, members = null) {
  const consult = (members || Object.keys(COUNCIL_MEMBERS)).filter(m => COUNCIL_MEMBERS[m].active);
  const responses = [];
  for (const m of consult) {
    const r = await callCouncilMember(m, `Question: ${question}\nRespond with ONLY: AGREE or DISAGREE`);
    if (r.success) {
      responses.push({ member: m, response: /AGREE/i.test(r.response) ? "AGREE" : "DISAGREE", full_response: r.response });
    }
  }
  const agrees = responses.filter(r => r.response === "AGREE").length;
  return { unanimous: agrees === responses.length, agreement_rate: responses.length ? (agrees / responses.length * 100).toFixed(1) : "0.0", total_members: responses.length, responses };
}

async function councilConsensusWithDebate(question, members = null) {
  const consult = (members || Object.keys(COUNCIL_MEMBERS)).filter(m => COUNCIL_MEMBERS[m].active);

  // Round 1: proposals
  const proposals = {};
  for (const m of consult) {
    const r = await callCouncilMember(m, `Question: ${question}\nProvide a concise answer (2-3 sentences).`);
    if (r.success) proposals[m] = r.response;
  }

  // Round 2: rebuttals
  const rebuttals = {};
  for (const m of consult) {
    const others = Object.entries(proposals).filter(([k]) => k !== m).map(([k, v]) => `${k}: ${v}`).join("\n\n");
    const r = await callCouncilMember(m, `Original question: ${question}\nYour position: ${proposals[m] || ""}\nOther positions:\n${others}\nRespond in 2-3 sentences defending or revising your position.`);
    if (r.success) rebuttals[m] = r.response;
  }

  // Round 3: scoring
  const scoring = {};
  for (const m of consult) {
    const r = await callCouncilMember(m, `Evaluate this answer to "${question}":\n\n${proposals[m] || ""}\nScores (0-10):\nRisk, Benefit, Feasibility\nRespond exactly: Risk:X, Benefit:X, Feasibility:X`);
    const risk = parseInt(/Risk:\s*(\d+)/i.exec(r.response)?.[1] || 5, 10);
    const benefit = parseInt(/Benefit:\s*(\d+)/i.exec(r.response)?.[1] || 5, 10);
    const feas = parseInt(/Feasibility:\s*(\d+)/i.exec(r.response)?.[1] || 5, 10);
    scoring[m] = { risk, benefit, feasibility: feas };
  }

  // Recommendation (default to Claude)
  const rec = await callCouncilMemberWithFallback("claude",
    `Based on council debate for: "${question}"\nProposals:\n${Object.entries(proposals).map(([k, v]) => `${k}: ${v}`).join("\n\n")}\nProvide ONE clear recommendation.`);

  return {
    question,
    proposals,
    rebuttals,
    scoring,
    recommendation: rec.success ? rec.response : "",
    debate_members: consult,
    timestamp: new Date().toISOString()
  };
}

// ──────────────────────────────────────────────────────────────────────────────
/** Self-Repair Engine */
// ──────────────────────────────────────────────────────────────────────────────
class SelfRepairEngine {
  async runDailyDiagnostics() {
    const diagnosticId = `diag_${Date.now()}`;
    const apiConnectivity = await this.checkAPIConnectivity();
    const dbHealth = await this.checkDatabaseHealth();
    const modelPerf = await this.checkModelPerformance();
    const errorRecovery = await this.checkErrorRecovery();

    const scores = [
      apiConnectivity.score || 0,
      dbHealth.score || 0,
      modelPerf.avgScore || 0,
      errorRecovery.score || 0
    ];
    const healthScore = scores.reduce((a,b) => a + b, 0) / (scores.length || 1);
    await dbQuery(
      `INSERT INTO daily_diagnostics(diagnostic_id, diagnostic_date, system_health_score, notes, created_at)
       VALUES($1, now()::date, $2, $3, now())`,
      [diagnosticId, healthScore, JSON.stringify({ apiConnectivity, dbHealth, modelPerf, errorRecovery })]
    );
    return { diagnosticId, healthScore, diagnostics: { apiConnectivity, databaseHealth: dbHealth, modelPerformance: modelPerf, errorRecovery } };
  }

  async checkAPIConnectivity() {
    const status = { activeAPIs: [], failedAPIs: [] };
    for (const [k, m] of Object.entries(COUNCIL_MEMBERS)) {
      if (!m.active) continue;
      try {
        const r = await callCouncilMember(k, "Respond with: OK");
        if (r.success) status.activeAPIs.push(k); else status.failedAPIs.push(k);
      } catch { status.failedAPIs.push(k); }
    }
    const total = status.activeAPIs.length + status.failedAPIs.length;
    status.score = total ? (status.activeAPIs.length / total) * 10 : 0;
    return status;
    }

  async checkDatabaseHealth() {
    try {
      if (!pool) return { connected: false, score: 0, note: "No DATABASE_URL" };
      const r = await dbQuery("SELECT NOW()");
      return { connected: !!r.rows?.length, score: r.rows?.length ? 10 : 0 };
    } catch (e) {
      return { connected: false, score: 0, error: e.message };
    }
  }

  async checkModelPerformance() {
    const models = {};
    for (const [model, s] of modelRouter.modelStats) {
      const score = (s.reliability * 0.6 + s.costEfficiency * 0.4) * 10;
      models[model] = { reliability: s.reliability, costEfficiency: s.costEfficiency, score };
    }
    const vals = Object.values(models).map(m => m.score);
    return { models, avgScore: vals.length ? vals.reduce((a,b)=>a+b)/vals.length : 0 };
  }

  async checkErrorRecovery() {
    try {
      const r = await dbQuery(`
        SELECT COUNT(*)::int as total, SUM(CASE WHEN recovery_successful THEN 1 ELSE 0 END)::int as successful
        FROM api_error_log WHERE created_at > now() - interval '24 hours'`);
      const total = r.rows?.[0]?.total || 0;
      const successful = r.rows?.[0]?.successful || 0;
      const rate = total ? (successful / total) * 100 : 100;
      return { total_errors: total, successful_recoveries: successful, recovery_rate: rate.toFixed(1), score: total ? (successful/total)*10 : 10 };
    } catch (e) {
      return { error: e.message, score: 5 };
    }
  }
}
const selfRepair = new SelfRepairEngine();

// ──────────────────────────────────────────────────────────────────────────────
/** Improvement Loop */
// ──────────────────────────────────────────────────────────────────────────────
class ImprovementLoop {
  async runDailyImprovementCycle() {
    const active = Object.keys(COUNCIL_MEMBERS).filter(m => COUNCIL_MEMBERS[m].active);
    // Collect
    const all = [];
    for (const m of active) {
      const props = await this.requestProposals(m, 10);
      all.push(...props);
    }
    // Score
    const scored = await this.scoreProposals(all);
    // Rank, sandbox top 5
    const ranked = scored.sort((a,b) => (b.benefit*0.5 + (10-b.risk)*0.3 + b.feasibility*0.2) - (a.benefit*0.5 + (10-a.risk)*0.3 + a.feasibility*0.2));
    const top = ranked.slice(0, 5);
    const tested = [];
    for (const p of top) tested.push({ ...p, testResult: await this.sandboxTest(p) });
    // Adopt successes
    let adopted = 0;
    for (const p of tested) {
      if (p.testResult.success) { await this.adopt(p); adopted++; }
    }
    return { total_proposals: all.length, tested_proposals: tested.length, adopted_proposals: adopted, adoption_rate: `${((adopted/(all.length||1))*100).toFixed(1)}%` };
  }

  async requestProposals(member, count = 10) {
    const prompt = `You are ${COUNCIL_MEMBERS[member].name}. Propose ${count} improvements to our AI orchestration system.\nReturn ONLY JSON array of { "proposal","description","category","estimated_effort" }.`;
    const r = await callCouncilMemberWithFallback(member, prompt);
    if (!r.success) return [];
    try {
      const arr = JSON.parse(r.response);
      return arr.map(x => ({ ...x, proposing_ai: member, proposed_date: new Date().toISOString(), improvement_id: `imp_${Date.now()}_${Math.random().toString(36).slice(2,8)}` }));
    } catch (e) {
      logger.error("IMPROVEMENTS", `Parse failed (${member}): ${e.message}`);
      return [];
    }
  }

  async scoreProposals(list) {
    const out = [];
    for (const p of list) {
      const pr = `Evaluate:\nTitle: ${p.proposal}\nDesc: ${p.description}\nCategory: ${p.category}\nRespond: benefit:X, risk:X, feasibility:X`;
      const r = await callCouncilMemberWithFallback("claude", pr);
      const benefit = parseInt(/benefit:\s*(\d+)/i.exec(r.response)?.[1] || 7, 10);
      const risk = parseInt(/risk:\s*(\d+)/i.exec(r.response)?.[1] || 3, 10);
      const feasibility = parseInt(/feasibility:\s*(\d+)/i.exec(r.response)?.[1] || 7, 10);
      out.push({ ...p, benefit, risk, feasibility });
    }
    return out;
  }

  async sandboxTest(p) {
    const testId = `test_${Date.now()}`;
    const r = await callCouncilMemberWithFallback("claude", `Sandbox test improvement:\n${p.proposal}\n${p.description}\nRespond "success" or "failure" with brief reasoning.`);
    const success = r.success && /success/i.test(r.response);
    await dbQuery(
      `INSERT INTO sandbox_tests(test_id, improvement_id, test_input, test_result, success, created_at)
       VALUES($1,$2,$3,$4,$5,now())`,
      [testId, p.improvement_id, p.proposal, r.response || "", success]
    );
    return { success, feedback: r.response, testId };
  }

  async adopt(p) {
    await dbQuery(`UPDATE ai_council_improvements SET status='adopted', adoption_date=now() WHERE improvement_id=$1`, [p.improvement_id]);
    await dbQuery(
      `INSERT INTO improvement_adoption(improvement_id, adopted_by_ai, adoption_date, success_metric, notes)
       VALUES($1,$2,now(),$3,$4)`,
      [p.improvement_id, "system", 0.85, "Auto-adopted from improvement cycle"]
    );
  }
}
const improvementLoop = new ImprovementLoop();

// ──────────────────────────────────────────────────────────────────────────────
/** Self-healing state & backups (from your shorter server) */
// ──────────────────────────────────────────────────────────────────────────────
function readState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    const s = {
      version: "1.0.0",
      status: "healthy",
      last_working_version: "1.0.0",
      last_healthy_check: new Date().toISOString(),
      ai_available: {
        claude: !!ANTHROPIC_API_KEY, openai: !!OPENAI_API_KEY, gemini: !!GEMINI_API_KEY, deepseek: !!(DEEPSEEK_API_KEY || DEEPSEEK_URL)
      },
      endpoints_tested: {}
    };
    writeState(s);
    return s;
  }
}
function writeState(state) {
  const backupName = `state-${Date.now()}.json`;
  fs.writeFileSync(path.join(BACKUP_DIR, backupName), JSON.stringify({ ...state, backup_timestamp: new Date().toISOString() }, null, 2));
  const keep = fs.readdirSync(BACKUP_DIR).sort().reverse();
  for (let i = 10; i < keep.length; i++) fs.unlinkSync(path.join(BACKUP_DIR, keep[i]));
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}
function revertToLastHealthy() {
  const files = fs.readdirSync(BACKUP_DIR).sort().reverse();
  if (!files.length) throw new Error("No backups available");
  const latest = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, files[0]), "utf8"));
  writeState(latest);
  return latest;
}
let SYSTEM_STATE = readState();

// ──────────────────────────────────────────────────────────────────────────────
/** Middleware & static */
// ──────────────────────────────────────────────────────────────────────────────
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

function requireCommandKey(req, res, next) {
  const key = req.query.key || req.headers["x-command-key"];
  if (!COMMAND_CENTER_KEY || key !== COMMAND_CENTER_KEY) {
    return res.status(401).json({ ok: false, error: "Unauthorized: Invalid API key" });
  }
  next();
}

// ──────────────────────────────────────────────────────────────────────────────
/** GitHub helpers */
// ──────────────────────────────────────────────────────────────────────────────
async function githubGetFile(repo, filePath) {
  const r = await axios.get(`https://api.github.com/repos/${repo}/contents/${encodeURIComponent(filePath)}`, {
    headers: { "Authorization": `Bearer ${GITHUB_TOKEN}`, "Accept": "application/vnd.github+json", "User-Agent": "LifeOS" }, timeout: 20000
  });
  return r.data;
}
async function githubPutFile(repo, filePath, content, message) {
  let sha;
  try { sha = (await githubGetFile(repo, filePath)).sha; } catch {}
  const r = await axios.put(`https://api.github.com/repos/${repo}/contents/${encodeURIComponent(filePath)}`, {
    message: message || `chore: update ${filePath}`,
    content: Buffer.from(content, "utf8").toString("base64"),
    sha
  }, {
    headers: { "Authorization": `Bearer ${GITHUB_TOKEN}`, "Accept": "application/vnd.github+json", "User-Agent": "LifeOS" }, timeout: 25000
  });
  return r.data;
}

// ──────────────────────────────────────────────────────────────────────────────
/** WebSockets */
// ──────────────────────────────────────────────────────────────────────────────
const activeConnections = new Map();
const conversationHistory = new Map();

wss.on("connection", (ws) => {
  const id = `client_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
  activeConnections.set(id, ws);
  conversationHistory.set(id, []);
  logger.info("WEBSOCKET", `Client connected: ${id}`);

  ws.send(JSON.stringify({
    type: "connection", status: "connected", clientId: id,
    message: "🎼 Connected to Unified Command Center v18.0 (Self-Healing)"
  }));

  ws.on("message", async (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      switch (msg.type) {
        case "conversation": {
          const text = msg.text;
          const history = conversationHistory.get(id) || [];
          history.push({ role: "orchestrator", content: text, t: Date.now() });
          const r = await callCouncilMemberWithFallback("claude", text);
          if (r.success) {
            history.push({ role: "ai", content: r.response, t: Date.now() });
            conversationHistory.set(id, history);
            ws.send(JSON.stringify({ type: "conversation_response", response: r.response, model_used: r.member, t: new Date().toISOString() }));
          } else {
            ws.send(JSON.stringify({ type: "error", error: r.error, tried_fallbacks: r.tried_members }));
          }
          break;
        }
        case "council_debate": {
          const debate = await councilConsensusWithDebate(msg.question);
          ws.send(JSON.stringify({ type: "debate_results", debate, t: new Date().toISOString() }));
          break;
        }
        case "check_unanimity": {
          const uni = await checkUnanimity(msg.question);
          ws.send(JSON.stringify({ type: "unanimity_results", unanimity: uni, t: new Date().toISOString() }));
          break;
        }
        case "diagnostics": {
          const d = await selfRepair.runDailyDiagnostics();
          ws.send(JSON.stringify({ type: "diagnostics_results", diagnostics: d, t: new Date().toISOString() }));
          break;
        }
        case "improvements": {
          const imp = await improvementLoop.runDailyImprovementCycle();
          ws.send(JSON.stringify({ type: "improvements_results", improvements: imp, t: new Date().toISOString() }));
          break;
        }
        default:
          ws.send(JSON.stringify({ type: "error", error: `Unknown message type: ${msg.type}` }));
      }
    } catch (e) {
      logger.error("WEBSOCKET", `Message error: ${e.message}`);
      ws.send(JSON.stringify({ type: "error", error: e.message }));
    }
  });

  ws.on("close", () => {
    activeConnections.delete(id);
    conversationHistory.delete(id);
    logger.info("WEBSOCKET", `Client disconnected: ${id}`);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
/** REST: Health & council */
// ──────────────────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.send("OK"));

app.get("/healthz", async (req, res) => {
  const d = await selfRepair.runDailyDiagnostics();
  res.json({
    ok: true,
    status: d.healthScore >= 7 ? "healthy" : "degraded",
    version: "v18.0-self-healing",
    timestamp: new Date().toISOString(),
    healthScore: d.healthScore.toFixed(1),
    features: [
      "Self-healing error recovery",
      "Daily improvement loop",
      "Council debate & consensus",
      "Model scaling & routing",
      "Fallback chains"
    ],
    activeModels: Object.keys(COUNCIL_MEMBERS).filter(m => COUNCIL_MEMBERS[m].active),
    diagnostics: d.diagnostics
  });
});

app.get("/api/v1/models", requireCommandKey, (req, res) => {
  const models = Object.entries(COUNCIL_MEMBERS).map(([key, m]) => ({
    name: key, official_name: m.official_name, provider: m.provider, tier: m.tier, active: m.active, role: m.role
  }));
  res.json({ ok: true, models });
});

app.get("/api/v1/council/debate", requireCommandKey, async (req, res) => {
  const { question } = req.query;
  if (!question) return res.status(400).json({ ok: false, error: "Missing 'question' parameter" });
  const debate = await councilConsensusWithDebate(question);
  res.json({ ok: true, debate });
});

app.get("/api/v1/council/unanimity", requireCommandKey, async (req, res) => {
  const { question } = req.query;
  if (!question) return res.status(400).json({ ok: false, error: "Missing 'question' parameter" });
  const unanimity = await checkUnanimity(question);
  res.json({ ok: true, unanimity });
});

app.get("/api/v1/diagnostics", requireCommandKey, async (req, res) => {
  const diagnostics = await selfRepair.runDailyDiagnostics();
  res.json({ ok: true, diagnostics });
});

app.get("/api/v1/improvements", requireCommandKey, async (req, res) => {
  const improvements = await improvementLoop.runDailyImprovementCycle();
  res.json({ ok: true, improvements });
});

// ──────────────────────────────────────────────────────────────────────────────
/** REST: Architect Chat (from your short server) */
// ──────────────────────────────────────────────────────────────────────────────
app.post("/api/v1/architect/chat", requireCommandKey, async (req, res) => {
  try {
    const { message, ai = "claude" } = req.body || {};
    if (!message) return res.status(400).json({ ok: false, error: "message required" });

    const r = await (["claude","chatgpt","gemini","deepseek","grok"].includes(ai)
      ? callCouncilMember(ai, message)
      : callCouncilMemberWithFallback("claude", message));

    if (!r.success) return res.status(500).json({ ok: false, error: r.error });

    SYSTEM_STATE.endpoints_tested["/api/v1/architect/chat"] = { tested: new Date().toISOString(), ai, status: "working" };
    writeState(SYSTEM_STATE);

    res.json({ ok: true, response: r.response, ai_name: ai, ai_id: r.member, timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({
      ok: false, error: e.message,
      ai_available: {
        claude: !!ANTHROPIC_API_KEY, chatgpt: !!OPENAI_API_KEY, gemini: !!GEMINI_API_KEY,
        deepseek: !!(DEEPSEEK_API_KEY || DEEPSEEK_URL), grok: !!XAI_API_KEY
      }
    });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
/** REST: GitHub commit (from your short server) */
// ──────────────────────────────────────────────────────────────────────────────
app.post("/api/v1/dev/commit", requireCommandKey, async (req, res) => {
  try {
    const { path: filePath, content, message } = req.body || {};
    if (!filePath || typeof content !== "string") return res.status(400).json({ ok: false, error: "'path' and 'content' required" });
    if (!GITHUB_TOKEN) return res.status(400).json({ ok: false, error: "GITHUB_TOKEN not configured" });

    const r = await githubPutFile(GITHUB_REPO, filePath, content, message);
    if (!r.commit) throw new Error("Commit failed: " + JSON.stringify(r));

    SYSTEM_STATE.endpoints_tested["/api/v1/dev/commit"] = { tested: new Date().toISOString(), status: "working" };
    writeState(SYSTEM_STATE);

    res.json({ ok: true, committed: filePath, sha: r.commit.sha, message: `Committed to ${GITHUB_REPO}` });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
/** REST: System recovery & backups */
// ──────────────────────────────────────────────────────────────────────────────
app.post("/api/v1/system/recover", requireCommandKey, (req, res) => {
  try {
    const recovered = revertToLastHealthy();
    SYSTEM_STATE = recovered;
    res.json({ ok: true, recovered: true, state: SYSTEM_STATE, message: "System recovered to last healthy version" });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/v1/system/backups", requireCommandKey, (req, res) => {
  try {
    const backups = fs.readdirSync(BACKUP_DIR).map(name => {
      const p = path.join(BACKUP_DIR, name);
      return { name, path: p, size: fs.statSync(p).size };
    }).sort((a, b) => b.name.localeCompare(a.name));
    res.json({ ok: true, backups: backups.slice(0, 10), total: backups.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ──────────────────────────────────────────────────────────────────────────────
/** Startup & schedules */
// ──────────────────────────────────────────────────────────────────────────────
async function start() {
  await initDb();

  // Schedules (safe even without DB)
  setInterval(async () => {
    const api = await selfRepair.checkAPIConnectivity();
    if ((api.failedAPIs || []).length) {
      logger.warn("SCHEDULED", `${api.failedAPIs.length} APIs offline`);
    }
  }, 60 * 60 * 1000);

  setInterval(async () => {
    await selfRepair.runDailyDiagnostics();
    await improvementLoop.runDailyImprovementCycle();
  }, 24 * 60 * 60 * 1000);

  server.listen(PORT, HOST, () => {
    console.log(`\n${"═".repeat(80)}`);
    console.log(`✅ UNIFIED COMMAND CENTER v18.0 — SELF-HEALING`);
    console.log(`${"═".repeat(80)}\n`);
    console.log(`📡 WebSocket: ws://${HOST}:${PORT}`);
    console.log(`🌐 REST:      http://${HOST}:${PORT}/api/v1/...`);
    console.log(`🖥️  Overlay:  http://${HOST}:${PORT}/overlay/command-center.html\n`);
    console.log(`🤖 Active models: ${Object.keys(COUNCIL_MEMBERS).filter(m => COUNCIL_MEMBERS[m].active).join(", ") || "(none — add API keys)"}`);
    console.log(`\n${"═".repeat(80)}\n`);
  });
}

process.on("SIGINT", async () => {
  logger.info("SHUTDOWN", "Graceful shutdown...");
  try { if (pool) await pool.end(); } catch {}
  server.close();
  process.exit(0);
});

start();
export default app;
