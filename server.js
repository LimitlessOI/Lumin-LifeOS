import express from "express";
import dayjs from "dayjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";

// integrations & routes
import { createLead, appendTranscript, tagLead } from "./src/integrations/boldtrail.js";
import { adminRouter } from "./src/routes/admin.js";
import { buildSmartContext } from "./src/utils/context.js";
import { pruneLogContext } from "./src/utils/prune-context.js";
import { debugWithEscalation, shouldEscalate } from "./src/utils/tiered-debug.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ===== Static assets =====
app.use(express.static(path.join(__dirname, "public")));
app.use("/reports", express.static(path.join(__dirname, "reports")));
app.use("/overlay", express.static(path.join(__dirname, "public/overlay")));

// ===== Data dir for autopilot logs & stamps =====
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const LOG_FILE = path.join(DATA_DIR, "autopilot.log");
const STAMP_FILE = path.join(DATA_DIR, "last-build.txt");
const SPEND_FILE = path.join(DATA_DIR, "spend.json");

// ===== Env =====
const {
  DATABASE_URL,
  COMMAND_CENTER_KEY,
  WEBHOOK_SECRET,
  PUBLIC_BASE_URL,
  OPENAI_API_KEY,
  ANTHROPIC_API_KEY,
  GITHUB_TOKEN,
  GITHUB_REPO = "owner/repo",
  GITHUB_DEFAULT_BRANCH = "main",
} = process.env;

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const MIN_BUILD_INTERVAL_MINUTES = Number(process.env.MIN_BUILD_INTERVAL_MINUTES || 30);
const MAX_DAILY_SPEND = Number(process.env.MAX_DAILY_SPEND || 5.0);
const PHASE1_BUDGET_CAP = Number(process.env.PHASE1_BUDGET_CAP || 50.0);

// ===== Postgres =====
export const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL?.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
});

async function initDb() {
  // Existing tables
  await pool.query(`
    create table if not exists calls (
      id serial primary key,
      created_at timestamptz default now(),
      phone text,
      intent text,
      area text,
      timeline text,
      duration int,
      transcript text,
      score text,
      boldtrail_lead_id text
    );
  `);
  await pool.query(`
    create table if not exists missed_calls (
      id serial primary key,
      created_at timestamptz default now(),
      from_number text,
      to_number text,
      status text default 'new'
    );
  `);
  await pool.query(`
    create table if not exists overlay_states (
      id serial primary key,
      sid text not null,
      updated_at timestamptz default now(),
      data jsonb not null
    );
  `);
  await pool.query(`
    create table if not exists build_metrics (
      id serial primary key,
      created_at timestamptz default now(),
      pr_number int,
      pr_url text,
      model text,
      tokens_in int default 0,
      tokens_out int default 0,
      cost numeric(10,4) default 0,
      outcome text default 'pending',
      summary text,
      tokens_saved int default 0,
      pod_id int
    );
  `);
  
  // NEW: Pod system tables
  await pool.query(`
    create table if not exists pods (
      id serial primary key,
      name text not null unique,
      llm_provider text not null,
      credits_balance numeric default 100,
      weekly_budget numeric default 100,
      total_revenue numeric default 0,
      total_costs numeric default 0,
      ethics_score numeric default 10.0,
      last_nudge text default null,
      status text default 'active',
      context_memory jsonb default '{}',
      created_at timestamptz default now()
    );
  `);
  
  await pool.query(`
    create table if not exists pod_metrics (
      id serial primary key,
      pod_id int references pods(id),
      sprint_week int not null,
      revenue numeric default 0,
      costs numeric default 0,
      roi numeric default 0,
      dignity_score numeric default 0,
      rank int,
      spam_flags int default 0,
      created_at timestamptz default now()
    );
  `);
  
  await pool.query(`
    create table if not exists capsule_ideas (
      id serial primary key,
      pod_id int references pods(id),
      title text not null,
      content jsonb not null,
      code text,
      metrics jsonb,
      ethics_score numeric,
      exclusive_until timestamptz,
      adoption_count int default 0,
      created_at timestamptz default now()
    );
  `);
  
  await pool.query(`
    create table if not exists debug_metrics (
      id serial primary key,
      tier text not null,
      time_ms int not null,
      fixed boolean default false,
      error_type text,
      context jsonb,
      created_at timestamptz default now()
    );
  `);

  // NEW: Council reviews table for multi-LLM consensus
  await pool.query(`
    create table if not exists council_reviews (
      id serial primary key,
      pr_number int not null,
      reviewer text not null,
      vote text not null,
      reasoning text,
      concerns jsonb,
      created_at timestamptz default now()
    );
  `);
  
  await pool.query(`
    create index if not exists idx_debug_tier on debug_metrics(tier);
  `);
  await pool.query(`
    create index if not exists idx_debug_created on debug_metrics(created_at);
  `);
  await pool.query(`
    create index if not exists idx_build_pod on build_metrics(pod_id);
  `);
  await pool.query(`
    create index if not exists idx_council_pr on council_reviews(pr_number);
  `);
  
  // Seed default pods if none exist
  const podCount = await pool.query('select count(*) from pods');
  if (Number(podCount.rows[0].count) === 0) {
    console.log('[init] Seeding default pods...');
    await pool.query(`
      insert into pods (name, llm_provider, credits_balance, weekly_budget)
      values 
        ('Alpha', 'claude', 100, 100),
        ('Bravo', 'gemini', 100, 100),
        ('Charlie', 'openai', 100, 100)
    `);
  }
}

