/**
 * SYNOPSIS: Registers TaloaOverlayHostRoutes routes/handlers (routes/taloa-overlay-host-routes.js).
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

import { createOverlayHostService } from '../services/taloa/overlay-host-service.js';

export function registerTaloaOverlayHostRoutes(app, deps) {
  const overlayHostService = createOverlayHostService({
    pool: deps.pool,
    logger: deps.logger,
    preferenceStore: deps.preferenceStore || { get: async () => ({}), set: async () => ({}) }
  });

  app.get(
    '/api/v1/taloa/overlay-host/health',
    deps.requireKey,
    async (req, res) => {
      const result = await overlayHostService.displayOverlay();
      res.json({ ok: true, ...result });
    }
  );
}
