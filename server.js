// server.js (FULL FILE – with ROI gates, metrics, budget control)
import express from "express";
import dayjs from "dayjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";

// integrations & routes
import { createLead, appendTranscript, tagLead } from "./src/integrations/boldtrail.js";
import { adminRouter } from "./src/routes/admin.js";

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
      timestamp timestamptz default now(),
      model text not null,
      tokens_in int default 0,
      tokens_out int default 0,
      cost numeric(10,4) default 0,
      pr_number int,
      pr_url text,
      summary text,
      outcome text default 'pending',
      context_size int default 0
    );
  `);
}
initDb().then(() => console.log("Database tables ready (with metrics)")).catch(console.error);

// ===== Budget helpers =====
async function getTodaySpend() {
  const r = await pool.query(`
    select coalesce(sum(cost), 0) as total
    from build_metrics
    where timestamp::date = current_date
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
    res.json({ status: "healthy", database: "connected", timestamp: r.rows[0].now, version: "v4-roi" });
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
        count(*) filter (where outcome = 'merged')::int as merged_count
      from build_metrics
      where timestamp > now() - interval '7 days'
    `);

    const highCostRes = await pool.query(`
      select timestamp, model, tokens_in, tokens_out, cost, pr_url, outcome
      from build_metrics
      where timestamp > now() - interval '7 days'
      order by cost desc
      limit 10
    `);

    const lowRoiRes = await pool.query(`
      select timestamp, summary, cost, outcome as status
      from build_metrics
      where timestamp > now() - interval '7 days'
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

