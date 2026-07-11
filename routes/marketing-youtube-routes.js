// SYNOPSIS:
// @ssot docs/products/marketingos/PRODUCT_HOME.md

import { createYouTubeService } from '../services/marketing-youtube.js';

function resolveOwnerId(req) {
  return req?.user?.id ?? req?.lifeosUser?.sub ?? req?.query?.owner_id ?? null;
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
  const { pool, requireKey, logger } = deps;
  const youtube = createYouTubeService({ pool, logger });

  app.get('/api/v1/marketing/youtube/connect', requireKey, async (req, res) => {
    try {
      const ownerId = resolveOwnerId(req);
      if (!isNonEmptyString(ownerId)) {
        return res.status(400).json({ ok: false, error: 'owner_id is required' });
      }

      const result = await youtube.getAuthUrl(ownerId);
      if (result?.error) {
        return res.status(503).json({ ok: false, error: result.error });
      }

      if (!result?.authUrl) {
        return res.status(503).json({ ok: false, error: 'Unable to create YouTube authorization URL' });
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
      const ownerId = resolveOwnerId(req);
      if (!isNonEmptyString(ownerId)) {
        return res.status(400).json({ ok: false, error: 'owner_id is required' });
      }

      const result = await youtube.getStatus(ownerId);
      if (result?.error) {
        return res.status(503).json({ ok: false, error: result.error });
      }

      return res.json({
        ok: true,
        connected: Boolean(result?.connected),
        connectedSince: result?.connectedSince ?? null,
      });
    } catch (error) {
      logger?.error?.({ err: error }, 'marketing youtube status failed');
      return res.status(500).json({ ok: false, error: getErrorMessage(error) });
    }
  });
}

export default registerMarketingYoutubeRoutes;