/**
 * SYNOPSIS: Age-specific parenting script library HTTP routes.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import express from 'express';
import { createParentingScriptService } from '../services/lifeos-parenting-scripts.js';

export function createParentingScriptRoutes() {
  const router = express.Router();
  const svc = createParentingScriptService();

  router.get('/situations', (_req, res) => {
    res.json({ ok: true, situations: svc.listSituations() });
  });

  router.get('/scripts', (req, res) => {
    const childAge = req.query.child_age != null ? Number(req.query.child_age) : null;
    const situation = req.query.situation || null;
    res.json(svc.getScripts({ childAge, situation }));
  });

  router.get('/one-liner', (req, res) => {
    const childAge = req.query.child_age != null ? Number(req.query.child_age) : null;
    const situation = req.query.situation || 'meltdown';
    res.json(svc.oneLiner({ childAge, situation }));
  });

  return router;
}

export function registerLifeosParentingScriptRoutes(app) {
  app.use('/api/v1/lifeos/parenting-scripts', createParentingScriptRoutes());
}