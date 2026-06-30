/**
 * SYNOPSIS: SocialMediaOS AI coaching session routes — start, answer Q&A, generate content pack, export.
 * @ssot docs/products/marketingos/socialmediaos/PRODUCT_HOME.md
 */
import { Router } from 'express';
import { createSocialmediaosCoachingService } from '../services/socialmediaos-coaching-service.js';
import { createSocialmediaosContentGenerator } from '../services/socialmediaos-content-generator.js';

export function createSocialmediaosCoachingRoutes({ pool, requireKey, callCouncilMember, logger }) {
  const router = Router();
  const callAI = async (prompt) => {
    const attempts = [
      {
        member: 'openai_gpt',
        options: {
          founderComms: true,
          taskType: 'general',
          model: process.env.OPENAI_SOCIALMEDIA_MODEL || process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
          maxTokens: 2200,
          temperature: 0.4,
          useCache: false,
        },
      },
      {
        member: 'gemini_flash',
        options: {
          founderComms: true,
          taskType: 'general',
          maxTokens: 2200,
          temperature: 0.4,
          useCache: false,
        },
      },
    ];

    const errors = [];
    for (const attempt of attempts) {
      try {
        return await callCouncilMember(attempt.member, prompt, attempt.options);
      } catch (error) {
        errors.push(`${attempt.member}: ${error.message}`);
        logger?.warn?.({ attempt: attempt.member, error: error.message }, '[SOCIALMEDIAOS] content generation fallback failed');
      }
    }
    throw new Error(`socialmediaos_content_generation_unavailable: ${errors.join(' | ')}`);
  };
  const coaching = createSocialmediaosCoachingService({ pool });
  const generator = createSocialmediaosContentGenerator({ pool, callAI });

  function getOwnerId(req, res, next) {
    const ownerId = req.lifeosUser?.sub || req.body?.owner_id || req.query?.owner_id || null;
    if (!ownerId) return res.status(401).json({ ok: false, error: 'owner_id_required' });
    req.ownerId = ownerId;
    next();
  }

  // POST /coaching/start — begin a new coaching session
  router.post('/start', requireKey, getOwnerId, async (req, res, next) => {
    try {
      const { niche, goal } = req.body;
      const result = await coaching.startCoachingSession({ ownerId: req.ownerId, niche, goal });
      res.json({ ok: true, ...result });
    } catch (err) { next(err); }
  });

  // POST /coaching/:sessionId/answer — submit answer, receive next question or completion signal
  router.post('/:sessionId/answer', requireKey, getOwnerId, async (req, res, next) => {
    try {
      const { answer } = req.body;
      if (!answer || typeof answer !== 'string' || !answer.trim()) {
        return res.status(400).json({ ok: false, error: 'answer_required' });
      }
      const result = await coaching.submitAnswer({
        sessionId: req.params.sessionId,
        ownerId: req.ownerId,
        answer: answer.trim(),
      });
      res.json({ ok: true, ...result });
    } catch (err) { next(err); }
  });

  // POST /coaching/:sessionId/generate — trigger content pack generation (requires coaching_complete status)
  router.post('/:sessionId/generate', requireKey, getOwnerId, async (req, res, next) => {
    try {
      const result = await generator.generateContentPack({
        sessionId: req.params.sessionId,
        ownerId: req.ownerId,
      });
      res.json({ ok: true, ...result });
    } catch (err) { next(err); }
  });

  // GET /coaching/:sessionId/content-pack — retrieve generated content pack
  router.get('/:sessionId/content-pack', requireKey, getOwnerId, async (req, res, next) => {
    try {
      const result = await generator.getContentPack({
        sessionId: req.params.sessionId,
        ownerId: req.ownerId,
      });
      res.json({ ok: true, ...result });
    } catch (err) { next(err); }
  });

  // GET /coaching/:sessionId/export — download content pack as plain text file
  router.get('/:sessionId/export', requireKey, getOwnerId, async (req, res, next) => {
    try {
      const row = await generator.getContentPack({
        sessionId: req.params.sessionId,
        ownerId: req.ownerId,
      });
      const text = generator.exportAsText(row.content);
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="content-pack-${req.params.sessionId}.txt"`);
      res.send(text);
    } catch (err) { next(err); }
  });

  // GET /coaching/:sessionId/state — check session state (useful for resuming)
  router.get('/:sessionId/state', requireKey, getOwnerId, async (req, res, next) => {
    try {
      const session = await coaching.getSessionState({
        sessionId: req.params.sessionId,
        ownerId: req.ownerId,
      });
      const meta = session.metadata || {};
      const currentQ = meta.currentQuestion || 0;
      const nextQuestion = currentQ < coaching.COACHING_QUESTIONS.length
        ? coaching.COACHING_QUESTIONS[currentQ]
        : null;
      res.json({
        ok: true,
        session_id: session.id,
        status: session.status,
        answers_given: (meta.answers || []).length,
        total_questions: coaching.COACHING_QUESTIONS.length,
        next_question: nextQuestion,
        niche: meta.niche,
        goal: meta.goal,
      });
    } catch (err) { next(err); }
  });

  return router;
}
