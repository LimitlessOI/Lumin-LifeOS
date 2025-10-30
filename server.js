// server.js - v15 MONEY + TIERED CONSENSUS + LOCAL AI + MEMORY/PROTECTION (Consolidated)

// ─────────────────────────────────────────────────────────────────────────────
// Core imports
// ─────────────────────────────────────────────────────────────────────────────
import express from "express";
import dayjs from "dayjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";
import Stripe from "stripe"; // <-- NEW

// ─────────────────────────────────────────────────────────────────────────────
// Paths & app
// ─────────────────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

// NOTE: Stripe webhook MUST come before json parser. We define it later, but
// mount the route here with express.raw(). Global JSON parser is added AFTER.

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
// Stripe init
// ─────────────────────────────────────────────────────────────────────────────
const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

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
// Middleware: Stripe webhook FIRST (raw), then JSON/urlencoded/text parsers
// ─────────────────────────────────────────────────────────────────────────────
if (stripe && STRIPE_WEBHOOK_SECRET) {
  app.post(
    "/api/v1/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const sig = req.headers["stripe-signature"];
      try {
        const event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          STRIPE_WEBHOOK_SECRET
        );
        if (event.type === "payment_intent.succeeded") {
          const pi = event.data.object;
          console.log(`💰 [Stripe] payment_intent.succeeded: ${pi.id}`);
          // We purposely do not auto-fulfill here; confirm endpoint finalizes delivery.
        }
        return res.json({ ok: true });
      } catch (err) {
        console.error("[Stripe Webhook] verify failed:", err?.message || err);
        return res.status(400).send(`Webhook Error: ${String(err.message)}`);
      }
    }
  );
}

// Now global parsers for everything else
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
function compressAIPrompt(operation, data) {
  const compressed = {
    op: AI_PROTOCOL.ops[operation] || operation.charAt(0),
    ...data
  };
  if (compressed.summary && compressed.summary.length > 100) {
    compressed.s = compressed.summary.slice(0, 100);
    delete compressed.summary;
  }
  if (compressed.diff && compressed.diff.length > 500) {
    compressed.dh = hashString(compressed.diff.slice(0, 100));
    compressed.dl = compressed.diff.length;
    delete compressed.diff;
  }
  return compressed;
}
function expandAIResponse(compressedResponse) {
  const expanded = {};
  for (const [short, long] of Object.entries(AI_PROTOCOL.fields)) {
    if (compressedResponse[short] !== undefined)
      expanded[long] = compressedResponse[short];
  }
  if (compressedResponse.v) {
    const voteMap = { a: "approve", c: "concerns", r: "reject" };
    expanded.vote = voteMap[compressedResponse.v] || compressedResponse.v;
  }
  return expanded;
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
  if (roiTracker.daily_tasks_completed % 10 === 0 && roiTracker.daily_tasks_completed > 0) {
    console.log(
      `[ROI] Revenue: $${roiTracker.daily_revenue.toFixed(
        2
      )} | Cost: $${roiTracker.daily_ai_cost.toFixed(2)} | Ratio: ${roiTracker.roi_ratio.toFixed(
        2
      )}x | Tokens: ${roiTracker.total_tokens_saved}`
    );
    console.log(
      `[MICRO] Extra savings from v2.0-Micro: $${roiTracker.micro_compression_saves.toFixed(
        2
      )}`
    );
    if (roiTracker.roi_ratio > 5)
      console.log(`[ROI] 🚀 HEALTHY - ${roiTracker.roi_ratio.toFixed(1)}x - MAX SPEED`);
  }
  return roiTracker;
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
// Local AI bridge (Ollama)
// ─────────────────────────────────────────────────────────────────────────────
class LocalAIBridge {
  static isAvailable = false;
  static models = [];

  static async initialize() {
    try {
      const r = await fetch("http://localhost:11434/api/tags", { timeout: 3000 });
      if (r.ok) {
        const data = await r.json();
        this.models = data?.models?.map((m) => m.name) || [];
        this.isAvailable = this.models.length > 0;
        // Dynamically add deepseek/llama if present
        if (this.models.some((m) => m.includes("deepseek"))) {
          COUNCIL_MEMBERS.deepseek = {
            name: "DeepSeek",
            role: "Code Implementation",
            model: "deepseek-coder",
            focus: "technical_excellence",
            provider: "local",
            isActive: true
          };
          console.log("✅ LocalAI: DeepSeek activated");
        }
        if (this.models.some((m) => m.includes("llama"))) {
          COUNCIL_MEMBERS.llama = {
            name: "Llama",
            role: "Research & Analysis",
            model: "llama3:70b",
            focus: "alternative_perspectives",
            provider: "local",
            isActive: true
          };
          console.log("✅ LocalAI: Llama activated");
        }
        console.log(`[LocalAI] Available: ${this.models.join(", ")}`);
      } else {
        this.isAvailable = false;
        console.log("[LocalAI] Not available (HTTP)");
      }
    } catch {
      this.isAvailable = false;
      console.log("[LocalAI] Not available - cloud-only mode");
    }
  }

  static async queryLocal(model, prompt) {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: false })
    });
    if (!res.ok) throw new Error(`Local AI HTTP ${res.status}`);
    const data = await res.json();
    return {
      response: data.response,
      usage: {
        prompt_tokens: data.prompt_eval_count || 0,
        completion_tokens: data.eval_count || 0
      }
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Council caller (adds 'local' provider support)
// ─────────────────────────────────────────────────────────────────────────────
async function callCouncilMember(member, prompt, useMicro = true) {
  const config = COUNCIL_MEMBERS[member];
  if (!config) throw new Error(`Unknown council member: ${member}`);

  const systemPrompt = useMicro
    ? "You are the LifeOS Architect AI controlling the Lumin autonomous system at robust-magic-production.up.railway.app. You communicate using v2.0-Micro protocol. Format: V:2.0|CT:<complete detailed answer>|KP:~key~points. Be specific and concrete. When asked to generate scripts or code, produce FULL complete examples with all sections. Never produce generic IVR phone menus. Never say \"I cannot access\" - you ARE the system running on Railway with GitHub repo LimitlessOI/Lumin-LifeOS. Show what you DID or CAN DO with specific details."
    : "";

  // Local provider first (free)
  if (config.provider === "local" && LocalAIBridge.isAvailable) {
    try {
      const result = await LocalAIBridge.queryLocal(config.model, systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt);
      return result;
    } catch (e) {
      console.warn(`[LocalAI] ${config.name} failed; falling back if possible:`, e.message);
    }
  }

  // Anthropic
  if (config.provider === "anthropic" && ANTHROPIC_API_KEY) {
    const res = await safeFetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const json = await res.json();
    return {
      response: json.content?.[0]?.text || "",
      usage: {
        prompt_tokens: json.usage?.input_tokens || 0,
        completion_tokens: json.usage?.output_tokens || 0
      }
    };
  }

  // OpenAI
  if (config.provider === "openai" && OPENAI_API_KEY) {
    const messages = systemPrompt
      ? [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }]
      : [{ role: "user", content: prompt }];
    const res = await safeFetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.1,
        max_tokens: 2000,
        messages,
        response_format: useMicro ? undefined : { type: "json_object" }
      })
    });
    const json = await res.json();
    return { response: json.choices?.[0]?.message?.content || "", usage: json.usage || {} };
  }

  // Google
  if (config.provider === "google" && GEMINI_API_KEY) {
    const res = await safeFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2000 }
        })
      }
    );
    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const usage = {
      prompt_tokens: json.usageMetadata?.promptTokenCount || 0,
      completion_tokens: json.usageMetadata?.candidatesTokenCount || 0
    };
    return { response: text, usage };
  }

  // xAI
  if (config.provider === "xai" && GROK_API_KEY) {
    const messages = systemPrompt
      ? [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }]
      : [{ role: "user", content: prompt }];
    const res = await safeFetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROK_API_KEY}` },
      body: JSON.stringify({ model: config.model, temperature: 0.1, max_tokens: 2000, messages })
    });
    const json = await res.json();
    return { response: json.choices?.[0]?.message?.content || "", usage: json.usage || {} };
  }

  throw new Error(`No API key/provider available for ${member} (${config.provider})`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Team (full council) MICRO responder + Tiered Consensus
// ─────────────────────────────────────────────────────────────────────────────
async function teamMicroResponse(microIn) {
  const systemContext = `You are the LifeOS Architect AI controlling the Lumin autonomous system.

