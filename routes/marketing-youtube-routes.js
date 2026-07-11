// SYNOPSIS: Thin Express surface for the per-client YouTube connect flow.
// @ssot docs/products/marketingos/PRODUCT_HOME.md

import { createYouTubeService } from '../services/marketing-youtube.js';

function resolveOwnerId(req) {
  return req?.user?.id ?? req?.lifeosUser?.sub ?? req?.query?.owner_id ?? null;
}

function safeErrorMessage(err) {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  return err.message || err.error || 'Unknown error';
}

function registerMarketingYoutubeRoutes(app, deps = {}) {
  const { requireKey, logger, pool } = deps;
  const youtubeService = createYouTubeService({ pool, logger, baseUrl: deps.baseUrl, callCouncilMember: deps.callCouncilMember });

  app.get('/api/v1/marketing/youtube/connect', requireKey, async (req, res) => {
    try {
      const ownerId = resolveOwnerId(req);
      if (!ownerId) {
        return res.status(400).json({ ok: false, error: 'owner_id is required' });
      }

      const result = await youtubeService.getAuthUrl(ownerId);
      if (result?.error) {
        return res.status(503).json({ ok: false, error: result.error });
      }

      if (!result?.authUrl) {
        return res.status(503).json({ ok: false, error: 'Unable to generate YouTube auth URL' });
      }

      return res.redirect(302, result.authUrl);
    } catch (err) {
      logger?.error?.({ err }, 'marketing youtube connect failed');
      return res.status(500).json({ ok: false, error: safeErrorMessage(err) });
    }
  });

  app.get('/api/v1/marketing/youtube/callback', async (req, res) => {
    try {
      const { code, state } = req.query || {};
      if (!code) {
        return res.redirect(302, '/marketing?youtube=error');
      }

      const ownerId = state || null;
      if (!ownerId) {
        return res.redirect(302, '/marketing?youtube=error');
      }

      const result = await youtubeService.handleCallback(code, ownerId);
      if (result?.error) {
        return res.redirect(302, '/marketing?youtube=error');
      }

      return res.redirect(302, '/marketing?youtube=connected');
    } catch (err) {
      logger?.error?.({ err }, 'marketing youtube callback failed');
      return res.redirect(302, '/marketing?youtube=error');
    }
  });

  app.get('/api/v1/marketing/youtube/status', requireKey, async (req, res) => {
    try {
      const ownerId = resolveOwnerId(req);
      if (!ownerId) {
        return res.status(400).json({ ok: false, error: 'owner_id is required' });
      }

      const result = await youtubeService.getStatus(ownerId);
      if (result?.error) {
        return res.status(503).json({ ok: false, error: result.error });
      }

      return res.json({
        ok: true,
        connected: Boolean(result?.connected),
        connectedSince: result?.connectedSince ?? null,
      });
    } catch (err) {
      logger?.error?.({ err }, 'marketing youtube status failed');
      return res.status(500).json({ ok: false, error: safeErrorMessage(err) });
    }
  });
}

export { registerMarketingYoutubeRoutes };
export default registerMarketingYoutubeRoutes;