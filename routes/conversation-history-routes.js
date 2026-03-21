/**
 * routes/conversation-history-routes.js
 * Review and search all stored conversations (Claude Code sessions + server AI calls).
 *
 * Mounted at /api/v1/history
 *
 * GET  /                    — list all conversations (paginated)
 * GET  /search?q=           — full-text search across all messages
 * GET  /stats               — counts by source, date ranges
 * GET  /:sessionId          — full conversation with all messages
 * POST /                    — manually log a conversation
 * POST /:sessionId/summarize — AI-generate summary + key decisions
 */

import express from 'express';
import { createConversationStore } from '../services/conversation-store.js';

export function createConversationHistoryRoutes({ pool, requireKey, callCouncilMember }) {
  const router = express.Router();
  const store = createConversationStore(pool);

  // ── List ──────────────────────────────────────────────────────────────────
  router.get('/', requireKey, async (req, res) => {
    try {
      const { source, limit = 50, offset = 0, search } = req.query;
      const conversations = await store.getAll({
        source,
        limit: Math.min(parseInt(limit, 10), 200),
        offset: parseInt(offset, 10),
        search,
      });
      res.json({ ok: true, count: conversations.length, conversations });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Full-text search ──────────────────────────────────────────────────────
  router.get('/search', requireKey, async (req, res) => {
    try {
      const { q, limit = 20 } = req.query;
      if (!q) return res.status(400).json({ ok: false, error: 'q parameter required' });
      const results = await store.search(q, { limit: Math.min(parseInt(limit, 10), 100) });
      res.json({ ok: true, count: results.length, query: q, results });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  router.get('/stats', requireKey, async (req, res) => {
    try {
      const stats = await store.stats();
      res.json({ ok: true, stats });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Get single conversation ───────────────────────────────────────────────
  router.get('/:sessionId', requireKey, async (req, res) => {
    try {
      const conv = await store.get(req.params.sessionId);
      if (!conv) return res.status(404).json({ ok: false, error: 'Conversation not found' });
      res.json({ ok: true, conversation: conv });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Manually log a conversation ───────────────────────────────────────────
  router.post('/', requireKey, async (req, res) => {
    try {
      const { session_id, source = 'manual', project, messages = [], metadata } = req.body;
      if (!session_id) return res.status(400).json({ ok: false, error: 'session_id required' });
      if (!Array.isArray(messages)) return res.status(400).json({ ok: false, error: 'messages must be array' });
      const result = await store.save({ sessionId: session_id, source, project, messages, metadata });
      res.status(201).json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── AI summarize ──────────────────────────────────────────────────────────
  router.post('/:sessionId/summarize', requireKey, async (req, res) => {
    try {
      const conv = await store.get(req.params.sessionId);
      if (!conv) return res.status(404).json({ ok: false, error: 'Not found' });
      if (!callCouncilMember) return res.status(503).json({ ok: false, error: 'AI not available' });

      const transcript = (conv.messages || [])
        .map(m => `${m.role.toUpperCase()}: ${m.content.substring(0, 500)}`)
        .join('\n\n');

      if (!transcript) return res.status(400).json({ ok: false, error: 'No messages' });

      const callAI = async (p) => {
        const r = await callCouncilMember('anthropic', p);
        return typeof r === 'string' ? r : r?.content || '';
      };

      const raw = await callAI(
        `Summarize this conversation between Adam (user) and Claude (assistant) on the Lumin/LimitlessOS project.

Extract:
1. A 2-3 sentence summary of what was worked on
2. Key decisions made (up to 10)
3. Topics discussed (up to 8 tags)

Conversation:
${transcript.substring(0, 8000)}

JSON response:
{
  "summary": "...",
  "key_decisions": ["decision 1"],
  "topics": ["topic1"]
}`
      );

      let parsed;
      try {
        parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)[0]);
      } catch {
        parsed = { summary: raw, key_decisions: [], topics: [] };
      }

      await store.setSummary(req.params.sessionId, {
        summary: parsed.summary,
        keyDecisions: parsed.key_decisions || [],
        topics: parsed.topics || [],
      });

      res.json({ ok: true, ...parsed });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  return router;
}
