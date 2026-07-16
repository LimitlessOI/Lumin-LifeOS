/**
 * SYNOPSIS: Exports registerLifereAgentOsRoutes — routes/lifere-agent-os-routes.js.
 * @ssot docs/products/lifere/PRODUCT_HOME.md
 */
import express from 'express';
import { createLifereAgentAcademy } from '../services/lifere-agent-academy.js';
import { createLifereAppointmentCopilot } from '../services/lifere-appointment-copilot.js';
import { createLifereRealEstateTeleprompter } from '../services/lifere-real-estate-teleprompter.js';

export async function registerLifereAgentOsRoutes(app, deps) {
  const { pool } = deps || {};
  const academy = createLifereAgentAcademy({ pool });
  const copilot = createLifereAppointmentCopilot({ pool });
  const teleprompter = createLifereRealEstateTeleprompter({ pool });

  const router = express.Router();

  function getAgentId(req) {
    return req.headers['agent_id'] || req.body?.agentId || req.query?.agentId;
  }

  function requireAgentId(req, res, next) {
    const agentId = getAgentId(req);
    if (!agentId) {
      return res.status(400).json({ ok: false, error: 'agent_id / agentId is required' });
    }
    req.agentId = agentId;
    next();
  }

  router.get('/training/modules', async (req, res) => {
    try {
      const modules = await academy.listTrainingModules(req.query);
      res.json({ ok: true, modules });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/training/roleplay', requireAgentId, async (req, res) => {
    try {
      const { scenario } = req.body || {};
      const sessionId = await academy.startRolePlay(req.agentId, scenario || 'buyer-consultation');
      res.json({ ok: true, sessionId });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/training/roleplay/:id/response', requireAgentId, async (req, res) => {
    try {
      const { response } = req.body || {};
      await academy.submitRolePlayResponse(req.params.id, response || '');
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/training/next-lesson', requireAgentId, async (req, res) => {
    try {
      const lesson = await academy.getNextLesson(req.agentId);
      res.json({ ok: true, lesson });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/appointment/process', requireAgentId, async (req, res) => {
    try {
      const { transcript } = req.body || {};
      const result = await copilot.processAppointmentTranscript(req.agentId, transcript || '');
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/appointment/pending-actions', requireAgentId, async (req, res) => {
    try {
      const actions = await copilot.getPendingActions(req.agentId);
      res.json({ ok: true, ...actions });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/appointment/:id/approve-email', requireAgentId, async (req, res) => {
    try {
      await pool.query("UPDATE lifere_commitment_queue SET status = 'approved' WHERE id = $1 AND agent_id = $2", [req.params.id, req.agentId]);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/appointment/:id/approve-mls-search', requireAgentId, async (req, res) => {
    try {
      await pool.query("UPDATE lifere_mls_search_queue SET status = 'approved' WHERE id = $1 AND agent_id = $2", [req.params.id, req.agentId]);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/teleprompter/state', requireAgentId, async (req, res) => {
    try {
      const state = teleprompter.getTeleprompterState(req.agentId);
      res.json({ ok: true, state });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/teleprompter/advance', requireAgentId, async (req, res) => {
    try {
      const { clientCue } = req.body || {};
      const state = teleprompter.advanceScript(req.agentId, clientCue);
      res.json({ ok: true, state });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/teleprompter/interrupt', requireAgentId, async (req, res) => {
    try {
      const { interruptionText } = req.body || {};
      const state = teleprompter.handleInterruption(req.agentId, interruptionText);
      res.json({ ok: true, state });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/teleprompter/resume', requireAgentId, async (req, res) => {
    try {
      const state = teleprompter.resumeAfterStory(req.agentId);
      res.json({ ok: true, state });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.use('/api/v1/lifere-agent-os', router);
}
