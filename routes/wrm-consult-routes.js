/**
 * SYNOPSIS: Well Rounded Momma consult lead capture.
 * Public, rate-limited, honeypot-guarded form endpoint. A lead is ALWAYS captured
 * to the DB first (so it can never be silently lost the way the old broken Wix
 * booking link dropped a year of leads), then emailed to the practice inbox via
 * Postmark. A key-protected leads list is the human-readable safety net.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import express from "express";

const POSTMARK_API = "https://api.postmarkapp.com/email";

const CONSULT_TO = () =>
  String(process.env.WRM_CONSULT_EMAIL || "maternity@wellroundedmomma.com").trim();
const CONSULT_CC = () =>
  String(process.env.WRM_CONSULT_CC || process.env.ADAM_NOTIFY_EMAIL || "").trim();
const CALL_NUMBER = "702-478-5080";

function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function sendConsultEmail({ name, phone, email, preferredTime, message, leadId }) {
  const token = String(process.env.POSTMARK_SERVER_TOKEN || "").trim();
  const from = String(process.env.EMAIL_FROM || process.env.POSTMARK_FROM || "").trim();
  if (!token) return { sent: false, error: "POSTMARK_SERVER_TOKEN not set" };
  if (!from) return { sent: false, error: "EMAIL_FROM/POSTMARK_FROM not set" };

  const html = `<h2 style="font-family:Arial,sans-serif">New consultation request — Well Rounded Momma</h2>
    <p style="font-family:Arial,sans-serif;font-size:15px">
      <b>Name:</b> ${esc(name)}<br>
      <b>Phone:</b> ${esc(phone) || "(none provided)"}<br>
      <b>Email:</b> ${esc(email) || "(none provided)"}<br>
      <b>Best time to call:</b> ${esc(preferredTime) || "(none provided)"}
    </p>
    <p style="font-family:Arial,sans-serif;font-size:15px"><b>Message:</b><br>${
      esc(message).replace(/\n/g, "<br>") || "(none)"
    }</p>
    <hr>
    <p style="font-family:Arial,sans-serif;color:#888;font-size:12px">
      Lead #${leadId || "n/a"} · captured ${new Date().toISOString()} · reply to this email or call the client back to schedule.
    </p>`;
  const text = `New consultation request — Well Rounded Momma
Name: ${name}
Phone: ${phone || "(none)"}
Email: ${email || "(none)"}
Best time to call: ${preferredTime || "(none)"}
Message: ${message || "(none)"}
Lead #${leadId || "n/a"}`;

  const payload = {
    From: from,
    To: CONSULT_TO(),
    Subject: `New consult request — ${name}`,
    HtmlBody: html,
    TextBody: text,
    MessageStream: "outbound",
  };
  const cc = CONSULT_CC();
  if (cc) payload.Cc = cc;
  if (email) payload.ReplyTo = email;

  try {
    const res = await fetch(POSTMARK_API, {
      method: "POST",
      headers: {
        "X-Postmark-Server-Token": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { sent: false, error: json.Message || String(json.ErrorCode || res.status) };
    }
    return { sent: true, messageId: json.MessageID };
  } catch (err) {
    return { sent: false, error: err.message };
  }
}

export function registerWrmConsultRoutes(app, deps = {}) {
  const { pool, requireKey, logger = console } = deps;
  const router = express.Router();

  let schemaReady = false;
  async function ensureSchema() {
    if (schemaReady || !pool) return;
    await pool.query(`CREATE TABLE IF NOT EXISTS wrm_consult_leads (
      id BIGSERIAL PRIMARY KEY,
      name TEXT,
      phone TEXT,
      email TEXT,
      preferred_time TEXT,
      message TEXT,
      source TEXT,
      emailed BOOLEAN DEFAULT false,
      email_error TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`);
    schemaReady = true;
  }

  const hits = new Map();
  function rateLimited(ip) {
    const now = Date.now();
    const windowMs = 60_000;
    const max = 5;
    const arr = (hits.get(ip) || []).filter((t) => now - t < windowMs);
    arr.push(now);
    hits.set(ip, arr);
    if (hits.size > 5000) hits.clear();
    return arr.length > max;
  }

  router.post("/consult", async (req, res) => {
    try {
      const b = req.body || {};
      // Honeypot: real users never fill "company"; bots do.
      if (String(b.company || "").trim()) return res.json({ ok: true });

      const ip = String(req.headers["x-forwarded-for"] || req.ip || "")
        .split(",")[0]
        .trim();
      if (rateLimited(ip)) {
        return res
          .status(429)
          .json({ ok: false, error: `Too many requests. Please call ${CALL_NUMBER}.` });
      }

      const name = String(b.name || "").trim().slice(0, 120);
      const phone = String(b.phone || "").trim().slice(0, 40);
      const email = String(b.email || "").trim().slice(0, 160);
      const preferredTime = String(b.preferredTime || b.preferred_time || "").trim().slice(0, 120);
      const message = String(b.message || "").trim().slice(0, 2000);
      const source = String(b.source || "wellrounded-momma").trim().slice(0, 80);

      if (!name || (!phone && !email)) {
        return res.status(400).json({
          ok: false,
          error: "Please share your name and a phone number or email so Sherry can reach you.",
        });
      }

      let leadId = null;
      try {
        await ensureSchema();
        if (pool) {
          const r = await pool.query(
            `INSERT INTO wrm_consult_leads (name, phone, email, preferred_time, message, source)
             VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
            [name, phone, email, preferredTime, message, source]
          );
          leadId = r.rows[0]?.id || null;
        }
      } catch (dbErr) {
        logger.error?.("[WRM] consult DB capture failed", { error: dbErr.message });
      }

      const emailResult = await sendConsultEmail({
        name,
        phone,
        email,
        preferredTime,
        message,
        leadId,
      });

      if (pool && leadId) {
        pool
          .query(`UPDATE wrm_consult_leads SET emailed=$1, email_error=$2 WHERE id=$3`, [
            emailResult.sent,
            emailResult.sent ? null : String(emailResult.error || "").slice(0, 300),
            leadId,
          ])
          .catch(() => {});
      }

      if (!emailResult.sent) {
        logger.error?.("[WRM] consult email failed — lead retained in DB", {
          leadId,
          error: emailResult.error,
        });
      }

      // Fail only if we neither captured nor emailed — otherwise the lead is safe.
      if (!leadId && !emailResult.sent) {
        return res.status(500).json({
          ok: false,
          error: `We couldn't record your request. Please call Sherry directly at ${CALL_NUMBER}.`,
        });
      }

      return res.json({
        ok: true,
        message: "Thank you! Sherry will call you to schedule your consultation.",
        leadId,
      });
    } catch (err) {
      logger.error?.("[WRM] consult error", { error: err.message });
      return res.status(500).json({
        ok: false,
        error: `Something went wrong. Please call Sherry at ${CALL_NUMBER}.`,
      });
    }
  });

  const guard = typeof requireKey === "function" ? requireKey : (_req, _res, next) => next();
  router.get("/consult/leads", guard, async (req, res) => {
    try {
      await ensureSchema();
      const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
      const r = pool
        ? await pool.query(
            `SELECT id, name, phone, email, preferred_time, message, source, emailed, email_error, created_at
             FROM wrm_consult_leads ORDER BY id DESC LIMIT $1`,
            [limit]
          )
        : { rows: [] };
      res.json({ ok: true, count: r.rows.length, leads: r.rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.use("/api/v1/wrm", router);
  logger.info?.("✅ [WRM] Consult routes mounted at /api/v1/wrm/consult");
}

export default registerWrmConsultRoutes;