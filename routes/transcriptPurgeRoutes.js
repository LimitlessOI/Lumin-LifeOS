/**
 * SYNOPSIS: word-keeper BUILD_QUEUE artifact repair stub.
 * @ssot docs/products/word-keeper/PRODUCT_HOME.md
 */
export function registerTranscriptPurgeRoutes(app) {
  app.post('/api/v1/word-keeper/transcript-purge/confirm', (req, res) => {
    res.json({ ok: true });
  });
}
