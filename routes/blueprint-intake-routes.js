/**
 * SYNOPSIS: Blueprint Intake API — backfill existing amendments, greenfield conversations,
 * and adjustment patches. Three flows: founder describes → system builds the spec → ARC
 * validates → executor runs. Gap conversation lives here too.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { createBlueprintIntakeService, amendmentReadableOnDisk, getAiTrustLedger } from '../services/blueprint-intake.js';
import { executeIntakeBlueprint } from '../services/intake-blueprint-executor.js';

export function createBlueprintIntakeRoutes(app, ctx) {
  const { pool, requireKey, callCouncilMember } = ctx;
  const intake = createBlueprintIntakeService(pool, callCouncilMember);

  // ── FLOW 1: Backfill — read existing amendment → generate blueprint ────────
  // Body: { amendment_file: "...", product_name: "SocialMediaOS" }
  //   OR: { amendment_text: "<full amendment content>", product_name: "SocialMediaOS", amendment_file: "...(label only)" }
  // CLI sends amendment_text so the server never needs to find the file on disk.
  app.post('/api/v1/blueprint/intake/backfill', requireKey, async (req, res) => {
    try {
      const { amendment_file, amendment_text, product_name } = req.body;
      if ((!amendment_file && !amendment_text) || !product_name) {
        return res.status(400).json({ error: 'product_name and (amendment_file or amendment_text) required' });
      }
      if (!amendment_text && amendment_file && !amendmentReadableOnDisk(amendment_file)) {
        return res.status(400).json({
          error: 'amendment_text_required',
          detail: `Amendment file not on server (docs/ excluded from Railway image). Include amendment_text in body or run: node scripts/run-blueprint-intake.mjs --amendment ${amendment_file}`,
        });
      }
      const ownerId = req.lifeosUser?.sub || null;
      // startBackfill returns immediately; AI runs in background
      const result = await intake.startBackfill({ amendmentFile: amendment_file, amendmentText: amendment_text, productName: product_name, ownerId });
      return res.status(202).json({
        ok: true,
        session_id: result.sessionId,
        status: result.status,
        async: true,
        next: `Poll GET /api/v1/blueprint/intake/${result.sessionId} until status is gap_collection or arc_review`,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── FLOW 2: Greenfield — start a product conversation with Lumin ──────────
  // Body: { product_name: "MyNewProduct", message: "I want to build a system that..." }
  app.post('/api/v1/blueprint/intake/greenfield', requireKey, async (req, res) => {
    try {
      const { product_name, message } = req.body;
      if (!product_name || !message) {
        return res.status(400).json({ error: 'product_name and message required' });
      }
      const ownerId = req.lifeosUser?.sub || null;
      const result = await intake.startGreenfield({ productName: product_name, firstMessage: message, ownerId });
      return res.status(202).json({
        ok: true,
        session_id: result.sessionId,
        response: result.response,
        spec_ready: result.specReady,
        status: result.status,
        next: result.specReady
          ? `POST /api/v1/blueprint/intake/${result.sessionId}/arc`
          : `POST /api/v1/blueprint/intake/${result.sessionId}/message`,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // Continue a greenfield conversation
  app.post('/api/v1/blueprint/intake/:id/message', requireKey, async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) return res.status(400).json({ error: 'message required' });
      const result = await intake.continueGreenfield({ sessionId: req.params.id, userMessage: message });
      return res.status(200).json({
        ok: true,
        response: result.response,
        spec_ready: result.specReady,
        gap_count: result.gapCount || 0,
        status: result.status,
      });
    } catch (err) {
      return res.status(err.message.startsWith('SessionNotFound') ? 404 : 500).json({ error: err.message });
    }
  });

  // ── FLOW 3: Adjustment — Adam describes a change, ARC patches blueprint ───
  // Body: { amendment_file: "...", adjustment: "I want to add a webhook endpoint for..." }
  app.post('/api/v1/blueprint/intake/adjust', requireKey, async (req, res) => {
    try {
      const { amendment_file, adjustment } = req.body;
      if (!amendment_file || !adjustment) {
        return res.status(400).json({ error: 'amendment_file and adjustment required' });
      }
      const ownerId = req.lifeosUser?.sub || null;
      const result = await intake.startAdjustment({ amendmentFile: amendment_file, adjustmentText: adjustment, ownerId });
      return res.status(202).json({
        ok: true,
        session_id: result.sessionId,
        status: result.status,
        blueprint_version: result.blueprintVersion,
        gap_count: result.gapCount,
        gaps: result.gaps,
        consequence_flags: result.consequenceFlags,
        next: result.gapCount > 0
          ? `POST /api/v1/blueprint/intake/${result.sessionId}/answer to resolve gaps`
          : `POST /api/v1/blueprint/intake/${result.sessionId}/arc`,
      });
    } catch (err) {
      const code = err.message.startsWith('BlueprintNotFound') ? 404 : 500;
      return res.status(code).json({ error: err.message });
    }
  });

  // ── Gap resolution — conversational (Lumin walks through gaps one at a time) ──
  // Body: { message: "..." }
  app.post('/api/v1/blueprint/intake/:id/gap-chat', requireKey, async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) return res.status(400).json({ error: 'message required' });
      const result = await intake.sendGapMessage({ sessionId: req.params.id, userMessage: message });
      return res.status(200).json({
        ok: true,
        response: result.response,
        all_resolved: result.allResolved,
        open_gap_count: result.openGapCount,
        next: result.allResolved
          ? `POST /api/v1/blueprint/intake/${req.params.id}/arc`
          : 'Keep chatting',
      });
    } catch (err) {
      return res.status(err.message.startsWith('SessionNotFound') ? 404 : 500).json({ error: err.message });
    }
  });

  // Direct gap answer — for API callers who know the gap ID
  // Body: { gap_id: "gap_1", answer: "..." }
  app.post('/api/v1/blueprint/intake/:id/answer', requireKey, async (req, res) => {
    try {
      const { gap_id, answer } = req.body;
      if (!gap_id || answer === undefined) {
        return res.status(400).json({ error: 'gap_id and answer required' });
      }
      const result = await intake.answerGap({ sessionId: req.params.id, gapId: gap_id, answer });
      return res.status(200).json({
        ok: true,
        resolved: result.resolved,
        all_resolved: result.allResolved,
        remaining_gaps: result.remainingGaps,
        next: result.allResolved
          ? `Poll GET /api/v1/blueprint/intake/${req.params.id} until arc_review, then POST .../arc`
          : 'Answer remaining gaps',
      });
    } catch (err) {
      return res.status(err.message.startsWith('SessionNotFound') ? 404 : 500).json({ error: err.message });
    }
  });

  // ── Execute — run ARC-ready intake blueprint through BuilderOS ─────────────
  const executionResults = new Map();
  app.post('/api/v1/blueprint/intake/:id/execute', requireKey, async (req, res) => {
    try {
      const baseUrl = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
      const commandKey = req.headers['x-command-center-key'] || req.headers['x-command-key'] || req.headers['x-lifeos-key'];
      const dryRun = req.body?.dry_run === true;
      const sync = req.body?.sync === true;
      const fromStepId = req.body?.from_step || null;
      if (dryRun || sync) {
        const result = await executeIntakeBlueprint({ pool, sessionId: req.params.id, baseUrl, commandKey, fromStepId, dryRun });
        return res.status(result.ok ? 200 : 422).json({ ok: result.ok, ...result });
      }
      const sessionId = req.params.id;
      executionResults.set(sessionId, { status: 'running', started: new Date().toISOString(), results: [] });
      res.status(202).json({ ok: true, status: 'started', session_id: sessionId, poll: `/api/v1/blueprint/intake/${sessionId}/execute/status` });
      executeIntakeBlueprint({
        pool, sessionId, baseUrl, commandKey, fromStepId, dryRun: false,
        onStep: (step) => {
          const entry = executionResults.get(sessionId);
          if (entry) entry.results.push(step);
        },
      }).then((result) => {
        executionResults.set(sessionId, { status: result.ok ? 'complete' : 'failed', ...result, finished: new Date().toISOString() });
      }).catch((err) => {
        executionResults.set(sessionId, { status: 'error', error: err.message, finished: new Date().toISOString() });
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/v1/blueprint/intake/:id/execute/status', requireKey, (req, res) => {
    const entry = executionResults.get(req.params.id);
    if (!entry) return res.status(404).json({ error: 'no execution in progress or completed for this session' });
    return res.status(200).json(entry);
  });

  // ── ARC review — validate the blueprint, write to disk if ready ───────────
  app.post('/api/v1/blueprint/intake/:id/arc', requireKey, async (req, res) => {
    try {
      const result = await intake.runArcReview(req.params.id);
      return res.status(200).json({
        ok: true,
        status: result.status,
        arc_report: result.arcReport,
        ready_to_execute: result.arcReport.ready_to_execute,
        auto_fixed: result.autoFixed || false,
        auto_fix_error: result.autoFixError || null,
        next: result.arcReport.ready_to_execute
          ? `POST /api/v1/blueprint/intake/${req.params.id}/execute`
          : `${result.arcReport.total_critical} critical gaps remain — resolve before executing`,
      });
    } catch (err) {
      return res.status(err.message.startsWith('SessionNotFound') ? 404 : 500).json({ error: err.message });
    }
  });

  // ── Read endpoints ────────────────────────────────────────────────────────
  app.get('/api/v1/blueprint/intake/:id', requireKey, async (req, res) => {
    try {
      const session = await intake.getSession(req.params.id);
      if (!session) return res.status(404).json({ error: 'session_not_found' });
      return res.status(200).json({ ok: true, session });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/v1/blueprint/intake/:id/gaps', requireKey, async (req, res) => {
    try {
      const session = await intake.getSession(req.params.id);
      if (!session) return res.status(404).json({ error: 'session_not_found' });
      const gaps = session.gaps_json || [];
      return res.status(200).json({
        ok: true,
        total: gaps.length,
        open: gaps.filter(g => !g.resolved).length,
        gaps,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/v1/blueprint/intake', requireKey, async (req, res) => {
    try {
      const { status, flow_type } = req.query;
      const sessions = await intake.listSessions({ status, flowType: flow_type });
      return res.status(200).json({ ok: true, count: sessions.length, sessions });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Chair/Lumin direct hook — receives adjustment from conversational turn ──
  // Called by chair-orchestrator when channel === 'blueprint_execute' and
  // the message is an ADJUSTMENT (not an execute command for an existing mission).
  // Body: { session_text: "...", amendment_file: "...", mode: "adjust|greenfield|backfill", product_name?, amendment_text? }
  app.post('/api/v1/blueprint/chair-hook', requireKey, async (req, res) => {
    try {
      const { session_text, amendment_file, mode = 'adjust', product_name, amendment_text } = req.body;
      const ownerId = req.lifeosUser?.sub || null;

      if (mode === 'backfill' && amendment_file) {
        const inlineText = amendment_text || session_text;
        if (!inlineText) {
          return res.status(400).json({ error: 'amendment_text or session_text required for backfill mode' });
        }
        if (!product_name) {
          return res.status(400).json({ error: 'product_name required for backfill mode' });
        }
        const result = await intake.startBackfill({
          amendmentFile: amendment_file,
          amendmentText: inlineText,
          productName: product_name,
          ownerId,
        });
        return res.status(202).json({
          ok: true,
          mode: 'backfill',
          session_id: result.sessionId,
          status: result.status,
          reply_to_chair: `Backfill started for ${product_name}. Poll GET /api/v1/blueprint/intake/${result.sessionId} until arc_review or ready.`,
        });
      }

      if (mode === 'adjust' && amendment_file) {
        const result = await intake.startAdjustment({
          amendmentFile: amendment_file,
          adjustmentText: session_text,
          ownerId,
        });
        return res.status(202).json({
          ok: true,
          mode: 'adjust',
          session_id: result.sessionId,
          status: result.status,
          gap_count: result.gapCount,
          consequence_flags: result.consequenceFlags,
          reply_to_chair: result.gapCount > 0
            ? `I've updated the blueprint for ${amendment_file}. There are ${result.gapCount} things I need to clarify with you first.`
            : `Blueprint updated and ready to execute.`,
        });
      }

      if (mode === 'greenfield' && session_text) {
        const productName = (session_text.match(/build(?:ing)?\s+(.+?)(?:\.|,|$)/i)?.[1] || 'new product').slice(0, 60);
        const result = await intake.startGreenfield({ productName, firstMessage: session_text, ownerId });
        return res.status(202).json({
          ok: true,
          mode: 'greenfield',
          session_id: result.sessionId,
          response: result.response,
          reply_to_chair: result.response,
        });
      }

      return res.status(400).json({ error: 'mode must be adjust, greenfield, or backfill (with amendment_file + amendment_text)' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/v1/blueprint/intake/ai-trust', requireKey, (_req, res) => {
    res.json({ ok: true, ledger: getAiTrustLedger() });
  });
}
