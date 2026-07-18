/**
 * SYNOPSIS: HTTP route module — CiGuard.
 */
import express from 'express';

const router = express.Router();

function checkCiGuard(req, res) {
  // Implement the logic for checking CI guard here
  res.json({ message: 'CI Guard check successful' });
}

function registerCiGuardRoutes(app) {
  router.get('/ci-guard', checkCiGuard);
  app.use('/api', router);
}

export { registerCiGuardRoutes };