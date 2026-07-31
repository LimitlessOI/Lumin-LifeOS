/**
 * SYNOPSIS: Registers ConfigEndpoints routes/handlers (routes/config-endpoints.js).
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { Router } from 'express';

export function registerConfigEndpoints(app) {
  const router = Router();

  // Config endpoints
  router.get('/config', (req, res) => {
    res.json({
      status: 'ok',
      endpoints: ['/config', '/config/status'],
    });
  });

  router.get('/config/status', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  app.use(router);
}