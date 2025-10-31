// ═════════════════════════════════════════════════════════════════════════════════
// LUMIN LIFEOS v16.1 - COMPLETE PRODUCTION SYSTEM
// Autonomous Self-Repair + Model Scaling + Improvements Loop + IP VAULT
// ═════════════════════════════════════════════════════════════════════════════════
// FULL CODE - Ready to drop into production

import express from "express";
import dayjs from "dayjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// ─────────────────────────────────────────────────────────────────────────────
// ENVIRONMENT
// ─────────────────────────────────────────────────────────────────────────────
const {
  DATABASE_URL,
  COMMAND_CENTER_KEY,
  WEBHOOK_SECRET,
  OPENAI_API_KEY,
  ANTHROPIC_API_KEY,
  GEMINI_API_KEY,
  GROK_API_KEY,
  DEEPSEEK_API_KEY,
  GITHUB_TOKEN,
  GITHUB_REPO = "LimitlessOI/Lumin-LifeOS",
  STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET,
  HOST = "0.0.0.0",
  PORT = 3000,
  MAX_DAILY_SPEND = 50.0,
  AI_CALL_TIMEOUT = 30000,
  ENABLE_SELF_REPAIR = "true",
  AI_TIER = "medium"
} = process.env;

// ─────────────────────────────────────────────────────────────────────────────
// ENCRYPTION SETUP (for IP vault)
// ─────────────────────────────────────────────────────────────────────────────
const ENCRYPTION_ALGORITHM = "aes-256-cbc";

function deriveEncryptionKey() {
  // Derive from COMMAND_CENTER_KEY for deterministic encryption
  return crypto
    .createHash("sha256")
    .update(COMMAND_CENTER_KEY || "default-key-change-this")
    .digest();
}

function encryptData(data, key = null) {
  const encKey = key || deriveEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, encKey, iv);
  let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decryptData(encryptedData, key = null) {
  const encKey = key || deriveEncryptionKey();
  const [ivHex, encrypted] = encryptedData.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, encKey, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return JSON.parse(decrypted);
}

// ─────────────────────────────────────────────────────────────────────────────
// STRIPE (lazy-load)
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
    console.warn("⚠️  Stripe module not available:", e.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATHS & DATA
// ─────────────────────────────────────────────────────────────────────────────
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const LOG_FILE = path.join(DATA_DIR, "autopilot.log");
const SPEND_FILE = path.join(DATA_DIR, "spend.json");
const IMPROVEMENTS_FILE = path.join(DATA_DIR, "improvements.json");
const VAULT_IMPORTS_DIR = path.join(DATA_DIR, "vault-imports");
if (!fs.existsSync(VAULT_IMPORTS_DIR)) fs.mkdirSync(VAULT_IMPORTS_DIR, { recursive: true });

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE
// ─────────────────────────────────────────────────────────────────────────────
export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL?.includes("neon.tech")
    ? { rejectUnauthorized: false }
    : undefined
});

// ─────────────────────────────────────────────────────────────────────────────
// PROTECTED FILES
// ─────────────────────────────────────────────────────────────────────────────
const PROTECTED_FILES = [
  "server.js",
  "package.json",
  "package-lock.json",
  ".env",
  ".gitignore"
];

// ─────────────────────────────────────────────────────────────────────────────
// MODEL SCALING CONFIGURATION
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

let CURRENT_TIER = process.env.AI_TIER || "medium";

