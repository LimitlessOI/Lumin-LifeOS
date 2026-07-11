/**
 * SYNOPSIS: Founder SMS helper — tip can text ADAM_SMS_NUMBER (Twilio) without full phone stack.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
export function registerFounderSmsRoutes(app, deps = {}) {
  const requireKey = deps.requireKey;
  const logger = deps.logger || console;
  if (typeof requireKey !== 'function') {
    throw new Error('registerFounderSmsRoutes requires deps.requireKey');
  }

  app.post('/api/v1/lifeos/founder/sms', requireKey, async (req, res) => {
    try {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const token = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_PHONE_NUMBER;
      const defaultTo = process.env.ADAM_SMS_NUMBER || process.env.ALERT_PHONE;
      const to = String(req.body?.to || defaultTo || '').trim();
      const body = String(req.body?.body || req.body?.message || '').trim();
      if (!sid || !token || !from) {
        return res.status(503).json({ ok: false, error: 'Twilio not configured on tip' });
      }
      if (!to || !body) {
        return res.status(400).json({ ok: false, error: 'to and body required (or set ADAM_SMS_NUMBER)' });
      }
      const auth = Buffer.from(`${sid}:${token}`).toString('base64');
      const params = new URLSearchParams({ To: to, From: from, Body: body.slice(0, 1500) });
      const resp = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params,
        }
      );
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        logger.warn?.({ status: resp.status, error: json.message }, '[FOUNDER-SMS] twilio failed');
        return res.status(502).json({ ok: false, error: json.message || `Twilio HTTP ${resp.status}` });
      }
      return res.json({ ok: true, sid: json.sid, status: json.status, to });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });
}

export default registerFounderSmsRoutes;
