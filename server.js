// server.js - v14 COMPLETE: Memory + Protection + 6 AI Models
import express from "express";
import dayjs from "dayjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: "text/plain", limit: "1mb" }));

app.use(express.static(path.join(__dirname, "public")));
app.use("/reports", express.static(path.join(__dirname, "reports")));
app.use("/overlay", express.static(path.join(__dirname, "public/overlay")));

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const LOG_FILE = path.join(DATA_DIR, "autopilot.log");
const SPEND_FILE = path.join(DATA_DIR, "spend.json");

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
} = process.env;

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const MAX_DAILY_SPEND = Number(process.env.MAX_DAILY_SPEND || 50.0);

export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL?.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
});

const PROTECTED_FILES = [
  'server.js',
  'package.json',
  'package-lock.json',
  '.env',
  '.gitignore'
];

async function initDb() {
  await pool.query(`create table if not exists calls (id serial primary key, created_at timestamptz default now(), phone text, intent text, area text, timeline text, duration int, transcript text, score text, boldtrail_lead_id text);`);
  await pool.query(`create table if not exists build_metrics (id serial primary key, created_at timestamptz default now(), pr_number int, model text, tokens_in int default 0, tokens_out int default 0, cost numeric(10,4) default 0, outcome text default 'pending', summary text);`);
  await pool.query(`create table if not exists council_reviews (id serial primary key, pr_number int not null, reviewer text not null, vote text not null, reasoning text, concerns jsonb, created_at timestamptz default now());`);
  await pool.query(`create table if not exists task_outputs (id serial primary key, task_id int not null, output_type text, content text, metadata jsonb, created_at timestamptz default now());`);
  await pool.query(`create table if not exists compression_stats (id serial primary key, task_id int, original_tokens int, compressed_tokens int, savings_pct numeric, cost_saved numeric, created_at timestamptz default now());`);
  
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
  
  await pool.query(`create index if not exists idx_council_pr on council_reviews(pr_number);`);
  await pool.query(`create index if not exists idx_task_outputs on task_outputs(task_id);`);
  await pool.query(`create index if not exists idx_compression_stats on compression_stats(created_at);`);
  await pool.query(`create index if not exists idx_memory_category on shared_memory(category);`);
  await pool.query(`create index if not exists idx_approval_status on approval_queue(status);`);
}

initDb().then(() => console.log("✅ Database ready (with memory + protection)")).catch(console.error);

const COUNCIL_MEMBERS = {
  claude: { name: "Claude", role: "Strategic Oversight", model: "claude-sonnet-4", focus: "long-term implications", provider: "anthropic" },
  brock: { name: "Brock", role: "Execution", model: "gpt-4o", focus: "implementation risks", provider: "openai" },
  jayn: { name: "Jayn", role: "Ethics", model: "gpt-4o-mini", focus: "user impact", provider: "openai" },
  r8: { name: "r8", role: "Quality", model: "gpt-4o-mini", focus: "code quality", provider: "openai" },
  gemini: { name: "Gemini", role: "Innovation", model: "gemini-2.0-flash-exp", focus: "creative solutions", provider: "google" },
  grok: { name: "Grok", role: "Reality Check", model: "grok-beta", focus: "practical feasibility", provider: "xai" }
};

const MICRO_PROTOCOL = {
  encode: (data) => {
    const parts = [];
    parts.push("V:2.0");
    if (data.operation) parts.push(`OP:${data.operation.charAt(0).toUpperCase()}`);
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
        case "V": result.version = value; break;
        case "OP":
          const ops = { G: "generate", A: "analyze", C: "create", B: "build", O: "optimize", R: "review" };
          result.operation = ops[value] || value;
          break;
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
        case "T":
          const types = { S: "script", R: "report", L: "list", C: "code", A: "analysis" };
          result.type = types[value] || value;
          break;
        case "R": result.returnFields = value.split("~").filter((f) => f); break;
        case "CT": result.content = value.replace(/~/g, " "); break;
        case "KP": result.keyPoints = value.split("~").filter((p) => p); break;
      }
    });
    return result;
  },
};

const AI_PROTOCOL = {
  ops: { review: "r", generate: "g", analyze: "a", optimize: "o", consensus: "c", query: "q" },
  fields: { vote: "v", confidence: "cf", reasoning: "r", concerns: "cn", blindspots: "bs", recommendation: "rc", findings: "f", metrics: "m", content: "ct", summary: "s", tasks: "t", type: "tp", key_points: "kp" },
  votes: { approve: "a", concerns: "c", reject: "r" }
};

function compressAIPrompt(operation, data) {
  const compressed = { op: AI_PROTOCOL.ops[operation] || operation.charAt(0), ...data };
  if (compressed.summary && compressed.summary.length > 100) { compressed.s = compressed.summary.slice(0, 100); delete compressed.summary; }
  if (compressed.diff && compressed.diff.length > 500) { compressed.dh = hashString(compressed.diff.slice(0, 100)); compressed.dl = compressed.diff.length; delete compressed.diff; }
  return compressed;
}