// ─────────────────────────────────────────────────────────────────────────────
// COUNCIL MEMBERS (Official Names - v16.1)
// ─────────────────────────────────────────────────────────────────────────────
const COUNCIL_MEMBERS = {
  claude: {
    name: "Claude",
    official_name: "Claude Sonnet",
    role: "Strategic Oversight",
    model: () => MODEL_TIERS[CURRENT_TIER].anthropic,
    focus: "long-term implications, strategic planning",
    provider: "anthropic",
    tier: "adaptive"
  },
  chatgpt: {
    name: "ChatGPT",
    official_name: "GPT-4o",
    role: "Execution & Implementation",
    model: () => MODEL_TIERS[CURRENT_TIER].openai,
    focus: "practical implementation, risk mitigation",
    provider: "openai",
    tier: "adaptive"
  },
  gemini: {
    name: "Gemini",
    official_name: "Google Gemini",
    role: "Innovation & Creative Solutions",
    model: () => MODEL_TIERS[CURRENT_TIER].google,
    focus: "creative approaches, breakthrough ideas",
    provider: "google",
    tier: "adaptive"
  },
  grok: {
    name: "Grok",
    official_name: "Grok",
    role: "Reality Check & Contrarian",
    model: "grok-beta",
    focus: "practical feasibility, edge cases",
    provider: "xai",
    tier: "fixed"
  },
  deepseek: {
    name: "DeepSeek",
    official_name: "DeepSeek",
    role: "Technical Depth & Optimization",
    model: () => MODEL_TIERS[CURRENT_TIER].deepseek,
    focus: "technical optimization, code quality",
    provider: "deepseek",
    tier: "adaptive"
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ─────────────────────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: "text/plain", limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/reports", express.static(path.join(__dirname, "reports")));
app.use("/overlay", express.static(path.join(__dirname, "public/overlay")));

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

function readImprovements() {
  try {
    return JSON.parse(fs.readFileSync(IMPROVEMENTS_FILE, "utf8"));
  } catch {
    return { improvements: [], adopted: [], rejected: [], last_cycle: null };
  }
}

function writeImprovements(data) {
  try {
    fs.writeFileSync(IMPROVEMENTS_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Failed to write improvements:", e);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SAFE FETCH WITH TIMEOUT & RETRY
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

// ─────────────────────────────────────────────────────────────────────────────
// GITHUB HELPERS
// ─────────────────────────────────────────────────────────────────────────────
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
// MEMORY SYSTEM (3-layer extraction)
// ─────────────────────────────────────────────────────────────────────────────
const MEMORY_CATEGORIES_DEFAULT = ['global_rules','ai_council','context','vault','policy','customer','product','ops','learned','improvements','conversations','decisions'];

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

function extractKeyFactsFromNaturalLanguage(text = '') {
  const out = [];
  
  const patterns = [
    { pattern: 'version\\s+(\\d+[.\\d]*)', key: 'deployment_version', groupIndex: 1 },
    { pattern: 'deployed?\\s+(?:as\\s+)?v(\\d+[.\\w]*)', key: 'latest_version', groupIndex: 1 },
    { pattern: '(memory|debate|council|system)\\s+(?:is\\s+)?(active|enabled|operational|working)', key: 'status', groupIndex: 2 },
    { pattern: '(?:key\\s+)?(finding|learning|insight|rule):\\s+([^.!?\\n]{20,150})', key: 'learned_insight', groupIndex: 2 },
    { pattern: '(succeeded|failed|working|broken)\\s+(?::\\s+)?([^.!?\\n]{10,100})', key: 'result', groupIndex: 2 },
  ];
  
  for (const patternConfig of patterns) {
    try {
      const regex = new RegExp(patternConfig.pattern, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        let value = match[patternConfig.groupIndex];
        if (!value || value.length === 0) continue;
        
        let key = patternConfig.key;
        if (patternConfig.key === 'status' && match[1]) {
          key = `${match[1]}_status`;
        }
        if (patternConfig.key === 'result' && match[1]) {
          key = `result_${match[1]}`;
        }
        
        const normalizedKey = key.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 64);
        out.push({ key: normalizedKey, value: value.trim().slice(0, 240) });
      }
    } catch (e) {
      console.warn(`[extractKeyFacts] Pattern failed:`, e.message);
    }
  }
  
  return out;
}

function extractMemoryFromMicroResponse(text = '') {
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
// MICRO PROTOCOL
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

// ─────────────────────────────────────────────────────────────────────────────
// COST TRACKING
// ─────────────────────────────────────────────────────────────────────────────
const roiTracker = {
  daily_revenue: 0,
  daily_ai_cost: 0,
  daily_tasks_completed: 0,
  revenue_per_task: 0,
  roi_ratio: 0,
  last_reset: dayjs().format("YYYY-MM-DD"),
  total_tokens_saved: 0
};

function updateROI(revenue = 0, cost = 0, tasksCompleted = 0, tokensSaved = 0) {
  const today = dayjs().format("YYYY-MM-DD");
  if (roiTracker.last_reset !== today) {
    roiTracker.daily_revenue = 0;
    roiTracker.daily_ai_cost = 0;
    roiTracker.daily_tasks_completed = 0;
    roiTracker.total_tokens_saved = 0;
    roiTracker.last_reset = today;
  }
  roiTracker.daily_revenue += revenue;
  roiTracker.daily_ai_cost += cost;
  roiTracker.daily_tasks_completed += tasksCompleted;
  roiTracker.total_tokens_saved += tokensSaved;
  if (roiTracker.daily_tasks_completed > 0)
    roiTracker.revenue_per_task = roiTracker.daily_revenue / roiTracker.daily_tasks_completed;
  if (roiTracker.daily_ai_cost > 0)
    roiTracker.roi_ratio = roiTracker.daily_revenue / roiTracker.daily_ai_cost;
}

function trackCost(usage, model = "gpt-4o-mini") {
  const prices = {
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "gpt-4o": { input: 0.0025, output: 0.01 },
    "claude-3-haiku-20240307": { input: 0.00008, output: 0.00024 },
    "claude-3-5-sonnet-20241022": { input: 0.003, output: 0.015 },
    "gemini-2.0-flash-exp": { input: 0.0001, output: 0.0004 },
    "grok-beta": { input: 0.005, output: 0.015 },
    "deepseek-chat": { input: 0.00014, output: 0.00028 },
    "deepseek-coder": { input: 0.00014, output: 0.00028 },
    "deepseek-reasoner": { input: 0.00055, output: 0.0022 }
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
// SYSTEM HEALTH DIAGNOSTIC
// ─────────────────────────────────────────────────────────────────────────────
class SystemHealthDiagnostic {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.last_check = null;
  }

  async run() {
    this.errors = [];
    this.warnings = [];
    this.last_check = new Date();

    try {
      await pool.query("SELECT now()");
    } catch (e) {
      this.errors.push({
        component: "database",
        severity: "critical",
        message: "Cannot connect to PostgreSQL",
        details: e.message,
        fix_code: "Verify DATABASE_URL environment variable"
      });
    }

    const requiredKeys = [
      { name: "OPENAI_API_KEY", env: OPENAI_API_KEY },
      { name: "ANTHROPIC_API_KEY", env: ANTHROPIC_API_KEY },
      { name: "GEMINI_API_KEY", env: GEMINI_API_KEY }
    ];

    for (const key of requiredKeys) {
      if (!key.env) {
        this.warnings.push({
          component: "api_keys",
          severity: "warning",
          message: `${key.name} not configured`,
          fix_code: `Set ${key.name} environment variable`
        });
      }
    }

    const spend = readSpend();
    const maxSpend = Number(MAX_DAILY_SPEND);
    if (spend.usd > maxSpend * 0.9) {
      this.warnings.push({
        component: "cost_control",
        severity: "warning",
        message: `Daily spend at ${((spend.usd / maxSpend) * 100).toFixed(1)}% of limit`,
        fix_code: "Consider scaling to 'light' tier"
      });
    }

    return {
      timestamp: this.last_check,
      healthy: this.errors.length === 0,
      critical_errors: this.errors,
      warnings: this.warnings,
      system_status: "OPERATIONAL"
    };
  }

  async proposeFixes() {
    const fixes = [];
    for (const error of this.errors) {
      fixes.push({
        error_component: error.component,
        severity: error.severity,
        proposed_fix: error.fix_code,
        requires_human_approval: error.severity === "critical"
      });
    }
    return fixes;
  }
}

const systemDiagnostic = new SystemHealthDiagnostic();

// ─────────────────────────────────────────────────────────────────────────────
// IMPROVEMENTS ENGINE
// ─────────────────────────────────────────────────────────────────────────────
class ImprovementsEngine {
  constructor() {
    this.current_cycle = null;
    this.ideas = [];
    this.adopted = [];
    this.rejected = [];
  }

  async generateIdeasFromMember(member, count = 20) {
    const config = COUNCIL_MEMBERS[member];
    if (!config) return [];

    const prompt = `
You are ${config.name} (${config.official_name}), role: ${config.role}.

Generate exactly ${count} specific, actionable improvement ideas for the Lumin LifeOS system.

FOCUS: ${config.focus}

Format: Return a numbered list. Each idea should be 1-2 sentences.
Generate ${count} ideas NOW:
    `.trim();

    try {
      const response = await callCouncilMember(member, prompt, false);
      const ideas = [];
      
      const lines = response.response.split('\n');
      for (const line of lines) {
        const match = line.match(/^\d+\.\s+(.+)/);
        if (match) {
          ideas.push({
            text: match[1].trim(),
            source: member,
            generated_at: new Date().toISOString(),
            adopted: false,
            tested: false
          });
        }
      }

      console.log(`💡 [${member.toUpperCase()}] Generated ${ideas.length} improvement ideas`);
      return ideas;
    } catch (e) {
      console.error(`❌ [${member}] Idea generation failed: ${e.message}`);
      return [];
    }
  }

  async runDailyImprovementCycle() {
    console.log(`\n🔄 [IMPROVEMENTS] Starting daily cycle...`);
    this.current_cycle = dayjs().format("YYYY-MM-DD");

    const allIdeas = [];
    const activeMembers = ["claude", "chatgpt", "gemini", "grok"];

    for (const member of activeMembers) {
      const ideas = await this.generateIdeasFromMember(member, 20);
      allIdeas.push(...ideas);
    }

    console.log(`📊 [IMPROVEMENTS] Total ideas generated: ${allIdeas.length}`);

    const consensusPrompt = `
Evaluate these system improvement ideas and rank them by:
1. Impact (how much will it improve?)
2. Risk (how risky is it?)
3. Effort (how much work?)

Top 20 ideas:\n${allIdeas.slice(0, 20).map((i, idx) => `${idx + 1}. ${i.text}`).join('\n')}

Recommend TOP 5 and identify HIGH RISK ideas.
    `.trim();

    try {
      const consensusResult = await councilConsensusWithDebate(consensusPrompt, "high");
      
      const cycleData = {
        date: this.current_cycle,
        total_generated: allIdeas.length,
        ideas: allIdeas,
        consensus: consensusResult,
        status: "debated"
      };

      await writeMemory(`improvements_cycle_${this.current_cycle}`, cycleData, "improvements");
      this.ideas = allIdeas;

      return cycleData;
    } catch (e) {
      console.error(`❌ [IMPROVEMENTS] Debate failed: ${e.message}`);
      return null;
    }
  }

  async testImprovementInSandbox(ideaText, memberName) {
    console.log(`🧪 [SANDBOX] Testing idea: "${ideaText.slice(0, 50)}..."`);
    
    const testPrompt = `
Evaluate this improvement for security/safety:
"${ideaText}"

Check for: security risks, breaking changes, cost impact, user impact.

Recommend: SAFE_TO_DEPLOY / NEEDS_REVIEW / DO_NOT_DEPLOY
    `.trim();

    try {
      const result = await callCouncilMember("claude", testPrompt, false);
      
      const recommendation = result.response.includes("SAFE_TO_DEPLOY") ? "safe" :
                            result.response.includes("NEEDS_REVIEW") ? "review" :
                            result.response.includes("DO_NOT_DEPLOY") ? "blocked" : "uncertain";

      return {
        idea: ideaText,
        source: memberName,
        sandbox_result: recommendation,
        details: result.response.slice(0, 300),
        timestamp: new Date().toISOString()
      };
    } catch (e) {
      console.error(`❌ [SANDBOX] Test failed: ${e.message}`);
      return { idea: ideaText, sandbox_result: "error", error: e.message };
    }
  }

  adoptIdea(ideaText, sourceAI) {
    const adopted = {
      text: ideaText,
      source: sourceAI,
      adopted_at: new Date().toISOString(),
      status: "adopted"
    };
    this.adopted.push(adopted);
    return adopted;
  }

  rejectIdea(ideaText, sourceAI, reason) {
    const rejected = {
      text: ideaText,
      source: sourceAI,
      rejected_at: new Date().toISOString(),
      reason,
      status: "rejected"
    };
    this.rejected.push(rejected);
    return rejected;
  }

  getStats() {
    return {
      total_generated_this_cycle: this.ideas.length,
      total_adopted: this.adopted.length,
      total_rejected: this.rejected.length,
      adoption_rate: this.ideas.length > 0 ? ((this.adopted.length / this.ideas.length) * 100).toFixed(1) : 0,
      most_productive_member: this.getTopContributor(),
      current_cycle: this.current_cycle
    };
  }

  getTopContributor() {
    if (this.adopted.length === 0) return null;
    const sources = {};
    for (const item of this.adopted) {
      sources[item.source] = (sources[item.source] || 0) + 1;
    }
    const top = Object.entries(sources).sort((a, b) => b[1] - a[1])[0];
    return top ? `${top[0]} (${top[1]} adopted)` : null;
  }
}

const improvementsEngine = new ImprovementsEngine();

// ─────────────────────────────────────────────────────────────────────────────
// IP VAULT - INTELLIGENT DEDUPLICATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────
class IPVaultDeduplicationEngine {
  constructor() {
    this.duplicates = [];
    this.uncertain_matches = [];
  }

  // Calculate semantic similarity between two texts
  calculateSimilarity(text1, text2) {
    const normalize = (text) => text.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
    const t1 = normalize(text1);
    const t2 = normalize(text2);

    // Exact match
    if (t1 === t2) return 1.0;

    // Calculate common words
    const words1 = new Set(t1.split(/\s+/));
    const words2 = new Set(t2.split(/\s+/));
    
    let commonWords = 0;
    for (const word of words1) {
      if (words2.has(word)) commonWords++;
    }

    const totalWords = Math.max(words1.size, words2.size);
    if (totalWords === 0) return 0;

    return commonWords / totalWords;
  }

  async compareIdeasWithAI(idea1, idea2) {
    const prompt = `
Compare these two ideas and determine if they're the same concept (even with different wording):

Idea 1: ${idea1}
Idea 2: ${idea2}

Respond with ONLY a JSON object:
{
  "same_concept": true/false,
  "similarity_percentage": 0-100,
  "key_differences": "describe any nuances",
  "reasoning": "brief explanation"
}
    `.trim();

    try {
      const result = await callCouncilMember("claude", prompt, false);
      // Extract JSON from response
      const jsonMatch = result.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { same_concept: false, similarity_percentage: 0 };
    } catch (e) {
      console.error(`❌ [DEDUP] AI comparison failed: ${e.message}`);
      return { same_concept: false, similarity_percentage: 0 };
    }
  }

  async findDuplicates(ideas, useAI = true) {
    console.log(`🔍 [VAULT] Scanning ${ideas.length} ideas for duplicates...`);
    
    this.duplicates = [];
    this.uncertain_matches = [];
    const processed = new Set();

    for (let i = 0; i < ideas.length; i++) {
      if (processed.has(i)) continue;

      for (let j = i + 1; j < ideas.length; j++) {
        if (processed.has(j)) continue;

        // Quick text similarity check
        const textSimilarity = this.calculateSimilarity(
          ideas[i].text,
          ideas[j].text
        );

        if (textSimilarity > 0.6) {
          if (useAI && textSimilarity < 0.85) {
            // Uncertain - ask AI
            const aiComparison = await this.compareIdeasWithAI(ideas[i].text, ideas[j].text);
            
            if (aiComparison.same_concept) {
              this.duplicates.push({
                idea1: ideas[i],
                idea2: ideas[j],
                similarity: aiComparison.similarity_percentage,
                differences: aiComparison.key_differences,
                status: "confirmed_duplicate"
              });
              processed.add(j);
            } else if (textSimilarity > 0.7) {
              this.uncertain_matches.push({
                idea1: ideas[i],
                idea2: ideas[j],
                text_similarity: (textSimilarity * 100).toFixed(0),
                ai_assessment: aiComparison,
                status: "uncertain_needs_review"
              });
            }
          } else if (textSimilarity > 0.85) {
            this.duplicates.push({
              idea1: ideas[i],
              idea2: ideas[j],
              similarity: (textSimilarity * 100).toFixed(0),
              differences: "Minor wording differences",
              status: "probable_duplicate"
            });
            processed.add(j);
          }
        }
      }
    }

    console.log(`✅ [VAULT] Found ${this.duplicates.length} confirmed duplicates, ${this.uncertain_matches.length} uncertain`);

    return {
      duplicates: this.duplicates,
      uncertain_matches: this.uncertain_matches,
      total_ideas: ideas.length,
      unique_ideas: ideas.length - this.duplicates.length
    };
  }

  mergeDuplicates(idea1, idea2, preferredIdea = 1) {
    const preferred = preferredIdea === 1 ? idea1 : idea2;
    const other = preferredIdea === 1 ? idea2 : idea1;

    return {
      merged_idea: preferred.text,
      kept_idea: preferred,
      discarded_idea: other,
      kept_source: preferred.source,
      lost_source: other.source,
      merged_at: new Date().toISOString(),
      note: `Merged ${other.source}'s variation into ${preferred.source}'s version`
    };
  }
}

const vaultDeduplicator = new IPVaultDeduplicationEngine();

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATION PARSER & INGESTION
// ─────────────────────────────────────────────────────────────────────────────
class ConversationParser {
  detectFormat(content) {
    try {
      JSON.parse(content);
      return 'json';
    } catch {
      // Try other formats
    }

    if (content.includes('```') || content.includes('#')) return 'markdown';
    if (content.includes('message_id') || content.includes('role')) return 'plaintext';
    
    return 'plaintext';
  }

  parseJSON(content) {
    try {
      const data = JSON.parse(content);
      
      // Handle Claude.ai export format
      if (Array.isArray(data) && data[0]?.role) {
        return this.parseClaudeFormat(data);
      }

      // Handle generic conversation format
      if (data.conversations) {
        return data.conversations.map(conv => this.normalizeConversation(conv));
      }

      if (data.messages || data.content) {
        return [this.normalizeConversation(data)];
      }

      return [];
    } catch (e) {
      console.error('JSON parse error:', e.message);
      return [];
    }
  }

  parseClaudeFormat(messages) {
    const conversation = {
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content || "",
        timestamp: msg.timestamp || new Date().toISOString()
      })),
      participants: ["User", "Claude"],
      model: "Claude",
      format: "claude-export"
    };

    // Extract metadata from content
    const allText = messages.map(m => m.content).join(" ");
    const decisions = this.extractDecisions(allText);
    const ideas = this.extractIdeas(allText);

    return [{
      ...conversation,
      decisions,
      ideas,
      extracted_at: new Date().toISOString()
    }];
  }

  parseMarkdown(content) {
    // Split by common markdown headers
    const sections = content.split(/^#+\s/m);
    
    return [{
      content: content,
      format: "markdown",
      section_count: sections.length,
      messages: [{ role: "user", content: content }],
      extracted_at: new Date().toISOString()
    }];
  }

  parsePlaintext(content) {
    // Try to detect conversation patterns
    const lines = content.split('\n');
    const messages = [];
    let currentRole = null;
    let currentContent = [];

    for (const line of lines) {
      if (line.match(/^(User|Assistant|Claude|ChatGPT|Me|AI):/)) {
        if (currentContent.length > 0) {
          messages.push({
            role: currentRole,
            content: currentContent.join('\n')
          });
        }
        currentRole = line.split(':')[0];
        currentContent = [line.replace(/^[^:]+:\s/, '')];
      } else if (line.trim()) {
        currentContent.push(line);
      }
    }

    if (currentContent.length > 0) {
      messages.push({
        role: currentRole,
        content: currentContent.join('\n')
      });
    }

    return [{
      content: content,
      format: "plaintext",
      messages: messages.length > 0 ? messages : [{ role: "user", content }],
      extracted_at: new Date().toISOString()
    }];
  }

  normalizeConversation(conv) {
    return {
      messages: conv.messages || conv.content || [],
      participants: conv.participants || ["User", "AI"],
      model: conv.model || "unknown",
      date: conv.date || conv.created_at || new Date().toISOString(),
      topic: conv.topic || conv.title || "General",
      format: conv.format || "unknown",
      extracted_at: new Date().toISOString()
    };
  }

  extractDecisions(text) {
    const patterns = [
      /(?:decided|decision):\s*([^\.!\n]+)/gi,
      /we(?:\s+will|\s+shall)?\s+([^\.!\n]+)/gi,
      /(?:implement|deploy|use):\s*([^\.!\n]+)/gi
    ];

    const decisions = [];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1]) decisions.push(match[1].trim());
      }
    }

    return [...new Set(decisions)];
  }

  extractIdeas(text) {
    const patterns = [
      /(?:idea|suggestion|thought):\s*([^\.!\n]{10,150})/gi,
      /(?:what if|consider|perhaps):\s*([^\.!\n]{10,150})/gi,
      /could\s+(?:we|you)?\s+([^\.!\n]{10,150})/gi
    ];

    const ideas = [];
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1]) ideas.push(match[1].trim());
      }
    }

    return [...new Set(ideas)];
  }

  async parse(content, filename = "") {
    console.log(`📄 [PARSER] Processing: ${filename}`);
    
    const format = this.detectFormat(content);
    let conversations = [];

    switch (format) {
      case 'json':
        conversations = this.parseJSON(content);
        break;
      case 'markdown':
        conversations = this.parseMarkdown(content);
        break;
      default:
        conversations = this.parsePlaintext(content);
    }

    // Normalize all conversations
    conversations = conversations.map(conv => this.normalizeConversation(conv));

    // Extract metadata from each
    for (const conv of conversations) {
      const allText = conv.messages.map(m => m.content || "").join(" ");
      if (!conv.decisions) conv.decisions = this.extractDecisions(allText);
      if (!conv.ideas) conv.ideas = this.extractIdeas(allText);
      conv.filename = filename;
      conv.word_count = allText.split(/\s+/).length;
    }

    console.log(`✅ [PARSER] Extracted ${conversations.length} conversations from ${filename}`);

    return conversations;
  }
}

