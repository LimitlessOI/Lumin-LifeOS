/**
 * SYNOPSIS: Exports createTwinRoutes — routes/twin-simulate-routes.js.
 */
import express from 'express';

function normalizeProfileId(profileId) {
  return String(profileId || '').trim();
}

function normalizeDecisionContext(decisionContext) {
  return String(decisionContext || '').trim();
}

function deriveSimulatedDecision(profileId, decisionContext) {
  const profile = normalizeProfileId(profileId);
  const context = normalizeDecisionContext(decisionContext);
  const text = `${profile} ${context}`.toLowerCase();

  const yesSignals = [
    /\bapprove\b/,
    /\byes\b/,
    /\bship\b/,
    /\bbuy\b/,
    /\bgo\b/,
    /\baccept\b/,
    /\blaunch\b/,
    /\bgreenlight\b/,
    /\bproceed\b/,
    /\bdo it\b/,
  ];

  const noSignals = [
    /\breject\b/,
    /\bno\b/,
    /\bblock\b/,
    /\bdecline\b/,
    /\bwait\b/,
    /\bpostpone\b/,
    /\bpause\b/,
    /\bhold\b/,
    /\bnot now\b/,
    /\bskip\b/,
  ];

  let score = 0;
  for (const pattern of yesSignals) {
    if (pattern.test(text)) score += 1;
  }
  for (const pattern of noSignals) {
    if (pattern.test(text)) score -= 1;
  }

  if (text.includes('risk')) score -= 1;
  if (text.includes('urgent')) score += 1;
  if (text.includes('high value') || text.includes('roi')) score += 1;
  if (text.includes('low value')) score -= 1;

  if (score > 0) {
    return {
      decision: 'approve',
      rationale: 'The profile/context combination indicates a forward-moving decision.',
      confidence: Math.min(0.95, 0.55 + score * 0.1),
    };
  }

  if (score < 0) {
    return {
      decision: 'reject',
      rationale: 'The profile/context combination indicates a cautionary decision.',
      confidence: Math.min(0.95, 0.55 + Math.abs(score) * 0.1),
    };
  }

  return {
    decision: 'defer',
    rationale: 'Insufficient signal to make a strong decision from the provided profile and context.',
    confidence: 0.5,
  };
}

export function createTwinRoutes({ pool, requireKey, logger }) {
  const router = express.Router();

  router.post('/api/v1/twin/simulate', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const { profile_id: profileId, decision_context: decisionContext } = req.body || {};
      if (!profileId) return res.status(400).json({ ok: false, error: 'profile_id_required' });
      if (!decisionContext) return res.status(400).json({ ok: false, error: 'decision_context_required' });

      const { rows } = await pool.query(
        `SELECT *
           FROM adam_profile
          WHERE owner_id = $1
            AND profile_id = $2
          LIMIT 1`,
        [ownerId, normalizeProfileId(profileId)],
      );

      const profileRow = rows[0] || null;
      const simulatedDecision = deriveSimulatedDecision(
        profileRow?.profile_id || profileId,
        decisionContext,
      );

      logger?.info?.('twin_simulate', {
        owner_id: ownerId,
        profile_id: normalizeProfileId(profileId),
        has_profile: Boolean(profileRow),
        decision: simulatedDecision.decision,
      });

      return res.json({
        ok: true,
        simulatedDecision,
      });
    } catch (err) {
      if (logger?.error) logger.error('twin_simulate_failed', { error: err?.message, stack: err?.stack });
      next(err);
    }
  });

  return router;
}