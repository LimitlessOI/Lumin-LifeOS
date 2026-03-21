/**
 * routes/idea-queue-routes.js
 * REST API for Adam's idea approval queue.
 *
 * All routes require COMMAND_CENTER_KEY.
 *
 * Endpoints:
 *   GET    /api/v1/ideas              — list ideas (filter by ?status=)
 *   POST   /api/v1/ideas              — submit a new idea
 *   GET    /api/v1/ideas/stats        — counts by approval_status
 *   GET    /api/v1/ideas/queue        — approved, not yet built, ordered by priority
 *   GET    /api/v1/ideas/:id          — get single idea
 *   PATCH  /api/v1/ideas/:id          — update a pending idea
 *   POST   /api/v1/ideas/:id/approve  — approve (marks ready to build)
 *   POST   /api/v1/ideas/:id/reject   — reject with reason
 *   POST   /api/v1/ideas/:id/build    — trigger build for approved idea
 *
 * Deps: pool, requireKey, addProductToQueue (from auto-builder), logger
 */

import express from 'express';
import { createIdeaQueue } from '../core/idea-queue.js';
import { addProductToQueue } from '../core/auto-builder.js';
import { IdeaToImplementationPipeline } from '../core/idea-to-implementation-pipeline.js';
import { createDesignQualityGate } from '../services/design-quality-gate.js';
import { createWebSearchService } from '../services/web-search-service.js';
import logger from '../services/logger.js';

