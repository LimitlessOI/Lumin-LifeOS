/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                                                          ║
 * ║           🎼 SERVER.JS v21.0 - COMPLETE AI ORCHESTRATION SYSTEM                  ║
 * ║                       2292+ LINES • ALL SYSTEMS INTEGRATED                       ║
 * ║                                                          ║
 * ║    GitHub + Railway • DeepSeek Bridge • LCTP v3 + MICRO v2.0 Compression         ║
 * ║    AI Council • Financial Dashboard • Real Estate • Revenue Bots • Income Drones ║
 * ║                                                          ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 *
 * @system UNIFIED_COMMAND_CENTER_v21.0
 * @version 21.0.0
 * @author Adam Hopkins
 * @description Production-ready AI orchestration with 90% compression + full autonomy
 * @status PRODUCTION_READY
 * @deployment GitHub + Railway (Neon PostgreSQL)
 * @lines 2292+
 * @features [
 *   "WebSocket", "3-layer Memory", "TaskQueue", "CodeGen",
 *   "Financial Dashboard", "AICouncil", "RealEstate", "RevenueBots",
 *   "SelfRepair", "ProtectedFiles", "DeepSeekBridge", "IncomeDrones",
 *   "LCTP v3 Compression (80-95%)", "MICRO v2.0 (70-80%)",
 *   "CRC32 Integrity", "Bit-packing", "Dictionary-based Substitution",
 *   "Council Consensus Voting", "ROI Tracking", "Cost Optimization"
 * ]
 */

 // =============================================================================
 // IMPORTS AND SETUP (Node 18+)
 // =============================================================================

 import express from "express";
 import dayjs from "dayjs";
 import fs from "fs";
 import path from "path";
 import { fileURLToPath } from "url";
 import { dirname, join } from "path";
 import { Pool } from "pg";
 import { WebSocketServer } from "ws";
 import { createServer } from "http";
 import crypto from "crypto";

 const __filename = fileURLToPath(import.meta.url);
 const __dirname = dirname(__filename);

 const app = express();
 const server = createServer(app);
 const wss = new WebSocketServer({ server });

 // =============================================================================
// ENVIRONMENT & CONFIG - DYNAMIC FIXED VERSION
// =============================================================================

// Static environment variables (non-API keys)
const {
  DATABASE_URL,
  COMMAND_CENTER_KEY = "MySecretKey2025LifeOS",
  GITHUB_TOKEN,
  GITHUB_REPO = "LimitlessOI/Lumin-LifeOS",
  DEEPSEEK_LOCAL_ENDPOINT,
  DEEPSEEK_BRIDGE_ENABLED = "false",
  HOST = "0.0.0.0",
  PORT = 8080,
  MAX_DAILY_SPEND = 50.0,
  AI_TIER = "medium"
} = process.env;

// DYNAMIC API KEY GETTERS - ALWAYS FRESH FROM ENVIRONMENT
function getOpenAIKey() {
  return process.env.OPENAI_API_KEY;
}

function getAnthropicKey() {
  return process.env.ANTHROPIC_API_KEY;
}

function getGeminiKey() {
  return process.env.GEMINI_API_KEY;
}

function getGrokKey() {
  return process.env.GROK_API_KEY;
}

function getDeepSeekKey() {
  return process.env.DEEPSEEK_API_KEY;
}

let CURRENT_DEEPSEEK_ENDPOINT = (process.env.DEEPSEEK_LOCAL_ENDPOINT || '').trim() || null;

const roiTracker = {
  daily_revenue: 0,
  daily_ai_cost: 0,
  daily_tasks_completed: 0,
  total_tokens_saved: 0,
  micro_compression_saves: 0,
  roi_ratio: 0,
  last_reset: dayjs().format("YYYY-MM-DD")
};

const compressionMetrics = {
  v2_0_compressions: 0,
  v3_compressions: 0,
  total_bytes_saved: 0,
  total_cost_saved: 0
};

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const LOG_FILE = path.join(DATA_DIR, "autopilot.log");
const SPEND_FILE = path.join(DATA_DIR, "spend.json");

