/**
 * routes/lifeos-ethics-routes.js
 *
 * LifeOS Phase 8 — Data Ethics + Sovereignty API
 * Mounted at /api/v1/lifeos/ethics
 *
 * Endpoints:
 *   GET  /consent                   — all consent records for user
 *   POST /consent                   — grant consent for a feature
 *   POST /consent/revoke            — revoke consent for a feature
 *   POST /erase                     — full data erasure (requireKey, confirm_hash required)
 *   GET  /lock-status               — status of all constitutional locks
 *   POST /sovereignty/check         — check if an action is allowed for a user
 *   GET  /research/summary          — aggregated anonymized research insights
 *   POST /research/contribute       — opt-in to research aggregate via consent grant
 *
 * High-risk route: POST /erase requires { confirm_hash: "ERASE_ALL_MY_DATA" } in body.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import { Router } from 'express';
import { createDataSovereignty }    from '../services/data-sovereignty.js';
import { createConsentRegistry }    from '../services/consent-registry.js';
import { createConstitutionalLock } from '../services/constitutional-lock.js';
import { createSovereigntyCheck }   from '../services/sovereignty-check.js';
import { createResearchAggregator } from '../services/research-aggregator.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';

const ERASE_CONFIRM_LITERAL = 'ERASE_ALL_MY_DATA';

export function createLifeOSEthicsRoutes({ pool, requireKey, callCouncilMember, logger }) {
  const router = Router();
  const log = logger || console;

  // ── Services ──────────────────────────────────────────────────────────────
  const sovereignty      = createDataSovereignty({ pool, logger: log });
  const consentReg       = createConsentRegistry({ pool });
  const constitutionalLock = createConstitutionalLock({ pool, logger: log });
  const sovereigntyCheck = createSovereigntyCheck({ pool });
  const researchAggregator = createResearchAggregator({ pool, logger: log });

  // Helper: resolve user_id (shared, case-insensitive)
  const resolveUserId = makeLifeOSUserResolver(pool);


  // ── GET /consent ──────────────────────────────────────────────────────────
  // Returns the current consent state for all features for the user.
  router.get('/consent', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const consent = await consentReg.getConsentState(userId);
      res.json({ ok: true, user_id: userId, consent });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /consent ─────────────────────────────────────────────────────────
  // Grants consent for a feature. Body: { user?, feature, consent_text? }
  router.post('/consent', requireKey, async (req, res) => {
    try {
      const { user, feature, consent_text } = req.body || {};
      if (!feature) return res.status(400).json({ ok: false, error: 'feature is required' });
      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const record = await consentReg.grantConsent({
        userId,
        feature,
        consentText: consent_text || null,
        ipNote:      null,
      });
      res.status(201).json({ ok: true, record });
    } catch (err) {
      const status = err.message.includes('Unknown feature') ? 400 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // ── POST /consent/revoke ──────────────────────────────────────────────────
  // Revokes consent for a feature. Body: { user?, feature, reason? }
  router.post('/consent/revoke', requireKey, async (req, res) => {
    try {
      const { user, feature, reason } = req.body || {};
      if (!feature) return res.status(400).json({ ok: false, error: 'feature is required' });
      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const record = await consentReg.revokeConsent({
        userId,
        feature,
        reason: reason || null,
      });
      res.status(201).json({ ok: true, record });
    } catch (err) {
      const status = err.message.includes('Unknown feature') ? 400 : 500;
      res.status(status).json({ ok: false, error: err.message });
    }
  });

  // ── POST /erase ───────────────────────────────────────────────────────────
  // Full data erasure. HIGH-RISK — irreversible.
  // Body: { user?, confirm_hash: "ERASE_ALL_MY_DATA" }
  // confirm_hash must equal the literal string "ERASE_ALL_MY_DATA" — any other value is rejected.
  router.post('/erase', requireKey, async (req, res) => {
    try {
      const { user, confirm_hash } = req.body || {};

      if (confirm_hash !== ERASE_CONFIRM_LITERAL) {
        return res.status(400).json({
          ok: false,
          error: `confirm_hash must equal "${ERASE_CONFIRM_LITERAL}" to proceed with erasure`,
        });
      }

      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      log.warn
        ? log.warn({ userId }, 'Data erasure initiated via /erase endpoint')
        : log.warn(`Data erasure initiated for userId=${userId}`);

      const result = await sovereignty.deleteAllUserData(userId, { initiatedBy: 'user' });

      res.json({ ok: true, ...result });
    } catch (err) {
      log.error
        ? log.error({ err }, '/erase failed')
        : log.error('/erase failed:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /lock-status ──────────────────────────────────────────────────────
  // Returns status of all constitutional locks (no auth — read-only).
  router.get('/lock-status', async (req, res) => {
    try {
      const locks = await constitutionalLock.getLockStatus();
      res.json({ ok: true, locks, count: locks.length });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /sovereignty/check ───────────────────────────────────────────────
  // Check whether an action is permitted for a user under sovereignty rules.
  // Body: { user?, action, context? }
  router.post('/sovereignty/check', requireKey, async (req, res) => {
    try {
      const { user, action, context } = req.body || {};
      if (!action) return res.status(400).json({ ok: false, error: 'action is required' });
      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const result = await sovereigntyCheck.check({
        userId,
        action,
        context: context || {},
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── GET /research/summary ─────────────────────────────────────────────────
  // Returns aggregated anonymized population insights (no individual data).
  router.get('/research/summary', async (req, res) => {
    try {
      const results = await researchAggregator.runAll();
      res.json({ ok: true, summary: results });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── POST /research/contribute ─────────────────────────────────────────────
  // Opt-in contribution: grants consent for research_aggregate feature.
  // Requires explicit user action — no auto-enrolment.
  // Body: { user?, consent_text? }
  router.post('/research/contribute', requireKey, async (req, res) => {
    try {
      const { user, consent_text } = req.body || {};
      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });
      const record = await consentReg.grantConsent({
        userId,
        feature:     'research_aggregate',
        consentText: consent_text || 'User opted in to research aggregate via /research/contribute',
        ipNote:      null,
      });
      res.status(201).json({ ok: true, record });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