export function createIdeaQueueRoutes({ pool, requireKey, callCouncilMember }) {
  const router = express.Router();
  const ideaQueue = createIdeaQueue(pool);

  // ── List ────────────────────────────────────────────────────────────────────
  router.get('/', requireKey, async (req, res) => {
    try {
      const filter = req.query.status || 'all';
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      const ideas = await ideaQueue.list(filter, limit);
      res.json({ ok: true, count: ideas.length, ideas });
    } catch (err) {
      logger.error('[IDEA-QUEUE] list error', { error: err.message });
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Stats ───────────────────────────────────────────────────────────────────
  router.get('/stats', requireKey, async (req, res) => {
    try {
      const stats = await ideaQueue.stats();
      res.json({ ok: true, stats });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Approved queue (ordered, not yet triggered) ─────────────────────────────
  router.get('/queue', requireKey, async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
      const queue = await ideaQueue.getApprovedQueue(limit);
      res.json({ ok: true, count: queue.length, queue });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Get single ──────────────────────────────────────────────────────────────
  router.get('/:id', requireKey, async (req, res) => {
    try {
      const idea = await ideaQueue.get(req.params.id);
      res.json({ ok: true, idea });
    } catch (err) {
      res.status(404).json({ ok: false, error: err.message });
    }
  });

  // ── Submit ──────────────────────────────────────────────────────────────────
  router.post('/', requireKey, async (req, res) => {
    try {
      const {
        title,
        description,
        source = 'manual',
        revenuePotential,
        effortEstimate,
        riskLevel,
        buildPriority,
        notes,
        metadata,
        // Vision fields
        reference_url,
        user_flow,
        target_audience,
        design_notes,
        competitor_urls,
        acceptance_criteria,
      } = req.body;

      if (!title) {
        return res.status(400).json({ ok: false, error: 'title is required' });
      }

      const idea = await ideaQueue.submit({
        title, description, source,
        revenuePotential: revenuePotential ? parseInt(revenuePotential, 10) : undefined,
        effortEstimate: effortEstimate ? parseInt(effortEstimate, 10) : undefined,
        riskLevel, buildPriority, notes, metadata,
        reference_url, user_flow, target_audience, design_notes,
        competitor_urls, acceptance_criteria,
      });

      res.status(201).json({ ok: true, idea });
    } catch (err) {
      logger.error('[IDEA-QUEUE] submit error', { error: err.message });
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // ── Update ──────────────────────────────────────────────────────────────────
  router.patch('/:id', requireKey, async (req, res) => {
    try {
      const idea = await ideaQueue.update(req.params.id, req.body);
      res.json({ ok: true, idea });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // ── Approve ─────────────────────────────────────────────────────────────────
  router.post('/:id/approve', requireKey, async (req, res) => {
    try {
      const { buildPriority } = req.body;
      const idea = await ideaQueue.approve(req.params.id, { buildPriority });
      logger.info('[IDEA-QUEUE] Approved', { id: idea.id, title: idea.title });
      res.json({ ok: true, idea });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // ── Reject ──────────────────────────────────────────────────────────────────
  router.post('/:id/reject', requireKey, async (req, res) => {
    try {
      const { reason } = req.body;
      if (!reason) {
        return res.status(400).json({ ok: false, error: 'reason is required' });
      }
      const idea = await ideaQueue.reject(req.params.id, reason);
      res.json({ ok: true, idea });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  // ── Build ───────────────────────────────────────────────────────────────────
  // Triggers the idea→implementation pipeline for an approved idea.
  // Two modes:
  //   fast=true  → skip concept/design/plan phases, inject directly into auto-builder queue
  //   fast=false → run full IdeaToImplementationPipeline (concept → design → plan → build)
  router.post('/:id/build', requireKey, async (req, res) => {
    try {
      const idea = await ideaQueue.get(req.params.id);

      if (idea.approval_status !== 'approved') {
        return res.status(400).json({
          ok: false,
          error: `Idea must be approved before building. Current status: ${idea.approval_status}`,
        });
      }

      const fast = req.body.fast === true || req.body.fast === 'true';

      // Mark as building (prevents double-trigger)
      await ideaQueue.markBuilding(idea.id);

      if (fast) {
        // Fast path: inject directly into auto-builder as a product definition.
        // Adam supplies the component definitions in the request body.
        const components = req.body.components;
        if (!Array.isArray(components) || components.length === 0) {
          // Revert to approved if no components provided
          await pool.query(
            `UPDATE ideas SET approval_status='approved', build_triggered_at=NULL WHERE id=$1`,
            [idea.id]
          );
          return res.status(400).json({
            ok: false,
            error: 'fast mode requires req.body.components[] array with {id, name, file, type, prompt} per component',
          });
        }

        const productDef = {
          id: `idea_${idea.id}`,
          name: idea.title,
          description: idea.description || idea.title,
          ideaId: idea.id,
          vision: {
            reference_url: idea.reference_url,
            user_flow: idea.user_flow,
            target_audience: idea.target_audience,
            design_notes: idea.design_notes,
            acceptance_criteria: idea.acceptance_criteria,
          },
          components: components.map(c => ({
            id: c.id,
            name: c.name,
            file: c.file,
            type: c.type,
            status: 'pending',
            prompt: c.prompt,
          })),
        };

        addProductToQueue(productDef);
        logger.info('[IDEA-QUEUE] Idea injected into auto-builder (fast)', { id: idea.id });

        return res.json({
          ok: true,
          mode: 'fast',
          message: 'Idea injected into auto-builder queue. Run a build cycle to execute.',
          ideaId: idea.id,
        });
      }

      // Full pipeline path — async, returns immediately with pipeline ID
      const pipeline = new IdeaToImplementationPipeline(pool, callCouncilMember, null, null);

      // Run async — don't block the HTTP response
      pipeline.implementIdea(idea, { autoDeploy: false, verifyCompletion: false })
        .then(async result => {
          if (result.success) {
            await ideaQueue.markBuilt(idea.id);
            logger.info('[IDEA-QUEUE] Pipeline complete', { id: idea.id, pipelineId: result.pipelineId });
          } else {
            // Revert to approved so it can be retried
            await pool.query(
              `UPDATE ideas SET approval_status='approved', build_triggered_at=NULL WHERE id=$1`,
              [idea.id]
            );
            logger.error('[IDEA-QUEUE] Pipeline failed', { id: idea.id, error: result.error });
          }
        })
        .catch(err => {
          logger.error('[IDEA-QUEUE] Pipeline exception', { id: idea.id, error: err.message });
        });

      res.json({
        ok: true,
        mode: 'full-pipeline',
        message: 'Pipeline started — concept → design → plan → build. Check logs for progress.',
        ideaId: idea.id,
      });
    } catch (err) {
      logger.error('[IDEA-QUEUE] build trigger error', { error: err.message });
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Feedback — teach the system Adam's preferences ──────────────────────────
  // POST /api/v1/ideas/feedback  { feedback: "I hate modals", context: "checkout flow" }
  router.post('/feedback', requireKey, async (req, res) => {
    try {
      const { feedback, context = '' } = req.body;
      if (!feedback) return res.status(400).json({ ok: false, error: 'feedback is required' });

      const gate = createDesignQualityGate({ callAI: null });
      await gate.recordFeedback(feedback, context);

      res.json({ ok: true, message: 'Preference recorded. Builder will apply this going forward.' });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Research — run UX research for a topic on demand ────────────────────────
  // POST /api/v1/ideas/research  { topic: "checkout flow for wellness apps", type: "landing_page" }
  router.post('/research', requireKey, async (req, res) => {
    try {
      const { topic, type = 'web_app' } = req.body;
      if (!topic) return res.status(400).json({ ok: false, error: 'topic is required' });

      const searchService = createWebSearchService({
        BRAVE_SEARCH_API_KEY: process.env.BRAVE_SEARCH_API_KEY,
        PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
        callAI: callCouncilMember
          ? async (prompt) => {
              const result = await callCouncilMember('anthropic', prompt);
              return typeof result === 'string' ? result : result?.content || '';
            }
          : null,
      });

      const [uxPatterns, bestPractices, competitors] = await Promise.allSettled([
        searchService.searchUXPatterns(`${type}: ${topic}`),
        searchService.getBestPractices(topic),
        searchService.searchCompetitors(topic),
      ]);

      res.json({
        ok: true,
        topic,
        ux_patterns: uxPatterns.status === 'fulfilled' ? uxPatterns.value : null,
        best_practices: bestPractices.status === 'fulfilled' ? bestPractices.value : null,
        competitors: competitors.status === 'fulfilled' ? competitors.value : null,
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