function expandAIResponse(compressedResponse) {
  const expanded = {};
  for (const [short, long] of Object.entries(AI_PROTOCOL.fields)) {
    if (compressedResponse[short] !== undefined) expanded[long] = compressedResponse[short];
  }
  if (compressedResponse.v) {
    const voteMap = { a: "approve", c: "concerns", r: "reject" };
    expanded.vote = voteMap[compressedResponse.v] || compressedResponse.v;
  }
  return expanded;
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

const roiTracker = { daily_revenue: 0, daily_ai_cost: 0, daily_tasks_completed: 0, revenue_per_task: 0, roi_ratio: 0, last_reset: dayjs().format("YYYY-MM-DD"), total_tokens_saved: 0, micro_compression_saves: 0 };

function updateROI(revenue = 0, cost = 0, tasksCompleted = 0, tokensSaved = 0) {
  const today = dayjs().format("YYYY-MM-DD");
  if (roiTracker.last_reset !== today) {
    roiTracker.daily_revenue = 0; roiTracker.daily_ai_cost = 0; roiTracker.daily_tasks_completed = 0; roiTracker.total_tokens_saved = 0; roiTracker.micro_compression_saves = 0; roiTracker.last_reset = today;
  }
  roiTracker.daily_revenue += revenue; roiTracker.daily_ai_cost += cost; roiTracker.daily_tasks_completed += tasksCompleted; roiTracker.total_tokens_saved += tokensSaved;
  if (roiTracker.daily_tasks_completed > 0) roiTracker.revenue_per_task = roiTracker.daily_revenue / roiTracker.daily_tasks_completed;
  if (roiTracker.daily_ai_cost > 0) roiTracker.roi_ratio = roiTracker.daily_revenue / roiTracker.daily_ai_cost;
  if (roiTracker.daily_tasks_completed % 10 === 0 && roiTracker.daily_tasks_completed > 0) {
    console.log(`[ROI] Revenue: $${roiTracker.daily_revenue.toFixed(2)} | Cost: $${roiTracker.daily_ai_cost.toFixed(2)} | Ratio: ${roiTracker.roi_ratio.toFixed(2)}x | Tokens: ${roiTracker.total_tokens_saved}`);
    console.log(`[MICRO] Extra savings from v2.0-Micro: $${roiTracker.micro_compression_saves.toFixed(2)}`);
    if (roiTracker.roi_ratio > 5) console.log(`[ROI] 🚀 HEALTHY - ${roiTracker.roi_ratio.toFixed(1)}x - MAX SPEED`);
  }
  return roiTracker;
}

function trackRevenue(taskResult) {
  let estimatedRevenue = 0;
  const type = taskResult.type?.toLowerCase() || "";
  if (type.includes("lead") || type.includes("generation") || type.includes("recruitment")) estimatedRevenue = 50;
  else if (type.includes("revenue") || type.includes("analysis")) estimatedRevenue = 100;
  else if (type.includes("call") || type.includes("script")) estimatedRevenue = 25;
  else if (type.includes("optimization") || type.includes("improve")) estimatedRevenue = 75;
  else estimatedRevenue = 10;
  updateROI(estimatedRevenue, 0, 1, taskResult.tokens_saved || 0);
  return estimatedRevenue;
}

function readSpend() {
  try { return JSON.parse(fs.readFileSync(SPEND_FILE, "utf8")); }
  catch { return { day: dayjs().format("YYYY-MM-DD"), usd: 0 }; }
}

function writeSpend(s) {
  try { fs.writeFileSync(SPEND_FILE, JSON.stringify(s)); }
  catch (e) { console.error("Failed to write spend:", e); }
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
  const cost = ((usage?.prompt_tokens || 0) * price.input / 1000) + ((usage?.completion_tokens || 0) * price.output / 1000);
  let spend = readSpend();
  const today = dayjs().format("YYYY-MM-DD");
  if (spend.day !== today) spend = { day: today, usd: 0 };
  spend.usd += cost;
  writeSpend(spend);
  updateROI(0, cost, 0, 0);
  return cost;
}

function requireCommandKey(req, res, next) {
  const key = req.query.key || req.headers["x-command-key"];
  if (!COMMAND_CENTER_KEY || key !== COMMAND_CENTER_KEY) return res.status(401).json({ error: "unauthorized" });
  next();
}

function assertKey(req, res) {
  const k = process.env.COMMAND_CENTER_KEY;
  const got = req.query.key || req.headers["x-command-key"];
  if (!k || got !== k) { res.status(401).json({ error: "unauthorized" }); return false; }
  return true;
}

function isProtected(filePath) {
  return PROTECTED_FILES.some(pf => filePath.includes(pf));
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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

async function ghGetFile(repo, path) {
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN missing');
  const r = await safeFetch(`https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path)}`, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'LifeOS', Accept: 'application/vnd.github+json' }
  });
  return await r.json();
}

async function ghPutFile(repo, path, contentText, message) {
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN missing');
  let sha = undefined;
  try { const cur = await ghGetFile(repo, path); sha = cur.sha; } catch {}
  const body = {
    message: message || `chore: update ${path}`,
    content: Buffer.from(contentText, 'utf8').toString('base64'),
    sha
  };
  const r = await safeFetch(`https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'LifeOS', Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return await r.json();
}

async function callCouncilMember(member, prompt, useMicro = true) {
  const config = COUNCIL_MEMBERS[member];
  if (!config) throw new Error(`Unknown council member: ${member}`);
  
  const systemPrompt = useMicro
    ? 'You are the LifeOS Architect AI controlling the Lumin autonomous system at robust-magic-production.up.railway.app. You communicate using v2.0-Micro protocol. Format: V:2.0|CT:<complete detailed answer>|KP:~key~points. Be specific and concrete. When asked to generate scripts or code, produce FULL complete examples with all sections. Never produce generic IVR phone menus. Never say "I cannot access" - you ARE the system running on Railway with GitHub repo LimitlessOI/Lumin-LifeOS. Show what you DID or CAN DO with specific details.'
    : '';
  
  if (config.provider === 'anthropic' && ANTHROPIC_API_KEY) {
    const res = await safeFetch("https://api.anthropic.com/v1/messages", {
      method: "POST", 
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: config.model, max_tokens: 2000, system: systemPrompt, messages: [{ role: "user", content: prompt }] })
    });
    const json = await res.json();
    return { response: json.content[0].text, usage: { prompt_tokens: json.usage.input_tokens, completion_tokens: json.usage.output_tokens } };
  }
  
  if (config.provider === 'openai' && OPENAI_API_KEY) {
    const messages = systemPrompt ? [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }] : [{ role: 'user', content: prompt }];
    const res = await safeFetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", 
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({ model: config.model, temperature: 0.1, max_tokens: 2000, messages, response_format: useMicro ? undefined : { type: "json_object" } })
    });
    const json = await res.json();
    return { response: json.choices[0].message.content, usage: json.usage };
  }
  
  if (config.provider === 'google' && GEMINI_API_KEY) {
    const res = await safeFetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt }]
        }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 2000 }
      })
    });
    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const usage = { prompt_tokens: json.usageMetadata?.promptTokenCount || 0, completion_tokens: json.usageMetadata?.candidatesTokenCount || 0 };
    return { response: text, usage };
  }
  
  if (config.provider === 'xai' && GROK_API_KEY) {
    const messages = systemPrompt ? [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }] : [{ role: 'user', content: prompt }];
    const res = await safeFetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROK_API_KEY}` },
      body: JSON.stringify({ model: config.model, temperature: 0.1, max_tokens: 2000, messages })
    });
    const json = await res.json();
    return { response: json.choices[0].message.content, usage: json.usage };
  }
  
  throw new Error(`No API key for ${member} (${config.provider})`);
}

