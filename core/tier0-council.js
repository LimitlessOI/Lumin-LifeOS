/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    TIER 0: OPEN-SOURCE COUNCIL (OSC)                              ║
 * ║                    Free/Low-Cost AI Workers                                     ║
 * ║                    Cost: $0 - $0.05 per million tokens                         ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 * 
 * This is the "worker" tier - thousands of cheap AI drones that do the bulk work.
 * Premium council only validates/corrects their output.
 */

// No imports needed - Pool passed in constructor

const TIER0_MODELS = {
  // Local Ollama models (FREE)
  ollama_llama: {
    name: "Llama 3.2 1B",
    endpoint: process.env.OLLAMA_ENDPOINT || "http://localhost:11434",
    model: "llama3.2:1b",
    cost: 0,
    provider: "ollama",
  },
  ollama_deepseek: {
    name: "DeepSeek Coder (Local)",
    endpoint: process.env.OLLAMA_ENDPOINT || "http://localhost:11434",
    model: "deepseek-coder:latest",
    cost: 0,
    provider: "ollama",
  },
  ollama_phi: {
    name: "Phi-3 Mini",
    endpoint: process.env.OLLAMA_ENDPOINT || "http://localhost:11434",
    model: "phi3:mini",
    cost: 0,
    provider: "ollama",
  },
  // Cheap cloud models
  deepseek_cloud: {
    name: "DeepSeek Cloud",
    endpoint: "https://api.deepseek.com/v1/chat/completions",
    model: "deepseek-chat",
    cost: 0.0001, // $0.10 per million tokens
    provider: "deepseek",
    apiKey: process.env.DEEPSEEK_API_KEY,
  },
  gemini_flash: {
    name: "Gemini Flash",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
    model: "gemini-1.5-flash",
    cost: 0.0001, // $0.10 per million tokens
    provider: "google",
    apiKey: process.env.GEMINI_API_KEY || process.env.LIFEOS_GEMINI_KEY,
  },
};

// Drone types for specialized tasks
const DRONE_TYPES = {
  research: {
    models: ['ollama_llama', 'gemini_flash'],
    description: 'Research and data gathering',
  },
  code: {
    models: ['ollama_deepseek', 'deepseek_cloud'],
    description: 'Code generation and analysis',
  },
  analysis: {
    models: ['ollama_phi', 'gemini_flash'],
    description: 'Data analysis and summarization',
  },
  translation: {
    models: ['ollama_llama', 'gemini_flash'],
    description: 'Language translation and conversion',
  },
  monitoring: {
    models: ['ollama_phi'],
    description: 'System monitoring and alerts',
  },
};

export class Tier0Council {
  constructor(pool) {
    this.pool = pool;
    this.activeDrones = new Map();
    this.droneQueue = [];
  }

  /**
   * Execute task with Tier 0 (cheapest) models
   * Returns result or null if needs escalation
   */
  async execute(task, options = {}) {
    const {
      taskType = 'general',
      riskLevel = 'low',
      userFacing = false,
      maxCost = 0.001, // Max $0.001 for Tier 0
    } = options;

    // Select appropriate drone type
    const droneType = DRONE_TYPES[taskType] || DRONE_TYPES.research;
    const selectedModel = droneType.models[0]; // Start with cheapest

    try {
      const result = await this.callTier0Model(selectedModel, task, options);
      
      // Quick validation
      const isValid = await this.validateOutput(result, task, options);
      
      if (isValid) {
        return {
          success: true,
          result,
          tier: 0,
          model: selectedModel,
          cost: this.estimateCost(selectedModel, result),
        };
      }

      // Try next model in drone type
      if (droneType.models.length > 1) {
        const nextModel = droneType.models[1];
        const result2 = await this.callTier0Model(nextModel, task, options);
        const isValid2 = await this.validateOutput(result2, task, options);
        
        if (isValid2) {
          return {
            success: true,
            result: result2,
            tier: 0,
            model: nextModel,
            cost: this.estimateCost(nextModel, result2),
          };
        }
      }

      // Needs escalation to Tier 1
      return {
        success: false,
        needsEscalation: true,
        reason: 'Tier 0 validation failed',
        tier0Attempts: [result],
      };
    } catch (error) {
      return {
        success: false,
        needsEscalation: true,
        reason: error.message,
        error,
      };
    }
  }

