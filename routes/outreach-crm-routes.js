/**
 * Outreach & CRM Routes
 * Extracted from server.js
 * @ssot docs/projects/AMENDMENT_08_OUTREACH_CRM.md
 */
import logger from '../services/logger.js';

export function createOutreachCrmRoutes(app, ctx) {
  const {
    pool,
    requireKey,
    outreachLimiter,
    outreachAutomation,
    crmSequenceRunner,
    notificationService,
    express,
  } = ctx;

// ==================== OUTREACH AUTOMATION ENDPOINTS ====================
app.post("/api/v1/outreach/campaign", requireKey, outreachLimiter, async (req, res) => {
  try {
    if (!outreachAutomation) {
      return res.status(503).json({ error: "Outreach system not initialized" });
    }

    const { name, targets, channels = ['email'], messageTemplate } = req.body;
    
    if (!name || !targets || !Array.isArray(targets)) {
      return res.status(400).json({ error: "Campaign name and targets array required" });
    }

    const results = await outreachAutomation.launchCampaign({
      name,
      targets,
      channels,
      messageTemplate,
    });

    res.json({ ok: true, ...results });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/outreach/campaign/:campaignId", requireKey, async (req, res) => {
  try {
    if (!outreachAutomation) {
      return res.status(503).json({ error: "Outreach system not initialized" });
    }

    const results = outreachAutomation.getCampaignResults(req.params.campaignId);
    if (!results) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    res.json({ ok: true, ...results });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/outreach/email", requireKey, outreachLimiter, async (req, res) => {
  try {
    if (!outreachAutomation) {
      return res.status(503).json({ error: "Outreach system not initialized" });
    }

    const { to, subject, body } = req.body;
    if (!to || !subject) {
      return res.status(400).json({ error: "To and subject required" });
    }

    const result = await outreachAutomation.sendEmail(to, subject, body || subject);
    res.json({ ok: result.success, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/outreach/sms", requireKey, outreachLimiter, async (req, res) => {
  try {
    if (!outreachAutomation) {
      return res.status(503).json({ error: "Outreach system not initialized" });
    }

    const { to, message } = req.body;
    if (!to || !message) {
      return res.status(400).json({ error: "To and message required" });
    }

    const result = await outreachAutomation.sendSMS(to, message);
    res.json({ ok: result.success, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/outreach/call", requireKey, outreachLimiter, async (req, res) => {
  try {
    if (!outreachAutomation) {
      return res.status(503).json({ error: "Outreach system not initialized" });
    }

    const { to, script } = req.body;
    if (!to) {
      return res.status(400).json({ error: "Phone number (to) required" });
    }

    const result = await outreachAutomation.makeCall(to, script);
    res.json({ ok: result.success, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/outreach/social", requireKey, outreachLimiter, async (req, res) => {
  try {
    if (!outreachAutomation) {
      return res.status(503).json({ error: "Outreach system not initialized" });
    }

    const { platform, content } = req.body;
    if (!platform || !content) {
      return res.status(400).json({ error: "Platform and content required" });
    }

    const result = await outreachAutomation.postToSocial(platform, content);
    res.json({ ok: result.success, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Manage recipient consent / DNC / quiet hours
app.post("/api/v1/outreach/recipients/upsert", requireKey, async (req, res) => {
  try {
    const {
      email,
      phone,
      consent_email = false,
      consent_sms = false,
      consent_call = false,
      do_not_contact = false,
      quiet_hours_start_utc = null,
      quiet_hours_end_utc = null,
      notes = null,
    } = req.body || {};

    if (!email && !phone) {
      return res.status(400).json({ ok: false, error: "email or phone required" });
    }

    const recipientKey = email
      ? `email:${String(email).trim().toLowerCase()}`
      : `phone:${String(phone).trim()}`;

    await pool.query(
      `INSERT INTO outreach_recipients (
         recipient_key, email, phone,
         consent_email, consent_sms, consent_call, do_not_contact,
         quiet_hours_start_utc, quiet_hours_end_utc, notes,
         created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
       ON CONFLICT (recipient_key)
       DO UPDATE SET
         email = COALESCE(EXCLUDED.email, outreach_recipients.email),
         phone = COALESCE(EXCLUDED.phone, outreach_recipients.phone),
         consent_email = EXCLUDED.consent_email,
         consent_sms = EXCLUDED.consent_sms,
         consent_call = EXCLUDED.consent_call,
         do_not_contact = EXCLUDED.do_not_contact,
         quiet_hours_start_utc = EXCLUDED.quiet_hours_start_utc,
         quiet_hours_end_utc = EXCLUDED.quiet_hours_end_utc,
         notes = EXCLUDED.notes,
         updated_at = NOW()`,
      [
        recipientKey,
        email ? String(email).trim().toLowerCase() : null,
        phone ? String(phone).trim() : null,
        !!consent_email,
        !!consent_sms,
        !!consent_call,
        !!do_not_contact,
        quiet_hours_start_utc === null ? null : Number(quiet_hours_start_utc),
        quiet_hours_end_utc === null ? null : Number(quiet_hours_end_utc),
        notes ? String(notes) : null,
      ]
    );

    res.json({ ok: true, recipient_key: recipientKey });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== CRM (LIGHTWEIGHT) + SEQUENCE RUNNER ====================
app.post("/api/v1/crm/contacts", requireKey, async (req, res) => {
  try {
    if (!crmSequenceRunner) {
      return res.status(503).json({ ok: false, error: "CRM not initialized" });
    }
    const { name, email, phone, company, tags = [] } = req.body || {};
    if (!email && !phone) {
      return res.status(400).json({ ok: false, error: "email or phone required" });
    }
    const contact = await crmSequenceRunner.upsertContact({ name, email, phone, company, tags });
    res.json({ ok: true, contact });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/crm/contacts", requireKey, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const result = await pool.query(
      `SELECT * FROM crm_contacts ORDER BY updated_at DESC LIMIT $1`,
      [Number(limit) || 50]
    );
    res.json({ ok: true, contacts: result.rows });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/crm/sequences", requireKey, async (req, res) => {
  try {
    if (!crmSequenceRunner) {
      return res.status(503).json({ ok: false, error: "CRM not initialized" });
    }
    const { name, description, steps = [] } = req.body || {};
    if (!name) return res.status(400).json({ ok: false, error: "name required" });
    const seq = await crmSequenceRunner.createSequence({ name, description });
    // steps: [{step_order, channel, delay_minutes, subject, body_template}]
    for (const step of steps) {
      await crmSequenceRunner.addSequenceStep(seq.id, step);
    }
    res.json({ ok: true, sequence: seq });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/crm/sequences", requireKey, async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM crm_sequences ORDER BY created_at DESC`);
    res.json({ ok: true, sequences: result.rows });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/crm/sequences/:sequenceId/enroll", requireKey, async (req, res) => {
  try {
    if (!crmSequenceRunner) {
      return res.status(503).json({ ok: false, error: "CRM not initialized" });
    }
    const { sequenceId } = req.params;
    const { contact_id } = req.body || {};
    if (!contact_id) return res.status(400).json({ ok: false, error: "contact_id required" });
    const enrollment = await crmSequenceRunner.enroll(Number(sequenceId), Number(contact_id));
    res.json({ ok: true, enrollment });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/crm/replies/capture", requireKey, async (req, res) => {
  try {
    if (!crmSequenceRunner) {
      return res.status(503).json({ ok: false, error: "CRM not initialized" });
    }
    const { contact_id, channel = "email", message, external_id } = req.body || {};
    if (!contact_id || !message) {
      return res.status(400).json({ ok: false, error: "contact_id and message required" });
    }
    const reply = await crmSequenceRunner.captureReply({
      contact_id: Number(contact_id),
      channel,
      message,
      external_id: external_id || null,
    });
    res.json({ ok: true, reply });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== EMAIL WEBHOOKS (POSTMARK) ====================
app.post("/api/v1/email/postmark/webhook", express.json({ type: "application/json" }), async (req, res) => {
  try {
    const secret = process.env.EMAIL_WEBHOOK_SECRET;
    if (!secret) {
      return res.status(503).json({ ok: false, error: "EMAIL_WEBHOOK_SECRET not configured" });
    }

    const provided = req.headers["x-email-webhook-secret"];
    if (!provided || provided !== secret) {
      return res.status(401).json({ ok: false, error: "Unauthorized webhook" });
    }

    if (!notificationService) {
      return res.status(503).json({ ok: false, error: "Notification service not initialized" });
    }

    const result = await notificationService.handlePostmarkWebhook(req.body);
    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});


}
