/**
 * LifeRE OS v1 routes.
 * Mount at /api/v1/lifere
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import express from 'express';
import { createLifeREOSService } from '../services/lifere-os-v1.js';

export function createLifeRERoutes({ requireKey }) {
  const router = express.Router();
  const service = createLifeREOSService();

  router.get('/health', requireKey, (_req, res) => {
    res.json(service.health());
  });

  router.post('/daily-command-center', requireKey, (req, res) => {
    res.json({ ok: true, result: service.dailyCommandCenter(req.body || {}) });
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

  router.post('/follow-up/lite', requireKey, (req, res) => {
    res.json({ ok: true, result: service.followUpLite(req.body || {}) });
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
