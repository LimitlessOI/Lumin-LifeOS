// server.js
import express from "express";
import axios from "axios";
import dayjs from "dayjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";

// Safe wrappers / admin
import { createLead, appendTranscript, tagLead } from "./src/integrations/boldtrail.js";
import { adminRouter } from "./src/routes/admin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Static assets (overlay, onboarding, etc.)
app.use(express.static(path.join(__dirname, "public")));
// Serve generated reports as static files (if requested directly)
app.use("/reports", express.static(path.join(__dirname, "reports")));

const {
  DATABASE_URL,
  COMMAND_CENTER_KEY,
  WEBHOOK_SECRET,
  PORT = 8080,

  // Internal cron
  ENABLE_AUTOPILOT_CRON = "true", // "true" to run setInterval
  AUTOPILOT_INTERVAL_MIN = "15",

  // Self-build / planner
  OPENAI_API_KEY,
  GITHUB_TOKEN,
  GITHUB_REPO = "owner/repo",
  GITHUB_DEFAULT_BRANCH = "main",
} = process.env;

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
  // ---- Task Queue (tiny)
  await pool.query(`
    create table if not exists tasks (
      id serial primary key,
      created_at timestamptz default now(),
      updated_at timestamptz default now(),
      kind text not null,                       -- e.g. report | self_plan | apply_plan
      status text not null default 'queued',    -- queued | running | done | failed | blocked
      priority int not null default 5,          -- lower = sooner
      payload jsonb default '{}'::jsonb,
      result jsonb,
      blocked_reason text
    );
  `);
}
initDb().then(() => console.log("Database tables ready")).catch(console.error);

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
const wait = (ms)=>new Promise(r=>setTimeout(r,ms));

// Mount admin API (used by public/onboarding.html)
app.use("/api/v1/admin", requireCommandKey, adminRouter);

// ===== Health =====
app.get("/healthz", async (_req, res) => {
  try {
    const r = await pool.query("select now()");
    res.json({ status: "healthy", database: "connected", timestamp: r.rows[0].now, version: "v1" });
  } catch {
    res.status(500).json({ status: "unhealthy" });
  }
});

// ===== Stats (secured) =====
app.get("/api/v1/calls/stats", requireCommandKey, async (_req, res) => {
  const r = await pool.query(
    "select count(*)::int as count from calls where created_at > now() - interval '30 days'"
  );
  const last10 = await pool.query(
    "select id, created_at, phone, intent, score, duration from calls order by id desc limit 10"
  );
  res.json({ count: r.rows[0].count, last_10: last10.rows });
});

