/**
 * routes/lifeos-engine-routes.js
 *
 * LifeOS Phase 2 — The Engine API
 * Mounted at /api/v1/lifeos/engine
 * Gateway callbacks mounted separately at /api/v1/lifeos
 *
 * Outreach:
 *   POST /api/v1/lifeos/engine/outreach           — create outreach task
 *   GET  /api/v1/lifeos/engine/outreach           — task queue
 *   POST /api/v1/lifeos/engine/outreach/:id/cancel
 *   POST /api/v1/lifeos/engine/outreach/:id/response — record reply/outcome
 *   POST /api/v1/lifeos/engine/outreach/process   — manually trigger queue processing
 *
 * Communication Gateway:
 *   GET  /api/v1/lifeos/engine/comms              — communication log
 *   POST /api/v1/lifeos/gateway/inbound/sms       — Twilio SMS webhook (no auth required)
 *   POST /api/v1/lifeos/gateway/inbound/call      — Twilio voice webhook (no auth required)
 *   POST /api/v1/lifeos/gateway/voicemail         — Twilio voicemail recording callback
 *
 * Calendar Rules:
 *   GET  /api/v1/lifeos/engine/calendar-rules
 *   POST /api/v1/lifeos/engine/calendar-rules
 *   DELETE /api/v1/lifeos/engine/calendar-rules/:id
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import express from 'express';
import { createOutreachEngine } from '../services/outreach-engine.js';
import { createCommunicationGateway } from '../services/communication-gateway.js';
import { createLifeOSCalendarService } from '../services/lifeos-calendar.js';

function createLifeOSEngineContext({ pool, notificationService, sendSMS, callCouncilMember, logger }) {
  const callAI = callCouncilMember
    ? async (p) => {
        const r = await callCouncilMember('anthropic', p);
        return typeof r === 'string' ? r : r?.content || '';
      }
    : null;

  const outreach = createOutreachEngine({ pool, notificationService, sendSMS, logger });
  const gateway = createCommunicationGateway({ pool, sendSMS, callAI, logger });

  async function resolveUserId(handleOrId) {
    if (!handleOrId) return null;
    if (!isNaN(handleOrId)) {
      const { rows } = await pool.query('SELECT id FROM lifeos_users WHERE id=$1', [handleOrId]);
      return rows[0]?.id || null;
    }
    const { rows } = await pool.query('SELECT id FROM lifeos_users WHERE user_handle=$1', [handleOrId]);
    return rows[0]?.id || null;
  }

  async function resolveUserByPhone(phone) {
    if (!phone) return null;
    try {
      const { rows } = await pool.query(
        `SELECT user_id FROM user_preferences WHERE key='gateway_phone' AND value=$1 LIMIT 1`,
        [phone]
      );
      return rows[0]?.user_id || null;
    } catch {
      return null;
    }
  }

  return { callAI, outreach, gateway, resolveUserId, resolveUserByPhone };
}

export function createLifeOSEngineRoutes({ pool, requireKey, notificationService, sendSMS, callCouncilMember, logger }) {
  const router = express.Router();
  const { outreach, gateway, resolveUserId } = createLifeOSEngineContext({
    pool,
    notificationService,
    sendSMS,
    callCouncilMember,
    logger,
  });
  const calendar = createLifeOSCalendarService(pool);

  // ── OUTREACH ──────────────────────────────────────────────────────────────

  router.get('/outreach', requireKey, async (req, res) => {
    try {
      const { user = 'adam', status } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const tasks = await outreach.getQueue(userId, { status });
      res.json({ ok: true, tasks, count: tasks.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/outreach', requireKey, async (req, res) => {
    try {
      const { user = 'adam', channel, recipient_name, recipient_email, recipient_phone, subject, body, execute_after, source } = req.body;
      if (!channel) return res.status(400).json({ ok: false, error: 'channel is required' });
      if (!body?.trim()) return res.status(400).json({ ok: false, error: 'body is required' });
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const task = await outreach.createTask({
        userId, channel, recipientName: recipient_name, recipientEmail: recipient_email,
        recipientPhone: recipient_phone, subject, body, executeAfter: execute_after, source,
      });
      res.status(201).json({ ok: true, task });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/outreach/:id/cancel', requireKey, async (req, res) => {
    try {
      const t = await outreach.cancelTask(req.params.id);
      if (!t) return res.status(404).json({ ok: false, error: 'Task not found' });
      res.json({ ok: true, task: t });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/outreach/:id/response', requireKey, async (req, res) => {
    try {
      const { response, outcome } = req.body;
      const t = await outreach.recordResponse(req.params.id, { response, outcome });
      res.json({ ok: true, task: t });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/outreach/process', requireKey, async (req, res) => {
    try {
      const result = await outreach.processQueue();
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── COMMUNICATION LOG ─────────────────────────────────────────────────────

  router.get('/comms', requireKey, async (req, res) => {
    try {
      const { user = 'adam', days = 7 } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const log = await gateway.getLog(userId, { days: parseInt(days) });
      res.json({ ok: true, log, count: log.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── CALENDAR RULES ────────────────────────────────────────────────────────

  router.get('/calendar-rules', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const { rows } = await pool.query(
        'SELECT * FROM lifeos_calendar_rules WHERE user_id=$1 AND active=true ORDER BY created_at',
        [userId]
      );
      res.json({ ok: true, rules: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/calendar-rules', requireKey, async (req, res) => {
    try {
      const { user = 'adam', rule_type, name, description, applies_to, time_start, time_end, action } = req.body;
      if (!rule_type || !name) return res.status(400).json({ ok: false, error: 'rule_type and name required' });
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const { rows } = await pool.query(`
        INSERT INTO lifeos_calendar_rules (user_id, rule_type, name, description, applies_to, time_start, time_end, action)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *
      `, [userId, rule_type, name, description, applies_to || [], time_start || null, time_end || null, action || 'decline']);
      res.status(201).json({ ok: true, rule: rows[0] });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.delete('/calendar-rules/:id', requireKey, async (req, res) => {
    try {
      await pool.query('UPDATE lifeos_calendar_rules SET active=false WHERE id=$1', [req.params.id]);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── CALENDAR DOMAIN ───────────────────────────────────────────────────────

  router.get('/calendar/status', requireKey, async (req, res) => {
    try {
      const { user = 'adam' } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const [google, calendars] = await Promise.all([
        calendar.getGoogleStatus(String(user), userId),
        calendar.listCalendars(userId),
      ]);
      res.json({ ok: true, google, calendars });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/calendar/events', requireKey, async (req, res) => {
    try {
      const { user = 'adam', from, to, lane = '', limit = 100 } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const events = await calendar.listEvents(userId, { from, to, lane, limit });
      res.json({ ok: true, events, count: events.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/calendar/events', requireKey, async (req, res) => {
    try {
      const { user = 'adam', ...payload } = req.body;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const event = await calendar.createEvent(userId, payload);
      res.status(201).json({ ok: true, event });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.patch('/calendar/events/:id', requireKey, async (req, res) => {
    try {
      const { user = 'adam', ...payload } = req.body;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const event = await calendar.updateEvent(userId, req.params.id, payload);
      if (!event) return res.status(404).json({ ok: false, error: 'Event not found' });
      res.json({ ok: true, event });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.delete('/calendar/events/:id', requireKey, async (req, res) => {
    try {
      const user = req.query.user || req.body?.user || 'adam';
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const deleted = await calendar.deleteEvent(userId, req.params.id);
      if (!deleted) return res.status(404).json({ ok: false, error: 'Event not found' });
      res.json({ ok: true, deleted: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/calendar/google/connect', requireKey, async (req, res) => {
    try {
      const user = String(req.query.user || 'adam');
      const result = await calendar.getGoogleConnectUrl(user);
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/calendar/google/callback', async (req, res) => {
    try {
      const code = String(req.query.code || '').trim();
      const user = String(req.query.state || 'adam').trim() || 'adam';
      if (!code) return res.status(400).send('Missing Google OAuth code.');
      await calendar.handleGoogleCallback(code, user);
      const target = `${String(process.env.RAILWAY_PUBLIC_DOMAIN || process.env.PUBLIC_BASE_URL || '').trim().replace(/\/$/, '') || ''}/lifeos-engine.html?calendar=connected`;
      if (/^https?:\/\//i.test(target)) return res.redirect(target);
      return res.redirect('/lifeos-engine.html?calendar=connected');
    } catch (err) {
      logger?.error?.(`[LIFEOS/CALENDAR/CALLBACK] ${err.message}`);
      res.status(500).send(`Google Calendar connection failed: ${err.message}`);
    }
  });

  router.post('/calendar/google/sync', requireKey, async (req, res) => {
    try {
      const user = String(req.body?.user || req.query.user || 'adam');
      const userId = await resolveUserId(user);
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const result = await calendar.syncGooglePrimaryCalendar(userId, user);
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}

export function createLifeOSGatewayRoutes({ pool, sendSMS, callCouncilMember, logger }) {
  const router = express.Router();
  const { gateway, resolveUserByPhone } = createLifeOSEngineContext({
    pool,
    notificationService: null,
    sendSMS,
    callCouncilMember,
    logger,
  });

  // ── TWILIO WEBHOOKS (no auth — Twilio signs with X-Twilio-Signature) ──────

  router.post('/gateway/inbound/sms', async (req, res) => {
    try {
      const { From, Body, To } = req.body;
      await gateway.handleInboundSMS({ from: From, body: Body, to: To });
      res.set('Content-Type', 'text/xml').send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
    } catch (err) {
      logger?.error?.(`[GATEWAY/SMS] ${err.message}`);
      res.set('Content-Type', 'text/xml').send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
    }
  });

  router.post('/gateway/inbound/call', async (req, res) => {
    try {
      const { From, To } = req.body;
      const userId = await resolveUserByPhone(To);
      const { rows: uRows } = userId
        ? await pool.query('SELECT display_name FROM lifeos_users WHERE id=$1', [userId])
        : { rows: [] };
      const twiml = gateway.generateCallScreenTwiML({ from: From, userId, userName: uRows[0]?.display_name });
      res.set('Content-Type', 'text/xml').send(twiml);
    } catch (err) {
      logger?.error?.(`[GATEWAY/CALL] ${err.message}`);
      res.set('Content-Type', 'text/xml').send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>An error occurred. Please try again.</Say></Response>`);
    }
  });

  router.post('/gateway/voicemail', async (req, res) => {
    try {
      const { RecordingUrl } = req.body;
      const { from, userId } = req.query;
      await gateway.handleVoicemail({ from, recordingUrl: RecordingUrl, userId });
      res.set('Content-Type', 'text/xml').send(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Thank you for your message. Goodbye.</Say></Response>`);
    } catch (err) {
      logger?.error?.(`[GATEWAY/VOICEMAIL] ${err.message}`);
      res.sendStatus(200);
    }
  });

  return router;
}
