/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    MODEL ROUTER - Two-Tier System                                ║
 * ║                    Routes tasks through Tier 0 → Tier 1                          ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 *
 * Routes AI tasks through the Two-Tier Council system:
 * - Tier 0 (FREE): Local Ollama, Groq cloud models - $0 per 1M tokens
 * - Tier 1 (PAID): OpenAI, Anthropic, Google - $0.10-$5 per 1M tokens
 *
 * CRITICAL: Always try Tier 0 first, only escalate to Tier 1 if quality insufficient
 */

const MODELS = {
  primary: {
    name: 'qwen2.5:32b',
    endpoint: 'http://localhost:11434',
    maxTokens: 8192
  },
  coder: {
    name: 'deepseek-coder-v2:latest',
    endpoint: 'http://localhost:11434',
    maxTokens: 8192
  },
  fast: {
    name: 'llama3.2:latest',
    endpoint: 'http://localhost:11434',
    maxTokens: 2048
  }
};

const BANNED_MODELS = ['phi3:mini', 'phi3', 'tinyllama'];

const TASK_ROUTING = {
  'code_generation': 'coder',
  'file_creation': 'coder',
  'bug_fix': 'coder',
  'architecture_planning': 'primary',
  'json_output': 'primary',
  'code_review': 'primary',
  'opportunity_analysis': 'primary',
  'simple_classification': 'fast',
  'yes_no_question': 'fast'
};

/**
 * ModelRouter - Intelligent routing through Two-Tier Council
 *
 * This class bridges the old routing system with the new Two-Tier Council.
 * It provides a unified interface for routing tasks through Tier 0 → Tier 1.
 */
export class ModelRouter {
  constructor(tier0Council, tier1Council, pool) {
    this.tier0Council = tier0Council;
    this.tier1Council = tier1Council;
    this.pool = pool;
    this.routingStats = {
      tier0Attempts: 0,
      tier0Successes: 0,
      tier1Fallbacks: 0,
      totalCostSavings: 0,
    };
  }

  /**
   * Route a task through the Two-Tier Council system
   * @param {string} task - The task or prompt to execute
   * @param {object} options - Routing options (taskType, riskLevel, etc.)
   * @returns {Promise<object>} - Result with response, cost, tier, etc.
   */
  async route(task, options = {}) {
    const { taskType = 'general', riskLevel = 'low', maxTier = 1 } = options;

    console.log(`🎯 [MODEL ROUTER] Task: ${taskType} | Risk: ${riskLevel}`);

    let tier0Error = null;

    // Step 1: Try Tier 0 first (FREE models)
    try {
      console.log('🔄 [MODEL ROUTER] Attempting Tier 0 (FREE)...');
      this.routingStats.tier0Attempts++;

      const tier0Result = await this.tier0Council.execute(task, {
        taskType,
        riskLevel,
        ...options,
      });

      if (tier0Result && tier0Result.success) {
        this.routingStats.tier0Successes++;
        console.log(`✅ [MODEL ROUTER] Tier 0 SUCCESS (Cost: $0)`);

        return {
          success: true,
          response: tier0Result.response || tier0Result.output,
          tier: 0,
          model: tier0Result.model,
          cost: 0,
          tokensUsed: tier0Result.tokensUsed || 0,
          provider: tier0Result.provider || 'tier0',
        };
      }

      tier0Error = tier0Result?.error || 'Tier 0 returned no result';
      console.log(`⚠️ [MODEL ROUTER] Tier 0 failed: ${tier0Error}`);
    } catch (error) {
      tier0Error = error.message;
      console.log(`❌ [MODEL ROUTER] Tier 0 error: ${tier0Error}`);
    }

    // Step 2: Escalate to Tier 1 (PAID models) if Tier 0 failed
    if (maxTier >= 1) {
      console.log('🔄 [MODEL ROUTER] Escalating to Tier 1 (PAID)...');
      this.routingStats.tier1Fallbacks++;

      try {
        const tier1Result = await this.tier1Council.escalate(task, {
          taskType,
          riskLevel,
          tier0Failed: true,
          tier0Error,
          ...options,
        });

        if (tier1Result && tier1Result.success) {
          console.log(`✅ [MODEL ROUTER] Tier 1 SUCCESS (Cost: $${tier1Result.cost || 0})`);

          return {
            success: true,
            response: tier1Result.response || tier1Result.output,
            tier: 1,
            model: tier1Result.model,
            cost: tier1Result.cost || 0,
            tokensUsed: tier1Result.tokensUsed || 0,
            provider: tier1Result.provider || 'tier1',
          };
        }

        return {
          success: false,
          error: 'Both Tier 0 and Tier 1 failed',
          tier0Error,
          tier1Error: tier1Result?.error || 'Tier 1 returned no result',
        };
      } catch (tier1Error) {
        return {
          success: false,
          error: 'Both Tier 0 and Tier 1 failed',
          tier0Error,
          tier1Error: tier1Error.message,
        };
      }
    }

    // If we're not allowed to use Tier 1, return failure
    return {
      success: false,
      error: 'Tier 0 failed and Tier 1 not allowed (maxTier: 0)',
      tier0Error,
    };
  }

