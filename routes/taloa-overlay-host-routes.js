/**
 * SYNOPSIS: Registers TaloaOverlayHostRoutes routes/handlers (routes/taloa-overlay-host-routes.js).
 * @ssot docs/products/universal-overlay/PRODUCT_HOME.md
 */

import { getTaloaRuntime } from '../services/taloa/taloa-runtime.js';

export function registerTaloaOverlayHostRoutes(app, deps) {
  const overlayHostService = getTaloaRuntime({ pool: deps.pool, logger: deps.logger }).overlayHost;

  app.get(
    '/api/v1/taloa/overlay-host/health',
    deps.requireKey,
    async (req, res) => {
      const result = await overlayHostService.displayOverlay();
      res.json({ ok: true, ...result });
    }
  );
}
