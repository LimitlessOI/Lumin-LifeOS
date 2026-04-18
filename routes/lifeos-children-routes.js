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
 *   GET  /parent-summary           — parent dashboard summary
 *   GET  /learning                 — parent-visible learning activity feed
 *   GET  /checkins                 — parent-visible child check-in feed
 *   GET  /dreams                   — parent-visible dreams list
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
import { makeLifeOSUserResolver }    from '../services/lifeos-user-resolver.js';

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

  // ── Helper: resolve parent user ID (shared, case-insensitive) ──────────────
  const resolveParentId = makeLifeOSUserResolver(pool);

  // ── Helper: verify parent owns child ───────────────────────────────────────
  async function verifyParentOwnsChild(parentId, childId) {
    const { rows } = await pool.query(
      'SELECT id FROM child_profiles WHERE id = $1 AND parent_user_id = $2',
      [childId, parentId]
    );
    return rows.length > 0;
  }

  async function listParentChildren(parentId, childFilter = 'all') {
    const normalized = String(childFilter || 'all').trim();
    if (!normalized || normalized === 'all') {
      const { rows } = await pool.query(
        'SELECT * FROM child_profiles WHERE parent_user_id = $1 AND active = TRUE ORDER BY name',
        [parentId]
      );
      return rows;
    }
    if (/^\d+$/.test(normalized)) {
      const { rows } = await pool.query(
        'SELECT * FROM child_profiles WHERE parent_user_id = $1 AND id = $2 AND active = TRUE ORDER BY name',
        [parentId, parseInt(normalized, 10)]
      );
      return rows;
    }
    const { rows } = await pool.query(
      'SELECT * FROM child_profiles WHERE parent_user_id = $1 AND LOWER(name) = LOWER($2) AND active = TRUE ORDER BY name',
      [parentId, normalized]
    );
    return rows;
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

  router.get('/parent-summary', requireKey, async (req, res) => {
    try {
      const parentId = await resolveParentId(req.query.user || req.query.parent_user);
      if (!parentId) return res.status(404).json({ ok: false, error: 'Parent user not found' });
      const children = await listParentChildren(parentId, req.query.child || 'all');
      if (!children.length) return res.json({ ok: true, summaries: [] });

      const summaries = await Promise.all(children.map(async (child) => {
        const [sessionsRows, dreamsRows, threadsRows] = await Promise.all([
          pool.query(
            `SELECT session_date, created_at
               FROM child_sessions
              WHERE child_id = $1
              ORDER BY session_date DESC, created_at DESC`,
            [child.id]
          ).then((r) => r.rows),
          pool.query(
            `SELECT *
               FROM child_dreams
              WHERE child_id = $1
              ORDER BY created_at DESC`,
            [child.id]
          ).then((r) => r.rows),
          pool.query(
            `SELECT topic
               FROM curiosity_threads
              WHERE child_id = $1
              ORDER BY last_explored DESC NULLS LAST, depth_level DESC
              LIMIT 1`,
            [child.id]
          ).then((r) => r.rows),
        ]);

        const lastActive = [sessionsRows[0]?.created_at, dreamsRows[0]?.created_at]
          .filter(Boolean)
          .sort((a, b) => new Date(b) - new Date(a))[0] || null;

        return {
          child_id: child.id,
          name: child.name,
          last_active: lastActive,
          adventures_count: sessionsRows.length,
          dreams_count: dreamsRows.length,
          current_learning_focus: threadsRows[0]?.topic || null,
        };
      }));

      res.json({ ok: true, summaries });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/learning', requireKey, async (req, res) => {
    try {
      const parentId = await resolveParentId(req.query.user || req.query.parent_user);
      if (!parentId) return res.status(404).json({ ok: false, error: 'Parent user not found' });
      const children = await listParentChildren(parentId, req.query.child || 'all');
      if (!children.length) return res.json({ ok: true, items: [] });

      const childIds = children.map((child) => child.id);
      const { rows } = await pool.query(
        `SELECT s.*, c.name AS child_name
           FROM child_sessions s
           JOIN child_profiles c ON c.id = s.child_id
          WHERE s.child_id = ANY($1::bigint[]) AND s.parent_visible = TRUE
          ORDER BY s.session_date DESC, s.created_at DESC
          LIMIT 100`,
        [childIds]
      );

      const items = rows.map((row) => ({
        child_id: row.child_id,
        child_name: row.child_name,
        subject: row.topic || row.activity_type || 'General',
        lesson: row.summary || null,
        discovery: row.summary || null,
        created_at: row.created_at,
        date: row.session_date,
      }));
      res.json({ ok: true, items });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/checkins', requireKey, async (req, res) => {
    try {
      const parentId = await resolveParentId(req.query.user || req.query.parent_user);
      if (!parentId) return res.status(404).json({ ok: false, error: 'Parent user not found' });
      const children = await listParentChildren(parentId, req.query.child || 'all');
      if (!children.length) return res.json({ ok: true, checkins: [] });

      const childIds = children.map((child) => child.id);
      const { rows } = await pool.query(
        `SELECT s.*, c.name AS child_name
           FROM child_sessions s
           JOIN child_profiles c ON c.id = s.child_id
          WHERE s.child_id = ANY($1::bigint[]) AND s.parent_visible = TRUE
          ORDER BY s.session_date DESC, s.created_at DESC
          LIMIT 100`,
        [childIds]
      );

      const checkins = rows.map((row) => ({
        child_id: row.child_id,
        child_name: row.child_name,
        date: row.session_date,
        created_at: row.created_at,
        mood_score: 7,
        highlight: row.summary || row.topic || 'Learning session logged',
      }));
      res.json({ ok: true, checkins });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

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

  router.get('/dreams', requireKey, async (req, res) => {
    try {
      const parentId = await resolveParentId(req.query.user || req.query.parent_user);
      if (!parentId) return res.status(404).json({ ok: false, error: 'Parent user not found' });
      const children = await listParentChildren(parentId, req.query.child || 'all');
      if (!children.length) return res.json({ ok: true, dreams: [] });

      const childIds = children.map((child) => child.id);
      const { rows } = await pool.query(
        `SELECT d.*, c.name AS child_name
           FROM child_dreams d
           JOIN child_profiles c ON c.id = d.child_id
          WHERE d.child_id = ANY($1::bigint[])
          ORDER BY d.created_at DESC`,
        [childIds]
      );

      const dreams = rows.map((row) => ({
        ...row,
        child_name: row.child_name,
        steps_completed: Array.isArray(row.progress_notes) ? row.progress_notes.length : 0,
        steps_total: Array.isArray(row.progress_notes) && row.progress_notes.length > 0 ? row.progress_notes.length : 0,
      }));
      res.json({ ok: true, dreams, items: dreams });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

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
