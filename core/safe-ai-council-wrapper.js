/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║              SAFE AI COUNCIL WRAPPER (Free-First, Paid-Fallback)               ║
 * ║              Ollama (free) → API (paid) with cost controls                     ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 *
 * STRATEGY (2029 Lesson Applied):
 * - Tier 0: Free Ollama models (unlimited usage, track for patterns)
 * - Tier 1: Paid APIs (strict budget limits, only when necessary)
 *
 * PREVENTS:
 * - Automatic failover to expensive APIs (cost control)
 * - Runaway API costs from bugs
 * - Using paid APIs when free works fine
 * @ssot docs/projects/AMENDMENT_01_AI_COUNCIL.md
 */

import { EnhancedAIUsageTracker } from './enhanced-ai-usage-tracker.js';

export class SafeAICouncilWrapper {
  constructor(tier0Council, pool, config = {}) {
    this.tier0 = tier0Council; // Free Ollama
    this.pool = pool;

    // Enhanced usage tracker
    this.usageTracker = new EnhancedAIUsageTracker(pool, {
      dailyBudget: config.dailyBudget || 100,
      monthlyBudget: config.monthlyBudget || 2000,
      alertThreshold: config.alertThreshold || 0.80
    });

    // Customer tier limits (from your original code)
    this.customerLimits = {
      free_tier: { daily_calls: 1000, daily_cost: 0 },
      basic: { daily_calls: 10000, daily_cost: 50 },
      pro: { daily_calls: 100000, daily_cost: 500 },
      enterprise: { daily_calls: 1000000, daily_cost: 5000 }
    };

    // Model routing: which models are available where
    this.modelRouting = {
      // Free Ollama models
      'deepseek': { tier: 0, cost: 0 },
      'llama3': { tier: 0, cost: 0 },
      'mistral': { tier: 0, cost: 0 },
      'codellama': { tier: 0, cost: 0 },

      // Paid API models (use sparingly!)
      'gpt-4': { tier: 1, cost: 'high' },
      'gpt-4-turbo': { tier: 1, cost: 'medium' },
      'claude-3-5-sonnet': { tier: 1, cost: 'medium' },
      'claude-3-opus': { tier: 1, cost: 'high' },
      'gemini-pro': { tier: 1, cost: 'low' }
    };

    // Track usage patterns
    this.usageStats = {
      tier0Calls: 0,
      tier1Calls: 0,
      tier0Errors: 0,
      tier1Errors: 0,
      totalCost: 0
    };

    console.log('🛡️ [SAFE-AI] Safe AI Council Wrapper initialized');
    console.log('🛡️ [SAFE-AI] Strategy: Free-first (Ollama), paid-fallback (APIs)');
  }

  /**
   * Main entry point - routes to free or paid based on model
   */
  async call(model, prompt, options = {}) {
    const customerId = options.customerId || 'INTERNAL';
    const tier = options.tier || 'free_tier';
    const capability = options.capability || 'unknown';

    const modelInfo = this.modelRouting[model];

    if (!modelInfo) {
      throw new Error(`Unknown model: ${model}. Available: ${Object.keys(this.modelRouting).join(', ')}`);
    }

    // Route based on tier
    if (modelInfo.tier === 0) {
      return this.callTier0Free(model, prompt, customerId, tier, capability, options);
    } else {
      return this.callTier1Paid(model, prompt, customerId, tier, capability, options);
    }
  }

