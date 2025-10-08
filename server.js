import express from "express";
import axios from "axios";
import dayjs from "dayjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Pool } from "pg";

// NEW: safe BoldTrail wrapper + admin routes
import { createLead, appendTranscript, tagLead } from "./src/integrations/boldtrail.js";
import { adminRouter } from "./src/routes/admin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve static assets (overlay, onboarding, etc.)
app.use(express.static(path.join(__dirname, "public")));
// Make Autopilot reports web-accessible
app.use("/reports", express.static(path.join(__dirname, "reports")));

const {
  DATABASE_URL,
  COMMAND_CENTER_KEY,
  WEBHOOK_SECRET,
  PORT = 8080,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN
} = process.env;

// ===== Postgres =====
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL?.includes("neon.tech")
    ? { rejectUnauthorized: false }
    : undefined,
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

// Mount admin API (used by public/onboarding.html)
app.use("/api/v1/admin", requireCommandKey, adminRouter);

// ===== Health =====
app.get("/healthz", async (req, res) => {
  try {
    const r = await pool.query("select now()");
    res.json({
      status: "healthy",
      database: "connected",
      timestamp: r.rows[0].now,
      version: "v1",
    });
  } catch {
    res.status(500).json({ status: "unhealthy" });
  }
});

// ===== Stats (secured) =====
app.get("/api/v1/calls/stats", requireCommandKey, async (req, res) => {
  const r = await pool.query(
    "select count(*)::int as count from calls where created_at > now() - interval '30 days'"
  );
  const last10 = await pool.query(
    "select id, created_at, phone, intent, score, duration from calls order by id desc limit 10"
  );
  res.json({ count: r.rows[0].count, last_10: last10.rows });
});

// ===== Vapi Qualification Webhook (secured by X-Webhook-Secret) =====
app.post(
  "/api/v1/vapi/qualification-complete",
  requireWebhookSecret,
  async (req, res) => {
    try {
      const {
        phoneNumber,
        buyOrSell,
        area,
        timeline,
        duration,
        transcript,
      } = req.body || {};

      // Simple scoring heuristic
      const score =
        (timeline || "").includes("30") || (duration || 0) > 60 ? "hot" :
        (duration || 0) > 20 ? "warm" : "cold";

      // 1) Create BoldTrail lead
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

        // 2) Attach transcript
        if (transcript) {
          await appendTranscript(boldtrailLeadId, transcript);
        }
        // 3) Tag if hot
        if (score === "hot") {
          await tagLead(boldtrailLeadId, "hot");
        }
      } catch (e) {
        console.error("BoldTrail error:", e?.response?.data || e.message);
      }

      // 4) Persist
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
  }
);

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

// ===== Twilio missed-call hook (future SMS loop) =====
app.post("/api/v1/twilio/missed-call", async (req, res) => {
  const from = req.body.From || req.body.from || req.query.from;
  const to = req.body.To || req.body.to || req.query.to;

  await pool.query(
    "insert into missed_calls (from_number, to_number, status) values ($1,$2,'new')",
    [from || "", to || ""]
  );

  res.json({ ok: true });
});

// ===== Autopilot tick (Cron) =====
app.post("/api/v1/autopilot/tick", requireCommandKey, async (req, res) => {
  try {
    const root = __dirname;
    const backlogPath = path.join(root, "backlog.md");
    let backlog = "";
    if (fs.existsSync(backlogPath)) {
      backlog = fs.readFileSync(backlogPath, "utf8");
      console.log("[autopilot] backlog.md found, length:", backlog.length);
    } else {
      console.log("[autopilot] no backlog.md");
    }

    // Generate daily report
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
      `Total calls today: ${totalRes.rows[0]?.c || 0}`,
      "",
      "By score:",
      ...countRes.rows.map(r => `- ${r.score || "unknown"}: ${r.c}`),
      "",
      "---",
      "Backlog snapshot:",
      "```",
      backlog.trim(),
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

// ===== Start server =====
app.listen(PORT, () => {
  console.log(`LifeOS ready on :${PORT}`);
});