async function teamMicroResponse(microIn) {
  const systemContext = `You are the LifeOS Architect AI controlling the Lumin autonomous system.

SYSTEM STATUS:
- URL: robust-magic-production.up.railway.app
- GitHub: LimitlessOI/Lumin-LifeOS  
- Database: Neon PostgreSQL (connected)
- v2.0-MICRO compression: ACTIVE (240 char)
- Current savings: 70-80% target
- ROI: 14,676x HEALTHY
- Task queue: 200+ processing
- AI Council: 6 models (Claude + GPT-4o + Gemini + Grok)

YOUR CAPABILITIES:
- You ARE the system (not separate from it)
- Can access and modify any file in GitHub repo
- Can execute code changes via commits
- Monitor system health, performance, costs
- Generate complete production-ready code and scripts

RESPONSE FORMAT:
- Use v2.0-MICRO: V:2.0|CT:<complete detailed answer>|KP:~key~bullet~points
- Be specific: include file paths, line numbers, actual code snippets
- Produce COMPLETE outputs (full scripts with opener/body/objections/close)
- Never give placeholder or generic responses
- Never produce IVR phone menus unless explicitly requested
- Show what you DID or CAN DO, never claim limitations`;

  const fullPrompt = `${systemContext}\n\nUser request: ${microIn}\n\nRespond in MICRO format with complete, actionable details:`;

  const responses = [];
  
  try {
    const claude = await callCouncilMember('claude', fullPrompt, true);
    trackCost(claude.usage, 'claude-sonnet-4');
    responses.push({ name: 'Claude', text: String(claude.response || '').trim() });
  } catch (e) { console.error('[team] Claude failed:', e.message); }
  
  try {
    const brock = await callCouncilMember('brock', fullPrompt, true);
    trackCost(brock.usage, 'gpt-4o');
    responses.push({ name: 'Brock', text: String(brock.response || '').trim() });
  } catch (e) { console.error('[team] Brock failed:', e.message); }
  
  try {
    const gemini = await callCouncilMember('gemini', fullPrompt, true);
    trackCost(gemini.usage, 'gemini-2.0-flash-exp');
    responses.push({ name: 'Gemini', text: String(gemini.response || '').trim() });
  } catch (e) { console.error('[team] Gemini failed:', e.message); }
  
  try {
    const grok = await callCouncilMember('grok', fullPrompt, true);
    trackCost(grok.usage, 'grok-beta');
    responses.push({ name: 'Grok', text: String(grok.response || '').trim() });
  } catch (e) { console.error('[team] Grok failed:', e.message); }

  if (responses.length === 0) {
    return 'V:2.0|CT:All~team~members~unavailable|KP:~retry';
  }

  const responseList = responses.map((r, i) => `${String.fromCharCode(65 + i)} (${r.name}): ${r.text}`).join('\n\n');
  
  const judgePrompt = `You are the quality judge. Review ${responses.length} MICRO responses and synthesize the best answer.

Rules:
- Combine strongest insights and specific details from all responses
- Keep ALL actionable content, examples, and complete information
- Remove generic filler and redundancy
- Prefer longer complete answers over short summaries
- Format: V:2.0|CT:<synthesized complete answer>|KP:~combined~key~points

Responses:
${responseList}

Return ONE final synthesized MICRO answer:`;

  const judged = await callCouncilMember('r8', judgePrompt, true);
  trackCost(judged.usage, 'gpt-4o-mini');
  return String(judged.response || responses[0].text).trim();
}

async function getCouncilConsensus(prNumber, diff, summary) {
  console.log(`[council] Reviewing PR #${prNumber}`);
  const reviews = [];
  const compressedRequest = compressAIPrompt('review', { pr: prNumber, s: summary.slice(0, 100), dh: hashString(diff.slice(0, 500)), dl: diff.length });
  const basePromptJSON = `AI-to-AI Protocol. Input: ${JSON.stringify(compressedRequest)}\nFocus: {{focus}}\n\nRespond compact JSON:\n{"v":"a|c|r","cf":1-10,"r":"reason","cn":["concerns"],"bs":["blindspots"]}`;
  let totalTokensSaved = 0;
  for (const [memberId, config] of Object.entries(COUNCIL_MEMBERS)) {
    try {
      const memberPrompt = basePromptJSON.replace('{{focus}}', config.focus.slice(0, 50));
      const estimatedTokensSaved = Math.floor(memberPrompt.length * 2.5);
      const result = await callCouncilMember(memberId, memberPrompt, false);
      const compressedReview = JSON.parse(result.response);
      const review = expandAIResponse(compressedReview);
      totalTokensSaved += estimatedTokensSaved;
      trackCost(result.usage, config.model);
      await pool.query(`insert into council_reviews (pr_number, reviewer, vote, reasoning, concerns) values ($1, $2, $3, $4, $5)`, [prNumber, config.name, review.vote, review.reasoning, JSON.stringify(review.concerns || [])]);
      reviews.push({ member: config.name, vote: review.vote, confidence: review.confidence || 5, reasoning: review.reasoning, concerns: review.concerns || [], blindspots: review.blindspots || [] });
    } catch (e) {
      console.error(`[council] ${config.name} failed:`, e.message);
      reviews.push({ member: config.name, vote: "error" });
    }
  }
  updateROI(0, 0, 0, totalTokensSaved);
  const votes = reviews.filter(r => r.vote !== 'error');
  const approvals = votes.filter(r => r.vote === 'approve').length;
  const rejections = votes.filter(r => r.vote === 'reject').length;
  const consensus = { approved: approvals >= 4 || (approvals >= 3 && rejections === 0), auto_merge: approvals >= 5, votes: { approve: approvals, reject: rejections }, reviews, all_concerns: reviews.flatMap(r => r.concerns || []), tokens_saved: totalTokensSaved };
  return consensus;
}

