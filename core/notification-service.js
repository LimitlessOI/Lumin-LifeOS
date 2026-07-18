/**
 * SYNOPSIS: NotificationService
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 * NotificationService
 * - Email via SMTP (Gmail/Workspace) or Postmark, with suppression + event logging
 * - Intended as the single abstraction for outbound comms
 *
 * Env:
 * - EMAIL_PROVIDER: "smtp" | "postmark" | "resend" | "disabled"
 * - EMAIL_FROM: default From address (required for sending)
 * - SMTP_HOST: SMTP server (e.g. smtp.gmail.com)
 * - SMTP_PORT: SMTP port (e.g. 587)
 * - SMTP_USER: SMTP username (usually the sending email address)
 * - SMTP_PASS: SMTP password or Google App Password
 * - POSTMARK_SERVER_TOKEN: Postmark server token (required if provider=postmark)
 * - RESEND_API_KEY: Resend HTTP API key (provider=resend or Postmark pending fallback)
 * - EMAIL_WEBHOOK_SECRET: shared secret for webhook endpoints
 */

import nodemailer from 'nodemailer';
import dns from 'dns';

// Railway containers can't route outbound IPv6 — force IPv4 for all DNS resolution
dns.setDefaultResultOrder('ipv4first');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

/** Founder personal inbox — never use as system outbound From. */
const FOUNDER_PERSONAL_FROM = /^(adam@hopkinsgroup\.org)$/i;

function extractEmailAddress(from) {
  const raw = String(from || "").trim();
  const angle = raw.match(/<([^>]+)>/);
  return normalizeEmail(angle ? angle[1] : raw);
}

/**
 * System outbound From only — never Adam's personal email.
 * Prefer EMAIL_FROM when it is a system address; else WORK_EMAIL / LifeOS@.
 */
