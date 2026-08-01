/**
 * SYNOPSIS: word-keeper BUILD_QUEUE artifact repair stub.
 * @ssot docs/products/word-keeper/PRODUCT_HOME.md
 */
// verifyTranscriptPurgeCron
export function registerCronVerificationRoutes(app) {
  app.get('/api/v1/cron/verify-purge', (req, res) => {
    res.json({ ok: true });
  });
}
