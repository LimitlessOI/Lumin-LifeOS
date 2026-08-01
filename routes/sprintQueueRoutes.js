/**
 * SYNOPSIS: productized-sprint BUILD_QUEUE artifact repair stub.
 * @ssot docs/products/productized-sprint/PRODUCT_HOME.md
 */
export function registerSprintQueueRoutes(app) {
  app.get('/api/v1/productized-sprint/queue', (req, res) => {
    res.json({ ok: true });
  });
}
