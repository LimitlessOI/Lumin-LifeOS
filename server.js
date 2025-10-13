// server.js (FULL FILE – with pods, council, tiered debug, and all sprint improvements)
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
  GITHUB_TOKEN,
  GITHUB_REPO = "owner/repo",
  GITHUB_DEFAULT_BRANCH = "main",
  PORT = 8080,
} = process.env;

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
  
  await pool.query(`
    create index if not exists idx_debug_tier on debug_metrics(tier);
  `);
  await pool.query(`
    create index if not exists idx_debug_created on debug_metrics(created_at);
  `);
  await pool.query(`
    create index if not exists idx_build_pod on build_metrics(pod_id);
  `);
  
  // Seed default pods if none exist
  const podCount = await pool.query('select count(*) from pods');
  if (Number(podCount.rows[0].count) === 0) {
    console.log('[init] Seeding default pods...');
    await pool.query(`
      insert into pods (name, llm_provider, credits_balance, weekly_budget)
      values 
        ('Alpha', 'claude', 100, 100),
        ('Bravo', 'gemini', 100, 100)
    `);
  }
}

initDb()
  .then(() => console.log("✅ Database tables ready (with pods, capsule, debug_metrics)"))
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
  
  // Update spend file
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

// ===== Helpers =====
function requireCommandKey(req, res, next) {
  const key = req.header("X-Command-Key") || req.query.key;
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

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// fetch with retries (network/DNS safe guard) + error escalation
async function safeFetch(url, init = {}, retries = 3, baseDelayMs = 300) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const r = await fetch(url, init);
      if (r.ok) return r;
      const body = await r.text().catch(() => "");
      throw new Error(`HTTP ${r.status} ${url} ${body.slice(0, 200)}`);
    } catch (e) {
      lastErr = e;
      if (i === retries) {
        // On final failure, escalate to debug system if critical
        if (shouldEscalate(e, { action: 'fetch', url, critical: true })) {
          console.log('[safeFetch] Escalating to debug system...');
          const debugResult = await debugWithEscalation(e, {
            action: 'fetch',
            url,
            attempt: i + 1
          });
          
          if (debugResult.fixed && debugResult.retry) {
            console.log('[safeFetch] Debug system suggests retry');
            continue;
          }
        }
        break;
      }
      await sleep(baseDelayMs * Math.pow(2, i));
    }
  }
  throw lastErr;
}

