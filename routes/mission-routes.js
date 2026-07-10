/**
 * SYNOPSIS: Mission Runtime Express routes — registerMissionRoutes for auto-mount.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * GAP-FILL: never-stop spun on step-04 — file existed as createMissionRoutes but
 * module-health required registerMissionRoutes + auto-register entry. Conductor
 * rewired to the live ledger API and mounted via auto-register so the loop can
 * prove LIVE and continue (built+unreachable = false done).
 */
import {
  createMission,
  listMissions,
  getMission,
  updateMission,
  transitionMissionState,
  addParticipant,
  getHouseholdBoard,
} from '../services/mission-ledger.js';

function slugify(input) {
  const base = String(input || 'mission')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return base || `mission-${Date.now()}`;
}

function isInvalidTransition(err) {
  return err?.code === 'INVALID_TRANSITION'
    || String(err?.message || '') === 'INVALID_TRANSITION'
    || String(err?.message || '') === 'invalid_transition';
}

/**
 * @param {import('express').Application} app
 * @param {{ pool?: object, db?: object, requireKey?: Function, authenticate?: Function, logger?: Console }} deps
 */
export function registerMissionRoutes(app, deps = {}) {
  const db = deps.db || deps.pool;
  const authenticate = deps.authenticate || deps.requireKey;
  const logger = deps.logger || console;

  if (!db) throw new Error('registerMissionRoutes requires deps.db or deps.pool');
  if (typeof authenticate !== 'function') {
    throw new Error('registerMissionRoutes requires deps.authenticate or deps.requireKey');
  }

  app.post('/api/missions', authenticate, async (req, res) => {
    try {
      const body = req.body || {};
      const title = String(body.title || '').trim();
      if (!title) return res.status(400).json({ ok: false, error: 'title is required' });
      const mission = await createMission(db, {
        slug: body.slug || slugify(title),
        title,
        purpose: body.description || body.purpose || null,
        authority_class: body.authority_class,
        owner: body.owner,
        blueprint_ref: body.blueprint_ref,
        metadata_json: body.metadata || body.metadata_json,
        participants: body.participants,
      });
      return res.status(201).json({ ok: true, mission });
    } catch (err) {
      logger.error?.('[MISSIONS] POST /api/missions:', err.message);
      return res.status(502).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/missions', authenticate, async (req, res) => {
    try {
      const missions = await listMissions(db, {
        state: req.query.state,
        owner: req.query.owner,
        limit: req.query.limit,
      });
      return res.json({ ok: true, missions });
    } catch (err) {
      logger.error?.('[MISSIONS] GET /api/missions:', err.message);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/missions/:id', authenticate, async (req, res) => {
    try {
      const result = await getMission(db, req.params.id);
      if (!result) return res.status(404).json({ ok: false, error: 'not found' });
      return res.json({ ok: true, ...result });
    } catch (err) {
      logger.error?.('[MISSIONS] GET /api/missions/:id:', err.message);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.patch('/api/missions/:id', authenticate, async (req, res) => {
    try {
      const patch = { ...(req.body || {}) };
      if (patch.description != null && patch.purpose == null) patch.purpose = patch.description;
      const mission = await updateMission(db, req.params.id, patch);
      if (!mission) return res.status(404).json({ ok: false, error: 'not found' });
      return res.json({ ok: true, mission });
    } catch (err) {
      logger.error?.('[MISSIONS] PATCH /api/missions/:id:', err.message);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/missions/:id/transition', authenticate, async (req, res) => {
    try {
      const body = req.body || {};
      const nextState = body.nextState || body.to_state || body.state;
      if (!nextState) return res.status(400).json({ ok: false, error: 'nextState is required' });
      const result = await transitionMissionState(db, req.params.id, {
        to_state: nextState,
        transitioned_by: body.transitioned_by || body.actorId || 'adam',
        note: body.note || null,
      });
      return res.json({ ok: true, mission: result.mission, transition: result.transition });
    } catch (err) {
      if (isInvalidTransition(err)) {
        return res.status(422).json({
          ok: false,
          error: 'INVALID_TRANSITION',
          from: err.from,
          to: err.to,
          valid_next: err.valid_next,
        });
      }
      if (err.code === 'NOT_FOUND') {
        return res.status(404).json({ ok: false, error: 'not found' });
      }
      logger.error?.('[MISSIONS] POST /api/missions/:id/transition:', err.message);
      return res.status(502).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/missions/:id/participants', authenticate, async (req, res) => {
    try {
      const result = await getMission(db, req.params.id);
      if (!result) return res.status(404).json({ ok: false, error: 'not found' });
      return res.json({ ok: true, participants: result.participants || [] });
    } catch (err) {
      logger.error?.('[MISSIONS] GET /api/missions/:id/participants:', err.message);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/missions/:id/participants', authenticate, async (req, res) => {
    try {
      const body = req.body || {};
      const participant = body.participant || body.userId || body.user_id;
      if (!participant) return res.status(400).json({ ok: false, error: 'participant or userId required' });
      const row = await addParticipant(db, req.params.id, {
        participant,
        role: body.role || 'member',
      });
      return res.status(201).json({ ok: true, participant: row });
    } catch (err) {
      logger.error?.('[MISSIONS] POST /api/missions/:id/participants:', err.message);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get('/api/missions/:id/board', authenticate, async (req, res) => {
    try {
      const board = await getHouseholdBoard(db, req.params.id);
      return res.json(board);
    } catch (err) {
      if (err.code === 'NOT_FOUND') {
        return res.status(404).json({ ok: false, error: 'not found' });
      }
      logger.error?.('[MISSIONS] GET /api/missions/:id/board:', err.message);
      return res.status(500).json({ ok: false, error: err.message });
    }
  });
}

export default registerMissionRoutes;