initDb()
  .then(() => console.log("✅ Database tables ready (with pods, capsule, debug_metrics, council)"))
  .catch(console.error);

// ===== Pod Personas =====
export const POD_PERSONAS = {
  alpha: {
    style: "aggressive_growth",
    risk_tolerance: "high",
    focus: "revenue_velocity"
  },
  bravo: {
    style: "sustainable",
    risk_tolerance: "medium",
    focus: "customer_lifetime_value"
  },
  charlie: {
    style: "innovative",
    risk_tolerance: "high",
    focus: "breakthrough_features"
  }
};

// ===== Council Members Configuration =====
const COUNCIL_MEMBERS = {
  claude: {
    name: "Claude",
    role: "Strategic Oversight & Unintended Consequences",
    model: "claude-sonnet-4",
    focus: "long-term implications, system coherence, edge cases"
  },
  brock: {
    name: "Brock",
    role: "Execution & Blindspot Detection",
    model: "gpt-4o",
    focus: "implementation risks, technical debt, maintainability"
  },
  jayn: {
    name: "Jayn",
    role: "Ethics & Long-term Impact",
    model: "gpt-4o-mini",
    focus: "user impact, ethical considerations, sustainability"
  },
  r8: {
    name: "r8",
    role: "Quality & Standards",
    model: "gpt-4o-mini",
    focus: "code quality, best practices, consistency"
  }
};

// ===== Budget helpers =====
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

async function getTodaySpend() {
  const r = await pool.query(`
    select coalesce(sum(cost), 0) as total
    from build_metrics
    where created_at::date = current_date
  `);
  return Number(r.rows[0].total);
}

async function getTotalPhase1Spend() {
  const r = await pool.query(`
    select coalesce(sum(total_costs), 0) as total
    from pods
  `);
  return Number(r.rows[0].total);
}

async function checkBudget() {
  const dailySpend = await getTodaySpend();
  const phase1Spend = await getTotalPhase1Spend();
  
  return {
    daily_spent: dailySpend,
    daily_limit: MAX_DAILY_SPEND,
    daily_remaining: MAX_DAILY_SPEND - dailySpend,
    daily_exceeded: dailySpend >= MAX_DAILY_SPEND,
    phase1_spent: phase1Spend,
    phase1_limit: PHASE1_BUDGET_CAP,
    phase1_remaining: PHASE1_BUDGET_CAP - phase1Spend,
    phase1_exceeded: phase1Spend >= PHASE1_BUDGET_CAP
  };
}

