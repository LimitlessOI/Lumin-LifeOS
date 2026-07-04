/**
 * SYNOPSIS: Exports createAutomationRoutes — routes/automation-routes.js.
 */
import express from 'express';
import { createMakeComGenerator } from '../services/make-com-generator.js';

export function createAutomationRoutes({ pool, requireKey, logger }) {
  if (!pool || typeof pool.query !== 'function') {
    throw new TypeError('pool_required');
  }
  if (typeof requireKey !== 'function') {
    throw new TypeError('requireKey_required');
  }

  const router = express.Router();
  const generator = createMakeComGenerator({
    callCouncilMember: async (provider, prompt, options = {}) => {
      const { rows } = await pool.query(
        `SELECT call_council_member($1, $2, $3::jsonb) AS result`,
        [provider, prompt, JSON.stringify(options || {})],
      );
      return rows[0]?.result;
    },
  });

  router.post('/api/v1/automation', requireKey, async (req, res, next) => {
    try {
      const ownerId = req.lifeosUser?.sub || null;
      if (!ownerId) return res.status(401).json({ error: 'jwt_required' });

      const description = req.body?.description;
      const result = await generator.generateScenario({
        description,
        context: {
          owner_id: ownerId,
        },
        metadata: {
          route: '/api/v1/automation',
          product: 'Business Tools Product Home',
          blueprint_step: 'BT-P1-004',
        },
      });

      return res.json({
        ok: true,
        scenario: result.scenario,
      });
    } catch (err) {
      if (logger && typeof logger.error === 'function') {
        logger.error({ err }, 'automation_route_error');
      }
      if (err?.status === 400) {
        return res.status(400).json({ ok: false, error: err.message });
      }
      next(err);
    }
  });

  return router;
}