// ===== Vapi Qualification Webhook (secured by X-Webhook-Secret) =====
app.post("/api/v1/vapi/qualification-complete", requireWebhookSecret, async (req, res) => {
  try {
    const { phoneNumber, buyOrSell, area, timeline, duration, transcript } = req.body || {};
    const score =
      (timeline || "").includes("30") || (duration || 0) > 60 ? "hot" :
      (duration || 0) > 20 ? "warm" : "cold";

    let boldtrailLeadId = null;
    try {
      const lead = await createLead({
        phone: phoneNumber,
        intent: buyOrSell,
        area,
        timeline,
        duration,
        source: "Vapi Inbound",
      });
      boldtrailLeadId = lead?.id || null;
      if (transcript) await appendTranscript(boldtrailLeadId, transcript);
      if (score === "hot") await tagLead(boldtrailLeadId, "hot");
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
  const r = await pool.query(
    "select data from overlay_states where sid=$1 order by updated_at desc limit 1",
    [sid]
  );
  return r.rows[0]?.data || {};
}
app.get("/api/overlay/:sid/state", async (req, res) => {
  const state = await getOverlayState(req.params.sid);
  res.json(state);
});
app.post("/api/overlay/:sid/state", async (req, res) => {
  const state = req.body || {};
  await pool.query(
    `insert into overlay_states (sid, data) values ($1, $2)`,
    [req.params.sid, state]
  );
  res.json({ ok: true });
});

// Optional HTML catch-alls (makes /overlay/demo work even if file not present)
app.get("/overlay/:sid", (_req, res) => {
  res.sendFile(path.join(__dirname, "public/overlay/index.html"));
});
app.get("/overlay/:sid/control", (_req, res) => {
  res.sendFile(path.join(__dirname, "public/overlay/control.html"));
});

// ===== Twilio missed-call hook (future SMS loop) =====
app.post("/api/v1/twilio/missed-call", async (req, res) => {
  const from = req.body.From || req.body.from || req.query.from;
  const to   = req.body.To   || req.body.to   || req.query.to;
  await pool.query(
    "insert into missed_calls (from_number, to_number, status) values ($1,$2,'new')",
    [from || "", to || ""]
  );
  res.json({ ok: true });
});

// ===== Autopilot: generate report (shared function) =====
async function generateDailyReport() {
  const backlogPath = path.join(__dirname, "backlog.md");
  let backlog = "";
  if (fs.existsSync(backlogPath)) backlog = fs.readFileSync(backlogPath, "utf8");

  const today = dayjs().format("YYYY-MM-DD");
  const rp = path.join(__dirname, "reports");
  if (!fs.existsSync(rp)) fs.mkdirSync(rp, { recursive: true });

  const countRes = await pool.query(
    "select score, count(*)::int as c from calls where created_at::date = current_date group by score"
  );
  const totalRes = await pool.query(
    "select count(*)::int as c from calls where created_at::date = current_date"
  );

  const lines = [
    `# Daily Report - ${today}`,
    "",
    `Total calls today: ${totalRes.rows[0]?.c || 0}`,
    "",
    "By score:",
    ...countRes.rows.map(r => `- ${r.score || "unknown"}: ${r.c}`),
    "",
    "---",
    "Backlog snapshot:",
    "```",
    (backlog || "").trim(),
    "```",
  ].join("\n");

  const outFile = path.join(rp, `${today}.md`);
  fs.writeFileSync(outFile, lines, "utf8");
  console.log("[autopilot] wrote report:", outFile);
  return `/reports/${today}.md`;
}

// POST tick route (for manual trigger or external cron if desired)
app.post("/api/v1/autopilot/tick", requireCommandKey, async (_req, res) => {
  try {
    const report = await generateDailyReport();
    res.json({ ok: true, report });
  } catch (e) {
    console.error("[autopilot] error", e);
    res.status(500).json({ error: "autopilot_failed" });
  }
});

// Human-friendly index for /reports (directory listing)
app.get("/reports", async (_req, res) => {
  const rp = path.join(__dirname, "reports");
  try {
    const files = fs.existsSync(rp) ? fs.readdirSync(rp).filter(f => f.endsWith(".md")).sort().reverse() : [];
    if (!files.length) return res.status(404).send("No reports yet. Trigger one with POST /api/v1/autopilot/tick");
    const html = `
      <html><body style="font-family:system-ui;padding:24px">
        <h2>Reports</h2>
        <ul>
          ${files.map(f=>`<li><a href="/reports/${encodeURIComponent(f)}">${f}</a></li>`).join("")}
        </ul>
      </body></html>`;
    res.setHeader("Content-Type","text/html"); res.send(html);
  } catch {
    res.status(500).send("error listing reports");
  }
});

// ===== INTERNAL TIMER (replace Railway redeploy cron) =====
if (ENABLE_AUTOPILOT_CRON === "true") {
  const mins = Math.max(5, parseInt(AUTOPILOT_INTERVAL_MIN, 10) || 15);
  (async () => {
    // small stagger on boot
    await wait(3000);
    console.log(`[autopilot] internal cron enabled, every ${mins} min`);
    // first run is light—only write a heartbeat
    try { await generateDailyReport(); } catch (e) { console.error("[autopilot] boot run error", e); }
    setInterval(async () => {
      try { await generateDailyReport(); }
      catch (e) { console.error("[autopilot] interval error", e); }
    }, mins * 60 * 1000);
  })();
}

// ======================= SELF-BUILD CORE =======================
function assertKey(req, res) {
  const k = process.env.COMMAND_CENTER_KEY;
  const got = req.query.key || req.headers["x-command-key"];
  if (!k || got !== k) { res.status(401).json({error:"unauthorized"}); return false; }
  return true;
}

// 1) Heartbeat (cron or manual; writes to /mnt/data)
app.get("/internal/cron/autopilot", (req, res) => {
  if (!assertKey(req, res)) return;
  const p = "/mnt/data/autopilot.log";
  const line = `[${new Date().toISOString()}] autopilot:tick\n`;
  try { fs.appendFileSync(p, line); res.json({ok:true,wrote:line}); }
  catch(e){ res.status(500).json({ok:false,error:String(e)}); }
});

// 2) Planner (OpenAI; proposes next actions)
app.post("/api/v1/repair-self", async (req, res) => {
  if (!assertKey(req, res)) return;
  try {
    const p = "/mnt/data/autopilot.log";
    const logs = fs.existsSync(p) ? fs.readFileSync(p,"utf8") : "";
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

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method:"POST",
      headers:{
        "Content-Type":"application/json",
        "Authorization":`Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model:"gpt-4o-mini",
        temperature:0.2,
        messages:[{role:"system",content:system},{role:"user",content:user}],
        response_format:{type:"json_object"}
      })
    });
    if(!r.ok) throw new Error(`planner http ${r.status}`);
    const j = await r.json();
    const text = j.choices?.[0]?.message?.content || "{}";
    const plan = JSON.parse(text);
    res.json({ok:true, plan});
  } catch(e){ res.status(500).json({ok:false,error:String(e)}); }
});

// 3) Apply plan -> branch, files, PR (GitHub)
app.post("/api/v1/build/apply-plan", async (req, res) => {
  if (!assertKey(req, res)) return;
  try {
    const plan = req.body?.plan;
    if (!plan?.actions?.length) return res.status(400).json({ok:false,error:"no_actions"});

    const [owner,repo] = (GITHUB_REPO||"owner/repo").split("/");
    const main = GITHUB_DEFAULT_BRANCH || "main";

    const gh = async (apiPath, init={})=>{
      const r = await fetch(`https://api.github.com${apiPath}`,{
        ...init,
        headers:{
          "Authorization":`Bearer ${GITHUB_TOKEN}`,
          "User-Agent":"robust-magic-builder",
          "Accept":"application/vnd.github+json",
          ...(init.headers||{})
        }
      });
      if (!r.ok) throw new Error(`GitHub ${r.status} ${apiPath}: ${await r.text()}`);
      return r.json();
    };

    // get main sha & create branch
    const ref = await gh(`/repos/${owner}/${repo}/git/refs/heads/${main}`);
    const sha = ref.object.sha;
    const branch = `auto/${Date.now()}`;
    await gh(`/repos/${owner}/${repo}/git/refs`, {
      method:"POST",
      body: JSON.stringify({ref:`refs/heads/${branch}`, sha})
    });

    // helper to put/update file
    const putFile = async (filepath, content) => {
      const get = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filepath)}?ref=${branch}`,{
        headers:{"Authorization":`Bearer ${GITHUB_TOKEN}`,"Accept":"application/vnd.github+json"}
      });
      const exists = get.status===200 ? await get.json() : null;
      const body = {
        message:`chore(auto): update ${filepath}`,
        content: Buffer.from(content).toString("base64"),
        branch,
        ...(exists? {sha:exists.sha} : {})
      };
      const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filepath)}`,{
        method:"PUT",
        headers:{"Authorization":`Bearer ${GITHUB_TOKEN}`,"Accept":"application/vnd.github+json"},
        body: JSON.stringify(body)
      });
      if(!r.ok) throw new Error(`putFile ${filepath}: ${await r.text()}`);
      return r.json();
    };

    // plan doc
    const doc = `# Auto Plan\n\n${plan.summary}\n\n## Actions\n` +
      plan.actions.map((a,i)=>`- ${i+1}. ${a.title}\n  - rationale: ${a.rationale}\n  - risk: ${a.risk}\n  - files: ${(a.files||[]).map(f=>f.path).join(", ")||"-"}`).join("\n");
    await putFile("docs/auto/plan.md", doc);

    // scaffold files
    for (const a of plan.actions) {
      for (const f of (a.files||[])) {
        const scaffold = `// TODO(auto): ${a.title}\n// hint: ${f.hint||"implement here"}\n`;
        await putFile(f.path, scaffold);
      }
    }

    // open PR
    const pr = await gh(`/repos/${owner}/${repo}/pulls`,{
      method:"POST",
      body: JSON.stringify({
        title:`auto: ${plan.summary}`,
        head: branch,
        base: main,
        body: "Automated plan:\n```json\n"+JSON.stringify(plan,null,2)+"\n```"
      })
    });

    res.json({ok:true, pr});
  } catch(e){ res.status(500).json({ok:false,error:String(e)}); }
});

