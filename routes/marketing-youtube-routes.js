// SYNOPSIS: MarketingOS YouTube connect + channel status + video suggestion routes
// @ssot docs/products/marketingos/PRODUCT_HOME.md

import { createYouTubeService } from '../services/marketing-youtube.js';

function resolveOwnerId(req) {
  return req?.user?.id
    ?? req?.lifeosUser?.sub
    ?? req?.query?.owner_id
    ?? req?.body?.owner_id
    ?? null;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function getErrorMessage(error) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error';
}

export function registerMarketingYoutubeRoutes(app, deps = {}) {
  const { pool, requireKey, logger, callCouncilMember } = deps;
  const youtube = createYouTubeService({ pool, logger });

  app.get('/api/v1/marketing/youtube/connect', requireKey, async (req, res) => {
    try {
      const ownerId = resolveOwnerId(req) || 'adam';
      const result = await youtube.getAuthUrl(ownerId);
      if (result?.error) {
        return res.status(503).json({
          ok: false,
          error: result.error,
          blocker: result.blocker || null,
          next: result.next || null,
          redirectUri: result.redirectUri || null,
        });
      }
      if (!result?.authUrl) {
        return res.status(503).json({ ok: false, error: 'Unable to create YouTube authorization URL' });
      }
      const wantsJson = String(req.query.format || '') === 'json'
        || String(req.get('accept') || '').includes('application/json');
      if (wantsJson) {
        return res.json({ ok: true, authUrl: result.authUrl, redirectUri: result.redirectUri || null });
      }
      return res.redirect(302, result.authUrl);
    } catch (error) {
      logger?.error?.({ err: error }, 'marketing youtube connect failed');
      return res.status(500).json({ ok: false, error: getErrorMessage(error) });
    }
  });

  app.get('/api/v1/marketing/youtube/callback', async (req, res) => {
    try {
      const code = req?.query?.code;
      const state = req?.query?.state;
      const ownerId = Array.isArray(state) ? state[0] : state;

      if (!isNonEmptyString(code)) {
        return res.status(400).redirect('/marketing?youtube=error');
      }
      if (!isNonEmptyString(ownerId)) {
        return res.status(400).redirect('/marketing?youtube=error');
      }

      const result = await youtube.handleCallback(code, ownerId);
      if (result?.error) {
        logger?.warn?.({ error: result.error, ownerId }, 'marketing youtube callback failed');
        return res.redirect(302, '/marketing?youtube=error');
      }
      return res.redirect(302, '/marketing?youtube=connected');
    } catch (error) {
      logger?.error?.({ err: error }, 'marketing youtube callback failed');
      return res.redirect(302, '/marketing?youtube=error');
    }
  });

  app.get('/api/v1/marketing/youtube/status', requireKey, async (req, res) => {
    try {
      const ownerId = resolveOwnerId(req) || 'adam';
      const result = await youtube.getStatus(ownerId);
      if (result?.error && result.error !== 'database_pool_unavailable') {
        return res.status(503).json({ ok: false, error: result.error });
      }
      return res.json({
        ok: true,
        connected: Boolean(result?.connected),
        connectedSince: result?.connectedSince ?? null,
        oauthConfigured: Boolean(result?.oauthConfigured),
        redirectUri: result?.redirectUri || null,
        error: result?.error || null,
      });
    } catch (error) {
      logger?.error?.({ err: error }, 'marketing youtube status failed');
      return res.status(500).json({ ok: false, error: getErrorMessage(error) });
    }
  });

  app.get('/api/v1/marketing/youtube/channel', requireKey, async (req, res) => {
    try {
      const ownerId = resolveOwnerId(req) || 'adam';
      const result = await youtube.getChannel(ownerId);
      if (!result?.ok) {
        const status = result?.error === 'YouTube is not connected' ? 409 : 503;
        return res.status(status).json({ ok: false, error: result?.error || 'channel_unavailable' });
      }
      return res.json(result);
    } catch (error) {
      logger?.error?.({ err: error }, 'marketing youtube channel failed');
      return res.status(500).json({ ok: false, error: getErrorMessage(error) });
    }
  });

  app.get('/api/v1/marketing/youtube/suggestions', requireKey, async (req, res) => {
    try {
      const ownerId = resolveOwnerId(req) || 'adam';
      const result = await youtube.getSuggestions(ownerId, { callCouncilMember });
      return res.json(result);
    } catch (error) {
      logger?.error?.({ err: error }, 'marketing youtube suggestions failed');
      return res.status(500).json({ ok: false, error: getErrorMessage(error) });
    }
  });
}

export default registerMarketingYoutubeRoutes;
