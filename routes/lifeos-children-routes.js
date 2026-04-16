/**
 * routes/lifeos-children-routes.js
 *
 * LifeOS Phase 7 — Children's App API
 * Mounted at /api/v1/lifeos/children
 *
 * Child Profiles:
 *   GET  /profiles                 — list child profiles for parent
 *   POST /profiles                 — create child profile
 *   GET  /profiles/:id             — single child profile
 *   PUT  /profiles/:id             — update profile
 *
 * Learning Engine:
 *   POST /explore                  — explore a topic with the learning engine
 *   GET  /sessions/:child_id       — session history
 *   GET  /threads/:child_id        — curiosity threads
 *
 * Child Dreams:
 *   POST /dreams                   — create child dream
 *   GET  /dreams/:child_id         — all dreams for child
 *   POST /dreams/:id/progress      — log progress note
 *   POST /dreams/:id/complete      — complete dream
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import express from 'express';
import { createChildLearningEngine } from '../services/child-learning-engine.js';
import { createChildDreamBuilder }   from '../services/dream-builder-child.js';

export function createLifeOSChildrenRoutes({ pool, requireKey, callCouncilMember }) {
  const router = express.Router();

  // Wrap callCouncilMember into a simple string-returning callAI helper
  const callAI = callCouncilMember
    ? async (prompt) => {
        const r = await callCouncilMember('anthropic', prompt);
        return typeof r === 'string' ? r : r?.content || '';
      }
    : null;

  const learningEngine = createChildLearningEngine({ pool, callAI });
  const dreamBuilder   = createChildDreamBuilder({ pool });

  // ── Helper: resolve parent user ID ─────────────────────────────────────────
  async function resolveParentId(handleOrId) {
    if (!handleOrId) return null;
    if (!isNaN(handleOrId)) {
      const { rows } = await pool.query('SELECT id FROM lifeos_users WHERE id = $1', [handleOrId]);
      return rows[0]?.id || null;
    }
    const { rows } = await pool.query('SELECT id FROM lifeos_users WHERE user_handle = $1', [handleOrId]);
    return rows[0]?.id || null;
  }

  // ── Helper: verify parent owns child ───────────────────────────────────────
  async function verifyParentOwnsChild(parentId, childId) {
    const { rows } = await pool.query(
      'SELECT id FROM child_profiles WHERE id = $1 AND parent_user_id = $2',
      [childId, parentId]
    );
    return rows.length > 0;
  }

  // ── CHILD PROFILES ─────────────────────────────────────────────────────────

  router.get('/profiles', requireKey, async (req, res) => {
    try {
      const parentId = await resolveParentId(req.query.parent_user);
      if (!parentId) return res.status(404).json({ ok: false, error: 'Parent user not found' });
      const { rows } = await pool.query(
        'SELECT * FROM child_profiles WHERE parent_user_id = $1 AND active = TRUE ORDER BY name',
        [parentId]
      );
      res.json({ ok: true, count: rows.length, profiles: rows });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/profiles', requireKey, async (req, res) => {
    try {
      const parentId = await resolveParentId(req.body.parent_user);
      if (!parentId) return res.status(404).json({ ok: false, error: 'Parent user not found' });
      const { name, birth_date, interests, learning_style } = req.body;
      if (!name) return res.status(400).json({ ok: false, error: 'name is required' });
      const { rows } = await pool.query(
        `INSERT INTO child_profiles (parent_user_id, name, birth_date, interests, learning_style)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [parentId, name, birth_date || null, interests || [], learning_style || null]
      );
      res.json({ ok: true, profile: rows[0] });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/profiles/:id', requireKey, async (req, res) => {
    try {
      const { rows } = await pool.query(
        'SELECT * FROM child_profiles WHERE id = $1',
        [parseInt(req.params.id, 10)]
      );
      if (!rows[0]) return res.status(404).json({ ok: false, error: 'Child profile not found' });
      res.json({ ok: true, profile: rows[0] });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.put('/profiles/:id', requireKey, async (req, res) => {
    try {
      const childId  = parseInt(req.params.id, 10);
      const parentId = await resolveParentId(req.body.parent_user || req.query.parent_user);
      if (parentId) {
        const owns = await verifyParentOwnsChild(parentId, childId);
        if (!owns) return res.status(403).json({ ok: false, error: 'Not authorized for this child' });
      }
      const { interests, learning_style, access_level } = req.body;
      const { rows } = await pool.query(
        `UPDATE child_profiles
            SET interests      = COALESCE($2, interests),
                learning_style = COALESCE($3, learning_style),
                access_level   = COALESCE($4, access_level)
          WHERE id = $1
          RETURNING *`,
        [childId, interests || null, learning_style || null, access_level || null]
      );
      if (!rows[0]) return res.status(404).json({ ok: false, error: 'Child profile not found' });
      res.json({ ok: true, profile: rows[0] });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── LEARNING ENGINE ────────────────────────────────────────────────────────

  router.post('/explore', requireKey, async (req, res) => {
    try {
      const { child_id, topic, question } = req.body;
      if (!child_id || !topic || !question) {
        return res.status(400).json({ ok: false, error: 'child_id, topic, and question are required' });
      }
      const result = await learningEngine.exploreTopicWithChild({
        childId:  parseInt(child_id, 10),
        topic,
        question,
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/sessions/:child_id', requireKey, async (req, res) => {
    try {
      const childId = parseInt(req.params.child_id, 10);
      const days    = parseInt(req.query.days, 10) || 30;
      const sessions = await learningEngine.getSessionHistory(childId, { days });
      res.json({ ok: true, count: sessions.length, sessions });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/threads/:child_id', requireKey, async (req, res) => {
    try {
      const childId = parseInt(req.params.child_id, 10);
      const threads = await learningEngine.getCuriosityThreads(childId);
      res.json({ ok: true, count: threads.length, threads });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── CHILD DREAMS ───────────────────────────────────────────────────────────

  router.post('/dreams', requireKey, async (req, res) => {
    try {
      const { child_id, title, description } = req.body;
      if (!child_id || !title) {
        return res.status(400).json({ ok: false, error: 'child_id and title are required' });
      }
      const dream = await dreamBuilder.createDream({
        childId:     parseInt(child_id, 10),
        title,
        description: description || null,
        firstStep:   null,
      });
      res.json({ ok: true, dream });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/dreams/:child_id', requireKey, async (req, res) => {
    try {
      const childId = parseInt(req.params.child_id, 10);
      const list    = await dreamBuilder.getDreams(childId);
      res.json({ ok: true, count: list.length, dreams: list });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/dreams/:id/progress', requireKey, async (req, res) => {
    try {
      const { note } = req.body;
      if (!note) return res.status(400).json({ ok: false, error: 'note is required' });
      const dream = await dreamBuilder.logProgress(parseInt(req.params.id, 10), note);
      res.json({ ok: true, dream });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/dreams/:id/complete', requireKey, async (req, res) => {
    try {
      const dream = await dreamBuilder.completeDream(parseInt(req.params.id, 10));
      res.json({ ok: true, dream });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