// ======================= TASK QUEUE =======================

// Enqueue: { kind, payload?, priority? }
app.post("/api/v1/tasks", requireCommandKey, async (req, res) => {
  const { kind, payload = {}, priority = 5 } = req.body || {};
  if (!kind) return res.status(400).json({ ok:false, error:"missing_kind" });
  const r = await pool.query(
    `insert into tasks (kind, payload, priority) values ($1,$2,$3) returning *`,
    [kind, payload, priority]
  );
  res.json({ ok:true, task:r.rows[0] });
});

// List (optionally filter ?status=queued)
app.get("/api/v1/tasks", requireCommandKey, async (req, res) => {
  const { status } = req.query;
  const r = await pool.query(
    `select * from tasks
     ${status ? `where status = $1` : ``}
     order by (case when status='queued' then 0 when status='running' then 1 when status='blocked' then 2 else 3 end),
              priority asc, id asc
     limit 100`,
    status ? [status] : []
  );
  res.json({ ok:true, tasks:r.rows });
});

// Block / Unblock
app.post("/api/v1/tasks/:id/block", requireCommandKey, async (req, res) => {
  const id = Number(req.params.id);
  const reason = req.body?.reason || "unspecified";
  const r = await pool.query(
    `update tasks set status='blocked', blocked_reason=$2, updated_at=now() where id=$1 returning *`,
    [id, reason]
  );
  res.json({ ok:true, task:r.rows[0] });
});
app.post("/api/v1/tasks/:id/unblock", requireCommandKey, async (req, res) => {
  const id = Number(req.params.id);
  const r = await pool.query(
    `update tasks set status='queued', blocked_reason=null, updated_at=now() where id=$1 returning *`,
    [id]
  );
  res.json({ ok:true, task:r.rows[0] });
});

