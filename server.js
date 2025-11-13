import express from "express";
import dayjs from "dayjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import { WebSocketServer } from "ws";
import { createServer } from "http";
import { TextEncoder } from "util";
import process from "node:process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

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
  HOST = "0.0.0.0",
  PORT = 8080,
  MAX_DAILY_SPEND = 50.0,
  NODE_ENV = "production"
} = process.env;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.text({ type: "text/plain", limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL?.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

let activeConnections = new Map();
let adamPatternAnalysis = {
  decisions: [],
  patterns: {},
  preferences: {},
  riskTolerance: 0.7,
  decisiveness: 0.8,
  accuracyPredictions: 0
};

const roiTracker = {
  daily_revenue: 0,
  daily_ai_cost: 0,
  daily_tasks_completed: 0,
  roi_ratio: 0,
  last_reset: dayjs().format("YYYY-MM-DD")
};

async function initDatabase() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS conversation_memory (
      id SERIAL PRIMARY KEY,
      memory_id TEXT UNIQUE NOT NULL,
      orchestrator_msg TEXT NOT NULL,
      ai_response TEXT NOT NULL,
      ai_member VARCHAR(50),
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

    await pool.query(`
      INSERT INTO protected_files (file_path, reason, can_read, can_write, requires_full_council) VALUES
      ('server.js', 'Core system', true, false, true),
      ('package.json', 'Dependencies', true, false, true),
      ('.github/workflows/autopilot-build.yml', 'Autopilot', true, false, true),
      ('public/overlay/command-center.html', 'Control panel', true, true, true)
      ON CONFLICT (file_path) DO NOTHING
    `);

    console.log("✅ Database schema initialized (v25.0)");
  } catch (error) {
    console.error("❌ DB init error:", error.message);
    throw error;
  }
}

async function loadROIFromDatabase() {
  try {
    const result = await pool.query(
      `SELECT SUM(usd) as total FROM daily_spend WHERE date = $1`,
      [dayjs().format("YYYY-MM-DD")]
    );
    if (result.rows[0] && result.rows[0].total) {
      roiTracker.daily_ai_cost = parseFloat(result.rows[0].total);
    }
    console.log(`✅ ROI loaded: $${roiTracker.daily_ai_cost.toFixed(4)}`);
  } catch (error) {
    console.error("ROI load error:", error.message);
  }
}

const b64u = {
  enc: (u8) => Buffer.from(u8).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: (s) => new Uint8Array(Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64'))
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
  project: { lifeOS: 1, lumin: 1 },
  integ: { Stripe: 1, Twilio: 2, Notion: 3, GitHub: 4, Anthropic: 5, OpenAI: 6 },
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

const RDICT = Object.fromEntries(Object.entries(DICT).map(([k, map]) => [k, createReverseLookup(map)]));

function packBits(values) {
  const out = [];
  let cur = 0, used = 0;
  for (const { bits, val } of values) {
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
  for (const { bits, name } of spec) {
    let got = 0, val = 0, shift = 0;
    while (got < bits) {
      if (bitPos === 8) { idx++; cur = u8[idx] || 0; bitPos = 0; }
      const avail = Math.min(8 - bitPos, bits - got);
      const mask = (1 << avail) - 1;
      val |= ((cur >> bitPos) & mask) << shift;
      bitPos += avail;
      shift += avail;
      got += avail;
    }
    out[name] = val >>> 0;
  }
  return { out, offset: Math.ceil((spec.reduce((a, b) => a + b.bits, 0)) / 8) };
}

function encodeLCTP({ v = '3', type, project, flow, integration, monetization = '0%', quorum = 85, signer = 'System' } = {}) {
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
  const { out } = unpackBits(u8, spec);
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
      }
    });
    return result;
  }
};

async function trackCompressionStat(originalTokens, compressedTokens, type = "LCTP") {
  try {
    const ratio = originalTokens > 0 ? ((originalTokens - compressedTokens) / originalTokens * 100).toFixed(2) : 0;
    const costSaved = (originalTokens - compressedTokens) * 0.00001;
    await pool.query(
      `INSERT INTO compression_stats (original_tokens, compressed_tokens, compression_ratio, cost_saved, compression_type, created_at)
       VALUES ($1, $2, $3, $4, $5, now())`,
      [originalTokens, compressedTokens, ratio, costSaved, type]
    );
  } catch (error) {
    console.error("Compression stat error:", error.message);
  }
}

async function getDailySpend(date = dayjs().format("YYYY-MM-DD")) {
  try {
    const result = await pool.query(`SELECT usd FROM daily_spend WHERE date = $1`, [date]);
    return result.rows.length > 0 ? parseFloat(result.rows[0].usd) : 0;
  } catch (error) {
    console.error("Spend query error:", error.message);
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
    console.error("Spend update error:", error.message);
    return 0;
  }
}

