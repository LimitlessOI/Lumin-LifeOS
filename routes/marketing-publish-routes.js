/**
 * SYNOPSIS: MarketingOS social publish + connections HTTP surface.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
import { listConnections } from '../services/marketing-social-connections.js';
import { publishApprovedPiece } from '../services/marketing-publisher.js';
import { createHash } from 'crypto';

function sendJson(res, statusCode, payload) {
  return res.status(statusCode).json(payload);
}

function toOwnerUuid(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(s)) {
    return s.toLowerCase();
  }
  const hex = createHash('sha256').update(`marketing-owner:${s}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function normalizeOwnerId(req) {
  return toOwnerUuid(
    req.lifeosUser?.sub
      || req.user?.id
      || req.user?.sub
      || req.body?.owner_id
      || req.query?.owner_id
      || null
  );
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

      const ownerId = normalizeOwnerId(req);
      if (!ownerId) {
        return sendJson(res, 400, { ok: false, error: 'owner_id_required' });
      }

      const pieceResult = await deps.pool.query(
        `SELECT p.*, s.owner_id
         FROM marketing_content_pieces p
         INNER JOIN marketing_sessions s ON s.id = p.session_id
         WHERE p.id = $1 AND s.owner_id = $2
         LIMIT 1`,
        [pieceId, ownerId],
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