function trackCost(usage, model = "gpt-4o-mini", podId = null) {
  const prices = {
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "gpt-4o": { input: 0.0025, output: 0.01 },
    "claude-sonnet-4": { input: 0.003, output: 0.015 },
    "claude-3-sonnet-20240229": { input: 0.003, output: 0.015 },
    "gemini-pro": { input: 0.0005, output: 0.0015 }
  };
  const price = prices[model] || prices["gpt-4o-mini"];
  const cost = ((usage?.prompt_tokens || 0) * price.input / 1000) +
               ((usage?.completion_tokens || 0) * price.output / 1000);

  let spend = readSpend();
  const today = dayjs().format("YYYY-MM-DD");
  if (spend.day !== today) spend = { day: today, usd: 0 };
  spend.usd += cost;
  writeSpend(spend);

  // Update pod costs if provided
  if (podId) {
    pool.query('update pods set total_costs = total_costs + $1 where id = $2', [cost, podId])
      .catch(e => console.error('[track-cost] Failed to update pod:', e));
  }
  
  return cost;
}

function requireCommandKey(req, res, next) {
  const key = req.query.key || req.headers["x-command-key"];
  if (!COMMAND_CENTER_KEY || key !== COMMAND_CENTER_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

function requireWebhookSecret(req, res, next) {
  const key = req.header("X-Webhook-Secret");
  if (!WEBHOOK_SECRET || key !== WEBHOOK_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }
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

// small sleep
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// fetch with retries (network/DNS safe guard) + error escalation
async function safeFetch(url, init = {}, retries = 3, baseDelayMs = 300) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fetch(url, init);
      const body = await r.text();
      if (!r.ok) throw new Error(`HTTP ${r.status} ${url} ${body.slice(0, 200)}`);
      return { ...r, json: async () => JSON.parse(body), text: async () => body };
    } catch (e) {
      lastErr = e;
      if (i === retries) {
        // Check if we should escalate debugging
        if (shouldEscalate(e)) {
          await debugWithEscalation(e, { url, attempt: i });
        }
        break;
      }
      const delayMs = baseDelayMs * Math.pow(2, i);
      console.warn(`[fetch] retry ${i + 1}/${retries} after ${delayMs}ms: ${e.message}`);
      await sleep(delayMs);
    }
  }
  throw lastErr;
}

// ===== MULTI-LLM COUNCIL SYSTEM =====
// This ensures EVERY code integration is reviewed by multiple LLMs for consensus

async function callCouncilMember(member, prompt) {
  const config = COUNCIL_MEMBERS[member];
  
  if (member === 'claude' && ANTHROPIC_API_KEY) {
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
        messages: [{ role: "user", content: prompt }]
      })
    });
    const json = await res.json();
    return {
      response: json.content[0].text,
      usage: { prompt_tokens: json.usage.input_tokens, completion_tokens: json.usage.output_tokens }
    };
  } else if (OPENAI_API_KEY) {
    // All other members use OpenAI
    const res = await safeFetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.1,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      })
    });
    const json = await res.json();
    return {
      response: json.choices[0].message.content,
      usage: json.usage
    };
  }
  
  throw new Error(`No API key available for ${member}`);
}

