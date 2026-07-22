/**
 * SYNOPSIS: Well Rounded Momma consult lead capture.
 * Public, rate-limited, honeypot-guarded form endpoint. A lead is ALWAYS captured
 * to the DB first (so it can never be silently lost the way the old broken Wix
 * booking link dropped a year of leads), then emailed to the practice inbox via
 * Postmark. A key-protected leads list is the human-readable safety net.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
import express from "express";
import { NotificationService } from "../core/notification-service.js";

const CONSULT_TO = () =>
  String(process.env.WRM_CONSULT_EMAIL || "maternity@wellroundedmomma.com").trim();
// Fallback recipient on the same domain as the system From address. Used only if
// the primary send fails (e.g. an email provider that is still pending approval
// and can't reach cross-domain) — so a lead is never merely captured-but-unseen.
const CONSULT_FALLBACK_TO = () =>
  String(process.env.WRM_CONSULT_FALLBACK_EMAIL || process.env.ADAM_NOTIFY_EMAIL || process.env.WORK_EMAIL || "").trim();
const CALL_NUMBER = "702-478-5080";

function esc(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildConsultBody({ name, phone, email, preferredTime, message, leadId, forwardedFor }) {
  const banner = forwardedFor
    ? `<p style="font-family:Arial,sans-serif;background:#fff6ec;border:1px solid #e6cba8;padding:10px 12px;border-radius:8px;font-size:13px">
        Forwarded to you because the practice inbox (${esc(forwardedFor)}) could not be reached directly. Please pass this lead to Sherry.</p>`
    : "";
  const html = `${banner}<h2 style="font-family:Arial,sans-serif">New consultation request — Well Rounded Momma</h2>
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
  return { html, text };
}

async function sendConsultEmail(notifier, lead) {
  const subject = `New consult request — ${lead.name}`;
  const primary = buildConsultBody(lead);
  let result;
  try {
    result = await notifier.sendEmail({
      to: CONSULT_TO(),
      subject,
      html: primary.html,
      text: primary.text,
      campaignId: "wrm-consult",
    });
  } catch (err) {
    result = { success: false, error: err.message };
  }
  if (result?.success) {
    return { sent: true, to: CONSULT_TO(), provider: result.provider, messageId: result.messageId };
  }

  // Primary delivery failed — forward to a reachable same-domain inbox so the lead is SEEN, not just stored.
  const fallbackTo = CONSULT_FALLBACK_TO();
  if (fallbackTo) {
    const fwd = buildConsultBody({ ...lead, forwardedFor: CONSULT_TO() });
    try {
      const fb = await notifier.sendEmail({
        to: fallbackTo,
        subject: `[FWD] ${subject}`,
        html: fwd.html,
        text: fwd.text,
        campaignId: "wrm-consult",
      });
      if (fb?.success) {
        return {
          sent: true,
          to: fallbackTo,
          forwarded: true,
          provider: fb.provider,
          messageId: fb.messageId,
          primary_error: String(result?.error || "").slice(0, 300),
        };
      }
      return { sent: false, error: `primary+fallback failed: ${result?.error} | ${fb?.error}` };
    } catch (err) {
      return { sent: false, error: `primary failed (${result?.error}); fallback threw: ${err.message}` };
    }
  }
  return { sent: false, error: String(result?.error || "email send failed") };
}

export function registerWrmConsultRoutes(app, deps = {}) {
  const { pool, requireKey, logger = console } = deps;
  const router = express.Router();
  const notifier = new NotificationService({ pool });

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

      const emailResult = await sendConsultEmail(notifier, {
        name,
        phone,
        email,
        preferredTime,
        message,
        leadId,
      });

      if (pool && leadId) {
        const note = emailResult.sent
          ? emailResult.forwarded
            ? `forwarded to ${emailResult.to} (primary ${CONSULT_TO()} unreachable: ${emailResult.primary_error})`
            : null
          : String(emailResult.error || "").slice(0, 300);
        pool
          .query(`UPDATE wrm_consult_leads SET emailed=$1, email_error=$2 WHERE id=$3`, [
            emailResult.sent,
            note,
            leadId,
          ])
          .catch(() => {});
      }

      if (!emailResult.sent) {
        logger.error?.("[WRM] consult email failed — lead retained in DB", {
          leadId,
          error: emailResult.error,
        });
      } else if (emailResult.forwarded) {
        logger.warn?.("[WRM] consult forwarded to fallback inbox — primary unreachable", {
          leadId,
          fallback: emailResult.to,
          primary_error: emailResult.primary_error,
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