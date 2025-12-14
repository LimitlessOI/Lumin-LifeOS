/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║              OPEN SOURCE COUNCIL ROUTER (OSC)                                    ║
 * ║              Specialization-Based Routing & Consensus System                     ║
 * ║              Routes tasks to best models, implements consensus voting            ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 * 
 * This router intelligently routes tasks to specialized open source models
 * and implements consensus voting for complex/critical tasks.
 */

/**
 * Model Specialization Matrix
 * Maps task types to primary and backup models
 */
const MODEL_SPECIALIZATION_MATRIX = {
  code_generation: {
    primary: ["ollama_deepseek_coder_v2", "ollama_deepseek_coder_33b"],
    backup: ["ollama_qwen_coder_32b", "ollama_codestral", "ollama_deepseek"],
    description: "Code generation tasks",
  },
  code_review: {
    primary: ["ollama_deepseek_coder_v2", "ollama_deepseek_coder_33b"],
    backup: ["ollama_codestral", "ollama_deepseek"],
    description: "Code review and analysis",
  },
  complex_reasoning: {
    primary: ["ollama_deepseek_v3", "ollama_llama_3_3_70b"],
    backup: ["ollama_qwen_2_5_72b", "ollama_gemma_2_27b"],
    description: "Complex reasoning and strategic decisions",
  },
  math_research: {
    primary: ["ollama_deepseek_v3", "ollama_qwen_2_5_72b"],
    backup: ["ollama_llama_3_3_70b", "ollama_gemma_2_27b"],
    description: "Mathematical tasks and research",
  },
  quick_tasks: {
    primary: ["ollama_llama", "ollama_phi3"],
    backup: ["ollama_codestral"],
    description: "Quick, simple tasks",
  },
  fast_code: {
    primary: ["ollama_codestral", "ollama_phi3"],
    backup: ["ollama_deepseek_coder_v2"],
    description: "Fast code snippets and quick code tasks",
  },
  general: {
    primary: ["ollama_llama", "ollama_gemma_2_27b"],
    backup: ["ollama_phi3", "ollama_llama_3_3_70b"],
    description: "General purpose tasks",
  },
};

/**
 * Task Type Detection
 * Analyzes prompt to determine task type
 */
function detectTaskType(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  // Code-related keywords
  const codeKeywords = [
    "code", "function", "class", "algorithm", "implement", "debug",
    "refactor", "review code", "write code", "generate code",
    "programming", "syntax", "api", "endpoint", "database query",
  ];
  
  // Reasoning keywords
  const reasoningKeywords = [
    "analyze", "reason", "strategy", "decision", "evaluate",
    "complex", "solve", "plan", "design", "architecture",
  ];
  
  // Math/research keywords
  const mathKeywords = [
    "calculate", "math", "mathematical", "research", "study",
    "analyze data", "statistics", "formula", "equation",
  ];
  
  // Quick task indicators
  const quickKeywords = [
    "quick", "simple", "brief", "short", "summarize",
    "monitor", "check", "status",
  ];
  
  // Count matches
  const codeMatches = codeKeywords.filter(kw => lowerPrompt.includes(kw)).length;
  const reasoningMatches = reasoningKeywords.filter(kw => lowerPrompt.includes(kw)).length;
  const mathMatches = mathKeywords.filter(kw => lowerPrompt.includes(kw)).length;
  const quickMatches = quickKeywords.filter(kw => lowerPrompt.includes(kw)).length;
  
  // Determine task type
  if (codeMatches >= 2 || lowerPrompt.includes("code review")) {
    return lowerPrompt.includes("review") ? "code_review" : "code_generation";
  }
  
  if (mathMatches >= 2) {
    return "math_research";
  }
  
  if (reasoningMatches >= 2) {
    return "complex_reasoning";
  }
  
  if (quickMatches >= 2 || prompt.length < 200) {
    return "quick_tasks";
  }
  
  if (codeMatches === 1 && prompt.length < 500) {
    return "fast_code";
  }
  
  return "general";
}

/**
 * Model Health Monitor
 * Tracks model availability and performance
 */
class ModelHealthMonitor {
  constructor() {
    this.healthStatus = new Map(); // Map<modelKey, {available: bool, lastCheck: timestamp, failures: number}>
    this.responseTimes = new Map(); // Map<modelKey, [responseTimes]>
    this.maxFailures = 3; // Mark as unavailable after 3 consecutive failures
    this.healthCheckInterval = 5 * 60 * 1000; // Check every 5 minutes
  }
  
