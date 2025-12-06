/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    MODEL ROUTER - Cost-Optimized Task Routing                   ║
 * ║                    Automatically picks cheapest viable path                       ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 * 
 * Routes tasks through Tier 0 → Tier 0.5 → Tier 1 based on:
 * - Task type
 * - Risk level
 * - User-facing requirement
 * - Revenue impact
 * 
 * Learns over time which tier works best for each task type.
 */

export class ModelRouter {
  constructor(tier0Council, tier1Council, pool) {
    this.tier0 = tier0Council;
    this.tier1 = tier1Council;
    this.pool = pool;
    this.learningData = new Map(); // Task type → best tier
  }

  /**
   * Route task through optimal cost path
   */
  async route(task, options = {}) {
    const {
      taskType = 'general',
      riskLevel = 'low',
      userFacing = false,
      revenueImpact = 'low',
      forceTier = null, // Override for testing
    } = options;

    // Tag task
    const taskMeta = {
      taskType,
      riskLevel,
      userFacing,
      revenueImpact,
      timestamp: new Date(),
    };

    // Determine starting tier
    const startingTier = forceTier || this.pickStartingTier(taskMeta);

    console.log(`🔄 [ROUTER] Task: ${taskType}, Risk: ${riskLevel}, Starting Tier: ${startingTier}`);

    // Try Tier 0 first (cheapest)
    if (startingTier === 0) {
      const tier0Result = await this.tier0.execute(task, {
        taskType,
        riskLevel,
        userFacing,
      });

      if (tier0Result.success) {
        // Quick validation (Tier 0.5) - cheap premium model check
        const validation = await this.tier1.quickValidate(
          tier0Result.result,
          task,
          tier0Result.result.substring(0, 300)
        );

        if (validation.valid && validation.confidence > 0.7) {
          // Tier 0 passed validation - use it!
          await this.logSuccess(taskMeta, 0, tier0Result.cost);
          return {
            success: true,
            result: tier0Result.result,
            tier: 0,
            validated: true,
            cost: tier0Result.cost + validation.cost,
            path: 'tier0 → tier0.5_validation → approved',
          };
        }

        // Tier 0.5 validation failed - escalate to Tier 1
        console.log(`⚠️ [ROUTER] Tier 0.5 validation failed, escalating to Tier 1`);
        const tier1Result = await this.tier1.validateAndCorrect(
          tier0Result.result,
          task,
          taskMeta
        );

        if (tier1Result.valid) {
          await this.logSuccess(taskMeta, 1, tier1Result.cost || 0.01);
          return {
            success: true,
            result: tier1Result.corrected,
            tier: 1,
            corrected: true,
            cost: tier0Result.cost + (tier1Result.cost || 0.01),
            path: 'tier0 → tier0.5_failed → tier1_corrected',
          };
        }
      }

      // Tier 0 failed or Tier 1 correction failed - full escalation
      console.log(`🚨 [ROUTER] Full escalation needed`);
      const escalated = await this.tier1.escalate(task, {
        ...taskMeta,
        tier0Attempts: tier0Result.needsEscalation ? tier0Result.tier0Attempts : [],
      });

      if (escalated.success) {
        await this.logSuccess(taskMeta, 1, 0.05); // Estimate
        return {
          success: true,
          result: escalated.result,
          tier: 1,
          escalated: true,
          cost: 0.05, // Premium model cost
          path: 'tier0_failed → tier1_full_escalation',
        };
      }
    } else {
      // Start directly at Tier 1 (high-risk tasks)
      const escalated = await this.tier1.escalate(task, taskMeta);
      if (escalated.success) {
        await this.logSuccess(taskMeta, 1, 0.05);
        return {
          success: true,
          result: escalated.result,
          tier: 1,
          directTier1: true,
          cost: 0.05,
          path: 'direct_tier1',
        };
      }
    }

    // All tiers failed
    return {
      success: false,
      error: 'All tiers failed',
      taskMeta,
    };
  }

  /**
   * Pick starting tier based on task characteristics
   */
  pickStartingTier(taskMeta) {
    const { riskLevel, userFacing, revenueImpact, taskType } = taskMeta;

    // High-risk or user-facing → start at Tier 1
    if (riskLevel === 'high' || userFacing) {
      return 1;
    }

    // Check learning data - have we learned this task type works at Tier 0?
    if (this.learningData.has(taskType)) {
      const learned = this.learningData.get(taskType);
      if (learned.successRate > 0.8 && learned.avgTier < 0.5) {
        return 0; // We've learned Tier 0 works well
      }
    }

    // Default: start at Tier 0 for low/medium risk
    return riskLevel === 'low' ? 0 : 1;
  }

  /**
   * Log successful routing for learning
   */
  async logSuccess(taskMeta, finalTier, cost) {
    try {
      const { taskType } = taskMeta;
      
      // Update learning data
      if (!this.learningData.has(taskType)) {
        this.learningData.set(taskType, {
          attempts: 0,
          successes: 0,
          totalCost: 0,
          avgTier: 0,
        });
      }

      const data = this.learningData.get(taskType);
      data.attempts++;
      data.successes++;
      data.totalCost += cost;
      data.avgTier = ((data.avgTier * (data.attempts - 1)) + finalTier) / data.attempts;
      data.successRate = data.successes / data.attempts;

      // Store in database
      await this.pool.query(
        `INSERT INTO model_routing_log (task_type, risk_level, user_facing, final_tier, cost, success, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT DO NOTHING`,
        [taskMeta.taskType, taskMeta.riskLevel, taskMeta.userFacing, finalTier, cost, true]
      );
    } catch (error) {
      console.warn(`Failed to log routing: ${error.message}`);
    }
  }

  /**
   * Get routing statistics for optimization
   */
  async getRoutingStats() {
    try {
      const result = await this.pool.query(
        `SELECT 
          task_type,
          final_tier,
          AVG(cost) as avg_cost,
          COUNT(*) as attempts,
          SUM(CASE WHEN success THEN 1 ELSE 0 END) as successes
         FROM model_routing_log
         WHERE created_at > NOW() - INTERVAL '7 days'
         GROUP BY task_type, final_tier
         ORDER BY task_type, final_tier`
      );

      return {
        stats: result.rows,
        learning: Object.fromEntries(this.learningData),
      };
    } catch (error) {
      return {
        stats: [],
        learning: Object.fromEntries(this.learningData),
      };
    }
  }
}
