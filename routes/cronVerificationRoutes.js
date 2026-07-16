/**
 * SYNOPSIS: HTTP route module — CronVerificationRoutes.
 * @ssot docs/products/word-keeper/PRODUCT_HOME.md
 */
import express from 'express';

const router = express.Router();

function verifyTranscriptPurgeCron(req, res) {
  res.json({ ok: true, message: 'Transcript purge cron verification stub' });
}

export function registerCronVerificationRoutes(app) {
  router.get('/cron/verify', verifyTranscriptPurgeCron);
  app.use('/api', router);
}
