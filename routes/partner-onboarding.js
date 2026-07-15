/**
 * SYNOPSIS: HTTP route module — Partner Onboarding.
 */
import express from 'express';

const router = express.Router();

function createPartnerConfig(req, res) {
  // Logic for creating a new partner config
  res.send('Partner config created');
}

function registerPartnerOnboardingRoutes(app) {
  app.use('/partner-onboarding', router);
}

router.post('/create', createPartnerConfig);

export { registerPartnerOnboardingRoutes };