  /**
   * Check if model is available
   */
  isAvailable(modelKey, COUNCIL_MEMBERS) {
    const status = this.healthStatus.get(modelKey);
    if (!status) return true; // Assume available if not checked yet
    
    // If too many failures, mark as unavailable
    if (status.failures >= this.maxFailures) {
      const timeSinceLastCheck = Date.now() - status.lastCheck;
      // Retry after 10 minutes
      if (timeSinceLastCheck > 10 * 60 * 1000) {
        // Reset failures for retry
        this.healthStatus.set(modelKey, {
          available: true,
          lastCheck: Date.now(),
          failures: 0,
        });
        return true;
      }
      return false;
    }
    
    return status.available !== false;
  }
  
  /**
   * Record successful response
   */
  recordSuccess(modelKey, responseTime) {
    const status = this.healthStatus.get(modelKey) || {
      available: true,
      lastCheck: Date.now(),
      failures: 0,
    };
    
    status.available = true;
    status.lastCheck = Date.now();
    status.failures = 0;
    this.healthStatus.set(modelKey, status);
    
    // Track response time
    if (!this.responseTimes.has(modelKey)) {
      this.responseTimes.set(modelKey, []);
    }
    const times = this.responseTimes.get(modelKey);
    times.push(responseTime);
    // Keep only last 10 response times
    if (times.length > 10) {
      times.shift();
    }
  }
  
  /**
   * Record failure
   */
  recordFailure(modelKey) {
    const status = this.healthStatus.get(modelKey) || {
      available: true,
      lastCheck: Date.now(),
      failures: 0,
    };
    
    status.failures = (status.failures || 0) + 1;
    status.lastCheck = Date.now();
    
    if (status.failures >= this.maxFailures) {
      status.available = false;
      console.warn(`⚠️ [OSC] Model ${modelKey} marked as unavailable after ${status.failures} failures`);
    }
    
    this.healthStatus.set(modelKey, status);
  }
  
  /**
   * Get average response time for model
   */
  getAverageResponseTime(modelKey) {
    const times = this.responseTimes.get(modelKey);
    if (!times || times.length === 0) return null;
    
    const sum = times.reduce((a, b) => a + b, 0);
    return sum / times.length;
  }
  
  /**
   * Get health status for all models
   */
  getStatus() {
    const status = {};
    for (const [modelKey, health] of this.healthStatus.entries()) {
      status[modelKey] = {
        available: health.available,
        failures: health.failures,
        avgResponseTime: this.getAverageResponseTime(modelKey),
        lastCheck: new Date(health.lastCheck).toISOString(),
      };
    }
    return status;
  }
}

/**
 * Open Source Council Router
 */
export class OpenSourceCouncil {
  constructor(callCouncilMember, COUNCIL_MEMBERS, providerCooldowns) {
    this.callCouncilMember = callCouncilMember;
    this.COUNCIL_MEMBERS = COUNCIL_MEMBERS;
    this.providerCooldowns = providerCooldowns;
    this.healthMonitor = new ModelHealthMonitor();
  }
  
  /**
   * Route task to best model(s) based on specialization
   */
  async routeTask(prompt, options = {}) {
    const {
      taskType = null, // Override auto-detection
      requireConsensus = false, // Require consensus voting
      consensusThreshold = 2, // Number of models for consensus
      complexity = "medium", // "simple", "medium", "complex", "critical"
    } = options;
    
    // Detect task type if not provided
    const detectedType = taskType || detectTaskType(prompt);
    
    // Get specialization config
    const specialization = MODEL_SPECIALIZATION_MATRIX[detectedType] || MODEL_SPECIALIZATION_MATRIX.general;
    
    // Determine if consensus is needed
    const needsConsensus = requireConsensus || 
                          complexity === "complex" || 
                          complexity === "critical" ||
                          prompt.length > 2000;
    
    if (needsConsensus) {
      return await this.executeWithConsensus(prompt, specialization, consensusThreshold, options);
    } else {
      return await this.executeSingle(prompt, specialization, options);
    }
  }
  
  /**
   * Execute with single model (simple tasks)
   */
  async executeSingle(prompt, specialization, options) {
    const models = [...specialization.primary, ...specialization.backup];
    const availableModels = this.filterAvailableModels(models);
    
    if (availableModels.length === 0) {
      throw new Error(`No available models for task type: ${specialization.description}`);
    }
    
    // Try primary models first
    for (const modelKey of availableModels) {
      try {
        const startTime = Date.now();
        const response = await this.callCouncilMember(modelKey, prompt, options);
        const responseTime = Date.now() - startTime;
        
        this.healthMonitor.recordSuccess(modelKey, responseTime);
        
        return {
          success: true,
          response,
          model: modelKey,
          taskType: specialization.description,
          responseTime,
          consensus: false,
        };
      } catch (error) {
        console.warn(`⚠️ [OSC] ${modelKey} failed: ${error.message}`);
        this.healthMonitor.recordFailure(modelKey);
        continue;
      }
    }
    
    throw new Error(`All models failed for task type: ${specialization.description}`);
  }
  
