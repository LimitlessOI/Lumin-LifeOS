/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║              ENHANCED COUNCIL ROUTES                                             ║
 * ║              API endpoints for new council features                              ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 *
 * Routes for:
 * - Dynamic Council Expansion
 * - Enhanced Consensus Protocol
 * - Decision Filters
 * - FSAR Severity Gate
 */

import { DynamicCouncilExpansion } from '../council/dynamic-expansion.js';
import { EnhancedConsensusProtocol } from '../council/enhanced-consensus.js';
import { DecisionFilters } from '../core/decision-filters.js';
import { EnhancedFSARGate } from '../audit/fsar/enhanced-severity-gate.js';

export function registerEnhancedCouncilRoutes(app, pool, callCouncilMember, requireKey) {
  // Initialize enhanced council systems
  let dynamicExpansion = null;
  let enhancedConsensus = null;
  let decisionFilters = null;
  let fsarGate = null;

  try {
    dynamicExpansion = new DynamicCouncilExpansion(pool);
    enhancedConsensus = new EnhancedConsensusProtocol(pool, callCouncilMember, dynamicExpansion);
    decisionFilters = new DecisionFilters(pool, callCouncilMember);
    fsarGate = new EnhancedFSARGate(pool);

    console.log('✅ [ROUTES] Enhanced Council systems initialized');
  } catch (error) {
    console.error('❌ [ROUTES] Enhanced Council initialization failed:', error.message);
  }

  // ==================== DYNAMIC COUNCIL EXPANSION ====================

  /**
   * POST /api/v1/council/expansion/evaluate
   * Evaluate if council should expand based on decision context
   */
  app.post("/api/v1/council/expansion/evaluate", requireKey, async (req, res) => {
    try {
      if (!dynamicExpansion) {
        return res.status(503).json({ error: "Dynamic Expansion not initialized" });
      }

      const { context } = req.body;
      const decision = await dynamicExpansion.shouldExpand(context);

      res.json({ ok: true, ...decision });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * GET /api/v1/council/expansion/config
   * Get current council configuration
   */
  app.get("/api/v1/council/expansion/config", requireKey, async (req, res) => {
    try {
      if (!dynamicExpansion) {
        return res.status(503).json({ error: "Dynamic Expansion not initialized" });
      }

      const config = dynamicExpansion.getConfig();
      res.json({ ok: true, config });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * GET /api/v1/council/expansion/stats
   * Get expansion statistics
   */
  app.get("/api/v1/council/expansion/stats", requireKey, async (req, res) => {
    try {
      if (!dynamicExpansion) {
        return res.status(503).json({ error: "Dynamic Expansion not initialized" });
      }

      const stats = await dynamicExpansion.getStats();
      res.json({ ok: true, stats });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ==================== ENHANCED CONSENSUS PROTOCOL ====================

  /**
   * POST /api/v1/council/consensus/enhanced
   * Run the enhanced 5-phase consensus protocol
   */
  app.post("/api/v1/council/consensus/enhanced", requireKey, async (req, res) => {
    try {
      if (!enhancedConsensus) {
        return res.status(503).json({ error: "Enhanced Consensus not initialized" });
      }

      const { decision, agents = ['chatgpt', 'gemini', 'deepseek'] } = req.body;

      if (!decision) {
        return res.status(400).json({ error: "Decision is required" });
      }

      const result = await enhancedConsensus.runProtocol(decision, agents);
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ==================== DECISION FILTERS ====================

  /**
   * POST /api/v1/decision/filters
   * Apply wisdom lenses to a decision
   */
  app.post("/api/v1/decision/filters", requireKey, async (req, res) => {
    try {
      if (!decisionFilters) {
        return res.status(503).json({ error: "Decision Filters not initialized" });
      }

      const { decision } = req.body;

      if (!decision) {
        return res.status(400).json({ error: "Decision is required" });
      }

      const result = await decisionFilters.applyFilters(decision);
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * POST /api/v1/decision/adam
   * Apply Adam's lens specifically (founder perspective with veto power)
   */
  app.post("/api/v1/decision/adam", requireKey, async (req, res) => {
    try {
      if (!decisionFilters) {
        return res.status(503).json({ error: "Decision Filters not initialized" });
      }

      const { decision } = req.body;

      if (!decision) {
        return res.status(400).json({ error: "Decision is required" });
      }

      const result = await decisionFilters.applyAdamLens(decision);
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * GET /api/v1/decision/filters/config
   * Get wisdom lens configuration
   */
  app.get("/api/v1/decision/filters/config", requireKey, async (req, res) => {
    try {
      if (!decisionFilters) {
        return res.status(503).json({ error: "Decision Filters not initialized" });
      }

      const config = decisionFilters.getLensConfig();
      res.json({ ok: true, config });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * GET /api/v1/decision/filters/stats
   * Get filter statistics
   */
  app.get("/api/v1/decision/filters/stats", requireKey, async (req, res) => {
    try {
      if (!decisionFilters) {
        return res.status(503).json({ error: "Decision Filters not initialized" });
      }

      const stats = await decisionFilters.getStats();
      res.json({ ok: true, stats });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ==================== FSAR SEVERITY GATE ====================

  /**
   * POST /api/v1/audit/fsar/gate
   * Run enhanced FSAR with severity scoring
   */
  app.post("/api/v1/audit/fsar/gate", requireKey, async (req, res) => {
    try {
      if (!fsarGate) {
        return res.status(503).json({ error: "FSAR Gate not initialized" });
      }

      const { proposal } = req.body;

      if (!proposal) {
        return res.status(400).json({ error: "Proposal is required" });
      }

      const result = await fsarGate.evaluate(proposal, callCouncilMember);
      res.json({ ok: true, ...result });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * GET /api/v1/audit/fsar/gate/config
   * Get FSAR gate configuration
   */
  app.get("/api/v1/audit/fsar/gate/config", requireKey, async (req, res) => {
    try {
      if (!fsarGate) {
        return res.status(503).json({ error: "FSAR Gate not initialized" });
      }

      const config = fsarGate.getConfig();
      res.json({ ok: true, config });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * GET /api/v1/audit/fsar/gate/stats
   * Get FSAR gate statistics
   */
  app.get("/api/v1/audit/fsar/gate/stats", requireKey, async (req, res) => {
    try {
      if (!fsarGate) {
        return res.status(503).json({ error: "FSAR Gate not initialized" });
      }

      const stats = await fsarGate.getStats();
      res.json({ ok: true, stats });
    } catch (error) {
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  console.log('✅ [ROUTES] Enhanced Council routes registered');
}