// 2) Planner -> OpenAI WITH ROI PRE-FLIGHT
app.post("/api/v1/repair-self", async (req, res) => {
  if (!assertKey(req, res)) return;
  if (!OPENAI_API_KEY) return res.status(500).json({ ok:false, error:"OPENAI_API_KEY missing" });

  try {
    const logs = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, "utf8") : "";
    
    // STEP 1: Quick ROI estimation with mini model
    const estimatorPrompt = `Analyze these recent logs and estimate ROI for next build:
${logs.slice(-4000)}

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
    
    // Log the estimate
    const estimatorCost = ((estimatorJson.usage?.prompt_tokens || 0) * 0.00015 / 1000) + 
                          ((estimatorJson.usage?.completion_tokens || 0) * 0.0006 / 1000);
    
    await pool.query(`
      insert into build_metrics (model, tokens_in, tokens_out, cost, summary, outcome)
      values ($1, $2, $3, $4, $5, 'roi_check')
    `, [
      'gpt-4o-mini',
      estimatorJson.usage?.prompt_tokens || 0,
      estimatorJson.usage?.completion_tokens || 0,
      estimatorCost,
      `ROI Check: ${estimate.reasoning || 'n/a'}`
    ]);

    console.log('[ROI] Estimate:', estimate);

    // GATE: Abort if low ROI
    if (!estimate.should_build || (estimate.estimated_value_usd || 0) < 0.50) {
      return res.json({
        ok: true,
        skip: true,
        reason: "Low ROI detected - not worth building",
        estimate
      });
    }

    // STEP 2: Full planning with tiered model selection
    let useModel = "gpt-4o-mini"; // default
    if ((estimate.estimated_lines || 0) > 100 || estimate.risk === 'high') {
      useModel = "gpt-4o"; // upgrade for complex/risky
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
    const user = `Logs (latest first):\n${logs.slice(-12000)}`;

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

    // Log full plan cost
    const inputPrice = useModel === 'gpt-4o' ? 0.0025 : 0.00015;
    const outputPrice = useModel === 'gpt-4o' ? 0.01 : 0.0006;
    const planCost = ((planJson.usage?.prompt_tokens || 0) * inputPrice / 1000) +
                     ((planJson.usage?.completion_tokens || 0) * outputPrice / 1000);

    await pool.query(`
      insert into build_metrics (model, tokens_in, tokens_out, cost, summary, outcome, context_size)
      values ($1, $2, $3, $4, $5, 'planned', $6)
    `, [
      useModel,
      planJson.usage?.prompt_tokens || 0,
      planJson.usage?.completion_tokens || 0,
      planCost,
      plan.summary || 'n/a',
      logs.length
    ]);

    console.log(`[PLAN] Using ${useModel}, cost: $${planCost.toFixed(4)}`);

    res.json({ ok: true, plan, estimate, model_used: useModel });
  } catch (e) {
    console.error('[repair-self]', e);
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// 3) Apply plan -> branch/files/PR (with PR de-dup + retries + critique)
app.post("/api/v1/build/apply-plan", async (req, res) => {
  if (!assertKey(req, res)) return;
  if (!GITHUB_TOKEN) return res.status(500).json({ ok:false, error:"GITHUB_TOKEN missing" });

  try {
    const plan = req.body?.plan;
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

    // get main sha
    const ref = await gh(`/repos/${owner}/${repo}/git/refs/heads/${main}`);
    const sha = ref.object.sha;

    // Try to re-use an open PR with the same summary
    const prTitle = `auto: ${plan.summary}`;
    const openPRs = await gh(`/repos/${owner}/${repo}/pulls?state=open&per_page=50`);
    const sameTitlePR = (openPRs || []).find(p => p.title === prTitle);

    // Determine branch name: reuse existing PR's head or create a new branch
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

    // helper to create/update file
    const putFile = async (filepath, content) => {
      const encPath = encodeURIComponent(filepath);
      const get = await safeFetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encPath}?ref=${branch}`,{
        headers:{ "Authorization":`Bearer ${GITHUB_TOKEN}`, "Accept":"application/vnd.github+json" }
      }).catch(() => null);

      const exists = get && get.ok ? await get.json() : null;

      const body = {
        message:`chore(auto): update ${filepath}`,
        content: Buffer.from(content).toString("base64"),
        branch,
        ...(exists? { sha:exists.sha } : {})
      };
      const r = await safeFetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encPath}`,{
        method:"PUT",
        headers:{ "Authorization":`Bearer ${GITHUB_TOKEN}`, "Accept":"application/vnd.github+json" },
        body: JSON.stringify(body)
      });
      return r.json();
    };

    // seed/refresh plan doc
    const doc = `# Auto Plan\n\n${plan.summary}\n\n## Actions\n` +
      plan.actions.map((a,i)=>`- ${i+1}. ${a.title}\n  - rationale: ${a.rationale}\n  - risk: ${a.risk}\n  - files: ${(a.files||[]).map(f=>f.path).join(", ")||"-"}`).join("\n");
    await putFile("docs/auto/plan.md", doc);

    // scaffold files from actions
    for (const a of plan.actions) {
      for (const f of (a.files||[])) {
        const header = (f.type === "create")
          ? `// TODO(auto-create): ${a.title}\n// hint: ${f.hint || "implement here"}\n`
          : `// TODO(auto-modify): ${a.title}\n// hint: ${f.hint || "implement here"}\n`;
        await putFile(f.path, header);
      }
    }

    // open or update PR
    let pr = sameTitlePR;
    if (!pr) {
      pr = await gh(`/repos/${owner}/${repo}/pulls`,{
        method:"POST",
        body: JSON.stringify({
          title: prTitle,
          head: branch,
          base: main,
          body: "Automated plan:\n```json\n"+JSON.stringify(plan,null,2)+"\n```"
        })
      });
    } else {
      // update PR body to reflect newest plan
      await gh(`/repos/${owner}/${repo}/pulls/${pr.number}`,{
        method:"PATCH",
        body: JSON.stringify({
          body: "Automated plan (updated):\n```json\n"+JSON.stringify(plan,null,2)+"\n```"
        })
      });
    }

    // Update metrics with PR info
    await pool.query(`
      update build_metrics 
      set pr_number = $1, pr_url = $2, outcome = 'pr_opened'
      where outcome = 'planned' and timestamp > now() - interval '5 minutes'
    `, [pr.number, pr.html_url]);

    res.json({ ok:true, pr, reused_existing_pr: Boolean(sameTitlePR) });
  } catch(e){ 
    console.error('[apply-plan]', e);
    res.status(500).json({ ok:false, error:String(e) }); 
  }
});

