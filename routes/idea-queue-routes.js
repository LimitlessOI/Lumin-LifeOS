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
      } = req.body;

      if (!title) {
        return res.status(400).json({ ok: false, error: 'title is required' });
      }

      const idea = await ideaQueue.submit({
        title, description, source,
        revenuePotential: revenuePotential ? parseInt(revenuePotential, 10) : undefined,
        effortEstimate: effortEstimate ? parseInt(effortEstimate, 10) : undefined,
        riskLevel, buildPriority, notes, metadata,
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

  return router;
}
