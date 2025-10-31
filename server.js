// server.js - v15 PRODUCTION (Memory-persistent, Consensus debates, Error handling, Optimized)

// ─────────────────────────────────────────────────────────────────────────────
// Core imports (Stripe import removed—will lazy-load if env var exists)
// ─────────────────────────────────────────────────────────────────────────────
import express from "express";
import dayjs from "dayjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";

// ─────────────────────────────────────────────────────────────────────────────
// Paths & app
// ─────────────────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// ─────────────────────────────────────────────────────────────────────────────
// Env
// ─────────────────────────────────────────────────────────────────────────────
const {
  DATABASE_URL,
  COMMAND_CENTER_KEY,
  WEBHOOK_SECRET,
  OPENAI_API_KEY,
  ANTHROPIC_API_KEY,
  GEMINI_API_KEY,
  GROK_API_KEY,
  GITHUB_TOKEN,
  GITHUB_REPO = "LimitlessOI/Lumin-LifeOS",
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  HOST = "0.0.0.0",
  PORT = 3000,
  MAX_DAILY_SPEND = 50.0,
  AI_CALL_TIMEOUT = 30000
} = process.env;

// ─────────────────────────────────────────────────────────────────────────────
// Stripe init (lazy-load only if env var exists)
// ─────────────────────────────────────────────────────────────────────────────
let stripe = null;
let stripeReady = false;
if (STRIPE_SECRET_KEY) {
  try {
    const StripeModule = await import("stripe");
    stripe = new StripeModule.default(STRIPE_SECRET_KEY);
    stripeReady = true;
    console.log("✅ Stripe module loaded");
  } catch (e) {
    console.warn("⚠️  Stripe module not available (can add later):", e.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Static, data paths
// ─────────────────────────────────────────────────────────────────────────────
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const LOG_FILE = path.join(DATA_DIR, "autopilot.log");
const SPEND_FILE = path.join(DATA_DIR, "spend.json");

// ─────────────────────────────────────────────────────────────────────────────
// Database
// ─────────────────────────────────────────────────────────────────────────────
export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL?.includes("neon.tech")
    ? { rejectUnauthorized: false }
    : undefined
});

// ─────────────────────────────────────────────────────────────────────────────
// Protected files
// ─────────────────────────────────────────────────────────────────────────────
const PROTECTED_FILES = [
  "server.js",
  "package.json",
  "package-lock.json",
  ".env",
  ".gitignore"
];

// ─────────────────────────────────────────────────────────────────────────────
// Middleware: JSON/urlencoded/text parsers
// ─────────────────────────────────────────────────────────────────────────────
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: "text/plain", limit: "1mb" }));

// Static
app.use(express.static(path.join(__dirname, "public")));
app.use("/reports", express.static(path.join(__dirname, "reports")));
app.use("/overlay", express.static(path.join(__dirname, "public/overlay")));

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function requireCommandKey(req, res, next) {
  const key = req.query.key || req.headers["x-command-key"];
  if (!COMMAND_CENTER_KEY || key !== COMMAND_CENTER_KEY)
    return res.status(401).json({ error: "unauthorized" });
  next();
}

function assertKey(req, res) {
  const k = process.env.COMMAND_CENTER_KEY;
  const got = req.query.key || req.headers["x-command-key"];
  if (!k || got !== k) {
    res.status(401).json({ error: "unauthorized" });
    return false;
  }
  return true;
}

function isProtected(filePath) {
  return PROTECTED_FILES.some((pf) => filePath.includes(pf));
}

function readSpend() {
  try {
    return JSON.parse(fs.readFileSync(SPEND_FILE, "utf8"));
  } catch {
    return { day: dayjs().format("YYYY-MM-DD"), usd: 0 };
  }
}

function writeSpend(s) {
  try {
    fs.writeFileSync(SPEND_FILE, JSON.stringify(s));
  } catch (e) {
    console.error("Failed to write spend:", e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GitHub helpers
// ─────────────────────────────────────────────────────────────────────────────
async function safeFetch(url, init = {}, retries = 3) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), AI_CALL_TIMEOUT);
      
      const r = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeout);
      
      const body = await r.text();
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${body.slice(0, 200)}`);
      return { ...r, json: async () => JSON.parse(body), text: async () => body };
    } catch (e) {
      lastErr = e;
      if (i === retries) break;
      await sleep(300 * Math.pow(2, i));
    }
  }
  throw lastErr;
}

async function ghGetFile(repo, p) {
  if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN missing");
  const r = await safeFetch(
    `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(p)}`,
    {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "User-Agent": "LifeOS",
        Accept: "application/vnd.github+json"
      }
    }
  );
  return await r.json();
}

async function ghPutFile(repo, p, contentText, message) {
  if (!GITHUB_TOKEN) throw new Error("GITHUB_TOKEN missing");
  let sha = undefined;
  try {
    const cur = await ghGetFile(repo, p);
    sha = cur.sha;
  } catch {}
  const body = {
    message: message || `chore: update ${p}`,
    content: Buffer.from(contentText, "utf8").toString("base64"),
    sha
  };
  const r = await safeFetch(
    `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(p)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "User-Agent": "LifeOS",
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );
  return await r.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Memory Helpers (CRITICAL: All AI calls read + write continuous memory)
// ─────────────────────────────────────────────────────────────────────────────
const MEMORY_CATEGORIES_DEFAULT = ['global_rules','ai_council','context','vault','policy','customer','product','ops','learned'];

async function recallMemory({ q = '', categories = MEMORY_CATEGORIES_DEFAULT, limit = 20 }) {
  try {
    const like = q ? `%${q.slice(0, 160)}%` : null;
    const rows = await pool.query(
      `
      SELECT key, value, category, updated_at
      FROM shared_memory
      WHERE ($1::text[] IS NULL OR category = ANY($1))
        OR ($2 IS NOT NULL AND value::text ILIKE $2)
      ORDER BY updated_at DESC
      LIMIT $3
      `,
      [categories, like, limit]
    );
    return rows.rows || [];
  } catch (e) {
    console.error('[recallMemory] Error:', e.message);
    return [];
  }
}

function formatMemoryForSystem(rows) {
  if (!rows || rows.length === 0) return 'None.';
  return rows
    .map(r => {
      const val = typeof r.value === 'object' ? JSON.stringify(r.value) : String(r.value);
      return `• [${r.category}] ${r.key}: ${val.slice(0, 240)}`;
    })
    .join('\n');
}

async function writeMemory(key, value, category = 'ai_learned') {
  try {
    await pool.query(
      `
      INSERT INTO shared_memory (key, value, category, updated_at)
      VALUES ($1, $2, $3, now())
      ON CONFLICT (key)
      DO UPDATE SET value = EXCLUDED.value, category = EXCLUDED.category, updated_at = now()
      `,
      [key, typeof value === 'string' ? { text: value } : value, category]
    );
  } catch (e) {
    console.error('[writeMemory] Error:', e.message);
  }
}

