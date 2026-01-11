/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║              ENHANCED SAFE AI COUNCIL (Your Implementation + 2029 Lessons)      ║
 * ║              Free-first (Ollama), optional paid fallback, full tracking         ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

import { EnhancedAIUsageTracker } from './enhanced-ai-usage-tracker.js';

/**
 * Enhanced version of your safeAICouncil function
 *
 * IMPROVEMENTS:
 * - Tracks capability (know which feature is expensive)
 * - Tracks response time (monitor performance)
 * - Better error logging
 * - Optional paid fallback (controlled)
 * - Budget checking (prevent overruns)
 * - Real-time cost dashboard
 */
export class EnhancedSafeAICouncil {
  constructor(tier0Council, pool, config = {}) {
    this.tier0 = tier0Council;
    this.pool = pool;

    // Initialize enhanced usage tracker
    this.usageTracker = new EnhancedAIUsageTracker(pool, {
      dailyBudget: config.dailyBudget || 10,       // $10/day for paid APIs (conservative)
      monthlyBudget: config.monthlyBudget || 200,  // $200/month for paid APIs
      alertThreshold: config.alertThreshold || 0.80
    });

    // Statistics
    this.stats = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      totalCost: 0,
      avgResponseTime: 0
    };

    console.log('🛡️ [SAFE-AI] Enhanced Safe AI Council initialized');
    console.log('🛡️ [SAFE-AI] Free-first strategy: Ollama → (optional) Paid APIs');
  }

  /**
   * Main call function - enhanced version of your original
   */
  async call(model, prompt, options = {}) {
    const customerId = options.customerId || 'INTERNAL';
    const tier = options.tier || 'free_tier';
    const capability = options.capability || 'unknown';

    // Check customer limits BEFORE calling AI (your original code)
    await this.usageTracker.checkLimit(customerId, tier);

    const startTime = Date.now();
    let response;
    let error;

    try {
      // Call Tier 0 (free Ollama) - your original code
      response = await this.tier0.queryModelStream(model, prompt);

      const responseTime = Date.now() - startTime;
      const tokens = this.usageTracker.estimateTokens(prompt + response);
      const cost = 0; // Ollama is FREE!

      // Log usage with enhanced metadata
      await this.usageTracker.logUsage(customerId, model, tokens, cost, {
        capability,
        promptLength: prompt.length,
        responseLength: response.length,
        responseTime,
        tier: 0, // Free tier
        success: true
      });

      // Update stats
      this.stats.totalCalls++;
      this.stats.successfulCalls++;
      this.updateAvgResponseTime(responseTime);

      console.log(
        `✅ [SAFE-AI] ${capability} (${model}): ` +
        `${responseTime}ms, ${tokens} tokens, $0 (FREE)`
      );

      return response;

    } catch (err) {
      error = err;
      const responseTime = Date.now() - startTime;

      this.stats.totalCalls++;
      this.stats.failedCalls++;

      console.error(
        `❌ [SAFE-AI] ${capability} (${model}) FAILED: ` +
        `${err.message} (${responseTime}ms)`
      );

      // Log failed attempt
      await this.usageTracker.logUsage(customerId, model, 0, 0, {
        capability,
        promptLength: prompt.length,
        responseLength: 0,
        responseTime,
        tier: 0,
        success: false,
        error: err.message
      });

      // Check if paid fallback is allowed
      if (options.allowPaidFallback === true) {
        console.warn(
          `⚠️ [SAFE-AI] ${capability}: Free model failed, trying paid fallback...`
        );

        return this.callPaidFallback(model, prompt, customerId, tier, capability, options);
      }

      // DON'T automatically failover to Tier 1 (expensive) - your original strategy
      throw new Error(`AI service (${model}) temporarily unavailable: ${err.message}`);
    }
  }

  /**
   * Paid fallback (only when explicitly allowed)
   */
  async callPaidFallback(freeModel, prompt, customerId, tier, capability, options) {
    // Map free models to paid equivalents
    const paidEquivalents = {
      'deepseek': 'gpt-4-turbo',
      'llama3': 'gpt-4-turbo',
      'mistral': 'gpt-4-turbo',
      'codellama': 'claude-3-5-sonnet'
    };

    const paidModel = options.paidModel || paidEquivalents[freeModel] || 'gpt-4-turbo';

    console.warn(
      `💰 [SAFE-AI] Using PAID fallback: ${freeModel} → ${paidModel} ` +
      `(capability: ${capability})`
    );

    // Check internal budget BEFORE expensive call
    try {
      await this.usageTracker.checkInternalBudget(capability);
    } catch (error) {
      console.error(`⛔ [SAFE-AI] Budget exceeded, blocking paid API call`);
      throw new Error(
        `Paid AI calls paused due to budget: ${error.message}. ` +
        `Free model failed and paid fallback blocked.`
      );
    }

    const startTime = Date.now();

    try {
      // TODO: Implement actual paid API calls
      // For now, throw error (you need to implement this)
      throw new Error(
        'Paid API not implemented. ' +
        'Add your OpenAI/Anthropic/Google API integration here.'
      );

      // Example implementation:
      // const response = await this.callOpenAI(paidModel, prompt);
      // const responseTime = Date.now() - startTime;
      // const tokens = this.usageTracker.estimateTokens(prompt + response);
      // const cost = this.usageTracker.calculateCost(paidModel, tokens, tokens);
      //
      // await this.usageTracker.logUsage(customerId, paidModel, tokens, cost, {
      //   capability,
      //   promptLength: prompt.length,
      //   responseLength: response.length,
      //   responseTime,
      //   tier: 1,
      //   success: true,
      //   fallbackFrom: freeModel
      // });
      //
      // this.stats.totalCost += cost;
      // return response;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      console.error(
        `❌ [SAFE-AI] Paid fallback ALSO failed: ${error.message}`
      );

      await this.usageTracker.logUsage(customerId, paidModel, 0, 0, {
        capability,
        promptLength: prompt.length,
        responseLength: 0,
        responseTime,
        tier: 1,
        success: false,
        error: error.message,
        fallbackFrom: freeModel
      });

      throw error;
    }
  }

  /**
   * Update average response time
   */
  updateAvgResponseTime(responseTime) {
    const total = this.stats.totalCalls;
    const currentAvg = this.stats.avgResponseTime;
    this.stats.avgResponseTime = (currentAvg * (total - 1) + responseTime) / total;
  }

  /**
   * Get real-time statistics
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalCalls > 0
        ? ((this.stats.successfulCalls / this.stats.totalCalls) * 100).toFixed(2)
        : 0,
      budget: this.usageTracker.getDashboard()
    };
  }

  /**
   * Get dashboard (for monitoring)
   */
  getDashboard() {
    return {
      stats: this.getStats(),
      budget: this.usageTracker.getDashboard(),
      topExpensive: this.usageTracker.getTopExpensiveCapabilities(5)
    };
  }

  /**
   * Generate cost report
   */
  async getCostReport(days = 30) {
    return this.usageTracker.generateCostReport(days);
  }

  /**
   * Check system health
   */
  async checkHealth() {
    try {
      // Test free model with simple prompt
      await this.call('deepseek', 'Say "OK"', {
        capability: 'health-check',
        customerId: 'SYSTEM',
        tier: 'internal'
      });

      return {
        healthy: true,
        tier0Status: 'operational',
        message: 'Free Ollama models working'
      };
    } catch (error) {
      return {
        healthy: false,
        tier0Status: 'degraded',
        error: error.message,
        message: 'Free Ollama models experiencing issues'
      };
    }
  }
}

/**
 * Factory function - easy initialization
 */
export function createEnhancedSafeAICouncil(tier0Council, pool, config = {}) {
  return new EnhancedSafeAICouncil(tier0Council, pool, config);
}

/**
 * Drop-in replacement for your original function
 * (keeps same signature, adds tracking)
 */
export function createSafeAICouncilFunction(tier0Council, pool, config = {}) {
  const enhanced = new EnhancedSafeAICouncil(tier0Council, pool, config);

  // Return function with your original signature
  const safeAICouncil = async (model, prompt, customerId, tier = 'free_tier') => {
    return enhanced.call(model, prompt, {
      customerId,
      tier,
      capability: 'legacy-call' // Default capability for backward compatibility
    });
  };

  // Attach helper methods
  safeAICouncil.getStats = () => enhanced.getStats();
  safeAICouncil.getDashboard = () => enhanced.getDashboard();
  safeAICouncil.getCostReport = (days) => enhanced.getCostReport(days);
  safeAICouncil.checkHealth = () => enhanced.checkHealth();

  return safeAICouncil;
}