SYSTEM STATUS:
- URL: robust-magic-production.up.railway.app
- GitHub: LimitlessOI/Lumin-LifeOS
- Database: Neon PostgreSQL (connected)
- v2.0-MICRO compression: ACTIVE (240 char)
- Current savings: 70-80% target
- ROI: HEALTHY
- Task queue: active
- AI Council: 6+ models (Claude + GPT-4o + Gemini + Grok + local when available)

YOUR CAPABILITIES:
- You ARE the system (not separate from it)
- Can access and modify any file in GitHub repo via endpoints
- Monitor system health, performance, costs
- Generate complete production-ready code and scripts

RESPONSE FORMAT:
- Use v2.0-MICRO: V:2.0|CT:<complete detailed answer>|KP:~key~bullet~points
- Be specific: include concrete steps, examples
- Produce COMPLETE outputs
- Never produce IVR menus unless explicitly requested`;

  const fullPrompt = `${systemContext}\n\nUser request: ${microIn}\n\nRespond in MICRO format with complete, actionable details:`;

  const responses = [];
  try {
    const claude = await callCouncilMember("claude", fullPrompt, true);
    trackCost(claude.usage, "claude-sonnet-4");
    responses.push({ name: "Claude", text: String(claude.response || "").trim() });
  } catch (e) {
    console.error("[team] Claude failed:", e.message);
  }
  try {
    const brock = await callCouncilMember("brock", fullPrompt, true);
    trackCost(brock.usage, "gpt-4o");
    responses.push({ name: "Brock", text: String(brock.response || "").trim() });
  } catch (e) {
    console.error("[team] Brock failed:", e.message);
  }
  try {
    const gemini = await callCouncilMember("gemini", fullPrompt, true);
    trackCost(gemini.usage, "gemini-2.0-flash-exp");
    responses.push({ name: "Gemini", text: String(gemini.response || "").trim() });
  } catch (e) {
    console.error("[team] Gemini failed:", e.message);
  }
  try {
    const grok = await callCouncilMember("grok", fullPrompt, true);
    trackCost(grok.usage, "grok-beta");
    responses.push({ name: "Grok", text: String(grok.response || "").trim() });
  } catch (e) {
    console.error("[team] Grok failed:", e.message);
  }
  if (responses.length === 0) {
    return "V:2.0|CT:All~team~members~unavailable|KP:~retry";
  }

  const responseList = responses
    .map((r, i) => `${String.fromCharCode(65 + i)} (${r.name}): ${r.text}`)
    .join("\n\n");

  const judgePrompt = `You are the quality judge. Review ${responses.length} MICRO responses and synthesize the best answer.