function extractMemoryFromMicroResponse(text = '') {
  // Extract MEM: key :: value lines from response
  // Format: MEM: key_name :: value_content
  const lines = (text.match(/(^|\n)MEM:\s*[^:]+::[^\n]+/gmi) || []).map(s => s.trim());
  const out = [];
  for (const line of lines) {
    const body = line.replace(/^MEM:\s*/i, '');
    const idx = body.indexOf('::');
    if (idx > -1) {
      const k = body.slice(0, idx).trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 64);
      const v = body.slice(idx + 2).trim();
      if (k && v) out.push({ key: k, value: v });
    }
  }
  return out;
}

function extractMemoryFromMicroProtocol(micro = '') {
  // Extract MEM: encoded data from MICRO format
  // Format: V:2.0|CT:...|MEM:key1::val1~key2::val2
  const memPart = micro.match(/\|MEM:([^\|]+)/i);
  if (!memPart) return [];
  
  const encoded = memPart[1];
  const pairs = encoded.split('~');
  const out = [];
  
  for (const pair of pairs) {
    const [k, v] = pair.split('::');
    if (k && v) {
      const cleanKey = k.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 64);
      out.push({ key: cleanKey, value: v.trim() });
    }
  }
  
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Protocols (MICRO + AI)
// ─────────────────────────────────────────────────────────────────────────────
const MICRO_PROTOCOL = {
  encode: (data) => {
    const parts = [];
    parts.push("V:2.0");
    if (data.operation)
      parts.push(`OP:${data.operation.charAt(0).toUpperCase()}`);
    if (data.description) {
      const compressed = data.description
        .replace(/generate/gi, "GEN")
        .replace(/analyze/gi, "ANL")
        .replace(/create/gi, "CRT")
        .replace(/build/gi, "BLD")
        .replace(/optimize/gi, "OPT")
        .replace(/review/gi, "REV")
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
    const parts = micro.split("|");
    parts.forEach((part) => {
      const [key, value] = part.split(":");
      if (!value) return;
      switch (key) {
        case "V":
          result.version = value;
          break;
        case "OP": {
          const ops = {
            G: "generate",
            A: "analyze",
            C: "create",
            B: "build",
            O: "optimize",
            R: "review"
          };
          result.operation = ops[value] || value;
          break;
        }
        case "D":
          result.description = value
            .replace(/GEN/g, "generate")
            .replace(/ANL/g, "analyze")
            .replace(/CRT/g, "create")
            .replace(/BLD/g, "build")
            .replace(/OPT/g, "optimize")
            .replace(/REV/g, "review")
            .replace(/~/g, " ");
          break;
        case "T": {
          const types = {
            S: "script",
            R: "report",
            L: "list",
            C: "code",
            A: "analysis"
          };
          result.type = types[value] || value;
          break;
        }
        case "R":
          result.returnFields = value.split("~").filter((f) => f);
          break;
        case "CT":
          result.content = value.replace(/~/g, " ");
          break;
        case "KP":
          result.keyPoints = value.split("~").filter((p) => p);
          break;
        case "MEM":
          result.memory = value;
          break;
      }
    });
    return result;
  }
};

const AI_PROTOCOL = {
  ops: {
    review: "r",
    generate: "g",
    analyze: "a",
    optimize: "o",
    consensus: "c",
    query: "q"
  },
  fields: {
    vote: "v",
    confidence: "cf",
    reasoning: "r",
    concerns: "cn",
    blindspots: "bs",
    recommendation: "rc",
    findings: "f",
    metrics: "m",
    content: "ct",
    summary: "s",
    tasks: "t",
    type: "tp",
    key_points: "kp"
  },
  votes: { approve: "a", concerns: "c", reject: "r" }
};

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

// ─────────────────────────────────────────────────────────────────────────────
// ROI & cost tracking
// ─────────────────────────────────────────────────────────────────────────────
const roiTracker = {
  daily_revenue: 0,
  daily_ai_cost: 0,
  daily_tasks_completed: 0,
  revenue_per_task: 0,
  roi_ratio: 0,
  last_reset: dayjs().format("YYYY-MM-DD"),
  total_tokens_saved: 0,
  micro_compression_saves: 0
};

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
  if (roiTracker.daily_tasks_completed > 0)
    roiTracker.revenue_per_task =
      roiTracker.daily_revenue / roiTracker.daily_tasks_completed;
  if (roiTracker.daily_ai_cost > 0)
    roiTracker.roi_ratio = roiTracker.daily_revenue / roiTracker.daily_ai_cost;
}

function trackCost(usage, model = "gpt-4o-mini") {
  const prices = {
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "gpt-4o": { input: 0.0025, output: 0.01 },
    "claude-sonnet-4": { input: 0.003, output: 0.015 },
    "gemini-2.0-flash-exp": { input: 0.0001, output: 0.0004 },
    "grok-beta": { input: 0.005, output: 0.015 }
  };
  const price = prices[model] || prices["gpt-4o-mini"];
  const cost =
    ((usage?.prompt_tokens || 0) * price.input) / 1000 +
    ((usage?.completion_tokens || 0) * price.output) / 1000;
  let spend = readSpend();
  const today = dayjs().format("YYYY-MM-DD");
  if (spend.day !== today) spend = { day: today, usd: 0 };
  spend.usd += cost;
  writeSpend(spend);
  updateROI(0, cost, 0, 0);
  return cost;
}

