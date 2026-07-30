/**
 * SYNOPSIS: Endpoint for creating a new partner config
 */
import express from 'express';

const router = express.Router();

// Endpoint for creating a new partner config
router.post('/partner-config', (req, res) => {
  // Logic to create a new partner configuration
  res.status(201).json({ message: 'Partner configuration created successfully.' });
});

export const registerPartnerOnboardingRoutes = (app) => {
  app.use('/onboarding', router);
};