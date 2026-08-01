/**
 * SYNOPSIS: Psychometric battery HTTP routes for purpose-discovery priors.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import {
  createPsychometricBatteryService,
  listPsychometricInstruments,
} from '../services/lifeos-psychometric-battery.js';

export function registerLifeosPsychometricBatteryRoutes(app, deps) {
  const svc = createPsychometricBatteryService({ pool: deps.pool });

  app.get('/api/v1/lifeos/psychometric-battery/instruments', deps.requireKey, (_req, res) => {
    res.json({ ok: true, instruments: listPsychometricInstruments() });
  });

  app.get('/api/v1/lifeos/psychometric-battery/me', deps.requireKey, async (req, res, next) => {
    try {
      res.json({ ok: true, profile: await svc.getProfile(req.lifeosUser.sub) });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/v1/lifeos/psychometric-battery/me', deps.requireKey, async (req, res, next) => {
    try {
      const { instrument, answers, result_label: resultLabel } = req.body || {};
      const saved = await svc.saveResponse(req.lifeosUser.sub, instrument, answers || {}, resultLabel);
      res.status(201).json({ ok: true, saved });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/v1/lifeos/psychometric-battery/purpose-priors', deps.requireKey, async (req, res, next) => {
    try {
      res.json(await svc.purposePriors(req.lifeosUser.sub));
    } catch (err) {
      next(err);
    }
  });
}