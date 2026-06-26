/**
 * SYNOPSIS: Exports createSocialmediaosRoutes — routes/socialmediaos-routes.js.
 */
import express from 'express';
import { createMarketingOSFactory } from '../services/socialmediaos-service.js';

export function createSocialmediaosRoutes(app, ctx) {
  const router = express.Router();
  const { pool, rk, logger } = ctx;

  const socialMediaService = createMarketingOSFactory({ pool, logger });

  // Helper to extract ownerId and handle 401 response
  const getOwnerId = (req, res) => {
    const ownerId = req.lifeosUser?.sub || null;
    if (!ownerId) {
      res.status(401).json({ ok: false, error: 'jwt_required' });
      return null;
    }
    return ownerId;
  };

  // --- Session Management Endpoints ---

  // POST /sessions - Create a new session
  router.post('/sessions', rk, async (req, res, next) => {
    try {
      const ownerId = getOwnerId(req, res);
      if (!ownerId) return;

      const { scheduledFor, initialStatus } = req.body;
      const session = await socialMediaService.createSession({
        ownerId,
        scheduledFor,
        initialStatus,
      });
      res.json({ ok: true, session });
    } catch (err) {
      if (err.status === 400) return res.status(400).json({ ok: false, error: err.message });
      if (err.status === 401) return res.status(401).json({ ok: false, error: err.message });
      next(err);
    }
  });

  // GET /sessions/:id - Get a specific session
  router.get('/sessions/:id', rk, async (req, res, next) => {
    try {
      const ownerId = getOwnerId(req, res);
      if (!ownerId) return;

      const { id: sessionId } = req.params;
      const session = await socialMediaService.getSession({ sessionId, ownerId });
      res.json({ ok: true, session });
    } catch (err) {
      if (err.status === 404) return res.status(404).json({ ok: false, error: err.message });
      if (err.status === 401) return res.status(401).json({ ok: false, error: err.message });
      next(err);
    }
  });

  // PUT /sessions/:id - Update a specific session
  router.put('/sessions/:id', rk, async (req, res, next) => {
    try {
      const ownerId = getOwnerId(req, res);
      if (!ownerId) return;

      const { id: sessionId } = req.params;
      const { status, scheduledFor, startedAt, completedAt, deliveryStatus, deliveryErrorMessage } = req.body;
      const updatedSession = await socialMediaService.updateSession({
        sessionId,
        ownerId,
        status,
        scheduledFor,
        startedAt,
        completedAt,
        deliveryStatus,
        deliveryErrorMessage,
      });
      res.json({ ok: true, session: updatedSession });
    } catch (err) {
      if (err.status === 400) return res.status(400).json({ ok: false, error: err.message });
      if (err.status === 401) return res.status(401).json({ ok: false, error: err.message });
      if (err.status === 404) return res.status(404).json({ ok: false, error: err.message });
      next(err);
    }
  });

  // GET /sessions - List sessions for the owner
  router.get('/sessions', rk, async (req, res, next) => {
    try {
      const ownerId = getOwnerId(req, res);
      if (!ownerId) return;

      const { status, limit } = req.query;
      const sessions = await socialMediaService.listSessions({ ownerId, status, limit });
      res.json({ ok: true, sessions, count: sessions.length });
    } catch (err) {
      if (err.status === 400) return res.status(400).json({ ok: false, error: err.message });
      if (err.status === 401) return res.status(401).json({ ok: false, error: err.message });
      next(err);
    }
  });

  // --- Content Pack Management Endpoints ---

  // POST /sessions/:sessionId/content-packs - Create a new content pack for a session
  router.post('/sessions/:sessionId/content-packs', rk, async (req, res, next) => {
    try {
      const ownerId = getOwnerId(req, res);
      if (!ownerId) return;

      const { sessionId } = req.params;
      const { scheduledFor, initialStatus } = req.body;
      const contentPack = await socialMediaService.createContentPack({
        sessionId,
        ownerId,
        scheduledFor,
        initialStatus,
      });
      res.json({ ok: true, contentPack });
    } catch (err) {
      if (err.status === 400) return res.status(400).json({ ok: false, error: err.message });
      if (err.status === 401) return res.status(401).json({ ok: false, error: err.message });
      if (err.status === 404) return res.status(404).json({ ok: false, error: err.message }); // Session not found
      next(err);
    }
  });

  // GET /content-packs/:id - Get a specific content pack
  router.get('/content-packs/:id', rk, async (req, res, next) => {
    try {
      const ownerId = getOwnerId(req, res);
      if (!ownerId) return;

      const { id: contentPackId } = req.params;
      const contentPack = await socialMediaService.getContentPack({ contentPackId, ownerId });
      res.json({ ok: true, contentPack });
    } catch (err) {
      if (err.status === 404) return res.status(404).json({ ok: false, error: err.message });
      if (err.status === 401) return res.status(401).json({ ok: false, error: err.message });
      next(err);
    }
  });

  // PUT /content-packs/:id - Update a specific content pack
  router.put('/content-packs/:id', rk, async (req, res, next) => {
    try {
      const ownerId = getOwnerId(req, res);
      if (!ownerId) return;

      const { id: contentPackId } = req.params;
      const { status, scheduledFor, publishedAt, deliveryStatus, deliveryErrorMessage } = req.body;
      const updatedContentPack = await socialMediaService.updateContentPack({
        contentPackId,
        ownerId,
        status,
        scheduledFor,
        publishedAt,
        deliveryStatus,
        deliveryErrorMessage,
      });
      res.json({ ok: true, contentPack: updatedContentPack });
    } catch (err) {
      if (err.status === 400) return res.status(400).json({ ok: false, error: err.message });
      if (err.status === 401) return res.status(401).json({ ok: false, error: err.message });
      if (err.status === 404) return res.status(404).json({ ok: false, error: err.message });
      next(err);
    }
  });

  // GET /sessions/:sessionId/content-packs - List content packs for a specific session
  router.get('/sessions/:sessionId/content-packs', rk, async (req, res, next) => {
    try {
      const ownerId = getOwnerId(req, res);
      if (!ownerId) return;

      const { sessionId } = req.params;
      const { status, limit } = req.query;
      const contentPacks = await socialMediaService.listContentPacksForSession({
        sessionId,
        ownerId,
        status,
        limit,
      });
      res.json({ ok: true, contentPacks, count: contentPacks.length });
    } catch (err) {
      if (err.status === 400) return res.status(400).json({ ok: false, error: err.message });
      if (err.status === 401) return res.status(401).json({ ok: false, error: err.message });
      if (err.status === 404) return res.status(404).json({ ok: false, error: err.message }); // Session not found
      next(err);
    }
  });

  // --- Payment Link Validation Endpoint ---

  // POST /validate-stripe-link - Validate a Stripe payment link
  router.post('/validate-stripe-link', rk, async (req, res, next) => {
    try {
      // ownerId is not strictly required for this utility function, but rk is still applied for general API protection.
      const { link } = req.body;
      const validationResult = socialMediaService.validateStripePaymentLink({ link });
      res.json({ ok: true, ...validationResult });
    } catch (err) {
      // The validateStripePaymentLink service function returns { valid: false, reason: ... } and does not throw for validation failures.
      // Any error caught here would be an unexpected system error.
      next(err);
    }
  });

  return router;
}