/**
 * MEMORY ROUTES - API endpoints for memory system
 */

import express from 'express';
import memorySystem from '../core/memory-system.js';

const router = express.Router();

/**
 * GET /api/memories/:category
 * Get all memories for a category
 * Query params: ?minConfidence=0.8&type=user_stated&limit=10
 */
router.get('/memories/:category', async (req, res) => {
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
      memories
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
router.post('/memories', async (req, res) => {
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
      memory
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
router.post('/memories/:id/confirm', async (req, res) => {
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
      memory
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
router.delete('/memories/:id', async (req, res) => {
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
      deleted: memory
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
router.get('/memories/context/prompt', async (req, res) => {
  try {
    const context = await memorySystem.buildContextForPrompt();
    res.json({
      ok: true,
      context
    });
  } catch (error) {
    console.error('❌ [MEMORY] Context error:', error.message);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

export default router;
