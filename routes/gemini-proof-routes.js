/**
 * SYNOPSIS: routes/gemini-proof-routes.js
 */
// routes/gemini-proof-routes.js
/** @ssot docs/projects/AMENDMENT_19_PROJECT_GOVERNANCE.md */

import express from 'express';
import {
  writeSecurityReceipt,
  readReceiptsByType,
  SECURITY_RECEIPT_TYPES,
  createRuntimeProofReceipt,
} from '../services/oil-security-receipts.js';

export function createGeminiProofRoutes({ callCouncilMember, requireKey, pool }) {
  const router = express.Router();

  router.post('/api/v1/gemini/proof', requireKey, async (req, res) => {
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
        createRuntimeProofReceipt({
          receiptType: SECURITY_RECEIPT_TYPES.GEMINI_LIVE_PROOF,
          model: 'gemini_flash',
          latency_ms,
          confirmed: prompt_response === 'CONFIRMED',
          prompt_response,
          proof_source: 'gemini_live_runtime',
          summary: 'Gemini live proof wrote a canonical runtime proof receipt.',
        }),
        pool
      );
      res.json({
        confirmed: prompt_response === 'CONFIRMED',
        model: 'gemini_flash',
        latency_ms,
        receipt_id,
        sha: process.env.RAILWAY_GIT_COMMIT_SHA || 'local',
      });
    } catch (error) {
      res.status(500).json({ confirmed: false, error: error.message });
    }
  });

  router.get('/api/v1/gemini/proof/status', requireKey, async (req, res, next) => {
    try {
      const rows = await readReceiptsByType(SECURITY_RECEIPT_TYPES.GEMINI_LIVE_PROOF, 1, pool);
      const last = rows[0] || null;
      const payload = last?.payload || null;
      res.json({
        last_proof: last ? {
          id: last.id,
          receipt_type: last.receipt_type,
          created_at: last.created_at,
          confirmed: payload?.details?.confirmed ?? payload?.status === 'PASS',
          model: payload?.details?.model || payload?.subject || 'unknown',
          latency_ms: payload?.details?.latency_ms ?? null,
          prompt_response: payload?.details?.prompt_response ?? null,
          runtime: payload?.runtime || null,
          summary: payload?.summary || null,
          payload,
        } : null,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