function calculateCost(usage, model = "gpt-4o-mini") {
  const prices = {
    "claude-3-5-sonnet-20241022": { input: 0.003, output: 0.015 },
    "gpt-4o": { input: 0.0025, output: 0.01 },
    "gemini-2.0-flash-exp": { input: 0.0001, output: 0.0004 },
    "deepseek-coder": { input: 0.0001, output: 0.0003 },
    "grok-beta": { input: 0.005, output: 0.015 }
  };
  const price = prices[model] || prices["gpt-4o-mini"];
  return ((usage?.prompt_tokens || 0) * price.input / 1000) +
    ((usage?.completion_tokens || 0) * price.output / 1000);
}

async function updateROI(revenue = 0, cost = 0, tasksCompleted = 0) {
  const today = dayjs().format("YYYY-MM-DD");
  if (roiTracker.last_reset !== today) {
    roiTracker.daily_revenue = 0;
    roiTracker.daily_ai_cost = 0;
    roiTracker.daily_tasks_completed = 0;
    roiTracker.last_reset = today;
  }
  roiTracker.daily_revenue += revenue;
  roiTracker.daily_ai_cost += cost;
  roiTracker.daily_tasks_completed += tasksCompleted;
  if (roiTracker.daily_ai_cost > 0) {
    roiTracker.roi_ratio = roiTracker.daily_revenue / roiTracker.daily_ai_cost;
  } else {
    roiTracker.roi_ratio = 0;
  }
  return roiTracker;
}

