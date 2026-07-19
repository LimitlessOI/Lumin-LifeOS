/**
 * SYNOPSIS: Founder SMS helper — tip can text ADAM_SMS_NUMBER (Twilio) without full phone stack.
 * Also provisions a valid Twilio From number when the configured caller ID is invalid.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
export function registerFounderSmsRoutes(app, deps = {}) {
  const requireKey = deps.requireKey;
  const logger = deps.logger || console;
  const setRailwayEnvVar = deps.setRailwayEnvVar;
  if (typeof requireKey !== 'function') {
    throw new Error('registerFounderSmsRoutes requires deps.requireKey');
  }

  function twilioAuth() {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) return null;
    return {
      sid,
      token,
      header: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
    };
  }

  async function twilioFetch(path, { method = 'GET', body } = {}) {
    const auth = twilioAuth();
    if (!auth) throw new Error('Twilio not configured on tip');
    const url = path.startsWith('http')
      ? path
      : `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(auth.sid)}${path}`;
    const resp = await fetch(url, {
      method,
      headers: {
        Authorization: auth.header,
        ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      },
      body: body || undefined,
    });
    const json = await resp.json().catch(() => ({}));
    return { ok: resp.ok, status: resp.status, json };
  }

  app.get('/api/v1/lifeos/founder/sms/numbers', requireKey, async (_req, res) => {
    try {
      const { ok, status, json } = await twilioFetch('/IncomingPhoneNumbers.json?PageSize=20');
      if (!ok) return res.status(502).json({ ok: false, error: json.message || `Twilio HTTP ${status}` });
      const numbers = (json.incoming_phone_numbers || []).map((n) => ({
        sid: n.sid,
        phone: n.phone_number,
        friendly: n.friendly_name,
      }));
      return res.json({
        ok: true,
        configured_from: process.env.TWILIO_PHONE_NUMBER || null,
        numbers,
      });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/v1/lifeos/founder/sms/provision-number', requireKey, async (req, res) => {
    try {
      const areaCode = String(req.body?.areaCode || '702').replace(/\D/g, '').slice(0, 3) || '702';
      const search = await twilioFetch(
        `/AvailablePhoneNumbers/US/Local.json?AreaCode=${encodeURIComponent(areaCode)}&SmsEnabled=true&VoiceEnabled=true&PageSize=5`
      );
      if (!search.ok) {
        return res.status(502).json({ ok: false, error: search.json.message || `search HTTP ${search.status}` });
      }
      const available = search.json.available_phone_numbers || [];
      if (!available.length) {
        return res.status(404).json({ ok: false, error: `No SMS numbers available in area ${areaCode}` });
      }
      const pick = available[0].phone_number;
      const buy = await twilioFetch('/IncomingPhoneNumbers.json', {
        method: 'POST',
        body: new URLSearchParams({
          PhoneNumber: pick,
          FriendlyName: 'LifeOS Founder SMS',
        }).toString(),
      });
      if (!buy.ok) {
        return res.status(502).json({ ok: false, error: buy.json.message || `purchase HTTP ${buy.status}` });
      }
      const phone = buy.json.phone_number || pick;
      process.env.TWILIO_PHONE_NUMBER = phone;
      let railway = null;
      if (typeof setRailwayEnvVar === 'function') {
        try {
          railway = await setRailwayEnvVar('TWILIO_PHONE_NUMBER', phone);
        } catch (err) {
          railway = { ok: false, error: err.message };
        }
      }
      logger.info?.({ phone }, '[FOUNDER-SMS] provisioned Twilio From number');
      return res.json({
        ok: true,
        phone,
        sid: buy.json.sid,
        applied_in_memory: true,
        railway,
      });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  async function resolveOwnedFrom() {
    const listed = await twilioFetch('/IncomingPhoneNumbers.json?PageSize=20');
    if (!listed.ok) return null;
    const owned = (listed.json.incoming_phone_numbers || [])
      .map((n) => n.phone_number)
      .filter(Boolean);
    return owned[0] || null;
  }

  async function sendTwilioSms({ to, from, body }) {
    const auth = twilioAuth();
    const params = new URLSearchParams({ To: to, From: from, Body: body.slice(0, 1500) });
    const resp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(auth.sid)}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: auth.header,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      }
    );
    const json = await resp.json().catch(() => ({}));
    return { ok: resp.ok, status: resp.status, json };
  }

  app.post('/api/v1/lifeos/founder/sms', requireKey, async (req, res) => {
    try {
      const auth = twilioAuth();
      const defaultTo = process.env.ADAM_SMS_NUMBER || process.env.ALERT_PHONE;
      const to = String(req.body?.to || defaultTo || '').trim();
      const body = String(req.body?.body || req.body?.message || '').trim();
      if (!auth) {
        return res.status(503).json({ ok: false, error: 'Twilio not configured on tip' });
      }
      if (!to || !body) {
        return res.status(400).json({ ok: false, error: 'to and body required (or set ADAM_SMS_NUMBER)' });
      }

      let from = String(req.body?.from || process.env.TWILIO_PHONE_NUMBER || '').trim();
      if (!from) {
        from = (await resolveOwnedFrom()) || '';
        if (from) process.env.TWILIO_PHONE_NUMBER = from;
      }
      if (!from) {
        return res.status(503).json({
          ok: false,
          error: 'TWILIO_PHONE_NUMBER not set — POST /api/v1/lifeos/founder/sms/provision-number first',
        });
      }

      let result = await sendTwilioSms({ to, from, body });
      const invalidFrom = !result.ok && /invalid from|caller id/i.test(String(result.json.message || ''));
      if (invalidFrom) {
        const owned = await resolveOwnedFrom();
        if (owned && owned !== from) {
          from = owned;
          process.env.TWILIO_PHONE_NUMBER = owned;
          if (typeof setRailwayEnvVar === 'function') {
            try {
              await setRailwayEnvVar('TWILIO_PHONE_NUMBER', owned);
            } catch {
              /* best-effort */
            }
          }
          result = await sendTwilioSms({ to, from, body });
        }
      }

      if (!result.ok) {
        logger.warn?.({ status: result.status, error: result.json.message }, '[FOUNDER-SMS] twilio failed');
        return res.status(502).json({
          ok: false,
          error: result.json.message || `Twilio HTTP ${result.status}`,
          from,
        });
      }
      return res.json({ ok: true, sid: result.json.sid, status: result.json.status, to, from });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * Start Twilio Outgoing Caller ID verification (works on trial).
   * Twilio calls the number and asks them to enter the validation code.
   * Body: { to }
   */
  app.post('/api/v1/lifeos/founder/voice/verify-caller-id', requireKey, async (req, res) => {
    try {
      const toRaw = String(req.body?.to || '').replace(/[^\d+]/g, '');
      if (!toRaw || toRaw.replace(/\D/g, '').length < 10) {
        return res.status(400).json({ ok: false, error: 'to phone required' });
      }
      const to = toRaw.startsWith('+') ? toRaw : `+1${toRaw.replace(/\D/g, '').slice(-10)}`;
      const result = await twilioFetch('/OutgoingCallerIds.json', {
        method: 'POST',
        body: new URLSearchParams({ PhoneNumber: to }).toString(),
      });
      if (!result.ok) {
        return res.status(502).json({
          ok: false,
          error: result.json.message || `Twilio HTTP ${result.status}`,
          code: result.json.code,
        });
      }
      return res.json({
        ok: true,
        phone: to,
        validation_code: result.json.validation_code,
        call_sid: result.json.call_sid,
        status: result.json.status || 'validation_started',
        note: 'Twilio is calling the number now — recipient must enter validation_code on keypad',
      });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  /**
   * Outbound voice to a published business line (B2B money path).
   * Body: { to, say?, businessName?, previewUrl? }
   */
  app.post('/api/v1/lifeos/founder/voice/call', requireKey, async (req, res) => {
    try {
      const auth = twilioAuth();
      if (!auth) return res.status(503).json({ ok: false, error: 'Twilio not configured on tip' });
      const to = String(req.body?.to || '').replace(/[^\d+]/g, '');
      if (!to || to.replace(/\D/g, '').length < 10) {
        return res.status(400).json({ ok: false, error: 'to phone required' });
      }
      let from = String(process.env.TWILIO_PHONE_NUMBER || '').trim() || (await resolveOwnedFrom()) || '';
      if (!from) {
        return res.status(503).json({ ok: false, error: 'No Twilio From — provision-number first' });
      }
      const businessName = String(req.body?.businessName || 'your office').slice(0, 80);
      const previewUrl = String(req.body?.previewUrl || '').slice(0, 200);
      const callback = process.env.ADAM_SMS_NUMBER || process.env.ALERT_PHONE || '';
      const say =
        String(req.body?.say || '').trim() ||
        [
          `Hello, this is a quick business message from Adam Hopkins with Limitless O S Site Builder.`,
          `I built a complimentary modern website preview for ${businessName}.`,
          previewUrl ? `You can view it online, and publishing is forty five dollars including two months of management.` : '',
          callback
            ? `Please call or text Adam at ${callback.replace(/\D/g, '').replace(/^1/, '')} if you are interested. Thank you.`
            : `Please email adam at hopkins group dot org if you are interested. Thank you.`,
        ]
          .filter(Boolean)
          .join(' ');
      const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Pause length="1"/><Say voice="alice">${say
        .replace(/&/g, 'and')
        .replace(/</g, '')
        .replace(/>/g, '')}</Say><Pause length="1"/></Response>`;
      const params = new URLSearchParams({
        To: to.startsWith('+') ? to : `+1${to.replace(/\D/g, '').slice(-10)}`,
        From: from,
        Twiml: twiml,
      });
      const resp = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(auth.sid)}/Calls.json`,
        {
          method: 'POST',
          headers: {
            Authorization: auth.header,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params,
        }
      );
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        return res.status(502).json({ ok: false, error: json.message || `Twilio HTTP ${resp.status}`, from });
      }
      logger.info?.({ to, sid: json.sid }, '[FOUNDER-VOICE] outbound call queued');
      return res.json({ ok: true, sid: json.sid, status: json.status, to: params.get('To'), from });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Read-only diagnostic (2026-07-19): the governed autonomous loop's
  // migrate.yml self-repair attempt built locally but failed to commit to
  // GitHub (github_commit_failed_after_local_ship). Working hypothesis:
  // .github/workflows/* writes need a token with the separate `workflow`
  // OAuth scope, not just repo/Contents access — every other file commit
  // worked all session, only this path failed. This can only be checked
  // server-side, where the real GITHUB_TOKEN actually lives.
  app.get('/api/v1/lifeos/founder/github-token-scopes', requireKey, async (_req, res) => {
    try {
      const token = process.env.GITHUB_TOKEN?.trim();
      if (!token) {
        return res.status(503).json({ ok: false, error: 'GITHUB_TOKEN not configured' });
      }
      const resp = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
      });
      const scopesHeader = resp.headers.get('x-oauth-scopes') || '';
      const scopes = scopesHeader.split(',').map((s) => s.trim()).filter(Boolean);
      return res.json({
        ok: resp.ok,
        status: resp.status,
        scopes,
        has_workflow_scope: scopes.includes('workflow'),
        has_repo_scope: scopes.includes('repo'),
      });
    } catch (err) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  });
}

export default registerFounderSmsRoutes;
