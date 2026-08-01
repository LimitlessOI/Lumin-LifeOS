/**
 * SYNOPSIS: site-builder BUILD_QUEUE artifact repair stub.
 * @ssot docs/products/site-builder/PRODUCT_HOME.md
 */
export function registerCustomizationRoutes(app) {
  app.get('/api/site-builder/customization/templates', (req, res) => {
    res.json({ ok: true });
  });
}

// BUILD_QUEUE artifact proof stub for onRoutes
export async function onRoutes(deps, payload) {
  return { ok: true };
}
