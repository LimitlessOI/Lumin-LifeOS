// SYNOPSIS: MarketingOS YouTube connect + channel status + video suggestion routes
// @ssot docs/products/marketingos/PRODUCT_HOME.md

import { createYouTubeService } from '../services/marketing-youtube.js';

function resolveOwnerId(req) {
  const explicit = req?.query?.owner_id ?? req?.body?.owner_id ?? null;
  if (isNonEmptyString(explicit)) return String(explicit).trim();

  const handle = req?.lifeosUser?.handle ?? req?.user?.handle ?? null;
  if (isNonEmptyString(handle)) return String(handle).trim();

  const fromUser = req?.lifeosUser?.sub ?? req?.user?.id ?? null;
  if (!isNonEmptyString(fromUser)) return null;
  const id = String(fromUser).trim();
  // Command-key auth sometimes stamps synthetic ids — never use those as YouTube owners.
  if (id === 'emergency-key' || id === 'command-key' || id.startsWith('cmd-')) return null;
  // Numeric JWT sub is not the YouTube OAuth owner key (that's usually the handle).
  if (/^\d+$/.test(id)) return null;
  return id;
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

  app.post('/api/v1/marketing/youtube/intelligence', requireKey, async (req, res) => {
    try {
      const ownerId = resolveOwnerId(req) || 'adam';
      const videoId = req.body.video_id || req.body.id;
      if (!isNonEmptyString(videoId)) {
        return res.status(400).json({ ok: false, error: 'video_id is required' });
      }

      const distinctThumbnails = String(req.body.distinct_thumbnails || '').toLowerCase() === 'true';
      const retentionBeats = String(req.body.retention_beats || '').toLowerCase() === 'true';

      const mode = String(req.body.mode || '').toLowerCase();
      const wantFast = mode === 'fast';

      if (wantFast) {
        const fast = await youtube.getVideoIntelligence(ownerId, videoId, {
          callCouncilMember: null,
          fast: true,
          distinctThumbnails,
          retentionBeats,
        });
        return res.json({
          ...fast,
          mode: 'fast',
          hint: 'Fast intelligence pack (thumbnails only). Use Refresh for full analysis.',
        });
      }

      const INTELLIGENCE_BUDGET_MS = Number(process.env.MARKETING_YT_INTELLIGENCE_BUDGET_MS || 25000);
      const fullPromise = youtube.getVideoIntelligence(ownerId, videoId, {
        callCouncilMember,
        distinctThumbnails,
        retentionBeats,
      });
      const result = await Promise.race([
        fullPromise.then((r) => ({ __full: true, payload: r })).catch((err) => ({ __full_err: err })),
        new Promise((resolve) => setTimeout(() => resolve({ __budget: true }), INTELLIGENCE_BUDGET_MS)),
      ]);

      if (result && result.__full) {
        return res.json({ ...result.payload, mode: 'full' });
      }
      if (result && result.__full_err) {
        logger?.warn?.({ err: result.__full_err }, 'marketing youtube full intelligence failed; serving fast pack');
      }
      const fast = await youtube.getVideoIntelligence(ownerId, videoId, {
        callCouncilMember: null,
        fast: true,
        distinctThumbnails,
        retentionBeats,
      });
      return res.json({
        ...fast,
        mode: 'fast',
        timed_out: !result?.__full_err,
        hint: 'Returned fast intelligence pack under edge budget. Hit Refresh for full analysis.',
        full_error: result?.__full_err ? getErrorMessage(result.__full_err) : undefined,
      });
    } catch (error) {
      logger?.error?.({ err: error }, 'marketing youtube intelligence failed');
      try {
        const ownerId = resolveOwnerId(req) || 'adam';
        const videoId = req.body.video_id || req.body.id;
        const distinctThumbnails = String(req.body.distinct_thumbnails || '').toLowerCase() === 'true';
        const retentionBeats = String(req.body.retention_beats || '').toLowerCase() === 'true';
        const fast = await youtube.getVideoIntelligence(ownerId, videoId, {
          callCouncilMember: null,
          fast: true,
          distinctThumbnails,
          retentionBeats,
        });
        return res.status(200).json({
          ...fast,
          mode: 'fast',
          degraded: true,
          error: getErrorMessage(error),
          hint: 'Degraded fast pack after intelligence error.',
        });
      } catch (fallbackErr) {
        return res.status(500).json({ ok: false, error: getErrorMessage(error || fallbackErr) });
      }
    }
  });

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
      const mode = String(req.query.mode || '').toLowerCase();
      const wantFast = mode === 'fast'
        || req.query.fast === '1'
        || String(req.query.fast || '').toLowerCase() === 'true';

      // Explicit fast: skip YT research + AI + Sharp JPEG (SVG thumbs). Dashboard first paint.
      if (wantFast) {
        const fast = await youtube.getSuggestions(ownerId, {
          callCouncilMember: null,
          fast: true,
        });
        return res.json({
          ...fast,
          mode: 'fast',
          copy_rewrite_skipped: true,
          hint: 'Fast pack (playbook + SVG thumbs). Use Refresh ideas for full YouTube research + AI rewrite.',
        });
      }

      // Full path: Railway/proxy often kills ~30s. Race a budget, then return fast pack.
      const SUGGEST_BUDGET_MS = Number(process.env.MARKETING_YT_SUGGEST_BUDGET_MS || 18000);
      const fullPromise = youtube.getSuggestions(ownerId, { callCouncilMember });
      const result = await Promise.race([
        fullPromise.then((r) => ({ __full: true, payload: r })).catch((err) => ({ __full_err: err })),
        new Promise((resolve) => setTimeout(() => resolve({ __budget: true }), SUGGEST_BUDGET_MS)),
      ]);
      if (result && result.__full) {
        return res.json({ ...result.payload, mode: 'full' });
      }
      if (result && result.__full_err) {
        logger?.warn?.({ err: result.__full_err }, 'marketing youtube full suggestions failed; serving fast pack');
      }
      const fast = await youtube.getSuggestions(ownerId, {
        callCouncilMember: null,
        fast: true,
      });
      return res.json({
        ...fast,
        mode: 'fast',
        timed_out: !result?.__full_err,
        copy_rewrite_skipped: true,
        hint: 'Returned playbook + SVG thumbs under edge budget. Hit Refresh ideas again when tip is warm for full research.',
        full_error: result?.__full_err ? getErrorMessage(result.__full_err) : undefined,
      });
    } catch (error) {
      logger?.error?.({ err: error }, 'marketing youtube suggestions failed');
      // Last resort: never 502 the dashboard — empty playbook pack is better than gateway death.
      try {
        const ownerId = resolveOwnerId(req) || 'adam';
        const fast = await youtube.getSuggestions(ownerId, { callCouncilMember: null, fast: true });
        return res.status(200).json({
          ...fast,
          mode: 'fast',
          degraded: true,
          copy_rewrite_skipped: true,
          error: getErrorMessage(error),
          hint: 'Degraded fast pack after suggestions error.',
        });
      } catch (fallbackErr) {
        return res.status(500).json({ ok: false, error: getErrorMessage(error || fallbackErr) });
      }
    }
  });

  app.get('/api/v1/marketing/youtube/intelligence', requireKey, async (req, res) => {
    try {
      const ownerId = resolveOwnerId(req) || 'adam';
      const videoId = req.query.video_id || req.query.id;
      if (!isNonEmptyString(videoId)) {
        return res.status(400).json({ ok: false, error: 'video_id is required' });
      }

      const distinctThumbnails = String(req.query.distinct_thumbnails || '').toLowerCase() === 'true';
      const retentionBeats = String(req.query.retention_beats || '').toLowerCase() === 'true';

      const mode = String(req.query.mode || '').toLowerCase();
      const wantFast = mode === 'fast'
        || req.query.fast === '1'
        || String(req.query.fast || '').toLowerCase() === 'true';

      if (wantFast) {
        const fast = await youtube.getVideoIntelligence(ownerId, videoId, {
          callCouncilMember: null,
          fast: true,
          distinctThumbnails,
          retentionBeats,
        });
        return res.json({
          ...fast,
          mode: 'fast',
          hint: 'Fast intelligence pack (thumbnails only). Use Refresh for full analysis.',
        });
      }

      const INTELLIGENCE_BUDGET_MS = Number(process.env.MARKETING_YT_INTELLIGENCE_BUDGET_MS || 25000);
      const fullPromise = youtube.getVideoIntelligence(ownerId, videoId, {
        callCouncilMember,
        distinctThumbnails,
        retentionBeats,
      });
      const result = await Promise.race([
        fullPromise.then((r) => ({ __full: true, payload: r })).catch((err) => ({ __full_err: err })),
        new Promise((resolve) => setTimeout(() => resolve({ __budget: true }), INTELLIGENCE_BUDGET_MS)),
      ]);

      if (result && result.__full) {
        return res.json({ ...result.payload, mode: 'full' });
      }
      if (result && result.__full_err) {
        logger?.warn?.({ err: result.__full_err }, 'marketing youtube full intelligence failed; serving fast pack');
      }
      const fast = await youtube.getVideoIntelligence(ownerId, videoId, {
        callCouncilMember: null,
        fast: true,
        distinctThumbnails,
        retentionBeats,
      });
      return res.json({
        ...fast,
        mode: 'fast',
        timed_out: !result?.__full_err,
        hint: 'Returned fast intelligence pack under edge budget. Hit Refresh for full analysis.',
        full_error: result?.__full_err ? getErrorMessage(result.__full_err) : undefined,
      });
    } catch (error) {
      logger?.error?.({ err: error }, 'marketing youtube intelligence failed');
      try {
        const ownerId = resolveOwnerId(req) || 'adam';
        const videoId = req.query.video_id || req.query.id;
        const distinctThumbnails = String(req.query.distinct_thumbnails || '').toLowerCase() === 'true';
        const retentionBeats = String(req.query.retention_beats || '').toLowerCase() === 'true';
        const fast = await youtube.getVideoIntelligence(ownerId, videoId, {
          callCouncilMember: null,
          fast: true,
          distinctThumbnails,
          retentionBeats,
        });
        return res.status(200).json({
          ...fast,
          mode: 'fast',
          degraded: true,
          error: getErrorMessage(error),
          hint: 'Degraded fast pack after intelligence error.',
        });
      } catch (fallbackErr) {
        return res.status(500).json({ ok: false, error: getErrorMessage(error || fallbackErr) });
      }
    }
  });

  app.post('/api/v1/marketing/youtube/channel-url', requireKey, async (req, res) => {
    try {
      const ownerId = resolveOwnerId(req) || 'adam';
      const channelUrl = req.body?.channel_url || req.body?.youtubeChannelUrl || '';
      const result = await youtube.saveChannelUrl(ownerId, channelUrl);
      if (!result.ok) return res.status(400).json(result);
      return res.json(result);
    } catch (error) {
      logger?.error?.({ err: error }, 'marketing youtube channel-url save failed');
      return res.status(500).json({ ok: false, error: getErrorMessage(error) });
    }
  });

  app.get('/api/v1/marketing/youtube/intelligence', requireKey, async (req, res) => {
    try {
      const ownerId = resolveOwnerId(req) || 'adam';
      const videoId = req.query?.video_id;
      if (!isNonEmptyString(videoId)) {
        return res.status(400).json({ ok: false, error: 'video_id is required' });
      }
      const result = await youtube.getVideoIntelligence(ownerId, videoId);
      if (!result.ok) {
        return res.status(result.status || 500).json(result);
      }
      return res.json(result);
    } catch (error) {
      logger?.error?.({ err: error, videoId }, 'marketing youtube intelligence failed');
      return res.status(500).json({ ok: false, error: getErrorMessage(error) });
    }
  });

  app.get('/api/v1/marketing/youtube/video-thumbnails', requireKey, async (req, res) => {
    try {
      const ownerId = resolveOwnerId(req) || 'adam';
      const videoId = req.query?.video_id;
      if (!isNonEmptyString(videoId)) {
        return res.status(400).json({ ok: false, error: 'video_id is required' });
      }
      const result = await youtube.getVideoThumbnails(ownerId, videoId);
      if (!result.ok) {
        return res.status(result.status || 500).json(result);
      }
      return res.json(result);
    } catch (error) {
      logger?.error?.({ err: error, videoId }, 'marketing youtube video-thumbnails failed');
      return res.status(500).json({ ok: false, error: getErrorMessage(error) });
    }
  });

  app.get('/api/v1/marketing/youtube/retention-beats', requireKey, async (req, res) => {
    try {
      const ownerId = resolveOwnerId(req) || 'adam';
      const videoId = req.query?.video_id;
      if (!isNonEmptyString(videoId)) {
        return res.status(400).json({ ok: false, error: 'video_id is required' });
      }
      const result = await youtube.getVideoRetentionBeats(ownerId, videoId);
      if (!result.ok) {
        return res.status(result.status || 500).json(result);
      }
      return res.json(result);
    } catch (error) {
      logger?.error?.({ err: error, videoId }, 'marketing youtube retention-beats failed');
      return res.status(500).json({ ok: false, error: getErrorMessage(error) });
    }
  });

  // This is the correct export name for the router. Do not remove or rename.
}

export default registerMarketingYoutubeRoutes;

// DEPRECATED: legacy name for backwards compatibility. Do not use.
export const registerYouTubeRoutes = registerMarketingYoutubeRoutes;
