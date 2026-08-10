/**
 * SYNOPSIS: Exports createSystemNotifyRoutes — routes/system-notify-routes.js.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

import express from 'express';

async function postmarkSend({ to, subject, text, from, token }) {
  const response = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'X-Postmark-Server-Token': token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      From: from,
      To: to,
      Subject: subject,
      TextBody: text,
      MessageStream: 'outbound',
    }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.Message) {
    return { sent: false, error: json.Message || response.statusText || `postmark_http_${response.status}` };
  }
  return { sent: true, message_id: json.MessageID || null };
}

// Fallback path: same proven shape as services/password-reset-email.js's
// smtpSend -- Gmail SMTP via nodemailer using WORK_EMAIL/WORK_EMAIL_APP_PASSWORD,
// used when Postmark isn't configured or its stored token is invalid (found
// live 2026-08-10: production's POSTMARK_SERVER_TOKEN rejects with "does not
// contain a valid Server token").
async function smtpSend({ to, subject, text, from }) {
  const smtpUser = String(process.env.SMTP_USER || process.env.WORK_EMAIL || '').trim();
  const smtpPass = String(process.env.SMTP_PASS || process.env.WORK_EMAIL_APP_PASSWORD || '').trim();
  if (!smtpUser || !smtpPass) {
    return { sent: false, error: 'smtp_credentials_not_configured' };
  }
  const nodemailer = await import('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: smtpUser, pass: smtpPass },
    // Many PaaS hosts block outbound SMTP ports at the network level (spam-relay
    // abuse prevention) -- without these, a blocked port hangs the whole request
    // instead of failing fast. Found live 2026-08-10: a real request hung past a
    // 15s hard curl timeout with zero response.
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
  });
  const info = await transporter.sendMail({ from: from || smtpUser, to, subject, text });
  return { sent: true, message_id: info.messageId || null };
}

export function createSystemNotifyRoutes({ requireKey, logger }) {
  const router = express.Router();

  router.post('/email', requireKey, async (req, res) => {
    try {
      const { to, subject, text } = req.body;
      if (!to || !subject || !text) {
        res.status(400).json({ ok: false, error: 'to, subject, and text are required' });
        return;
      }

      const token = String(process.env.POSTMARK_SERVER_TOKEN || '').trim();
      const from = String(process.env.EMAIL_FROM || process.env.POSTMARK_FROM || '').trim();

      let result = { sent: false, error: 'no_provider_configured' };
      if (token && from) {
        result = await postmarkSend({ to, subject, text, from, token });
        if (!result.sent) {
          logger?.warn?.({ error: result.error }, '[SYSTEM-NOTIFY] postmark failed, trying smtp fallback');
        }
      }
      if (!result.sent) {
        const smtpResult = await smtpSend({ to, subject, text, from });
        if (smtpResult.sent) result = smtpResult;
        else if (result.error === 'no_provider_configured') result = smtpResult;
      }

      if (!result.sent) {
        res.status(502).json({ ok: false, error: result.error });
        return;
      }
      res.json({ ok: true, message_id: result.message_id || null });
    } catch (err) {
      if (logger) {
        logger.error({ err: err.message }, '[SYSTEM-NOTIFY] send failed');
      }
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}

export default { createSystemNotifyRoutes };