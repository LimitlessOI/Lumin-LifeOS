// server.js (FULL FILE – with all sprint improvements)
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

// ===== Postgres =====
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL?.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
});

async function initDb() {
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
      tokens_saved int default 0
    );
  `);
}
initDb().then(() => console.log("Database tables ready (with build_metrics)")).catch(console.error);

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

async function checkBudget() {
  const spend = await getTodaySpend();
  return {
    spent: spend,
    limit: MAX_DAILY_SPEND,
    remaining: MAX_DAILY_SPEND - spend,
    exceeded: spend >= MAX_DAILY_SPEND
  };
}

function trackCost(usage, model = "gpt-4o-mini") {
  const prices = {
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "gpt-4o": { input: 0.0025, output: 0.01 }
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
  if (!k || got !== k) { res.status(401).json({ error: "unauthorized" }); return false; }
  return true;
}

// small sleep
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// fetch with retries (network/DNS safe guard)
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
      if (i === retries) break;
      await sleep(baseDelayMs * Math.pow(2, i));
    }
  }
  throw lastErr;
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
  if (elapsed < minWindow) return { allowed: false, waitMinutes: Math.max(0, Math.ceil(minWindow - elapsed)) };
  return { allowed: true };
}

// ===== Admin API (used by public/onboarding.html) =====
app.use("/api/v1/admin", requireCommandKey, adminRouter);

// ===== Health =====
app.get("/healthz", async (_req, res) => {
  try {
    const r = await pool.query("select now()");
    res.json({ status: "healthy", database: "connected", timestamp: r.rows[0].now, version: "v4-sprint" });
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
app.post("/api/v1/twilio/missed-call", async (req, res) => {
  const from = req.body.From || req.body.from || req.query.from;
  const to = req.body.To || req.body.to || req.query.to;
  await pool.query("insert into missed_calls (from_number, to_number, status) values ($1,$2,'new')", [from || "", to || ""]);
  res.json({ ok: true });
});

// ===== Autopilot: daily report writer =====
app.post("/api/v1/autopilot/tick", requireCommandKey, async (_req, res) => {
  try {
    const root = __dirname;
    const backlogPath = path.join(root, "backlog.md");
    let backlog = fs.existsSync(backlogPath) ? fs.readFileSync(backlogPath, "utf8") : "";
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

// ===== SELF-BUILD CORE WITH ROI GATES =====

// 1) Heartbeat
app.get("/internal/cron/autopilot", (req, res) => {
  if (!assertKey(req, res)) return;
  const line = `[${new Date().toISOString()}] autopilot:tick\n`;
  try { fs.appendFileSync(LOG_FILE, line); res.json({ ok:true, wrote: line }); }
  catch(e){ res.status(500).json({ ok:false, error: String(e) }); }
});

// 2) Planner -> OpenAI WITH ROI PRE-FLIGHT + SMART CONTEXT
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

// 3) Critique endpoint
app.post("/api/v1/build/critique-pr", requireCommandKey, async (req, res) => {
  if (!OPENAI_API_KEY) return res.status(500).json({ ok: false, error: "OPENAI_API_KEY missing" });

  try {
    const { pr_number, diff, summary } = req.body;
    if (!diff) return res.status(400).json({ ok: false, error: "diff required" });

    const critiquePrompt = `Grade this PR on scale 1-5:

Summary: ${summary || 'n/a'}
Diff: ${diff.slice(0, 3000)}

Criteria: Does it solve the goal? Bugs? Style match? Quality?

Return JSON:
{
  "score": 1-5,
  "reasoning": "2-3 sentences",
  "recommendation": "auto_merge|review_required|reject"
}`;

    const r = await safeFetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.1,
        messages: [{ role: "user", content: critiquePrompt }],
        response_format: { type: "json_object" }
      })
    });

    const json = await r.json();
    const critique = JSON.parse(json.choices?.[0]?.message?.content || "{}");

    const cost = trackCost(json.usage, "gpt-4o-mini");

    await pool.query(`
      update build_metrics 
      set outcome = $1, cost = cost + $2
      where pr_number = $3 and created_at > now() - interval '1 hour'
    `, [`critique_score_${critique.score}`, cost, pr_number]);

    console.log(`[critique] PR #${pr_number} scored ${critique.score}/5`);

    res.json({ ok: true, critique });
  } catch (e) {
    console.error('[critique]', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// 4) Apply plan -> branch/files/PR (with critique integration)
app.post("/api/v1/build/apply-plan", async (req, res) => {
  if (!assertKey(req, res)) return;
  if (!GITHUB_TOKEN) return res.status(500).json({ ok:false, error:"GITHUB_TOKEN missing" });

  try {
    const plan = req.body?.plan;
    const tokens_saved = req.body?.tokens_saved || 0;
    const roiCost = req.body?.roi_cost || 0;
    const planCost = req.body?.plan_cost || 0;
    const modelUsed = req.body?.model_used || "gpt-4o-mini";
    
    if (!plan?.actions?.length) return res.status(400).json({ ok:false, error:"no_actions" });

    const [owner, repo] = (GITHUB_REPO).split("/");
    const main = GITHUB_DEFAULT_BRANCH;

    const gh = async (apiPath, init = {}, retries = 3) => {
      const r = await safeFetch(`https://api.github.com${apiPath}`, {
        ...init,
        headers:{
          "Authorization":`Bearer ${GITHUB_TOKEN}`,
          "User-Agent":"robust-magic-builder",
          "Accept":"application/vnd.github+json",
          ...(init.headers||{})
        }
      }, retries);
      return r.json();
    };

    const ref = await gh(`/repos/${owner}/${repo}/git/refs/heads/${main}`);
    const sha = ref.object.sha;

    const prTitle = `auto: ${plan.summary}`;
    const openPRs = await gh(`/repos/${owner}/${repo}/pulls?state=open&per_page=50`);
    const sameTitlePR = (openPRs || []).find(p => p.title === prTitle);

    let branch;
    if (sameTitlePR?.head?.ref) {
      branch = sameTitlePR.head.ref;
    } else {
      branch = `auto/${Date.now()}`;
      await gh(`/repos/${owner}/${repo}/git/refs`, {
        method:"POST",
        body: JSON.stringify({ ref:`refs/heads/${branch}`, sha })
      });
    }

    const putFile = async (filepath, content) => {
      const encPath = encodeURIComponent(filepath);
      const get = await safeF
