/**
 * Two-Tier Council Routes
 * Extracted from server.js
 * @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md
 */
import logger from '../services/logger.js';

export function createTwoTierCouncilRoutes(app, ctx) {
  const {
    pool,
    requireKey,
    modelRouter,
    whiteLabelConfig,
  } = ctx;

// ==================== TWO-TIER COUNCIL ENDPOINTS ====================
app.post("/api/v1/council/route", requireKey, async (req, res) => {
  try {
    if (!modelRouter) {
      return res.status(503).json({ error: "Two-tier system not initialized" });
    }

    const { task, taskType = 'general', riskLevel = 'low', userFacing = false, revenueImpact = 'low' } = req.body;
    
    if (!task) {
      return res.status(400).json({ error: "Task required" });
    }

    const result = await modelRouter.route(task, {
      taskType,
      riskLevel,
      userFacing,
      revenueImpact,
    });

    // White-label sanitization
    const clientId = req.headers['x-client-id'] || 'default';
    if (whiteLabelConfig) {
      const sanitized = whiteLabelConfig.sanitizeResponse(result, clientId, result);
      return res.json({ ok: result.success, ...sanitized });
    }

    res.json({ ok: result.success, ...result });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/council/routing-stats", requireKey, async (req, res) => {
  try {
    if (!modelRouter) {
      return res.status(503).json({ error: "Two-tier system not initialized" });
    }

    const stats = await modelRouter.getRoutingStats();
    res.json({ ok: true, ...stats });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});


}
