/**
 * SYNOPSIS: MEMORY ROUTES - LEGACY CRUD MEMORY
 * MEMORY ROUTES - LEGACY CRUD MEMORY
 *
 * @ssot docs/projects/AMENDMENT_02_MEMORY_SYSTEM.md
 * @legacy STATUS: LEGACY_KEEP — non-canonical pre-capsule memory surface.
 * Preserved for historical compatibility and migration reference.
 * Canonical BuilderOS evidence memory is Amendment 39.
 * Canonical governed product memory is the capsule surface.
 */

import { Router } from 'express';
import memorySystem from '../core/memory-system.js';

const LEGACY_META = {
  memory_authority: 'LEGACY_COMPAT',
  canonical_replacement: '/api/v1/memory/evidence or /api/v1/memory/capsules',
  do_not_use_for_builderos_proof: true,
};

function createLegacyMemoryRoutes(options = {}) {
  const { requireKey } = options;
  const legacyRouter = Router();

  // Only gate legacy /memories paths. A global requireKey here blocked all /api/* traffic
  // (including POST /api/v1/lifeos/auth/login) because this router mounts at /api.
  legacyRouter.use((req, res, next) => {
    const p = req.path || '';
    const isMemoryPath = p === '/memories' || p.startsWith('/memories/');
    if (!isMemoryPath) return next('router');
    if (requireKey) return requireKey(req, res, next);
    return next();
  });

/**
 * GET /api/memories/:category
 * Get all memories for a category
 * Query params: ?minConfidence=0.8&type=user_stated&limit=10
 */
  legacyRouter.get('/memories/:category', async (req, res) => {
  try {
    const memories = await memorySystem.retrieveMemories(req.params.category, {
      minConfidence: parseFloat(req.query.minConfidence) || 0.5,
      type: req.query.type || null,
      limit: req.query.limit ? parseInt(req.query.limit) : null
    });
    res.json({
      ok: true,
      category: req.params.category,
      count: memories.length,
      memories,
      ...LEGACY_META,
    });
  } catch (error) {
    console.error('❌ [MEMORY] Retrieve error:', error.message);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * POST /api/memories
 * Store a new memory
 * Body: { category, content, type, confidence, conversationId, userConfirmed }
 */
  legacyRouter.post('/memories', async (req, res) => {
  try {
    const { category, content, type, confidence, conversationId, userConfirmed } = req.body;
    
    if (!category || content === undefined) {
      return res.status(400).json({
        ok: false,
        error: 'category and content are required'
      });
    }
    
    const memory = await memorySystem.storeMemory(category, content, {
      type: type || memorySystem.MEMORY_TYPES.AI_INFERRED,
      confidence: confidence || 0.5,
      conversationId: conversationId || null,
      userConfirmed: userConfirmed || false
    });
    
    if (!memory) {
      return res.status(400).json({
        ok: false,
        error: 'Memory not stored (low confidence or validation failed)'
      });
    }
    
    res.json({
      ok: true,
      memory,
      ...LEGACY_META,
    });
  } catch (error) {
    console.error('❌ [MEMORY] Store error:', error.message);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * POST /api/memories/:id/confirm
 * Confirm an inferred memory (upgrades to USER_CONFIRMED, confidence = 1.0)
 */
  legacyRouter.post('/memories/:id/confirm', async (req, res) => {
  try {
    const memory = await memorySystem.confirmMemory(req.params.id);
    
    if (!memory) {
      return res.status(404).json({
        ok: false,
        error: 'Memory not found'
      });
    }
    
    res.json({
      ok: true,
      memory,
      ...LEGACY_META,
    });
  } catch (error) {
    console.error('❌ [MEMORY] Confirm error:', error.message);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/memories/:id
 * Delete a memory (user says it's wrong)
 */
  legacyRouter.delete('/memories/:id', async (req, res) => {
  try {
    const memory = await memorySystem.deleteMemory(req.params.id);
    
    if (!memory) {
      return res.status(404).json({
        ok: false,
        error: 'Memory not found'
      });
    }
    
    res.json({
      ok: true,
      deleted: memory,
      ...LEGACY_META,
    });
  } catch (error) {
    console.error('❌ [MEMORY] Delete error:', error.message);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * GET /api/memories/context/prompt
 * Get formatted context for AI prompt (high-confidence memories only)
 */
  legacyRouter.get('/memories/context/prompt', async (req, res) => {
  try {
    const context = await memorySystem.buildContextForPrompt();
    res.json({
      ok: true,
      context,
      ...LEGACY_META,
    });
  } catch (error) {
    console.error('❌ [MEMORY] Context error:', error.message);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

  return legacyRouter;
}

export default createLegacyMemoryRoutes;