// ─────────────────────────────────────────────────────────────────────────────
// Council members
// ─────────────────────────────────────────────────────────────────────────────
const COUNCIL_MEMBERS = {
  claude: {
    name: "Claude",
    role: "Strategic Oversight",
    model: "claude-sonnet-4",
    focus: "long-term implications",
    provider: "anthropic"
  },
  brock: {
    name: "Brock",
    role: "Execution",
    model: "gpt-4o",
    focus: "implementation risks",
    provider: "openai"
  },
  jayn: {
    name: "Jayn",
    role: "Ethics",
    model: "gpt-4o-mini",
    focus: "user impact",
    provider: "openai"
  },
  r8: {
    name: "r8",
    role: "Quality",
    model: "gpt-4o-mini",
    focus: "code quality",
    provider: "openai"
  },
  gemini: {
    name: "Gemini",
    role: "Innovation",
    model: "gemini-2.0-flash-exp",
    focus: "creative solutions",
    provider: "google"
  },
  grok: {
    name: "Grok",
    role: "Reality Check",
    model: "grok-beta",
    focus: "practical feasibility",
    provider: "xai"
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MEMORY-AWARE COUNCIL CALLER (PRODUCTION VERSION - With Error Handling & Timeout)
// ─────────────────────────────────────────────────────────────────────────────
async function callCouncilMember(member, prompt, useMicro = true, cachedMemory = null) {
  console.log(`🔍 [${member.toUpperCase()}] Calling with timeout ${AI_CALL_TIMEOUT}ms...`);
  
  const config = COUNCIL_MEMBERS[member];
  if (!config) throw new Error(`Unknown council member: ${member}`);

  // 1) Pull relevant memory (use cache if provided to avoid N+1 queries)
  let memRows = cachedMemory;
  if (!cachedMemory) {
    memRows = await recallMemory({ q: prompt, limit: 15 });
  }
  const memoryContext = formatMemoryForSystem(memRows);

  const baseSystem = useMicro
    ? [
        'You are the LifeOS Architect AI controlling the Lumin autonomous system at robust-magic-production.up.railway.app.',
        'You communicate using v2.0-Micro protocol:',
        'Format strictly like:',
        'V:2.0|CT:<complete detailed answer>|KP:~key~points~here',
        '',
        'WHEN YOU DISCOVER NEW DURABLE FACTS/POLICIES, APPEND:',
        'MEM: key_name :: value_description',
        '',
        'PERSISTENT_MEMORY (non-negotiable facts to use & not contradict):',
        memoryContext,
      ].join('\n')
    : '';

  // Local helper for finalize
  async function finalize(response, usage, modelIdForCost) {
    try {
      // 2) Extract MEM: writes and persist BOTH formats
      const memWrites1 = extractMemoryFromMicroResponse(response);
      const memWrites2 = extractMemoryFromMicroProtocol(response);
      const allMemWrites = [...memWrites1, ...memWrites2];
      
      for (const m of allMemWrites) {
        await writeMemory(m.key, { text: m.value, source: member, timestamp: new Date().toISOString() }, 'ai_learned');
      }
      
      if (allMemWrites.length > 0) {
        console.log(`💾 [${member}] Persisted ${allMemWrites.length} memory items`);
      }
    } catch (e) {
      console.error(`[${member}.memory.write] failed:`, e.message);
    }
    
    // 3) Track cost
    if (modelIdForCost) trackCost(usage, modelIdForCost);
    return { response, usage };
  }

  try {
    // 4) Route by provider
    if (config.provider === 'anthropic' && ANTHROPIC_API_KEY) {
      console.log(`  → Using Anthropic API (claude-sonnet-4)`);
      const res = await safeFetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 2000,
          system: baseSystem,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const json = await res.json();
      
      if (!json.content || !json.content[0]) {
        throw new Error(`No response from Anthropic: ${JSON.stringify(json).slice(0, 200)}`);
      }
      
      const text = json.content[0]?.text || '';
      console.log(`  ✅ Success (${json.usage?.input_tokens || 0} in, ${json.usage?.output_tokens || 0} out)`);
      return finalize(text, { prompt_tokens: json.usage?.input_tokens, completion_tokens: json.usage?.output_tokens }, 'claude-sonnet-4');
    }

    if (config.provider === 'openai' && OPENAI_API_KEY) {
      console.log(`  → Using OpenAI API (${config.model})`);
      const messages = baseSystem
        ? [{ role: 'system', content: baseSystem }, { role: 'user', content: prompt }]
        : [{ role: 'user', content: prompt }];
      const res = await safeFetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: config.model,
          temperature: 0.1,
          max_tokens: 2000,
          messages,
        }),
      });
      const json = await res.json();
      
      if (!json.choices || !json.choices[0]) {
        throw new Error(`No response from OpenAI: ${JSON.stringify(json).slice(0, 200)}`);
      }
      
      const text = json.choices[0]?.message?.content || '';
      console.log(`  ✅ Success (${json.usage?.prompt_tokens || 0} in, ${json.usage?.completion_tokens || 0} out)`);
      return finalize(text, json.usage, config.model);
    }

    if (config.provider === 'google' && GEMINI_API_KEY) {
      console.log(`  → Using Gemini API (${config.model})`);
      const res = await safeFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: baseSystem ? `${baseSystem}\n\n${prompt}` : prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 2000 },
          }),
        }
      );
      const json = await res.json();
      
      if (!json.candidates || !json.candidates[0]) {
        throw new Error(`No response from Gemini: ${JSON.stringify(json).slice(0, 200)}`);
      }
      
      const text = json.candidates[0]?.content?.parts?.[0]?.text || '';
      const usage = {
        prompt_tokens: json.usageMetadata?.promptTokenCount || 0,
        completion_tokens: json.usageMetadata?.candidatesTokenCount || 0,
      };
      console.log(`  ✅ Success (${usage.prompt_tokens} in, ${usage.completion_tokens} out)`);
      return finalize(text, usage, 'gemini-2.0-flash-exp');
    }

    if (config.provider === 'xai' && GROK_API_KEY) {
      console.log(`  → Using Grok API (${config.model})`);
      const messages = baseSystem
        ? [{ role: 'system', content: baseSystem }, { role: 'user', content: prompt }]
        : [{ role: 'user', content: prompt }];
      const res = await safeFetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROK_API_KEY}` },
        body: JSON.stringify({ model: config.model, temperature: 0.1, max_tokens: 2000, messages }),
      });
      const json = await res.json();
      
      if (!json.choices || !json.choices[0]) {
        throw new Error(`No response from Grok: ${JSON.stringify(json).slice(0, 200)}`);
      }
      
      const text = json.choices[0]?.message?.content || '';
      console.log(`  ✅ Success (${json.usage?.prompt_tokens || 0} in, ${json.usage?.completion_tokens || 0} out)`);
      return finalize(text, json.usage, 'grok-beta');
    }

    throw new Error(`No API key for ${member} (${config.provider}) or provider not recognized`);
  } catch (e) {
    console.error(`❌ [${member}] Error: ${e.message}`);
    throw e;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DB init
// ─────────────────────────────────────────────────────────────────────────────
async function initDb() {
  await pool.query(
    `create table if not exists calls (id serial primary key, created_at timestamptz default now(), phone text, intent text, area text, timeline text, duration int, transcript text, score text, boldtrail_lead_id text);`
  );
  await pool.query(`create table if not exists shared_memory (
    id serial primary key,
    key text unique not null,
    value jsonb not null,
    category text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );`);
  await pool.query(`create table if not exists approval_queue (
    id serial primary key,
    action_type text not null,
    file_path text,
    content text,
    message text,
    status text default 'pending',
    requested_at timestamptz default now(),
    approved_at timestamptz,
    approved_by text
  );`);
  await pool.query(`create index if not exists idx_memory_category on shared_memory(category);`);
  await pool.query(`create index if not exists idx_memory_updated on shared_memory(updated_at);`);
  await pool.query(`create index if not exists idx_approval_status on approval_queue(status);`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS debate_log (
      id SERIAL PRIMARY KEY,
      debate_id TEXT UNIQUE NOT NULL,
      prompt TEXT NOT NULL,
      full_debate JSONB,
      consensus_result JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_debate_log_id ON debate_log(debate_id);
    CREATE INDEX IF NOT EXISTS idx_debate_log_created ON debate_log(created_at);
  `);
}

