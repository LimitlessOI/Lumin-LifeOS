/**
 * SYNOPSIS: HTTP route module — CiGuard.
 * @ssot docs/products/token-accounting-os/PRODUCT_HOME.md
 */
import express from 'express';

const router = express.Router();

function checkCiGuard(req, res) {
  res.json({ message: 'CI Guard check successful' });
}

export function registerCiGuardRoutes(app) {
  router.get('/ci-guard', checkCiGuard);
  app.use('/api', router);
}