// Done / Fail
app.post("/api/v1/tasks/:id/done", requireCommandKey, async (req, res) => {
  const id = Number(req.params.id);
  const result = req.body?.result || {};
  const r = await pool.query(
    `update tasks set status='done', result=$2, updated_at=now() where id=$1 returning *`,
    [id, result]
  );
  res.json({ ok:true, task:r.rows[0] });
});
app.post("/api/v1/tasks/:id/fail", requireCommandKey, async (req, res) => {
  const id = Number(req.params.id);
  const error = req.body?.error || "error";
  const r = await pool.query(
    `update tasks set status='failed', result=jsonb_build_object('error',$2), updated_at=now() where id=$1 returning *`,
    [id, error]
  );
  res.json({ ok:true, task:r.rows[0] });
});

// Status summary (for overlay/control)
app.get("/api/v1/status/summary", requireCommandKey, async (_req, res) => {
  const [counts, blockers] = await Promise.all([
    pool.query(`select status, count(*)::int as c from tasks group by status`),
    pool.query(`select id, kind, blocked_reason, created_at from tasks where status='blocked' order by id asc limit 5`)
  ]);

  // last report
  const rp = path.join(__dirname, "reports");
  const files = fs.existsSync(rp) ? fs.readdirSync(rp).filter(f=>f.endsWith(".md")).sort().reverse() : [];
  const lastReport = files[0] ? `/reports/${files[0]}` : null;

  res.json({
    ok: true,
    queue_counts: counts.rows,
    blocked: blockers.rows,
    last_report: lastReport
  });
});

