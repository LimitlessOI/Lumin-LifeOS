// server.js
import express from "express";
import axios from "axios";
import dayjs from "dayjs";
import fs from "fs";
import path from "path";
import serveIndex from "serve-index";
import { fileURLToPath } from "url";
import { Pool } from "pg";

// Integrations / routes
import { createLead, appendTranscript, tagLead } from "./src/integrations/boldtrail.js";
import { adminRouter } from "./src/routes/admin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Static (overlay, onboarding, etc.)
app.use(express.static(path.join(__dirname, "public")));

// ===== Env + DB toggle =====
const {
  COMMAND_CENTER_KEY,
  WEBHOOK_SECRET,
  PORT = 8080,
  // DB toggle
  DB_MODE = "prod",
  DATABASE_URL,                // prod
  DATABASE_URL_SANDBOX,        // sandbox
} = process.env;

// pick DB url
const DB_MODE_NORM = String(DB_MODE || "prod").toLowerCase().trim();
const DB_URL =
  DB_MODE_NORM === "sandbox" && DATABASE_URL_SANDBOX
    ? DATABASE_URL_SANDBOX
    : DATABASE_URL;

if (!DB_URL) {
  console.error("[boot] No DATABASE_URL set (or sandbox url). Set Railway → Variables.");
  process.exit(1);
}
console.log(`[boot] DB_MODE=${DB_MODE_NORM} → using ${DB_MODE_NORM === "sandbox" ? "DATABASE_URL_SANDBOX" : "DATABASE_URL"}`);

// ===== Postgres =====
const pool = new Pool({
  connectionString: DB_URL,
  ssl: DB_URL?.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
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

// ===== Health =====
app.get("/healthz", async (_req, res) => {
  try {
    const r = await pool.query("select now()");
    res.json({
      status: "healthy",
      database: "connected",
      timestamp: r.rows[0].now,
      version: "v1",
      db_mode: DB_MODE_NORM,
    });
  } catch {
    res.status(500).json({ status: "unhealthy" });
  }
});

// ===== Admin API (onboarding form) =====
app.use("/api/v1/admin", requireCommandKey, adminRouter);

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

// ===== Vapi Qualification Webhook (secured) =====
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

// ===== Overlay State APIs =====
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
  await pool.query(`insert into overlay_states (sid, data) values ($1, $2)`, [req.params.sid, state]);
  res.json({ ok: true });
});

// Overlay HTML routes
app.get("/overlay/:sid", (_req, res) => {
  res.sendFile(path.join(__dirname, "public/overlay/index.html"));
});
app.get("/overlay/:sid/control", (_req, res) => {
  res.sendFile(path.join(__dirname, "public/overlay/control.html"));
});

// ===== Twilio missed-call hook (future SMS) =====
app.post("/api/v1/twilio/missed-call", async (req, res) => {
  const from = req.body.From || req.body.from || req.query.from;
  const to   = req.body.To   || req.body.to   || req.query.to;
  await pool.query(
    "insert into missed_calls (from_number, to_number, status) values ($1,$2,'new')",
    [from || "", to || ""]
  );
  res.json({ ok: true });
});

// ===== Autopilot tick (writes /reports/YYYY-MM-DD.md) =====
app.post("/api/v1/autopilot/tick", requireCommandKey, async (_req, res) => {
  try {
    const root = __dirname;
    const backlogPath = path.join(root, "backlog.md");
    let backlog = fs.existsSync(backlogPath) ? fs.readFileSync(backlogPath, "utf8") : "";

    const today = dayjs().format("YYYY-MM-DD");
    const rp = path.join(root, "reports");
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
      `DB mode: ${DB_MODE_NORM}`,
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

    res.json({ ok: true, report: `/reports/${today}.md` });
  } catch (e) {
    console.error("[autopilot] error", e);
    res.status(500).json({ error: "autopilot_failed" });
  }
});

// ===== Self-build core (same as you added) =====
function assertKey(req, res) {
  const k = process.env.COMMAND_CENTER_KEY;
  const got = req.query.key || req.headers["x-command-key"];
  if (!k || got !== k) { res.status(401).json({ error: "unauthorized" }); return false; }
  return true;
}

// 1) Heartbeat
app.get("/internal/cron/autopilot", (req, res) => {
  if (!assertKey(req, res)) return;
  const p = "/mnt/data/autopilot.log";
  const line = `[${new Date().toISOString()}] autopilot:tick\n`;
  try { fs.appendFileSync(p, line); res.json({ ok: true, wrote: line }); }
  catch (e) { res.status(500).json({ ok: false, error: String(e) }); }
});