const conversationParser = new ConversationParser();

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE INITIALIZATION
// ─────────────────────────────────────────────────────────────────────────────
async function initDb() {
  // Existing tables
  await pool.query(
    `create table if not exists calls (id serial primary key, created_at timestamptz default now(), phone text, intent text, area text, timeline text, duration int, transcript text, score text);`
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS debate_log (
      id SERIAL PRIMARY KEY,
      debate_id TEXT UNIQUE NOT NULL,
      prompt TEXT NOT NULL,
      full_debate JSONB,
      consensus_result JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // NEW TABLES FOR VAULT SYSTEM (v16.1)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      conversation_id TEXT UNIQUE NOT NULL,
      participants JSONB,
      model TEXT,
      topic TEXT,
      content TEXT,
      content_encrypted TEXT,
      word_count INT,
      filename TEXT,
      decisions JSONB,
      ideas JSONB,
      extracted_at TIMESTAMPTZ,
      imported_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversation_ideas (
      id SERIAL PRIMARY KEY,
      idea_id TEXT UNIQUE NOT NULL,
      conversation_id TEXT REFERENCES conversations(conversation_id),
      idea_text TEXT NOT NULL,
      extracted_from TEXT,
      idea_type TEXT,
      category TEXT,
      priority INT,
      effort_estimate TEXT,
      impact_estimate TEXT,
      dependencies JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS idea_deduplication (
      id SERIAL PRIMARY KEY,
      idea_id_1 TEXT,
      idea_id_2 TEXT,
      similarity_score DECIMAL,
      differences TEXT,
      merged_into TEXT,
      status TEXT,
      human_reviewed BOOLEAN DEFAULT FALSE,
      reviewed_at TIMESTAMPTZ,
      reviewed_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(idea_id_1, idea_id_2)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS decision_history (
      id SERIAL PRIMARY KEY,
      decision_id TEXT UNIQUE NOT NULL,
      idea_id TEXT,
      idea_text TEXT,
      decision TEXT,
      reasoning TEXT,
      council_consensus JSONB,
      outcome TEXT,
      roadmap_status TEXT,
      decided_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS roadmap_items (
      id SERIAL PRIMARY KEY,
      item_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      priority INT,
      status TEXT,
      effort_estimate INT,
      impact_estimate INT,
      dependencies JSONB,
      blockers JSONB,
      assigned_to TEXT,
      target_quarter TEXT,
      tags JSONB,
      related_ideas JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ip_vault_audit_log (
      id SERIAL PRIMARY KEY,
      action TEXT,
      actor TEXT,
      resource TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  // Create indexes
  await pool.query(`create index if not exists idx_memory_category on shared_memory(category);`);
  await pool.query(`create index if not exists idx_memory_updated on shared_memory(updated_at);`);
  await pool.query(`create index if not exists idx_approval_status on approval_queue(status);`);
  await pool.query(`create index if not exists idx_debate_log_id on debate_log(debate_id);`);
  await pool.query(`create index if not exists idx_conversations_model on conversations(model);`);
  await pool.query(`create index if not exists idx_conversation_ideas_type on conversation_ideas(idea_type);`);
  await pool.query(`create index if not exists idx_roadmap_status on roadmap_items(status);`);
  await pool.query(`create index if not exists idx_audit_log_created on ip_vault_audit_log(created_at);`);

  console.log("✅ Database schema initialized");
}

initDb().catch(console.error);

// ─────────────────────────────────────────────────────────────────────────────
// COUNCIL CALLER (Memory-Aware, Dynamic Models)
// ─────────────────────────────────────────────────────────────────────────────
async function callCouncilMember(member, prompt, useMicro = true, cachedMemory = null) {
  console.log(`🔍 [${member.toUpperCase()}] Calling...`);
  
  const config = COUNCIL_MEMBERS[member];
  if (!config) throw new Error(`Unknown council member: ${member}`);

  let modelName = typeof config.model === 'function' ? config.model() : config.model;

  let memRows = cachedMemory;
  if (!cachedMemory) {
    memRows = await recallMemory({ q: prompt, limit: 15 });
  }
  const memoryContext = formatMemoryForSystem(memRows);

  const baseSystem = useMicro
    ? [
        `You are ${config.name} (${config.official_name}), role: ${config.role}.`,
        `Focus: ${config.focus}`,
        '',
        'PERSISTENT_MEMORY (use this context):',
        memoryContext,
      ].join('\n')
    : '';

  async function finalize(response, usage, modelIdForCost) {
    try {
      const memWrites1 = extractMemoryFromMicroResponse(response);
      const memWrites2 = extractMemoryFromMicroProtocol(response);
      const naturalFacts = extractKeyFactsFromNaturalLanguage(response);
      
      const allMemWrites = [...memWrites1, ...memWrites2, ...naturalFacts];
      const seenKeys = new Set();
      const uniqueWrites = [];
      
      for (const m of allMemWrites) {
        if (!seenKeys.has(m.key)) {
          seenKeys.add(m.key);
          uniqueWrites.push(m);
        }
      }
      
      for (const m of uniqueWrites) {
        await writeMemory(m.key, { text: m.value, source: member, timestamp: new Date().toISOString() }, 'ai_learned');
      }
      
      if (uniqueWrites.length > 0) {
        console.log(`💾 [${member}] Persisted ${uniqueWrites.length} memory items`);
      }
    } catch (e) {
      console.error(`[${member}.memory.write] failed:`, e.message);
    }
    
    if (modelIdForCost) trackCost(usage, modelIdForCost);
    return { response, usage };
  }

  try {
    if (config.provider === 'anthropic' && ANTHROPIC_API_KEY) {
      const res = await safeFetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: modelName,
          max_tokens: 2000,
          system: baseSystem,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const json = await res.json();
      if (!json.content || !json.content[0]) throw new Error(`No response from Anthropic`);
      
      const text = json.content[0]?.text || '';
      console.log(`  ✅ Success`);
      return finalize(text, { prompt_tokens: json.usage?.input_tokens, completion_tokens: json.usage?.output_tokens }, modelName);
    }

    if (config.provider === 'openai' && OPENAI_API_KEY) {
      const messages = baseSystem
        ? [{ role: 'system', content: baseSystem }, { role: 'user', content: prompt }]
        : [{ role: 'user', content: prompt }];
      const res = await safeFetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: modelName,
          temperature: 0.1,
          max_tokens: 2000,
          messages,
        }),
      });
      const json = await res.json();
      if (!json.choices || !json.choices[0]) throw new Error(`No response from OpenAI`);
      
      const text = json.choices[0]?.message?.content || '';
      console.log(`  ✅ Success`);
      return finalize(text, json.usage, modelName);
    }

    if (config.provider === 'google' && GEMINI_API_KEY) {
      const res = await safeFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
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
      if (!json.candidates || !json.candidates[0]) throw new Error(`No response from Gemini`);
      
      const text = json.candidates[0]?.content?.parts?.[0]?.text || '';
      const usage = {
        prompt_tokens: json.usageMetadata?.promptTokenCount || 0,
        completion_tokens: json.usageMetadata?.candidatesTokenCount || 0,
      };
      console.log(`  ✅ Success`);
      return finalize(text, usage, modelName);
    }

    if (config.provider === 'xai' && GROK_API_KEY) {
      const messages = baseSystem
        ? [{ role: 'system', content: baseSystem }, { role: 'user', content: prompt }]
        : [{ role: 'user', content: prompt }];
      const res = await safeFetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROK_API_KEY}` },
        body: JSON.stringify({ model: modelName, temperature: 0.1, max_tokens: 2000, messages }),
      });
      const json = await res.json();
      if (!json.choices || !json.choices[0]) throw new Error(`No response from Grok`);
      
      const text = json.choices[0]?.message?.content || '';
      console.log(`  ✅ Success`);
      return finalize(text, json.usage, modelName);
    }

    if (config.provider === 'deepseek' && DEEPSEEK_API_KEY) {
      const messages = baseSystem
        ? [{ role: 'system', content: baseSystem }, { role: 'user', content: prompt }]
        : [{ role: 'user', content: prompt }];
      const res = await safeFetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
        body: JSON.stringify({ model: modelName, temperature: 0.1, max_tokens: 2000, messages }),
      });
      const json = await res.json();
      if (!json.choices || !json.choices[0]) throw new Error(`No response from DeepSeek`);
      
      const text = json.choices[0]?.message?.content || '';
      console.log(`  ✅ Success`);
      return finalize(text, json.usage, modelName);
    }

    throw new Error(`No API key for ${member}`);
  } catch (e) {
    console.error(`❌ [${member}] Error: ${e.message}`);
    throw e;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSENSUS DEBATE (with error recovery)
// ─────────────────────────────────────────────────────────────────────────────
function checkUnanimity(votes) {
  let errorCount = 0;
  const positions = Object.values(votes).map(v => {
    if (v.includes("(error)") || v.includes("Error")) {
      errorCount++;
      return "error";
    }
    return v.includes("APPROVE") ? "approve" : v.includes("REJECT") ? "reject" : "concerns";
  });
  
  if (errorCount > positions.length / 2) {
    return {
      unanimous: false,
      position: "error",
      escalate_to_human: true,
      error_count: errorCount,
      total: positions.length
    };
  }

  const allSame = new Set(positions.filter(p => p !== "error")).size === 1;
  
  return {
    unanimous: allSame,
    position: positions.filter(p => p !== "error")[0] || "concerns",
    error_count: errorCount,
    escalate_to_human: errorCount > 0
  };
}

function calculateConsensus(votes) {
  const positions = Object.entries(votes).map(([member, response]) => {
    let position = "concerns";
    let confidence = 50;

    if (response.includes("(error)") || response.includes("Error")) {
      position = "error";
      confidence = 0;
    } else if (response.includes("APPROVE")) {
      position = "approve";
    } else if (response.includes("REJECT")) {
      position = "reject";
    }

    const match = response.match(/Confidence:\s*(\d+)/);
    if (match) confidence = parseInt(match[1]);

    return { member, position, confidence };
  });

  const approveCount = positions.filter(p => p.position === "approve").length;
  const rejectCount = positions.filter(p => p.position === "reject").length;
  const concernsCount = positions.filter(p => p.position === "concerns").length;
  const errorCount = positions.filter(p => p.position === "error").length;

  const avgConfidence = positions.filter(p => p.confidence > 0).length > 0
    ? Math.round(positions.filter(p => p.confidence > 0).reduce((sum, p) => sum + p.confidence, 0) / positions.filter(p => p.confidence > 0).length)
    : 0;

  let position = "concerns";
  if (approveCount > rejectCount + concernsCount) position = "approve";
  if (rejectCount > approveCount + concernsCount) position = "reject";

  return {
    unanimous: new Set(positions.filter(p => p.position !== "error").map(p => p.position)).size === 1,
    position,
    approve: approveCount,
    concerns: concernsCount,
    reject: rejectCount,
    errors: errorCount,
    confidence: avgConfidence,
    votes: positions,
    recommendation: position === "approve" ? "EXECUTE" : position === "reject" ? "BLOCK" : "ESCALATE_TO_HUMAN"
  };
}

async function councilConsensusWithDebate(prompt, escalationLevel = "normal") {
  console.log(`\n🎯 [CONSENSUS] Starting: "${prompt.slice(0, 60)}..."`);
  const debateId = `debate_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  
  try {
    const cachedMemory = await recallMemory({ q: prompt, limit: 20 });

    console.log(`\n⚡ PHASE 1: Fast Tier Vote (3 AIs)`);
    const fastTier = ["claude", "chatgpt", "gemini"];
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
        console.error(`⚠️  [${member}] Fast tier failed`);
        initialVotes[member] = "CONCERNS (error)";
      }
    }

    const unanimity = checkUnanimity(initialVotes);
    
    if (unanimity.escalate_to_human && unanimity.error_count >= 2) {
      console.log(`\n🚨 [CONSENSUS] EMERGENCY: Multiple API failures!`);
      const result = {
        debate_id: debateId,
        phase: "emergency_escalation",
        unanimous: false,
        position: "error",
        confidence: 0,
        escalate_to_human: true,
        recommendation: "EMERGENCY_HUMAN_REVIEW_REQUIRED"
      };
      return result;
    }

    if (unanimity.unanimous) {
      console.log(`\n✅ [CONSENSUS] UNANIMOUS: ${unanimity.position.toUpperCase()}`);
      const result = {
        debate_id: debateId,
        phase: "fast_unanimous",
        unanimous: true,
        position: unanimity.position,
        confidence: 95,
        escalate_to_human: false
      };
      return result;
    }

    console.log(`\n🟡 [CONSENSUS] Not unanimous. Full debate...`);

    const fullDebate = {};
    const council = ["claude", "chatgpt", "gemini", "grok", "deepseek"];

    for (const member of council) {
      try {
        const pro = await callCouncilMember(
          member,
          `Argue IN FAVOR of: "${prompt}"\n\nWhat are 3 strong arguments FOR?`,
          false,
          cachedMemory
        );

        const con = await callCouncilMember(
          member,
          `Argue AGAINST: "${prompt}"\n\nWhat are 3 strong arguments AGAINST?`,
          false,
          cachedMemory
        );

        fullDebate[member] = {
          pro: pro.response.slice(0, 500),
          con: con.response.slice(0, 500)
        };
      } catch (e) {
        console.error(`❌ [${member}] Debate failed`);
        fullDebate[member] = { pro: `Error`, con: `Error` };
      }
    }

    const finalVotes = {};
    for (const member of council) {
      try {
        const final = await callCouncilMember(
          member,
          `Final vote on: "${prompt}"\n\nVote: APPROVE / CONCERNS / REJECT\nConfidence: 0-100`,
          false,
          cachedMemory
        );
        finalVotes[member] = final.response;
      } catch (e) {
        console.error(`⚠️  [${member}] Final vote failed`);
        finalVotes[member] = "CONCERNS (error)";
      }
    }

    const consensus = calculateConsensus(finalVotes);

    const result = {
      debate_id: debateId,
      phase: "full_debate",
      unanimous: consensus.unanimous,
      position: consensus.position,
      confidence: consensus.confidence,
      vote_breakdown: {
        approve: consensus.approve,
        concerns: consensus.concerns,
        reject: consensus.reject,
        errors: consensus.errors
      },
      recommendation: consensus.recommendation,
      escalate_to_human: consensus.confidence < 70 || escalationLevel === "high" || consensus.errors > 0
    };

    await writeMemory(debateId, result, "consensus_decisions");
    
    console.log(`\n✅ [CONSENSUS] Complete: ${result.position.toUpperCase()} (${result.confidence}% confidence)`);
    
    return result;
  } catch (e) {
    console.error(`❌ [CONSENSUS] Fatal error: ${e.message}`);
    throw e;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES: MEMORY
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
    const r = await pool.query("select * from shared_memory where key=$1", [req.params.key]);
    if (r.rows.length === 0) return res.json({ ok: true, found: false });
    res.json({ ok: true, found: true, data: r.rows[0] });
  } catch (e) {
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
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get("/api/v1/memory/search", requireCommandKey, async (req, res) => {
  try {
    const q = String(req.query.q || '');
    const rows = await recallMemory({
      q,
      categories: MEMORY_CATEGORIES_DEFAULT,
      limit: Number(req.query.limit || 50),
    });
    res.json({ ok: true, count: rows.length, rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES: IP VAULT (NEW)
// ─────────────────────────────────────────────────────────────────────────────
app.post("/api/v1/vault/import-bulk", requireCommandKey, async (req, res) => {
  try {
    const { conversations, use_encryption = true } = req.body;
    
    if (!conversations || !Array.isArray(conversations)) {
      return res.status(400).json({ ok: false, error: "conversations array required" });
    }

    let imported = 0;
    let errors = 0;
    const importedIds = [];

    for (const conv of conversations) {
      try {
        const convId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        
        const content = typeof conv.content === 'string' ? conv.content : JSON.stringify(conv.content);
        const contentEncrypted = use_encryption ? encryptData(conv.content || content) : null;

        await pool.query(
          `INSERT INTO conversations (conversation_id, participants, model, topic, content, content_encrypted, word_count, filename, decisions, ideas, extracted_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())`,
          [
            convId,
            JSON.stringify(conv.participants || ["User", "AI"]),
            conv.model || "unknown",
            conv.topic || "General",
            content,
            contentEncrypted,
            conv.word_count || content.split(/\s+/).length,
            conv.filename || "imported",
            JSON.stringify(conv.decisions || []),
            JSON.stringify(conv.ideas || [])
          ]
        );

        importedIds.push(convId);
        imported++;

        // Log to audit
        await pool.query(
          `INSERT INTO ip_vault_audit_log (action, actor, resource, details)
           VALUES ($1, $2, $3, $4)`,
          ["import_conversation", "system", convId, `Imported conversation about ${conv.topic}`]
        );
      } catch (e) {
        console.error("Failed to import conversation:", e.message);
        errors++;
      }
    }

    res.json({
      ok: true,
      imported,
      errors,
      imported_ids: importedIds,
      message: `Successfully imported ${imported} conversations`
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post("/api/v1/vault/upload-file", requireCommandKey, async (req, res) => {
  try {
    const { filename, content } = req.body;
    
    if (!filename || !content) {
      return res.status(400).json({ ok: false, error: "filename and content required" });
    }

    console.log(`📤 [VAULT] Uploading: ${filename}`);

    // Parse the file
    const parsed = await conversationParser.parse(content, filename);

    // Import into database
    let imported = 0;
    for (const conv of parsed) {
      try {
        const convId = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        
        const contentText = typeof conv.content === 'string' ? conv.content : JSON.stringify(conv);
        const encrypted = encryptData(contentText);

        await pool.query(
          `INSERT INTO conversations (conversation_id, participants, model, topic, content, content_encrypted, word_count, filename, decisions, ideas, extracted_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())`,
          [
            convId,
            JSON.stringify(conv.participants || []),
            conv.model || "unknown",
            conv.topic || filename,
            contentText,
            encrypted,
            conv.word_count || 0,
            filename,
            JSON.stringify(conv.decisions || []),
            JSON.stringify(conv.ideas || [])
          ]
        );

        imported++;
      } catch (e) {
        console.error("Failed to import:", e.message);
      }
    }

    res.json({
      ok: true,
      filename,
      parsed_conversations: parsed.length,
      imported,
      format: parsed[0]?.format || "unknown"
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get("/api/v1/vault/deduplication-report", requireCommandKey, async (req, res) => {
  try {
    // Get all ideas from database
    const r = await pool.query(`
      SELECT idea_id, idea_text, extracted_from, conversation_id
      FROM conversation_ideas
      ORDER BY created_at DESC
      LIMIT 1000
    `);

    const ideas = r.rows;

    // Run deduplication
    const report = await vaultDeduplicator.findDuplicates(
      ideas.map(i => ({ text: i.idea_text, id: i.idea_id, source: i.extracted_from })),
      true  // Use AI
    );

    res.json({
      ok: true,
      report,
      total_ideas_scanned: ideas.length,
      duplicates_found: report.duplicates.length,
      uncertain_matches: report.uncertain_matches.length,
      action_required: report.uncertain_matches.length > 0
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post("/api/v1/vault/resolve-duplicate", requireCommandKey, async (req, res) => {
  try {
    const { idea_id_1, idea_id_2, action, preferred_idea = 1, human_notes = "" } = req.body;

    if (!idea_id_1 || !idea_id_2 || !action) {
      return res.status(400).json({ ok: false, error: "Required fields missing" });
    }

    if (action === "merge") {
      // Mark as merged
      await pool.query(
        `INSERT INTO idea_deduplication (idea_id_1, idea_id_2, similarity_score, status, merged_into, human_reviewed, reviewed_by)
         VALUES ($1, $2, 100, 'merged', $3, true, 'human')`,
        [idea_id_1, idea_id_2, preferred_idea === 1 ? idea_id_1 : idea_id_2]
      );
    } else if (action === "different") {
      // Mark as different concepts
      await pool.query(
        `INSERT INTO idea_deduplication (idea_id_1, idea_id_2, similarity_score, status, human_reviewed, reviewed_by)
         VALUES ($1, $2, 0, 'different', true, 'human')`,
        [idea_id_1, idea_id_2]
      );
    }

    await pool.query(
      `INSERT INTO ip_vault_audit_log (action, actor, resource, details)
       VALUES ($1, $2, $3, $4)`,
      ["resolve_duplicate", "human", `${idea_id_1}/${idea_id_2}`, `Action: ${action}, ${human_notes}`]
    );

    res.json({ ok: true, resolved: true, action });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get("/api/v1/vault/conversations", requireCommandKey, async (req, res) => {
  try {
    const limit = Number(req.query.limit || 50);
    const model = req.query.model;

    let query = "SELECT conversation_id, model, topic, word_count, filename, extracted_at FROM conversations";
    const params = [];

    if (model) {
      query += " WHERE model = $1";
      params.push(model);
    }

    query += " ORDER BY extracted_at DESC LIMIT $" + (params.length + 1);
    params.push(limit);

    const r = await pool.query(query, params);

    res.json({
      ok: true,
      count: r.rows.length,
      conversations: r.rows
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get("/api/v1/vault/audit-log", requireCommandKey, async (req, res) => {
  try {
    const limit = Number(req.query.limit || 100);
    const r = await pool.query(
      `SELECT * FROM ip_vault_audit_log ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );

    res.json({
      ok: true,
      count: r.rows.length,
      audit_log: r.rows
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES: TIER CONFIG
// ─────────────────────────────────────────────────────────────────────────────
app.get("/api/v1/config/tier", requireCommandKey, (req, res) => {
  res.json({
    ok: true,
    current_tier: CURRENT_TIER,
    available_tiers: Object.keys(MODEL_TIERS),
    tier_models: MODEL_TIERS[CURRENT_TIER],
    council_members: Object.keys(COUNCIL_MEMBERS).map(m => ({
      name: COUNCIL_MEMBERS[m].name,
      official_name: COUNCIL_MEMBERS[m].official_name,
      current_model: typeof COUNCIL_MEMBERS[m].model === 'function' ? COUNCIL_MEMBERS[m].model() : COUNCIL_MEMBERS[m].model
    }))
  });
});

app.post("/api/v1/config/set-tier", requireCommandKey, (req, res) => {
  try {
    const { tier } = req.body;
    if (!tier || !MODEL_TIERS[tier]) {
      return res.status(400).json({ ok: false, error: `Invalid tier. Available: ${Object.keys(MODEL_TIERS).join(", ")}` });
    }

    CURRENT_TIER = tier;
    console.log(`⚙️  [CONFIG] Model tier changed to: ${tier}`);
    
    res.json({
      ok: true,
      tier_changed: tier,
      new_models: MODEL_TIERS[tier],
      message: `System now using ${tier} tier models`
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES: CONSENSUS
// ─────────────────────────────────────────────────────────────────────────────
app.post("/api/v1/council/consensus", requireCommandKey, async (req, res) => {
  try {
    const { prompt, escalation_level } = req.body;
    
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
// ROUTES: IMPROVEMENTS
// ─────────────────────────────────────────────────────────────────────────────
app.post("/api/v1/improvements/run-cycle", requireCommandKey, async (req, res) => {
  try {
    const result = await improvementsEngine.runDailyImprovementCycle();
    
    res.json({
      ok: true,
      cycle_completed: result !== null,
      cycle_date: improvementsEngine.current_cycle,
      total_ideas_generated: result?.total_generated || 0
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get("/api/v1/improvements/stats", requireCommandKey, async (req, res) => {
  try {
    const stats = improvementsEngine.getStats();
    res.json({ ok: true, stats });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES: DIAGNOSTICS
// ─────────────────────────────────────────────────────────────────────────────
app.get("/api/v1/system/diagnose", requireCommandKey, async (req, res) => {
  try {
    const diagnostic = await systemDiagnostic.run();
    const fixes = await systemDiagnostic.proposeFixes();

    res.json({
      ok: true,
      diagnostic,
      proposed_fixes: fixes,
      needs_human_review: diagnostic.critical_errors.length > 0
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTES: HEALTH
// ─────────────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.send("OK"));

app.get("/healthz", async (_req, res) => {
  try {
    await pool.query("select now()");
    const spend = readSpend();
    const mem = await pool.query("select count(*) as count from shared_memory");
    const convs = await pool.query("select count(*) as count from conversations");

    res.json({
      status: "healthy",
      version: "v16.1-IP-VAULT",
      tier: CURRENT_TIER,
      database: "connected",
      daily_spend: spend.usd.toFixed(2),
      max_daily_spend: Number(MAX_DAILY_SPEND),
      spend_percentage: ((spend.usd / Number(MAX_DAILY_SPEND)) * 100).toFixed(1) + "%",
      ai_council: {
        members: Object.keys(COUNCIL_MEMBERS).length,
        primary_models: ["Claude", "ChatGPT", "Gemini", "Grok", "DeepSeek"],
        current_tier: CURRENT_TIER
      },
      memory_system: {
        enabled: true,
        stored_memories: Number(mem.rows[0].count || 0)
      },
      vault_system: {
        enabled: true,
        conversations_imported: Number(convs.rows[0].count || 0),
        encryption: "AES-256"
      },
      features: [
        "Autonomous self-repair",
        "Daily improvements engine",
        "Model scaling",
        "IP vault with deduplication",
        "Conversation import & analysis",
        "3-layer memory extraction"
      ]
    });
  } catch (e) {
    res.status(500).json({ status: "unhealthy", error: String(e) });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, HOST, () => {
  console.log(`\n${'═'.repeat(80)}`);
  console.log(`✅ LUMIN LIFEOS v16.1 - COMPLETE SYSTEM STARTED`);
  console.log(`${'═'.repeat(80)}`);
  console.log(`\n📍 Server: http://${HOST}:${PORT}`);
  console.log(`🎛️  Command Center: http://${HOST}:${PORT}/overlay/command-center.html`);
  
  console.log(`\n🤖 AI COUNCIL (5 primary members):`);
  console.log(`  • Claude (Claude Sonnet 3.5)`);
  console.log(`  • ChatGPT (GPT-4o)`);
  console.log(`  • Gemini (Google Gemini 2.0)`);
  console.log(`  • Grok (Grok Beta)`);
  console.log(`  • DeepSeek (DeepSeek)`);
  
  console.log(`\n🏛️  IP VAULT SYSTEM:`);
  console.log(`  ✅ Conversation import (JSON, Markdown, plaintext)`);
  console.log(`  ✅ Intelligent deduplication (with AI review)`);
  console.log(`  ✅ AES-256 encryption`);
  console.log(`  ✅ Audit logging`);
  console.log(`  ✅ Idea extraction & analysis`);
  console.log(`  ✅ Decision tracking`);
  
  console.log(`\n⚙️  DYNAMIC TIER SYSTEM:`);
  console.log(`  • LIGHT: Fast & cheap (gpt-4o-mini, Haiku, Gemini Flash, DeepSeek-chat)`);
  console.log(`  • MEDIUM: Balanced (gpt-4o, Sonnet 4, Gemini Flash, DeepSeek-coder)`);
  console.log(`  • HEAVY: Powerful (gpt-4o, Sonnet 4, Gemini Flash, DeepSeek-reasoner)`);
  console.log(`  Current: ${CURRENT_TIER.toUpperCase()}`);
  
  console.log(`\n💡 DAILY IMPROVEMENTS:`);
  console.log(`  • 20 ideas per AI (80 total)`);
  console.log(`  • Full council debate`);
  console.log(`  • Sandbox testing`);
  console.log(`  • Adoption tracking`);
  
  console.log(`\n✅ FEATURES:`);
  console.log(`  • Autonomous self-repair`);
  console.log(`  • 3-layer memory extraction`);
  console.log(`  • Robust consensus with error recovery`);
  console.log(`  • Emergency human escalation`);
  console.log(`  • Cost tracking & ROI`);
  
  console.log(`\n${'═'.repeat(80)}\n`);
});

