/**
 * SYNOPSIS: ai-council BUILD_QUEUE artifact repair stub.
 * @ssot docs/products/ai-council/PRODUCT_HOME.md
 */
// registerChatRoutes
// /api/v1/chat
export function registerChatRoutes(app) {
  app.post('/api/v1/chat', (req, res) => {
    res.json({ ok: true });
  });
}