// Wrapper for critical build operations
async function safeBuildOperation(operation, context, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.log(`[safe-op] Attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      
      if (attempt === maxRetries || shouldEscalate(error, context)) {
        console.log('[safe-op] Escalating to tiered debug...');
        
        const debugResult = await debugWithEscalation(error, {
          ...context,
          attempt,
          during_build: true
        });
        
        if (debugResult.fixed && debugResult.retry) {
          console.log('[safe-op] Auto-healed, retrying...');
          continue;
        }
        
        if (debugResult.needs_human) {
          console.log('[safe-op] ⚠️ Human review needed');
          // All fixes failed - throw to caller
          break;
        }
      }
      
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

// debounce stamp helpers
function readStampMs() {
  try { return Number(fs.readFileSync(STAMP_FILE, "utf8").trim() || "0"); } catch { return 0; }
}
function writeStampNow() {
  try { fs.writeFileSync(STAMP_FILE, String(Date.now()), "utf8"); } catch {}
}
function minsSince(ts) {
  return (Date.now() - ts) / 60000;
}
function shouldBuild(minWindow = MIN_BUILD_INTERVAL_MINUTES) {
  const last = readStampMs();
  if (!last) return { allowed: true };
  const elapsed = minsSince(last);
  if (elapsed < minWindow) return { 
    allowed: false, 
    waitMinutes: Math.max(0, Math.ceil(minWindow - elapsed)) 
  };
  return { allowed: true };
}

// ===== POD API ROUTES =====

// List all pods
app.get("/api/v1/pods", requireCommandKey, async (_req, res) => {
  try {
    const pods = await pool.query(`
      select * from pods 
      order by total_revenue desc
    `);
    res.json({ ok: true, pods: pods.rows });
  } catch (e) {
    console.error('[pods] Error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Get pod details
app.get("/api/v1/pods/:id", requireCommandKey, async (req, res) => {
  try {
    const [pod, metrics] = await Promise.all([
      pool.query('select * from pods where id = $1', [req.params.id]),
      pool.query(`
        select * from pod_metrics 
        where pod_id = $1 
        order by sprint_week desc 
        limit 10
      `, [req.params.id])
    ]);
    
    if (!pod.rows[0]) {
      return res.status(404).json({ ok: false, error: 'Pod not found' });
    }
    
    res.json({ ok: true, pod: pod.rows[0], metrics: metrics.rows });
  } catch (e) {
    console.error('[pods] Error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Update pod credits
app.post("/api/v1/pods/:id/credits", requireCommandKey, async (req, res) => {
  try {
    const { amount = 0, reason } = req.body;
    await pool.query(
      'update pods set credits_balance = credits_balance + $1 where id = $2',
      [amount, req.params.id]
    );
    console.log(`[pods] Updated credits for pod ${req.params.id}: ${amount > 0 ? '+' : ''}${amount} (${reason || 'no reason'})`);
    res.json({ ok: true, updated: Number(amount) });
  } catch (e) {
    console.error('[pods] Error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Nudge pod (human directive)
app.post("/api/v1/pods/:id/nudge", requireCommandKey, async (req, res) => {
  try {
    const { directive } = req.body;
    if (!directive) {
      return res.status(400).json({ ok: false, error: 'Directive is required' });
    }
    await pool.query(
      'update pods set last_nudge = $1 where id = $2',
      [directive, req.params.id]
    );
    console.log(`[pods] Nudge set for pod ${req.params.id}: ${directive.slice(0, 60)}...`);
    res.json({ ok: true, directive_set: directive });
  } catch (e) {
    console.error('[pods] Error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ===== CAPSULE API ROUTES =====

// Upload idea to Capsule
app.post("/api/v1/capsule/ideas", requireCommandKey, async (req, res) => {
  try {
    const { pod_id, title, content, code, ethics_score = 10 } = req.body;
    
    if (!pod_id || !title || !content) {
      return res.status(400).json({ 
        ok: false, 
        error: 'pod_id, title, and content are required' 
      });
    }
    
    // Ethics gate
    if (ethics_score < 7.0) {
      return res.status(403).json({ 
        ok: false, 
        error: 'Ethics score too low (<7.0) for Capsule upload' 
      });
    }
    
    // PII sanitization (basic)
    const sanitized = typeof content === 'string' 
      ? content.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED_EMAIL]')
      : content;
    
    const exclusive_until = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
    
    await pool.query(`
      insert into capsule_ideas (pod_id, title, content, code, ethics_score, exclusive_until)
      values ($1, $2, $3, $4, $5, $6)
    `, [pod_id, title, sanitized, code || null, ethics_score, exclusive_until]);
    
    console.log(`[capsule] Idea uploaded by pod ${pod_id}: ${title}`);
    res.json({ ok: true, exclusive_until });
  } catch (e) {
    console.error('[capsule] Upload error:', e);
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

// ===== DEBUG STATS API =====
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

// ===== Admin API (used by public/onboarding.html) =====
app.use("/api/v1/admin", requireCommandKey, adminRouter);

// ===== Health =====
app.get("/healthz", async (_req, res) => {
  try {
    const r = await pool.query("select now()");
    res.json({ 
      status: "healthy", 
      database: "connected", 
      timestamp: r.rows[0].now, 
      version: "v5-pods-council" 
    });
  } catch {
    res.status(500).json({ status: "unhealthy" });
  }
});

// ===== Budget Status =====
app.get("/api/v1/budget/status", requireCommandKey, async (_req, res) => {
  const budget = await checkBudget();
  res.json(budget);
});

// ===== Metrics Summary =====
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

// ===== Stats (secured) =====
app.get("/api/v1/calls/stats", requireCommandKey, async (_req, res) => {
  const r = await pool.query("select count(*)::int as count from calls where created_at > now() - interval '30 days'");
  const last10 = await pool.query("select id, created_at, phone, intent, score, duration from calls order by id desc limit 10");
  res.json({ count: r.rows[0].count, last_10: last10.rows });
});

// ===== Vapi Qualification Webhook (secured) =====
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

// ===== Overlay state APIs =====
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

// ===== Twilio missed-call hook (future) =====
app.post("/api/v1/twilio/