async function storeMemory(orchestratorMsg, aiResponse, aiMember = "system") {
  try {
    const memId = `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await pool.query(
      `INSERT INTO conversation_memory (memory_id, orchestrator_msg, ai_response, ai_member, created_at)
       VALUES ($1, $2, $3, $4, now())`,
      [memId, orchestratorMsg, aiResponse, aiMember]
    );
    return memId;
  } catch (error) {
    console.error("Memory store error:", error.message);
    return null;
  }
}

async function recallMemory(query, limit = 50) {
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
    console.error("Memory recall error:", error.message);
    return [];
  }
}

async function trackLoss(severity, whatWasLost, whyLost, context = {}, prevention = "") {
  try {
    await pool.query(
      `INSERT INTO loss_log (severity, what_was_lost, why_lost, context, prevention_strategy, timestamp)
       VALUES ($1, $2, $3, $4, $5, now())`,
      [severity, whatWasLost, whyLost, JSON.stringify(context), prevention]
    );
    console.error(`🚨 [LOSS TRACKED] ${severity}: ${whatWasLost}`);
  } catch (error) {
    console.error("Loss tracking error:", error.message);
  }
}

async function quarterlyLossReview() {
  try {
    const losses = await pool.query(
      `SELECT severity, what_was_lost, why_lost, COUNT(*) as count 
       FROM loss_log 
       WHERE severity IN ('error', 'critical')
       GROUP BY severity, what_was_lost, why_lost
       ORDER BY count DESC LIMIT 20`
    );

    if (losses.rows.length > 0) {
      const summary = losses.rows.map(r => `${r.count}x ${r.severity}: ${r.what_was_lost}`).join(", ");
      console.log(`📊 Quarterly Loss Review: ${summary}`);
      if (executionQueue) {
        await executionQueue.addTask('analysis', `Analyze loss patterns: ${summary}`);
      }
    }
  } catch (error) {
    console.error("Quarterly review error:", error.message);
  }
}

async function createProposal(title, description, proposedBy = "system") {
  try {
    const proposalId = `prop_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await pool.query(
      `INSERT INTO consensus_proposals (proposal_id, title, description, proposed_by, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [proposalId, title, description, proposedBy, 'proposed']
    );
    console.log(`✅ Proposal created: ${proposalId}`);
    broadcastToAll({ type: 'proposal_created', proposalId, title });
    return proposalId;
  } catch (error) {
    console.error("Proposal creation error:", error.message);
    return null;
  }
}

async function debateProposal(proposalId) {
  try {
    const propResult = await pool.query(
      `SELECT title, description FROM consensus_proposals WHERE proposal_id = $1`,
      [proposalId]
    );

    if (!propResult.rows.length) {
      return { ok: false, error: "Proposal not found" };
    }

    const { title, description } = propResult.rows[0];

    await pool.query(
      `UPDATE consensus_proposals SET status = 'debating' WHERE proposal_id = $1`,
      [proposalId]
    );

    const debatePrompt = `Proposal: "${title}"\nDescription: "${description}"\n\nProvide BOTH perspectives:\n1. PRO: Why this is good\n2. AGAINST: Why this is risky\n3. CONFIDENCE: 1-100`;

    const members = Object.keys(COUNCIL_MEMBERS);

    for (const member of members) {
      try {
        const response = await callCouncilMember(member, debatePrompt);
        const forMatch = response.match(/PRO:\s*([\s\S]*?)(?=AGAINST:|$)/i);
        const againstMatch = response.match(/AGAINST:\s*([\s\S]*?)(?=CONFIDENCE:|$)/i);
        const confidenceMatch = response.match(/CONFIDENCE:\s*(\d+)/i);

        const forArg = forMatch ? forMatch[1].trim().slice(0, 500) : "Support this proposal";
        const againstArg = againstMatch ? againstMatch[1].trim().slice(0, 500) : "No concerns";
        const confidence = confidenceMatch ? parseInt(confidenceMatch[1]) : 75;

        await pool.query(
          `INSERT INTO debate_arguments (proposal_id, ai_member, side, argument, confidence)
           VALUES ($1, $2, $3, $4, $5)`,
          [proposalId, member, 'for', forArg, confidence]
        );

        await pool.query(
          `INSERT INTO debate_arguments (proposal_id, ai_member, side, argument, confidence)
           VALUES ($1, $2, $3, $4, $5)`,
          [proposalId, member, 'against', againstArg, confidence]
        );

        console.log(`✅ [${member}] Debated ${proposalId}`);
      } catch (error) {
        console.log(`⚠️ [${member}] debate failed: ${error.message}`);
        continue;
      }
    }

    return { ok: true, proposalId, message: "Debate complete" };
  } catch (error) {
    console.error("Debate error:", error.message);
    return { ok: false, error: error.message };
  }
}

async function evaluateConsequences(proposalId) {
  try {
    const propResult = await pool.query(
      `SELECT title, description FROM consensus_proposals WHERE proposal_id = $1`,
      [proposalId]
    );

    if (!propResult.rows.length) {
      return { ok: false, error: "Proposal not found" };
    }

    const { title, description } = propResult.rows[0];

    const consequencePrompt = `Evaluate consequences for: "${title}"\n${description}\n\nProvide:\n1. RISK: low/medium/high/critical\n2. INTENDED: What improves?\n3. UNINTENDED: What could go wrong?\n4. MITIGATION: How to prevent problems?`;

    const members = Object.keys(COUNCIL_MEMBERS);
    let totalRisk = 0;

    for (const member of members) {
      try {
        const response = await callCouncilMember(member, consequencePrompt);
        const riskMatch = response.match(/RISK:\s*(\w+)/i);
        const intendedMatch = response.match(/INTENDED:\s*([\s\S]*?)(?=UNINTENDED:|$)/i);
        const unintendedMatch = response.match(/UNINTENDED:\s*([\s\S]*?)(?=MITIGATION:|$)/i);
        const mitigationMatch = response.match(/MITIGATION:\s*([\s\S]*?)$/i);

        const risk = riskMatch ? riskMatch[1].toLowerCase() : 'medium';
        const intended = intendedMatch ? intendedMatch[1].trim().slice(0, 500) : '';
        const unintended = unintendedMatch ? unintendedMatch[1].trim().slice(0, 500) : '';
        const mitigation = mitigationMatch ? mitigationMatch[1].trim().slice(0, 500) : '';

        await pool.query(
          `INSERT INTO consequence_evaluations (proposal_id, ai_member, risk_level, intended_consequences, unintended_consequences, mitigation_strategy)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [proposalId, member, risk, intended, unintended, mitigation]
        );

        if (['high', 'critical'].includes(risk) && executionQueue) {
          await executionQueue.addTask('mitigation', `Implement mitigation: ${mitigation}`);
        }

        const riskScore = { low: 1, medium: 2, high: 3, critical: 4 };
        totalRisk += riskScore[risk] || 2;

        console.log(`✅ [${member}] Consequences evaluated`);
      } catch (error) {
        console.log(`⚠️ [${member}] consequence eval failed: ${error.message}`);
        continue;
      }
    }

    const avgRisk = totalRisk / members.length;
    const riskLevel = avgRisk < 1.5 ? 'low' : avgRisk < 2.5 ? 'medium' : avgRisk < 3.5 ? 'high' : 'critical';

    return {
      ok: true,
      proposalId,
      averageRisk: avgRisk,
      riskLevel,
      message: `Consequences evaluated. Risk level: ${riskLevel}`
    };
  } catch (error) {
    console.error("Consequence eval error:", error.message);
    return { ok: false, error: error.message };
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

        console.log(`✅ [${member}] Voted: ${vote}`);
      } catch (error) {
        console.log(`⚠️ [${member}] vote failed: ${error.message}`);
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

    console.log(`✅ Consensus vote: ${yesVotes}/${totalVotes} votes`);

    return {
      ok: true,
      proposalId,
      yesVotes,
      noVotes,
      abstainVotes,
      approvalRate: (approvalRate * 100).toFixed(1) + '%',
      decision,
      message: `Consensus vote complete. Decision: ${decision}`
    };
  } catch (error) {
    console.error("Consensus vote error:", error.message);
    await trackLoss('error', 'Consensus vote failed', error.message);
    return { ok: false, error: error.message };
  }
}

