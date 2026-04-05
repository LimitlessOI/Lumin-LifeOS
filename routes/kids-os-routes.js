/**
 * routes/kids-os-routes.js
 *
 * Kids OS API — enrollment, win logging, integrity scoring,
 * misidentification screening, welfare flags, belonging guarantee.
 * Mounted at /api/v1/kids
 *
 * Endpoints:
 *   POST   /children                          — enroll a child
 *   GET    /children/:id                      — get child
 *   GET    /children/:id/dashboard            — full dashboard
 *   POST   /children/:id/wins                 — log a win
 *   POST   /children/:id/integrity            — log integrity action
 *   GET    /children/:id/integrity            — get integrity score
 *   POST   /children/:id/sessions             — log a session
 *   POST   /children/:id/screen               — run misidentification screening
 *   GET    /children/:id/screening            — get screening history
 *   POST   /children/:id/belonging-check      — run belonging guarantee check
 *   GET    /children/:id/welfare              — get open welfare flags
 *
 * @ssot docs/projects/AMENDMENT_34_KIDS_OS.md
 */

import express from 'express';
import { createKidsOSCore }    from '../services/kids-os-core.js';
import { createKidsOSScreener } from '../services/kids-os-screener.js';

/**
 * @param {{ pool: import('pg').Pool, requireKey: Function, callCouncilMember: Function }} deps
 */
