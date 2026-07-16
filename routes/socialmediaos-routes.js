/**
 * SYNOPSIS: Exports createSocialmediaosRoutes — routes/socialmediaos-routes.js.
 * @ssot docs/products/marketingos/socialmediaos/PRODUCT_HOME.md
 */
import express from 'express';
import { resolvePublicBaseUrl } from '../config/public-origin.js';
import { createMarketingOSFactory } from '../services/socialmediaos-service.js';
import { createSmosContentPackCheckoutRoutes } from './smos-content-pack-checkout-routes.js';

export function createSocialmediaosRoutes({ pool, requireKey, logger }) {
  const router = express.Router();
  const socialMediaOS = createMarketingOSFactory({ pool, logger });
  const baseUrl = resolvePublicBaseUrl(
    process.env.SMOS_BASE_URL,
    process.env.PUBLIC_BASE_URL,
    process.env.BASE_URL,
    process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '',
  ) || `http://localhost:${process.env.PORT || 8080}`;

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

  // --- Content Pack Checkout ---

  router.use('/', createSmosContentPackCheckoutRoutes({ pool, requireKey, logger }));

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