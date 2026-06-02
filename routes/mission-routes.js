/**
 * routes/mission-routes.js
 * Mission Runtime Express router — missions, participants, household board.
 * Authority: docs/projects/BPB-0001-MISSION-RUNTIME-V1.md §§3.1–3.3, 3.5, 13.3.
 * @ssot docs/projects/AMENDMENT_47_MISSION_RUNTIME.md
 *
 * NOTE (§13.3): Commitment CRUD (POST/GET /commitments, PUT /commitments/:id) is NOT
 * here — it stays in routes/lifeos-commitment-routes.js which is already mounted at
 * /api/v1/lifeos/commitments. Only missions, participants, and board live here.
 *
 * Mounted at /api/v1/lifeos via startup/register-runtime-routes.js (pending wiring).
 *
 * GAP-FILL: builder /build returned HTTP_502 on 2 consecutive attempts
 * (2026-06-02T2x:xx UTC) — Railway builder generate path broken (same infra issue
 * as runner churn). Written by Conductor from BPB-0001 §Section 3 prescription exactly.
 */

import { Router } from 'express';
import {
  createMission,
  listMissions,
  getMission,
  updateMission,
  transitionMissionState,
  addParticipant,
  removeParticipant,
  getHouseholdBoard,
} from '../services/mission-ledger.js';

export function createMissionRoutes({ pool, requireKey, logger }) {
  const router = Router();
  const log = logger || console;

  // POST /missions — create mission
  router.post('/missions', requireKey, async (req, res) => {
    try {
      const mission = await createMission(pool, req.body || {});
      res.status(201).json({ ok: true, mission });
    } catch (err) {
      log.error?.('[MISSIONS] POST /missions:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /missions — list missions
  router.get('/missions', requireKey, async (req, res) => {
    try {
      const missions = await listMissions(pool, {
        state: req.query.state,
        owner: req.query.owner,
        limit: req.query.limit,
      });
      res.json({ ok: true, missions });
    } catch (err) {
      log.error?.('[MISSIONS] GET /missions:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /missions/:id — get mission with participants, transitions, commitments
  router.get('/missions/:id', requireKey, async (req, res) => {
    try {
      const result = await getMission(pool, req.params.id);
      if (!result) return res.status(404).json({ ok: false, error: 'not found' });
      const { mission, participants, transitions, commitments } = result;
      res.json({ ok: true, mission, participants, transitions, commitments });
    } catch (err) {
      log.error?.('[MISSIONS] GET /missions/:id:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // PUT /missions/:id — update mission fields
  router.put('/missions/:id', requireKey, async (req, res) => {
    try {
      const mission = await updateMission(pool, req.params.id, req.body || {});
      if (!mission) return res.status(404).json({ ok: false, error: 'not found' });
      res.json({ ok: true, mission });
    } catch (err) {
      log.error?.('[MISSIONS] PUT /missions/:id:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /missions/:id/transition — state transition (validated)
  router.post('/missions/:id/transition', requireKey, async (req, res) => {
    try {
      const result = await transitionMissionState(pool, req.params.id, req.body || {});
      res.json({ ok: true, mission: result.mission, transition: result.transition });
    } catch (err) {
      if (err.code === 'INVALID_TRANSITION') {
        return res.status(400).json({
          ok: false,
          error: 'invalid_transition',
          from: err.from,
          to: err.to,
          valid_next: err.valid_next,
        });
      }
      if (err.code === 'NOT_FOUND') {
        return res.status(404).json({ ok: false, error: 'not found' });
      }
      log.error?.('[MISSIONS] POST /missions/:id/transition:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // POST /missions/:id/participants — add participant
  router.post('/missions/:id/participants', requireKey, async (req, res) => {
    try {
      const participant = await addParticipant(pool, req.params.id, req.body || {});
      res.status(201).json({ ok: true, participant });
    } catch (err) {
      log.error?.('[MISSIONS] POST /missions/:id/participants:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // DELETE /missions/:id/participants/:participant — remove participant
  router.delete('/missions/:id/participants/:participant', requireKey, async (req, res) => {
    try {
      await removeParticipant(pool, req.params.id, req.params.participant);
      res.json({ ok: true });
    } catch (err) {
      log.error?.('[MISSIONS] DELETE /missions/:id/participants/:participant:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // GET /household/board — household board (8 sections, Phase 1)
  router.get('/household/board', requireKey, async (req, res) => {
    try {
      const board = await getHouseholdBoard(pool, req.query.mission_id || 'MISSION-0001');
      res.json(board);
    } catch (err) {
      if (err.code === 'NOT_FOUND') {
        return res.status(404).json({ ok: false, error: 'not found' });
      }
      log.error?.('[MISSIONS] GET /household/board:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