export function createKidsOSRoutes({ pool, requireKey, callCouncilMember }) {
  const router = express.Router();

  // ── AI helper ─────────────────────────────────────────────────────────────
  const callAI = callCouncilMember
    ? async (prompt, opts = {}) => {
        const r = await callCouncilMember('anthropic', prompt, opts);
        return typeof r === 'string' ? r : r?.content || r?.text || '';
      }
    : null;

  // ── Services ──────────────────────────────────────────────────────────────
  const kidsCore = createKidsOSCore({ pool, callAI });
  const screener  = createKidsOSScreener({ pool, callAI });

  // ── Helper ────────────────────────────────────────────────────────────────
  function childId(req) {
    const id = parseInt(req.params.id);
    if (isNaN(id)) throw new Error('Invalid child id');
    return id;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ENROLLMENT
  // ══════════════════════════════════════════════════════════════════════════

  // POST /children
  // Body: { parent_user_id?, display_name, age?, grade_level?, interests? }
  router.post('/children', requireKey, async (req, res) => {
    try {
      const { parent_user_id, display_name, age, grade_level, interests } = req.body || {};
      if (!display_name) {
        return res.status(400).json({ ok: false, error: 'display_name is required' });
      }
      const child = await kidsCore.enrollChild(parent_user_id || null, {
        displayName: display_name,
        age: age ? parseInt(age) : undefined,
        gradeLevel: grade_level || undefined,
        interests: interests || [],
      });
      res.status(201).json({ ok: true, child });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /children/:id
  router.get('/children/:id', requireKey, async (req, res) => {
    try {
      const child = await kidsCore.getChild(childId(req));
      res.json({ ok: true, child });
    } catch (err) {
      const status = err.message.includes('not found') ? 404 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // GET /children/:id/dashboard
  router.get('/children/:id/dashboard', requireKey, async (req, res) => {
    try {
      const dashboard = await kidsCore.getChildDashboard(childId(req));
      res.json({ ok: true, ...dashboard });
    } catch (err) {
      const status = err.message.includes('not found') ? 404 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // WIN LOG
  // ══════════════════════════════════════════════════════════════════════════

  // POST /children/:id/wins
  // Body: { domain, win_description, evidence?, before_state?, after_state?, logged_by? }
  router.post('/children/:id/wins', requireKey, async (req, res) => {
    try {
      const { domain, win_description, evidence, before_state, after_state, logged_by } = req.body || {};
      if (!domain || !win_description) {
        return res.status(400).json({ ok: false, error: 'domain and win_description are required' });
      }
      const win = await kidsCore.logWin(childId(req), {
        domain,
        winDescription: win_description,
        evidence: evidence || undefined,
        beforeState: before_state || undefined,
        afterState: after_state || undefined,
        loggedBy: logged_by || 'system',
      });
      res.status(201).json({ ok: true, win });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // INTEGRITY
  // ══════════════════════════════════════════════════════════════════════════

  // POST /children/:id/integrity
  // Body: { action_type, description?, logged_by? }
  router.post('/children/:id/integrity', requireKey, async (req, res) => {
    try {
      const { action_type, description, logged_by } = req.body || {};
      if (!action_type) {
        return res.status(400).json({
          ok: false,
          error: 'action_type is required',
          valid_types: ['clear_ask', 'graceful_no', 'commitment_kept', 'truth_told', 'self_caught', 'manipulation_detected'],
        });
      }
      const result = await kidsCore.logIntegrityAction(childId(req), {
        actionType: action_type,
        description: description || undefined,
        loggedBy: logged_by || 'system',
      });
      res.status(201).json({ ok: true, ...result });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // GET /children/:id/integrity
  router.get('/children/:id/integrity', requireKey, async (req, res) => {
    try {
      const score = await kidsCore.getIntegrityScore(childId(req));
      res.json({ ok: true, ...score });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SESSIONS
  // ══════════════════════════════════════════════════════════════════════════

  // POST /children/:id/sessions
  // Body: { session_type, domain?, duration_minutes?, curiosity_moments?, engagement_level?, notes? }
  router.post('/children/:id/sessions', requireKey, async (req, res) => {
    try {
      const { session_type, domain, duration_minutes, curiosity_moments, engagement_level, notes } = req.body || {};
      if (!session_type) {
        return res.status(400).json({
          ok: false,
          error: 'session_type is required',
          valid_types: ['learning', 'practice', 'checkin', 'simulator', 'integrity', 'workshop'],
        });
      }
      const session = await kidsCore.logSession(childId(req), {
        sessionType: session_type,
        domain: domain || undefined,
        durationMinutes: duration_minutes ? parseInt(duration_minutes) : undefined,
        curiosityMoments: curiosity_moments ? parseInt(curiosity_moments) : 0,
        engagementLevel: engagement_level ? parseFloat(engagement_level) : undefined,
        notes: notes || undefined,
      });
      res.status(201).json({ ok: true, session });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MISIDENTIFICATION SCREENER
  // ══════════════════════════════════════════════════════════════════════════

  // POST /children/:id/screen
  // Body: { observed_behaviors, teacher_notes?, parent_notes? }
  router.post('/children/:id/screen', requireKey, async (req, res) => {
    try {
      const { observed_behaviors, teacher_notes, parent_notes } = req.body || {};
      if (!observed_behaviors) {
        return res.status(400).json({ ok: false, error: 'observed_behaviors is required' });
      }
      const id = childId(req);
      const result = await screener.runScreening(id, {
        observedBehaviors: observed_behaviors,
        teacherNotes: teacher_notes || undefined,
        parentNotes: parent_notes || undefined,
      });
      // Persist the result
      await screener.logScreeningResult(id, result);
      res.json({ ok: true, screening: result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /children/:id/screening
  router.get('/children/:id/screening', requireKey, async (req, res) => {
    try {
      const history = await screener.getScreeningHistory(childId(req));
      res.json({ ok: true, ...history });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // BELONGING GUARANTEE + WELFARE
  // ══════════════════════════════════════════════════════════════════════════

  // POST /children/:id/belonging-check
  router.post('/children/:id/belonging-check', requireKey, async (req, res) => {
    try {
      const result = await kidsCore.runBelongingCheck(childId(req));
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /children/:id/welfare
  router.get('/children/:id/welfare', requireKey, async (req, res) => {
    try {
      const id = childId(req);
      const result = await pool.query(
        `SELECT * FROM kids_os_welfare_flags
         WHERE child_id = $1 AND resolved = false
         ORDER BY created_at DESC`,
        [id]
      );
      res.json({ ok: true, openFlags: result.rows, count: result.rows.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
