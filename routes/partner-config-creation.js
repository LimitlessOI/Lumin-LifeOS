/**
 * SYNOPSIS: Registers PartnerConfigRoutes routes/handlers (routes/partner-config-creation.js).
 * @ssot docs/products/white-label/PRODUCT_HOME.md
 */
import express from 'express';

const router = express.Router();

function createPartnerConfig(req, res) {
  // Logic to create partner configuration
  res.status(201).send('Partner configuration created');
}

export function registerPartnerConfigRoutes(app) {
  router.post('/partner-config', createPartnerConfig);
  app.use(router);
}