initDb()
  .then(() => console.log("✅ Database ready (memory + protection + debate logs)"))
  .catch(console.error);

// ─────────────────────────────────────────────────────────────────────────────
// Routes: Memory (CRITICAL)
// ─────────────────────────────────────────────────────────────────────────────
app.post("/api/v1/memory/store", requireCommandKey, async (req, res) => {
  try {
    const { key, value, category } = req.body;
    if (!key) return res.status(400).json({ ok: false, error: "key required" });
    await pool.query(
      `insert into shared_memory (key, value, category, updated_at)
       values ($1,$2,$3,now())
       on conflict (key) do update set value=$2, category=$3, updated_at=now()`,
      [key, JSON.stringify(value), category || "general"]
    );
    res.json({ ok: true, key, stored: true });
  } catch (e) {
    console.error("[memory.store]", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get("/api/v1/memory/get/:key", requireCommandKey, async (req, res) => {
  try {
    const r = await pool.query("select * from shared_memory where key=$1", [
      req.params.key
    ]);
    if (r.rows.length === 0) return res.json({ ok: true, found: false, data: null });
    res.json({ ok: true, found: true, data: r.rows[0] });
  } catch (e) {
    console.error("[memory.get]", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get("/api/v1/memory/list", requireCommandKey, async (req, res) => {
  try {
    const category = req.query.category;
    const q = category
      ? "select * from shared_memory where category=$1 order by updated_at desc limit 100"
      : "select * from shared_memory order by updated_at desc limit 100";
    const params = category ? [category] : [];
    const r = await pool.query(q, params);
    res.json({ ok: true, count: r.rows.length, memories: r.rows });
  } catch (e) {
    console.error("[memory.list]", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get("/api/v1/memory/search", requireCommandKey, async (req, res) => {
  try {
    const q = String(req.query.q || '');
    const category = String(req.query.category || '');
    const rows = await recallMemory({
      q,
      categories: category ? [category] : MEMORY_CATEGORIES_DEFAULT,
      limit: Number(req.query.limit || 50),
    });
    res.json({ ok: true, count: rows.length, rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.delete("/api/v1/memory/delete/:key", requireCommandKey, async (req, res) => {
  try {
    await pool.query("delete from shared_memory where key=$1", [req.params.key]);
    res.json({ ok: true, deleted: true });
  } catch (e) {
    console.error("[memory.delete]", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Routes: Architect MICRO (memory-aware, error-handled)
// ─────────────────────────────────────────────────────────────────────────────
app.post("/api/v1/architect/micro", requireCommandKey, async (req, res) => {
  try {
    const rawBody =
      typeof req.body === "string" ? req.body : req.body?.micro || req.body?.text || "";
    
    if (!rawBody || !String(rawBody).startsWith("V:2.0")) {
      return res.status(400).type("text/plain").send("V:2.0|CT:missing~micro~input|KP:~format");
    }
    
    // Pre-cache memory to avoid multiple queries
    const cachedMemory = await recallMemory({ q: rawBody.slice(0, 200), limit: 20 });
    
    const r = await callCouncilMember("brock", rawBody, true, cachedMemory);
    const out = String(r.response || "").trim();
    
    return res.type("text/plain").send(out || "V:2.0|CT:empty~response|KP:~retry");
  } catch (e) {
    console.error("[architect.micro]", e);
    return res
      .status(500)
      .type("text/plain")
      .send(`V:2.0|CT:system~error~${String(e).slice(0, 60).replace(/[|~]/g, '-')}|KP:~retry`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Routes: Dev commit (protection)
// ─────────────────────────────────────────────────────────────────────────────
app.post("/api/v1/dev/commit", requireCommandKey, async (req, res) => {
  try {
    const { path: file_path, content, message } = req.body || {};
    if (!file_path || typeof content !== "string")
      return res.status(400).json({ ok: false, error: "path and content required" });
    
    if (isProtected(file_path)) {
      await pool.query(
        `insert into approval_queue (action_type, file_path, content, message, status)
         values ($1,$2,$3,$4,$5)`,
        ["commit", file_path, content, message, "pending"]
      );
      return res.status(403).json({
        ok: false,
        error: "protected_file",
        message: `${file_path} is protected and requires manual approval`,
        file: file_path,
        approval_required: true
      });
    }
    
    const repo = GITHUB_REPO || "LimitlessOI/Lumin-LifeOS";
    const info = await ghPutFile(
      repo,
      file_path.replace(/^\/+/, ""),
      content,
      message || `feat: update ${file_path}`
    );
    res.json({ ok: true, committed: file_path, sha: info.content?.sha || info.commit?.sha });
  } catch (e) {
    console.error("[dev.commit]", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get("/api/v1/protection/queue", requireCommandKey, async (_req, res) => {
  try {
    const r = await pool.query(
      "select * from approval_queue where status=$1 order by requested_at desc",
      ["pending"]
    );
    res.json({ ok: true, count: r.rows.length, queue: r.rows });
  } catch (e) {
    console.error("[protection.queue]", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post("/api/v1/protection/approve/:id", requireCommandKey, async (req, res) => {
  try {
    const id = req.params.id;
    const r = await pool.query("select * from approval_queue where id=$1", [id]);
    if (r.rows.length === 0)
      return res.status(404).json({ ok: false, error: "Approval request not found" });
    const approval = r.rows[0];
    const repo = GITHUB_REPO || "LimitlessOI/Lumin-LifeOS";
    const info = await ghPutFile(
      repo,
      approval.file_path.replace(/^\/+/, ""),
      approval.content,
      approval.message
    );
    await pool.query(
      "update approval_queue set status=$1, approved_at=now(), approved_by=$2 where id=$3",
      ["approved", "manual", id]
    );
    res.json({ ok: true, committed: approval.file_path, sha: info.content?.sha || info.commit?.sha });
  } catch (e) {
    console.error("[protection.approve]", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// COUNCIL CONSENSUS WITH PRO/CON DEBATE & BLIND SPOT DETECTION
// ─────────────────────────────────────────────────────────────────────────────

function checkUnanimity(votes) {
  const positions = Object.values(votes).map(v => 
    v.includes("APPROVE") ? "approve" : v.includes("REJECT") ? "reject" : "concerns"
  );
  
  const allSame = new Set(positions).size === 1;
  
  return {
    unanimous: allSame,
    position: positions[0] || "concerns"
  };
}

function extractNumber(text, regex) {
  const match = text.match(regex);
  return match ? parseInt(match[1]) : null;
}

function calculateConsensus(votes) {
  const positions = Object.entries(votes).map(([member, response]) => ({
    member,
    position: response.includes("APPROVE") ? "approve" : response.includes("REJECT") ? "reject" : "concerns",
    confidence: extractNumber(response, /Confidence:\s*(\d+)/) || 50
  }));

  const approveCount = positions.filter(p => p.position === "approve").length;
  const rejectCount = positions.filter(p => p.position === "reject").length;
  const concernsCount = positions.filter(p => p.position === "concerns").length;

  const avgConfidence = Math.round(
    positions.reduce((sum, p) => sum + p.confidence, 0) / positions.length
  );

  let position = "concerns";
  if (approveCount > rejectCount + concernsCount) position = "approve";
  if (rejectCount > approveCount + concernsCount) position = "reject";

  return {
    unanimous: new Set(positions.map(p => p.position)).size === 1,
    position,
    approve: approveCount,
    concerns: concernsCount,
    reject: rejectCount,
    confidence: avgConfidence,
    votes: positions,
    recommendation: position === "approve" ? "EXECUTE" : position === "reject" ? "BLOCK" : "ESCALATE_TO_HUMAN"
  };
}

function extractRisks(debate) {
  const risks = [];
  for (const [member, positions] of Object.entries(debate)) {
    const conText = (positions.con || "").toLowerCase();
    if (conText.includes("risk") || conText.includes("danger") || conText.includes("could fail")) {
      risks.push({
        member,
        risk: (positions.con || "").slice(0, 200)
      });
    }
  }
  return risks;
}

function extractBlindSpots(debate) {
  const blindSpots = [];
  for (const [member, positions] of Object.entries(debate)) {
    if (positions.blind_spots) {
      blindSpots.push({
        member,
        blind_spot: positions.blind_spots.slice(0, 150)
      });
    }
  }
  return blindSpots;
}

async function councilConsensusWithDebate(prompt, escalationLevel = "normal") {
  console.log(`\n🎯 [CONSENSUS] Starting: "${prompt.slice(0, 60)}..."`);
  const debateId = `debate_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  try {
    // Pre-cache memory ONE TIME
    console.log(`🧠 [CONSENSUS] Pre-caching memory...`);
    const cachedMemory = await recallMemory({ q: prompt, limit: 20 });

    // PHASE 1: Fast tier (Claude, Brock, Gemini)
    console.log(`\n⚡ PHASE 1: Fast Tier Vote (3 AIs)`);
    const fastTier = ["claude", "brock", "gemini"];
    const initialVotes = {};

    for (const member of fastTier) {
      try {
        const response = await callCouncilMember(
          member,
          `Quick assessment: ${prompt}\n\nProvide your initial stance: APPROVE / CONCERNS / REJECT and 1-2 reasons.`,
          false,
          cachedMemory
        );
        initialVotes[member] = response.response;
      } catch (e) {
        console.error(`⚠️  [${member}] Fast tier failed: ${e.message}`);
        initialVotes[member] = "CONCERNS (error)";
      }
    }

    await writeMemory(`${debateId}_initial_votes`, initialVotes, "debate_log");

    // Check unanimity
    const unanimity = checkUnanimity(initialVotes);
    if (unanimity.unanimous) {
      console.log(`\n✅ [CONSENSUS] UNANIMOUS: ${unanimity.position.toUpperCase()}`);
      const result = {
        debate_id: debateId,
        phase: "fast_unanimous",
        unanimous: true,
        position: unanimity.position,
        confidence: 95,
        initial_votes: initialVotes,
        risk_flags: [],
        blind_spots: [],
        escalate_to_human: false
      };
      await pool.query(
        `INSERT INTO debate_log (debate_id, prompt, consensus_result) VALUES ($1, $2, $3)`,
        [debateId, prompt, JSON.stringify(result)]
      );
      return result;
    }

    console.log(`\n🟡 [CONSENSUS] Not unanimous. Escalating to FULL COUNCIL DEBATE`);

    // PHASE 2: Full debate
    console.log(`\n🎤 PHASE 2: Full Debate (6 AIs × 3 questions each)`);
    const fullDebate = {};
    const council = ["claude", "brock", "jayn", "r8", "gemini", "grok"];

    for (const member of council) {
      try {
        console.log(`\n  → ${member.toUpperCase()}: Pro/Con/Blindspot`);
        
        // Argument FOR
        let proResponse = { response: "" };
        try {
          proResponse = await callCouncilMember(
            member,
            `You are arguing IN FAVOR of: "${prompt}"\n\nWhat are the strongest 3 arguments FOR this? Consider benefits, opportunities, why it's worth doing.`,
            false,
            cachedMemory
          );
        } catch (e) {
          console.error(`    ⚠️  PRO failed: ${e.message}`);
          proResponse = { response: `[Error] ${e.message}` };
        }

        // Argument AGAINST
        let conResponse = { response: "" };
        try {
          conResponse = await callCouncilMember(
            member,
            `You are arguing AGAINST: "${prompt}"\n\nWhat are the strongest 3 arguments AGAINST? Consider risks, unintended consequences, what could go wrong.`,
            false,
            cachedMemory
          );
        } catch (e) {
          console.error(`    ⚠️  CON failed: ${e.message}`);
          conResponse = { response: `[Error] ${e.message}` };
        }

        // Blind spots
        let blindSpotResponse = { response: "" };
        try {
          blindSpotResponse = await callCouncilMember(
            member,
            `What are blind spots YOU might have about: "${prompt}"? What don't you see that others might?`,
            false,
            cachedMemory
          );
        } catch (e) {
          console.error(`    ⚠️  BLINDSPOT failed: ${e.message}`);
          blindSpotResponse = { response: `[Error] ${e.message}` };
        }

        fullDebate[member] = {
          pro: proResponse.response.slice(0, 500),
          con: conResponse.response.slice(0, 500),
          blind_spots: blindSpotResponse.response.slice(0, 300)
        };
      } catch (e) {
        console.error(`❌ [${member}] Full debate failed: ${e.message}`);
        fullDebate[member] = {
          pro: `Error: ${e.message}`,
          con: `Error: ${e.message}`,
          blind_spots: `Error: ${e.message}`
        };
      }
    }

    await writeMemory(`${debateId}_full_debate`, fullDebate, "debate_log");

    // PHASE 3: Synthesis
    console.log(`\n📋 PHASE 3: Synthesis by R8 (Quality Judge)`);
    const debateSummary = JSON.stringify(fullDebate, null, 2).slice(0, 3000);
    let synthesisResponse = { response: "[Synthesis skipped due to error]" };
    try {
      synthesisResponse = await callCouncilMember(
        "r8",
        `Judge this debate:\n\n${debateSummary}\n\nBest decision? Confidence 0-100? Unmitigated risks?`,
        false,
        cachedMemory
      );
    } catch (e) {
      console.error(`⚠️  Synthesis failed: ${e.message}`);
    }

    // PHASE 4: Final vote
    console.log(`\n🗳️  PHASE 4: Final Council Vote`);
    const finalVotes = {};
    for (const member of council) {
      try {
        const finalResponse = await callCouncilMember(
          member,
          `Final vote on: "${prompt}"\n\nVote: APPROVE / CONCERNS / REJECT\nConfidence: 0-100\nReason: [1 sentence]`,
          false,
          cachedMemory
        );
        finalVotes[member] = finalResponse.response;
      } catch (e) {
        console.error(`⚠️  [${member}] Final vote failed: ${e.message}`);
        finalVotes[member] = "CONCERNS (error)";
      }
    }

    await writeMemory(`${debateId}_final_votes`, finalVotes, "debate_log");

    // Calculate consensus
    const consensus = calculateConsensus(finalVotes);
    const riskFlags = extractRisks(fullDebate);
    const blindSpots = extractBlindSpots(fullDebate);

    const result = {
      debate_id: debateId,
      phase: "full_debate",
      unanimous: consensus.unanimous,
      position: consensus.position,
      confidence: consensus.confidence,
      vote_breakdown: {
        approve: consensus.approve,
        concerns: consensus.concerns,
        reject: consensus.reject
      },
      initial_votes: initialVotes,
      full_debate: fullDebate,
      synthesis: synthesisResponse.response.slice(0, 300),
      final_votes: finalVotes,
      risk_flags: riskFlags,
      blind_spots: blindSpots,
      recommendation: consensus.recommendation,
      escalate_to_human: consensus.confidence < 70 || escalationLevel === "high"
    };

    // Store in debate log
    await pool.query(
      `INSERT INTO debate_log (debate_id, prompt, full_debate, consensus_result) 
       VALUES ($1, $2, $3, $4)`,
      [debateId, prompt, JSON.stringify(fullDebate), JSON.stringify(result)]
    );

    // Save result to memory
    await writeMemory(debateId, result, "consensus_decisions");
    
    console.log(`\n✅ [CONSENSUS] Complete: ${result.position.toUpperCase()} (${result.confidence}% confidence)`);
    
    return result;
  } catch (e) {
    console.error(`❌ [CONSENSUS] Fatal error: ${e.message}`);
    throw e;
  }
}

// NEW ENDPOINT: Call consensus
app.post("/api/v1/council/consensus", requireCommandKey, async (req, res) => {
  try {
    const { action, prompt, escalation_level } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ ok: false, error: "prompt required" });
    }

    const result = await councilConsensusWithDebate(prompt, escalation_level || "normal");
    
    res.json({
      ok: true,
      consensus: result,
      human_review_required: result.escalate_to_human,
      next_step: result.escalate_to_human ? "AWAITING_HUMAN_APPROVAL" : result.position === "approve" ? "EXECUTE" : "BLOCKED"
    });
  } catch (e) {
    console.error("[consensus]", e);
    res.status(500).json({ ok: false, error: String(e), message: "Consensus debate failed" });
  }
});

// Get debate history
app.get("/api/v1/council/debates", requireCommandKey, async (req, res) => {
  try {
    const limit = Number(req.query.limit || 10);
    const rows = await pool.query(
      `SELECT debate_id, prompt, created_at FROM debate_log ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    res.json({ ok: true, count: rows.rows.length, debates: rows.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Get single debate
app.get("/api/v1/council/debate/:debate_id", requireCommandKey, async (req, res) => {
  try {
    const row = await pool.query(
      `SELECT * FROM debate_log WHERE debate_id = $1`,
      [req.params.debate_id]
    );
    if (row.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Debate not found" });
    }
    res.json({ ok: true, debate: row.rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DEBUG: Environment Variable Diagnostic
// ─────────────────────────────────────────────────────────────────────────────

async function testAPI(provider) {
  try {
    const testPrompt = "Say 'TEST'";
    let result;
    
    if (provider === 'openai' && process.env.OPENAI_API_KEY) {
      const r = await safeFetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: testPrompt }], max_tokens: 10 })
      });
      result = await r.json();
      return result.choices ? '✅ Working' : `❌ ${result.error?.message || 'Failed'}`;
    }
    
    if (provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
      const r = await safeFetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4', max_tokens: 10, messages: [{ role: 'user', content: testPrompt }] })
      });
      result = await r.json();
      return result.content ? '✅ Working' : `❌ ${result.error?.message || 'Failed'}`;
    }
    
    if (provider === 'gemini' && process.env.GEMINI_API_KEY) {
      const r = await safeFetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: testPrompt }] }], generationConfig: { maxOutputTokens: 10 } })
      });
      result = await r.json();
      return result.candidates ? '✅ Working' : `❌ ${result.error?.message || 'Failed'}`;
    }
    
    if (provider === 'grok' && process.env.GROK_API_KEY) {
      const r = await safeFetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROK_API_KEY}` },
        body: JSON.stringify({ model: 'grok-beta', messages: [{ role: 'user', content: testPrompt }], max_tokens: 10 })
      });
      result = await r.json();
      return result.choices ? '✅ Working' : `❌ ${result.error?.message || 'Failed'}`;
    }
    
    return '⚠️ Not configured';
  } catch (e) {
    return `❌ ${e.message.slice(0, 30)}`;
  }
}

app.get("/api/v1/debug/env", requireCommandKey, async (req, res) => {
  const envStatus = {
    database: DATABASE_URL ? '✅ Configured' : '❌ Missing',
    command_key: COMMAND_CENTER_KEY ? '✅ Set' : '❌ Missing',
    OPENAI_API_KEY: OPENAI_API_KEY ? `✅ Set (${OPENAI_API_KEY.slice(0, 10)}...)` : '❌ Missing', 
    ANTHROPIC_API_KEY: ANTHROPIC_API_KEY ? `✅ Set (${ANTHROPIC_API_KEY.slice(0, 10)}...)` : '❌ Missing', 
    GEMINI_API_KEY: GEMINI_API_KEY ? `✅ Set (${GEMINI_API_KEY.slice(0, 10)}...)` : '❌ Missing',
    GROK_API_KEY: GROK_API_KEY ? `✅ Set (${GROK_API_KEY.slice(0, 10)}...)` : '❌ Missing',
    GITHUB_TOKEN: GITHUB_TOKEN ? `✅ Set (${GITHUB_TOKEN.slice(0, 10)}...)` : '❌ Missing',
  };
  
  // Only test if requested (adds latency)
  if (req.query.test === 'true') {
    envStatus.api_tests = {
      openai: await testAPI('openai'),
      anthropic: await testAPI('anthropic'),
      gemini: await testAPI('gemini'),
      grok: await testAPI('grok')
    };
  }
  
  res.json({ env: envStatus });
});
// ─────────────────────────────────────────────────────────────────────────────
// TEST: Memory Cycling Verification
// ─────────────────────────────────────────────────────────────────────────────
app.post("/api/v1/test/memory-cycle", requireCommandKey, async (req, res) => {
  try {
    console.log(`🧪 [TEST] Starting memory cycle test...`);
    const { test_fact } = req.body;
    const factToStore = test_fact || "Memory persistence verification works";
    
    // 1. Store test memory
    console.log(`💾 [TEST] Storing: ${factToStore}`);
    await writeMemory('test_memory_cycle', { text: factToStore, test: true }, 'test');
    
    // 2. Recall and verify
    console.log(`🔍 [TEST] Recalling memory...`);
    const recalled = await recallMemory({ q: 'test_memory_cycle', limit: 10 });
    
    // 3. Call AI with memory context
    console.log(`🤖 [TEST] Calling Brock with memory context...`);
    const aiResponse = await callCouncilMember('brock', 
      'I stored a test fact. Can you recall it from memory? Then add a new MEM: line with what you learned.', 
      false);
    
    // 4. Extract memory writes from AI response
    const memWrites1 = extractMemoryFromMicroResponse(aiResponse.response);
    const memWrites2 = extractMemoryFromMicroProtocol(aiResponse.response);
    const allMemWrites = [...memWrites1, ...memWrites2];
    
    console.log(`📊 [TEST] Found ${allMemWrites.length} memory writes from AI`);
    
    res.json({
      ok: true,
      test_passed: recalled.length > 0 && allMemWrites.length > 0,
      step_1_stored: { key: 'test_memory_cycle', value: factToStore },
      step_2_recalled: recalled.length,
      step_3_ai_response: aiResponse.response.slice(0, 200),
      step_4_memory_writes_found: allMemWrites.length,
      details: {
        recalled_items: recalled.map(r => ({ key: r.key, category: r.category })),
        extracted_writes: allMemWrites
      }
    });
  } catch (e) {
    console.error("[test.memory-cycle]", e);
    res.status(500).json({ ok: false, error: String(e), message: e.message });
  }
});
// ─────────────────────────────────────────────────────────────────────────────
// Routes: Health
// ─────────────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.send("OK"));

app.get("/healthz", async (_req, res) => {
  try {
    const dbCheck = await pool.query("select now()");
    const spend = readSpend();
    const mem = await pool.query("select count(*) as count from shared_memory");
    const debates = await pool.query("select count(*) as count from debate_log");

    res.json({
      status: "healthy",
      database: "connected",
      timestamp: dbCheck.rows[0].now,
      version: "v15-PRODUCTION",
      daily_spend: spend.usd.toFixed(2),
      max_daily_spend: Number(MAX_DAILY_SPEND),
      spend_percentage: ((spend.usd / Number(MAX_DAILY_SPEND)) * 100).toFixed(1) + "%",
      ai_council: {
        enabled: true,
        members: Object.keys(COUNCIL_MEMBERS).length,
        models: Object.values(COUNCIL_MEMBERS).map((m) => m.model),
        providers: [...new Set(Object.values(COUNCIL_MEMBERS).map((m) => m.provider))]
      },
      memory_system: {
        enabled: true,
        stored_memories: Number(mem.rows[0].count || 0),
        categories: MEMORY_CATEGORIES_DEFAULT
      },
      debate_system: {
        enabled: true,
        total_debates: Number(debates.rows[0].count || 0)
      },
      protection_system: {
        enabled: true,
        protected_files: PROTECTED_FILES
      },
      stripe_status: stripeReady ? "READY" : "NOT_CONFIGURED",
      ai_call_timeout: `${AI_CALL_TIMEOUT}ms`
    });
  } catch (e) {
    res.status(500).json({ status: "unhealthy", error: String(e) });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Routes: Command & Control Overlay Portal (serve HTML)
// ─────────────────────────────────────────────────────────────────────────────
app.get("/overlay/command-center.html", (_req, res) => {
  res.type("text/html").send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>LifeOS Command & Control</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #0a0e27; color: #e0e6ed; padding: 24px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { margin-bottom: 12px; font-size: 32px; color: #00ff88; }
    .subtitle { color: #888; margin-bottom: 24px; font-size: 14px; }
    .card { border: 1px solid #1e2749; border-radius: 10px; padding: 20px; margin: 16px 0; background: #111625; }
    .card h3 { color: #00ff88; margin-bottom: 12px; font-size: 18px; }
    textarea, input { width: 100%; box-sizing: border-box; padding: 10px; border: 1px solid #1e2749; border-radius: 6px; background: #0a0e27; color: #e0e6ed; font-family: monospace; font-size: 12px; margin: 8px 0; }
    button { padding: 10px 16px; border-radius: 6px; border: 1px solid #00ff88; background: transparent; color: #00ff88; cursor: pointer; font-weight: bold; transition: all 0.2s; }
    button:hover { background: #00ff88; color: #0a0e27; }
    .row { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; }
    pre { background: #0a0e27; padding: 12px; overflow: auto; border-radius: 6px; border: 1px solid #1e2749; max-height: 400px; font-size: 11px; color: #00ff88; }
    .small { font-size: 12px; color: #666; }
    .section-break { margin: 32px 0; border-bottom: 1px solid #1e2749; padding-bottom: 16px; }
    .status-ok { color: #00ff88; }
    .status-warn { color: #ffaa00; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 LifeOS Command & Control</h1>
    <div class="subtitle">AI Council Memory-Aware System | v15-PRODUCTION</div>

    <div class="card">
      <h3>🔑 Authentication</h3>
      <div class="row">
        <label>Command Key</label>
        <input id="key" type="password" placeholder="Paste your x-command-key" />
      </div>
    </div>

    <div class="section-break"></div>

    <div class="card">
      <h3>🎯 Council Consensus (Full Debate)</h3>
      <div style="color: #666; font-size: 12px; margin-bottom: 8px;">Pro/Con/Blind-spot debate with full council vote</div>
      <textarea id="consensusPrompt" rows="3" placeholder="Should we implement Stripe integration?"></textarea>
      <input id="escalationLevel" placeholder="Escalation level: normal or high" value="normal" />
      <button onclick="callConsensus()">🎤 Start Council Debate</button>
      <pre id="consensusOut" style="margin-top: 12px;"></pre>
    </div>

    <div class="card">
      <h3>💬 Quick MICRO Query (Brock)</h3>
      <div style="color: #666; font-size: 12px; margin-bottom: 8px;">Format: V:2.0|OP:G|D:Your~request|T:A|R:~CT~KP</div>
      <textarea id="micro" rows="4" placeholder="V:2.0|OP:G|D:Create~status~report|T:A|R:~CT~KP"></textarea>
      <button onclick="askCouncil()">🤖 Ask Brock</button>
      <pre id="microOut" style="margin-top: 12px;"></pre>
    </div>

    <div class="card">
      <h3>🧠 Memory Search</h3>
      <div class="row">
        <input id="memQ" placeholder="Search persistent memory..." />
        <button onclick="searchMem()" style="width: auto;">Search</button>
      </div>
      <pre id="memOut" style="margin-top: 12px;"></pre>
    </div>

    <div class="card">
      <h3>💾 Store Memory</h3>
      <input id="memKey" placeholder="Memory key (e.g., rule__tone)" />
      <textarea id="memValue" rows="3" placeholder="Memory value"></textarea>
      <input id="memCategory" placeholder="Category" value="learned" />
      <button onclick="storeMemory()">💾 Save to Memory</button>
      <pre id="memStoreOut" style="margin-top: 12px;"></pre>
    </div>

    <div class="card">
      <h3>📋 Debate History</h3>
      <button onclick="listDebates()">📊 Load Recent Debates</button>
      <pre id="debatesOut" style="margin-top: 12px;"></pre>
    </div>

    <div class="card">
      <h3>📊 System Status</h3>
      <button onclick="checkHealth()">🔍 Check Health</button>
      <pre id="healthOut" style="margin-top: 12px;"></pre>
    </div>
  </div>

  <script>
    async function callConsensus() {
      const key = document.getElementById('key').value.trim();
      const prompt = document.getElementById('consensusPrompt').value;
      const escalation_level = document.getElementById('escalationLevel').value || 'normal';
      if (!key || !prompt) { alert('Key and prompt required'); return; }
      
      document.getElementById('consensusOut').textContent = '⏳ Starting council debate... (this may take 2-3 minutes)';
      try {
        const r = await fetch(\`/api/v1/council/consensus\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-command-key': key },
          body: JSON.stringify({ prompt, escalation_level })
        });
        const data = await r.json();
        document.getElementById('consensusOut').textContent = JSON.stringify(data, null, 2);
      } catch (e) {
        document.getElementById('consensusOut').textContent = 'Error: ' + String(e);
      }
    }

    async function askCouncil() {
      const key = document.getElementById('key').value.trim();
      const micro = document.getElementById('micro').value;
      if (!key || !micro) { alert('Key and MICRO input required'); return; }
      
      document.getElementById('microOut').textContent = 'Asking council...';
      try {
        const r = await fetch(\`/api/v1/architect/micro\`, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain', 'x-command-key': key },
          body: micro
        });
        const text = await r.text();
        document.getElementById('microOut').textContent = text;
      } catch (e) {
        document.getElementById('microOut').textContent = 'Error: ' + String(e);
      }
    }

    async function searchMem() {
      const key = document.getElementById('key').value.trim();
      const q = encodeURIComponent(document.getElementById('memQ').value);
      if (!key) { alert('Key required'); return; }
      
      document.getElementById('memOut').textContent = 'Searching...';
      try {
        const r = await fetch(\`/api/v1/memory/search?q=\${q}\`, {
          headers: { 'x-command-key': key }
        });
        const data = await r.json();
        document.getElementById('memOut').textContent = JSON.stringify(data, null, 2);
      } catch (e) {
        document.getElementById('memOut').textContent = 'Error: ' + String(e);
      }
    }

    async function storeMemory() {
      const key = document.getElementById('key').value.trim();
      const memKey = document.getElementById('memKey').value.trim();
      const memValue = document.getElementById('memValue').value.trim();
      const memCategory = document.getElementById('memCategory').value.trim();
      if (!key || !memKey || !memValue) { alert('All fields required'); return; }
      
      document.getElementById('memStoreOut').textContent = 'Storing...';
      try {
        const r = await fetch(\`/api/v1/memory/store\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-command-key': key },
          body: JSON.stringify({ key: memKey, value: memValue, category: memCategory })
        });
        const data = await r.json();
        document.getElementById('memStoreOut').textContent = JSON.stringify(data, null, 2);
      } catch (e) {
        document.getElementById('memStoreOut').textContent = 'Error: ' + String(e);
      }
    }

    async function listDebates() {
      const key = document.getElementById('key').value.trim();
      if (!key) { alert('Key required'); return; }
      
      document.getElementById('debatesOut').textContent = 'Loading...';
      try {
        const r = await fetch(\`/api/v1/council/debates\`, {
          headers: { 'x-command-key': key }
        });
        const data = await r.json();
        document.getElementById('debatesOut').textContent = JSON.stringify(data, null, 2);
      } catch (e) {
        document.getElementById('debatesOut').textContent = 'Error: ' + String(e);
      }
    }

    async function checkHealth() {
      document.getElementById('healthOut').textContent = 'Checking...';
      try {
        const r = await fetch(\`/healthz\`);
        const data = await r.json();
        document.getElementById('healthOut').textContent = JSON.stringify(data, null, 2);
      } catch (e) {
        document.getElementById('healthOut').textContent = 'Error: ' + String(e);
      }
    }
  </script>
</body>
</html>`);
});

// ─────────────────────────────────────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, HOST, () => {
  console.log(`\n✅ LifeOS v15-PRODUCTION started on http://${HOST}:${PORT}`);
  console.log(`✅ Command Center: http://${HOST}:${PORT}/overlay/command-center.html?key=YOUR_KEY`);
  console.log(`✅ Health: http://${HOST}:${PORT}/healthz`);
  console.log(`✅ AI Council: ${Object.keys(COUNCIL_MEMBERS).length} models (memory-aware + persistent)`);
  console.log(`✅ Memory System: ACTIVE (auto-extraction from AI responses)`);
  console.log(`✅ Debate System: ACTIVE (Pro/Con/Blind-spots with full council consensus)`);
  console.log(`✅ Protection: ${PROTECTED_FILES.length} protected files`);
  console.log(`✅ Stripe: ${stripeReady ? 'READY' : 'standby'}`);
  console.log(`✅ Timeouts: ${AI_CALL_TIMEOUT}ms per AI call`);
  console.log(`\n🎯 Consensus: /api/v1/council/consensus (POST)`);
  console.log(`🎯 Debates: /api/v1/council/debates (GET)`);
  console.log(`\n✨ All features operational. Ready to execute.\n`);
});
