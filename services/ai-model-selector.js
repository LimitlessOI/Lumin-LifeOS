/**
 * ai-model-selector.js — extracted from server.js
 * Smart model selection, Cloudflare-tunnel detection, Ollama streaming adapter,
 * and model fallback helpers.
 */

import { sanitizeJsonResponse } from '../core/json-sanitizer.js';

// ---------------------------------------------------------------------------
// selectOptimalModel
// ---------------------------------------------------------------------------
export function selectOptimalModel(prompt, taskComplexity = 'medium', { OLLAMA_ENDPOINT } = {}) {
  if (!OLLAMA_ENDPOINT) {
    return null;
  }

  const length = (prompt || "").length;

  if (taskComplexity === "simple" || length < 400) {
    return { member: "ollama_phi3", model: "phi3:mini", reason: "simple_task_free" };
  }

  if (taskComplexity === "medium" || length < 1200) {
    return { member: "ollama_llama", model: "llama3.2:1b", reason: "medium_task_free" };
  }

  return {
    member: "ollama_llama_3_3_70b",
    model: "llama3.3:70b-instruct-q4_0",
    reason: "complex_task_free",
  };
}

// ---------------------------------------------------------------------------
// getModelSize
// ---------------------------------------------------------------------------
export function getModelSize(modelName) {
  if (!modelName) return 'small';
  const model = (modelName || '').toLowerCase();

  const smallModels = ['llama3.2:1b', 'llama3.2:3b', 'phi3:mini', 'phi3', 'tinyllama', 'gemma:2b', '1b', '3b'];
  const mediumModels = ['llama3.1:8b', 'mistral:7b', 'deepseek-coder:6.7b', 'codellama:7b', 'gemma:7b', '7b', '8b'];
  const largeModels = ['deepseek-coder:33b', 'qwen2.5-coder:32b', 'llama3.1:70b', 'deepseek-coder-v2', 'codestral', 'deepseek-v3', '32b', '33b', '70b'];

  if (smallModels.some(m => model.includes(m))) return 'small';
  if (largeModels.some(m => model.includes(m))) return 'large';
  if (mediumModels.some(m => model.includes(m))) return 'medium';

  // Default for Ollama (usually small)
  if (model.includes('ollama')) return 'small';

  // Premium models are usually large
  if (model.includes('gpt-4') || model.includes('gpt4') || model.includes('claude') || model.includes('gemini-pro')) return 'large';

  return 'medium';
}

// ---------------------------------------------------------------------------
// isCloudflareTunnel
// ---------------------------------------------------------------------------
export function isCloudflareTunnel(endpoint) {
  return endpoint && (endpoint.includes('trycloudflare.com') || endpoint.includes('cloudflare'));
}

