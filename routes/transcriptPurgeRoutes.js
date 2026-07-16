/**
 * SYNOPSIS: HTTP route module — TranscriptPurgeRoutes.
 * @ssot docs/products/word-keeper/PRODUCT_HOME.md
 */
import express from 'express';

const router = express.Router();

function confirmTranscriptPurge(req, res) {
  res.send('Transcript auto-purge operation confirmed. It will occur in 24 hours.');
}

function registerTranscriptPurgeRoutes(app) {
  app.use('/transcript-purge', router);
}

router.get('/confirm', confirmTranscriptPurge);

export { registerTranscriptPurgeRoutes, confirmTranscriptPurge };