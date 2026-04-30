// routes/lifeos-ambient-intelligence-routes.js
import express from 'express';
import createAmbientIntelligenceService from '../services/lifeos-ambient-intelligence.js';
import makeLifeOSUserResolver from '../services/lifeos-user-resolver.js';

const createLifeOSAmbientIntelligenceRoutes = ({ pool, *rk, *ccm, logger }) => {
  const router = express.Router();

  router.get('/nudge', *rk, async (req, res) => {
    try {
      const user = req.query.user;
      const userId = await makeLifeOSUserResolver(pool)(user);
      const nudge = await createAmbientIntelligenceService(pool, *ccm).getContextualNudge(userId);
      res.json(nudge);
    } catch (error) {
      logger.error(error);
      res.status(500).json({ ok: false });
    }
  });

  router.get('/status', *rk, async (req, res) => {
    try {
      const user = req.query.user;
      const userId = await makeLifeOSUserResolver(pool)(user);
      const status = await createAmbientIntelligenceService(pool, *ccm).getStatus(userId);
      res.json(status);
    } catch (error) {
      logger.error(error);
      res.status(500).json({ ok: false });
    }
  });

  return router;
};

export default createLifeOSAmbientIntelligenceRoutes;