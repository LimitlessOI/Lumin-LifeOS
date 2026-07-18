/**
 * SYNOPSIS: Weekly deep-talk question deck HTTP routes.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import express from 'express';
import { requireLifeOSUser } from '../middleware/lifeos-auth-middleware.js';
import { createDeepTalkDeckService } from '../services/lifeos-deep-talk-decks.js';

export function createDeepTalkDeckRoutes({ pool } = {}) {
  const router = express.Router();
  const svc = createDeepTalkDeckService({ pool });

  router.get('/weekly', requireLifeOSUser, async (req, res, next) => {
    try {
      const partnerUserId = req.query.partner_user_id || null;
      const limit = Number(req.query.limit) || 7;
      const deck = await svc.buildWeeklyDeck(req.lifeosUser.sub, { partnerUserId, limit });
      res.json(deck);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function registerLifeosDeepTalkDeckRoutes(app, { pool } = {}) {
  app.use('/api/v1/lifeos/deep-talk', createDeepTalkDeckRoutes({ pool }));
}