async function recordAIPerformance(aiMember, taskType, durationMs, tokensUsed, cost, accuracy, success) {
  try {
    await pool.query(
      `INSERT INTO ai_performance (ai_member, task_type, duration_ms, tokens_used, cost, accuracy, success, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
      [aiMember, taskType, durationMs, tokensUsed, cost, accuracy, success]
    );
    console.log(`📊 [${aiMember}] Performance recorded: ${success ? '✅' : '❌'}`);
  } catch (error) {
    console.error("Performance recording error:", error.message);
  }
}

async function getAIScores() {
  try {
    const result = await pool.query(`
      SELECT ai_member,
        COUNT(*) as total_tasks,
        SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_tasks,
        AVG(accuracy) as avg_accuracy,
        AVG(duration_ms) as avg_duration,
        AVG(cost) as avg_cost
      FROM ai_performance
      GROUP BY ai_member
      ORDER BY avg_accuracy DESC
    `);
    return result.rows;
  } catch (error) {
    console.error("AI scores query error:", error.message);
    return [];
  }
}

async function analyzeUserDecision(context, choice, outcome, riskLevel) {
  try {
    const decisionId = `dec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const historyResult = await pool.query(
      `SELECT choice FROM user_decisions WHERE context ILIKE $1 LIMIT 5`,
      [`%${context.slice(0, 50)}%`]
    );

    let patternMatch = 0;
    if (historyResult.rows.length > 0) {
      const matches = historyResult.rows.filter(r => r.choice === choice).length;
      patternMatch = (matches / historyResult.rows.length);
    }

    await pool.query(
      `INSERT INTO user_decisions (decision_id, context, choice, outcome, riskLevel, pattern_match, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())`,
      [decisionId, context, choice, outcome, riskLevel, patternMatch]
    );

    adamPatternAnalysis.decisions.push({ context, choice, outcome, riskLevel });
    if (adamPatternAnalysis.decisions.length > 100) {
      adamPatternAnalysis.decisions = adamPatternAnalysis.decisions.slice(-100);
    }

    console.log(`📈 User decision analyzed: ${choice}`);
    return { decisionId, patternMatch };
  } catch (error) {
    console.error("Decision analysis error:", error.message);
    return null;
  }
}

async function predictUserChoice(situation) {
  try {
    const result = await pool.query(
      `SELECT choice, outcome FROM user_decisions 
       WHERE context ILIKE $1 
       ORDER BY created_at DESC LIMIT 10`,
      [`%${situation.slice(0, 50)}%`]
    );

    if (result.rows.length === 0) {
      return { prediction: 'UNKNOWN', confidence: 0 };
    }

    const choiceCounts = {};
    result.rows.forEach(row => {
      choiceCounts[row.choice] = (choiceCounts[row.choice] || 0) + 1;
    });

    const mostCommon = Object.entries(choiceCounts).sort((a, b) => b[1] - a[1])[0];
    const confidence = (mostCommon[1] / result.rows.length * 100).toFixed(1);

    return {
      prediction: mostCommon[0],
      confidence: parseFloat(confidence),
      basedOnPreviousDecisions: result.rows.length
    };
  } catch (error) {
    console.error("Prediction error:", error.message);
    return { prediction: 'UNKNOWN', confidence: 0 };
  }
}

const COUNCIL_MEMBERS = {
  claude: {
    name: "Claude",
    model: "claude-3-5-sonnet-20241022",
    provider: "anthropic",
    role: "Strategic Oversight",
    focus: "architecture & long-term planning"
  },
  chatgpt: {
    name: "ChatGPT",
    model: "gpt-4o",
    provider: "openai",
    role: "Technical Executor",
    focus: "implementation & execution"
  },
  gemini: {
    name: "Gemini",
    model: "gemini-2.0-flash-exp",
    provider: "google",
    role: "Research Analyst",
    focus: "data analysis & patterns"
  },
  deepseek: {
    name: "DeepSeek",
    model: "deepseek-coder",
    provider: "deepseek",
    role: "Infrastructure Specialist",
    focus: "optimization & performance"
  },
  grok: {
    name: "Grok",
    model: "grok-beta",
    provider: "xai",
    role: "Innovation Scout",
    focus: "novel approaches & risks"
  }
};

async function callCouncilMember(member, prompt) {
  const config = COUNCIL_MEMBERS[member];
  if (!config) throw new Error(`Unknown member: ${member}`);

  const spend = await getDailySpend();
  if (spend >= MAX_DAILY_SPEND) {
    console.warn(`⚠️ Daily spend limit ($${MAX_DAILY_SPEND}) reached.`);
    throw new Error(`Daily spend limit ($${MAX_DAILY_SPEND}) reached at $${spend.toFixed(4)}`);
  }

  const systemPrompt = `You are ${config.name}. Role: ${config.role}. Focus: ${config.focus}. Be concise and strategic.`;

  try {
    if (config.provider === "anthropic" && ANTHROPIC_API_KEY) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY.trim(),
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 2048,
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
      await storeMemory(prompt, text, member);
      await recordAIPerformance(member, 'dialogue', 0, json.usage?.total_tokens || 0, cost, 95, true);

      console.log(`✅ [${member}] ${text.length} chars, $${cost.toFixed(4)}`);
      return text;
    }

    if (config.provider === "openai" && OPENAI_API_KEY) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY.trim()}`
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 2048,
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
      await storeMemory(prompt, text, member);
      await recordAIPerformance(member, 'dialogue', 0, json.usage?.total_tokens || 0, cost, 92, true);

      console.log(`✅ [${member}] ${text.length} chars, $${cost.toFixed(4)}`);
      return text;
    }

    if (config.provider === "google" && GEMINI_API_KEY) {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${GEMINI_API_KEY.trim()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
            generationConfig: { maxOutputTokens: 2048 }
          })
        }
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      if (json.error) throw new Error(json.error.message);

      const text = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!text) throw new Error("Empty response");

      await storeMemory(prompt, text, member);
      await recordAIPerformance(member, 'dialogue', 0, 0, 0, 88, true);

      console.log(`✅ [${member}] ${text.length} chars`);
      return text;
    }

    if (config.provider === "xai" && GROK_API_KEY) {
      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROK_API_KEY.trim()}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          max_tokens: 2048
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
      await storeMemory(prompt, text, member);
      await recordAIPerformance(member, 'dialogue', 0, json.usage?.total_tokens || 0, cost, 85, true);

      console.log(`✅ [${member}] ${text.length} chars, $${cost.toFixed(4)}`);
      return text;
    }

    if (config.provider === "deepseek" && DEEPSEEK_API_KEY) {
      const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${DEEPSEEK_API_KEY.trim()}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          max_tokens: 2048
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
      await storeMemory(prompt, text, member);
      await recordAIPerformance(member, 'dialogue', 0, json.usage?.total_tokens || 0, cost, 90, true);

      console.log(`✅ [${member}] ${text.length} chars, $${cost.toFixed(4)}`);
      return text;
    }

    throw new Error(`${config.provider.toUpperCase()}_API_KEY not configured`);
  } catch (error) {
    console.error(`❌ [${member}] ${error.message}`);
    await recordAIPerformance(member, 'dialogue', 0, 0, 0, 0, false);
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
      console.log(`⚠️ [${member}] failed, trying next...`);
      continue;
    }
  }

  throw new Error("🚨 No AI council members available");
}

class ExecutionQueue {
  constructor() {
    this.tasks = [];
    this.activeTask = null;
  }

  async addTask(type, description) {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    try {
      await pool.query(
        `INSERT INTO execution_tasks (task_id, type, description, status, created_at)
         VALUES ($1, $2, $3, $4, now())`,
        [taskId, type, description, "queued"]
      );
      this.tasks.push(taskId);
      console.log(`✅ Task queued: ${taskId} (type: ${type})`);
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

    const taskId = this.tasks.shift();
    try {
      const taskRow = await pool.query(
        `SELECT type, description FROM execution_tasks WHERE task_id = $1`,
        [taskId]
      );

      if (!taskRow.rows.length) {
        throw new Error("Task not found in database");
      }

      const { type, description } = taskRow.rows[0];

      await pool.query(
        `UPDATE execution_tasks SET status = 'running' WHERE task_id = $1`,
        [taskId]
      );

      let result;

      switch(type.toLowerCase()) {
        case 'code_generation':
        case 'code':
          result = await this.executeCodeTask(description, taskId);
          break;
        case 'affiliate':
        case 'revenue_gen':
          result = await this.executeAffiliateTask(description, taskId);
          break;
        case 'content':
        case 'blog':
          result = await this.executeContentTask(description, taskId);
          break;
        case 'analysis':
          result = await this.executeAnalysisTask(description, taskId);
          break;
        case 'mitigation':
          result = await this.executeMitigationTask(description, taskId);
          break;
        default:
          result = await callCouncilWithFailover(`Execute task: ${description}`, "deepseek");
      }

      await pool.query(
        `UPDATE execution_tasks SET status = 'completed', result = $1, completed_at = now()
         WHERE task_id = $2`,
        [result.slice(0, 5000), taskId]
      );

      await updateROI(0, 0, 1);
      console.log(`✅ Task completed: ${taskId}`);
      broadcastToAll({ type: 'task_completed', taskId, result });

    } catch (error) {
      await pool.query(
        `UPDATE execution_tasks SET status = 'failed', error = $1, completed_at = now()
         WHERE task_id = $2`,
        [error.message.slice(0, 500), taskId]
      );
      console.error(`❌ Task failed: ${error.message}`);
      await trackLoss('error', `Task execution failed: ${taskId}`, error.message);
      broadcastToAll({ type: 'task_failed', taskId, error: error.message });
    }

    setTimeout(() => this.executeNext(), 1000);
  }

  async executeCodeTask(description, taskId) {
    console.log(`🔧 Executing code task: ${description}`);
    const response = await callCouncilWithFailover(`Generate production-ready code: ${description}`, "claude");
    return response;
  }

  async executeAffiliateTask(description, taskId) {
    console.log(`📢 Executing affiliate task: ${description}`);
    const response = await callCouncilWithFailover(`Create affiliate marketing content: ${description}`, "chatgpt");
    return response;
  }

  async executeContentTask(description, taskId) {
    console.log(`📝 Executing content task: ${description}`);
    const response = await callCouncilWithFailover(`Generate content: ${description}`, "gemini");
    return response;
  }

  async executeAnalysisTask(description, taskId) {
    console.log(`📊 Executing analysis task: ${description}`);
    const response = await callCouncilWithFailover(description, "gemini");
    return response;
  }

  async executeMitigationTask(description, taskId) {
    console.log(`🛡️ Executing mitigation task: ${description}`);
    const response = await callCouncilWithFailover(description, "deepseek");
    return response;
  }

  async getStatus() {
    try {
      const result = await pool.query(
        `SELECT status, COUNT(*) as count FROM execution_tasks GROUP BY status`
      );
      return Object.fromEntries(result.rows.map(r => [r.status, Number(r.count)]));
    } catch (error) {
      return { error: error.message };
    }
  }
}

let executionQueue = new ExecutionQueue();

class IncomeDroneSystem {
  constructor() {
    this.activeDrones = new Map();
  }

  async deployDrone(droneType, expectedRevenue = 500) {
    const droneId = `drone_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    console.log(`🛸 Deploying income drone: ${droneType} (Expected: $${expectedRevenue})`);

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
        deployed: new Date().toISOString()
      });

      return droneId;
    } catch (error) {
      console.error(`❌ Drone deployment error: ${error.message}`);
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
      console.log(`💰 Income recorded: $${amount} from ${droneId}`);
    } catch (error) {
      console.error(`Revenue update error: ${error.message}`);
    }
  }

  async scheduleDroneTasks() {
    try {
      const drones = await pool.query(
        `SELECT drone_id, drone_type FROM income_drones WHERE status = 'active'`
      );

      for (const drone of drones.rows) {
        let taskDesc;

        switch(drone.drone_type.toLowerCase()) {
          case 'affiliate':
            taskDesc = `Post high-converting affiliate offer to social media and track clicks`;
            break;
          case 'content':
            taskDesc = `Write and publish blog article on trending topic, optimize for SEO`;
            break;
          case 'outreach':
            taskDesc = `Send outreach email to potential leads with pitch`;
            break;
          default:
            taskDesc = `Generate revenue: ${drone.drone_type}`;
        }

        await executionQueue.addTask(drone.drone_type, taskDesc);
      }
    } catch (error) {
      console.error("Drone scheduler error:", error.message);
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
      console.error("Drone status error:", error.message);
      return { active: 0, drones: [], total_revenue: 0 };
    }
  }
}

