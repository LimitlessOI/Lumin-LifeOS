/**
 * SYNOPSIS: Exports registerTsosEfficiencyRoutes — routes/tsos-efficiency-register.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { createTsosEfficiencyRoutes } from './tsos-efficiency-routes.js';

export function registerTsosEfficiencyRoutes(app, deps = {}) {
  const { pool, requireKey, logger } = deps;
  app.use(createTsosEfficiencyRoutes({ pool, requireKey }));
  logger?.info?.('Tsos Efficiency Routes registered successfully.');
}