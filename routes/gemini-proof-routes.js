// routes/gemini-proof-routes.js
/** @ssot docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md */

import express from 'express';
import { pool } from '../core/database.js';
import authMiddleware from '../middleware/auth.js';
import {
  writeSecurityReceipt,
  readReceiptsByType,
  SECURITY_RECEIPT_TYPES,
} from '../services/oil-security-receipts.js';

export function createGeminiProofRoutes({ callCouncilMember }) {
  const router = express.Router();

  router.post('/api/v1/gemini/proof', authMiddleware, async (req, res) => {
    try {
      const start = Date.now();
      const response = await callCouncilMember(
        'gemini_flash',
        'Respond with exactly the word CONFIRMED and nothing else.',
        { allowModelDowngrade: false, taskType: 'chat' }
      );
      const latency_ms = Date.now() - start;
      const prompt_response = (response || '').toString().trim().slice(0, 64);
      const { receipt_id } = await writeSecurityReceipt(
        SECURITY_RECEIPT_TYPES.GEMINI_LIVE_PROOF,
        { latency_ms, model: 'gemini_flash', prompt_response },
        pool
      );
      res.json({
        confirmed: true,
        model: 'gemini_flash',
        latency_ms,
        receipt_id,
        sha: process.env.RAILWAY_GIT_COMMIT_SHA || 'local',
      });
    } catch (error) {
      res.status(500).json({ confirmed: false, error: error.message });
    }
  });

  router.get('/api/v1/gemini/proof/status', authMiddleware, async (req, res, next) => {
    try {
      const rows = await readReceiptsByType(SECURITY_RECEIPT_TYPES.GEMINI_LIVE_PROOF, 1, pool);
      res.json({ last_proof: rows[0] || null });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
