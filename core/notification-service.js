/**
 * NotificationService
 * - Email (recommended: Postmark) with suppression + event logging
 * - Intended as the single abstraction for outbound comms
 *
 * Env:
 * - EMAIL_PROVIDER: "postmark" (default) | "disabled"
 * - EMAIL_FROM: default From address (required for sending)
 * - POSTMARK_SERVER_TOKEN: Postmark server token (required if provider=postmark)
 * - EMAIL_WEBHOOK_SECRET: shared secret for webhook endpoints (required to accept webhooks)
 */

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function safeJson(value) {
  try {
    return JSON.stringify(value ?? null);
  } catch {
    return JSON.stringify({ error: "unserializable" });
  }
}

export class NotificationService {
  constructor({ pool }) {
    this.pool = pool;
    this.provider = (process.env.EMAIL_PROVIDER || "postmark").toLowerCase();
    this.fromDefault = process.env.EMAIL_FROM || null;
    this.postmarkToken = process.env.POSTMARK_SERVER_TOKEN || null;
  }

  /**
   * Fail-closed suppression check: if suppression table is unavailable,
   * we treat it as suppressed to avoid accidental sends.
   */
  async isEmailSuppressed(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return true;

    try {
      const result = await this.pool.query(
        `SELECT suppressed, reason, suppressed_at
         FROM email_suppressions
         WHERE email = $1
         LIMIT 1`,
        [normalized]
      );

      if (result.rows.length === 0) return false;
      return !!result.rows[0].suppressed;
    } catch (e) {
      // Fail-closed: if DB or table not ready, do not send.
      console.warn(`[EMAIL] Suppression check failed (fail-closed): ${e.message}`);
      return true;
    }
  }

