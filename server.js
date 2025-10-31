// server.js - v15 CLEAN (No Stripe import error, memory-aware AI, command overlay)

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
  MAX_DAILY_SPEND = 50.0
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
      const r = await fetch(url, init);
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

function extractMemWritesFromText(text = '') {
  // Expect lines like: MEM: key:: value
  const lines = (text.match(/(^|\n)MEM:\s*.+?$/gmi) || []).map(s => s.trim());
  const out = [];
  for (const line of lines) {
    const body = line.replace(/^MEM:\s*/i, '');
    const idx = body.indexOf('::');
    if (idx > -1) {
      const k = body.slice(0, idx).trim();
      const v = body.slice(idx + 2).trim();
      if (k && v) out.push({ key: k, value: v });
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
// MEMORY-AWARE COUNCIL CALLER (CORE)
// ─────────────────────────────────────────────────────────────────────────────
async function callCouncilMember(member, prompt, useMicro = true) {
  const config = COUNCIL_MEMBERS[member];
  if (!config) throw new Error(`Unknown council member: ${member}`);

  // 1) Pull relevant memory and build memory-aware system prompt
  const memRows = await recallMemory({ q: prompt });
  const memoryContext = formatMemoryForSystem(memRows);

  const baseSystem = useMicro
    ? [
        'You are the LifeOS Architect AI controlling the Lumin autonomous system at robust-magic-production.up.railway.app.',
        'You communicate using v2.0-Micro protocol:',
        'Format strictly like:',
        'V:2.0|CT:<complete detailed answer>|KP:~key~points',
        '',
        'PERSISTENT_MEMORY (non-negotiable facts to use & not contradict):',
        memoryContext,
        '',
        'When you discover new durable facts/policies, append lines like:',
        'MEM: <short_key> :: <concise_value>',
      ].join('\n')
    : '';

  // local helper for finalize
  async function finalize(response, usage, modelIdForCost) {
    try {
      // 2) Extract MEM: writes and persist
      const memWrites = extractMemWritesFromText(response);
      for (const m of memWrites) {
        const key = m.key.toLowerCase().replace(/\s+/g, '_').slice(0, 64);
        await writeMemory(key, { text: m.value, source: member }, 'ai_learned');
      }
    } catch (e) {
      console.error('[memory.write] failed:', e.message);
    }
    // 3) track cost and return
    if (modelIdForCost) trackCost(usage, modelIdForCost);
    return { response, usage };
  }

  // 4) Route by provider
  if (config.provider === 'anthropic' && ANTHROPIC_API_KEY) {
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
    const text = json.content?.[0]?.text || '';
    return finalize(text, { prompt_tokens: json.usage?.input_tokens, completion_tokens: json.usage?.output_tokens }, 'claude-sonnet-4');
  }

  if (config.provider === 'openai' && OPENAI_API_KEY) {
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
    const text = json.choices?.[0]?.message?.content || '';
    return finalize(text, json.usage, config.model);
  }

  if (config.provider === 'google' && GEMINI_API_KEY) {
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
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const usage = {
      prompt_tokens: json.usageMetadata?.promptTokenCount || 0,
      completion_tokens: json.usageMetadata?.candidatesTokenCount || 0,
    };
    return finalize(text, usage, 'gemini-2.0-flash-exp');
  }

  if (config.provider === 'xai' && GROK_API_KEY) {
    const messages = baseSystem
      ? [{ role: 'system', content: baseSystem }, { role: 'user', content: prompt }]
      : [{ role: 'user', content: prompt }];
    const res = await safeFetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROK_API_KEY}` },
      body: JSON.stringify({ model: config.model, temperature: 0.1, max_tokens: 2000, messages }),
    });
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content || '';
    return finalize(text, json.usage, 'grok-beta');
  }

  throw new Error(`No API key for ${member} (${config.provider})`);
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
  `);
}

initDb()
  .then(() => console.log("✅ Database ready (memory + protection)"))
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
// Routes: Architect MICRO (now memory-aware)
// ─────────────────────────────────────────────────────────────────────────────
app.post("/api/v1/architect/micro", requireCommandKey, async (req, res) => {
  try {
    const rawBody =
      typeof req.body === "string" ? req.body : req.body?.micro || req.body?.text || "";
    if (!rawBody || !String(rawBody).startsWith("V:2.0")) {
      return res.status(400).type("text/plain").send("V:2.0|CT:missing~micro~input|KP:~format");
    }
    
    const r = await callCouncilMember("brock", rawBody, true);
    const out = String(r.response || "").trim();
    return res.type("text/plain").send(out || "V:2.0|CT:empty~response|KP:~retry");
  } catch (e) {
    console.error("[architect.micro]", e);
    return res
      .status(500)
      .type("text/plain")
      .send(`V:2.0|CT:system~error|KP:~retry~${String(e).slice(0, 100)}`);
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

async function councilConsensusWithDebate(prompt, escalationLevel = "normal") {
  console.log(`\n🎯 [COUNCIL] Starting debate: "${prompt.slice(0, 80)}..."`);

  // Store debate in memory
  const debateId = `debate_${Date.now()}`;
  
  // PHASE 1: Initial positions (fast tier - Claude, Brock, Gemini)
  const fastTier = ["claude", "brock", "gemini"];
  const initialVotes = {};

  for (const member of fastTier) {
    const response = await callCouncilMember(
      member,
      `Quick assessment: ${prompt}\n\nProvide your initial stance: APPROVE / CONCERNS / REJECT and 1-2 reasons.`,
      false
    );
    initialVotes[member] = response.response;
  }

  await writeMemory(`${debateId}_initial_votes`, initialVotes, "debate_log");

  // Check if unanimous - if yes, skip full debate
  const unanimity = checkUnanimity(initialVotes);
  if (unanimity.unanimous) {
    console.log(`✅ [CONSENSUS] Unanimous ${unanimity.position}. Skipping full debate.`);
    return {
      debate_id: debateId,
      unanimous: true,
      position: unanimity.position,
      confidence: 95,
      votes: initialVotes,
      risk_flags: []
    };
  }

  console.log(`🟡 [DEBATE] Not unanimous. Escalating to full council...`);

  // PHASE 2: Full debate - each member argues PRO and CON
  const fullDebate = {};
  const council = ["claude", "brock", "jayn", "r8", "gemini", "grok"];

  for (const member of council) {
    // Argument FOR
    const proResponse = await callCouncilMember(
      member,
      `You are arguing IN FAVOR of: "${prompt}"\n\nWhat are the strongest 3 arguments FOR this? Consider benefits, opportunities, and why it's worth the risk.`,
      false
    );

    // Argument AGAINST
    const conResponse = await callCouncilMember(
      member,
      `You are arguing AGAINST: "${prompt}"\n\nWhat are the strongest 3 arguments AGAINST this? Consider risks, blind spots, unintended consequences, and what could go wrong.`,
      false
    );

    // Blind spots this member might miss
    const blindSpotResponse = await callCouncilMember(
      member,
      `What are the blind spots YOU personally might have about: "${prompt}"? What don't you see that others might?`,
      false
    );

    fullDebate[member] = {
      pro: proResponse.response,
      con: conResponse.response,
      blind_spots: blindSpotResponse.response
    };
  }

  await writeMemory(`${debateId}_full_debate`, fullDebate, "debate_log");

  // PHASE 3: Synthesis - have R8 (quality) judge the debate
  const debateSummary = JSON.stringify(fullDebate, null, 2);
  const synthesisResponse = await callCouncilMember(
    "r8",
    `You are the judge. Here's the full debate:\n\n${debateSummary}\n\nNow judge: Based on all arguments, what's the BEST DECISION and why? Rate confidence 0-100. List any unmitigated risks.`,
    false
  );

  // PHASE 4: Final vote with updated context
  const finalVotes = {};
  for (const member of council) {
    const finalResponse = await callCouncilMember(
      member,
      `After hearing all perspectives, cast your final vote on: "${prompt}"\n\nVote: APPROVE / CONCERNS / REJECT\nConfidence: 0-100\nReason: [1 sentence]`,
      false
    );
    finalVotes[member] = finalResponse.response;
  }

  await writeMemory(`${debateId}_final_votes`, finalVotes, "debate_log");

  // Calculate consensus
  const consensus = calculateConsensus(finalVotes);

  // Extract risk flags from debate
  const riskFlags = extractRisks(fullDebate);

  const result = {
    debate_id: debateId,
    unanimous: consensus.unanimous,
    position: consensus.position,
    confidence: consensus.confidence,
    full_debate: fullDebate,
    synthesis: synthesisResponse.response,
    final_votes: finalVotes,
    risk_flags: riskFlags,
    blind_spots: extractBlindSpots(fullDebate),
    recommendation: consensus.recommendation,
    escalate_to_human: consensus.confidence < 70 || escalationLevel === "high"
  };

  await writeMemory(debateId, result, "consensus_decisions");
  
  return result;
}

function checkUnanimity(votes) {
  const positions = Object.values(votes).map(v => 
    v.includes("APPROVE") ? "approve" : v.includes("REJECT") ? "reject" : "concerns"
  );
  
  const allSame = new Set(positions).size === 1;
  
  return {
    unanimous: allSame,
    position: positions[0]
  };
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
    recommendation: position === "approve" ? "EXECUTE" : position === "reject" ? "BLOCK" : "ESCALATE_TO_HUMAN"
  };
}

function extractRisks(debate) {
  const risks = [];
  for (const [member, positions] of Object.entries(debate)) {
    const conText = positions.con.toLowerCase();
    if (conText.includes("risk") || conText.includes("danger") || conText.includes("could fail")) {
      risks.push({
        member,
        risk: positions.con.slice(0, 200)
      });
    }
  }
  return risks;
}

function extractBlindSpots(debate) {
  const blindSpots = [];
  for (const [member, positions] of Object.entries(debate)) {
    blindSpots.push({
      member,
      blind_spot: positions.blind_spots.slice(0, 150)
    });
  }
  return blindSpots;
}

function extractNumber(text, regex) {
  const match = text.match(regex);
  return match ? parseInt(match[1]) : null;
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
    res.status(500).json({ ok: false, error: String(e) });
  }
});
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
    res.status(500).json({ ok: false, error: String(e) });
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

    res.json({
      status: "healthy",
      database: "connected",
      timestamp: dbCheck.rows[0].now,
      version: "v15-CLEAN-memory-aware",
      daily_spend: spend.usd,
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
      protection_system: {
        enabled: true,
        protected_files: PROTECTED_FILES
      },
      stripe_status: stripeReady ? "READY" : "NOT_CONFIGURED"
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
    pre { background: #0a0e27; padding: 12px; overflow: auto; border-radius: 6px; border: 1px solid #1e2749; max-height: 300px; font-size: 11px; color: #00ff88; }
    .small { font-size: 12px; color: #666; }
    .section-break { margin: 32px 0; border-bottom: 1px solid #1e2749; padding-bottom: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 LifeOS Command & Control</h1>
    <div class="subtitle">AI Council Memory-Aware System | v15-CLEAN</div>

    <div class="card">
      <h3>🔑 Authentication</h3>
      <div class="row">
        <label>Command Key</label>
        <input id="key" type="password" placeholder="Paste your x-command-key" />
      </div>
    </div>

    <div class="section-break"></div>

    <div class="card">
      <h3>💬 Ask Council (MICRO)</h3>
      <div style="color: #666; font-size: 12px; margin-bottom: 8px;">Format: V:2.0|OP:G|D:Your~request|T:A|R:~CT~KP</div>
      <textarea id="micro" rows="4" placeholder="V:2.0|OP:G|D:Create~a~status~update|T:A|R:~CT~KP"></textarea>
      <button onclick="askCouncil()">🤖 Ask Brock (Council Member)</button>
      <pre id="microOut" style="margin-top: 12px;"></pre>
    </div>

    <div class="card">
      <h3>🧠 Memory Search</h3>
      <div class="row">
        <input id="memQ" placeholder="Search across persistent memory..." />
        <button onclick="searchMem()" style="width: auto;">Search</button>
      </div>
      <pre id="memOut" style="margin-top: 12px;"></pre>
    </div>

    <div class="card">
      <h3>💾 Store Memory</h3>
      <input id="memKey" placeholder="Memory key (e.g., global_rule__tone)" />
      <textarea id="memValue" rows="3" placeholder="Memory value (e.g., Be concrete and complete)"></textarea>
      <input id="memCategory" placeholder="Category (e.g., global_rules)" value="ai_learned" />
      <button onclick="storeMemory()">💾 Save to Memory</button>
      <pre id="memStoreOut" style="margin-top: 12px;"></pre>
    </div>

    <div class="card">
      <h3>📊 System Status</h3>
      <button onclick="checkHealth()">🔍 Check Health</button>
      <pre id="healthOut" style="margin-top: 12px;"></pre>
    </div>
  </div>

  <script>
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
  console.log(`\n✅ LifeOS v15-CLEAN started on http://${HOST}:${PORT}`);
  console.log(`✅ Command Center: http://${HOST}:${PORT}/overlay/command-center.html?key=YOUR_KEY`);
  console.log(`✅ Health: http://${HOST}:${PORT}/healthz`);
  console.log(`✅ AI Council: ${Object.keys(COUNCIL_MEMBERS).length} models (memory-aware)`);
  console.log(`✅ Memory System: ACTIVE (continuous read/write)`);
  console.log(`✅ Protection: ${PROTECTED_FILES.length} protected files`);
  console.log(`✅ Stripe: ${stripeReady ? 'READY' : 'standby'}`);
  console.log(`\n🎯 Next: Seed memory and use command center to drive the system\n`);
});
