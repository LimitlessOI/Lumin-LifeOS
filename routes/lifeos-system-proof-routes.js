/**
 * System proof event API — harmless DB records for provider tool-action proof.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import express from 'express';
import { resolveLifeOSUserId } from '../services/lifeos-user-resolver.js';
import {
  createSystemProofEvent,
  getSystemProofEvent,
  listSystemProofEvents,
  verificationCurlForProofEvent,
} from '../services/lifeos-system-proof-event.js';
import {
  executeProviderToolProofAction,
  formatProviderToolProofReply,
  parseProviderToolProofUtterance,
} from '../services/founder-provider-tool-action.js';

export function createLifeOSSystemProofRoutes({ pool, requireKey }) {
  const router = express.Router();

  router.post('/system-proof-event', requireKey, async (req, res, next) => {
    try {
      const userRef = req.body.user || req.body.user_handle || req.query.user || 'adam';
      const userId = await resolveLifeOSUserId(pool, userRef);
      if (!userId) {
        return res.status(404).json({ ok: false, error: 'user_not_found', user: userRef });
      }
      const baseUrl = resolveRequestBaseUrl(req);
      const result = await createSystemProofEvent(pool, {
        userId,
        provider: req.body.provider || null,
        model: req.body.model || null,
        providerRequestId: req.body.provider_request_id || null,
        note: req.body.note || null,
        utterance: req.body.utterance || null,
        toolInput: req.body.tool_input || null,
      });
      if (!result.ok) {
        const status = result.error === 'database_pool_unavailable' ? 503 : 500;
        return res.status(status).json(result);
      }
      return res.status(201).json({
        ...result,
        verification_curl: verificationCurlForProofEvent(result.proof_event_id, baseUrl),
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/system-proof-events', requireKey, async (req, res, next) => {
    try {
      const userRef = req.query.user || req.body?.user || 'adam';
      const userId = await resolveLifeOSUserId(pool, userRef);
      if (!userId) {
        return res.status(404).json({ ok: false, error: 'user_not_found', user: userRef });
      }
      const limit = req.query.limit || 20;
      const result = await listSystemProofEvents(pool, userId, { limit });
      if (!result.ok) {
        const status = result.error === 'database_pool_unavailable' ? 503 : 400;
        return res.status(status).json(result);
      }
      return res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get('/system-proof-event/:id', requireKey, async (req, res, next) => {
    try {
      const result = await getSystemProofEvent(pool, req.params.id);
      if (!result.ok) {
        const status = result.error === 'proof_event_not_found' ? 404 : 400;
        return res.status(status).json(result);
      }
      return res.json(result);
    } catch (err) {
      next(err);
    }
  });

  router.post('/provider-tool-proof', requireKey, async (req, res, next) => {
    try {
      const text = String(req.body.text || req.body.utterance || '').trim();
      let provider = req.body.provider ? String(req.body.provider).toLowerCase() : null;
      const map = {
        gpt: 'openai', openai: 'openai', claude: 'anthropic', anthropic: 'anthropic', gemini: 'google', google: 'google',
      };
      if (provider && map[provider]) provider = map[provider];

      const parsed = parseProviderToolProofUtterance(text);
      if (!provider && parsed) provider = parsed.provider;
      if (!provider) {
        return res.status(400).json({
          ok: false,
          error: 'invalid_utterance_or_provider',
          hint: 'Ask GPT to create a LifeOS proof event. | provider: openai|anthropic|google',
        });
      }

      const userRef = req.body.user || req.query.user || 'adam';
      const userId = await resolveLifeOSUserId(pool, userRef);
      if (!userId) {
        return res.status(404).json({ ok: false, error: 'user_not_found', user: userRef });
      }

      const baseUrl = resolveRequestBaseUrl(req);
      const result = await executeProviderToolProofAction(pool, {
        provider,
        userId,
        utterance: text || parsed?.utterance || null,
        sessionId: req.body.session_id || null,
        baseUrl,
      });
      const status = result.ok ? 200 : result.error?.startsWith('missing_api_key') ? 503 : 502;
      return res.status(status).json({
        ...result,
        reply_text: formatProviderToolProofReply(result),
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

function resolveRequestBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (host) return `${proto}://${host}`;
  return (process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '') || null;
}
