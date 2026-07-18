/**
 * SYNOPSIS: Psychometric battery HTTP routes for purpose-discovery priors.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import express from 'express';
import { requireLifeOSUser } from '../middleware/lifeos-auth-middleware.js';
import {
  createPsychometricBatteryService,
  listPsychometricInstruments,
} from '../services/lifeos-psychometric-battery.js';

export function createPsychometricBatteryRoutes({ pool } = {}) {
  const router = express.Router();
  const svc = createPsychometricBatteryService({ pool });

  router.get('/instruments', (_req, res) => {
    res.json({ ok: true, instruments: listPsychometricInstruments() });
  });

  router.get('/me', requireLifeOSUser, async (req, res, next) => {
    try {
      res.json({ ok: true, profile: await svc.getProfile(req.lifeosUser.sub) });
    } catch (err) {
      next(err);
    }
  });

  router.post('/me', requireLifeOSUser, async (req, res, next) => {
    try {
      const { instrument, answers, result_label: resultLabel } = req.body || {};
      const saved = await svc.saveResponse(req.lifeosUser.sub, instrument, answers || {}, resultLabel);
      res.status(201).json({ ok: true, saved });
    } catch (err) {
      next(err);
    }
  });

  router.get('/purpose-priors', requireLifeOSUser, async (req, res, next) => {
    try {
      res.json(await svc.purposePriors(req.lifeosUser.sub));
    } catch (err) {
      next(err);
    }
  });

  return router;
}

export function registerLifeosPsychometricBatteryRoutes(app, { pool } = {}) {
  app.use('/api/v1/lifeos/psychometrics', createPsychometricBatteryRoutes({ pool }));
}