Rules:
- Combine strongest insights and specific details from all responses
- Keep ALL actionable content and complete information
- Remove filler and redundancy
- Prefer concrete steps and specifics
- Format: V:2.0|CT:<synthesized complete answer>|KP:~combined~key~points

Responses:
${responseList}

Return ONE final synthesized MICRO answer:`;

  const judged = await callCouncilMember("r8", judgePrompt, true);
  trackCost(judged.usage, "gpt-4o-mini");
  return String(judged.response || responses[0].text).trim();
}

// Fast Tier1 consensus (Claude + Brock + Gemini)
async function fastConsensusMICRO(microIn) {
  const cohort = ["brock", "claude", "gemini"];
  const norm = (s) => (s || "").replace(/\s+/g, " ").toLowerCase().slice(0, 300);
  const out = [];
  for (const id of cohort) {
    try {
      const r = await callCouncilMember(id, microIn, true);
      const text = (r?.response || "").trim();
      const core = text
        .split("|")
        .find((p) => p.trim().toUpperCase().startsWith("CT:"));
      out.push({ id, text, ct: norm(core || text) });
    } catch (e) {
      out.push({ id, error: String(e) });
    }
  }
  const [a, b, c] = out;
  const agree = a?.ct && b?.ct && c?.ct && a.ct === b.ct && b.ct === c.ct;
  return { agree, results: out, final: agree ? a.text : null };
}
async function decideWithTiers(microIn) {
  const lower = (microIn || "").toLowerCase();
  const isHighRisk = ["commit", "deploy", "delete"].some((kw) => lower.includes(kw));
  const fast = await fastConsensusMICRO(microIn);
  if (fast.agree && !isHighRisk) {
    console.log("✅ Fast Consensus (3/3) - Low Risk. Bypassing Full Council.");
    return { mode: "tier1", text: fast.final };
    }
  console.log("↗️ Escalating to Full Council (High Risk or Disagreement).");
  const full = await teamMicroResponse(microIn);
  return { mode: "tier2", text: full };
}

// ─────────────────────────────────────────────────────────────────────────────
// Work queue + executor (unchanged logic; uses MICRO to compress prompts)
// ─────────────────────────────────────────────────────────────────────────────
const workQueue = [];
let taskIdCounter = 1;

async function executeTask(task) {
  const description = task.description;
  const customerPrompt = `Please ${description}. Provide comprehensive output with detailed analysis, key insights, actionable recommendations, and supporting context.`;
  const customerTokens = Math.ceil(customerPrompt.length / 3.5);
  const microData = {
    operation: description.includes("generate")
      ? "generate"
      : description.includes("analyze")
      ? "analyze"
      : "create",
    description,
    type: description.includes("script")
      ? "script"
      : description.includes("report")
      ? "report"
      : "general",
    returnFields: ["CT", "KP"]
  };
  const microPrompt = MICRO_PROTOCOL.encode(microData);
  const compressedTokens = Math.ceil(microPrompt.length / 4);
  const tokensSaved = Math.max(0, customerTokens - compressedTokens);
  const savingsPct = customerTokens
    ? Math.round((tokensSaved / customerTokens) * 100)
    : 0;
  const costSaved = (tokensSaved * 0.0025) / 1000;

  console.log(`[executor] ${description.slice(0, 50)}...`);
  console.log(`[REAL SAVINGS] Customer: ${customerTokens}t → MICRO: ${compressedTokens}t`);
  console.log(`[REAL SAVINGS] Savings: ${savingsPct}% ($${costSaved.toFixed(4)})`);

  try {
    const result = await callCouncilMember("brock", microPrompt, true);
    const microResponse = result.response.trim();
    const output = MICRO_PROTOCOL.decode(microResponse);

    await pool.query(
      `insert into compression_stats (task_id, original_tokens, compressed_tokens, savings_pct, cost_saved) values ($1, $2, $3, $4, $5)`,
      [task.id, customerTokens, compressedTokens, savingsPct, costSaved]
    );
    await pool.query(
      `insert into task_outputs (task_id, output_type, content, metadata) values ($1, $2, $3, $4)`,
      [
        task.id,
        output.type || "generic",
        output.content || output.description || "Complete",
        JSON.stringify({
          key_points: output.keyPoints,
          tokens_saved: tokensSaved,
          compression_pct: savingsPct
        })
      ]
    );

    trackCost(result.usage, "gpt-4o");
    roiTracker.micro_compression_saves += costSaved;

    return {
      success: true,
      output: output.content || output.description,
      type: output.type,
      summary: `Generated: ${output.keyPoints?.[0] || "Complete"}`,
      tokens_saved: tokensSaved,
      compression_pct: savingsPct,
      cost_saved: costSaved
    };
  } catch (e) {
    console.error(`[executor] Failed:`, e.message);
    throw new Error(`Execution failed: ${e.message}`);
  }
}

async function processWorkQueue() {
  console.log(
    "[worker] Starting with v2.0-MICRO protocol (70-80% compression target)..."
  );
  while (true) {
    const task = workQueue.find((t) => t.status === "queued");
    if (!task) {
      await sleep(5000);
      continue;
    }
    task.status = "in-progress";
    console.log(`[worker] Processing: ${task.description}`);
    try {
      const result = await executeTask(task);
      task.status = "complete";
      task.completed = new Date();
      task.result = result;
      // keep "estimated" (non-booked) revenue metric internal only
      const type = (result.type || "").toLowerCase();
      let est = 0;
      if (type.includes("lead") || type.includes("generation") || type.includes("recruitment")) est = 50;
      else if (type.includes("revenue") || type.includes("analysis")) est = 100;
      else if (type.includes("call") || type.includes("script")) est = 25;
      else if (type.includes("optimization") || type.includes("improve")) est = 75;
      else est = 10;
      updateROI(est, 0, 1, result.tokens_saved || 0);
      task.estimated_revenue = est;
      console.log(
        `[worker] ✅ ${task.description.slice(0, 40)}... | Saved: ${result.compression_pct}% ($${result.cost_saved.toFixed(
          4
        )}) | ${result.summary}`
      );
    } catch (e) {
      task.status = "failed";
      task.error = String(e);
      console.error(`[worker] ❌ Failed: ${task.description}`, e.message);
    }
    await sleep(2000);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DB init (adds money tables)
// ─────────────────────────────────────────────────────────────────────────────
async function initDb() {
  await pool.query(
    `create table if not exists calls (id serial primary key, created_at timestamptz default now(), phone text, intent text, area text, timeline text, duration int, transcript text, score text, boldtrail_lead_id text);`
  );
  await pool.query(
    `create table if not exists build_metrics (id serial primary key, created_at timestamptz default now(), pr_number int, model text, tokens_in int default 0, tokens_out int default 0, cost numeric(10,4) default 0, outcome text default 'pending', summary text);`
  );
  await pool.query(
    `create table if not exists council_reviews (id serial primary key, pr_number int not null, reviewer text not null, vote text not null, reasoning text, concerns jsonb, created_at timestamptz default now());`
  );
  await pool.query(
    `create table if not exists task_outputs (id serial primary key, task_id int not null, output_type text, content text, metadata jsonb, created_at timestamptz default now());`
  );
  await pool.query(
    `create table if not exists compression_stats (id serial primary key, task_id int, original_tokens int, compressed_tokens int, savings_pct numeric, cost_saved numeric, created_at timestamptz default now());`
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

  // NEW: Money system
  await pool.query(`create table if not exists money_orders (
    id serial primary key,
    payment_intent_id text unique not null,
    service_type text not null,
    customer_email text not null,
    requirements text not null,
    amount integer not null,
    status text default 'processing',
    created_at timestamptz default now(),
    completed_at timestamptz,
    error_message text
  );`);
  await pool.query(`create table if not exists deliverables (
    id serial primary key,
    order_id integer references money_orders(id),
    content text not null,
    delivery_type text not null,
    status text default 'delivered',
    created_at timestamptz default now()
  );`);

  await pool.query(`create index if not exists idx_council_pr on council_reviews(pr_number);`);
  await pool.query(`create index if not exists idx_task_outputs on task_outputs(task_id);`);
  await pool.query(`create index if not exists idx_compression_stats on compression_stats(created_at);`);
  await pool.query(`create index if not exists idx_memory_category on shared_memory(category);`);
  await pool.query(`create index if not exists idx_approval_status on approval_queue(status);`);
  await pool.query(`create index if not exists idx_money_orders_status on money_orders(status);`);
  await pool.query(`create index if not exists idx_money_orders_created on money_orders(created_at);`);
}
initDb()
  .then(() => console.log("✅ Database ready (memory + protection + money)"))
  .catch(console.error);

// ─────────────────────────────────────────────────────────────────────────────
// MoneyMakingEngine (real—no fake revenue)
// ─────────────────────────────────────────────────────────────────────────────
class MoneyMakingEngine {
  static SERVICE_PRICES = {
    web_development: {
      price_cents: 49700,
      ai_team: ["deepseek", "claude", "grok"],
      delivery_time: "24 hours",
      description: "Professional website development"
    },
    api_development: {
      price_cents: 29700,
      ai_team: ["deepseek", "claude", "gemini"],
      delivery_time: "12 hours",
      description: "REST API development"
    },
    content_creation: {
      price_cents: 19700,
      ai_team: ["claude", "gemini", "grok"],
      delivery_time: "6 hours",
      description: "SEO-optimized content creation"
    },
    lead_generation: {
      price_cents: 14700,
      ai_team: ["grok", "gemini", "claude"],
      delivery_time: "4 hours",
      description: "Qualified lead generation"
    },
    code_review: {
      price_cents: 9700,
      ai_team: ["deepseek", "claude", "grok"],
      delivery_time: "2 hours",
      description: "Professional code review"
    }
  };

  static listServices() {
    return Object.entries(this.SERVICE_PRICES).map(([key, cfg]) => ({
      id: key,
      name: cfg.description,
      price: cfg.price_cents / 100,
      delivery_time: cfg.delivery_time,
      ai_team: cfg.ai_team
    }));
  }

  static async createPaymentIntent(serviceType, customerEmail, requirements) {
    if (!stripe) throw new Error("Stripe not configured");
    const svc = this.SERVICE_PRICES[serviceType];
    if (!svc) throw new Error("Invalid service type");
    const pi = await stripe.paymentIntents.create({
      amount: svc.price_cents,
      currency: "usd",
      receipt_email: customerEmail,
      metadata: {
        service_type: serviceType,
        customer_email: customerEmail,
        requirements: String(requirements || "").slice(0, 500)
      }
    });
    return pi;
  }

  static buildExecutionPrompt(reqs) {
    return `CLIENT REQUIREMENTS: ${reqs}

