/**
 * SYNOPSIS: Founder memory API — append, product context inject, claim verification.
 * @ssot docs/products/memory-system/PRODUCT_HOME.md
 */
import express from 'express';
import { createFounderMemoryStore } from '../services/founder-memory-store.js';
import {
  resolveProductFounderMemory,
  loadProductHomeWithFounderMemory,
  assertProductMemoryInContext,
} from '../services/founder-memory-product-resolver.js';
import { verifyFounderClaim } from '../services/founder-memory-claim-gate.js';
import { createConversationStore } from '../services/conversation-store.js';

export function createFounderMemoryRoutes({ pool, requireKey }) {
  const router = express.Router();
  const store = createFounderMemoryStore(pool);
  const conversationStore = pool ? createConversationStore(pool) : null;

  router.get('/health', requireKey, (_req, res) => {
    res.json({
      ok: true,
      schema: 'founder_memory_v1',
      canonical_table: 'founder_memory_entries',
      index: 'Lumin-Memory/01_INDEX/founder_memory_index.jsonl',
    });
  });

  router.post('/append', requireKey, async (req, res) => {
    try {
      const { session_id, product_ids, product_id, classification, role, content, metadata } = req.body || {};
      const result = await store.append({
        sessionId: session_id,
        productIds: product_ids,
        productId: product_id,
        classification,
        role,
        content,
        metadata,
      });
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.post('/exchange', requireKey, async (req, res) => {
    try {
      if (!conversationStore) {
        return res.status(503).json({ ok: false, error: 'database_unavailable' });
      }
      const { session_id, product_ids, product_id, messages, metadata } = req.body || {};
      const result = await conversationStore.appendFounderExchange({
        sessionId: session_id || `session_${Date.now()}`,
        productIds: product_ids,
        productId: product_id,
        messages,
        metadata,
      });
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message });
    }
  });

  router.get('/product/:productId', requireKey, async (req, res) => {
    try {
      const entries = await store.listByProduct(req.params.productId, {
        limit: Number(req.query.limit || 40),
        classifications: req.query.classification
          ? [String(req.query.classification)]
          : null,
      });
      res.json({ ok: true, product_id: req.params.productId, count: entries.length, entries });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/product/:productId/context', requireKey, async (req, res) => {
    try {
      const resolved = await resolveProductFounderMemory({
        productId: req.params.productId,
        pool,
        limit: Number(req.query.limit || 40),
      });
      res.json({
        ok: true,
        ...resolved,
        mandatory: true,
        instruction: 'Inject memory_block into agent context — do not treat as optional link.',
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/product/:productId/load', requireKey, async (req, res) => {
    try {
      const productHomePath = req.query.product_home
        || `docs/products/${req.params.productId}/PRODUCT_HOME.md`;
      const loaded = await loadProductHomeWithFounderMemory({
        productHomePath,
        productId: req.params.productId,
        pool,
      });
      const check = assertProductMemoryInContext(loaded.full_context, {
        productId: req.params.productId,
      });
      res.json({ ok: check.ok, ...loaded, context_check: check });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.post('/verify-claim', requireKey, async (req, res) => {
    try {
      const { claim, receipt_id } = req.body || {};
      const result = await verifyFounderClaim({ claim, receiptId: receipt_id, pool });
      res.json({ ok: result.ok, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  router.get('/receipt/:receiptId', requireKey, async (req, res) => {
    try {
      const entry = await store.getByReceipt(req.params.receiptId);
      if (!entry) return res.status(404).json({ ok: false, error: 'receipt_not_found' });
      res.json({ ok: true, entry });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}

export function registerFounderMemoryRoutes(app, deps) {
  const { pool, requireKey, logger } = deps;
  app.use('/api/v1/founder-memory', createFounderMemoryRoutes({ pool, requireKey }));
  logger?.info?.('✅ [FOUNDER-MEMORY] Routes mounted at /api/v1/founder-memory');
}
