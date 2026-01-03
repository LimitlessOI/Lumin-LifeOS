/**
 * MODEL ROUTER - Anti-Hallucination Edition
 * 
 * CRITICAL: phi3:mini is BANNED from code generation
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