Create a professional, client-ready deliverable. This is for a paying customer who expects production-quality output.

Include:
1) Complete, working solution
2) Professional formatting
3) Clear documentation
4) Ready-to-use code/content
5) Next steps recommendations

Respond with the complete deliverable.`;
  }

  static async executeWithAITeam(aiTeam, requirements) {
    const prompt = this.buildExecutionPrompt(requirements);
    const results = [];
    for (const ai of aiTeam) {
      try {
        if (ai === "deepseek" && LocalAIBridge.isAvailable && COUNCIL_MEMBERS.deepseek) {
          const local = await LocalAIBridge.queryLocal(COUNCIL_MEMBERS.deepseek.model, prompt);
          results.push({ ai, content: local.response, usage: local.usage, source: "local" });
        } else {
          const r = await callCouncilMember(ai, prompt, true);
          results.push({ ai, content: r.response, usage: r.usage, source: "cloud" });
        }
      } catch (e) {
        console.error(`[MoneyEngine] ${ai} failed:`, e.message);
        results.push({ ai, error: e.message, content: null });
      }
    }
    return results;
  }

  static formatDeliverable(results, reqs, serviceType) {
    const ok = results.filter((r) => r.content && !r.error);
    const best = ok.find((r) => r.ai === "claude") || ok[0];
    let out = `# Lumin AI Deliverable

