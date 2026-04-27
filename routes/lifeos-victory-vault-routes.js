import express from 'express';
import { createVictoryVault } from '../services/victory-vault.js';
import { makeLifeOSUserResolver } from '../services/lifeos-user-resolver.js';

export function createLifeOSVictoryVaultRoutes({ pool, requireKey, callCouncilMember, logger }) {
  const router = express.Router();

  const providerOrder = [
    { member: 'anthropic', enabled: !!process.env.ANTHROPIC_API_KEY?.trim() },
    { member: 'gemini', enabled: !!(process.env.GOOGLE_AI_KEY?.trim() || process.env.GEMINI_API_KEY?.trim()) },
    { member: 'groq', enabled: !!process.env.GROQ_API_KEY?.trim() },
    { member: 'cerebras', enabled: !!process.env.CEREBRAS_API_KEY?.trim() },
  ];

  const enabledProviders = providerOrder.filter((provider) => provider.enabled);

  const callAI = callCouncilMember
    ? async (prompt) => {
        const candidates = enabledProviders.length ? enabledProviders : providerOrder;
        let lastError = null;
        for (const provider of candidates) {
          try {
            const r = await callCouncilMember(provider.member, prompt);
            return typeof r === 'string' ? r : r?.content || r?.text || '';
          } catch (err) {
            lastError = err;
            logger?.warn?.({ provider: provider.member, err: err.message }, 'victory-vault-routes: provider failed, trying fallback');
          }
        }
        throw lastError || new Error('No LifeOS AI providers available');
      }
    : null;

  const victorySvc = createVictoryVault({ pool, callAI, logger });
  const resolveUserId = makeLifeOSUserResolver(pool);

  router.post('/victories', requireKey, async (req, res) => {
    try {
      const {
        user,
        title,
        moment_type,
        what_was_hard,
        what_you_did,
        what_it_proves,
        outcome_summary,
        emotional_before,
        emotional_after,
        goal_link,
        media_type,
        media_url,
        transcript,
        source_type,
      } = req.body;

      if (!title) return res.status(400).json({ ok: false, error: 'title required' });
      if (!what_you_did) return res.status(400).json({ ok: false, error: 'what_you_did required' });

      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const moment = await victorySvc.logMoment({
        userId,
        title,
        momentType: moment_type,
        whatWasHard: what_was_hard,
        whatYouDid: what_you_did,
        whatItProves: what_it_proves,
        outcomeSummary: outcome_summary,
        emotionalBefore: emotional_before,
        emotionalAfter: emotional_after,
        goalLink: goal_link,
        mediaType: media_type,
        mediaUrl: media_url,
        transcript,
        sourceType: source_type,
      });

      res.json({ ok: true, moment });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/victories', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const moments = await victorySvc.getMoments({ userId, limit: req.query.limit });
      res.json({ ok: true, moments });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/victories/reels', requireKey, async (req, res) => {
    try {
      const { user, title, purpose, moment_ids } = req.body;

      const userId = await resolveUserId(user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const normalizedIds = Array.isArray(moment_ids)
        ? moment_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
        : [];

      const result = await victorySvc.buildReplay({
        userId,
        title,
        purpose,
        momentIds: normalizedIds,
      });

      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/victories/reels', requireKey, async (req, res) => {
    try {
      const userId = await resolveUserId(req.query.user || 'adam');
      if (!userId) return res.status(404).json({ ok: false, error: 'User not found' });

      const reels = await victorySvc.getReels({ userId, limit: req.query.limit });
      res.json({ ok: true, reels });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}