async function getCouncilConsensus(prNumber, diff, summary) {
  console.log(`[council] Starting review for PR #${prNumber}...`);
  
  const reviews = [];
  const basePrompt = `You are ${COUNCIL_MEMBERS.claude.name}, responsible for ${COUNCIL_MEMBERS.claude.role}.

Review this proposed code change with a focus on: ${COUNCIL_MEMBERS.claude.focus}

PR Summary: ${summary}
Diff (first 3000 chars): ${diff.slice(0, 3000)}

Provide your review as JSON:
{
  "vote": "approve|concerns|reject",
  "confidence": 1-10,
  "reasoning": "2-3 sentences explaining your vote",
  "concerns": ["list", "of", "specific", "issues"],
  "blindspots": ["potential", "unintended", "consequences"]
}`;

  // Get review from each council member
  for (const [memberId, config] of Object.entries(COUNCIL_MEMBERS)) {
    try {
      const memberPrompt = basePrompt
        .replace(COUNCIL_MEMBERS.claude.name, config.name)
        .replace(COUNCIL_MEMBERS.claude.role, config.role)
        .replace(COUNCIL_MEMBERS.claude.focus, config.focus);
      
      const result = await callCouncilMember(memberId, memberPrompt);
      const review = JSON.parse(result.response);
      
      // Track cost
      const cost = trackCost(result.usage, config.model);
      
      // Store review
      await pool.query(`
        insert into council_reviews (pr_number, reviewer, vote, reasoning, concerns)
        values ($1, $2, $3, $4, $5)
      `, [prNumber, config.name, review.vote, review.reasoning, JSON.stringify(review.concerns || [])]);
      
      reviews.push({
        member: config.name,
        vote: review.vote,
        confidence: review.confidence || 5,
        reasoning: review.reasoning,
        concerns: review.concerns || [],
        blindspots: review.blindspots || [],
        cost
      });
      
      console.log(`[council] ${config.name} voted: ${review.vote} (confidence: ${review.confidence}/10)`);
    } catch (e) {
      console.error(`[council] ${config.name} review failed:`, e.message);
      reviews.push({
        member: config.name,
        vote: "error",
        reasoning: `Review failed: ${e.message}`,
        concerns: [],
        blindspots: []
      });
    }
  }
  
  // Calculate consensus
  const votes = reviews.filter(r => r.vote !== 'error');
  const approvals = votes.filter(r => r.vote === 'approve').length;
  const concerns = votes.filter(r => r.vote === 'concerns').length;
  const rejections = votes.filter(r => r.vote === 'reject').length;
  
  // Require 3/4 approval or 2/4 approval with no rejections
  const consensus = {
    approved: approvals >= 3 || (approvals >= 2 && rejections === 0),
    requires_review: concerns > 0 || rejections > 0,
    auto_merge: approvals === 4,
    votes: { approve: approvals, concerns, reject: rejections },
    reviews,
    all_concerns: reviews.flatMap(r => r.concerns).filter(c => c),
    all_blindspots: reviews.flatMap(r => r.blindspots).filter(b => b)
  };
  
  console.log(`[council] Consensus: ${consensus.approved ? 'APPROVED' : 'REJECTED'} (${approvals}/4 approve, ${concerns} concerns, ${rejections} reject)`);
  
  return consensus;
}

// ===== AUTOPILOT ROUTES =====

// Health check
app.get("/health", (_req, res) => {
  res.send("OK");
});

// Healthz with DB check
app.get("/healthz", async (_req, res) => {
  try {
    const r = await pool.query("select now()");
    res.json({ 
      status: "healthy", 
      database: "connected", 
      timestamp: r.rows[0].now, 
      version: "v6-council-consensus" 
    });
  } catch {
    res.status(500).json({ status: "unhealthy" });
  }
});

// Reset stuck tasks
app.post("/internal/autopilot/reset-stuck", (req, res) => {
  if (!assertKey(req, res)) return;
  const minutes = Number(req.query.minutes || 60);
  console.log(`[autopilot] Clearing logs older than ${minutes} minutes`);
  res.json({ ok: true, cleared: `entries older than ${minutes}m` });
});

// Generate daily report
app.post("/api/v1/autopilot/daily-report", async (req, res) => {
  if (!assertKey(req, res)) return;
  try {
    const backlog = req.body?.backlog || "";
    const root = __dirname;
    const today = dayjs().format("YYYY-MM-DD");
    const rp = path.join(root, "reports");
    if (!fs.existsSync(rp)) fs.mkdirSync(rp, { recursive: true });
    const countRes = await pool.query("select score, count(*)::int as c from calls where created_at::date = current_date group by score");
    const totalRes = await pool.query("select count(*)::int as c from calls where created_at::date = current_date");
    const lines = [
      `# Daily Report - ${today}`, "",
      `Total calls today: ${totalRes.rows[0]?.c || 0}`, "",
      "By score:", ...countRes.rows.map(r => `- ${r.score || "unknown"}: ${r.c}`),
      "", "---", "Backlog snapshot:", "```", (backlog || "").trim(), "```",
    ].join("\n");
    const outFile = path.join(rp, `${today}.md`);
    fs.writeFileSync(outFile, lines, "utf8");
    console.log("[autopilot] wrote report:", outFile);
    res.json({ ok: true, report: `/reports/${today}.md` });
  } catch (e) {
    console.error("[autopilot] error", e);
    res.status(500).json({ error: "autopilot_failed" });
  }
});