  async logOutreach({
    campaignId = null,
    channel,
    recipient,
    subject = null,
    body = null,
    status,
    externalId = null,
  }) {
    try {
      await this.pool.query(
        `INSERT INTO outreach_log (campaign_id, channel, recipient, subject, body, status, external_id, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
        [campaignId, channel, recipient, subject, body, status, externalId]
      );
    } catch (e) {
      // Logging should never break sends
      console.warn(`[EMAIL] outreach_log insert failed: ${e.message}`);
    }
  }

  async logEmailEvent({
    provider,
    eventType,
    messageId = null,
    recipient = null,
    payload = null,
    severity = "info",
  }) {
    try {
      await this.pool.query(
        `INSERT INTO email_events (provider, event_type, message_id, recipient, severity, payload, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,NOW())`,
        [provider, eventType, messageId, recipient, severity, payload]
      );
    } catch (e) {
      console.warn(`[EMAIL] email_events insert failed: ${e.message}`);
    }
  }

  async suppressEmail(email, reason, provider = "unknown") {
    const normalized = normalizeEmail(email);
    if (!normalized) return;

    try {
      await this.pool.query(
        `INSERT INTO email_suppressions (email, suppressed, reason, provider, suppressed_at, created_at)
         VALUES ($1, true, $2, $3, NOW(), NOW())
         ON CONFLICT (email)
         DO UPDATE SET suppressed = true, reason = EXCLUDED.reason, provider = EXCLUDED.provider, suppressed_at = NOW()`,
        [normalized, reason || "suppressed", provider]
      );
    } catch (e) {
      console.warn(`[EMAIL] suppression upsert failed: ${e.message}`);
    }
  }

  async sendEmail({
    to,
    subject,
    text,
    html = null,
    from = null,
    campaignId = null,
    metadata = null,
  }) {
    const recipient = normalizeEmail(to);
    const fromAddr = from || this.fromDefault;

    if (!recipient) {
      return { success: false, error: "Missing recipient (to)" };
    }
    if (!fromAddr) {
      return { success: false, error: "EMAIL_FROM is not set" };
    }
    if (!subject) {
      return { success: false, error: "Missing subject" };
    }

    // Suppression / bounce protection (fail-closed on DB failure)
    const suppressed = await this.isEmailSuppressed(recipient);
    if (suppressed) {
      await this.logOutreach({
        campaignId,
        channel: "email",
        recipient,
        subject,
        body: text || html || "",
        status: "blocked_suppressed",
        externalId: null,
      });
      return { success: false, error: "Recipient is suppressed (bounce/complaint/blocked)" };
    }

    const bodyText = text || (html ? "HTML_EMAIL" : "");
    const provider = this.provider;

    // Fail-closed if provider is disabled/unconfigured
    if (provider === "disabled") {
      await this.logOutreach({
        campaignId,
        channel: "email",
        recipient,
        subject,
        body: bodyText,
        status: "blocked_disabled",
      });
      return { success: false, error: "Email provider disabled" };
    }

    if (provider !== "postmark") {
      await this.logOutreach({
        campaignId,
        channel: "email",
        recipient,
        subject,
        body: bodyText,
        status: "failed",
      });
      return { success: false, error: `Unsupported EMAIL_PROVIDER: ${provider}` };
    }

    if (!this.postmarkToken) {
      await this.logOutreach({
        campaignId,
        channel: "email",
        recipient,
        subject,
        body: bodyText,
        status: "failed",
      });
      return { success: false, error: "POSTMARK_SERVER_TOKEN not set" };
    }

    // Postmark send with retries
    const requestPayload = {
      From: fromAddr,
      To: recipient,
      Subject: subject,
      TextBody: text || undefined,
      HtmlBody: html || undefined,
      MessageStream: "outbound",
      Metadata: metadata || undefined,
      Tag: campaignId ? `campaign:${campaignId}` : undefined,
    };

    const maxAttempts = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const resp = await fetch("https://api.postmarkapp.com/email", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Postmark-Server-Token": this.postmarkToken,
          },
          body: JSON.stringify(requestPayload),
        });

        const respText = await resp.text();
        let json = null;
        try {
          json = JSON.parse(respText);
        } catch {
          json = { raw: respText };
        }

        if (!resp.ok) {
          const errMsg = json?.Message || json?.message || `Postmark HTTP ${resp.status}`;
          throw new Error(errMsg);
        }

        const messageId = json?.MessageID || json?.MessageId || null;

        await this.logOutreach({
          campaignId,
          channel: "email",
          recipient,
          subject,
          body: text || html || "",
          status: "sent",
          externalId: messageId,
        });

        await this.logEmailEvent({
          provider: "postmark",
          eventType: "sent",
          messageId,
          recipient,
          payload: safeJson({ at: nowIso(), response: json }),
          severity: "info",
        });

        return { success: true, provider: "postmark", messageId };
      } catch (e) {
        lastError = e;
        await this.logEmailEvent({
          provider: "postmark",
          eventType: "send_failed",
          messageId: null,
          recipient,
          payload: safeJson({ at: nowIso(), attempt, error: e.message }),
          severity: "error",
        });

        if (attempt < maxAttempts) {
          await sleep(250 * attempt * attempt);
          continue;
        }
      }
    }

    await this.logOutreach({
      campaignId,
      channel: "email",
      recipient,
      subject,
      body: bodyText,
      status: "failed",
    });

    return { success: false, error: lastError?.message || "Email send failed" };
  }

  /**
   * Postmark webhooks (bounce/spam/opens/clicks/etc)
   * We primarily use them for suppression on bounce/spam.
   */
  async handlePostmarkWebhook(event) {
    // Postmark sends either a single object or an array depending on configuration.
    const events = Array.isArray(event) ? event : [event];

    for (const e of events) {
      const type = String(e?.RecordType || e?.record_type || e?.Type || "unknown").toLowerCase();
      const recipient = normalizeEmail(e?.Recipient || e?.Email || e?.email || "");
      const messageId = e?.MessageID || e?.MessageId || e?.message_id || null;

      await this.logEmailEvent({
        provider: "postmark",
        eventType: type,
        messageId,
        recipient,
        payload: safeJson(e),
        severity: type.includes("bounce") || type.includes("spam") ? "warn" : "info",
      });

      // Suppress on hard bounce or spam complaint
      const bounceType = String(e?.Type || e?.BounceType || "").toLowerCase();
      const isHardBounce = type === "bounce" && (bounceType.includes("hard") || bounceType.includes("unknown"));
      const isSpam = type === "spamcomplaint" || type === "spam_complaint";

      if (recipient && (isHardBounce || isSpam)) {
        const reason = isSpam ? "spam_complaint" : `bounce:${bounceType || "unknown"}`;
        await this.suppressEmail(recipient, reason, "postmark");
      }
    }

    return { ok: true };
  }
}

export default NotificationService;