// ---------------------------------------------------------------------------
// callOllamaWithStreaming
// ---------------------------------------------------------------------------
export async function callOllamaWithStreaming(endpoint, model, prompt, options = {}) {
  const {
    maxTokens = 4096,
    temperature = 0.7,
    timeout = 120000,
  } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${endpoint}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: true, // Always stream for tunnel endpoints
        options: {
          temperature,
          num_predict: maxTokens,
        },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama HTTP ${response.status}: ${await response.text().catch(() => 'Unknown error')}`);
    }

    // Stream and aggregate response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let promptEvalCount = 0;
    let evalCount = 0;
    let modelName = model;
    let done = false;
    let buffer = ''; // Buffer for partial JSON lines across chunks

    while (!done) {
      const { done: streamDone, value } = await reader.read();
      if (streamDone) {
        // Process any remaining buffer
        if (buffer.trim()) {
          try {
            const sanitized = sanitizeJsonResponse(buffer.trim());
            const data = JSON.parse(sanitized);
            if (data.response) fullText += data.response;
            if (data.prompt_eval_count !== undefined) promptEvalCount = data.prompt_eval_count;
            if (data.eval_count !== undefined) evalCount = data.eval_count;
            if (data.model) modelName = data.model;
          } catch (e) {
            // Ignore parse errors in final buffer
            console.warn(`⚠️ [OLLAMA STREAM] Failed to parse final buffer: ${e.message}`);
          }
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
          const sanitized = sanitizeJsonResponse(trimmed);
          const data = JSON.parse(sanitized);

          // Accumulate response text
          if (data.response !== undefined) {
            fullText += data.response;
          }

          // Update metadata (last chunk has final values)
          if (data.prompt_eval_count !== undefined) {
            promptEvalCount = data.prompt_eval_count;
          }
          if (data.eval_count !== undefined) {
            evalCount = data.eval_count;
          }
          if (data.model) {
            modelName = data.model;
          }

          // Check if stream is done
          if (data.done === true) {
            done = true;
            // Final chunk has all metadata - use it
            if (data.prompt_eval_count !== undefined) promptEvalCount = data.prompt_eval_count;
            if (data.eval_count !== undefined) evalCount = data.eval_count;
            break;
          }
        } catch (e) {
          // Skip invalid JSON - might be partial line that will be completed in next chunk
          // Only log if it's clearly not a partial line
          if (trimmed.length > 10 && !trimmed.startsWith('{')) {
            console.warn(`⚠️ [OLLAMA STREAM] Skipping invalid JSON line: ${trimmed.substring(0, 50)}...`);
          }
        }
      }
    }

    clearTimeout(timeoutId);

    // Return same shape as non-streaming response (matches Ollama API format)
    return {
      model: modelName,
      response: fullText,
      done: true,
      prompt_eval_count: promptEvalCount,
      eval_count: evalCount,
      total_duration: 0, // Not available in streaming
      load_duration: 0,
      eval_duration: 0,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Ollama request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// getModelSizeCategory
// ---------------------------------------------------------------------------
export function getModelSizeCategory(modelName) {
  const name = (modelName || '').toLowerCase();
  if (name.includes('70b') || name.includes('72b') || name.includes('120b')) return 'xlarge';
  if (name.includes('33b') || name.includes('32b') || name.includes('30b')) return 'large';
  if (name.includes('7b') || name.includes('8b') || name.includes('13b')) return 'medium';
  return 'small';
}

// ---------------------------------------------------------------------------
// getSmallerOllamaModel
// ---------------------------------------------------------------------------
export function getSmallerOllamaModel(currentModel, currentMember, { COUNCIL_MEMBERS } = {}) {
  const size = getModelSizeCategory(currentModel);

  // Fallback chain: xlarge -> large -> medium -> small
  const fallbacks = {
    xlarge: ['ollama_qwen_coder_32b', 'ollama_deepseek_coder_33b', 'ollama_deepseek_coder_v2', 'ollama_deepseek'],
    large: ['ollama_deepseek_coder_v2', 'ollama_deepseek', 'ollama_llama'],
    medium: ['ollama_llama', 'ollama_phi3'],
    small: ['ollama_phi3'],
  };

  const chain = fallbacks[size] || fallbacks.medium;

  // Find first available fallback
  for (const memberKey of chain) {
    if (memberKey !== currentMember && COUNCIL_MEMBERS[memberKey]) {
      return { member: memberKey, model: COUNCIL_MEMBERS[memberKey].model };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// getOllamaFallbackModel
// ---------------------------------------------------------------------------
export function getOllamaFallbackModel(requestedMember, taskType = 'general', { OLLAMA_ENDPOINT, COUNCIL_MEMBERS, OLLAMA_MODEL_ALIASES } = {}) {
  // Check if Ollama is available
  if (!OLLAMA_ENDPOINT) {
    return null;
  }

  const requestedConfig = COUNCIL_MEMBERS[requestedMember];
  const requestedModel = requestedConfig?.model;

  // First, try direct member alias mapping
  if (OLLAMA_MODEL_ALIASES[requestedMember]) {
    const aliasModel = OLLAMA_MODEL_ALIASES[requestedMember];
    // Find Ollama member that uses this alias model
    for (const [memberKey, memberConfig] of Object.entries(COUNCIL_MEMBERS)) {
      if (memberConfig.provider === 'ollama' && memberConfig.model === aliasModel) {
        return memberKey;
      }
    }
  }

  // Try to map requested model to Ollama alias
  if (requestedModel && OLLAMA_MODEL_ALIASES[requestedModel]) {
    const aliasModel = OLLAMA_MODEL_ALIASES[requestedModel];
    // Find Ollama member that uses this alias model
    for (const [memberKey, memberConfig] of Object.entries(COUNCIL_MEMBERS)) {
      if (memberConfig.provider === 'ollama' && memberConfig.model === aliasModel) {
        return memberKey;
      }
    }
  }

  // Task-based fallback selection
  const taskTypeLower = (taskType || '').toLowerCase();
  if (taskTypeLower.includes('code') || taskTypeLower.includes('development') ||
      taskTypeLower.includes('infrastructure') || taskTypeLower.includes('revenue_generation')) {
    // Prefer code models for code/development/revenue tasks
    if (COUNCIL_MEMBERS.ollama_deepseek_coder_v2) return 'ollama_deepseek_coder_v2';
    if (COUNCIL_MEMBERS.ollama_deepseek) return 'ollama_deepseek';
    if (COUNCIL_MEMBERS.ollama_qwen_coder_32b) return 'ollama_qwen_coder_32b';
    if (COUNCIL_MEMBERS.ollama_deepseek_coder_33b) return 'ollama_deepseek_coder_33b';
  }

  // Default fallback order (general tasks)
  if (COUNCIL_MEMBERS.ollama_llama) return 'ollama_llama';
  if (COUNCIL_MEMBERS.ollama_deepseek) return 'ollama_deepseek';
  if (COUNCIL_MEMBERS.ollama_phi3) return 'ollama_phi3';

  // Last resort: any Ollama model
  for (const [memberKey, memberConfig] of Object.entries(COUNCIL_MEMBERS)) {
    if (memberConfig.provider === 'ollama' || memberKey.startsWith('ollama_')) {
      return memberKey;
    }
  }

  return null;
}
