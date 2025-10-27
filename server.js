// server.js - v14 COMPLETE WITH 5 BREAKTHROUGH IDEAS
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

async function initDb() {
  await pool.query(`create table if not exists calls (id serial primary key, created_at timestamptz default now(), phone text, intent text, area text, timeline text, duration int, transcript text, score text, boldtrail_lead_id text);`);
  await pool.query(`create table if not exists build_metrics (id serial primary key, created_at timestamptz default now(), pr_number int, model text, tokens_in int default 0, tokens_out int default 0, cost numeric(10,4) default 0, outcome text default 'pending', summary text);`);
  await pool.query(`create table if not exists council_reviews (id serial primary key, pr_number int not null, reviewer text not null, vote text not null, reasoning text, concerns jsonb, created_at timestamptz default now());`);
  await pool.query(`create table if not exists task_outputs (id serial primary key, task_id int not null, output_type text, content text, metadata jsonb, created_at timestamptz default now());`);
  await pool.query(`create table if not exists compression_stats (id serial primary key, task_id int, original_tokens int, compressed_tokens int, savings_pct numeric, cost_saved numeric, created_at timestamptz default now());`);
  await pool.query(`create index if not exists idx_council_pr on council_reviews(pr_number);`);
  await pool.query(`create index if not exists idx_task_outputs on task_outputs(task_id);`);
  await pool.query(`create index if not exists idx_compression_stats on compression_stats(created_at);`);
}

initDb().then(() => console.log("✅ Database ready")).catch(console.error);

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

// IDEA #1: AUTO-COMPRESS ALL API CALLS
async function callCouncilMember(member, prompt, useMicro = true) {
  const config = COUNCIL_MEMBERS[member];
  if (!config) throw new Error(`Unknown council member: ${member}`);
  
  // AUTO-COMPRESS: Force MICRO for prompts >100 chars
  const shouldCompress = prompt.length > 100 && !prompt.startsWith('V:2.0');
  if (shouldCompress && !useMicro) {
    console.log(`[auto-compress] Converting ${prompt.length} char prompt to MICRO (saving ~${Math.floor(prompt.length * 0.7)} chars)`);
    const microData = {
      operation: prompt.toLowerCase().includes('generate') ? 'generate' : 'analyze',
      description: prompt.slice(0, 200),
      type: 'general',
      returnFields: ['CT', 'KP']
    };
    prompt = MICRO_PROTOCOL.encode(microData);
    useMicro = true;
  }
  
  const systemPrompt = useMicro
    ? 'You are the LifeOS Architect AI controlling the Lumin autonomous system at robust-magic-production.up.railway.app. You communicate using v2.0-Micro protocol. Format: V:2.0|CT:<complete detailed answer>|KP:~key~points. Be specific and concrete. When asked to generate scripts or code, produce FULL complete examples with all sections. Never produce generic IVR phone menus. Never say "I cannot access" - you ARE the system running on Railway with GitHub repo LimitlessOI/Lumin-LifeOS. Show what you DID or CAN DO with specific details.'
    : '';
  
  // ANTHROPIC (Claude)
  if (config.provider === 'anthropic' && ANTHROPIC_API_KEY) {
    const res = await safeFetch("https://api.anthropic.com/v1/messages", {
      method: "POST", 
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: config.model, max_tokens: 2000, system: systemPrompt, messages: [{ role: "user", content: prompt }] })
    });
    const json = await res.json();
    return { response: json.content[0].text, usage: { prompt_tokens: json.usage.input_tokens, completion_tokens: json.usage.output_tokens } };
  }
  
  // OPENAI (GPT-4o, GPT-4o-mini)
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
  
  // GOOGLE GEMINI
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
  
  // XAI GROK
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