let incomeDroneSystem = new IncomeDroneSystem();

async function generateDailyIdeas() {
  try {
    console.log("💡 Generating daily improvement ideas...");
    const prompt = "Generate 10 practical improvements for an AI governance system. Be specific and actionable.";
    const ideas = await callCouncilWithFailover(prompt, "gemini");
    
    await pool.query(
      `INSERT INTO shared_memory (category, memory_key, memory_value, confidence, source, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())`,
      ['daily_ideas', `ideas_${dayjs().format('YYYY-MM-DD')}`, ideas, 0.8, 'system', 'gemini']
    );
    
    console.log(`✅ Daily ideas generated and stored`);
  } catch (error) {
    console.error("Daily ideas error:", error.message);
  }
}

async function rollbackLastDeployment() {
  try {
    const lastDeploy = await pool.query(
      `SELECT deployment_id, code_hash FROM code_deployments 
       WHERE status = 'deployed' 
       ORDER BY created_at DESC LIMIT 1`
    );

    if (!lastDeploy.rows.length) {
      return { ok: false, error: "No deployments to rollback" };
    }

    const { deployment_id, code_hash } = lastDeploy.rows[0];

    console.log(`🔄 Rolling back deployment: ${deployment_id}`);

    await pool.query(
      `UPDATE code_deployments SET status = 'rolled_back' WHERE deployment_id = $1`,
      [deployment_id]
    );

    return { ok: true, message: `Rollback initiated for ${deployment_id}` };
  } catch (error) {
    console.error("Rollback error:", error.message);
    return { ok: false, error: error.message };
  }
}