// 4) One-click chain: plan -> PR with BUDGET CHECK + debounce
app.post("/internal/autopilot/build-now", async (req, res) => {
  const got = req.query.key || req.headers["x-command-key"];
  if (!COMMAND_CENTER_KEY || got !== COMMAND_CENTER_KEY) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  const BASE = (PUBLIC_BASE_URL || "").replace(/\/+$/, "");
  if (!BASE) return res.status(500).json({ ok:false, error:"PUBLIC_BASE_URL not set" });

  // CHECK BUDGET FIRST
  const budget = await checkBudget();
  if (budget.exceeded) {
    const msg = `Budget exhausted: $${budget.spent.toFixed(2)} / $${budget.limit} today`;
    fs.appendFileSync(LOG_FILE, `[${new Date().toISOString()}] autopilot:budget_exceeded\n`);
    return res.status(402).json({
      ok: false,
      budget_exceeded: true,
      message: msg,
      spent: budget.spent,
      limit: budget.limit
    });
  }

  // Debounce (unless force=1)
  const force = String(req.query.force || "0") === "1";
  if (!force) {
    const gate = shouldBuild(MIN_BUILD_INTERVAL_MINUTES);
    if (!gate.allowed) {
      const msg = `debounced: please wait ~${gate.waitMinutes} min`;
      const line = `[${new Date().toISOString()}] autopilot:debounce ${msg}\n`;
      fs.appendFileSync(LOG_FILE, line);
      return res.status(202).json({ ok:false, debounced:true, message: msg, min_interval: MIN_BUILD_INTERVAL_MINUTES });
    }
  }

  try {
    // log a heartbeat for context
    const line = `[${new Date().toISOString()}] autopilot:build-now${force ? " (force)" : ""}\n`;
    fs.appendFileSync(LOG_FILE, line);

    // 1) planner (with ROI gate)
    const planRes = await safeFetch(`${BASE}/api/v1/repair-self?key=${encodeURIComponent(COMMAND_CENTER_KEY)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({})
    });
    const planPayload = await planRes.json();
    
    // Check if ROI gate rejected
    if (planPayload.skip) {
      const skipLine = `[${new Date().toISOString()}] autopilot:skipped - ${planPayload.reason}\n`;
      fs.appendFileSync(LOG_FILE, skipLine);
      return res.json({ 
        ok: true, 
        skipped: true, 
        reason: planPayload.reason,
        estimate: planPayload.estimate 
      });
    }

    const plan = planPayload.plan;

    // 2) builder
    const prRes = await safeFetch(`${BASE}/api/v1/build/apply-plan?key=${encodeURIComponent(COMMAND_CENTER_KEY)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan })
    });
    const pr = await prRes.json();

    writeStampNow(); // success -> update debounce stamp
    res.json({ ok: true, plan_summary: plan?.summary, pr, model: planPayload.model_used });
  } catch (e) {
    console.error("[build-now]", e);
    res.status(500).json({ ok:false, error:String(e) });
  }
});

// ---- Overlay status JSON (last 2 log lines) ----
app.get("/api/overlay/status", (_req, res) => {
  try {
    const text = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, "utf8") : "";
    const lines = text.trim().split("\n").slice(-2);
    res.json({ ok: true, last: lines });
  } catch (e) { res.status(500).json({ ok:false, error:String(e) }); }
});

// ===== Start server =====
app.listen(PORT, () => {
  console.log(`LifeOS ready on :${PORT} with ROI gates & budget control`);
});