  /**
   * Tier 0: Free Ollama (your current implementation, enhanced)
   */
  async callTier0Free(model, prompt, customerId, tier, capability, options = {}) {
    // Check customer limits (even for free tier - prevent abuse)
    await this.usageTracker.checkLimit(customerId, tier);

    const startTime = Date.now();

    try {
      // Call free Ollama
      const response = await this.tier0.queryModelStream(model, prompt);
      const responseTime = Date.now() - startTime;

      // Track usage (cost = 0, but track for patterns)
      const tokens = this.usageTracker.estimateTokens(prompt + response);
      const cost = 0; // FREE!

      await this.usageTracker.logUsage(customerId, model, tokens, cost, {
        capability,
        promptLength: prompt.length,
        responseLength: response.length,
        responseTime,
        tier: 0
      });

      this.usageStats.tier0Calls++;

      console.log(
        `✅ [SAFE-AI] Tier 0 (FREE): ${capability} using ${model} ` +
        `(${responseTime}ms, ${tokens} tokens, $0)`
      );

      return response;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.usageStats.tier0Errors++;

      console.error(
        `❌ [SAFE-AI] Tier 0 FAILED: ${capability} using ${model} ` +
        `(${error.message})`
      );

      // Log failed attempt (still track for monitoring)
      await this.usageTracker.logUsage(customerId, model, 0, 0, {
        capability,
        promptLength: prompt.length,
        responseLength: 0,
        responseTime,
        tier: 0,
        error: error.message
      });

      // DON'T automatically failover to expensive Tier 1
      // Let the capability decide if it wants to retry with paid API
      throw new Error(`AI service (${model}) temporarily unavailable: ${error.message}`);
    }
  }

