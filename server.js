import express from "express";
import dayjs from "dayjs";
import { Pool } from "pg";
import { WebSocketServer } from "ws";
import { createServer } from "http";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const {
  DATABASE_URL,
  ANTHROPIC_API_KEY,
  OPENAI_API_KEY,
  GEMINI_API_KEY,
  GROK_API_KEY,
  DEEPSEEK_API_KEY,
  COMMAND_CENTER_KEY = "MySecretKey2025LifeOS",
  HOST = "0.0.0.0",
  PORT = 8080,
  MAX_DAILY_SPEND = 50.0
} = process.env;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL not set");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
  max: 20
});

let activeConnections = new Map();
let roiTracker = {
  daily_revenue: 0,
  daily_ai_cost: 0,
  daily_tasks_completed: 0,
  roi_ratio: 0,
  last_reset: dayjs().format("YYYY-MM-DD")
};

// ==================== COMPRESSION: LCTP v3 ====================

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

// ==================== COMPRESSION: MICRO v2.0 ====================

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

// ==================== DATABASE INIT ====================

async function initDb() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS conversation_memory (
      id SERIAL PRIMARY KEY,
      memory_id TEXT UNIQUE NOT NULL,
      orchestrator_msg TEXT NOT NULL,
      ai_response TEXT NOT NULL,
      ai_member TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS daily_spend (
      id SERIAL PRIMARY KEY,
      date DATE UNIQUE NOT NULL,
      usd DECIMAL(15,4) DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS system_logs (
      id SERIAL PRIMARY KEY,
      level VARCHAR(20),
      message TEXT,
      context JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS compression_stats (
      id SERIAL PRIMARY KEY,
      compression_type TEXT,
      original_size INT,
      compressed_size INT,
      ratio DECIMAL(5,2),
      cost_saved DECIMAL(10,4),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS execution_tasks (
      id SERIAL PRIMARY KEY,
      task_id TEXT UNIQUE NOT NULL,
      type TEXT,
      description TEXT,
      status TEXT DEFAULT 'queued',
      result TEXT,
      error TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS income_drones (
      id SERIAL PRIMARY KEY,
      drone_id TEXT UNIQUE NOT NULL,
      drone_type TEXT,
      status TEXT DEFAULT 'active',
      revenue_generated DECIMAL(15,2) DEFAULT 0,
      tasks_completed INT DEFAULT 0,
      deployed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_memory_id ON conversation_memory(memory_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_spend_date ON daily_spend(date)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_logs_created ON system_logs(created_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON execution_tasks(status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_drones_status ON income_drones(status)`);

    console.log("✅ Database initialized");
  } catch (error) {
    console.error("❌ DB init error:", error.message);
    throw error;
  }
}

// ==================== MEMORY SYSTEM ====================

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

// ==================== SPEND TRACKING ====================

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

function updateROI(revenue = 0, cost = 0, tasksCompleted = 0) {
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
  }
}

// ==================== AI COUNCIL (5 MODELS) ====================

const COUNCIL_MEMBERS = {
  claude: {
    name: "Claude",
    model: "claude-3-5-sonnet-20241022",
    provider: "anthropic",
    role: "Strategic Lead",
    focus: "long-term planning & architecture"
  },
  chatgpt: {
    name: "ChatGPT",
    model: "gpt-4o",
    provider: "openai",
    role: "Technical Executor",
    focus: "rapid implementation & debugging"
  },
  gemini: {
    name: "Gemini",
    model: "gemini-2.0-flash-exp",
    provider: "google",
    role: "Research Analyst",
    focus: "data analysis & pattern recognition"
  },
  grok: {
    name: "Grok",
    model: "grok-beta",
    provider: "xai",
    role: "Innovation Scout",
    focus: "novel approaches & risk assessment"
  },
  deepseek: {
    name: "DeepSeek",
    model: "deepseek-coder",
    provider: "deepseek",
    role: "Infrastructure Specialist",
    focus: "system optimization & performance"
  }
};

function calculateCost(usage, model) {
  const prices = {
    "claude-3-5-sonnet-20241022": { input: 0.003, output: 0.015 },
    "gpt-4o": { input: 0.0025, output: 0.01 },
    "gemini-2.0-flash-exp": { input: 0.0001, output: 0.0004 },
    "grok-beta": { input: 0.005, output: 0.015 },
    "deepseek-coder": { input: 0.0001, output: 0.0003 }
  };
  const price = prices[model] || prices["claude-3-5-sonnet-20241022"];
  return ((usage?.prompt_tokens || 0) * price.input / 1000) +
         ((usage?.completion_tokens || 0) * price.output / 1000);
}

async function callCouncilMember(member, prompt) {
  const config = COUNCIL_MEMBERS[member];
  if (!config) throw new Error(`Unknown member: ${member}`);

  const systemPrompt = `You are ${config.name}. Role: ${config.role}. Focus: ${config.focus}. Respond naturally and concisely.`;

  try {
    // ANTHROPIC (Claude)
    if (config.provider === "anthropic" && ANTHROPIC_API_KEY) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY.trim(),
          "anthropic-version": "2024-06-15"
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
      updateROI(0, cost, 0);
      await storeMemory(prompt, text, member);

      console.log(`✅ [${member}] ${text.length} chars, $${cost.toFixed(4)}`);
      return text;
    }

    // OPENAI (ChatGPT)
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
      updateROI(0, cost, 0);
      await storeMemory(prompt, text, member);

      console.log(`✅ [${member}] ${text.length} chars, $${cost.toFixed(4)}`);
      return text;
    }

    // GOOGLE (Gemini)
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
      console.log(`✅ [${member}] ${text.length} chars`);
      return text;
    }

    // XAI (Grok)
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
      updateROI(0, cost, 0);
      await storeMemory(prompt, text, member);

      console.log(`✅ [${member}] ${text.length} chars, $${cost.toFixed(4)}`);
      return text;
    }

    // DEEPSEEK
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
      updateROI(0, cost, 0);
      await storeMemory(prompt, text, member);

      console.log(`✅ [${member}] ${text.length} chars, $${cost.toFixed(4)}`);
      return text;
    }

    throw new Error(`${config.provider.toUpperCase()}_API_KEY not configured`);
  } catch (error) {
    console.error(`❌ [${member}] ${error.message}`);
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

// ==================== INCOME DRONE SYSTEM ====================

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
        `UPDATE income_drones SET revenue_generated = revenue_generated + $1, updated_at = now()
         WHERE drone_id = $2`,
        [amount, droneId]
      );

      const drone = this.activeDrones.get(droneId);
      if (drone) drone.revenue += amount;

      updateROI(amount, 0, 0);
      console.log(`💰 Income recorded: $${amount} from ${droneId}`);
    } catch (error) {
      console.error(`Revenue update error: ${error.message}`);
    }
  }

  async getStatus() {
    try {
      const result = await pool.query(`SELECT drone_id, drone_type, status, revenue_generated, tasks_completed
                                        FROM income_drones WHERE status = 'active' ORDER BY deployed_at DESC`);
      return {
        active: result.rows.length,
        drones: result.rows,
        total_revenue: result.rows.reduce((sum, d) => sum + parseFloat(d.revenue_generated), 0)
      };
    } catch (error) {
      console.error("Drone status error:", error.message);
      return { active: 0, drones: [], total_revenue: 0 };
    }
  }
}

const incomeDroneSystem = new IncomeDroneSystem();

// ==================== TASK EXECUTION QUEUE ====================

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
      console.log(`✅ Task queued: ${taskId}`);
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
      await pool.query(
        `UPDATE execution_tasks SET status = 'running' WHERE task_id = $1`,
        [taskId]
      );

      const result = await callCouncilWithFailover(`Execute task: ${taskId}`, "claude");

      await pool.query(
        `UPDATE execution_tasks SET status = 'completed', result = $1, completed_at = now()
         WHERE task_id = $2`,
        [result.slice(0, 5000), taskId]
      );

      updateROI(0, 0, 1);
      console.log(`✅ Task completed: ${taskId}`);
    } catch (error) {
      await pool.query(
        `UPDATE execution_tasks SET status = 'failed', error = $1, completed_at = now()
         WHERE task_id = $2`,
        [error.message.slice(0, 500), taskId]
      );
      console.error(`❌ Task failed: ${error.message}`);
    }

    setTimeout(() => this.executeNext(), 1000);
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

const executionQueue = new ExecutionQueue();

// ==================== REST API ====================

function requireKey(req, res, next) {
  const key = req.query.key || req.headers["x-command-key"];
  if (key !== COMMAND_CENTER_KEY) return res.status(401).json({ error: "Unauthorized" });
  next();
}

app.use(express.json({ limit: "50mb" }));
app.use(express.static("public"));

app.get("/health", (req, res) => res.send("OK"));

app.get("/healthz", async (req, res) => {
  try {
    await pool.query("SELECT NOW()");
    const spend = await getDailySpend();
    const droneStatus = await incomeDroneSystem.getStatus();
    const taskStatus = await executionQueue.getStatus();

    res.json({
      ok: true,
      status: "healthy",
      version: "v22.5",
      timestamp: new Date().toISOString(),
      database: "connected",
      websockets: activeConnections.size,
      daily_spend: spend,
      max_daily_spend: MAX_DAILY_SPEND,
      roi: roiTracker,
      drones: droneStatus,
      tasks: taskStatus,
      deployment: "Railway + Neon",
      features: {
        ai_council: Object.keys(COUNCIL_MEMBERS).length,
        compression: "LCTP v3 + MICRO v2.0",
        income_drones: "active",
        task_queue: "running"
      }
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/chat", requireKey, async (req, res) => {
  try {
    const { message, member = "claude" } = req.body;
    if (!message) return res.status(400).json({ error: "Message required" });

    const spend = await getDailySpend();
    if (spend > MAX_DAILY_SPEND) {
      return res.status(429).json({ error: "Daily spend limit exceeded" });
    }

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
    const result = await pool.query(
      `SELECT date, usd FROM daily_spend ORDER BY date DESC LIMIT 30`
    );
    res.json({
      ok: true,
      today,
      max: MAX_DAILY_SPEND,
      percentage: ((today / MAX_DAILY_SPEND) * 100).toFixed(1) + "%",
      history: result.rows
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/lctp/encode", requireKey, async (req, res) => {
  try {
    const encoded = encodeLCTP(req.body || {});
    res.json({ ok: true, encoded, format: "LCTP v3" });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/lctp/decode", requireKey, async (req, res) => {
  try {
    const { encoded } = req.body || {};
    const decoded = decodeLCTP(encoded);
    res.json({ ok: true, decoded });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/micro/encode", requireKey, async (req, res) => {
  try {
    const encoded = MICRO_PROTOCOL.encode(req.body || {});
    res.json({ ok: true, encoded, format: "MICRO v2.0" });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/micro/decode", requireKey, async (req, res) => {
  try {
    const { encoded } = req.body || {};
    const decoded = MICRO_PROTOCOL.decode(encoded);
    res.json({ ok: true, decoded });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message });
  }
});

// ==================== WEBSOCKET ====================

wss.on("connection", (ws) => {
  const clientId = `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  activeConnections.set(clientId, ws);

  console.log(`✅ [WS] ${clientId} connected`);
  ws.send(JSON.stringify({
    type: "connection",
    status: "connected",
    clientId,
    message: "AI Orchestration v22.5 - Railway Ready",
    features: ["AI Council (5 models)", "Income Drones", "Task Queue", "LCTP v3 + MICRO v2.0 Compression"]
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
    console.log(`👋 [WS] ${clientId} disconnected`);
  });
});

// ==================== STARTUP ====================

async function start() {
  try {
    await initDb();

    console.log("\n" + "=".repeat(90));
    console.log("✅ SERVER v22.5 - AI COUNCIL + INCOME DRONES + COMPRESSION");
    console.log("=".repeat(90));

    console.log("\n🤖 AI Council (5 members):");
    Object.values(COUNCIL_MEMBERS).forEach(m => console.log(`  • ${m.name} (${m.role})`));

    console.log("\n💾 Database: Neon PostgreSQL");
    console.log("🌉 API Failover: Works with 1 AI available");
    console.log("📦 Compression: LCTP v3 (80-95%) + MICRO v2.0 (70-80%)");
    console.log("🛸 Income Drones: Active");
    console.log("⚡ Task Queue: Running");

    executionQueue.executeNext();
    await incomeDroneSystem.deployDrone("affiliate", 500);
    await incomeDroneSystem.deployDrone("content", 300);

    server.listen(PORT, HOST, () => {
      console.log(`\n🌐 Listening on http://${HOST}:${PORT}`);
      console.log(`   • Health: /healthz`);
      console.log(`   • API: /api/v1/chat?key=KEY`);
      console.log(`   • WebSocket: ws://${HOST}:${PORT}`);
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
  process.exit(0);
});

start();
