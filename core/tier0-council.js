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

import crypto from 'crypto';

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
  // Code Generation Specialists
  ollama_deepseek_coder_v2: {
    name: "DeepSeek Coder V2",
    endpoint: process.env.OLLAMA_ENDPOINT || "http://localhost:11434",
    model: "deepseek-coder-v2:latest",
    cost: 0,
    provider: "ollama",
  },
  ollama_deepseek_coder_33b: {
    name: "DeepSeek Coder 33B",
    endpoint: process.env.OLLAMA_ENDPOINT || "http://localhost:11434",
    model: "deepseek-coder:33b",
    cost: 0,
    provider: "ollama",
  },
  ollama_qwen_coder_32b: {
    name: "Qwen2.5-Coder-32B",
    endpoint: process.env.OLLAMA_ENDPOINT || "http://localhost:11434",
    model: "qwen2.5-coder:32b-instruct",
    cost: 0,
    provider: "ollama",
  },
  ollama_codestral: {
    name: "Mistral Codestral 25.01",
    endpoint: process.env.OLLAMA_ENDPOINT || "http://localhost:11434",
    model: "codestral:latest",
    cost: 0,
    provider: "ollama",
  },
  // Reasoning & Analysis Specialists
  ollama_deepseek_v3: {
    name: "DeepSeek V3",
    endpoint: process.env.OLLAMA_ENDPOINT || "http://localhost:11434",
    model: "deepseek-v3:latest",
    cost: 0,
    provider: "ollama",
  },
  ollama_llama_3_3_70b: {
    name: "Llama 3.3 70B",
    endpoint: process.env.OLLAMA_ENDPOINT || "http://localhost:11434",
    model: "llama3.3:70b-instruct-q4_0",
    cost: 0,
    provider: "ollama",
  },
  ollama_qwen_2_5_72b: {
    name: "Qwen 2.5 72B",
    endpoint: process.env.OLLAMA_ENDPOINT || "http://localhost:11434",
    model: "qwen2.5:72b-q4_0",
    cost: 0,
    provider: "ollama",
  },
  ollama_gemma_2_27b: {
    name: "Gemma 2 27B",
    endpoint: process.env.OLLAMA_ENDPOINT || "http://localhost:11434",
    model: "gemma2:27b-it-q4_0",
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
    models: ['ollama_qwen_2_5_72b', 'ollama_llama_3_3_70b', 'ollama_llama', 'gemini_flash'],
    description: 'Research and data gathering',
  },
  code: {
    models: ['ollama_deepseek_coder_v2', 'ollama_deepseek_coder_33b', 'ollama_qwen_coder_32b', 'ollama_deepseek', 'deepseek_cloud'],
    description: 'Code generation and analysis',
  },
  code_review: {
    models: ['ollama_deepseek_coder_v2', 'ollama_deepseek_coder_33b', 'ollama_codestral'],
    description: 'Code review and debugging',
  },
  fast_code: {
    models: ['ollama_codestral', 'ollama_phi', 'ollama_deepseek'],
    description: 'Fast code snippets and quick code tasks',
  },
  reasoning: {
    models: ['ollama_deepseek_v3', 'ollama_llama_3_3_70b', 'ollama_qwen_2_5_72b', 'ollama_gemma_2_27b'],
    description: 'Complex reasoning and strategic decisions',
  },
  math: {
    models: ['ollama_deepseek_v3', 'ollama_qwen_2_5_72b', 'ollama_llama_3_3_70b'],
    description: 'Mathematical tasks and calculations',
  },
  analysis: {
    models: ['ollama_gemma_2_27b', 'ollama_llama_3_3_70b', 'ollama_phi', 'gemini_flash'],
    description: 'Data analysis and summarization',
  },
  translation: {
    models: ['ollama_qwen_2_5_72b', 'ollama_llama_3_3_70b', 'ollama_llama', 'gemini_flash'],
    description: 'Language translation and conversion',
  },
  monitoring: {
    models: ['ollama_phi', 'ollama_llama'],
    description: 'System monitoring and alerts',
  },
  quick: {
    models: ['ollama_llama', 'ollama_phi', 'ollama_codestral'],
    description: 'Quick, simple tasks',
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
   * 
   * OPTIMIZATION: Checks Neon cache first (FREE responses!)
   */
  async execute(task, options = {}) {
    const {
      taskType = 'general',
      riskLevel = 'low',
      userFacing = false,
      maxCost = 0.001, // Max $0.001 for Tier 0
      useCache = true, // Check Neon cache first
    } = options;

    // STEP 1: Check Neon cache (FREE if found!)
    if (useCache && this.pool) {
      try {
        const cacheKey = this.generateCacheKey(task);
        const cached = await this.pool.query(
          `SELECT response_text, model_used, cost_saved, hit_count 
           FROM ai_response_cache 
           WHERE prompt_hash = $1 
           AND created_at > NOW() - INTERVAL '30 days'
           ORDER BY last_used_at DESC
           LIMIT 1`,
          [cacheKey]
        );

        if (cached.rows.length > 0) {
          // Update hit count and last used
          await this.pool.query(
            `UPDATE ai_response_cache 
             SET hit_count = hit_count + 1, 
                 last_used_at = NOW() 
             WHERE prompt_hash = $1`,
            [cacheKey]
          );

          console.log(`💰 [NEON CACHE HIT] Free response! (saved $${cached.rows[0].cost_saved || 0})`);
          return {
            success: true,
            result: cached.rows[0].response_text,
            tier: 0,
            model: cached.rows[0].model_used || 'cached',
            cost: 0, // FREE from cache!
            cached: true,
          };
        }
      } catch (error) {
        console.warn(`⚠️ Cache check failed: ${error.message}`);
        // Continue to normal execution
      }
    }

    // STEP 2: Try Tier 0 models (Ollama = FREE, cloud = cheap)
    const droneType = DRONE_TYPES[taskType] || DRONE_TYPES.research;
    const selectedModel = droneType.models[0]; // Start with cheapest

    try {
      const result = await this.callTier0Model(selectedModel, task, options);
      
      // Quick validation
      const isValid = await this.validateOutput(result, task, options);
      
      if (isValid) {
        const cost = this.estimateCost(selectedModel, result);
        
        // Store in Neon cache for future FREE responses
        if (this.pool && useCache) {
          await this.storeInCache(task, result, selectedModel, cost).catch(err => {
            console.warn(`⚠️ Failed to cache response: ${err.message}`);
          });
        }

        return {
          success: true,
          result,
          tier: 0,
          model: selectedModel,
          cost,
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
      const endpoint = model.endpoint || 'http://localhost:11434';
      const isTunnel = endpoint.includes('trycloudflare.com') || endpoint.includes('cloudflare');
      
      let data;
      
      if (isTunnel) {
        // Use streaming for Cloudflare tunnels to prevent 524 timeouts
        const response = await fetch(`${endpoint}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: model.model,
            prompt: prompt,
            stream: true,
          }),
        });

        if (!response.ok) {
          throw new Error(`Ollama error: ${response.status}`);
        }

        // Stream and aggregate (handle partial JSON across chunks)
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = ''; // Buffer for partial JSON lines

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            // Process any remaining buffer
            if (buffer.trim()) {
              try {
                const json = JSON.parse(buffer.trim());
                if (json.response) fullText += json.response;
                data = { response: fullText };
              } catch (e) {
                // Ignore parse errors in final buffer
                data = { response: fullText };
              }
            } else {
              data = { response: fullText };
            }
            break;
          }

          // Decode chunk and add to buffer
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Process complete lines (ending with \n)
          const lines = buffer.split('\n');
          // Keep the last incomplete line in buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            try {
              const json = JSON.parse(trimmed);
              if (json.response !== undefined) {
                fullText += json.response;
              }
              if (json.done === true) {
                data = { response: fullText };
                break;
              }
            } catch (e) {
              // Skip invalid JSON - might be partial line
            }
          }
          if (data) break;
        }
      } else {
        // Non-tunnel: use regular fetch
        const response = await fetch(`${endpoint}/api/generate`, {
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

        data = await response.json();
      }

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
   * Generate cache key from task (semantic hash)
   */
  generateCacheKey(task) {
    // Simple hash for now - can upgrade to semantic embedding later
    // crypto is now imported at the top of the file
    const normalized = String(task).toLowerCase().trim().replace(/\s+/g, ' ');
    return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 32);
  }

  /**
   * Store response in Neon cache for future FREE responses
   */
  async storeInCache(prompt, response, model, costSaved) {
    if (!this.pool) return;

    const cacheKey = this.generateCacheKey(prompt);
    const promptText = String(prompt).substring(0, 1000); // Limit length
    const responseText = String(response).substring(0, 10000); // Limit length

    try {
      await this.pool.query(
        `INSERT INTO ai_response_cache 
         (prompt_hash, prompt_text, response_text, model_used, cost_saved, created_at, last_used_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (prompt_hash) 
         DO UPDATE SET 
           response_text = $3,
           model_used = $4,
           cost_saved = $5,
           last_used_at = NOW()`,
        [cacheKey, promptText, responseText, model, costSaved]
      );
    } catch (error) {
      // Table might not exist yet - that's okay
      if (error.message.includes('does not exist')) {
        console.warn('⚠️ Cache table not created yet. Run database migration.');
      } else {
        throw error;
      }
    }
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

  /**
   * Process improvement ideas from AI employees
   * Deduplicates and votes on which are worthy
   */
  async processImprovementIdeas(improvements, vote) {
    console.log(`🔄 [TIER0] Processing ${improvements.length} improvement ideas`);

    // Store all improvements
    const stored = [];
    for (const idea of improvements) {
      try {
        const result = await this.pool.query(
          `INSERT INTO tier0_improvement_ideas
           (idea_text, category, impact, effort, reasoning, source_vote, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT (idea_text) DO NOTHING
           RETURNING idea_id`,
          [
            idea.improvement,
            idea.category,
            idea.impact,
            idea.effort,
            idea.reasoning,
            vote.vote,
          ]
        );
        if (result.rows.length > 0) {
          stored.push({ ...idea, id: result.rows[0].idea_id });
        }
      } catch (error) {
        console.warn('Failed to store improvement idea:', error.message);
      }
    }

    // Deduplicate using semantic similarity
    const deduplicated = await this.deduplicateIdeas(stored);

    // Council votes on which are worthy
    const worthy = await this.voteOnIdeas(deduplicated);

    // Only pass worthy ideas to Tier 1
    if (worthy.length > 0) {
      await this.escalateWorthyIdeas(worthy);
    }

    return {
      received: improvements.length,
      stored: stored.length,
      deduplicated: deduplicated.length,
      worthy: worthy.length,
    };
  }

  /**
   * Deduplicate ideas using semantic similarity
   */
  async deduplicateIdeas(ideas) {
    if (ideas.length <= 1) return ideas;

    const deduplicated = [];
    const seen = new Set();

    for (const idea of ideas) {
      // Simple deduplication: check for similar text
      const normalized = idea.improvement.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .substring(0, 100);

      // Check if we've seen something similar
      let isDuplicate = false;
      for (const seenText of seen) {
        const similarity = this.calculateSimilarity(normalized, seenText);
        if (similarity > 0.8) {
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        seen.add(normalized);
        deduplicated.push(idea);
      }
    }

    return deduplicated;
  }

  calculateSimilarity(str1, str2) {
    // Simple Jaccard similarity
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Tier 0 council votes on which ideas are worthy
   */
  async voteOnIdeas(ideas) {
    if (ideas.length === 0) return [];

    const prompt = `Vote on these improvement ideas. Only pass ones that are truly worthy:

${ideas.slice(0, 20).map((idea, i) => 
  `${i + 1}. ${idea.improvement}\n   Impact: ${idea.impact}, Effort: ${idea.effort}`
).join('\n\n')}

Return JSON array of indices (0-based) that are WORTHY of escalation:
{
  "worthy_indices": [0, 2, 5],
  "reasoning": "Why these are worthy"
}`;

    try {
      const response = await this.execute(prompt, {
        taskType: 'voting',
        maxTokens: 1000,
      });

      const result = this.parseVoteResponse(response);
      const worthy = result.worthy_indices
        .filter(idx => idx >= 0 && idx < ideas.length)
        .map(idx => ideas[idx]);

      return worthy;
    } catch (error) {
      console.warn('Voting failed, keeping all:', error.message);
      // If voting fails, keep high-impact ideas
      return ideas.filter(i => i.impact === 'high');
    }
  }

  parseVoteResponse(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      // Fallback
    }

    // Fallback: extract numbers
    const indices = [];
    const matches = response.match(/\d+/g);
    if (matches) {
      indices.push(...matches.map(m => parseInt(m) - 1)); // Convert to 0-based
    }

    return {
      worthy_indices: indices,
      reasoning: 'Parsed from response',
    };
  }

  /**
   * Escalate worthy ideas to Tier 1 for final approval
   */
  async escalateWorthyIdeas(ideas) {
    // Store in database for Tier 1 to process
    for (const idea of ideas) {
      try {
        await this.pool.query(
          `INSERT INTO tier1_pending_ideas
           (idea_text, category, impact, effort, reasoning, source_tier, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())
           ON CONFLICT DO NOTHING`,
          [
            idea.improvement,
            idea.category,
            idea.impact,
            idea.effort,
            idea.reasoning,
            'tier0',
          ]
        );
      } catch (error) {
        console.warn('Failed to escalate idea:', error.message);
      }
    }

    console.log(`📤 [TIER0] Escalated ${ideas.length} worthy ideas to Tier 1`);
  }

  getStatus() {
    return {
      activeDrones: this.activeDrones.size,
      availableModels: Object.keys(TIER0_MODELS).length,
      droneTypes: Object.keys(DRONE_TYPES),
    };
  }
}