  async callTier0Model(modelKey, task, options) {
    const model = TIER0_MODELS[modelKey];
    if (!model) {
      throw new Error(`Tier 0 model not found: ${modelKey}`);
    }

    // Compress task to MICRO format for cost savings
    const microTask = this.compressToMicro(task, options);

    if (model.provider === 'ollama') {
      return await this.callOllama(model, microTask);
    } else if (model.provider === 'deepseek') {
      return await this.callDeepSeek(model, microTask);
    } else if (model.provider === 'google') {
      return await this.callGemini(model, microTask);
    }

    throw new Error(`Unsupported Tier 0 provider: ${model.provider}`);
  }

  async callOllama(model, prompt) {
    try {
      const response = await fetch(`${model.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model.model,
          prompt: prompt,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status}`);
      }

      const data = await response.json();
      return data.response || '';
    } catch (error) {
      console.warn(`Ollama unavailable: ${error.message}`);
      throw error;
    }
  }

  async callDeepSeek(model, prompt) {
    if (!model.apiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    try {
      const response = await fetch(model.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.apiKey}`,
        },
        body: JSON.stringify({
          model: model.model,
          messages: [
            { role: 'system', content: 'You are a helpful assistant. Respond concisely in MICRO format when possible.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 2048,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      console.warn(`DeepSeek unavailable: ${error.message}`);
      throw error;
    }
  }

  async callGemini(model, prompt) {
    if (!model.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    try {
      const url = `${model.endpoint}?key=${model.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.7,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini error: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } catch (error) {
      console.warn(`Gemini Flash unavailable: ${error.message}`);
      throw error;
    }
  }

  /**
   * Compress task to MICRO format for massive token savings
   */
  compressToMicro(task, options) {
    // Basic MICRO compression - replace common phrases
    let micro = String(task);
    
    const microDict = {
      'check blind spots': '~cbs~',
      'generate ideas': '~gen~',
      'analyze': '~a~',
      'propose': '~p~',
      'evaluate': '~e~',
      'ROI': '~roi~',
      'monetization': '~mon~',
      'revenue': '~rev~',
      'cost': '~cost~',
      'risk': '~risk~',
    };

    for (const [full, microToken] of Object.entries(microDict)) {
      micro = micro.replace(new RegExp(full, 'gi'), microToken);
    }

    return micro;
  }

  /**
   * Quick validation - does output look reasonable?
   */
  async validateOutput(output, originalTask, options) {
    if (!output || output.length < 10) {
      return false; // Too short
    }

    // Basic sanity checks
    if (output.includes('ERROR') || output.includes('FAILED')) {
      return false;
    }

    // Check if output seems to address the task
    const taskKeywords = originalTask.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const outputLower = output.toLowerCase();
    const matches = taskKeywords.filter(kw => outputLower.includes(kw)).length;
    
    // If less than 30% keyword match, probably not relevant
    if (matches / taskKeywords.length < 0.3) {
      return false;
    }

    return true;
  }

  estimateCost(modelKey, output) {
    const model = TIER0_MODELS[modelKey];
    if (!model) return 0;

    // Estimate tokens (rough: 4 chars per token)
    const tokens = Math.ceil(output.length / 4);
    return (tokens / 1000000) * model.cost;
  }

  /**
   * Deploy a specialized drone for a task type
   */
  async deployDrone(droneType, task) {
    const droneId = `t0_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    
    const drone = {
      id: droneId,
      type: droneType,
      task,
      status: 'active',
      deployedAt: new Date(),
    };

    this.activeDrones.set(droneId, drone);

    // Execute in background
    this.executeDroneTask(droneId, task).catch(err => {
      console.error(`Drone ${droneId} error:`, err.message);
      drone.status = 'failed';
    });

    return droneId;
  }

  async executeDroneTask(droneId, task) {
    const drone = this.activeDrones.get(droneId);
    if (!drone) return;

    try {
      const result = await this.execute(task, { taskType: drone.type });
      drone.result = result;
      drone.status = 'completed';
      drone.completedAt = new Date();
    } catch (error) {
      drone.status = 'failed';
      drone.error = error.message;
    }
  }

  getStatus() {
    return {
      activeDrones: this.activeDrones.size,
      availableModels: Object.keys(TIER0_MODELS).length,
      droneTypes: Object.keys(DRONE_TYPES),
    };
  }
}
