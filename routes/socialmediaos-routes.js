/**
 * SYNOPSIS: Exports createSocialmediaosRoutes — routes/socialmediaos-routes.js.
 */
import express from 'express';
import { createMarketingOSFactory } from '../services/socialmediaos-service.js';

export function createSocialmediaosRoutes({ pool, requireKey, logger }) {
  const router = express.Router();
  const marketingOS = createMarketingOSFactory({ pool, logger });

  // Middleware to extract ownerId and enforce JWT auth
  const authenticateOwner = (req, res, next) => {
    const ownerId = req.lifeosUser?.sub || null;
    if (!ownerId) {
      return res.status(401).json({ error: 'jwt_required' });
    }
    req.ownerId = ownerId;
    next();
  };

  // --- Session Management Endpoints ---

  router.post('/sessions', requireKey, authenticateOwner, async (req, res, next) => {
    try {
      const { scheduledFor, initialStatus } = req.body;
      const session = await marketingOS.createSession({
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

  router.get('/sessions', requireKey, authenticateOwner, async (req, res, next) => {
    try {
      const { status, limit } = req.query;
      const sessions = await marketingOS.listSessions({
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

  router.get('/sessions/:sessionId', requireKey, authenticateOwner, async (req, res, next) => {
    try {
      const { sessionId } = req.params;
      const session = await marketingOS.getSession({
        sessionId,
        ownerId: req.ownerId,
      });
      res.json({ ok: true, session });
    } catch (err) {
      if (err.status === 404) return res.status(404).json({ ok: false, error: err.message });
      next(err);
    }
  });

  router.put('/sessions/:sessionId', requireKey, authenticateOwner, async (req, res, next) => {
    try {
      const { sessionId } = req.params;
      const { status, scheduledFor, startedAt, completedAt, deliveryStatus, deliveryErrorMessage } = req.body;
      const updatedSession = await marketingOS.updateSession({
        sessionId,
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
      if (err.status === 400) return res.status(400).json({ ok: false, error: err.message });
      if (err.status === 404) return res.status(404).json({ ok: false, error: err.message });
      next(err);
    }
  });

  // --- Content Pack Management Endpoints ---

  router.post('/sessions/:sessionId/content-packs', requireKey, authenticateOwner, async (req, res, next) => {
    try {
      const { sessionId } = req.params;
      const { scheduledFor, initialStatus } = req.body;
      const contentPack = await marketingOS.createContentPack({
        sessionId,
        ownerId: req.ownerId,
        scheduledFor,
        initialStatus,
      });
      res.json({ ok: true, contentPack });
    } catch (err) {
      if (err.status === 400) return res.status(400).json({ ok: false, error: err.message });
      if (err.status === 404) return res.status(404).json({ ok: false, error: err.message });
      next(err);
    }
  });

  router.get('/sessions/:sessionId/content-packs', requireKey, authenticateOwner, async (req, res, next) => {
    try {
      const { sessionId } = req.params;
      const { status, limit } = req.query;
      const contentPacks = await marketingOS.listContentPacksForSession({
        sessionId,
        ownerId: req.ownerId,
        status,
        limit,
      });
      res.json({ ok: true, contentPacks, count: contentPacks.length });
    } catch (err) {
      if (err.status === 400) return res.status(400).json({ ok: false, error: err.message });
      if (err.status === 404) return res.status(404).json({ ok: false, error: err.message });
      next(err);
    }
  });

  router.get('/content-packs/:contentPackId', requireKey, authenticateOwner, async (req, res, next) => {
    try {
      const { contentPackId } = req.params;
      const contentPack = await marketingOS.getContentPack({
        contentPackId,
        ownerId: req.ownerId,
      });
      res.json({ ok: true, contentPack });
    } catch (err) {
      if (err.status === 404) return res.status(404).json({ ok: false, error: err.message });
      next(err);
    }
  });

  router.put('/content-packs/:contentPackId', requireKey, authenticateOwner, async (req, res, next) => {
    try {
      const { contentPackId } = req.params;
      const { status, scheduledFor, publishedAt, deliveryStatus, deliveryErrorMessage } = req.body;
      const updatedContentPack = await marketingOS.updateContentPack({
        contentPackId,
        ownerId: req.ownerId,
        status,
        scheduledFor,
        publishedAt,
        deliveryStatus,
        deliveryErrorMessage,
      });
      res.json({ ok: true, updatedContentPack });
    } catch (err) {
      if (err.status === 400) return res.status(400).json({ ok: false, error: err.message });
      if (err.status === 404) return res.status(404).json({ ok: false, error: err.message });
      next(err);
    }
  });

  // --- Payment Link Validation Endpoint ---

  router.post('/validate-payment-link', requireKey, authenticateOwner, async (req, res, next) => {
    try {
      const { link } = req.body;
      const validationResult = marketingOS.validateStripePaymentLink({ link });
      res.json({ ok: true, validationResult });
    } catch (err) {
      // validateStripePaymentLink is synchronous and doesn't throw,
      // but including next(err) for consistency with other routes.
      next(err);
    }
  });

  return router;
}