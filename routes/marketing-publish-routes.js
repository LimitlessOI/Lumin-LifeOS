/**
 * SYNOPSIS: MarketingOS social connect + publish HTTP surface.
 * Connect = bank-style popup: user signs in on the platform's real page inside a
 * secured browser view; we never collect their password in an SMOS form.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
import {
  listConnections,
  revokeConnection,
} from '../services/marketing-social-connections.js';
import { publishApprovedPiece } from '../services/marketing-publisher.js';
import { SOCIAL_PLATFORMS } from '../services/marketing-social-goals.js';
import {
  startConnectSession,
  getConnectSessionStatus,
  interactConnectSession,
  completeConnectSession,
  cancelConnectSession,
  isSupportedSocialPlatform,
} from '../services/marketing-social-connect-session.js';
import { createSession as createBrowserSessionDefault } from '../services/browser-agent.js';

function sendJson(res, statusCode, payload) {
  return res.status(statusCode).json(payload);
}

async function resolveBrowserSession(deps, logger) {
  if (typeof deps.createBrowserSession === 'function') {
    return deps.createBrowserSession();
  }
  return createBrowserSessionDefault({ headless: true, logger });
}

function resolveCallModel(deps) {
  if (typeof deps.callModel === 'function') return deps.callModel;
  if (typeof deps.callCouncilMember === 'function') return deps.callCouncilMember;
  return undefined;
}

function normalizeOwnerId(req) {
  const explicit = req.user?.id ?? req.query?.owner_id ?? req.body?.owner_id ?? null;
  if (explicit && String(explicit).trim()) return String(explicit).trim();
  const handle = req.lifeosUser?.handle ?? req.user?.handle ?? null;
  if (handle && String(handle).trim()) return String(handle).trim();
  return null;
}

function getErrorMessage(err) {
  if (!err) return 'unknown_error';
  if (typeof err === 'string') return err;
  return err.message || 'unknown_error';
}

export function registerMarketingPublishRoutes(app, deps = {}) {
  const { requireKey, logger } = deps;

  app.get('/api/v1/marketing/social-connections', requireKey, async (req, res) => {
    try {
      const ownerId = normalizeOwnerId(req);
      if (!ownerId) {
        return sendJson(res, 400, { ok: false, error: 'owner_id_required' });
      }

      const listed = await listConnections(deps.pool, { ownerId });
      if (listed?.ok === false) {
        return sendJson(res, 500, { ok: false, error: listed.error || 'list_failed' });
      }
      const connections = Array.isArray(listed)
        ? listed
        : Array.isArray(listed?.connections)
          ? listed.connections
          : [];
      return sendJson(res, 200, {
        ok: true,
        ownerId,
        platforms: SOCIAL_PLATFORMS,
        livePublishEnabled: process.env.LIVE_SOCIAL_PUBLISH_ENABLED === 'true',
        connections,
      });
    } catch (err) {
      logger?.error?.({ err }, 'marketing social connections list failed');
      return sendJson(res, 500, { ok: false, error: getErrorMessage(err) });
    }
  });

  app.post('/api/v1/marketing/social-connections/connect', requireKey, async (req, res) => {
    try {
      const ownerId = normalizeOwnerId(req);
      const platform = String(req.body?.platform || '').toLowerCase();
      if (!ownerId) return sendJson(res, 400, { ok: false, error: 'owner_id_required' });
      if (!isSupportedSocialPlatform(platform)) {
        return sendJson(res, 400, { ok: false, error: 'unsupported_platform', platforms: SOCIAL_PLATFORMS });
      }

      const started = await startConnectSession({ ownerId, platform, logger });
      if (!started.ok) {
        const status = started.error === 'browser_launch_failed' ? 503 : 400;
        return sendJson(res, status, started);
      }
      return sendJson(res, 200, {
        ...started,
        popupPath: `/marketing/connect/${platform}?owner_id=${encodeURIComponent(ownerId)}`,
      });
    } catch (err) {
      logger?.error?.({ err }, 'marketing social connect start failed');
      return sendJson(res, 500, { ok: false, error: getErrorMessage(err) });
    }
  });

  app.get('/api/v1/marketing/social-connections/connect/:platform', requireKey, async (req, res) => {
    try {
      const ownerId = normalizeOwnerId(req);
      const platform = String(req.params.platform || '').toLowerCase();
      if (!ownerId) return sendJson(res, 400, { ok: false, error: 'owner_id_required' });
      const status = await getConnectSessionStatus({ ownerId, platform });
      if (!status.ok) return sendJson(res, 404, status);
      return sendJson(res, 200, status);
    } catch (err) {
      logger?.error?.({ err }, 'marketing social connect status failed');
      return sendJson(res, 500, { ok: false, error: getErrorMessage(err) });
    }
  });

  app.post('/api/v1/marketing/social-connections/connect/:platform/action', requireKey, async (req, res) => {
    try {
      const ownerId = normalizeOwnerId(req);
      const platform = String(req.params.platform || '').toLowerCase();
      if (!ownerId) return sendJson(res, 400, { ok: false, error: 'owner_id_required' });
      const result = await interactConnectSession({
        ownerId,
        platform,
        action: req.body?.action,
        payload: req.body?.payload || req.body || {},
      });
      if (!result.ok) return sendJson(res, 400, result);
      return sendJson(res, 200, result);
    } catch (err) {
      logger?.error?.({ err }, 'marketing social connect action failed');
      return sendJson(res, 500, { ok: false, error: getErrorMessage(err) });
    }
  });

  app.post('/api/v1/marketing/social-connections/connect/:platform/complete', requireKey, async (req, res) => {
    try {
      const ownerId = normalizeOwnerId(req);
      const platform = String(req.params.platform || '').toLowerCase();
      if (!ownerId) return sendJson(res, 400, { ok: false, error: 'owner_id_required' });
      const result = await completeConnectSession({ pool: deps.pool, ownerId, platform });
      if (!result.ok) return sendJson(res, 400, result);
      return sendJson(res, 200, result);
    } catch (err) {
      logger?.error?.({ err }, 'marketing social connect complete failed');
      return sendJson(res, 500, { ok: false, error: getErrorMessage(err) });
    }
  });

  app.post('/api/v1/marketing/social-connections/connect/:platform/cancel', requireKey, async (req, res) => {
    try {
      const ownerId = normalizeOwnerId(req);
      const platform = String(req.params.platform || '').toLowerCase();
      if (!ownerId) return sendJson(res, 400, { ok: false, error: 'owner_id_required' });
      const result = await cancelConnectSession({ ownerId, platform });
      return sendJson(res, 200, result);
    } catch (err) {
      logger?.error?.({ err }, 'marketing social connect cancel failed');
      return sendJson(res, 500, { ok: false, error: getErrorMessage(err) });
    }
  });

  app.delete('/api/v1/marketing/social-connections/:platform', requireKey, async (req, res) => {
    try {
      const ownerId = normalizeOwnerId(req);
      const platform = String(req.params.platform || '').toLowerCase();
      if (!ownerId) return sendJson(res, 400, { ok: false, error: 'owner_id_required' });
      if (!isSupportedSocialPlatform(platform)) {
        return sendJson(res, 400, { ok: false, error: 'unsupported_platform' });
      }
      const result = await revokeConnection(deps.pool, { ownerId, platform });
      if (result?.ok === false) return sendJson(res, 500, result);
      return sendJson(res, 200, { ok: true, connection: result.connection });
    } catch (err) {
      logger?.error?.({ err }, 'marketing social revoke failed');
      return sendJson(res, 500, { ok: false, error: getErrorMessage(err) });
    }
  });

  app.post('/api/v1/marketing/publish', requireKey, async (req, res) => {
    let session = null;
    try {
      const pieceId = req.body?.piece_id;
      if (!pieceId) {
        return sendJson(res, 400, { ok: false, error: 'piece_id_required' });
      }

      const pieceResult = await deps.pool.query(
        'SELECT * FROM marketing_content_pieces WHERE id = $1 LIMIT 1',
        [pieceId],
      );

      const piece = pieceResult.rows[0];
      if (!piece) {
        return sendJson(res, 404, { ok: false, error: 'piece_not_found' });
      }

      if (piece.status !== 'approved') {
        return sendJson(res, 400, { ok: false, error: 'not_approved' });
      }

      const live = process.env.LIVE_SOCIAL_PUBLISH_ENABLED === 'true';
      if (live) {
        try {
          session = await resolveBrowserSession(deps, logger);
        } catch (err) {
          return sendJson(res, 503, {
            ok: false,
            reason: 'browser_session_unavailable',
            error: getErrorMessage(err),
          });
        }
      }

      const result = await publishApprovedPiece({
        pool: deps.pool,
        piece,
        session,
        callModel: resolveCallModel(deps),
      });

      return sendJson(res, 200, result);
    } catch (err) {
      logger?.error?.({ err }, 'marketing publish failed');
      return sendJson(res, 500, { ok: false, error: getErrorMessage(err) });
    } finally {
      try { await session?.close?.(); } catch { /* ignore */ }
    }
  });
}

export default registerMarketingPublishRoutes;