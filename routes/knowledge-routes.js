/**
 * SYNOPSIS: Registers KnowledgeRoutes routes/handlers (routes/knowledge-routes.js).
 * @ssot docs/products/knowledge-base/PRODUCT_HOME.md
 */
import logger from '../services/logger.js';

export function registerKnowledgeRoutes(app, ctx) {
  const {
    pool,
    requireKey,
    knowledgeBase,
    fileCleanupAnalyzer,
  } = ctx;

  // ==================== KNOWLEDGE BASE & FILE UPLOAD ENDPOINTS ====================
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

  // New endpoint for uploading files to the knowledge base
  app.post("/api/v1/knowledge/upload", requireKey, async (req, res) => {
    try {
      if (!knowledgeBase) {
        return res.status(503).json({ error: "Knowledge base not initialized" });
      }

      const { file } = req.body;

      if (!file) {
        return res.status(400).json({ error: "File is required for upload" });
      }

      await knowledgeBase.uploadFile(file);

      res.json({ ok: true, message: "File uploaded successfully" });
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
