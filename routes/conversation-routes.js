/**
 * Conversation & AI Bot Routes
 * Extracted from server.js
 * @ssot docs/projects/AMENDMENT_02_MEMORY_SYSTEM.md
 */
import logger from '../services/logger.js';

export function createConversationRoutes(app, ctx) {
  const {
    pool,
    requireKey,
    conversationExtractor,
    aiAccountBot,
    path,
    fs,
  } = ctx;

// ==================== CONVERSATION HISTORY ENDPOINTS ====================
// Get conversation history (cataloged and indexed)
app.get("/api/v1/conversations/history", requireKey, async (req, res) => {
  try {
    const { limit = 50, offset = 0, search = null } = req.query;
    
    let query = `SELECT memory_id, orchestrator_msg, ai_response, ai_member, created_at, key_facts, context_metadata
                 FROM conversation_memory 
                 WHERE memory_type = 'conversation'`;
    const params = [];
    
    if (search) {
      query += ` AND (orchestrator_msg ILIKE $1 OR ai_response ILIKE $1)`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await pool.query(query, params);
    const totalResult = await pool.query(
      `SELECT COUNT(*) as total FROM conversation_memory WHERE memory_type = 'conversation'`
    );
    
    res.json({
      ok: true,
      conversations: result.rows,
      total: parseInt(totalResult.rows[0].total),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error("Conversation history error:", error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Get conversation by ID
app.get("/api/v1/conversations/:id", requireKey, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM conversation_memory WHERE memory_id = $1`,
      [req.params.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "Conversation not found" });
    }
    
    res.json({ ok: true, conversation: result.rows[0] });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== CONVERSATION EXTRACTOR ENDPOINTS ====================
app.post("/api/v1/conversations/extract-export", requireKey, async (req, res) => {
  try {
    if (!conversationExtractor) {
      return res.status(503).json({ error: "Conversation extractor not initialized" });
    }

    const { provider, exportData } = req.body;
    
    if (!provider || !exportData) {
      return res.status(400).json({ error: "Provider and exportData required" });
    }

    console.log(`🤖 [EXTRACTOR] Processing ${provider} export...`);
    const result = await conversationExtractor.extractFromExport(provider, exportData);
    
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error('Extraction error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/conversations/extract-all", requireKey, async (req, res) => {
  try {
    if (!conversationExtractor) {
      return res.status(503).json({ error: "Conversation extractor not initialized" });
    }

    const { credentials } = req.body;
    
    if (!credentials) {
      return res.status(400).json({ error: "Credentials or export data required" });
    }

    console.log(`🤖 [EXTRACTOR] Starting extraction from all platforms...`);
    const results = await conversationExtractor.extractAll(credentials);
    
    res.json({ ok: true, results });
  } catch (error) {
    console.error('Extraction error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/extract-conversations", (req, res) => {
  const filePath = path.join(__dirname, "public", "overlay", "extract-conversations.html");
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("Extraction page not found.");
  }
});

// ==================== AI ACCOUNT BOT ENDPOINTS ====================
app.post("/api/v1/ai-accounts/process-export", requireKey, async (req, res) => {
  try {
    if (!aiAccountBot) {
      return res.status(503).json({ error: "AI account bot not initialized" });
    }

    const { provider, data } = req.body;
    
    if (!provider || !data) {
      return res.status(400).json({ error: "Provider and data required" });
    }

    console.log(`🤖 [AI BOT] Processing ${provider} export...`);
    const result = await aiAccountBot.processExportedData(provider, data);
    
    res.json({ ok: true, ...result });
  } catch (error) {
    console.error('AI account bot error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/ai-accounts/process-all", requireKey, async (req, res) => {
  try {
    if (!aiAccountBot) {
      return res.status(503).json({ error: "AI account bot not initialized" });
    }

    const { credentials } = req.body;
    
    if (!credentials) {
      return res.status(400).json({ error: "Credentials required" });
    }

    console.log(`🤖 [AI BOT] Processing all AI accounts...`);
    const results = await aiAccountBot.processAllAccounts(credentials);
    
    res.json({ ok: true, results });
  } catch (error) {
    console.error('AI account bot error:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});


}
