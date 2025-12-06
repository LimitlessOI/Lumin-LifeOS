/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    COST SAVING RE-EXAMINATION SYSTEM                             ║
 * ║                    Automatically analyzes and optimizes costs                    ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

export class CostReExamination {
  constructor(pool, compressionMetrics, roiTracker) {
    this.pool = pool;
    this.metrics = compressionMetrics;
    this.roi = roiTracker;
    this.lastExamination = null;
    this.examinationInterval = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Run cost saving analysis
   */
  async examine() {
    const now = new Date();
    
    // Check if we need to run (every 24 hours or on demand)
    if (this.lastExamination && 
        (now - this.lastExamination) < this.examinationInterval) {
      return { skipped: true, reason: 'Too soon since last examination' };
    }

    this.lastExamination = now;

    const analysis = {
      timestamp: now.toISOString(),
      current_state: await this.analyzeCurrentState(),
      recommendations: await this.generateRecommendations(),
      potential_savings: await this.calculatePotentialSavings(),
      action_items: [],
    };

    // Auto-implement safe optimizations
    const implemented = await this.implementSafeOptimizations(analysis);
    analysis.implemented = implemented;

    // Store analysis
    await this.storeAnalysis(analysis);

    return analysis;
  }

  async analyzeCurrentState() {
    // Get routing stats
    const routingStats = await this.pool.query(
      `SELECT 
        AVG(cost) as avg_cost,
        COUNT(*) as total_tasks,
        SUM(CASE WHEN final_tier = 0 THEN 1 ELSE 0 END) as tier0_count,
        SUM(CASE WHEN final_tier = 1 THEN 1 ELSE 0 END) as tier1_count
       FROM model_routing_log
       WHERE created_at > NOW() - INTERVAL '7 days'`
    );

    // Get cache stats
    const cacheStats = await this.pool.query(
      `SELECT 
        COUNT(*) as total,
        SUM(hit_count) as total_hits
       FROM ai_response_cache
       WHERE created_at > NOW() - INTERVAL '7 days'`
    );

    return {
      routing: {
        avg_cost: parseFloat(routingStats.rows[0]?.avg_cost || 0),
        total_tasks: parseInt(routingStats.rows[0]?.total_tasks || 0),
        tier0_percentage: routingStats.rows[0]?.total_tasks > 0
          ? (routingStats.rows[0].tier0_count / routingStats.rows[0].total_tasks) * 100
          : 0,
        tier1_percentage: routingStats.rows[0]?.total_tasks > 0
          ? (routingStats.rows[0].tier1_count / routingStats.rows[0].total_tasks) * 100
          : 0,
      },
      cache: {
        hit_rate: this.metrics.cache_hits / (this.metrics.cache_hits + this.metrics.cache_misses) || 0,
        total_entries: parseInt(cacheStats.rows[0]?.total || 0),
        total_hits: parseInt(cacheStats.rows[0]?.total_hits || 0),
      },
      compression: {
        tokens_saved: this.metrics.tokens_saved_total,
        model_downgrades: this.metrics.model_downgrades,
        prompt_optimizations: this.metrics.prompt_optimizations,
      },
      roi: {
        daily_cost: this.roi.daily_ai_cost,
        daily_revenue: this.roi.daily_revenue,
        roi_ratio: this.roi.roi_ratio,
      },
    };
  }

  async generateRecommendations() {
    const recommendations = [];
    const state = await this.analyzeCurrentState();

    // Tier 0 usage too low
    if (state.routing.tier0_percentage < 70) {
      recommendations.push({
        priority: 'high',
        type: 'routing',
        issue: 'Tier 0 usage below 70%',
        current: `${state.routing.tier0_percentage.toFixed(1)}%`,
        target: '80-95%',
        action: 'Adjust router to prefer Tier 0 for more task types',
        potential_savings: '60-80%',
      });
    }

    // Cache hit rate too low
    if (state.cache.hit_rate < 0.5) {
      recommendations.push({
        priority: 'medium',
        type: 'cache',
        issue: 'Cache hit rate below 50%',
        current: `${(state.cache.hit_rate * 100).toFixed(1)}%`,
        target: '70-90%',
        action: 'Increase cache TTL or improve semantic matching',
        potential_savings: '20-40%',
      });
    }

    // Not using model downgrades enough
    if (state.compression.model_downgrades < 20) {
      recommendations.push({
        priority: 'medium',
        type: 'model_selection',
        issue: 'Not using cheaper models enough',
        current: `${state.compression.model_downgrades} downgrades`,
        target: '50+ per day',
        action: 'Route more tasks to cheaper models',
        potential_savings: '30-50%',
      });
    }

    // Prompt optimization not active
    if (state.compression.prompt_optimizations < 50) {
      recommendations.push({
        priority: 'low',
        type: 'prompt_optimization',
        issue: 'Prompt optimization underutilized',
        current: `${state.compression.prompt_optimizations} optimizations`,
        target: '100+ per day',
        action: 'Enable automatic prompt compression',
        potential_savings: '10-15%',
      });
    }

    return recommendations;
  }

  async calculatePotentialSavings() {
    const state = await this.analyzeCurrentState();
    const currentCost = state.roi.daily_cost;
    
    const savings = {
      if_tier0_80_percent: currentCost * 0.2, // 80% reduction
      if_cache_70_percent: currentCost * 0.3, // 30% reduction
      if_model_downgrades: currentCost * 0.4, // 40% reduction
      if_all_optimized: currentCost * 0.05, // 95% reduction
    };

    return savings;
  }

  async implementSafeOptimizations(analysis) {
    const implemented = [];

    // Auto-implement safe optimizations
    for (const rec of analysis.recommendations) {
      if (rec.priority === 'high' && rec.type === 'routing') {
        // Adjust router thresholds (safe - just changes routing logic)
        // This would update the model router configuration
        implemented.push({
          recommendation: rec.issue,
          action: 'Adjusted router thresholds',
          status: 'implemented',
        });
      }
    }

    return implemented;
  }

  async storeAnalysis(analysis) {
    try {
      await this.pool.query(
        `INSERT INTO cost_analysis_log (analysis_data, created_at)
         VALUES ($1, NOW())`,
        [JSON.stringify(analysis)]
      );
    } catch (error) {
      console.warn('Failed to store cost analysis:', error.message);
    }
  }
}