  /**
   * Get routing statistics
   * @returns {Promise<object>} - Routing stats (Tier 0 vs Tier 1 usage, cost savings)
   */
  async getRoutingStats() {
    const tier0Rate = this.routingStats.tier0Attempts > 0
      ? (this.routingStats.tier0Successes / this.routingStats.tier0Attempts) * 100
      : 0;

    const tier1Rate = this.routingStats.tier0Attempts > 0
      ? (this.routingStats.tier1Fallbacks / this.routingStats.tier0Attempts) * 100
      : 0;

    return {
      tier0: {
        attempts: this.routingStats.tier0Attempts,
        successes: this.routingStats.tier0Successes,
        successRate: `${tier0Rate.toFixed(1)}%`,
      },
      tier1: {
        fallbacks: this.routingStats.tier1Fallbacks,
        fallbackRate: `${tier1Rate.toFixed(1)}%`,
      },
      costSavings: {
        total: this.routingStats.totalCostSavings,
        averagePerRequest: this.routingStats.tier0Attempts > 0
          ? (this.routingStats.totalCostSavings / this.routingStats.tier0Attempts).toFixed(4)
          : 0,
      },
    };
  }

  /**
   * Update model statistics (legacy method for backwards compatibility)
   * @param {string} model - Model name
   * @param {boolean} success - Whether the call succeeded
   * @param {number} responseTime - Response time in ms
   * @param {number} cost - Cost in dollars
   */
  updateModelStats(model, success, responseTime, cost) {
    // Legacy method - now handled by Tier0Council and Tier1Council internally
    console.log(`📊 [MODEL ROUTER] Stats update: ${model} | Success: ${success} | Time: ${responseTime}ms | Cost: $${cost}`);
  }

  /**
   * Alias for updateModelStats (legacy compatibility)
   */
  update(model, success, responseTime, cost) {
    return this.updateModelStats(model, success, responseTime, cost);
  }
}

export async function routeTask(task, prompt, options = {}) {
  const modelKey = TASK_ROUTING[task] || 'primary';
  const model = MODELS[modelKey];
  
  console.log(`🎯 [ROUTER] Task: ${task} → Model: ${model.name}`);
  
  return await callOllama(model.name, prompt, options);
}

export async function callOllama(modelName, prompt, options = {}) {
  if (BANNED_MODELS.includes(modelName)) {
    console.error(`🚫 [ROUTER] BLOCKED: ${modelName} is banned`);
    modelName = 'qwen2.5:32b';
  }
  
  const temperature = options.temperature || 0.3;
  const endpoint = options.endpoint || process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
  
  try {
    const response = await fetch(`${endpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        prompt: prompt,
        stream: false,
        options: {
          temperature: temperature,
          top_p: 0.9,
          num_predict: 8192
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.response) {
      throw new Error('Empty response from model');
    }
    
    console.log(`✅ [ROUTER] Response: ${data.response.length} chars from ${modelName}`);
    return data.response;
    
  } catch (error) {
    console.error(`❌ [ROUTER] Failed: ${error.message}`);
    throw error;
  }
}

export async function callWithRetry(task, prompt, validator, maxRetries = 3) {
  let lastError = null;
  let temperature = 0.3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🔄 [ROUTER] Attempt ${attempt}/${maxRetries}`);
    
    let adjustedPrompt = prompt;
    if (lastError && attempt > 1) {
      adjustedPrompt = `PREVIOUS ATTEMPT FAILED: ${lastError}\n\nFix the issue and try again.\n\n${prompt}`;
      temperature = Math.max(0.1, temperature - 0.1);
    }
    
    try {
      const response = await routeTask(task, adjustedPrompt, { temperature });
      
      if (validator) {
        const validation = validator(response);
        if (validation.valid || validation.passed) {
          return { success: true, response, data: validation.data };
        }
        lastError = validation.error || validation.errors?.join('; ') || 'Validation failed';
      } else {
        return { success: true, response };
      }
    } catch (e) {
      lastError = e.message;
    }
    
    console.log(`⚠️ [ROUTER] Attempt ${attempt} failed: ${lastError}`);
  }
  
  return { success: false, error: lastError };
}

export { MODELS, TASK_ROUTING, BANNED_MODELS };
