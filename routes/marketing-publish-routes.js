/**
 * SYNOPSIS: MarketingOS social publish + connections HTTP surface.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
import { listConnections } from '../services/marketing-social-connections.js';
import { publishApprovedPiece } from '../services/marketing-publisher.js';

function sendJson(res, statusCode, payload) {
  return res.status(statusCode).json(payload);
}

function normalizeOwnerId(req) {
  return req.user?.id ?? req.query?.owner_id ?? req.body?.owner_id ?? null;
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
      const connections = Array.isArray(listed)
        ? listed
        : Array.isArray(listed?.connections)
          ? listed.connections
          : [];
      return sendJson(res, 200, { ok: true, connections });
    } catch (err) {
      logger?.error?.({ err }, 'marketing social connections list failed');
      return sendJson(res, 500, { ok: false, error: getErrorMessage(err) });
    }
  });

  app.post('/api/v1/marketing/publish', requireKey, async (req, res) => {
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

      if (typeof deps.createBrowserSession !== 'function') {
        return sendJson(res, 503, { ok: false, reason: 'browser_session_unavailable' });
      }

      const session = await deps.createBrowserSession();
      const result = await publishApprovedPiece({
        pool: deps.pool,
        piece,
        session,
        callModel: deps.callModel,
      });

      return sendJson(res, 200, result);
    } catch (err) {
      logger?.error?.({ err }, 'marketing publish failed');
      return sendJson(res, 500, { ok: false, error: getErrorMessage(err) });
    }
  });
}

export default registerMarketingPublishRoutes;