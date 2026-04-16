/**
 * routes/lifeos-health-routes.js
 * LifeOS Phase 3 — Health Intelligence API
 * Mounted at /api/v1/lifeos/health
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

'use strict';

import express from 'express';
import { createHealthKitBridge } from '../services/healthkit-bridge.js';
import { createHealthPatternEngine } from '../services/health-pattern-engine.js';
import { createEmergencyDetection } from '../services/emergency-detection.js';
import { createMedicalContextGenerator } from '../services/medical-context-generator.js';

/**
 * @param {{
 *   pool: import('pg').Pool,
 *   requireKey: import('express').RequestHandler,
 *   callCouncilMember: Function,
 *   sendSMS: Function,
 *   logger: import('pino').Logger
 * }} opts
 */
export function createLifeOSHealthRoutes({ pool, requireKey, callCouncilMember, sendSMS, logger }) {
  const router = express.Router();

  const hkBridge = createHealthKitBridge({ pool, logger });
  const patternEngine = createHealthPatternEngine({ pool, callAI: callCouncilMember, logger });
  const emergencyDetection = createEmergencyDetection({ pool, sendSMS, logger });
  const medicalGenerator = createMedicalContextGenerator({ pool, callAI: callCouncilMember });

  /**
   * Resolve a user_id from a handle ('adam','sherry') or numeric string.
   * Returns null if the handle doesn't map to a known user.
   * @param {string|number} handleOrId
   * @returns {Promise<number|null>}
   */
  async function resolveUserId(handleOrId) {
    if (!handleOrId) return null;
    const str = String(handleOrId).trim().toLowerCase();
    // If it's numeric, use directly
    if (/^\d+$/.test(str)) return parseInt(str, 10);
    // Otherwise look up by username / handle
    const { rows } = await pool.query(
      `SELECT id FROM lifeos_users WHERE LOWER(username) = $1 OR LOWER(handle) = $1 LIMIT 1`,
      [str]
    );
    return rows[0]?.id ?? null;
  }

  /**
   * Validate the HealthKit webhook token via query param.
   * Separate from requireKey to allow iOS Shortcuts to call without headers.
   */
  function requireWebhookToken(req, res, next) {
    const token = req.query.token;
    const expected = process.env.COMMAND_CENTER_KEY;
    if (!expected) {
      logger.warn('lifeos-health-routes: COMMAND_CENTER_KEY not set');
      return res.status(500).json({ error: 'Server not configured' });
    }
    if (token !== expected) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    next();
  }

  // ── Wearable data ───────────────────────────────────────────────────────────

  /**
   * POST /wearable
   * Ingest HealthKit metrics from iOS Shortcuts (token auth via ?token=).
   * Body: { user, metrics: [{metric, value, unit, recorded_at}], source? }
   */
  router.post('/wearable', requireWebhookToken, async (req, res) => {
    try {
      const { user, metrics, source } = req.body;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(400).json({ error: 'Unknown user' });
      if (!Array.isArray(metrics) || metrics.length === 0) {
        return res.status(400).json({ error: 'metrics array required' });
      }
      const count = await hkBridge.ingestMetrics({ userId, metrics, source });
      res.json({ ok: true, inserted: count });
    } catch (err) {
      logger.error({ err }, 'POST /wearable error');
      res.status(500).json({ error: 'Failed to ingest metrics' });
    }
  });

  /**
   * GET /wearable/latest
   * Latest value per metric for a user.
   * Query: user, metrics (comma-separated), days
   */
  router.get('/wearable/latest', requireKey, async (req, res) => {
    try {
      const { user, metrics: metricsParam, days } = req.query;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(400).json({ error: 'Unknown user' });

      const metrics = metricsParam ? String(metricsParam).split(',').map(s => s.trim()) : [];
      const data = await hkBridge.getLatest(userId, { metrics, days: days ? parseInt(days) : 7 });
      res.json({ ok: true, data });
    } catch (err) {
      logger.error({ err }, 'GET /wearable/latest error');
      res.status(500).json({ error: 'Failed to fetch latest metrics' });
    }
  });

  /**
   * GET /wearable/series/:metric
   * Time series for a specific metric.
   * Query: user, days
   */
  router.get('/wearable/series/:metric', requireKey, async (req, res) => {
    try {
      const { user, days } = req.query;
      const { metric } = req.params;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(400).json({ error: 'Unknown user' });

      const series = await hkBridge.getTimeSeries(userId, metric, { days: days ? parseInt(days) : 30 });
      res.json({ ok: true, metric, series });
    } catch (err) {
      logger.error({ err }, 'GET /wearable/series error');
      res.status(500).json({ error: 'Failed to fetch time series' });
    }
  });

  // ── Patterns ────────────────────────────────────────────────────────────────

  /**
   * GET /patterns
   * Stored health correlations for a user.
   */
  router.get('/patterns', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user);
      if (!userId) return res.status(400).json({ error: 'Unknown user' });

      const correlations = await patternEngine.getCorrelations(userId);
      res.json({ ok: true, correlations });
    } catch (err) {
      logger.error({ err }, 'GET /patterns error');
      res.status(500).json({ error: 'Failed to fetch patterns' });
    }
  });

  /**
   * POST /patterns/analyze
   * Trigger a pattern analysis run (async, returns immediately).
   */
  router.post('/patterns/analyze', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.body?.user ?? req.query.user);
      if (!userId) return res.status(400).json({ error: 'Unknown user' });

      // Fire and forget — do not await
      patternEngine.runAnalysis(userId).catch(err => {
        logger.error({ err, userId }, 'background pattern analysis failed');
      });

      res.json({ ok: true, message: 'Analysis queued' });
    } catch (err) {
      logger.error({ err }, 'POST /patterns/analyze error');
      res.status(500).json({ error: 'Failed to queue analysis' });
    }
  });

  /**
   * GET /patterns/summary
   * Plain-English summary of top correlations.
   */
  router.get('/patterns/summary', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user);
      if (!userId) return res.status(400).json({ error: 'Unknown user' });

      const summary = await patternEngine.getInsightSummary(userId);
      res.json({ ok: true, summary });
    } catch (err) {
      logger.error({ err }, 'GET /patterns/summary error');
      res.status(500).json({ error: 'Failed to fetch summary' });
    }
  });

  // ── Emergency ────────────────────────────────────────────────────────────────

  /**
   * GET /emergency/status
   * Active (unresolved) emergency events for a user.
   */
  router.get('/emergency/status', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user);
      if (!userId) return res.status(400).json({ error: 'Unknown user' });

      const events = await emergencyDetection.getActiveEvents(userId);
      res.json({ ok: true, events });
    } catch (err) {
      logger.error({ err }, 'GET /emergency/status error');
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

  /**
   * POST /emergency/resolve/:id
   * Resolve an emergency event.
   * Body: { note }
   */
  router.post('/emergency/resolve/:id', requireKey, async (req, res) => {
    try {
      const event = await emergencyDetection.resolveEvent(req.params.id, req.body?.note);
      if (!event) return res.status(404).json({ error: 'Event not found' });
      res.json({ ok: true, event });
    } catch (err) {
      logger.error({ err }, 'POST /emergency/resolve error');
      res.status(500).json({ error: 'Failed to resolve event' });
    }
  });

  /**
   * GET /emergency/contacts
   * Emergency contacts for a user.
   */
  router.get('/emergency/contacts', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user);
      if (!userId) return res.status(400).json({ error: 'Unknown user' });

      const { rows } = await pool.query(
        `SELECT * FROM emergency_contacts WHERE user_id = $1 ORDER BY priority ASC`,
        [userId]
      );
      res.json({ ok: true, contacts: rows });
    } catch (err) {
      logger.error({ err }, 'GET /emergency/contacts error');
      res.status(500).json({ error: 'Failed to fetch contacts' });
    }
  });

  /**
   * POST /emergency/contacts
   * Add an emergency contact.
   * Body: { user, name, phone, relationship, priority }
   */
  router.post('/emergency/contacts', requireKey, async (req, res) => {
    try {
      const { user, name, phone, relationship, priority } = req.body;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(400).json({ error: 'Unknown user' });
      if (!name || !phone) return res.status(400).json({ error: 'name and phone required' });

      const { rows } = await pool.query(
        `INSERT INTO emergency_contacts (user_id, name, phone, relationship, priority)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [userId, name, phone, relationship ?? null, priority ?? 1]
      );
      res.json({ ok: true, contact: rows[0] });
    } catch (err) {
      logger.error({ err }, 'POST /emergency/contacts error');
      res.status(500).json({ error: 'Failed to add contact' });
    }
  });

  /**
   * DELETE /emergency/contacts/:id
   * Remove an emergency contact.
   */
  router.delete('/emergency/contacts/:id', requireKey, async (req, res) => {
    try {
      const { rows } = await pool.query(
        `DELETE FROM emergency_contacts WHERE id = $1 RETURNING id`,
        [req.params.id]
      );
      if (rows.length === 0) return res.status(404).json({ error: 'Contact not found' });
      res.json({ ok: true, deleted: rows[0].id });
    } catch (err) {
      logger.error({ err }, 'DELETE /emergency/contacts error');
      res.status(500).json({ error: 'Failed to delete contact' });
    }
  });

  // ── Medical brief ────────────────────────────────────────────────────────────

  /**
   * POST /medical-brief
   * Generate a pre-appointment medical context brief.
   * Body: { user, appointment_type, focus_areas }
   */
  router.post('/medical-brief', requireKey, async (req, res) => {
    try {
      const { user, appointment_type, focus_areas } = req.body;
      const userId = await resolveUserId(user);
      if (!userId) return res.status(400).json({ error: 'Unknown user' });

      const result = await medicalGenerator.generate(userId, {
        appointmentType: appointment_type ?? 'general',
        focusAreas: Array.isArray(focus_areas) ? focus_areas : [],
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      logger.error({ err }, 'POST /medical-brief error');
      res.status(500).json({ error: 'Failed to generate brief' });
    }
  });

  return router;
}