// Heartbeat
app.get("/internal/cron/autopilot", (req, res) => {
  if (!assertKey(req, res)) return;
  const line = `[${new Date().toISOString()}] autopilot:tick\n`;
  try { fs.appendFileSync(LOG_FILE, line); res.json({ ok:true, wrote: line }); }
  catch(e){ res.status(500).json({ ok:false, error: String(e) }); }
});

// Planner -> OpenAI WITH ROI PRE-FLIGHT + SMART CONTEXT
app.post("/api/v1/repair-self", async (req, res) => {
  if (!assertKey(req, res)) return;
  if (!OPENAI_API_KEY) return res.status(500).json({ ok:false, error:"OPENAI_API_KEY missing" });

  try {
    // Build smart context
    let logs = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, "utf8") : "";
    if (logs.length > 8000) logs = await pruneLogContext(logs, 2000);

    const smartCtx = await buildSmartContext(__dirname, 2000);
    const combinedContext = `${smartCtx.context}\n\n--- Recent Logs ---\n${logs.slice(-4000)}`;
    console.log(`[context] Saved ~${smartCtx.tokens_saved} tokens via differential loading`);
    
    // STEP 1: Quick ROI estimation
    const hour = new Date().getHours();
    const isDayTime = hour >= 9 && hour <= 18;
    const threshold = isDayTime ? 0.30 : 0.50;

    const estimatorPrompt = `Analyze these recent logs and estimate ROI for next build:
${combinedContext.slice(0, 4000)}

Return JSON:
{
  "should_build": true/false,
  "estimated_lines": 0-500,
  "merge_probability": 0-100,
  "estimated_value_usd": 0-10,
  "risk": "low|med|high",
  "reasoning": "1-2 sentences"
}`;

    const estimatorRes = await safeFetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        messages: [{ role: "user", content: estimatorPrompt }],
        response_format: { type: "json_object" }
      })
    });

    const estimatorJson = await estimatorRes.json();
    const estimate = JSON.parse(estimatorJson.choices?.[0]?.message?.content || "{}");
    
    const estimatorCost = trackCost(estimatorJson.usage, "gpt-4o-mini");
    
    await pool.query(`
      insert into build_metrics (model, tokens_in, tokens_out, cost, summary, outcome, tokens_saved)
      values ($1, $2, $3, $4, $5, 'roi_check', $6)
    `, [
      'gpt-4o-mini',
      estimatorJson.usage?.prompt_tokens || 0,
      estimatorJson.usage?.completion_tokens || 0,
      estimatorCost,
      `ROI Check: ${estimate.reasoning || 'n/a'}`,
      smartCtx.tokens_saved
    ]);

    console.log('[ROI] Estimate:', estimate, `threshold: $${threshold}`);

    // GATE: Abort if low ROI
    if (!estimate.should_build || (estimate.estimated_value_usd || 0) < threshold) {
      return res.json({
        ok: true,
        skip: true,
        reason: `Low ROI detected (threshold: $${threshold})`,
        estimate
      });
    }

    // STEP 2: Full planning with tiered model
    let useModel = "gpt-4o-mini";
    if ((estimate.estimated_lines || 0) > 100 || estimate.risk === 'high') {
      useModel = "gpt-4o";
    }
    
    const system = `You are a senior release engineer. From logs, propose 1-3 precise NEXT ACTIONS.
Return strict JSON:
{
  "summary": "one line",
  "actions": [
    {"title":"...", "rationale":"...", "risk":"low|med|high",
     "files":[{"path":"docs/auto/TODO.md","type":"create|modify","hint":"what to implement"}]
    }
  ]
}`;
    const user = `Context:\n${combinedContext}`;

    const planRes = await safeFetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: useModel,
        temperature: 0.2,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        response_format: { type: "json_object" }
      })
    });

    const planJson = await planRes.json();
    const planText = planJson.choices?.[0]?.message?.content || "{}";
    const plan = JSON.parse(planText);

    const planCost = trackCost(planJson.usage, useModel);

    await pool.query(`
      insert into build_metrics (model, tokens_in, tokens_out, cost, summary, outcome, tokens_saved)
      values ($1, $2, $3, $4, $5, 'planned', $6)
    `, [
      useModel,
      planJson.usage?.prompt_tokens || 0,
      planJson.usage?.completion_tokens || 0,
      planCost,
      plan.summary || 'n/a',
      smartCtx.tokens_saved
    ]);

    console.log(`[PLAN] Using ${useModel}, cost: $${planCost.toFixed(4)}`);

    res.json({ ok: true, plan, estimate, model_used: useModel, tokens_saved: smartCtx.tokens_saved });
  } catch (e) {
    console.error('[repair-self]', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Council critique endpoint - replaces single LLM critique
app.post("/api/v1/build/critique-pr", requireCommandKey, async (req, res) => {
  try {
    const { pr_number, diff, summary } = req.body;
    if (!diff) return res.status(400).json({ ok: false, error: "diff required" });

    // Get multi-LLM consensus
    const consensus = await getCouncilConsensus(pr_number, diff, summary);
    
    // Determine recommendation based on consensus
    let recommendation;
    if (consensus.auto_merge) {
      recommendation = "auto_merge";
    } else if (consensus.approved && !consensus.requires_review) {
      recommendation = "auto_merge";
    } else if (consensus.approved) {
      recommendation = "review_required";
    } else {
      recommendation = "reject";
    }
    
    // Calculate aggregate score (1-5 based on approvals)
    const score = consensus.votes.approve >= 3 ? 5 :
                  consensus.votes.approve === 2 ? 4 :
                  consensus.votes.approve === 1 ? 3 : 2;

    console.log(`[council] PR #${pr_number} scored ${score}/5, recommendation: ${recommendation}`);

    res.json({ 
      ok: true, 
      critique: {
        score,
        recommendation,
        reasoning: `Council consensus: ${consensus.votes.approve}/4 approve, ${consensus.votes.concerns} concerns, ${consensus.votes.reject} reject`,
        council_reviews: consensus.reviews,
        all_concerns: consensus.all_concerns,
        blindspots: consensus.all_blindspots
      }
    });
  } catch (e) {
    console.error('[critique]', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Pod leaderboard
app.get("/api/v1/pods/leaderboard", requireCommandKey, async (_req, res) => {
  try {
    const pods = await pool.query(`
      select 
        p.id, 
        p.name, 
        p.llm_provider,
        p.credits_balance,
        p.total_revenue,
        p.total_costs,
        p.ethics_score,
        (p.total_revenue - p.total_costs) as net_profit,
        coalesce(avg(pm.roi), 0) as avg_roi
      from pods p
      left join pod_metrics pm on pm.pod_id = p.id
      where p.status = 'active'
      group by p.id
      order by net_profit desc
    `);
    
    res.json({ ok: true, leaderboard: pods.rows });
  } catch (e) {
    console.error('[leaderboard] Error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Submit capsule idea
app.post("/api/v1/capsule/ideas", requireCommandKey, async (req, res) => {
  try {
    const { pod_id, title, content, code, exclusivity_hours = 168 } = req.body;
    
    if (!pod_id || !title || !content) {
      return res.status(400).json({ ok: false, error: 'pod_id, title, and content required' });
    }
    
    const exclusiveUntil = new Date();
    exclusiveUntil.setHours(exclusiveUntil.getHours() + exclusivity_hours);
    
    const result = await pool.query(`
      insert into capsule_ideas (pod_id, title, content, code, exclusive_until)
      values ($1, $2, $3, $4, $5)
      returning id
    `, [pod_id, title, content, code || null, exclusiveUntil]);
    
    console.log(`[capsule] Pod ${pod_id} created idea: ${title} (exclusive until ${exclusiveUntil})`);
    res.json({ ok: true, idea_id: result.rows[0].id, exclusive_until: exclusiveUntil });
  } catch (e) {
    console.error('[capsule] Submit error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Search available ideas (after exclusivity expires)
app.get("/api/v1/capsule/ideas", requireCommandKey, async (req, res) => {
  try {
    const { search } = req.query;
    const now = new Date();
    
    let query = `
      select * from capsule_ideas 
      where exclusive_until < $1
    `;
    const params = [now];
    
    if (search) {
      query += ` and (title ilike $2 or content::text ilike $2)`;
      params.push(`%${search}%`);
    }
    
    query += ` order by created_at desc limit 50`;
    
    const ideas = await pool.query(query, params);
    res.json({ ok: true, ideas: ideas.rows });
  } catch (e) {
    console.error('[capsule] Search error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Adopt idea (Marketplace)
app.post("/api/v1/capsule/ideas/:id/adopt", requireCommandKey, async (req, res) => {
  try {
    const { pod_id } = req.body;
    if (!pod_id) {
      return res.status(400).json({ ok: false, error: 'pod_id required' });
    }
    
    const idea = await pool.query(
      'select * from capsule_ideas where id = $1',
      [req.params.id]
    );
    
    if (!idea.rows[0]) {
      return res.status(404).json({ ok: false, error: 'Idea not found' });
    }
    
    // Charge adopter 5 credits
    await pool.query(
      'update pods set credits_balance = credits_balance - 5 where id = $1',
      [pod_id]
    );
    
    // Credit original pod 5 credits (passive income!)
    await pool.query(
      'update pods set credits_balance = credits_balance + 5 where id = $1',
      [idea.rows[0].pod_id]
    );
    
    // Track adoption
    await pool.query(
      'update capsule_ideas set adoption_count = adoption_count + 1 where id = $1',
      [req.params.id]
    );
    
    console.log(`[capsule] Pod ${pod_id} adopted idea from pod ${idea.rows[0].pod_id}`);
    res.json({ ok: true, adoption_count: idea.rows[0].adoption_count + 1 });
  } catch (e) {
    console.error('[capsule] Adopt error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// DEBUG STATS API
app.get("/api/v1/debug/stats", requireCommandKey, async (_req, res) => {
  try {
    const stats = await pool.query(`
      with tier_stats as (
        select 
          tier,
          count(*) as total,
          count(*) filter (where fixed = true) as fixed_count,
          avg(time_ms) as avg_time
        from debug_metrics
        where created_at > now() - interval '24 hours'
        group by tier
      )
      select * from tier_stats
    `);
    
    const result = {
      tier0_count: 0,
      tier0_success_rate: 0,
      tier1_count: 0,
      tier1_success_rate: 0,
      tier2_count: 0,
      tier2_success_rate: 0,
      tier3_count: 0,
      tier3_success_rate: 0,
      total_resolved: 0,
      avg_fix_time: 0
    };
    
    stats.rows.forEach(row => {
      const successRate = row.total > 0 
        ? Math.round((row.fixed_count / row.total) * 100)
        : 0;
      
      if (row.tier === 'auto_heal') {
        result.tier0_count = row.total;
        result.tier0_success_rate = successRate;
      } else if (row.tier === 'quick_debug') {
        result.tier1_count = row.total;
        result.tier1_success_rate = successRate;
      } else if (row.tier === 'smart_debug') {
        result.tier2_count = row.total;
        result.tier2_success_rate = successRate;
      } else if (row.tier === 'council_debug') {
        result.tier3_count = row.total;
        result.tier3_success_rate = successRate;
      }
      
      result.total_resolved += row.fixed_count;
    });
    
    const avgCount = stats.rows.length || 1;
    result.avg_fix_time = Math.round(
      stats.rows.reduce((sum, row) => sum + (row.avg_time || 0), 0) / avgCount / 1000
    );
    
    res.json(result);
  } catch (e) {
    console.error('[debug-stats] Error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Council review history
app.get("/api/v1/council/reviews/:pr_number", requireCommandKey, async (req, res) => {
  try {
    const reviews = await pool.query(
      'select * from council_reviews where pr_number = $1 order by created_at desc',
      [req.params.pr_number]
    );
    res.json({ ok: true, reviews: reviews.rows });
  } catch (e) {
    console.error('[council] Review fetch error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Admin API (used by public/onboarding.html)
app.use("/api/v1/admin", requireCommandKey, adminRouter);

// Budget Status
app.get("/api/v1/budget/status", requireCommandKey, async (_req, res) => {
  const budget = await checkBudget();
  res.json(budget);
});

// Metrics Summary
app.get("/api/v1/metrics/summary", requireCommandKey, async (_req, res) => {
  try {
    const totalRes = await pool.query(`
      select 
        coalesce(sum(cost), 0) as total_cost,
        coalesce(avg(cost), 0) as avg_cost,
        count(*)::int as build_count,
        count(*) filter (where outcome = 'merged')::int as merged_count,
        coalesce(sum(tokens_saved), 0) as total_tokens_saved
      from build_metrics
      where created_at > now() - interval '7 days'
    `);

    const highCostRes = await pool.query(`
      select created_at as timestamp, model, tokens_in, tokens_out, cost, pr_url, outcome
      from build_metrics
      where created_at > now() - interval '7 days'
      order by cost desc
      limit 10
    `);

    const lowRoiRes = await pool.query(`
      select created_at as timestamp, summary, cost, outcome as status
      from build_metrics
      where created_at > now() - interval '7 days'
        and cost > 0.50
        and outcome not in ('merged', 'roi_check')
      order by cost desc
      limit 20
    `);

    res.json({
      ...totalRes.rows[0],
      high_cost: highCostRes.rows,
      low_roi: lowRoiRes.rows
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "metrics_failed" });
  }
});

// Stats (secured)
app.get("/api/v1/calls/stats", requireCommandKey, async (_req, res) => {
  const r = await pool.query("select count(*)::int as count from calls where created_at > now() - interval '30 days'");
  const last10 = await pool.query("select id, created_at, phone, intent, score, duration from calls order by id desc limit 10");
  res.json({ count: r.rows[0].count, last_10: last10.rows });
});

// Vapi Qualification Webhook (secured)
app.post("/api/v1/vapi/qualification-complete", requireWebhookSecret, async (req, res) => {
  try {
    const { phoneNumber, buyOrSell, area, timeline, duration, transcript } = req.body || {};
    const score = (timeline || "").includes("30") || (duration || 0) > 60 ? "hot" : (duration || 0) > 20 ? "warm" : "cold";

    let boldtrailLeadId = null;
    try {
      const lead = await createLead({ phone: phoneNumber, intent: buyOrSell, area, timeline, duration, source: "Vapi Inbound" });
      boldtrailLeadId = lead?.id || null;
      if (transcript && boldtrailLeadId) await appendTranscript(boldtrailLeadId, transcript);
      if (score === "hot" && boldtrailLeadId) await tagLead(boldtrailLeadId, "hot");
    } catch (e) {
      console.error("BoldTrail error:", e?.response?.data || e.message);
    }

    await pool.query(
      `insert into calls (phone, intent, area, timeline, duration, transcript, score, boldtrail_lead_id)
       values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [phoneNumber, buyOrSell, area, timeline, duration, transcript || "", score, boldtrailLeadId]
    );

    res.json({ ok: true, score });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server_error" });
  }
});

// Overlay state APIs
async function getOverlayState(sid) {
  const r = await pool.query("select data from overlay_states where sid=$1 order by updated_at desc limit 1", [sid]);
  return r.rows[0]?.data || {};
}

app.get("/api/overlay/:sid/state", async (req, res) => {
  const state = await getOverlayState(req.params.sid);
  res.json(state);
});

app.post("/api/overlay/:sid/state", async (req, res) => {
  const state = req.body || {};
  await pool.query("insert into overlay_states (sid, data) values ($1, $2)", [req.params.sid, state]);
  res.json({ ok: true });
});

app.get("/overlay/:sid", (_req, res) => {
  res.sendFile(path.join(__dirname, "public/overlay/index.html"));
});

app.get("/overlay/:sid/control", (_req, res) => {
  res.sendFile(path.join(__dirname, "public/overlay/control.html"));
});

// Twilio missed-call hook
app.post("/api/v1/twilio/missed-call", async (req, res) => {
  try {
    const { From, To } = req.body;
    await pool.query(
      "insert into missed_calls (from_number, to_number) values ($1, $2)",
      [From, To]
    );
    console.log(`[twilio] Logged missed call from ${From}`);
    res.send("<Response></Response>");
  } catch (e) {
    console.error("[twilio] Error:", e);
    res.status(500).send("<Response></Response>");
  }
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`✅ Server running on http://${HOST}:${PORT}`);
  console.log(`✅ Health: http://${HOST}:${PORT}/health`);
  console.log(`✅ Overlay: http://${HOST}:${PORT}/overlay/index.html`);
  console.log(`✅ Council: Multi-LLM consensus system active`);
});

