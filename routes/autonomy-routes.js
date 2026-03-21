/**
 * routes/autonomy-routes.js
 *
 * Autonomy orchestrator API endpoints.
 * Mounted at: /api/v1/autonomy
 *
 * Key endpoints:
 *   POST /sms-webhook     — Twilio sends Adam's reply here (YES-CODE or NO-CODE)
 *   POST /approve/:code   — Manual web approval (same as SMS)
 *   GET  /status          — Current orchestrator status
 *   POST /run             — Manually trigger one orchestration cycle
 *   GET  /proposals       — View all pending proposals with risk scores
 *   POST /proposals/:id/force-build — Force-build a proposal regardless of risk
 */

import express from 'express';
import { scoreIdea } from '../services/risk-scorer.js';

export function createAutonomyRoutes({ pool, requireKey, orchestrator }) {
  const router = express.Router();

  // ── POST /sms-webhook — Twilio incoming SMS handler ──────────────────────
  // Twilio posts here when Adam replies to an approval SMS.
  // Twilio sends: Body=YES-A3F7B2, From=+17025551234
  // No auth header (Twilio doesn't support arbitrary headers easily) —
  // security is via Twilio signature validation OR the code itself being secret.
  router.post('/sms-webhook', express.urlencoded({ extended: false }), async (req, res) => {
    try {
      const body = (req.body?.Body || '').trim().toUpperCase();
      const from = req.body?.From || '';

      console.log(`[AUTONOMY] Incoming SMS from ${from}: "${body}"`);

      // Parse YES-CODE or NO-CODE
      const yesMatch = body.match(/^YES[-\s]([A-Z0-9]{6})$/);
      const noMatch  = body.match(/^NO[-\s]([A-Z0-9]{6})$/);

      let replyMessage;

      if (yesMatch) {
        const code = yesMatch[1];
        const result = await orchestrator.approvePendingSMS(code, true);
        if (result.error) {
          replyMessage = `❌ ${result.error}`;
        } else {
          replyMessage = `✅ Approved! Building "${result.description}". I'll SMS you when done.`;
        }
      } else if (noMatch) {
        const code = noMatch[1];
        const result = await orchestrator.approvePendingSMS(code, false);
        if (result.error) {
          replyMessage = `❌ ${result.error}`;
        } else {
          replyMessage = `⏭️ Skipped "${result.description}". Got it.`;
        }
      } else {
        replyMessage = `🤖 Word Keeper / Auto-builder\nReply YES-CODE or NO-CODE to approve/reject a build request.`;
      }

      // Respond with TwiML
      res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<Response><Message>${replyMessage}</Message></Response>`);

    } catch (err) {
      console.error('[AUTONOMY] SMS webhook error:', err);
      res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<Response><Message>Error processing reply. Please try again.</Message></Response>`);
    }
  });

  // ── POST /approve/:code — web-based approval (same logic as SMS) ──────────
  router.post('/approve/:code', requireKey, async (req, res) => {
    try {
      const { code } = req.params;
      const approved = req.body?.approved !== false; // default true
      const result = await orchestrator.approvePendingSMS(code.toUpperCase(), approved);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /status — orchestrator health + pending approvals ─────────────────
  router.get('/status', requireKey, async (req, res) => {
    try {
      const status = orchestrator.getStatus();
      res.json({ ok: true, ...status });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── POST /run — manually trigger one orchestration cycle ──────────────────
  router.post('/run', requireKey, async (req, res) => {
    try {
      const result = await orchestrator.runCycle();
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /proposals — view proposals with risk scores ──────────────────────
  router.get('/proposals', requireKey, async (req, res) => {
    try {
      const { rows } = await pool.query(`
        SELECT * FROM improvement_proposals
        WHERE status IN ('pending', 'awaiting_sms_approval')
        ORDER BY created_at DESC
        LIMIT 50
      `);

      const scored = rows.map(p => ({
        ...p,
        risk: scoreIdea({
          title: p.title || p.proposal_type,
          description: p.description || p.details,
          category: p.proposal_type,
        }),
      }));

      res.json({ proposals: scored, count: scored.length });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── POST /proposals/:id/force-build — override risk, build it now ─────────
  // Used when Adam explicitly wants something built regardless of risk score.
  router.post('/proposals/:id/force-build', requireKey, async (req, res) => {
    try {
      const { id } = req.params;
      const result = await orchestrator.approvePendingSMS('FORCE_' + id, true);
      // approvePendingSMS won't find a code, so we trigger directly
      const { rows } = await pool.query(
        'SELECT * FROM improvement_proposals WHERE id = $1', [id]
      );
      if (!rows[0]) return res.status(404).json({ error: 'Proposal not found' });

      // Trigger cycle — proposal will be picked up and force-approved
      await pool.query(
        `UPDATE improvement_proposals SET status = 'pending' WHERE id = $1`, [id]
      );
      const cycleResult = await orchestrator.runCycle();
      res.json({ forced: true, ...cycleResult });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── POST /health-check — manually trigger post-build health check ─────────
  router.post('/health-check', requireKey, async (req, res) => {
    try {
      const result = await orchestrator.healthCheckAfterBuild(0); // no delay
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