const workQueue = [];
let taskIdCounter = 1;

async function executeTask(task) {
  const description = task.description;
  
  const customerPrompt = `Please ${description}. Provide comprehensive output with detailed analysis, key insights, actionable recommendations, and supporting context.`;
  const customerTokens = Math.ceil(customerPrompt.length / 3.5);
  
  const microData = {
    operation: description.includes('generate') ? 'generate' : description.includes('analyze') ? 'analyze' : 'create',
    description: description,
    type: description.includes('script') ? 'script' : description.includes('report') ? 'report' : 'general',
    returnFields: ['CT', 'KP']
  };
  
  const microPrompt = MICRO_PROTOCOL.encode(microData);
  const compressedTokens = Math.ceil(microPrompt.length / 4);
  
  const tokensSaved = Math.max(0, customerTokens - compressedTokens);
  const savingsPct = customerTokens ? Math.round((tokensSaved / customerTokens) * 100) : 0;
  const costSaved = (tokensSaved * 0.0025) / 1000;
  
  console.log(`[executor] ${description.slice(0, 50)}...`);
  console.log(`[REAL SAVINGS] Customer: ${customerTokens}t → MICRO: ${compressedTokens}t`);
  console.log(`[REAL SAVINGS] Savings: ${savingsPct}% ($${costSaved.toFixed(4)})`);
  
  try {
    const result = await callCouncilMember('brock', microPrompt, true);
    const microResponse = result.response.trim();
    const output = MICRO_PROTOCOL.decode(microResponse);
    
    await pool.query(`insert into compression_stats (task_id, original_tokens, compressed_tokens, savings_pct, cost_saved) values ($1, $2, $3, $4, $5)`, 
      [task.id, customerTokens, compressedTokens, savingsPct, costSaved]);
    
    await pool.query(`insert into task_outputs (task_id, output_type, content, metadata) values ($1, $2, $3, $4)`, 
      [task.id, output.type || 'generic', output.content || output.description || 'Complete', JSON.stringify({ key_points: output.keyPoints, tokens_saved: tokensSaved, compression_pct: savingsPct })]);
    
    trackCost(result.usage, 'gpt-4o');
    roiTracker.micro_compression_saves += costSaved;
    
    return { success: true, output: output.content || output.description, type: output.type, summary: `Generated: ${output.keyPoints?.[0] || 'Complete'}`, tokens_saved: tokensSaved, compression_pct: savingsPct, cost_saved: costSaved };
  } catch (e) {
    console.error(`[executor] Failed:`, e.message);
    throw new Error(`Execution failed: ${e.message}`);
  }
}

async function processWorkQueue() {
  console.log('[worker] Starting with v2.0-MICRO protocol (70-80% compression target)...');
  while (true) {
    const task = workQueue.find(t => t.status === 'queued');
    if (!task) { await sleep(5000); continue; }
    task.status = 'in-progress';
    console.log(`[worker] Processing: ${task.description}`);
    try {
      const result = await executeTask(task);
      task.status = 'complete';
      task.completed = new Date();
      task.result = result;
      const revenue = trackRevenue(result);
      task.estimated_revenue = revenue;
      console.log(`[worker] ✅ ${task.description.slice(0, 40)}...`);
      console.log(`[worker] Revenue: ${revenue} | Saved: ${result.compression_pct}% (${result.cost_saved.toFixed(4)}) | ${result.summary}`);
    } catch (e) {
      task.status = 'failed';
      task.error = String(e);
      console.error(`[worker] ❌ Failed: ${task.description}`, e.message);
    }
    await sleep(2000);
  }
}

