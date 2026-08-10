/**
 * SYNOPSIS: Exports createSystemNotifyRoutes — routes/system-notify-routes.js.
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

import express from 'express';

export function createSystemNotifyRoutes({ requireKey, logger }) {
  const router = express.Router();

  router.post('/email', requireKey, async (req, res) => {
    try {
      const { to, subject, text } = req.body;
      const token = String(process.env.POSTMARK_SERVER_TOKEN || '').trim();
      const from = String(process.env.EMAIL_FROM || process.env.POSTMARK_FROM || '').trim();

      if (!token || !from) {
        res.status(503).json({ ok: false, error: 'email not configured' });
        return;
      }

      if (!to || !subject || !text) {
        res.status(400).json({ ok: false, error: 'to, subject, and text are required' });
        return;
      }

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

      const postmarkResponse = await response.json();

      if (postmarkResponse.Message || response.status !== 200) {
        res.status(502).json({ ok: false, error: postmarkResponse.Message || response.statusText });
        return;
      }

      res.json({ ok: true, message_id: postmarkResponse.MessageID });
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