  /**
   * Execute with consensus voting (complex/critical tasks)
   */
  async executeWithConsensus(prompt, specialization, consensusThreshold, options) {
    const models = [...specialization.primary, ...specialization.backup];
    const availableModels = this.filterAvailableModels(models);
    
    if (availableModels.length === 0) {
      throw new Error(`No available models for consensus: ${specialization.description}`);
    }
    
    // Select models for consensus (prefer primary, use backup if needed)
    const consensusModels = availableModels.slice(0, Math.max(consensusThreshold, 2));
    
    console.log(`🔄 [OSC] Executing consensus with ${consensusModels.length} models: ${consensusModels.join(", ")}`);
    
    // Execute all models in parallel
    const startTime = Date.now();
    const promises = consensusModels.map(async (modelKey) => {
      try {
        const modelStartTime = Date.now();
        const response = await this.callCouncilMember(modelKey, prompt, options);
        const modelResponseTime = Date.now() - modelStartTime;
        
        this.healthMonitor.recordSuccess(modelKey, modelResponseTime);
        
        return {
          model: modelKey,
          response,
          success: true,
          responseTime: modelResponseTime,
        };
      } catch (error) {
        this.healthMonitor.recordFailure(modelKey);
        return {
          model: modelKey,
          response: null,
          success: false,
          error: error.message,
        };
      }
    });
    
    const results = await Promise.all(promises);
    const successfulResults = results.filter(r => r.success);
    
    if (successfulResults.length === 0) {
      throw new Error(`All consensus models failed for task type: ${specialization.description}`);
    }
    
    // If only one successful, return it
    if (successfulResults.length === 1) {
      return {
        success: true,
        response: successfulResults[0].response,
        model: successfulResults[0].model,
        taskType: specialization.description,
        responseTime: Date.now() - startTime,
        consensus: false, // Not true consensus, but best we can do
        consensusResults: results,
      };
    }
    
    // Analyze consensus
    const consensus = this.analyzeConsensus(successfulResults);
    
    return {
      success: true,
      response: consensus.finalResponse,
      model: consensus.winningModel,
      taskType: specialization.description,
      responseTime: Date.now() - startTime,
      consensus: true,
      consensusResults: results,
      consensusAnalysis: consensus.analysis,
    };
  }
  
  /**
   * Analyze consensus results and determine best response
   */
  analyzeConsensus(results) {
    const successful = results.filter(r => r.success);
    
    if (successful.length === 1) {
      return {
        finalResponse: successful[0].response,
        winningModel: successful[0].model,
        analysis: "Single successful response",
      };
    }
    
    // Simple consensus: use longest/most detailed response
    // (More sophisticated: semantic similarity, voting, etc.)
    let bestResponse = successful[0];
    let maxLength = successful[0].response.length;
    
    for (const result of successful) {
      if (result.response.length > maxLength) {
        maxLength = result.response.length;
        bestResponse = result;
      }
    }
    
    // Check for agreement (simple: similar length and content overlap)
    const responses = successful.map(r => r.response.toLowerCase());
    const avgLength = responses.reduce((sum, r) => sum + r.length, 0) / responses.length;
    const lengthVariance = responses.reduce((sum, r) => sum + Math.abs(r.length - avgLength), 0) / responses.length;
    const isConsistent = lengthVariance < avgLength * 0.3; // Within 30% variance
    
    return {
      finalResponse: bestResponse.response,
      winningModel: bestResponse.model,
      analysis: {
        totalModels: successful.length,
        isConsistent,
        avgResponseLength: Math.round(avgLength),
        selectedModel: bestResponse.model,
        reason: isConsistent ? "Consistent responses, selected most detailed" : "Selected most detailed response",
      },
    };
  }
  
  /**
   * Filter models to only available ones
   */
  filterAvailableModels(modelKeys) {
    const now = Date.now();
    
    return modelKeys.filter((modelKey) => {
      // Check if model exists in COUNCIL_MEMBERS
      if (!this.COUNCIL_MEMBERS[modelKey]) {
        return false;
      }
      
      // Check cooldown
      const retryAt = this.providerCooldowns.get(modelKey) || 0;
      if (now < retryAt) {
        return false;
      }
      
      // Check health monitor
      if (!this.healthMonitor.isAvailable(modelKey, this.COUNCIL_MEMBERS)) {
        return false;
      }
      
      return true;
    });
  }
  
  /**
   * Get router status
   */
  getStatus() {
    return {
      healthMonitor: this.healthMonitor.getStatus(),
      specializations: Object.keys(MODEL_SPECIALIZATION_MATRIX),
      availableModels: Object.keys(this.COUNCIL_MEMBERS).filter(key => {
        const member = this.COUNCIL_MEMBERS[key];
        return member.tier === "tier0" && (member.isFree || member.isLocal);
      }),
    };
  }
}



