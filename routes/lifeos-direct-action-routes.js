/**
 * SYNOPSIS: Direct Founder -> LifeOS action bridge.
 * Direct Founder -> LifeOS action bridge.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import express from 'express';
import { resolveLifeOSUserId } from '../services/lifeos-user-resolver.js';
import { executeLifeOSDirectAction } from '../services/lifeos-direct-action.js';

export function createLifeOSDirectActionRoutes({ pool, requireKey }) {
  const router = express.Router();

  router.post('/direct-action', requireKey, async (req, res, next) => {
    try {
      const text = String(req.body.text || req.body.user_text || req.body.utterance || '').trim();
      if (!text) {
        return res.status(400).json({
          ok: false,
          matched: false,
          executed: false,
          action_type: null,
          result_record: null,
          visible_founder_message: null,
          error: 'text_required',
        });
      }

      const userRef = req.body.user || req.body.user_handle || req.query.user || 'adam';
      const userId = await resolveLifeOSUserId(pool, userRef);
      if (!userId) {
        return res.status(404).json({
          ok: false,
          matched: true,
          executed: false,
          action_type: null,
          result_record: null,
          visible_founder_message: 'DIRECT ACTION FAILED\naction_type: none\nexecuted: false\nerror: user_not_found',
          error: 'user_not_found',
        });
      }

      const result = await executeLifeOSDirectAction(pool, {
        userId,
        text,
        sessionId: req.body.session_id || req.body.thread_id || null,
        baseUrl: resolveRequestBaseUrl(req),
        selectedProvider: req.body.selected_provider || req.body.provider || null,
        selectedProviders: Array.isArray(req.body.selected_providers)
          ? req.body.selected_providers
          : (Array.isArray(req.body.providers) ? req.body.providers : null),
      });

      return res.status(result.matched ? (result.ok ? 200 : 503) : 200).json({
        ...result,
        source: {
          path: 'lifeos/system/direct',
          kind: 'direct_action',
        },
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

function resolveRequestBaseUrl(req) {
  const envBase = String(process.env.PUBLIC_BASE_URL || process.env.RAILWAY_PUBLIC_DOMAIN || '').replace(/\/$/, '');
  if (envBase) return envBase;
  const proto = String(req.headers['x-forwarded-proto'] || req.protocol || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.get('host') || '').split(',')[0].trim();
  return host ? `${proto}://${host}`.replace(/\/$/, '') : null;
}
