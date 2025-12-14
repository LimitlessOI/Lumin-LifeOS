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
      stream = false,
    } = options;

    if (!model) {
      throw new Error('Model name required for Ollama');
    }

    try {
      const response = await fetch(`${this.endpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream,
          options: {
            num_predict: maxTokens,
            temperature,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status}`);
      }

      if (stream) {
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

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.response) {
            fullText += data.response;
          }
          if (data.done) {
            return {
              text: fullText,
              usage: {
                prompt_tokens: data.prompt_eval_count || 0,
                completion_tokens: data.eval_count || 0,
                total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
              },
            };
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
    }

    return { text: fullText, usage: {} };
  }

  getCostEstimate(prompt, options = {}) {
    // Ollama is free (local)
    return 0;
  }
}

export default OllamaAdapter;
