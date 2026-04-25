/**
 * routes/lifeos-cycle-routes.js
 *
 * LifeOS — Menstrual / Perimenopause Cycle Tracking Routes
 *
 * Routes:
 *   POST /entry          — log period start/end, symptom, or spotting
 *   GET  /phase          — current phase + energy overlay
 *   GET  /context        — compact snapshot for other modules (decision intel, Lumin)
 *   GET  /history        — past N cycles with entries
 *   GET  /settings       — get tracking preferences
 *   PUT  /settings       — update tracking preferences
 *
 * Zero AI cost — all computation is pure math + SQL.
 * Data sovereignty: tracking is opt-in via cycle_settings.tracking_enabled.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import { createCycleService } from '../services/lifeos-cycle.js';

export function createLifeOSCycleRoutes({ pool, requireKey, logger }) {
  const log = logger || console;
  const svc = createCycleService({ pool, logger });

  function userId(req) {
    return req.user?.id || req.body?.user_id || req.query?.user_id;
  }

  // POST /entry
  async function logEntry(req, res) {
    try {
      const uid = userId(req);
      if (!uid) return res.status(400).json({ ok: false, error: 'user_id required' });
      const { entry_type, flow_level, symptoms, notes, source, logged_at } = req.body;
      if (!entry_type) return res.status(400).json({ ok: false, error: 'entry_type required' });
      const entry = await svc.logEntry(uid, { entry_type, flow_level, symptoms, notes, source, logged_at });
      res.json({ ok: true, entry });
    } catch (err) {
      log.error({ err: err.message }, '[CYCLE] logEntry failed');
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  // GET /phase
  async function getPhase(req, res) {
    try {
      const uid = userId(req);
      if (!uid) return res.status(400).json({ ok: false, error: 'user_id required' });
      const phase = await svc.getCurrentPhase(uid);
      res.json({ ok: true, ...phase });
    } catch (err) {
      log.error({ err: err.message }, '[CYCLE] getPhase failed');
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  // GET /context
  async function getContext(req, res) {
    try {
      const uid = userId(req);
      if (!uid) return res.status(400).json({ ok: false, error: 'user_id required' });
      const ctx = await svc.getContextSnapshot(uid);
      res.json({ ok: true, context: ctx });
    } catch (err) {
      log.error({ err: err.message }, '[CYCLE] getContext failed');
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  // GET /history
  async function getHistory(req, res) {
    try {
      const uid = userId(req);
      if (!uid) return res.status(400).json({ ok: false, error: 'user_id required' });
      const limit = Math.min(parseInt(req.query.limit) || 6, 24);
      const history = await svc.getCycleHistory(uid, limit);
      res.json({ ok: true, ...history });
    } catch (err) {
      log.error({ err: err.message }, '[CYCLE] getHistory failed');
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  // GET /settings
  async function getSettings(req, res) {
    try {
      const uid = userId(req);
      if (!uid) return res.status(400).json({ ok: false, error: 'user_id required' });
      const settings = await svc.getSettings(uid);
      res.json({ ok: true, settings });
    } catch (err) {
      log.error({ err: err.message }, '[CYCLE] getSettings failed');
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  // PUT /settings
  async function updateSettings(req, res) {
    try {
      const uid = userId(req);
      if (!uid) return res.status(400).json({ ok: false, error: 'user_id required' });
      const settings = await svc.updateSettings(uid, req.body);
      res.json({ ok: true, settings });
    } catch (err) {
      log.error({ err: err.message }, '[CYCLE] updateSettings failed');
      res.status(500).json({ ok: false, error: err.message });
    }
  }

  return function mount(app) {
    const base = '/api/v1/lifeos/cycle';
    app.post(`${base}/entry`,    requireKey, logEntry);
    app.get(`${base}/phase`,     requireKey, getPhase);
    app.get(`${base}/context`,   requireKey, getContext);
    app.get(`${base}/history`,   requireKey, getHistory);
    app.get(`${base}/settings`,  requireKey, getSettings);
    app.put(`${base}/settings`,  requireKey, updateSettings);
    log.info('✅ [LIFEOS-CYCLE] Routes mounted at /api/v1/lifeos/cycle');
  };
}