  /**
   * Tier 1: Paid APIs (strict cost controls)
   */
  async callTier1Paid(model, prompt, customerId, tier, capability, options = {}) {
    // Check customer limits
    await this.usageTracker.checkLimit(customerId, tier);

    // CRITICAL: Check internal budget (prevent bankruptcy)
    try {
      await this.usageTracker.checkInternalBudget(capability);
    } catch (error) {
      console.error(`⛔ [SAFE-AI] Budget exceeded, blocking paid API call: ${error.message}`);
      throw new Error(`Paid AI calls paused: ${error.message}`);
    }

    // Estimate cost BEFORE making call
    const estimatedPromptTokens = this.usageTracker.estimateTokens(prompt);
    const estimatedCompletionTokens = Math.ceil(estimatedPromptTokens * 0.5);
    const estimatedCost = this.usageTracker.calculateCost(
      model,
      estimatedPromptTokens,
      estimatedCompletionTokens
    );

    // Warn if expensive
    if (estimatedCost > 1.00) {
      console.warn(
        `💰 [SAFE-AI] EXPENSIVE CALL: ${capability} using ${model} ` +
        `(estimated: $${estimatedCost.toFixed(4)})`
      );
    }

    const startTime = Date.now();

    try {
      // Call paid API (implement your Tier 1 API calls here)
      const response = await this.callPaidAPI(model, prompt);
      const responseTime = Date.now() - startTime;

      // Calculate actual cost
      const actualCompletionTokens = this.usageTracker.estimateTokens(response);
      const totalTokens = estimatedPromptTokens + actualCompletionTokens;
      const actualCost = this.usageTracker.calculateCost(
        model,
        estimatedPromptTokens,
        actualCompletionTokens
      );

      // Log usage with ACTUAL cost
      await this.usageTracker.logUsage(customerId, model, totalTokens, actualCost, {
        capability,
        promptLength: prompt.length,
        responseLength: response.length,
        responseTime,
        tier: 1
      });

      this.usageStats.tier1Calls++;
      this.usageStats.totalCost += actualCost;

      console.log(
        `💰 [SAFE-AI] Tier 1 (PAID): ${capability} using ${model} ` +
        `(${responseTime}ms, ${totalTokens} tokens, $${actualCost.toFixed(4)})`
      );

      return response;

    } catch (error) {
      const responseTime = Date.now() - startTime;

      this.usageStats.tier1Errors++;

      console.error(
        `❌ [SAFE-AI] Tier 1 FAILED: ${capability} using ${model} ` +
        `(${error.message})`
      );

      // Log failed attempt
      await this.usageTracker.logUsage(customerId, model, 0, 0, {
        capability,
        promptLength: prompt.length,
        responseLength: 0,
        responseTime,
        tier: 1,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Call paid API (placeholder - implement based on your API setup)
   */
  async callPaidAPI(model, prompt) {
    // TODO: Implement actual API calls
    // Example:
    // if (model.startsWith('gpt-')) {
    //   return await this.callOpenAI(model, prompt);
    // } else if (model.startsWith('claude-')) {
    //   return await this.callAnthropic(model, prompt);
    // } else if (model.startsWith('gemini-')) {
    //   return await this.callGoogleAI(model, prompt);
    // }

    throw new Error('Paid API not implemented yet. Use free Ollama models.');
  }

  /**
   * Smart model selection: try free first, paid if needed
   */
  async callWithFallback(preferredModel, prompt, options = {}) {
    const modelInfo = this.modelRouting[preferredModel];

    // If preferred model is free, just use it
    if (modelInfo && modelInfo.tier === 0) {
      return this.call(preferredModel, prompt, options);
    }

    // If preferred model is paid, try free alternative first
    const freeAlternatives = {
      'gpt-4': 'deepseek',
      'gpt-4-turbo': 'deepseek',
      'claude-3-5-sonnet': 'deepseek',
      'claude-3-opus': 'deepseek',
      'gemini-pro': 'llama3'
    };

    const freeModel = freeAlternatives[preferredModel];

    if (freeModel && options.allowFallback !== false) {
      console.log(
        `💡 [SAFE-AI] Trying free alternative: ${freeModel} instead of ${preferredModel}`
      );

      try {
        return await this.call(freeModel, prompt, options);
      } catch (error) {
        console.warn(
          `⚠️ [SAFE-AI] Free model failed, falling back to paid: ${preferredModel}`
        );

        // Only use paid if explicitly allowed
        if (options.allowPaid === true) {
          return this.call(preferredModel, prompt, options);
        } else {
          throw new Error(
            `Free model failed and paid fallback not allowed. ` +
            `Set options.allowPaid=true to use ${preferredModel}`
          );
        }
      }
    }

    // No free alternative, use paid (if allowed)
    if (options.allowPaid === true) {
      return this.call(preferredModel, prompt, options);
    } else {
      throw new Error(
        `Model ${preferredModel} requires payment. ` +
        `Set options.allowPaid=true or use free models: ${Object.keys(this.modelRouting).filter(m => this.modelRouting[m].tier === 0).join(', ')}`
      );
    }
  }

  /**
   * Get usage statistics
   */
  getStats() {
    return {
      ...this.usageStats,
      tier0SuccessRate: this.usageStats.tier0Calls > 0
        ? ((this.usageStats.tier0Calls - this.usageStats.tier0Errors) / this.usageStats.tier0Calls * 100).toFixed(2)
        : 0,
      tier1SuccessRate: this.usageStats.tier1Calls > 0
        ? ((this.usageStats.tier1Calls - this.usageStats.tier1Errors) / this.usageStats.tier1Calls * 100).toFixed(2)
        : 0,
      avgCostPerPaidCall: this.usageStats.tier1Calls > 0
        ? (this.usageStats.totalCost / this.usageStats.tier1Calls).toFixed(4)
        : 0
    };
  }

  /**
   * Get real-time dashboard
   */
  getDashboard() {
    return {
      usage: this.getStats(),
      budget: this.usageTracker.getDashboard(),
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Generate cost optimization recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const stats = this.usageStats;

    // Too many paid calls
    if (stats.tier1Calls > stats.tier0Calls * 0.1) {
      recommendations.push({
        priority: 'high',
        type: 'cost_optimization',
        message: `${stats.tier1Calls} paid API calls vs ${stats.tier0Calls} free calls. ` +
                 `Consider using free models more (90%+ should be free).`,
        action: 'Review which capabilities are using paid APIs and switch to free where possible'
      });
    }

    // High Tier 0 error rate
    if (stats.tier0Errors > stats.tier0Calls * 0.1) {
      recommendations.push({
        priority: 'medium',
        type: 'reliability',
        message: `Free Ollama models have ${(stats.tier0Errors / stats.tier0Calls * 100).toFixed(0)}% error rate.`,
        action: 'Check Ollama service health and model availability'
      });
    }

    // Approaching budget
    const budget = this.usageTracker.getDashboard();
    if (parseFloat(budget.today.percentageUsed) > 80) {
      recommendations.push({
        priority: 'critical',
        type: 'budget',
        message: `Daily budget at ${budget.today.percentageUsed}%`,
        action: 'Reduce paid API usage or increase budget'
      });
    }

    return recommendations;
  }

  /**
   * Generate cost report
   */
  async getCostReport(days = 30) {
    return this.usageTracker.generateCostReport(days);
  }
}

// Export factory function
export function createSafeAICouncil(tier0Council, pool, config) {
  return new SafeAICouncilWrapper(tier0Council, pool, config);
}