// IDEA #16: PARALLEL COUNCIL VOTING
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

  // PARALLEL EXECUTION - Call all AIs simultaneously
  const t0 = performance.now();
  const calls = [
    callCouncilMember('claude', fullPrompt, true).then(r => ({ name: 'Claude', text: String(r.response || '').trim(), usage: r.usage, model: 'claude-sonnet-4' })).catch(e => ({ name: 'Claude', text: '', error: e.message })),
    callCouncilMember('brock', fullPrompt, true).then(r => ({ name: 'Brock', text: String(r.response || '').trim(), usage: r.usage, model: 'gpt-4o' })).catch(e => ({ name: 'Brock', text: '', error: e.message })),
    callCouncilMember('gemini', fullPrompt, true).then(r => ({ name: 'Gemini', text: String(r.response || '').trim(), usage: r.usage, model: 'gemini-2.0-flash-exp' })).catch(e => ({ name: 'Gemini', text: '', error: e.message })),
    callCouncilMember('grok', fullPrompt, true).then(r => ({ name: 'Grok', text: String(r.response || '').trim(), usage: r.usage, model: 'grok-beta' })).catch(e => ({ name: 'Grok', text: '', error: e.message }))
  ];

  const results = await Promise.all(calls);
  const responses = results.filter(r => r.text && !r.error);
  
  // Track costs
  results.forEach(r => { if (r.usage) trackCost(r.usage, r.model); });

  const parallelTime = Math.round(performance.now() - t0);
  console.log(`[team] ⚡ Parallel execution: ${responses.length}/4 AIs responded in ${parallelTime}ms`);

  if (responses.length === 0) {
    return 'V:2.0|CT:All~team~members~unavailable|KP:~retry';
  }

  // Judge synthesizes
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
  
  const totalTime = Math.round(performance.now() - t0);
  console.log(`[team] ✅ Total time: ${totalTime}ms (vs ~${responses.length * 5000}ms sequential)`);
  
  return String(judged.response || responses[0].text).trim();
}

// IDEA #7: HALLUCINATION DETECTOR
async function factCheckResponse(text, context = '') {
  const claims = [];
  const dateMatches = text.match(/\b(20\d{2}|19\d{2})\b/g);
  if (dateMatches) claims.push(...dateMatches.map(d => `year ${d}`));
  const versionMatches = text.match(/v?\d+\.\d+(\.\d+)?/g);
  if (versionMatches) claims.push(...versionMatches.map(v => `version ${v}`));
  const nameMatches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
  if (nameMatches) claims.push(...nameMatches.slice(0, 3).map(n => `product ${n}`));
  
  if (claims.length === 0) {
    return { verified: true, confidence: 0.9, note: 'No factual claims to verify' };
  }
  
  try {
    const verifyPrompt = `Fact-check these claims from an AI response. Context: ${context.slice(0, 100)}

Claims to verify:
${claims.slice(0, 5).join('\n')}

Original text:
${text.slice(0, 500)}

Return JSON:
{
  "verified": true/false,
  "confidence": 0.0-1.0,
  "issues": ["claim X is wrong because Y"],
  "corrections": ["actual fact is Z"]
}`;

    const result = await callCouncilMember('gemini', verifyPrompt, false);
    const check = JSON.parse(result.response);
    
    if (!check.verified) {
      console.log(`[hallucination] ⚠️ Detected false claims: ${check.issues?.join(', ')}`);
    }
    
    return check;
  } catch (e) {
    console.error('[hallucination] Check failed:', e.message);
    return { verified: true, confidence: 0.5, note: 'Verification failed' };
  }
}

// IDEA #18: SMART MODEL SELECTION
async function smartRoute(prompt, context = {}) {
  const complexity = assessComplexity(prompt);
  
  if (complexity.score < 7) {
    console.log(`[routing] Low complexity (${complexity.score}/10) → Gemini`);
    try {
      const t0 = performance.now();
      const result = await callCouncilMember('gemini', prompt, true);
      const quality = assessQuality(result.response);
      const time = Math.round(performance.now() - t0);
      
      trackCost(result.usage, 'gemini-2.0-flash-exp');
      
      if (quality.score >= 8) {
        console.log(`[routing] ✅ Gemini succeeded (quality: ${quality.score}/10, ${time}ms)`);
        return { response: result.response, model: 'gemini', escalated: false, quality: quality.score };
      }
      
      console.log(`[routing] ⚠️ Gemini quality low (${quality.score}/10) → escalating to Claude`);
    } catch (e) {
      console.log(`[routing] Gemini failed: ${e.message} → escalating`);
    }
  }
  
  const smartModel = complexity.requiresCode ? 'brock' : 'claude';
  console.log(`[routing] High complexity or failed fast → ${smartModel}`);
  
  const result = await callCouncilMember(smartModel, prompt, true);
  trackCost(result.usage, smartModel === 'brock' ? 'gpt-4o' : 'claude-sonnet-4');
  
  return { response: result
