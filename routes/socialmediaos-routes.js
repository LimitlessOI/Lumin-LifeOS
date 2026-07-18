/**
 * SYNOPSIS: SocialMediaOS API routes — sessions, content packs, and marketplace checkout.
 * @ssot docs/products/marketingos/socialmediaos/PRODUCT_HOME.md
 */
import express from 'express';
import { createMarketingOSFactory } from '../services/socialmediaos-service.js';
import { resolvePublicBaseUrl } from '../config/public-origin.js';

export function createSocialmediaosRoutes({ pool, requireKey, logger }) {
  const router = express.Router();
  const socialMediaOS = createMarketingOSFactory({ pool, logger });

  function baseUrlFromReq(req) {
    return resolvePublicBaseUrl(
      process.env.SMOS_BASE_URL,
      process.env.PUBLIC_BASE_URL,
      process.env.BASE_URL,
      process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '',
    ) || `${req.protocol}://${req.get('host')}`;
  }

  // Middleware to extract ownerId from JWT and enforce authentication
  const getOwnerId = (req, res, next) => {
    const ownerId = req.lifeosUser?.sub || null;
    if (!ownerId) {
      return res.status(401).json({ error: 'jwt_required' });
    }
    req.ownerId = ownerId;
    next();
  };

  // --- Session Management Endpoints ---

  router.post('/sessions', requireKey, getOwnerId, async (req, res, next) => {
    try {
      const { scheduledFor, initialStatus } = req.body;
      const session = await socialMediaOS.createSession({
        ownerId: req.ownerId,
        scheduledFor,
        initialStatus,
      });
      res.json({ ok: true, session });
    } catch (err) {
      if (err.status === 400) return res.status(400).json({ ok: false, error: err.message });
      next(err);
    }
  });

  router.get('/sessions', requireKey, getOwnerId, async (req, res, next) => {
    try {
      const { status, limit } = req.query;
      const sessions = await socialMediaOS.listSessions({
        ownerId: req.ownerId,
        status,
        limit,
      });
      res.json({ ok: true, sessions, count: sessions.length });
    } catch (err) {
      if (err.status === 400) return res.status(400).json({ ok: false, error: err.message });
      next(err);
    }
  });

  router.get('/sessions/:id', requireKey, getOwnerId, async (req, res, next) => {
    try {
      const session = await socialMediaOS.getSession({
        sessionId: req.params.id,
        ownerId: req.ownerId,
      });
      res.json({ ok: true, session });
    } catch (err) {
      if (err.status === 404) return res.status(404).json({ ok: false, error: err.message });
      next(err);
    }
  });

  router.put('/sessions/:id', requireKey, getOwnerId, async (req, res, next) => {
    try {
      const { status, scheduledFor, startedAt, completedAt, deliveryStatus, deliveryErrorMessage } = req.body;
      const updatedSession = await socialMediaOS.updateSession({
        sessionId: req.params.id,
        ownerId: req.ownerId,
        status,
        scheduledFor,
        startedAt,
        completedAt,
        deliveryStatus,
        deliveryErrorMessage,
      });
      res.json({ ok: true, updatedSession });
    } catch (err) {
      if (err.status === 404) return res.status(404).json({ ok: false, error: err.message });
      if (err.status === 400) return res.status(400).json({ ok: false, error: err.message });
      next(err);
    }
  });

  // --- Content Pack Management Endpoints ---

  router.post('/sessions/:sessionId/content-packs', requireKey, getOwnerId, async (req, res, next) => {
    try {
      const { scheduledFor, initialStatus } = req.body;
      const contentPack = await socialMediaOS.createContentPack({
        sessionId: req.params.sessionId,
        ownerId: req.ownerId,
        scheduledFor,
        initialStatus,
      });
      res.json({ ok: true, contentPack });
    } catch (err) {
      if (err.status === 404) return res.status(404).json({ ok: false, error: err.message });
      if (err.status === 400) return res.status(400).json({ ok: false, error: err.message });
      next(err);
    }
  });

  router.get('/sessions/:sessionId/content-packs', requireKey, getOwnerId, async (req, res, next) => {
    try {
      const { status, limit } = req.query;
      const contentPacks = await socialMediaOS.listContentPacksForSession({
        sessionId: req.params.sessionId,
        ownerId: req.ownerId,
        status,
        limit,
      });
      res.json({ ok: true, contentPacks, count: contentPacks.length });
    } catch (err) {
      if (err.status === 404) return res.status(404).json({ ok: false, error: err.message });
      if (err.status === 400) return res.status(400).json({ ok: false, error: err.message });
      next(err);
    }
  });

  router.get('/content-packs/:id', requireKey, getOwnerId, async (req, res, next) => {
    try {
      const contentPack = await socialMediaOS.getContentPack({
        contentPackId: req.params.id,
        ownerId: req.ownerId,
      });
      res.json({ ok: true, contentPack });
    } catch (err) {
      if (err.status === 404) return res.status(404).json({ ok: false, error: err.message });
      next(err);
    }
  });

  router.put('/content-packs/:id', requireKey, getOwnerId, async (req, res, next) => {
    try {
      const { status, scheduledFor, publishedAt, deliveryStatus, deliveryErrorMessage } = req.body;
      const updatedContentPack = await socialMediaOS.updateContentPack({
        contentPackId: req.params.id,
        ownerId: req.ownerId,
        status,
        scheduledFor,
        publishedAt,
        deliveryStatus,
        deliveryErrorMessage,
      });
      res.json({ ok: true, updatedContentPack });
    } catch (err) {
      if (err.status === 404) return res.status(404).json({ ok: false, error: err.message });
      if (err.status === 400) return res.status(400).json({ ok: false, error: err.message });
      next(err);
    }
  });

  // --- Content Pack Marketplace Checkout ---

  router.get('/content-pack/pricing', async (_req, res) => {
    res.json(socialMediaOS.getContentPackPricing());
  });

  router.post('/content-pack/checkout', requireKey, getOwnerId, async (req, res, next) => {
    try {
      const { sessionId, packId } = req.body || {};
      const result = await socialMediaOS.createContentPackCheckout({
        ownerId: req.ownerId,
        baseUrl: baseUrlFromReq(req),
        sessionId,
        packId,
      });
      res.json(result);
    } catch (err) {
      if (err.status === 400) return res.status(400).json({ ok: false, error: err.message });
      if (err.status === 404) return res.status(404).json({ ok: false, error: err.message });
      if (err.status === 503) return res.status(503).json({ ok: false, error: err.message });
      next(err);
    }
  });

  // Public post-payment return URLs — Stripe redirects here with no JWT/command key.
  router.get('/content-pack/success', async (req, res, next) => {
    try {
      const contentPackId = String(req.query.contentPackId || '');
      const checkoutSessionId = String(req.query.session_id || '');
      if (!contentPackId || !checkoutSessionId) {
        return res.status(400).send('Missing payment confirmation parameters.');
      }
      const result = await socialMediaOS.verifyContentPackCheckout({
        ownerId: req.lifeosUser?.sub || null,
        contentPackId,
        checkoutSessionId,
      });
      if (!result.ok) {
        return res.status(400).send(`Payment verification failed: ${result.paymentStatus}`);
      }
      res.redirect(302, `${baseUrlFromReq(req)}/overlay/marketing-for-you.html?paid=1&pack=${encodeURIComponent(contentPackId)}`);
    } catch (err) {
      next(err);
    }
  });

  router.get('/content-pack/cancel', async (req, res, next) => {
    try {
      const contentPackId = String(req.query.contentPackId || '');
      res.redirect(302, `${baseUrlFromReq(req)}/overlay/marketing-for-you.html?canceled=1&pack=${encodeURIComponent(contentPackId)}`);
    } catch (err) {
      next(err);
    }
  });

  // --- Payment Link Validation Endpoint ---

  router.post('/validate-payment-link', requireKey, getOwnerId, async (req, res, next) => {
    try {
      const { link } = req.body;
      const validationResult = socialMediaOS.validateStripePaymentLink({ link });
      res.json({ ok: true, validationResult });
    } catch (err) {
      // validateStripePaymentLink is synchronous and doesn't throw, but for consistency
      next(err);
    }
  });

  return router;
}