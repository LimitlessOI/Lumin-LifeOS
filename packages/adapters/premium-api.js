/**
 * Premium API Adapter
 * Handles premium API providers (OpenAI, Anthropic, Google, etc.)
 * WITH ROI GATING - only calls when ROI > threshold
 */

export class PremiumAPIAdapter {
  constructor(provider, config) {
    this.provider = provider; // 'openai', 'anthropic', 'google', 'xai'
    this.config = config;
    this.name = `premium-${provider}`;
    this.roiThreshold = config.roi_required || 5.0;
  }

  get capabilities() {
    const base = ['reasoning', 'instruction_following'];
    
    if (this.provider === 'openai' || this.provider === 'google') {
      base.push('vision', 'multimodal');
    }
    
    if (this.provider === 'openai') {
      base.push('code_generation');
    }

    return base;
  }

  async isAvailable() {
    // Check if API key is configured
    const keyName = this.getApiKeyName();
    return !!process.env[keyName];
  }

  getApiKeyName() {
    const keys = {
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      google: 'GEMINI_API_KEY',
      xai: 'GROK_API_KEY',
    };
    return keys[this.provider] || '';
  }

  /**
   * Check if call should be allowed based on ROI
   */
  async shouldCall(estimatedValue, estimatedCost) {
    if (estimatedCost === 0) return true; // Free calls always allowed
    
    const roi = estimatedValue / estimatedCost;
    
    if (roi < this.roiThreshold) {
      console.warn(`🚫 [PREMIUM] Blocked ${this.provider} call: ROI ${roi.toFixed(2)}x < ${this.roiThreshold}x threshold`);
      return false;
    }

    console.log(`✅ [PREMIUM] Allowed ${this.provider} call: ROI ${roi.toFixed(2)}x >= ${this.roiThreshold}x threshold`);
    return true;
  }

  async call(prompt, options = {}) {
    const {
      estimatedValue = 0,
      estimatedCost = 0,
      maxTokens = 4096,
      temperature = 0.7,
    } = options;

    // ROI gate check
    const allowed = await this.shouldCall(estimatedValue, estimatedCost);
    if (!allowed) {
      throw new Error(`Premium call blocked: ROI ${(estimatedValue / estimatedCost).toFixed(2)}x < ${this.roiThreshold}x threshold`);
    }

    // Route to appropriate provider
    switch (this.provider) {
      case 'openai':
        return this.callOpenAI(prompt, options);
      case 'anthropic':
        return this.callAnthropic(prompt, options);
      case 'google':
        return this.callGoogle(prompt, options);
      case 'xai':
        return this.callXAI(prompt, options);
      default:
        throw new Error(`Unknown provider: ${this.provider}`);
    }
  }

  async callOpenAI(prompt, options) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: options.maxTokens,
        temperature: options.temperature,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      text: data.choices[0]?.message?.content || '',
      usage: data.usage || {},
    };
  }

  async callAnthropic(prompt, options) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: options.model || 'claude-3-5-sonnet-20241022',
        max_tokens: options.maxTokens,
        messages: [
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      text: data.content[0]?.text || '',
      usage: data.usage || {},
    };
  }

  async callGoogle(prompt, options) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${options.model || 'gemini-2.5-pro'}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: options.maxTokens,
            temperature: options.temperature,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Google API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      text: data.candidates[0]?.content?.parts[0]?.text || '',
      usage: {},
    };
  }

  async callXAI(prompt, options) {
    // X.AI API implementation (placeholder)
    throw new Error('X.AI adapter not yet implemented');
  }

  getCostEstimate(prompt, options = {}) {
    // Estimate based on token count and provider pricing
    const estimatedTokens = Math.ceil(prompt.length / 4) + (options.maxTokens || 4096);
    
    const pricing = {
      openai: { input: 0.0025, output: 0.01 }, // gpt-4o
      anthropic: { input: 0.003, output: 0.015 }, // claude-3-5-sonnet
      google: { input: 0.0001, output: 0.0004 }, // gemini-2.5-pro
    };

    const price = pricing[this.provider];
    if (!price) return 0;

    const inputTokens = Math.ceil(prompt.length / 4);
    const outputTokens = options.maxTokens || 4096;

    return (inputTokens * price.input + outputTokens * price.output) / 1000;
  }
}

export default PremiumAPIAdapter;