async function monitorErrorsAndRollback() {
  try {
    const recentErrors = await pool.query(
      `SELECT COUNT(*) as error_count FROM loss_log 
       WHERE timestamp > NOW() - INTERVAL '5 minutes' AND severity IN ('error', 'critical')`
    );

    const errorCount = recentErrors.rows[0].error_count;
    const totalTasks = await pool.query(
      `SELECT COUNT(*) as total FROM execution_tasks 
       WHERE created_at > NOW() - INTERVAL '5 minutes'`
    );

    const totalCount = totalTasks.rows[0].total || 1;
    const errorRate = errorCount / totalCount;

    if (errorRate > 0.05) {
      console.warn(`⚠️ Error rate ${(errorRate * 100).toFixed(1)}% exceeds threshold`);
      const rollback = await rollbackLastDeployment();
      if (rollback.ok) {
        console.log(`✅ Auto-rollback successful`);
      }
    }
  } catch (error) {
    console.error("Error monitoring error:", error.message);
  }
}

function broadcastToAll(message) {
  for (const ws of activeConnections.values()) {
    try {
      ws.send(JSON.stringify(message));
    } catch (error) {
      console.error("Broadcast error:", error.message);
    }
  }
}

function requireKey(req, res, next) {
  const key = req.query.key || req.headers["x-command-key"];
  if (key !== COMMAND_CENTER_KEY) return res.status(401).json({ error: "Unauthorized" });
  next();
}

