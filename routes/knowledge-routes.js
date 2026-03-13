/**
 * Knowledge Base Routes
 * Extracted from server.js
 */
import logger from '../services/logger.js';

export function createKnowledgeRoutes(app, ctx) {
  const {
    pool,
    requireKey,
    knowledgeBase,
    fileCleanupAnalyzer,
  } = ctx;

// ==================== KNOWLEDGE BASE & FILE UPLOAD ENDPOINTS ====================
app.post("/api/v1/knowledge/upload", requireKey, async (req, res) => {
  try {
    if (!knowledgeBase) {
      return res.status(503).json({ error: "Knowledge base not initialized" });
    }

    const { filename, content, category, tags, description, businessIdea, securityRelated, historical } = req.body;

    if (!filename || !content) {
      return res.status(400).json({ error: "Filename and content required" });
    }

    const result = await knowledgeBase.uploadFile(content, {
      filename,
      category: category || 'context',
      tags: tags || [],
      description: description || '',
      businessIdea: businessIdea || false,
      securityRelated: securityRelated || false,
      historical: historical || false,
    });

    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/knowledge/search", requireKey, async (req, res) => {
  try {
    if (!knowledgeBase) {
      return res.status(503).json({ error: "Knowledge base not initialized" });
    }

    const { q, category, tags, businessIdeasOnly } = req.query;

    if (!q) {
      return res.status(400).json({ error: "Query (q) required" });
    }

    const results = await knowledgeBase.search(q, {
      category: category || null,
      tags: tags ? tags.split(',') : [],
      businessIdeasOnly: businessIdeasOnly === 'true',
      limit: parseInt(req.query.limit) || 50,
    });

    res.json({ ok: true, results, count: results.length });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== FILE CLEANUP ANALYZER ENDPOINTS ====================
app.post("/api/v1/system/analyze-cleanup", requireKey, async (req, res) => {
  try {
    if (!fileCleanupAnalyzer) {
      return res.status(503).json({ error: "Cleanup analyzer not initialized" });
    }

    const report = await fileCleanupAnalyzer.analyze();
    const summary = fileCleanupAnalyzer.generateReport();

    res.json({ ok: true, ...summary });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});


}
