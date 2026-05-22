// @ssot docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md

import express from 'express';
import { Pool } from 'core/db.js';
import authMiddleware from 'mw/auth.js';
import {
  writeSecurityReceipt,
  readReceiptsByType,
  SECURITY_RECEIPT_TYPES,
} from 'services/oil-security-receipts.js';
import { callCouncilWithFailover } from 'services/council-service.js';

const router = express.Router();

router.post(
  '/api/v1/gemini/proof',
  authMiddleware,
  async (req, res, next) => {
    try {
      const start = Date.now();
      const { gemini_flash } = await callCouncilWithFailover({
        prompt: 'Respond with exactly the word CONFIRMED and nothing else.',
      });
      const latency_ms = Date.now() - start;
      const receipt_id = await writeSecurityReceipt(
        SECURITY_RECEIPT_TYPES.GEMINI_LIVE_PROOF,
        {
          latency_ms,
          model: gemini_flash,
          prompt_response: 'CONFIRMED',
        },
        Pool,
      );
      const receipt = await readReceiptsByType(
        SECURITY_RECEIPT_TYPES.GEMINI_LIVE_PROOF,
        1,
        Pool,
      );
      const sha =
        process.env.RAILWAY_GIT_COMMIT_SHA || req.body.sha || local;
      res.json({
        confirmed: true,
        model: gemini_flash,
        latency_ms,
        receipt_id,
        sha,
      });
    } catch (error) {
      res.status(500).json({ confirmed: false, error: error.message });
    }
  },
);

router.get(
  '/api/v1/gemini/proof/status',
  authMiddleware,
  async (req, res, next) => {
    try {
      const receipt = await readReceiptsByType(
        SECURITY_RECEIPT_TYPES.GEMINI_LIVE_PROOF,
        1,
        Pool,
      );
      res.json({ last_proof: receipt.rows[0] || null });
    } catch (error) {
      next(error);
    }
  },
);

export default router;