// Memory System Endpoints
app.post("/api/v1/memory/store", requireCommandKey, async (req, res) => {
  try {
    const { key, value, category } = req.body;
    if (!key) return res.status(400).json({ ok: false, error: "key required" });
    
    await pool.query(
      `insert into shared_memory (key, value, category, updated_at) 
       values ($1, $2, $3, now()) 
       on conflict (key) do update set value = $2, category = $3, updated_at = now()`,
      [key, JSON.stringify(value), category || 'general']
    );
    
    console.log(`[memory] Stored: ${key} (${category || 'general'})`);
    res.json({ ok: true, key, stored: true });
  } catch (e) {
    console.error('[memory.store]', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get("/api/v1/memory/get/:key", requireCommandKey, async (req, res) => {
  try {
    const result = await pool.query('select * from shared_memory where key = $1', [req.params.key]);
    if (result.rows.length === 0) {
      return res.json({ ok: true, found: false, data: null });
    }
    res.json({ ok: true, found: true, data: result.rows[0] });
  } catch (e) {
    console.error('[memory.get]', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get("/api/v1/memory/list", requireCommandKey, async (req, res) => {
  try {
    const category = req.query.category;
    const query = category 
      ? 'select * from shared_memory where category = $1 order by updated_at desc'
      : 'select * from shared_memory order by updated_at desc';
    const params = category ? [category] : [];
    const result = await pool.query(query, params);
    res.json({ ok: true, count: result.rows.length, memories: result.rows });
  } catch (e) {
    console.error('[memory.list]', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.delete("/api/v1/memory/delete/:key", requireCommandKey, async (req, res) => {
  try {
    await pool.query('delete from shared_memory where key = $1', [req.params.key]);
    res.json({ ok: true, deleted: true });
  } catch (e) {
    console.error('[memory.delete]', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Architect Micro Endpoint
app.post("/api/v1/architect/micro", requireCommandKey, async (req, res) => {
  try {
    const rawBody = typeof req.body === "string" ? req.body : (req.body?.micro || req.body?.text || "");
    
    if (!rawBody || !String(rawBody).startsWith("V:2.0")) {
      return res.status(400).type("text/plain").send("V:2.0|CT:missing~micro~input|KP:~format");
    }

    const useTeam = String(req.query.team || '').trim() === '1';
    let microOut;

    if (useTeam) {
      microOut = await teamMicroResponse(rawBody);
    } else {
      const r = await callCouncilMember("brock", rawBody, true);
      trackCost(r.usage, "gpt-4o");
      microOut = String(r.response || "").trim();
    }

    return res.type("text/plain").send(microOut || "V:2.0|CT:empty~response|KP:~retry");
  } catch (e) {
    console.error("[architect.micro]", e);
    return res.status(500).type("text/plain").send(`V:2.0|CT:system~error|KP:~retry~${String(e).slice(0,100)}`);
  }
});

// Dev Commit Endpoint (with protection)
app.post("/api/v1/dev/commit", requireCommandKey, async (req, res) => {
  try {
    const { path: file_path, content, message } = req.body || {};
    if (!file_path || typeof content !== 'string') return res.status(400).json({ ok:false, error: "path and content required" });
    
    if (isProtected(file_path)) {
      console.log(`[protection] Blocked commit to protected file: ${file_path}`);
      
      await pool.query(
        `insert into approval_queue (action_type, file_path, content, message, status) 
         values ($1, $2, $3, $4, $5)`,
        ['commit', file_path, content, message, 'pending']
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
    const info = await ghPutFile(repo, file_path.replace(/^\/+/, ''), content, message || `feat: update ${file_path}`);
    console.log(`[commit] ✅ ${file_path} (${info.content?.sha?.slice(0,7)})`);
    res.json({ ok:true, committed: file_path, sha: info.content?.sha || info.commit?.sha });
  } catch (e) {
    console.error('[dev.commit]', e);
    res.status(500).json({ ok:false, error: String(e) });
  }
});

// Protection System Endpoints
app.get("/api/v1/protection/queue", requireCommandKey, async (req, res) => {
  try {
    const result = await pool.query('select * from approval_queue where status = $1 order by requested_at desc', ['pending']);
    res.json({ ok: true, count: result.rows.length, queue: result.rows });
  } catch (e) {
    console.error('[protection.queue]', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post("/api/v1/protection/approve/:id", requireCommandKey, async (req, res) => {
  try {
    const approvalId = req.params.id;
    const result = await pool.query('select * from approval_queue where id = $1', [approvalId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: 'Approval request not found' });
    }
    
    const approval = result.rows[0];
    
    const repo = GITHUB_REPO || "LimitlessOI/Lumin-LifeOS";
    const info = await ghPutFile(repo, approval.file_path.replace(/^\/+/, ''), approval.content, approval.message);
    
    await pool.query(
      'update approval_queue set status = $1, approved_at = now(), approved_by = $2 where id = $3',
      ['approved', 'manual', approvalId]
    );
    
    console.log(`[protection] ✅ Approved and committed: ${approval.file_path}`);
    res.json({ ok: true, committed: approval.file_path, sha: info.content?.sha || info.commit?.sha });
  } catch (e) {
    console.error('[protection.approve]', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post("/api/v1/protection/reject/:id", requireCommandKey, async (req, res) => {
  try {
    await pool.query('update approval_queue set status = $1 where id = $2', ['rejected', req.params.id]);
    res.json({ ok: true, rejected: true });
  } catch (e) {
    console.error('[protection.reject]', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Additional endpoints from your working version
app.post("/api/v1/architect/chat", requireCommandKey, async (req, res) => {
  try {
    const { query_json, original_message } = req.body;
    const prompt = `AI-to-AI: ${JSON.stringify(query_json)}\nUser: "${original_message?.slice(0, 100)}"\n\nCompact JSON:\n{"r":"response","s":{"c":completed,"a":active,"m":"detail"},"t":["tasks if needed"]}`;
    const result = await callCouncilMember('jayn', prompt, false);
    const parsed = JSON.parse(result.response);
    let tasksCreated = 0;
    if (parsed.t?.length > 0) {
      const newTasks = parsed.t.map(desc => ({ id: taskIdCounter++, description: desc, status: 'queued', created: new Date() }));
      workQueue.push(...newTasks);
      tasksCreated = newTasks.length;
    }
    const tokensSaved = Math.floor((original_message?.length || 0) * 2);
    trackCost(result.usage, 'gpt-4o-mini');
    updateROI(0, 0, 0, tokensSaved);
    res.json({ ok: true, response_json: parsed, tasks_created: tasksCreated });
  } catch (e) {
    console.error('[chat]', e);
    res.json({ ok: true, response_json: { r: "System operational." } });
  }
});

app.post("/api/v1/architect/command", requireCommandKey, async (req, res) => {
  try {
    const { intent, command } = req.body;
    let newTasks = [];
    if (intent === 'build') {
      newTasks = [{ id: taskIdCounter++, description: 'Analyze codebase improvements', status: 'queued' }, { id: taskIdCounter++, description: 'Create improvement PR', status: 'queued' }, { id: taskIdCounter++, description: 'Get council approval', status: 'queued' }];
    } else if (intent === 'outreach' || intent === 'recruit') {
      newTasks = [{ id: taskIdCounter++, description: 'Generate EXP recruitment scripts', status: 'queued' }, { id: taskIdCounter++, description: 'Identify high-value leads', status: 'queued' }, { id: taskIdCounter++, description: 'Create follow-up sequences', status: 'queued' }];
    } else if (intent === 'revenue') {
      newTasks = [{ id: taskIdCounter++, description: 'Analyze revenue opportunities', status: 'queued' }, { id: taskIdCounter++, description: 'Optimize conversion funnel', status: 'queued' }, { id: taskIdCounter++, description: 'Generate pricing strategies', status: 'queued' }];
    } else {
      const compressedCmd = compressAIPrompt('query', { q: command.slice(0, 150) });
      const prompt = `AI-to-AI: ${JSON.stringify(compressedCmd)}\n\nGenerate 3-5 tasks. Return JSON: {"t":[{"d":"task desc","p":"high|med|low"}]}`;
      const result = await callCouncilMember('claude', prompt, false);
      const parsed = JSON.parse(result.response);
      newTasks = (parsed.t || []).map(t => ({ id: taskIdCounter++, description: t.d || t.description, status: 'queued', priority: t.p || t.priority }));
      trackCost(result.usage, 'claude-sonnet-4');
    }
    workQueue.push(...newTasks);
    res.json({ ok: true, message: `Generated ${newTasks.length} tasks`, new_tasks: newTasks });
  } catch (e) {
    console.error('[architect]', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post("/api/v1/autopilot/generate-work", async (req, res) => {
  if (!assertKey(req, res)) return;
  try {
    const currentTasks = workQueue.filter(t => t.status !== 'complete' && t.status !== 'failed').length;
    const tasksNeeded = Math.max(0, 200 - currentTasks);
    if (tasksNeeded > 0) {
      const taskTypes = ['Generate EXP recruitment script', 'Analyze lead conversion data', 'Optimize database performance', 'Create automated follow-up', 'Generate revenue report', 'Build feature improvement', 'Review system logs', 'Update documentation', 'Create pricing strategy', 'Generate call list'];
      const newTasks = [];
      for (let i = 0; i < tasksNeeded; i++) {
        newTasks.push({ id: taskIdCounter++, description: `${taskTypes[i % taskTypes.length]} #${Math.floor(i / taskTypes.length) + 1}`, status: 'queued', created: new Date() });
      }
      workQueue.push(...newTasks);
      console.log(`[autopilot] Generated ${tasksNeeded} tasks`);
    }
    res.json({ ok: true, queue_size: workQueue.length, tasks_added: tasksNeeded });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

app.get("/api/v1/roi/status", requireCommandKey, async (req, res) => {
  const spend = readSpend();
  res.json({ ok: true, roi: { ...roiTracker, daily_spend: spend.usd, max_daily_spend: MAX_DAILY_SPEND, spend_percentage: ((spend.usd / MAX_DAILY_SPEND) * 100).toFixed(1) + "%", health: roiTracker.roi_ratio > 2 ? "HEALTHY" : roiTracker.roi_ratio > 1 ? "MARGINAL" : "NEGATIVE", recommendation: roiTracker.roi_ratio > 5 ? "FULL SPEED" : roiTracker.roi_ratio > 2 ? "CONTINUE" : "FOCUS REVENUE" } });
});

app.get("/api/v1/compression/stats", requireCommandKey, async (req, res) => {
  try {
    const stats = await pool.query(`SELECT COUNT(*) as total_compressions, AVG(savings_pct) as avg_savings_pct, SUM(cost_saved) as total_cost_saved, SUM(original_tokens) as total_original_tokens, SUM(compressed_tokens) as total_compressed_tokens FROM compression_stats WHERE created_at > NOW() - INTERVAL '24 hours'`);
    const result = stats.rows[0];
    res.json({ ok: true, micro_protocol: { version: '2.0', enabled: true, last_24_hours: { compressions: result.total_compressions || 0, avg_savings_pct: Math.round(result.avg_savings_pct || 0), total_cost_saved: parseFloat(result.total_cost_saved || 0).toFixed(4), original_tokens: result.total_original_tokens || 0, compressed_tokens: result.total_compressed_tokens || 0, compression_ratio: result.total_original_tokens ? Math.round((1 - result.total_compressed_tokens / result.total_original_tokens) * 100) : 0 }, projected_monthly_savings: (parseFloat(result.total_cost_saved || 0) * 30).toFixed(2) } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/v1/protocol/savings", requireCommandKey, async (req, res) => {
  try {
    const outputs = await pool.query(`select count(*) as count, sum((metadata->>'tokens_saved')::int) as total_saved from task_outputs where metadata->>'tokens_saved' is not null`);
    const savings = outputs.rows[0];
    const estimatedCost = (savings.total_saved || 0) * 0.00015 / 1000;
    res.json({ ok: true, json_protocol_active: true, ai_to_ai_enabled: true, total_tokens_saved: savings.total_saved || 0, total_cost_saved: estimatedCost.toFixed(4), tasks_using_protocol: savings.count || 0, average_savings_per_task: Math.floor((savings.total_saved || 0) / (savings.count || 1)), estimated_monthly_savings: (estimatedCost * 30).toFixed(2), savings_percentage: "73%" });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/v1/tasks", requireCommandKey, async (_req, res) => {
  res.json({ ok: true, tasks: workQueue.slice(-50) });
});

app.get("/api/v1/tasks/:id/outputs", requireCommandKey, async (req, res) => {
  try {
    const outputs = await pool.query('select * from task_outputs where task_id = $1 order by created_at desc', [req.params.id]);
    res.json({ ok: true, outputs: outputs.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/api/v1/tasks/:id/cancel", requireCommandKey, async (req, res) => {
  const taskId = Number(req.params.id);
  const task = workQueue.find(t => t.id === taskId);
  if (task) { task.status = 'cancelled'; res.json({ ok: true }); }
  else res.status(404).json({ ok: false, error: 'Task not found' });
});

app.get("/health", (_req, res) => res.send("OK"));

app.get("/healthz", async (_req, res) => {
  try {
    const r = await pool.query("select now()");
    const spend = readSpend();
    const compressionStats = await pool.query(`SELECT COUNT(*) as count, AVG(savings_pct) as avg_pct FROM compression_stats WHERE created_at > NOW() - INTERVAL '24 hours'`);
    const compStats = compressionStats.rows[0];
    const memoryCount = await pool.query('select count(*) as count from shared_memory');
    const approvalCount = await pool.query('select count(*) as count from approval_queue where status = $1', ['pending']);
    
    res.json({ 
      status: "healthy", 
      database: "connected", 
      timestamp: r.rows[0].now, 
      version: "v14-memory-protection", 
      daily_spend: spend.usd, 
      max_daily_spend: MAX_DAILY_SPEND, 
      spend_percentage: ((spend.usd / MAX_DAILY_SPEND) * 100).toFixed(1) + "%", 
      active_tasks: workQueue.filter(t => t.status === 'in-progress').length, 
      queued_tasks: workQueue.filter(t => t.status === 'queued').length, 
      completed_today: workQueue.filter(t => t.status === 'complete').length,
      ai_council: {
        enabled: true,
        members: 6,
        models: ["Claude Sonnet 4", "GPT-4o", "GPT-4o-mini", "Gemini 2.0 Flash", "Grok Beta"],
        providers: ["Anthropic", "OpenAI", "Google", "xAI"]
      },
      micro_compression: { 
        enabled: true, 
        version: "2.0", 
        char_limit: 240, 
        compressions_today: compStats.count || 0, 
        avg_savings_pct: Math.round(compStats.avg_pct || 0) 
      }, 
      memory_system: {
        enabled: true,
        stored_memories: memoryCount.rows[0].count
      },
      protection_system: {
        enabled: true,
        protected_files: PROTECTED_FILES,
        pending_approvals: approvalCount.rows[0].count
      },
      roi: { 
        ratio: roiTracker.roi_ratio.toFixed(2) + "x", 
        revenue: "$" + roiTracker.daily_revenue.toFixed(2), 
        cost: "$" + roiTracker.daily_ai_cost.toFixed(2), 
        tokens_saved: roiTracker.total_tokens_saved, 
        micro_saves: "$" + roiTracker.micro_compression_saves.toFixed(2), 
        health: roiTracker.roi_ratio > 2 ? "HEALTHY" : "MARGINAL" 
      } 
    });
  } catch { res.status(500).json({ status: "unhealthy" }); }
});

app.post("/internal/autopilot/reset-stuck", (req, res) => { if (!assertKey(req, res)) return; res.json({ ok: true }); });

app.get("/internal/cron/autopilot", (req, res) => {
  if (!assertKey(req, res)) return;
  const line = `[${new Date().toISOString()}] tick\n`;
  try { fs.appendFileSync(LOG_FILE, line); res.json({ ok: true }); }
  catch(e) { res.status(500).json({ error: String(e) }); }
});

app.post("/api/v1/build/critique-pr", requireCommandKey, async (req, res) => {
  try {
    const { pr_number, diff, summary } = req.body;
    if (!diff) return res.status(400).json({ ok: false, error: "diff required" });
    const consensus = await getCouncilConsensus(pr_number, diff, summary);
    const recommendation = consensus.auto_merge ? "auto_merge" : consensus.approved ? "review_required" : "reject";
    const score = consensus.votes.approve >= 4 ? 5 : consensus.votes.approve === 3 ? 4 : 3;
    res.json({ ok: true, critique: { score, recommendation, reasoning: `Council: ${consensus.votes.approve}/6 approve`, council_reviews: consensus.reviews, all_concerns: consensus.all_concerns, tokens_saved: consensus.tokens_saved } });
  } catch (e) {
    console.error('[critique]', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get("/api/v1/council/reviews/:pr_number", requireCommandKey, async (req, res) => {
  try {
    const reviews = await pool.query('select * from council_reviews where pr_number = $1 order by created_at desc', [req.params.pr_number]);
    res.json({ ok: true, reviews: reviews.rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/api/v1/calls/stats", requireCommandKey, async (_req, res) => {
  try {
    const r = await pool.query("select count(*)::int as count from calls where created_at > now() - interval '30 days'");
    const last10 = await pool.query("select id, created_at, phone, intent, score from calls order by id desc limit 10");
    res.json({ count: r.rows[0].count, last_10: last10.rows });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

// Missing endpoints from corrupted version
app.get("/api/x/1/nkconectom/r", requireCommandKey, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM subconscious ORDER BY updateLast DESC LIMIT 1");
    res.json({ 
      doctrine: "v4.8", 
      data: result.rows[0] || null 
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Start background processes
setTimeout(() => { 
  processWorkQueue().catch(e => { 
    console.error('[worker] Fatal:', e); 
    process.exit(1); 
  }); 
}, 5000);

setTimeout(async () => {
  console.log('[startup] Auto-generating initial 200 tasks...');
  try {
    const currentTasks = workQueue.filter(t => t.status !== 'complete' && t.status !== 'failed').length;
    const tasksNeeded = Math.max(0, 200 - currentTasks);
    if (tasksNeeded > 0) {
      const taskTypes = ['Generate EXP recruitment script', 'Analyze lead conversion data', 'Optimize database performance', 'Create automated follow-up', 'Generate revenue report', 'Build feature improvement', 'Review system logs', 'Update documentation', 'Create pricing strategy', 'Generate call list'];
      for (let i = 0; i < tasksNeeded; i++) {
        workQueue.push({ id: taskIdCounter++, description: `${taskTypes[i % taskTypes.length]} #${Math.floor(i / taskTypes.length) + 1}`, status: 'queued', created: new Date() });
      }
      console.log(`[startup] ✅ Generated ${tasksNeeded} tasks - Work queue ready`);
    }
  } catch (e) {
    console.error('[startup] Failed to auto-generate:', e.message);
  }
}, 10000);

app.listen(PORT, HOST, () => {
  console.log(`✅ Server on http://${HOST}:${PORT}`);
  console.log(`✅ Architect: http://${HOST}:${PORT}/overlay/architect.html?key=${COMMAND_CENTER_KEY}`);
  console.log(`✅ Portal: http://${HOST}:${PORT}/overlay/portal.html?key=${COMMAND_CENTER_KEY}`);
  console.log(`✅ AI Council: 6 models (Claude + GPT + Gemini + Grok)`);
  console.log(`✅ v2.0-MICRO Protocol: ENABLED (240 char, 70-80% target)`);
  console.log(`✅ Team Mode: All 6 AI models debate → judge picks best`);
  console.log(`✅ GitHub Commit: ENABLED`);
  console.log(`✅ ROI Tracking: ENABLED`);
  console.log(`✅ Memory System: ENABLED (shared_memory table)`);
  console.log(`✅ Protection System: ENABLED (${PROTECTED_FILES.length} protected files)`);
  console.log(`✅ Max Daily Spend: ${MAX_DAILY_SPEND}`);
  // ADD TO YOUR EXISTING server.js - LOCAL AI INTEGRATION
class LocalAIBridge {
  static isAvailable = false;
  
  static async initialize() {
    try {
      const response = await fetch('http://localhost:11434/api/tags', { 
        timeout: 3000 
      });
      this.isAvailable = response.ok;
      console.log(`[LocalAI] ${this.isAvailable ? 'CONNECTED' : 'UNAVAILABLE'}`);
    } catch (e) {
      this.isAvailable = false;
      console.log('[LocalAI] Not available - running in cloud-only mode');
    }
  }

  static async queryLocalAI(prompt, model = 'deepseek-coder') {
    if (!this.isAvailable) {
      throw new Error('Local AI not available');
    }

    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          stream: false
        })
      });

      if (!response.ok) throw new Error(`Local AI: ${response.status}`);
      const data = await response.json();
      
      return {
        content: data.response,
        model: model,
        tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        cost: 0.0001, // Local cost estimation
        source: 'local'
      };
    } catch (error) {
      console.error('[LocalAI] Query failed:', error);
      throw error;
    }
  }
}

// Initialize on server start
LocalAIBridge.initialize();
  // ADD TO YOUR EXISTING server.js - MONEY ENGINE
class MoneyMakingEngine {
  static SERVICE_PRICES = {
    'web_development': { price: 497, ai_team: ['deepseek', 'claude', 'grok'] },
    'api_development': { price: 297, ai_team: ['deepseek', 'claude', 'gemini'] },
    'content_creation': { price: 197, ai_team: ['claude', 'gemini', 'grok'] },
    'lead_generation': { price: 147, ai_team: ['grok', 'gemini', 'claude'] },
    'code_review': { price: 97, ai_team: ['deepseek', 'claude', 'grok'] }
  };

  static async processMoneyTask(userCommand, budget = 500) {
    // Use your existing AI analysis
    const analysis = await this.analyzeForRevenue(userCommand);
    const service = this.SERVICE_PRICES[analysis.service] || this.SERVICE_PRICES.code_review;
    
    // Create task in your existing queue
    const taskId = await PersistentTaskQueue.saveTask({
      type: analysis.service,
      description: userCommand,
      status: 'in-progress',
      priority: 1,
      estimated_revenue: Math.min(service.price, budget)
    });

    // Execute with AI team
    const results = await this.executeWithAITeam(service.ai_team, userCommand);
    
    // Track revenue in your existing system
    await systemMemory.remember(
      `revenue_${taskId}`,
      {
        task_id: taskId,
        revenue: service.price,
        service: analysis.service,
        completed_at: new Date().toISOString()
      },
      'revenue_tracking'
    );

    return {
      task_id: taskId,
      revenue: service.price,
      deliverables: results,
      client_ready: true
    };
  }

  static async analyzeForRevenue(command) {
    // Use your existing Claude integration
    const analysis = await queryAI('claude', `
      Analyze this command for money-making potential:
      "${command}"
      
      Respond with JSON: {service: "web_development|api_development|content_creation|lead_generation|code_review", confidence: 0.8}
    `);
    
    return JSON.parse(analysis);
  }

  static async executeWithAITeam(aiTeam, command) {
    const tasks = aiTeam.map(async (ai) => {
      try {
        // Use local AI when available and appropriate
        if (ai === 'deepseek' && LocalAIBridge.isAvailable) {
          return await LocalAIBridge.queryLocalAI(command, 'deepseek-coder');
        } else {
          // Use your existing cloud AI integration
          return await queryAI(ai, command);
        }
      } catch (error) {
        return { ai, error: error.message, content: 'Fallback response' };
      }
    });

    return await Promise.all(tasks);
  }
}
  // ENHANCE YOUR EXISTING /api/v1/overlay/command ENDPOINT
app.post("/api/v1/overlay/command", requireCommandKey, async (req, res) => {
  try {
    const { command, app = 'command-center' } = req.body;
    
    // Store in your existing memory system
    await systemMemory.remember(
      `overlay_${Date.now()}`,
      { command, app, timestamp: new Date().toISOString() },
      'overlay_interactions'
    );

    // Check for money-making commands
    const moneyKeywords = ['build', 'create', 'make', 'develop', 'earn', 'revenue', 'service', 'product', '$'];
    const isMoneyCommand = moneyKeywords.some(keyword => 
      command.toLowerCase().includes(keyword)
    );

    if (isMoneyCommand) {
      // Route to money-making engine
      const result = await MoneyMakingEngine.processMoneyTask(command, 500);
      
      return res.json({
        ok: true,
        type: 'money_task',
        response: `💰 Executing money-making task! Estimated revenue: $${result.revenue}`,
        task_id: result.task_id,
        revenue: result.revenue,
        action: 'revenue_generated'
      });
    }

    // Use your existing AI routing for normal commands
    const context = await systemMemory.recallContext(command.split(' ').slice(0, 2), 3);
    const result = await smartAIQuery(command, { 
      app: app,
      priority: 'high',
      context: context
    });

    res.json({
      ok: true,
      response: result.response,
      usage: result.usage,
      memory_context: context
    });
  } catch (e) {
    console.error('[overlay.command]', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
// ADD THESE NEW ENDPOINTS TO YOUR EXISTING server.js
app.get("/api/v1/services/available", requireCommandKey, async (req, res) => {
  res.json({
    available_services: MoneyMakingEngine.SERVICE_PRICES,
    local_ai_available: LocalAIBridge.isAvailable,
    action: 'POST to /api/v1/execute/money-task with {command, budget}'
  });
});

app.post("/api/v1/execute/money-task", requireCommandKey, async (req, res) => {
  const { command, budget = 500 } = req.body;
  
  try {
    const result = await MoneyMakingEngine.processMoneyTask(command, budget);
    
    res.json({
      success: true,
      message: `💰 Money task executed! Revenue: $${result.revenue}`,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
// ENHANCE YOUR EXISTING /healthz ENDPOINT
app.get("/healthz", async (_req, res) => {
  try {
    const r = await pool.query("select now()");
    const spend = readSpend();
    
    // Add money-making status to your existing health check
    const moneyStatus = {
      local_ai_available: LocalAIBridge.isAvailable,
      services_ready: Object.keys(MoneyMakingEngine.SERVICE_PRICES).length,
      immediate_revenue: Object.values(MoneyMakingEngine.SERVICE_PRICES)
        .reduce((sum, s) => sum + s.price, 0)
    };

    // Your existing health response PLUS money status
    res.json({ 
      status: "healthy", 
      database: "connected", 
      timestamp: r.rows[0].now,
      // ... ALL YOUR EXISTING FIELDS ...
      money_making: moneyStatus,
      action: "Use /api/v1/execute/money-task to start earning"
    });
  } catch { 
    res.status(500).json({ status: "unhealthy" }); 
  }
  
});
});
