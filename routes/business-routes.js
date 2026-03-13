/**
 * Business Tools Routes
 * Extracted from server.js
 */
import logger from '../services/logger.js';

export function createBusinessRoutes(app, ctx) {
  const {
    pool,
    requireKey,
    aiSafetyGate,
    searchLimiter,
    searchService,
    checkHumanAttentionBudget,
    businessCenter,
    businessDuplication,
    codeServices,
    makeComGenerator,
    legalChecker,
    selfFundingSystem,
    marketingResearch,
    marketingAgency,
  } = ctx;

// ==================== BUSINESS CENTER ENDPOINTS ====================
app.get("/api/v1/business-center/dashboard", requireKey, async (req, res) => {
  try {
    if (!businessCenter) {
      return res.status(503).json({ error: "Business Center not initialized" });
    }

    const dashboard = await businessCenter.getDashboard();
    res.json({ ok: true, dashboard });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post('/api/v1/search',
  requireKey,
  aiSafetyGate,
  searchLimiter,
  async (req, res) => {
    try {
      const { query, context = {}, requireProof = true } = req.body || {};

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'INVALID_QUERY', message: 'Query must be a string' });
      }

      if (query.length > 500) {
        return res.status(400).json({ error: 'QUERY_TOO_LONG', message: 'Query length must be <= 500 characters' });
      }

      if (requireProof && (!context.proof || !Array.isArray(context.proof))) {
        return res.status(400).json({
          error: 'PROOF_REQUIRED_FOR_SEARCH',
          message: 'Provide proof bundle in context when requireProof is true',
        });
      }

      const searcher = req.headers['x-command-actor'] || 'overlay-ui';
      const results = await searchService.safeSearch(query, context, searcher);

      res.json({
        success: true,
        ...results,
        safety: {
          filtered: true,
          sanitized: true,
        },
      });
    } catch (error) {
      res.status(500).json({
        error: 'SEARCH_FAILED',
        message: error.message,
      });
    }
  }
);

app.get('/api/v1/admin/search/history',
  requireKey,
  checkHumanAttentionBudget,
  (req, res) => {
    res.json({
      ok: true,
      history: searchService.getSearchHistory(),
      todayCount: searchService.getTodaySearches(),
      dailyLimit: searchService.dailyLimit,
      remaining: searchService.dailyLimit - searchService.getTodaySearches(),
    });
  }
);

app.post('/api/v1/admin/search/clear',
  requireKey,
  checkHumanAttentionBudget,
  (req, res) => {
    searchService.clearHistory();
    res.json({
      ok: true,
      message: 'Search history cleared',
    });
  }
);

app.post("/api/v1/business-center/idea-batch", requireKey, async (req, res) => {
  try {
    if (!businessCenter) {
      return res.status(503).json({ error: "Business Center not initialized" });
    }

    const { focus, targetImprovement = 10, count } = req.body || {};
    const normalizedCount = Math.max(5, Math.min(50, Number(count) || 25));
    if (!focus || !focus.trim()) {
      return res.status(400).json({ ok: false, error: "focus is required" });
    }

    const batch = await businessCenter.generateIdeaBatch({
      focus,
      targetImprovement: Number(targetImprovement) || 10,
      count: normalizedCount,
    });

    res.json({ ok: true, ...batch });
  } catch (error) {
    console.error("Business Center idea batch error:", error.message);
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/business-center/idea-batches", requireKey, async (req, res) => {
  try {
    if (!businessCenter) {
      return res.status(503).json({ error: "Business Center not initialized" });
    }

    const { limit = 10 } = req.query;
    const batches = await businessCenter.listIdeaBatches(Number(limit) || 10);
    res.json({ ok: true, batches });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/business-center/idea-batch/:batchId", requireKey, async (req, res) => {
  try {
    if (!businessCenter) {
      return res.status(503).json({ error: "Business Center not initialized" });
    }

    const { batchId } = req.params;
    const ideas = await businessCenter.getIdeaBatch(batchId);
    if (!ideas.length) {
      return res.status(404).json({ ok: false, error: "Batch not found" });
    }

    res.json({ ok: true, batchId, ideas });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== BUSINESS DUPLICATION ENDPOINTS ====================
app.post("/api/v1/business/duplicate", requireKey, async (req, res) => {
  try {
    if (!businessDuplication) {
      return res.status(503).json({ error: "Business Duplication not initialized" });
    }

    const { competitorUrl, competitorName, improvementTarget, focusAreas } = req.body;
    const result = await businessDuplication.duplicateAndImprove({
      competitorUrl,
      competitorName,
      improvementTarget: improvementTarget || 15,
      focusAreas: focusAreas || [],
    });

    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/business/duplications", requireKey, async (req, res) => {
  try {
    if (!businessDuplication) {
      return res.status(503).json({ error: "Business Duplication not initialized" });
    }

    const { limit = 50 } = req.query;
    const duplications = await businessDuplication.getDuplications(parseInt(limit));
    res.json({ ok: true, count: duplications.length, duplications });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== CODE SERVICES ENDPOINTS ====================
app.post("/api/v1/code/generate", requireKey, async (req, res) => {
  try {
    if (!codeServices) {
      return res.status(503).json({ error: "Code Services not initialized" });
    }

    const { requirements, language, framework, style, includeTests, includeDocs } = req.body;
    const result = await codeServices.generateCode({
      requirements,
      language: language || 'javascript',
      framework,
      style: style || 'clean',
      includeTests: includeTests !== false,
      includeDocs: includeDocs !== false,
    });

    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/code/review", requireKey, async (req, res) => {
  try {
    if (!codeServices) {
      return res.status(503).json({ error: "Code Services not initialized" });
    }

    const { code, language, focusAreas } = req.body;
    const result = await codeServices.reviewCode({
      code,
      language: language || 'javascript',
      focusAreas: focusAreas || [],
    });

    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/code/fix", requireKey, async (req, res) => {
  try {
    if (!codeServices) {
      return res.status(503).json({ error: "Code Services not initialized" });
    }

    const { code, bugs, language } = req.body;
    const result = await codeServices.fixBugs({
      code,
      bugs,
      language: language || 'javascript',
    });

    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== MAKE.COM GENERATOR ENDPOINTS ====================
app.post("/api/v1/makecom/scenario", requireKey, async (req, res) => {
  try {
    if (!makeComGenerator) {
      return res.status(503).json({ error: "Make.com Generator not initialized" });
    }

    const { description, trigger, actions, integrations } = req.body;
    const result = await makeComGenerator.generateScenario({
      description,
      trigger,
      actions,
      integrations,
    });

    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/zapier/zap", requireKey, async (req, res) => {
  try {
    if (!makeComGenerator) {
      return res.status(503).json({ error: "Make.com Generator not initialized" });
    }

    const { description, trigger, actions } = req.body;
    const result = await makeComGenerator.generateZap({
      description,
      trigger,
      actions,
    });

    res.json({ ok: true, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/makecom/scenarios", requireKey, async (req, res) => {
  try {
    if (!makeComGenerator) {
      return res.status(503).json({ error: "Make.com Generator not initialized" });
    }

    const { limit = 50 } = req.query;
    const scenarios = await makeComGenerator.getScenarios(parseInt(limit));
    res.json({ ok: true, count: scenarios.length, scenarios });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/zapier/zaps", requireKey, async (req, res) => {
  try {
    if (!makeComGenerator) {
      return res.status(503).json({ error: "Make.com Generator not initialized" });
    }

    const { limit = 50 } = req.query;
    const zaps = await makeComGenerator.getZaps(parseInt(limit));
    res.json({ ok: true, count: zaps.length, zaps });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== CONTROVERSIAL APPROVAL SYSTEM ====================
app.post("/api/v1/approval/request", requireKey, async (req, res) => {
  try {
    const { type, description, potentialIssues, data } = req.body;
    
    await pool.query(
      `INSERT INTO approval_requests 
       (request_id, type, description, potential_issues, request_data, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        `approval_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type,
        description,
        JSON.stringify(potentialIssues || []),
        JSON.stringify(data || {}),
        'pending',
      ]
    );

    res.json({ ok: true, message: 'Approval request submitted. Awaiting your review.' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/approval/pending", requireKey, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM approval_requests WHERE status = 'pending' ORDER BY created_at DESC`
    );
    res.json({ ok: true, count: result.rows.length, requests: result.rows });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/approval/:requestId/approve", requireKey, async (req, res) => {
  try {
    const { approved, notes } = req.body;
    await pool.query(
      `UPDATE approval_requests 
       SET status = $1, approval_notes = $2, approved_at = NOW() 
       WHERE request_id = $3`,
      [approved ? 'approved' : 'rejected', notes, req.params.requestId]
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/legal/check", requireKey, async (req, res) => {
  try {
    if (!legalChecker) {
      return res.status(503).json({ error: "Legal Checker not initialized" });
    }

    const { action, description, data } = req.body;
    const check = await legalChecker.checkRequiresApproval(action, description, data);
    res.json({ ok: true, ...check });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/legal/ai-employee", requireKey, async (req, res) => {
  try {
    if (!legalChecker) {
      return res.status(503).json({ error: "Legal Checker not initialized" });
    }

    const legality = await legalChecker.checkAIEmployeePlacementLegality();
    res.json({ ok: true, ...legality });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== SELF-FUNDING SYSTEM ENDPOINTS ====================
app.get("/api/v1/self-funding/stats", requireKey, async (req, res) => {
  try {
    if (!selfFundingSystem) {
      return res.status(503).json({ error: "Self-Funding System not initialized" });
    }

    const stats = await selfFundingSystem.getStats();
    res.json({ ok: true, ...stats });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/self-funding/spending", requireKey, async (req, res) => {
  try {
    if (!selfFundingSystem) {
      return res.status(503).json({ error: "Self-Funding System not initialized" });
    }

    const { limit = 50 } = req.query;
    const spending = await selfFundingSystem.getSpendingHistory(parseInt(limit));
    res.json({ ok: true, count: spending.length, spending });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== MARKETING RESEARCH ENDPOINTS ====================
app.get("/api/v1/marketing/playbook", requireKey, async (req, res) => {
  try {
    if (!marketingResearch) {
      return res.status(503).json({ error: "Marketing Research not initialized" });
    }

    const playbook = await marketingResearch.getPlaybook();
    res.json({ ok: true, playbook });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/marketing/research", requireKey, async (req, res) => {
  try {
    if (!marketingResearch) {
      return res.status(503).json({ error: "Marketing Research not initialized" });
    }

    const research = await marketingResearch.getAllResearch();
    res.json({ ok: true, count: research.length, research });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/marketing/research/:marketer", requireKey, async (req, res) => {
  try {
    if (!marketingResearch) {
      return res.status(503).json({ error: "Marketing Research not initialized" });
    }

    const research = await marketingResearch.researchMarketer(req.params.marketer);
    res.json({ ok: true, research });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== MARKETING AGENCY ENDPOINTS ====================
app.get("/api/v1/marketing/campaigns", requireKey, async (req, res) => {
  try {
    if (!marketingAgency) {
      return res.status(503).json({ error: "Marketing Agency not initialized" });
    }

    const campaigns = await marketingAgency.getActiveCampaigns();
    res.json({ ok: true, count: campaigns.length, campaigns });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.post("/api/v1/marketing/campaigns/create", requireKey, async (req, res) => {
  try {
    if (!marketingAgency) {
      return res.status(503).json({ error: "Marketing Agency not initialized" });
    }

    const campaigns = await marketingAgency.createLifeOSCampaigns();
    res.json({ ok: true, count: campaigns.length, campaigns });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});


}