// 2) Planner
app.post("/api/v1/repair-self", async (req, res) => {
  if (!assertKey(req, res)) return;
  try {
    const p = "/mnt/data/autopilot.log";
    const logs = fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "";
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
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        response_format: { type: "json_object" }
      })
    });
    if (!r.ok) throw new Error(`planner http ${r.status}`);
    const j = await r.json();
    const text = j.choices?.[0]?.message?.content || "{}";
    const plan = JSON.parse(text);
    res.json({ ok: true, plan });
  } catch (e) { res.status(500).json({ ok: false, error: String(e) }); }
});

// 3) Apply plan → PR
app.post("/api/v1/build/apply-plan", async (req, res) => {
  if (!assertKey(req, res)) return;
  try {
    const plan = req.body?.plan;
    if (!plan?.actions?.length) return res.status(400).json({ ok: false, error: "no_actions" });

    const [owner, repo] = (process.env.GITHUB_REPO || "owner/repo").split("/");
    const main = process.env.GITHUB_DEFAULT_BRANCH || "main";

    const gh = async (apiPath, init = {}) => {
      const r = await fetch(`https://api.github.com${apiPath}`, {
        ...init,
        headers: {
          "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`,
          "User-Agent": "robust-magic-builder",
          "Accept": "application/vnd.github+json",
          ...(init.headers || {})
        }
      });
      if (!r.ok) throw new Error(`GitHub ${r.status} ${apiPath}: ${await r.text()}`);
      return r.json();
    };

    // branch off main
    const ref = await gh(`/repos/${owner}/${repo}/git/refs/heads/${main}`);
    const sha = ref.object.sha;
    const branch = `auto/${Date.now()}`;
    await gh(`/repos/${owner}/${repo}/git/refs`, {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha })
    });

    // helper to put/update a file
    const putFile = async (filepath, content) => {
      const get = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filepath)}?ref=${branch}`,
        { headers: { "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`, "Accept": "application/vnd.github+json" } }
      );
      const exists = get.status === 200 ? await get.json() : null;
      const body = {
        message: `chore(auto): update ${filepath}`,
        content: Buffer.from(content).toString("base64"),
        branch,
        ...(exists ? { sha: exists.sha } : {})
      };
      const r = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(filepath)}`,
        { method: "PUT", headers: { "Authorization": `Bearer ${process.env.GITHUB_TOKEN}`, "Accept": "application/vnd.github+json" }, body: JSON.stringify(body) }
      );
      if (!r.ok) throw new Error(`putFile ${filepath}: ${await r.text()}`);
      return r.json();
    };

    // write plan doc + scaffolds
    const doc = `# Auto Plan\n\n${plan.summary}\n\n## Actions\n` +
      plan.actions.map((a,i)=>`- ${i+1}. ${a.title}\n  - rationale: ${a.rationale}\n  - risk: ${a.risk}\n  - files: ${(a.files||[]).map(f=>f.path).join(", ")||"-"}`).join("\n");
    await putFile("docs/auto/plan.md", doc);

    for (const a of plan.actions) {
      for (const f of (a.files || [])) {
        const scaffold = `// TODO(auto): ${a.title}\n// hint: ${f.hint || "implement here"}\n`;
        await putFile(f.path, scaffold);
      }
    }

    // open PR
    const pr = await gh(`/repos/${owner}/${repo}/pulls`, {
      method: "POST",
      body: JSON.stringify({
        title: `auto: ${plan.summary}`,
        head: branch,
        base: main,
        body: "Automated plan:\n```json\n" + JSON.stringify(plan, null, 2) + "\n```"
      })
    });

    res.json({ ok: true, pr });
  } catch (e) { res.status(500).json({ ok: false, error: String(e) }); }
});

// ===== Reports: static + index listing =====
const reportsDir = path.join(__dirname, "reports");
if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
// serve files + directory index
app.use("/reports", express.static(reportsDir), serveIndex(reportsDir, { icons: true }));

// ===== Start server =====
app.listen(PORT, () => {
  console.log(`LifeOS ready on :${PORT}`);
});

// ===== OPTIONAL: Internal cron that calls our own tick (same auth path) =====
const ENABLE_INTERNAL_CRON = (process.env.ENABLE_INTERNAL_CRON || "true").toLowerCase() === "true";
async function callAutopilotTick() {
  try {
    const url = `http://127.0.0.1:${PORT}/api/v1/autopilot/tick`;
    const r = await fetch(url, { method: "POST", headers: { "X-Command-Key": process.env.COMMAND_CENTER_KEY || "" } });
    const j = await r.json().catch(()=>({}));
    console.log("[internal-cron] tick ->", r.status, j.report || j.error || "");
  } catch (e) {
    console.error("[internal-cron] error", e.message);
  }
}
if (ENABLE_INTERNAL_CRON) {
  // once after boot (10s), then every 15 min
  setTimeout(callAutopilotTick, 10_000);
  setInterval(callAutopilotTick, 15 * 60 * 1000);
  console.log("[internal-cron] enabled: every 15 minutes");
}
