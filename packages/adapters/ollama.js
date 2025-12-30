/**
 * Ollama Adapter
 * Handles communication with local Ollama models
 */

export class OllamaAdapter {
  constructor(endpoint = 'http://localhost:11434') {
    this.endpoint = endpoint;
    this.name = 'ollama';
  }

  get capabilities() {
    return [
      'reasoning',
      'instruction_following',
      'code_generation',
      'vision',
      'embeddings',
    ];
  }

  async isAvailable() {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`);
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async call(prompt, options = {}) {
    const {
      model,
      maxTokens = 4096,
      temperature = 0.7,
      stream = null, // null = auto-detect
    } = options;

    if (!model) {
      throw new Error('Model name required for Ollama');
    }

    // Auto-detect Cloudflare tunnel and force streaming
    const isTunnel = this.endpoint.includes('trycloudflare.com') || this.endpoint.includes('cloudflare');
    const useStreaming = stream !== null ? stream : isTunnel;

    try {
      const response = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: useStreaming,
          options: {
            num_predict: maxTokens,
            temperature,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status}`);
      }

      if (useStreaming) {
        // Handle streaming response
        return this.handleStream(response);
      }

      const data = await response.json();
      return {
        text: data.response || '',
        usage: {
          prompt_tokens: data.prompt_eval_count || 0,
          completion_tokens: data.eval_count || 0,
          total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
        },
      };
    } catch (error) {
      throw new Error(`Ollama call failed: ${error.message}`);
    }
  }

  async handleStream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let promptEvalCount = 0;
    let evalCount = 0;
    let buffer = ''; // Buffer for partial JSON lines across chunks

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        // Process any remaining buffer
        if (buffer.trim()) {
          try {
            const data = JSON.parse(buffer.trim());
            if (data.response !== undefined) fullText += data.response;
            if (data.prompt_eval_count !== undefined) promptEvalCount = data.prompt_eval_count;
            if (data.eval_count !== undefined) evalCount = data.eval_count;
          } catch (e) {
            // Ignore parse errors in final buffer
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
          const data = JSON.parse(trimmed);
          if (data.response !== undefined) {
            fullText += data.response;
          }
          if (data.prompt_eval_count !== undefined) {
            promptEvalCount = data.prompt_eval_count;
          }
          if (data.eval_count !== undefined) {
            evalCount = data.eval_count;
          }
          if (data.done === true) {
            // Final chunk - use its metadata
            if (data.prompt_eval_count !== undefined) promptEvalCount = data.prompt_eval_count;
            if (data.eval_count !== undefined) evalCount = data.eval_count;
            return {
              text: fullText,
              usage: {
                prompt_tokens: promptEvalCount,
                completion_tokens: evalCount,
                total_tokens: promptEvalCount + evalCount,
              },
            };
          }
        } catch (e) {
          // Skip invalid JSON - might be partial line that will be completed in next chunk
        }
      }
    }

    return {
      text: fullText,
      usage: {
        prompt_tokens: promptEvalCount,
        completion_tokens: evalCount,
        total_tokens: promptEvalCount + evalCount,
      },
    };
  }

  getCostEstimate(prompt, options = {}) {
    // Ollama is free (local)
    return 0;
  }
}

export default OllamaAdapter;