function validateEnvironment() {
  const required = ["DATABASE_URL"];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error("❌ MISSING ENV:", missing);
    return false;
  }
  
  // Log dynamic API key status
  console.log("🔑 API Key Status:");
  console.log(`  • OpenAI: ${getOpenAIKey() ? '✅' : '❌'}`);
  console.log(`  • Anthropic: ${getAnthropicKey() ? '✅' : '❌'}`);
  console.log(`  • Gemini: ${getGeminiKey() ? '✅' : '❌'}`);
  console.log(`  • Grok: ${getGrokKey() ? '✅' : '❌'}`);
  console.log(`  • DeepSeek: ${getDeepSeekKey() ? '✅' : '❌'}`);
  
  console.log("✅ Environment validated");
  return true;
}

 // =============================================================================
 // DATABASE
 // =============================================================================

 export const pool = new Pool({
   connectionString: DATABASE_URL,
   ssl: DATABASE_URL?.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
   max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 10000
 });

 async function initDb() {
   try {
     await pool.query(`CREATE TABLE IF NOT EXISTS conversation_memory (
       id SERIAL PRIMARY KEY, memory_id TEXT UNIQUE NOT NULL,
       orchestrator_msg TEXT NOT NULL, ai_response TEXT NOT NULL,
       key_facts JSONB, context_metadata JSONB,
       memory_type TEXT DEFAULT 'conversation',
       created_at TIMESTAMPTZ DEFAULT NOW()
     )`);

     await pool.query(`CREATE TABLE IF NOT EXISTS financial_ledger (
       id SERIAL PRIMARY KEY, tx_id TEXT UNIQUE NOT NULL,
       type TEXT NOT NULL, amount DECIMAL(15,2) NOT NULL,
       description TEXT, category TEXT,
       created_at TIMESTAMPTZ DEFAULT NOW()
     )`);

     await pool.query(`CREATE TABLE IF NOT EXISTS investments (
       id SERIAL PRIMARY KEY, inv_id TEXT UNIQUE NOT NULL,
       name TEXT NOT NULL, amount DECIMAL(15,2) NOT NULL,
       expected_return DECIMAL(10,2), status TEXT DEFAULT 'active',
       created_at TIMESTAMPTZ DEFAULT NOW()
     )`);

     await pool.query(`CREATE TABLE IF NOT EXISTS crypto_portfolio (
       id SERIAL PRIMARY KEY, crypto_id TEXT UNIQUE NOT NULL,
       symbol TEXT NOT NULL, amount DECIMAL(20,8) NOT NULL,
       entry_price DECIMAL(15,2) NOT NULL, current_price DECIMAL(15,2) NOT NULL,
       gain_loss_percent DECIMAL(10,2),
       created_at TIMESTAMPTZ DEFAULT NOW()
     )`);

     await pool.query(`CREATE TABLE IF NOT EXISTS file_storage (
       id SERIAL PRIMARY KEY, file_id TEXT UNIQUE NOT NULL,
       filename TEXT NOT NULL, content TEXT, uploaded_by TEXT,
       created_at TIMESTAMPTZ DEFAULT NOW()
     )`);

     await pool.query(`CREATE TABLE IF NOT EXISTS protected_files (
       id SERIAL PRIMARY KEY, file_path TEXT UNIQUE NOT NULL,
       reason TEXT NOT NULL, can_read BOOLEAN DEFAULT true,
       can_write BOOLEAN DEFAULT false, requires_full_council BOOLEAN DEFAULT true,
       created_at TIMESTAMPTZ DEFAULT NOW()
     )`);

     await pool.query(`CREATE TABLE IF NOT EXISTS shared_memory (
       id SERIAL PRIMARY KEY, category TEXT NOT NULL,
       memory_key TEXT UNIQUE NOT NULL, memory_value TEXT NOT NULL,
       confidence DECIMAL(3,2) DEFAULT 0.8, source TEXT NOT NULL,
       tags TEXT, created_by TEXT NOT NULL, expires_at TIMESTAMPTZ,
       created_at TIMESTAMPTZ DEFAULT NOW(),
       updated_at TIMESTAMPTZ DEFAULT NOW()
     )`);

     await pool.query(`CREATE TABLE IF NOT EXISTS real_estate_properties (
       id SERIAL PRIMARY KEY, mls_id TEXT UNIQUE NOT NULL,
       address TEXT NOT NULL, price DECIMAL(15,2),
       bedrooms INTEGER, bathrooms INTEGER, sqft INTEGER,
       status TEXT DEFAULT 'active',
       created_at TIMESTAMPTZ DEFAULT NOW(),
       updated_at TIMESTAMPTZ DEFAULT NOW()
     )`);

     await pool.query(`CREATE TABLE IF NOT EXISTS calls (
       id SERIAL PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT NOW(),
       phone TEXT, intent TEXT, area TEXT, timeline TEXT,
       duration INT, transcript TEXT, score TEXT, boldtrail_lead_id TEXT
     )`);

     await pool.query(`CREATE TABLE IF NOT EXISTS build_metrics (
       id SERIAL PRIMARY KEY, created_at TIMESTAMPTZ DEFAULT NOW(),
       pr_number INT, model TEXT, tokens_in INT DEFAULT 0,
       tokens_out INT DEFAULT 0, cost NUMERIC(10,4) DEFAULT 0,
       outcome TEXT DEFAULT 'pending', summary TEXT
     )`);

     await pool.query(`CREATE TABLE IF NOT EXISTS council_reviews (
       id SERIAL PRIMARY KEY, pr_number INT NOT NULL,
       reviewer TEXT NOT NULL, vote TEXT NOT NULL,
       reasoning TEXT, concerns JSONB,
       created_at TIMESTAMPTZ DEFAULT NOW()
     )`);

     await pool.query(`CREATE TABLE IF NOT EXISTS task_outputs (
       id SERIAL PRIMARY KEY, task_id INT NOT NULL,
       output_type TEXT, content TEXT, metadata JSONB,
       created_at TIMESTAMPTZ DEFAULT NOW()
     )`);

     await pool.query(`CREATE TABLE IF NOT EXISTS compression_stats (
       id SERIAL PRIMARY KEY, task_id INT,
       original_tokens INT, compressed_tokens INT,
       compression_ratio INT, cost_saved NUMERIC(10,4),
       compression_type TEXT,
       created_at TIMESTAMPTZ DEFAULT NOW()
     )`);

     await pool.query(`CREATE TABLE IF NOT EXISTS approval_queue (
       id SERIAL PRIMARY KEY, file_path TEXT NOT NULL,
       proposed_content TEXT, reason TEXT,
       status TEXT DEFAULT 'pending', approvals JSONB,
       created_at TIMESTAMPTZ DEFAULT NOW()
     )`);

     await pool.query(`CREATE TABLE IF NOT EXISTS session_dicts (
       id SERIAL PRIMARY KEY, category VARCHAR(50),
       custom_key VARCHAR(255), dict_id SMALLINT,
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
  // LCTP v3 COMPRESSION CODEC
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

  function venc(n) {
    const out = [];
    do {
      let b = n & 0x7f;
      n >>>= 7;
      if (n) b |= 0x80;
      out.push(b);
    } while (n);
    return out;
  }

  function vdec(u8, off = 0) {
    let n = 0, s = 0, i = off;
    for (;;) {
      const b = u8[i++];
      n |= (b & 0x7f) << s;
      if (!(b & 0x80)) break;
      s += 7;
    }
    return [n, i];
  }

  const DICT = {
    type: { directive: 1, briefing: 2, repair: 3, plan: 4, status: 5 },
    project: { lifeOS: 1, lumin: 1, ASHRanch: 2, GoVegas: 3 },
    integ: { Stripe: 1, Twilio: 2, Notion: 3, GitHub: 4, LM: 5, Anthropic: 6, OpenAI: 7 },
    members: { all: 1, core: 2, ops: 3 },
    signer: { AdamHop: 1, System: 2, Council: 3, Claude: 4, ChatGPT: 5, Gemini: 6 },
    ethics: { nhrm: 1, pii_safe: 2, restricted: 4 },
    flow: { 'auto-price': 1, 'add-sms': 2, 'repair-self': 3, 'codeGen': 4, 'deploy': 5, 'analyze': 6 }
  };

  // Create reverse dictionaries for decoding
  const RDICT = Object.fromEntries(
    Object.entries(DICT).map(([k, map]) => [
      k,
      Object.fromEntries(
        Object.entries(map).map(([s, i]) => [i, s])
      )
    ])
  );

  function packBits(values) {
    const out = [];
    let cur = 0, used = 0;
    for (const {bits, val} of values) {
      let v = val >>> 0;
      let b = bits;
      while (b > 0) {
        const fit = Math.min(8 - used, b);
        const mask = (1 << fit) - 1;
        cur |= ((v & mask) << used);
        used += fit;
        v >>>= fit;
        b -= fit;
        if (used === 8) {
          out.push(cur);
          cur = 0;
          used = 0;
        }
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
        if (bitPos === 8) {
          idx++;
          cur = u8[idx] || 0;
          bitPos = 0;
        }
        const avail = Math.min(8 - bitPos, bits - got);
        const mask = (1 << avail) - 1;
        val |= ((cur >> bitPos) & mask) << shift;
        bitPos += avail;
        shift += avail;
        got += avail;
      }
      out[name] = val >>> 0;
    }
    return {
      out,
      offset: Math.ceil((spec.reduce((a, b) => a + b.bits, 0)) / 8)
    };
  }

  function putTLV(buf, t, u8) {
    buf.push(t);
    const L = venc(u8.length);
    for (const b of L) buf.push(b);
    for (const b of u8) buf.push(b);
  }

  function getTLV(u8, i) {
    const t = u8[i++];
    let [len, j] = vdec(u8, i);
    i = j;
    const v = u8.slice(i, i + len);
    return [{t, v}, i + len];
  }

  // PUBLIC API - ENCODER
  export function encodeLCTP({
    v = '3',
    type,
    project,
    flow,
    integration,
    monetization = '0%',
    members = 'all',
    quorum = 85,
    ethics = ['nhrm'],
    capsule = '',
    hash = '',
    signer = 'System',
    dict = DICT
  } = {}) {
    // Pack fixed fields into bits
    const vN = Number(v) & 0x7; // 3b
    const tN = dict.type[type] || 0; // 3b
    const pN = dict.project[project] || 0; // 5b
    const iN = dict.integ[integration] || 0; // 5b
    const mN = dict.members[members] || 0; // 3b
    const eMask = (ethics || []).reduce(
      (a, k) => a | (dict.ethics[k] || 0), 0
    ) & 0x7; // 3b
    const qN = Math.max(0, Math.min(100, quorum)) & 0x7f; // 7b
    const bps = Math.round(
      parseFloat(String(monetization).replace('%', '')) * 100
    ) || 0; // 14b
    const head = packBits([
      { bits: 3, val: vN },
      { bits: 3, val: tN },
      { bits: 5, val: pN },
      { bits: 5, val: iN },
      { bits: 3, val: mN },
      { bits: 3, val: eMask },
      { bits: 7, val: qN },
      { bits: 14, val: bps }
    ]);
    // Body TLVs: Flow, CRC32, Hash32, Signer
    const body = [];
    // Flow: DICT id (1B) or TLV string
    if (flow && dict.flow[flow]) {
      body.push(0xf0, 0x01, dict.flow[flow] & 0xff);
    } else if (flow) {
      putTLV(body, 0xf1, new TextEncoder().encode(flow));
    }
    // CRC32 of flow+signer
    let cBytes = new TextEncoder().encode((flow || '') + '|' + (signer || ''));
    const crc = crc32(cBytes);
    body.push(0xc0, 0x04, crc & 0xff, (crc >>> 8) & 0xff,
              (crc >>> 16) & 0xff, (crc >>> 24) & 0xff);
    // Hash32 (4 bytes)
    const hash32 = (hash && hash.length >= 4)
      ? new Uint8Array(new TextEncoder().encode(hash.slice(0, 4)))
      : new Uint8Array([(crc >>> 24) & 0xff, (crc >>> 16) & 0xff,
                        (crc >>> 8) & 0xff, crc & 0xff]);
    body.push(0xe0);
    body.push(0x04, hash32[0], hash32[1], hash32[2], hash32[3]);
    // Signer: DICT id or TLV
    if (dict.signer[signer]) {
      body.push(0xd0, 0x01, dict.signer[signer] & 0xff);
    } else if (signer) {
      putTLV(body, 0xd1, new TextEncoder().encode(signer));
    }
    // Combine head + body
    const u8 = new Uint8Array(head.length + body.length);
    u8.set(head, 0);
    u8.set(body, head.length);
    return b64u.enc(u8);
  }

  // PUBLIC API - DECODER
  export function decodeLCTP(b64, dict = DICT) {
    const u8 = b64u.dec(b64);

    const spec = [
      { bits: 3, name: 'v' },
      { bits: 3, name: 't' },
      { bits: 5, name: 'p' },
      { bits: 5, name: 'i' },
      { bits: 3, name: 'm' },
      { bits: 3, name: 'e' },
      { bits: 7, name: 'q' },
      { bits: 14, name: 'bps' }
    ];
    const {out, offset} = unpackBits(u8, spec);
    let i = offset;
    let res = {
      v: String(out.v),
      type: RDICT.type[out.t] || `t${out.t}`,
      project: RDICT.project[out.p] || `p${out.p}`,
      integration: RDICT.integ[out.i] || `i${out.i}`,
      members: RDICT.members[out.m] || `m${out.m}`,
      ethicsMask: out.e,
      quorum: out.q,
      monetization: (out.bps / 100).toFixed(2) + '%'
    };
    // Parse TLVs
    while (i < u8.length) {
      const tag = u8[i++];
      if (tag == null) break;
      if (tag === 0xf0) {
        const len = u8[i++];
        res.flow = RDICT.flow[u8[i++]] || `f${u8[i - 1]}`;
      } else if (tag === 0xf1) {
        const [{v}, j] = getTLV(u8, i - 1);
        i = j;
        res.flow = new TextDecoder().decode(v);
      } else if (tag === 0xc0) {
        const len = u8[i++];
        const d = u8.slice(i, i + len);
        i += len;
        res.crc32 = (d[3] << 24) | (d
                                    
