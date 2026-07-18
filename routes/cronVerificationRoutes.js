/**
 * SYNOPSIS: Registers CronVerificationRoutes routes/handlers (routes/cronVerificationRoutes.js).
 * @ssot docs/products/word-keeper/PRODUCT_HOME.md
 */
import express from 'express';
import { verifyTranscriptPurgeCron } from '../services/cronVerificationService.js';

const router = express.Router();

router.get('/verify-transcript-purge-cron', (req, res) => {
  try {
    verifyTranscriptPurgeCron();
    res.status(200).send('Verification of transcript purge cron triggered successfully.');
  } catch (error) {
    res.status(500).send('Failed to trigger verification of transcript purge cron.');
  }
});

export function registerCronVerificationRoutes(app) {
  app.use('/cron', router);
}
