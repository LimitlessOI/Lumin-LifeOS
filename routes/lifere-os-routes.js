/**
 * SYNOPSIS: LifeRE OS v1 routes.
 * LifeRE OS v1 routes.
 * Mount at /api/v1/lifere
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import express from 'express';
import { createLifeREOSService } from '../services/lifere-os-v1.js';
import {
  enrichDailyCommandCenter,
  fetchBoldTrailPipeline,
  getBoldTrailConnectionStatus,
  pushApprovedFollowUp,
} from '../services/lifere-boldtrail-bridge.js';

export function createLifeRERoutes({ requireKey }) {
  const router = express.Router();
  const service = createLifeREOSService();

  router.get('/health', requireKey, (_req, res) => {
    res.json(service.health());
  });

  router.get('/boldtrail/status', requireKey, async (_req, res) => {
    try {
      const status = await getBoldTrailConnectionStatus();
      res.json({ ok: true, boldtrail: status });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/boldtrail/pipeline', requireKey, async (req, res) => {
    try {
      const limit = Number(req.query.limit) || 50;
      const assignedAgentId = req.query.assigned_agent_id || null;
      const pipeline = await fetchBoldTrailPipeline({ limit, assignedAgentId });
      res.json({ ok: pipeline.ok, result: pipeline });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/daily-command-center', requireKey, async (req, res) => {
    try {
      const enriched = await enrichDailyCommandCenter(req.body || {});
      res.json({ ok: true, result: service.dailyCommandCenter(enriched) });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.get('/top-3', requireKey, (req, res) => {
    res.json({ ok: true, result: service.top3Priorities(req.query || {}) });
  });

  router.post('/top-3', requireKey, (req, res) => {
    res.json({ ok: true, result: service.top3Priorities(req.body || {}) });
  });

  router.post('/nightly-debrief', requireKey, (req, res) => {
    res.json({ ok: true, result: service.nightlyDebrief(req.body || {}) });
  });

  router.post('/education/context', requireKey, (req, res) => {
    res.json({ ok: true, result: service.educationContext(req.body || {}) });
  });

  router.post('/sales/coach', requireKey, (req, res) => {
    res.json({ ok: true, result: service.salesCoach(req.body || {}) });
  });

  router.post('/social/lite', requireKey, (req, res) => {
    res.json({ ok: true, result: service.socialLite(req.body || {}) });
  });

  router.post('/follow-up/lite', requireKey, async (req, res) => {
    try {
      const pipeline = await fetchBoldTrailPipeline({ limit: 25 });
      if (pipeline.ok && pipeline.contacts.length) {
        const queue = pipeline.contacts.slice(0, 10).map((contact, index) => ({
          rank: index + 1,
          lead: contact.name,
          contact_id: contact.id,
          status_label: contact.status_label,
          message_draft: `Hey ${contact.name.split(' ')[0] || 'there'}, wanted to make sure you got the options I sent.`,
          execute_external: false,
          requires_agent_approval: true,
          source: 'boldtrail',
        }));
        res.json({ ok: true, result: { queue, source: 'boldtrail' } });
        return;
      }
      res.json({ ok: true, result: service.followUpLite(req.body || {}) });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/follow-up/approve', requireKey, async (req, res) => {
    try {
      const { contact_id, message, agent_label } = req.body || {};
      const result = await pushApprovedFollowUp({
        contactId: contact_id,
        message,
        agentLabel: agent_label || 'LifeRE',
      });
      if (!result.ok) {
        res.status(result.error === 'BoldTrail API not configured' ? 503 : 400).json(result);
        return;
      }
      res.json({ ok: true, result });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  router.post('/tc/extract-lite', requireKey, (req, res) => {
    res.json({ ok: true, result: service.tcExtractionLite(req.body || {}) });
  });

  router.post('/compliance/guardrails', requireKey, (req, res) => {
    res.json({ ok: true, result: service.complianceGuardrails(req.body || {}) });
  });

  router.post('/recruiting/lite', requireKey, (req, res) => {
    res.json({ ok: true, result: service.recruitingLite(req.body || {}) });
  });

  router.post('/finance/lite', requireKey, (req, res) => {
    res.json({ ok: true, result: service.financeLite(req.body || {}) });
  });

  router.post('/accountability', requireKey, (req, res) => {
    res.json({ ok: true, result: service.accountability(req.body || {}) });
  });

  return router;
}
