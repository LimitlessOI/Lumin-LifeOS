/**
 * SYNOPSIS: SocialMediaOS public signup + $49 pack checkout/verify (client-ready).
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 */
import { createHash } from 'crypto';
import { createLifeOSAuth } from '../services/lifeos-auth.js';
import {
  createSmosPackCheckoutSession,
  verifySmosPackCheckoutSession,
} from '../services/smos-pack-checkout.js';
import { SMOS_PRICING, getSmosPackOfferSummary } from '../config/smos-pricing.js';

function toOwnerUuid(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)) {
    return s.toLowerCase();
  }
  const hex = createHash('sha256').update(`marketing-owner:${s}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function callerOwnerUuid(req) {
  const handle = req.lifeosUser?.handle || req.user?.handle || null;
  const sub = req.lifeosUser?.sub || req.user?.id || req.user?.sub || null;
  if (handle) return toOwnerUuid(handle);
  if (sub) return toOwnerUuid(sub);
  return null;
}

function isFounderBypass(req) {
  const role = String(req.lifeosUser?.role || '').toLowerCase();
  const handle = String(req.lifeosUser?.handle || '').toLowerCase();
  if (role === 'admin' || role === 'founder' || handle === 'adam') return true;
  if (!req.lifeosUser && (req.headers['x-command-key'] || req.headers['x-api-key'])) return true;
  return false;
}

export function registerSmosPackCheckoutRoutes(app, deps = {}) {
  const { pool, baseUrl, logger = console, requireUserOrKey = null } = deps;
  const resolvedBase =
    baseUrl ||
    process.env.PUBLIC_BASE_URL ||
    process.env.APP_URL ||
    '';
  const auth = pool ? createLifeOSAuth(pool) : null;
  const gate = typeof requireUserOrKey === 'function'
    ? requireUserOrKey
    : (_req, res) => res.status(401).json({ ok: false, error: 'Unauthorized' });

  app.get('/api/v1/marketing/pack/pricing', (_req, res) => {
    res.json({
      ok: true,
      pack: SMOS_PRICING.pack,
      offer: getSmosPackOfferSummary(),
      public_signup: String(process.env.SMOS_PUBLIC_SIGNUP_ENABLED || 'true').toLowerCase() !== 'false',
    });
  });

  // Client signup — no invite, no command key
  app.post('/api/v1/marketing/public/signup', async (req, res) => {
    try {
      if (!auth) return res.status(503).json({ ok: false, error: 'auth_unavailable' });
      const result = await auth.registerPublicSmos({
        email: req.body?.email,
        password: req.body?.password,
        handle: req.body?.handle || req.body?.username,
        displayName: req.body?.display_name || req.body?.displayName || req.body?.name,
        userAgent: req.get('user-agent'),
        ip: req.ip,
      });
      return res.status(201).json({
        ok: true,
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        next: '/marketing',
      });
    } catch (error) {
      const status = error.status || 500;
      logger?.error?.('[SMOS-SIGNUP] failed', { error: error.message });
      return res.status(status).json({ ok: false, error: error.message });
    }
  });

  app.post('/api/v1/marketing/pack/checkout', gate, async (req, res) => {
    try {
      const sessionId = String(req.body?.session_id || req.body?.sessionId || '').trim();
      if (!sessionId) {
        return res.status(400).json({ ok: false, error: 'session_id is required' });
      }

      const owned = await pool.query(
        `SELECT id, owner_id FROM marketing_sessions WHERE id = $1 LIMIT 1`,
        [sessionId]
      );
      if (!owned.rows.length) {
        return res.status(404).json({ ok: false, error: 'Session not found' });
      }

      const sessionOwner = owned.rows[0].owner_id;
      const caller = callerOwnerUuid(req);
      if (!isFounderBypass(req)) {
        if (!caller || caller !== sessionOwner) {
          return res.status(403).json({ ok: false, error: 'You can only buy packs you own' });
        }
      }

      const ownerId = isFounderBypass(req)
        ? (caller || sessionOwner)
        : caller;

      const result = await createSmosPackCheckoutSession({
        sessionId,
        ownerId: ownerId || sessionOwner,
        baseUrl: resolvedBase || `${req.protocol}://${req.get('host')}`,
        pool,
      });
      if (!result.ok) {
        const status = /not found/i.test(result.error || '') ? 404 : 400;
        return res.status(status).json(result);
      }
      return res.status(200).json(result);
    } catch (error) {
      logger?.error?.('[SMOS-CHECKOUT] create failed', { error: error.message });
      return res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get('/api/v1/marketing/pack/verify', async (req, res) => {
    try {
      const checkoutSessionId = String(req.query.checkout_session_id || req.query.session_id || '').trim();
      const expectedMarketingSessionId = String(req.query.marketing_session_id || req.query.session || '').trim();
      const result = await verifySmosPackCheckoutSession({
        checkoutSessionId,
        expectedMarketingSessionId: expectedMarketingSessionId || undefined,
      });
      if (result.ok && result.paid && pool && (result.marketingSessionId || expectedMarketingSessionId)) {
        const sid = result.marketingSessionId || expectedMarketingSessionId;
        try {
          await pool.query(
            `UPDATE marketing_pack_checkouts
                SET status = 'paid', paid_at = COALESCE(paid_at, NOW())
              WHERE stripe_session_id = $1`,
            [checkoutSessionId]
          );
          await pool.query(
            `INSERT INTO marketing_pack_checkouts (session_id, stripe_session_id, amount_cents, status, created_at, paid_at)
             VALUES ($1, $2, $3, 'paid', NOW(), NOW())
             ON CONFLICT (stripe_session_id) DO UPDATE
               SET status = 'paid', paid_at = COALESCE(marketing_pack_checkouts.paid_at, NOW())`,
            [sid, checkoutSessionId, result.amountTotal || SMOS_PRICING.pack.oneTimeCents]
          );
        } catch (err) {
          logger?.warn?.('[SMOS-CHECKOUT] paid persist failed', { error: err.message });
        }
      }
      if (result.ok && result.paid) return res.status(200).json(result);
      const err = String(result.error || '');
      const status =
        /required|invalid_|not_found|mismatch/i.test(err) ? 400
          : /incomplete/i.test(err) ? 402
            : 402;
      return res.status(status).json(result);
    } catch (error) {
      logger?.error?.('[SMOS-CHECKOUT] verify failed', { error: error.message });
      return res.status(400).json({ ok: false, error: 'verify_failed', paid: false });
    }
  });

  logger?.info?.('SMOS pack checkout + public signup registered at /api/v1/marketing/pack/* and /public/signup');
}

export default registerSmosPackCheckoutRoutes;