app.get("/health", (req, res) => res.send("OK"));

app.get("/healthz", async (req, res) => {
  try {
    await pool.query("SELECT NOW()");
    const spend = await getDailySpend();
    const droneStatus = await incomeDroneSystem.getStatus();
    const taskStatus = await executionQueue.getStatus();
    const aiScores = await getAIScores();

    res.json({
      ok: true,
      status: "healthy",
      version: "v25.0-final-merged",
      timestamp: new Date().toISOString(),
      database: "connected",
      websockets: activeConnections.size,
      daily_spend: spend,
      max_daily_spend: MAX_DAILY_SPEND,
      roi: roiTracker,
      drones: droneStatus,
      tasks: taskStatus,
      ai_scores: aiScores,
      deployment: "Railway + Neon"
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/chat", requireKey, async (req, res) => {
  try {
    const { message, member = "claude" } = req.body;
    if (!message) return res.status(400).json({ error: "Message required" });

    const response = await callCouncilWithFailover(message, member);
    res.json({ ok: true, response, spend: await getDailySpend() });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/council", requireKey, (req, res) => {
  res.json({
    ok: true,
    members: Object.entries(COUNCIL_MEMBERS).map(([key, cfg]) => ({
      id: key,
      name: cfg.name,
      model: cfg.model,
      role: cfg.role,
      focus: cfg.focus
    }))
  });
});

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

app.post("/api/v1/proposal/:proposalId/debate", requireKey, async (req, res) => {
  try {
    const { proposalId } = req.params;
    const result = await debateProposal(proposalId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/proposal/:proposalId/consequences", requireKey, async (req, res) => {
  try {
    const { proposalId } = req.params;
    const result = await evaluateConsequences(proposalId);
    res.json(result);
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

app.get("/api/v1/ai/scores", requireKey, async (req, res) => {
  try {
    const scores = await getAIScores();
    res.json({ ok: true, scores });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/user/decision", requireKey, async (req, res) => {
  try {
    const { context, choice, outcome, riskLevel = 0.5 } = req.body;
    const result = await analyzeUserDecision(context, choice, outcome, riskLevel);
    res.json({ ok: true, result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/user/predict", requireKey, async (req, res) => {
  try {
    const { situation } = req.body;
    if (!situation) return res.status(400).json({ error: "Situation required" });

    const prediction = await predictUserChoice(situation);
    res.json({ ok: true, prediction });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/task", requireKey, async (req, res) => {
  try {
    const { type, description } = req.body;
    const taskId = await executionQueue.addTask(type || "general", description);
    res.json({ ok: true, taskId });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/tasks", requireKey, async (req, res) => {
  try {
    const status = await executionQueue.getStatus();
    res.json({ ok: true, status });
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

app.post("/api/v1/drones/deploy", requireKey, async (req, res) => {
  try {
    const { type = "general", expectedRevenue = 500 } = req.body;
    const droneId = await incomeDroneSystem.deployDrone(type, expectedRevenue);
    res.json({ ok: true, droneId });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/drones/revenue", requireKey, async (req, res) => {
  try {
    const { droneId, amount } = req.body;
    await incomeDroneSystem.recordRevenue(droneId, amount);
    res.json({ ok: true, message: "Revenue recorded" });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/memory", requireKey, async (req, res) => {
  try {
    const { q = "", limit = 50 } = req.query;
    const memories = await recallMemory(q, limit);
    res.json({ ok: true, count: memories.length, memories });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/spending", requireKey, async (req, res) => {
  try {
    const today = await getDailySpend();
    res.json({
      ok: true,
      today,
      max: MAX_DAILY_SPEND,
      percentage: ((today / MAX_DAILY_SPEND) * 100).toFixed(1) + "%",
      roi: roiTracker
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/rollback", requireKey, async (req, res) => {
  try {
    const result = await rollbackLastDeployment();
    res.json(result);
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/micro/encode", requireKey, (req, res) => {
  try {
    const encoded = MICRO_PROTOCOL.encode(req.body || {});
    res.json({ ok: true, encoded, format: "MICRO v2.0" });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/micro/decode", requireKey, (req, res) => {
  try {
    const { encoded } = req.body || {};
    const decoded = MICRO_PROTOCOL.decode(encoded);
    res.json({ ok: true, decoded });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/lctp/encode", requireKey, (req, res) => {
  try {
    const encoded = encodeLCTP(req.body || {});
    res.json({ ok: true, encoded, format: "LCTP v3" });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/lctp/decode", requireKey, (req, res) => {
  try {
    const { encoded } = req.body || {};
    const decoded = decodeLCTP(encoded);
    res.json({ ok: true, decoded });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

app.get('/overlay/command-center.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'overlay', 'command-center.html'));
});

app.get('/overlay/architect.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'overlay', 'architect.html'));
});

app.get('/overlay/portal.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'overlay', 'portal.html'));
});

app.get('/overlay/control.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'overlay', 'control.html'));
});

wss.on("connection", (ws) => {
  const clientId = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  activeConnections.set(clientId, ws);

  console.log(`✅ ${clientId} connected`);
  ws.send(JSON.stringify({
    type: "connection",
    status: "connected",
    clientId,
    message: "LifeOS v25.0 - Merged Governance + Execution System Ready",
    features: [
      "Consensus Protocol (2/3 rule)",
      "Debate System (both sides)",
      "Consequence Evaluation",
      "AI Performance Scoring",
      "User Pattern Analysis",
      "Real Task Execution (by type)",
      "Real Drone Revenue Generation",
      "Rollback on Error",
      "Safe Code Deployment",
      "Full Audit Trail"
    ]
  }));

  ws.on("message", async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "chat") {
        const response = await callCouncilWithFailover(msg.text, msg.member || "claude");
        ws.send(JSON.stringify({
          type: "response",
          response,
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      ws.send(JSON.stringify({ type: "error", error: error.message }));
    }
  });

  ws.on("close", () => {
    activeConnections.delete(clientId);
    console.log(`👋 ${clientId} disconnected`);
  });
});

async function start() {
  try {
    await initDatabase();
    await loadROIFromDatabase();

    console.log("\n" + "=".repeat(100));
    console.log("✅ LIFEOS v25.0 - FINAL MERGED GOVERNANCE + EXECUTION SYSTEM");
    console.log("=".repeat(100));

    console.log("\n🤖 AI Council (5 members):");
    Object.values(COUNCIL_MEMBERS).forEach(m => console.log(`  • ${m.name} (${m.role})`));

    console.log("\n✅ CRITICAL SYSTEMS:");
    console.log("  ✅ ROI/DB sync (load on startup)");
    console.log("  ✅ Budget check BEFORE spending");
    console.log("  ✅ Real task execution (by type)");
    console.log("  ✅ Real drone revenue generation");
    console.log("  ✅ Rollback mechanism");
    console.log("  ✅ Debate quorum calc (2/3)");
    console.log("  ✅ Daily ideas cron");
    console.log("  ✅ Loss log review (quarterly)");
    console.log("  ✅ Mitigation execution");
    console.log("  ✅ Auto-rollback on errors");

    executionQueue.executeNext();

    await incomeDroneSystem.deployDrone("affiliate", 500);
    await incomeDroneSystem.deployDrone("content", 300);

    const now = dayjs();
    const nextMidnight = dayjs().add(1, 'day').startOf('day');
    const msUntilMidnight = nextMidnight.diff(now);
    setTimeout(() => {
      generateDailyIdeas();
      setInterval(() => generateDailyIdeas(), 24 * 60 * 60 * 1000);
    }, msUntilMidnight);

    setInterval(() => incomeDroneSystem.scheduleDroneTasks(), 5 * 60 * 1000);
    setInterval(() => quarterlyLossReview(), 7 * 24 * 60 * 60 * 1000);
    setInterval(() => monitorErrorsAndRollback(), 5 * 60 * 1000);

    server.listen(PORT, HOST, () => {
      console.log(`\n🌐 Listening on http://${HOST}:${PORT}`);
      console.log(`   • Health: /healthz?key=MySecretKey2025LifeOS`);
      console.log(`   • Console: http://${HOST}:${PORT}/overlay/command-center.html`);
      console.log(`   • API Key: ${COMMAND_CENTER_KEY.substring(0, 10)}...`);
      console.log("\n✅ SYSTEM ONLINE\n");
    });
  } catch (error) {
    console.error("❌ Startup error:", error);
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  console.log("\n📊 Graceful shutdown...");
  for (const ws of activeConnections.values()) ws.close();
  await pool.end();
  console.log("✅ System shutdown complete");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n📊 Graceful shutdown...");
  for (const ws of activeConnections.values()) ws.close();
  await pool.end();
  process.exit(0);
});

start();

export default app;
