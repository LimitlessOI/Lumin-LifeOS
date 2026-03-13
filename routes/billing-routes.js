/**
 * Billing & Access Routes
 * Extracted from server.js
 */
import logger from '../services/logger.js';

export function createBillingRoutes(app, ctx) {
  const {
    pool,
    requireKey,
    whiteLabelConfig,
  } = ctx;

// ==================== BILLING / ENTITLEMENTS ====================
app.get("/api/v1/billing/entitlements", requireKey, async (req, res) => {
  try {
    const projectId = String(req.headers["x-project-id"] || req.query.project_id || "default").trim();
    const result = await pool.query(
      `SELECT entitlement, enabled
       FROM project_entitlements
       WHERE project_id = $1`,
      [projectId]
    );

    const entitlements = {};
    for (const row of result.rows) {
      entitlements[row.entitlement] = !!row.enabled;
    }

    res.json({ ok: true, project_id: projectId, entitlements });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== WHITE-LABEL ENDPOINTS ====================
app.post("/api/v1/white-label/config", requireKey, async (req, res) => {
  try {
    if (!whiteLabelConfig) {
      return res.status(503).json({ error: "White-label system not initialized" });
    }

    const config = await whiteLabelConfig.createConfig(req.body);
    res.json({ ok: true, config });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

app.get("/api/v1/white-label/config/:clientId", requireKey, async (req, res) => {
  try {
    if (!whiteLabelConfig) {
      return res.status(503).json({ error: "White-label system not initialized" });
    }

    const config = await whiteLabelConfig.getConfig(req.params.clientId);
    res.json({ ok: true, config });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// ==================== TRIAL SYSTEM ENDPOINTS ====================
app.get("/api/v1/trial/status", requireKey, async (req, res) => {
  try {
    // Check if user has active trial or subscription
    const result = await pool.query(
      `SELECT * FROM user_trials 
       WHERE user_id = $1 OR command_key = $2
       ORDER BY created_at DESC LIMIT 1`,
      [req.headers['x-user-id'] || 'default', req.headers['x-command-key']]
    );

    const trial = result.rows[0];
    const now = new Date();

    if (trial) {
      const trialEnd = new Date(trial.created_at);
      trialEnd.setDate(trialEnd.getDate() + (trial.duration_days || 7));
      
      const isActive = now < trialEnd && trial.active;
      const canOffer = !trial || (now > trialEnd && !trial.has_subscription);

      res.json({
        ok: true,
        trialActive: isActive,
        hasAccess: isActive || trial?.has_subscription,
        canOfferTrial: canOffer,
        trialEndsAt: trialEnd.toISOString(),
      });
    } else {
      res.json({
        ok: true,
        trialActive: false,
        hasAccess: false,
        canOfferTrial: true,
      });
    }
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message });
  }
});


}
