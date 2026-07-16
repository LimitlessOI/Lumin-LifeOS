/**
 * SYNOPSIS: Registers KnowledgeRoutes routes/handlers (routes/knowledge-routes.js).
 * @ssot docs/products/knowledge-base/PRODUCT_HOME.md
 */
import logger from '../services/logger.js';

export function registerKnowledgeRoutes(app, ctx) {
  const { requireKey, knowledgeBase } = ctx;

  // Knowledge Base Upload Endpoint
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

  // Existing endpoints...
}
