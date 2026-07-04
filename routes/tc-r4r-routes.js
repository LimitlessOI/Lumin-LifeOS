/**
 * SYNOPSIS: POST /api/v1/tc/attachments/scan
 */
import express from 'express';
import { createTcEmailScanAndUpload } from '../services/tc-doc-intake.js';

export function createTcAttachmentRoutes({ pool, requireKey, logger, tcBrowser, accountManager }) {
  const router = express.Router();
  const tcDocIntake = createTcEmailScanAndUpload({ pool, tcBrowser, accountManager, logger });

  // Middleware to extract ownerId from JWT
  router.use((req, res, next) => {
    const ownerId = req.lifeosUser?.sub || null;
    if (!ownerId) {
      return res.status(401).json({ error: 'jwt_required' });
    }
    req.ownerId = ownerId;
    next();
  });

  /**
   * POST /api/v1/tc/attachments/scan
   * Scans the user's email for R4R attachments and classifies them.
   * Optionally uploads them to SkySlope.
   * @body {object} options - Options for scanning and uploading.
   * @body {number} [options.days=90] - Number of days back to scan emails.
   * @body {boolean} [options.searchAll=false] - If true, searches all emails regardless of subject relevance.
   * @body {boolean} [options.dryRun=false] - If true, only scans and classifies, does not upload.
   * @body {string} [options.address] - Optional address for SkySlope transaction lookup/creation.
   * @body {string} [options.transactionName] - Optional transaction name for SkySlope transaction lookup/creation.
   * @body {boolean} [options.validateBeforeUpload=true] - Whether to validate documents before uploading.
   * @body {boolean} [options.forceUpload=false] - If true, uploads even if validation fails.
   */
  router.post('/scan', requireKey, async (req, res, next) => {
    try {
      const { days, searchAll, dryRun, address, transactionName, validateBeforeUpload, forceUpload } = req.body;
      const userId = req.ownerId;

      const scanResult = await tcDocIntake.findAndProcessEmails({
        userId,
        days,
        searchAll,
        dryRun,
      });

      if (dryRun || !scanResult.ok || !scanResult.filesProcessed) {
        return res.json({ ok: true, ...scanResult });
      }

      // If not dryRun and files were found, proceed with upload
      const filesToUpload = scanResult.emails.flatMap(e => e.files);
      const uploadResult = await tcDocIntake.uploadFilesToSkySlope(userId, filesToUpload, {
        address: address || transactionName,
        validateBeforeUpload,
        forceUpload,
      });

      res.json({
        ok: true,
        message: 'Attachments scanned and processed.',
        scan: scanResult,
        upload: uploadResult,
      });

    } catch (err) {
      logger.error?.({ err: err.message, stack: err.stack, userId: req.ownerId }, '[TC-ATTACHMENT-ROUTE] Scan and upload failed');
      if (err.status) {
        return res.status(err.status).json({ ok: false, error: err.message });
      }
      next(err);
    }
  });

  return router;
}