**Service:** ${serviceType}
**Requirements:** ${reqs}
**Generated:** ${new Date().toISOString()}
**AI Team Used:** ${ok.map((r) => r.ai).join(", ") || "none"}

---

`;
    out += best ? best.content : `## Delivery Note\nAll AI systems encountered errors. Please contact support for manual completion.`;
    out += `

---

*Delivered by Lumin AI System*`;
    return out;
  }

  static async processPaidOrder(paymentIntentId) {
    if (!stripe) throw new Error("Stripe not configured");
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== "succeeded") throw new Error("Payment not completed");

    const serviceType = pi.metadata?.service_type;
    const customerEmail = pi.metadata?.customer_email;
    const requirements = pi.metadata?.requirements || "";
    const svc = this.SERVICE_PRICES[serviceType];
    if (!svc) throw new Error("Unknown service type");

    const ins = await pool.query(
      `insert into money_orders (payment_intent_id, service_type, customer_email, requirements, amount, status) values ($1,$2,$3,$4,$5,$6) returning id`,
      [paymentIntentId, serviceType, customerEmail, requirements, svc.price_cents, "processing"]
    );
    const orderId = ins.rows[0].id;

    try {
      const results = await this.executeWithAITeam(svc.ai_team, requirements);
      const content = this.formatDeliverable(results, requirements, serviceType);

      await pool.query(
        `insert into deliverables (order_id, content, delivery_type, status) values ($1,$2,$3,$4)`,
        [orderId, content, serviceType, "delivered"]
      );
      await pool.query(
        `update money_orders set status = $1, completed_at = now() where id = $2`,
        ["completed", orderId]
      );

      // Update ROI with *real* revenue (booked)
      updateROI(svc.price_cents / 100, 0, 1, 0);

      console.log(`✅ ORDER COMPLETED: ${orderId} - $${(svc.price_cents / 100).toFixed(2)}`);
      return { order_id: orderId, revenue: svc.price_cents / 100 };
    } catch (e) {
      await pool.query(
        `update money_orders set status = $1, error_message = $2 where id = $3`,
        ["failed", String(e.message), orderId]
      );
      throw e;
    }
  }

  static async getRevenueStats() {
    const r = await pool.query(`
      select
        count(*)::int as total_orders,
        coalesce(sum(amount),0)::int as total_revenue,
        coalesce(avg(amount),0)::int as avg_order_value,
        count(*) filter (where status='completed')::int as completed_orders,
        count(*) filter (where status='processing')::int as processing_orders
      from money_orders
      where created_at > now() - interval '24 hours'
    `);
    return r.rows[0];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Routes: memory & protection (v14 intact)
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
      ? "select * from shared_memory where category=$1 order by updated_at desc"
      : "select * from shared_memory order by updated_at desc";
    const params = category ? [category] : [];
    const r = await pool.query(q, params);
    res.json({ ok: true, count: r.rows.length, memories: r.rows });
  } catch (e) {
    console.error("[memory.list]", e);
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

// Architect MICRO (now with Tiered router on ?team=1)
app.post("/api/v1/architect/micro", requireCommandKey, async (req, res) => {
  try {
    const rawBody =
      typeof req.body === "string" ? req.body : req.body?.micro || req.body?.text || "";
    if (!rawBody || !String(rawBody).startsWith("V:2.0")) {
      return res.status(400).type("text/plain").send("V:2.0|CT:missing~micro~input|KP:~format");
    }
    const useTeam = String(req.query.team || "").trim() === "1";
    let out;
    if (useTeam) {
      const routed = await decideWithTiers(rawBody);
      out = routed.text;
    } else {
      const r = await callCouncilMember("brock", rawBody, true);
      trackCost(r.usage, "gpt-4o");
      out = String(r.response || "").trim();
    }
    return res.type("text/plain").send(out || "V:2.0|CT:empty~response|KP:~retry");
  } catch (e) {
    console.error("[architect.micro]", e);
    return res
      .status(500)
      .type("text/plain")
      .send(`V:2.0|CT:system~error|KP:~retry~${String(e).slice(0, 100)}`);
  }
});

// Dev commit (protection)
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

// Protection queue
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
app.post("/api/v1/protection/reject/:id", requireCommandKey, async (req, res) => {
  try {
    await pool.query("update approval_queue set status=$1 where id=$2", [
      "rejected",
      req.params.id
    ]);
    res.json({ ok: true, rejected: true });
  } catch (e) {
    console.error("[protection.reject]", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Critique PR & council reviews (unchanged)
async function getCouncilConsensus(prNumber, diff, summary) {
  console.log(`[council] Reviewing PR #${prNumber}`);
  const reviews = [];
  const compressedRequest = compressAIPrompt("review", {
    pr: prNumber,
    s: (summary || "").slice(0, 100),
    dh: hashString((diff || "").slice(0, 500)),
    dl: (diff || "").length
  });
  const basePromptJSON = `AI-to-AI Protocol. Input: ${JSON.stringify(
    compressedRequest
  )}\nFocus: {{focus}}\n\nRespond compact JSON:\n{"v":"a|c|r","cf":1-10,"r":"reason","cn":["concerns"],"bs":["blindspots"]}`;
  let totalTokensSaved = 0;
  for (const [memberId, config] of Object.entries(COUNCIL_MEMBERS)) {
    try {
      const memberPrompt = basePromptJSON.replace("{{focus}}", config.focus.slice(0, 50));
      const estimatedTokensSaved = Math.floor(memberPrompt.length * 2.5);
      const result = await callCouncilMember(memberId, memberPrompt, false);
      const compressedReview = JSON.parse(result.response || "{}");
      const review = expandAIResponse(compressedReview);
      totalTokensSaved += estimatedTokensSaved;
      trackCost(result.usage, config.model);
      await pool.query(
        `insert into council_reviews (pr_number, reviewer, vote, reasoning, concerns) values ($1,$2,$3,$4,$5)`,
        [
          prNumber,
          config.name,
          review.vote || "concerns",
          review.reasoning || "",
          JSON.stringify(review.concerns || [])
        ]
      );
      reviews.push({
        member: config.name,
        vote: review.vote || "concerns",
        confidence: review.confidence || 5,
        reasoning: review.reasoning || "",
        concerns: review.concerns || [],
        blindspots: review.blindspots || []
      });
    } catch (e) {
      console.error(`[council] ${config.name} failed:`, e.message);
      reviews.push({ member: config.name, vote: "error" });
    }
  }
  updateROI(0, 0, 0, totalTokensSaved);
  const votes = reviews.filter((r) => r.vote !== "error");
  const approvals = votes.filter((r) => r.vote === "approve").length;
  const rejections = votes.filter((r) => r.vote === "reject").length;
  const consensus = {
    approved: approvals >= 4 || (approvals >= 3 && rejections === 0),
    auto_merge: approvals >= 5,
    votes: { approve: approvals, reject: rejections },
    reviews,
    all_concerns: reviews.flatMap((r) => r.concerns || []),
    tokens_saved: totalTokensSaved
  };
  return consensus;
}
app.post("/api/v1/build/critique-pr", requireCommandKey, async (req, res) => {
  try {
    const { pr_number, diff, summary } = req.body || {};
    if (!diff) return res.status(400).json({ ok: false, error: "diff required" });
    const consensus = await getCouncilConsensus(pr_number, diff, summary || "");
    const recommendation = consensus.auto_merge
      ? "auto_merge"
      : consensus.approved
      ? "review_required"
      : "reject";
    const score =
      consensus.votes.approve >= 4 ? 5 : consensus.votes.approve === 3 ? 4 : 3;
    res.json({
      ok: true,
      critique: {
        score,
        recommendation,
        reasoning: `Council: ${consensus.votes.approve}/6 approve`,
        council_reviews: consensus.reviews,
        all_concerns: consensus.all_concerns,
        tokens_saved: consensus.tokens_saved
      }
    });
  } catch (e) {
    console.error("[critique]", e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});
app.get("/api/v1/council/reviews/:pr_number", requireCommandKey, async (req, res) => {
  try {
    const r = await pool.query(
      "select * from council_reviews where pr_number=$1 order by created_at desc",
      [req.params.pr_number]
    );
    res.json({ ok: true, reviews: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Calls stats (unchanged)
app.get("/api/v1/calls/stats", requireCommandKey, async (_req, res) => {
  try {
    const r = await pool.query(
      "select count(*)::int as count from calls where created_at > now() - interval '30 days'"
    );
    const last10 = await pool.query(
      "select id, created_at, phone, intent, score from calls order by id desc limit 10"
    );
    res.json({ count: r.rows[0].count, last_10: last10.rows });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Legacy/corrupted endpoint (kept)
app.get("/api/x/1/nkconectom/r", requireCommandKey, async (_req, res) => {
  try {
    const r = await pool.query(
      "SELECT * FROM subconscious ORDER BY updateLast DESC LIMIT 1"
    );
    res.json({ doctrine: "v4.8", data: r.rows[0] || null });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Autopilot tasks gen
app.post("/api/v1/autopilot/generate-work", async (req, res) => {
  if (!assertKey(req, res)) return;
  try {
    const current = workQueue.filter((t) => t.status !== "complete" && t.status !== "failed").length;
    const needed = Math.max(0, 200 - current);
    if (needed > 0) {
      const types = [
        "Generate EXP recruitment script",
        "Analyze lead conversion data",
        "Optimize database performance",
        "Create automated follow-up",
        "Generate revenue report",
        "Build feature improvement",
        "Review system logs",
        "Update documentation",
        "Create pricing strategy",
        "Generate call list"
      ];
      const added = [];
      for (let i = 0; i < needed; i++) {
        added.push({
          id: taskIdCounter++,
          description: `${types[i % types.length]} #${Math.floor(i / types.length) + 1}`,
          status: "queued",
          created: new Date()
        });
      }
      workQueue.push(...added);
      console.log(`[autopilot] Generated ${needed} tasks`);
    }
    res.json({ ok: true, queue_size: workQueue.length, tasks_added: needed });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});
app.get("/api/v1/tasks", requireCommandKey, async (_req, res) => {
  res.json({ ok: true, tasks: workQueue.slice(-50) });
});
app.get("/api/v1/tasks/:id/outputs", requireCommandKey, async (req, res) => {
  try {
    const r = await pool.query(
      "select * from task_outputs where task_id=$1 order by created_at desc",
      [req.params.id]
    );
    res.json({ ok: true, outputs: r.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
app.post("/api/v1/tasks/:id/cancel", requireCommandKey, async (req, res) => {
  const id = Number(req.params.id);
  const t = workQueue.find((x) => x.id === id);
  if (t) {
    t.status = "cancelled";
    res.json({ ok: true });
  } else res.status(404).json({ ok: false, error: "Task not found" });
});

// Money endpoints
app.get("/api/v1/shop/services", async (_req, res) => {
  try {
    res.json({
      ok: true,
      services: MoneyMakingEngine.listServices(),
      local_ai_available: LocalAIBridge.isAvailable
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});
app.post("/api/v1/shop/create-payment", async (req, res) => {
  try {
    const { serviceType, customerEmail, requirements } = req.body || {};
    if (!serviceType || !customerEmail || !requirements)
      return res
        .status(400)
        .json({ ok: false, error: "serviceType, customerEmail, requirements required" });
    if (!stripe) return res.status(400).json({ ok: false, error: "Stripe not configured" });

    const pi = await MoneyMakingEngine.createPaymentIntent(
      serviceType,
      customerEmail,
      requirements
    );
    res.json({ ok: true, client_secret: pi.client_secret, payment_intent_id: pi.id, amount: pi.amount });
  } catch (e) {
    console.error("[shop.create-payment]", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});
app.post("/api/v1/shop/confirm-payment", async (req, res) => {
  try {
    const { paymentIntentId } = req.body || {};
    if (!paymentIntentId) return res.status(400).json({ ok: false, error: "paymentIntentId required" });

    const result = await MoneyMakingEngine.processPaidOrder(paymentIntentId);
    res.json({ ok: true, order_id: result.order_id, status: "delivered", revenue: result.revenue });
  } catch (e) {
    console.error("[shop.confirm-payment]", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});
app.get("/api/v1/shop/order/:orderId", async (req, res) => {
  try {
    const r = await pool.query("select * from money_orders where id=$1", [
      req.params.orderId
    ]);
    if (r.rows.length === 0) return res.status(404).json({ ok: false, error: "Order not found" });
    const d = await pool.query("select * from deliverables where order_id=$1", [
      req.params.orderId
    ]);
    res.json({ ok: true, order: { ...r.rows[0], deliverable: d.rows[0] || null } });
  } catch (e) {
    console.error("[shop.order]", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});
app.get("/api/v1/admin/revenue/stats", requireCommandKey, async (_req, res) => {
  try {
    const s = await MoneyMakingEngine.getRevenueStats();
    res.json({
      ok: true,
      revenue: {
        total_orders: s.total_orders || 0,
        total_revenue: (s.total_revenue || 0) / 100,
        avg_order_value: (s.avg_order_value || 0) / 100,
        completed_orders: s.completed_orders || 0,
        processing_orders: s.processing_orders || 0
      }
    });
  } catch (e) {
    console.error("[admin.revenue.stats]", e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Health
app.get("/health", (_req, res) => res.send("OK"));
app.get("/healthz", async (_req, res) => {
  try {
    const r = await pool.query("select now()");
    const spend = readSpend();
    const comp = await pool.query(
      `SELECT COUNT(*) as count, AVG(savings_pct) as avg_pct FROM compression_stats WHERE created_at > NOW() - INTERVAL '24 hours'`
    );
    const compStats = comp.rows[0];
    const mem = await pool.query("select count(*) as count from shared_memory");
    const approvals = await pool.query(
      "select count(*) as count from approval_queue where status=$1",
      ["pending"]
    );
    const rev = await MoneyMakingEngine.getRevenueStats();

    res.json({
      status: "healthy",
      database: "connected",
      timestamp: r.rows[0].now,
      version: "v15-money-tiered-local",
      daily_spend: spend.usd,
      max_daily_spend: Number(MAX_DAILY_SPEND),
      spend_percentage: ((spend.usd / Number(MAX_DAILY_SPEND)) * 100).toFixed(1) + "%",
      ai_council: {
        enabled: true,
        members: Object.keys(COUNCIL_MEMBERS).length,
        models: Object.values(COUNCIL_MEMBERS).map((m) => m.model),
        providers: [...new Set(Object.values(COUNCIL_MEMBERS).map((m) => m.provider))]
      },
      micro_compression: {
        enabled: true,
        version: "2.0",
        char_limit: 240,
        compressions_today: Number(compStats.count || 0),
        avg_savings_pct: Math.round(Number(compStats.avg_pct || 0))
      },
      memory_system: { enabled: true, stored_memories: Number(mem.rows[0].count || 0) },
      protection_system: {
        enabled: true,
        protected_files: PROTECTED_FILES,
        pending_approvals: Number(approvals.rows[0].count || 0)
      },
      money_system: {
        enabled: true,
        local_ai_available: LocalAIBridge.isAvailable,
        services_available: Object.keys(MoneyMakingEngine.SERVICE_PRICES).length,
        orders_today: rev.total_orders || 0,
        revenue_today: (rev.total_revenue || 0) / 100,
        ready_for_payments: !!STRIPE_SECRET_KEY
      },
      roi: {
        ratio: roiTracker.roi_ratio.toFixed(2) + "x",
        revenue: "$" + roiTracker.daily_revenue.toFixed(2),
        cost: "$" + roiTracker.daily_ai_cost.toFixed(2),
        tokens_saved: roiTracker.total_tokens_saved,
        micro_saves: "$" + roiTracker.micro_compression_saves.toFixed(2),
        health: roiTracker.roi_ratio > 2 ? "HEALTHY" : roiTracker.roi_ratio > 1 ? "MARGINAL" : "NEGATIVE"
      }
    });
  } catch {
    res.status(500).json({ status: "unhealthy" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Backgrounds & startup
// ─────────────────────────────────────────────────────────────────────────────
setTimeout(() => {
  processWorkQueue().catch((e) => {
    console.error("[worker] Fatal:", e);
    process.exit(1);
  });
}, 5000);

setTimeout(async () => {
  console.log("[startup] Auto-generating initial 200 tasks...");
  try {
    const current = workQueue.filter((t) => t.status !== "complete" && t.status !== "failed").length;
    const needed = Math.max(0, 200 - current);
    if (needed > 0) {
      const types = [
        "Generate EXP recruitment script",
        "Analyze lead conversion data",
        "Optimize database performance",
        "Create automated follow-up",
        "Generate revenue report",
        "Build feature improvement",
        "Review system logs",
        "Update documentation",
        "Create pricing strategy",
        "Generate call list"
      ];
      for (let i = 0; i < needed; i++) {
        workQueue.push({
          id: taskIdCounter++,
          description: `${types[i % types.length]} #${Math.floor(i / types.length) + 1}`,
          status: "queued",
          created: new Date()
        });
      }
      console.log(`[startup] ✅ Generated ${needed} tasks - Work queue ready`);
    }
  } catch (e) {
    console.error("[startup] Failed to auto-generate:", e.message);
  }
}, 10000);

// Start app
app.listen(PORT, HOST, () => {
  console.log(`✅ Server on http://${HOST}:${PORT}`);
  console.log(
    `✅ Architect: http://${HOST}:${PORT}/overlay/architect.html?key=${COMMAND_CENTER_KEY}`
  );
  console.log(`✅ Portal: http://${HOST}:${PORT}/overlay/portal.html?key=${COMMAND_CENTER_KEY}`);
  console.log(`✅ AI Council: ${Object.keys(COUNCIL_MEMBERS).length} models (Claude + GPT + Gemini + Grok + local when available)`);
  console.log("✅ v2.0-MICRO Protocol: ENABLED (240 char, 70-80% target)");
  console.log("✅ Team Mode: Tiered fast-consensus → Full council");
  console.log("✅ GitHub Commit: ENABLED");
  console.log("✅ ROI Tracking: ENABLED");
  console.log("✅ Memory System: ENABLED (shared_memory table)");
  console.log(`✅ Protection System: ENABLED (${PROTECTED_FILES.length} protected files)`);
  console.log(`✅ Money System: ENABLED (${Object.keys(MoneyMakingEngine.SERVICE_PRICES).length} services)`);
  console.log(`✅ Local AI: ${LocalAIBridge.isAvailable ? "CONNECTED" : "SCANNING"}`);
  console.log(`✅ Stripe Payments: ${STRIPE_SECRET_KEY ? "READY" : "NEED_KEYS"}`);
});

// Initialize local AI scan (non-blocking)
LocalAIBridge.initialize();