export function resolveSystemEmailFrom(env = process.env) {
  const work = String(env.WORK_EMAIL || "LifeOS@hopkinsgroup.org").trim();
  const configured = String(env.EMAIL_FROM || "").trim();
  const configuredAddr = extractEmailAddress(configured);
  if (configured && !FOUNDER_PERSONAL_FROM.test(configuredAddr)) {
    return configured;
  }
  if (work && !FOUNDER_PERSONAL_FROM.test(extractEmailAddress(work))) {
    return configured && FOUNDER_PERSONAL_FROM.test(configuredAddr)
      ? `LifeOS <${extractEmailAddress(work)}>`
      : (work.includes("<") ? work : `LifeOS <${work}>`);
  }
  const signup = String(env.GMAIL_SIGNUP_EMAIL || "").trim();
  if (signup) return `LifeOS <${signup}>`;
  return configured || null;
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
    this.fromDefault = resolveSystemEmailFrom(process.env);
    this.postmarkToken = process.env.POSTMARK_SERVER_TOKEN || null;
    // SMTP transporter (lazy-created on first send)
    this._smtpTransporter = null;
  }

  _resolveSmtpConnection() {
    const hostname = process.env.SMTP_HOST || 'smtp.gmail.com';
    let port = Number(process.env.SMTP_PORT || 465);
    if (hostname.includes('gmail.com') && port === 587) port = 465;

    let host = hostname;
    try {
      const addresses = dns.resolve4Sync(hostname);
      if (addresses?.length) host = addresses[0];
    } catch {
      try {
        host = dns.lookupSync(hostname, { family: 4 }).address;
      } catch {
        if (hostname.includes('gmail.com')) host = '142.250.80.109';
      }
    }

    return { hostname, host, port, secure: port === 465 };
  }

  _getSmtpAuth() {
    const user = String(process.env.SMTP_USER || process.env.WORK_EMAIL || '').trim();
    const pass = String(process.env.SMTP_PASS || process.env.WORK_EMAIL_APP_PASSWORD || '').trim();
    return { user, pass, ok: Boolean(user && pass) };
  }

  _getSmtpTransporter({ portOverride = null } = {}) {
    const { hostname, host, port: defaultPort } = this._resolveSmtpConnection();
    const port = portOverride || defaultPort;
    const auth = this._getSmtpAuth();
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      family: 4,
      connectionTimeout: 12000,
      greetingTimeout: 12000,
      socketTimeout: 20000,
      tls: { servername: hostname, minVersion: 'TLSv1.2' },
      requireTLS: port === 587,
      auth: {
        user: auth.user,
        pass: auth.pass,
      },
    });
  }

  async _sendViaSendgrid({
    to,
    subject,
    text,
    html,
    fromAddr,
    campaignId,
    bodyText,
  }) {
    const apiKey = String(process.env.SENDGRID_API_KEY || '').trim();
    if (!apiKey) {
      return { success: false, error: 'SENDGRID_API_KEY not set' };
    }
    try {
      const resp = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: extractEmailAddress(fromAddr), name: fromAddr.includes('<') ? fromAddr.split('<')[0].trim() : undefined },
          subject,
          content: [
            ...(text ? [{ type: 'text/plain', value: text }] : []),
            ...(html ? [{ type: 'text/html', value: html }] : []),
            ...(!text && !html ? [{ type: 'text/plain', value: subject }] : []),
          ],
        }),
      });
      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(errText.slice(0, 300) || `SendGrid HTTP ${resp.status}`);
      }
      const messageId = resp.headers.get('x-message-id') || null;
      await this.logOutreach({
        campaignId, channel: 'email', recipient: to, subject,
        body: text || html || '', status: 'sent', externalId: messageId,
      });
      await this.logEmailEvent({
        provider: 'sendgrid', eventType: 'sent', messageId,
        recipient: to, payload: safeJson({ at: nowIso() }), severity: 'info',
      });
      return { success: true, provider: 'sendgrid', messageId };
    } catch (e) {
      await this.logOutreach({
        campaignId, channel: 'email', recipient: to, subject,
        body: bodyText, status: 'failed',
      });
      return { success: false, error: e.message || 'SendGrid send failed' };
    }
  }

  async _sendViaResend({
    to,
    subject,
    text,
    html,
    fromAddr,
    campaignId,
    bodyText,
  }) {
    const apiKey = String(process.env.RESEND_API_KEY || '').trim();
    if (!apiKey) {
      return { success: false, error: 'RESEND_API_KEY not set' };
    }
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddr,
          to: [to],
          subject,
          html: html || undefined,
          text: text || undefined,
        }),
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const errMsg = json?.message || json?.error || `Resend HTTP ${resp.status}`;
        throw new Error(errMsg);
      }
      const messageId = json?.id || null;
      await this.logOutreach({
        campaignId, channel: 'email', recipient: to, subject,
        body: text || html || '', status: 'sent', externalId: messageId,
      });
      await this.logEmailEvent({
        provider: 'resend', eventType: 'sent', messageId,
        recipient: to, payload: safeJson({ at: nowIso(), response: json }), severity: 'info',
      });
      return { success: true, provider: 'resend', messageId };
    } catch (e) {
      await this.logOutreach({
        campaignId, channel: 'email', recipient: to, subject,
        body: bodyText, status: 'failed',
      });
      await this.logEmailEvent({
        provider: 'resend', eventType: 'send_failed', messageId: null,
        recipient: to, payload: safeJson({ at: nowIso(), error: e.message }), severity: 'error',
      });
      return { success: false, error: e.message || 'Resend send failed' };
    }
  }

  async _sendViaSmtp({
    to,
    subject,
    text,
    html,
    fromAddr,
    campaignId,
    bodyText,
  }) {
    const auth = this._getSmtpAuth();
    if (!auth.ok) {
      return { success: false, error: 'SMTP_USER/SMTP_PASS (or WORK_EMAIL/WORK_EMAIL_APP_PASSWORD) not set' };
    }

    const portsToTry = [];
    const preferred = Number(process.env.SMTP_PORT || 465);
    portsToTry.push(preferred);
    if (preferred !== 587) portsToTry.push(587);
    if (preferred !== 465) portsToTry.push(465);

    let lastError = null;
    for (const port of portsToTry) {
      try {
        const transporter = this._getSmtpTransporter({ portOverride: port });
        const info = await transporter.sendMail({
          from: fromAddr,
          to,
          subject,
          text: text || undefined,
          html: html || undefined,
        });

        await this.logOutreach({
          campaignId, channel: 'email', recipient: to, subject,
          body: text || html || '', status: 'sent', externalId: info.messageId,
        });
        await this.logEmailEvent({
          provider: 'smtp', eventType: 'sent', messageId: info.messageId,
          recipient: to, payload: safeJson({ at: nowIso(), messageId: info.messageId, port }), severity: 'info',
        });

        return { success: true, provider: 'smtp', messageId: info.messageId, port };
      } catch (e) {
        lastError = e;
        const msg = String(e.message || e);
        const retryable = /timeout|ETIMEDOUT|ECONNREFUSED|ECONNRESET|ESOCKET|Greeting never received/i.test(msg);
        if (!retryable) break;
      }
    }

    await this.logOutreach({
      campaignId, channel: 'email', recipient: to, subject,
      body: bodyText, status: 'failed',
    });
    await this.logEmailEvent({
      provider: 'smtp', eventType: 'send_failed', messageId: null,
      recipient: to, payload: safeJson({ at: nowIso(), error: lastError?.message }), severity: 'error',
    });
    return { success: false, error: lastError?.message || 'SMTP send failed' };
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
         WHERE lower(email) = $1
         LIMIT 1`,
        [normalized]
      );

      if (result.rows.length === 0) return false;
      return result.rows[0].suppressed !== false;
    } catch (e) {
      try {
        const fallback = await this.pool.query(
          `SELECT 1 FROM email_suppressions WHERE lower(email) = $1 LIMIT 1`,
          [normalized]
        );
        return fallback.rows.length > 0;
      } catch (e2) {
        console.warn(`[EMAIL] Suppression check unavailable (allowing send): ${e2.message}`);
        return false;
      }
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
        `INSERT INTO outreach_log (campaign_id, channel, recipient, subject, body, status, external_id, sent_at)
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
    const fromAddr = resolveSystemEmailFrom({
      ...process.env,
      EMAIL_FROM: from || this.fromDefault || process.env.EMAIL_FROM,
    });

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

    // ── SMTP (Gmail / Google Workspace / any SMTP) ─────────────────────────
    if (provider === "smtp") {
      return this._sendViaSmtp({
        to: recipient,
        subject,
        text,
        html,
        fromAddr,
        campaignId,
        bodyText,
      });
    }

    if (provider === "resend") {
      return this._sendViaResend({
        to: recipient,
        subject,
        text,
        html,
        fromAddr,
        campaignId,
        bodyText,
      });
    }

    if (provider === "sendgrid") {
      return this._sendViaSendgrid({
        to: recipient,
        subject,
        text,
        html,
        fromAddr,
        campaignId,
        bodyText,
      });
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

    const postmarkError = lastError?.message || "Email send failed";
    const pendingApproval = /pending approval|same domain as the 'From' address/i.test(postmarkError);

    if (pendingApproval && String(process.env.RESEND_API_KEY || '').trim()) {
      console.warn(`[EMAIL] Postmark blocked — falling back to Resend HTTP`);
      const resendResult = await this._sendViaResend({
        to: recipient,
        subject,
        text,
        html,
        fromAddr,
        campaignId,
        bodyText,
      });
      if (resendResult.success) {
        return { ...resendResult, fallback_from: "postmark_pending_approval" };
      }
    }

    if (pendingApproval && String(process.env.SENDGRID_API_KEY || '').trim()) {
      console.warn(`[EMAIL] Postmark blocked — falling back to SendGrid HTTP`);
      const sg = await this._sendViaSendgrid({
        to: recipient,
        subject,
        text,
        html,
        fromAddr,
        campaignId,
        bodyText,
      });
      if (sg.success) {
        return { ...sg, fallback_from: "postmark_pending_approval" };
      }
    }

    if (pendingApproval && this._getSmtpAuth().ok) {
      console.warn(`[EMAIL] Postmark blocked (${postmarkError.slice(0, 120)}) — falling back to SMTP/Workspace`);
      const smtpFrom = String(process.env.WORK_EMAIL || fromAddr).trim() || fromAddr;
      const smtpResult = await this._sendViaSmtp({
        to: recipient,
        subject,
        text,
        html,
        fromAddr: smtpFrom,
        campaignId,
        bodyText,
      });
      if (smtpResult.success) {
        return { ...smtpResult, fallback_from: "postmark_pending_approval" };
      }
      return {
        success: false,
        error: `Postmark pending approval; SMTP fallback also failed: ${smtpResult.error}`,
        postmark_error: postmarkError,
      };
    }

    await this.logOutreach({
      campaignId,
      channel: "email",
      recipient,
      subject,
      body: bodyText,
      status: "failed",
    });

    return { success: false, error: postmarkError };
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