// Minimal worker: run one queued task by priority
app.post("/api/v1/tasks/run-next", requireCommandKey, async (_req, res) => {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const pick = await client.query(
      `select * from tasks
       where status='queued'
       order by priority asc, id asc
       limit 1
       for update skip locked`
    );
    if (!pick.rowCount) {
      await client.query("commit");
      return res.json({ ok:true, message:"no_queued_tasks" });
    }
    const task = pick.rows[0];
    await client.query(`update tasks set status='running', updated_at=now() where id=$1`, [task.id]);
    await client.query("commit");

    // execute
    let out = null;
    if (task.kind === "report") {
      const report = await generateDailyReport();
      out = { report };
    } else if (task.kind === "self_plan") {
      if (!OPENAI_API_KEY) {
        await pool.query(`update tasks set status='blocked', blocked_reason='Missing OPENAI_API_KEY', updated_at=now() where id=$1`, [task.id]);
        return res.json({ ok:true, task, blocked:"OPENAI_API_KEY" });
      }
      // Reuse the planner endpoint via local call
      const r = await fetch(`http://127.0.0.1:${PORT}/api/v1/repair-self?key=${encodeURIComponent(COMMAND_CENTER_KEY)}`, { method:"POST" });
      const j = await r.json();
      out = j;
    } else if (task.kind === "apply_plan") {
      if (!GITHUB_TOKEN) {
        await pool.query(`update tasks set status='blocked', blocked_reason='Missing GITHUB_TOKEN', updated_at=now() where id=$1`, [task.id]);
        return res.json({ ok:true, task, blocked:"GITHUB_TOKEN" });
      }
      const plan = task.payload?.plan || null;
      if (!plan) {
        await pool.query(`update tasks set status='failed', result=jsonb_build_object('error','no_plan_payload'), updated_at=now() where id=$1`, [task.id]);
        return res.json({ ok:true, task, error:"no_plan_payload" });
      }
      const r = await fetch(`http://127.0.0.1:${PORT}/api/v1/build/apply-plan?key=${encodeURIComponent(COMMAND_CENTER_KEY)}`, {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ plan })
      });
      const j = await r.json();
      out = j;
    } else {
      await pool.query(`update tasks set status='failed', result=jsonb_build_object('error','unknown_kind'), updated_at=now() where id=$1`, [task.id]);
      return res.json({ ok:true, task, error:"unknown_kind" });
    }

    await pool.query(`update tasks set status='done', result=$2, updated_at=now() where id=$1`, [task.id, out]);
    res.json({ ok:true, ran: task, result: out });
  } catch (e) {
    console.error("[queue] worker error", e);
    res.status(500).json({ ok:false, error:String(e) });
  } finally {
    client.release();
  }
});

// ===== Start server =====
app.listen(PORT, () => {
  console.log(`LifeOS ready on :${PORT}`);
  // ----- INTERNAL CRON (optional, enabled via env) -----
const ENABLE_INTERNAL_CRON = (process.env.ENABLE_INTERNAL_CRON || "true").toLowerCase() === "true";

/**
 * callAutopilotTick() hits our own endpoint so auth & code paths are identical.
 */
async function callAutopilotTick() {
  try {
    const url = `http://127.0.0.1:${PORT}/api/v1/autopilot/tick`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "X-Command-Key": process.env.COMMAND_CENTER_KEY || "" }
    });
    const j = await r.json().catch(()=>({}));
    console.log("[internal-cron] tick ->", r.status, j.report || j.error || "");
  } catch (e) {
    console.error("[internal-cron] error", e.message);
  }
}

if (ENABLE_INTERNAL_CRON) {
  // Run once on boot (after 10s), then every 15 min.
  setTimeout(callAutopilotTick, 10_000);
  setInterval(callAutopilotTick, 15 * 60 * 1000);
  console.log("[internal-cron] enabled: every 15 minutes");
}
});
