/**
 * SYNOPSIS: token-accounting-os BUILD_QUEUE artifact repair stub.
 * @ssot docs/products/token-accounting-os/PRODUCT_HOME.md
 */
export function registerFreeTierAPIRoutes(app) {
  app.post('/api/v1/freeTier/upsert', (req, res) => {
    res.json({ ok: true });
  });
}
