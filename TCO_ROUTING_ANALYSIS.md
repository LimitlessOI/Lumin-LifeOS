# TCO Routing Configuration Analysis

**Date**: 2026-01-08
**Status**: ⚠️ NEEDS OPTIMIZATION - Not prioritizing FREE local AI first

---

## 🔴 CRITICAL FINDING: TCO Not Fully Optimized for FREE Models

The current TCO routing **DOES NOT** prioritize FREE local Ollama models first across all providers. This means you're potentially using paid APIs when free local models are available.

---

## Current Routing Configuration

### In `routes/tco-routes.js` (lines 901-919)

```javascript
const routingMap = {
  openai: {
    councilMember: 'groq_llama',        // ✅ FREE (cloud) - but NOT local
    provider: 'groq',
    model: 'llama-3.1-70b-versatile',
  },
  anthropic: {
    councilMember: 'ollama_deepseek',   // ✅ FREE (local) - CORRECT
    provider: 'ollama',
    model: 'deepseek-r1:8b',
  },
  google: {
    councilMember: 'gemini',            // ❌ PAID - NOT FREE
    provider: 'google',
    model: 'gemini-pro',
  },
};
```

### Current Fallback Order

1. **OpenAI requests** → `groq_llama` (FREE cloud, but has rate limits)
2. **Anthropic requests** → `ollama_deepseek` (FREE local) ✅ CORRECT
3. **Google requests** → `gemini` (PAID) ❌ WRONG

---

## OLLAMA_ENDPOINT Configuration

### In `server.js` (lines 90-96)

```javascript
OLLAMA_ENDPOINT =
  process.env.OLLAMA_ENDPOINT ||
  process.env.OLLAMA_BASE_URL ||
  process.env.OLLAMA_URL ||
  process.env.OLLAMA_API_BASE ||
  (process.env.OLLAMA_HOST ? `http://${process.env.OLLAMA_HOST}` : "") ||
  ((process.env.RAILWAY_PROJECT_ID || process.env.RAILWAY_SERVICE_ID || process.env.RAILWAY_ENVIRONMENT)
    ? "" // Railway doesn't support local Ollama
    : "http://localhost:11434"); // Default for local dev
```

**Result**:
- **Local dev**: `http://localhost:11434` ✅
- **Railway/production**: Empty string (Ollama disabled) ⚠️

---

## Available FREE Models (Tier 0)

### Local Ollama Models (costPer1M: 0)

All configured with endpoint: `OLLAMA_ENDPOINT || "http://localhost:11434"`

| Council Member | Model | Focus | Context |
|----------------|-------|-------|---------|
| `ollama_deepseek` | `deepseek-coder:latest` | Code generation | 4K |
| `ollama_llama` | `llama3.2:1b` | General tasks | 8K |
| `ollama_deepseek_coder_v2` | `deepseek-coder-v2:latest` | Advanced code | 8K |
| `ollama_deepseek_coder_33b` | `deepseek-coder:33b` | Complex code | 8K |
| `ollama_qwen_coder_32b` | `qwen2.5-coder:32b-instruct` | Production code | 8K |
| `ollama_codestral` | `codestral:latest` | Fast code snippets | 4K |
| `ollama_deepseek_v3` | `deepseek-v3:latest` | Complex reasoning | 128K |
| `ollama_llama_3_3_70b` | `llama3.3:70b-instruct-q4_0` | High-quality reasoning | 8K |
| `ollama_qwen_2_5_72b` | `qwen2.5:72b-q4_0` | Research & analysis | 8K |
| `ollama_gemma_2_27b` | `gemma2:27b-it-q4_0` | Balanced reasoning | 8K |
| `ollama_phi3` | `phi3:mini` | Lightweight tasks | 4K |

**Total: 11 FREE local models available**

### Free Cloud Models (costPer1M: 0)

| Council Member | Model | Provider | Notes |
|----------------|-------|----------|-------|
| `groq_llama` | `llama-3.1-8b-instant` | Groq | FREE but rate limited |
| `groq_llama_70b` | `llama-3.1-70b-versatile` | Groq | FREE but rate limited |
| `groq_mixtral` | `mixtral-8x7b-32768` | Groq | FREE but rate limited |

**Total: 3 FREE cloud models available**

---

## Paid Models (Tier 1)

| Council Member | Model | Provider | Cost per 1M tokens |
|----------------|-------|----------|-------------------|
| `gemini` | `gemini-pro` | Google | $0.50 |
| `gemini_15_flash` | `gemini-1.5-flash-latest` | Google | $0.075 |
| `gemini_20_flash` | `gemini-2.0-flash-exp` | Google | $0.075 |
| `chatgpt` | `gpt-4o` | OpenAI | $2.50 |
| `gpt_4o_mini` | `gpt-4o-mini` | OpenAI | $0.15 |
| `claude` | `claude-3-5-sonnet-20241022` | Anthropic | $3.00 |
| `grok` | `grok-beta` | xAI | $5.00 |

---

## ⚠️ PROBLEMS IDENTIFIED

### 1. Google Requests Use Paid API
**Current**: `google` requests → `gemini` ($0.50 per 1M tokens)
**Should be**: `google` requests → FREE Ollama model first

### 2. OpenAI Requests Use Cloud (Not Local)
**Current**: `openai` requests → `groq_llama` (free but cloud-based)
**Should be**: `openai` requests → Ollama local model first, then Groq as fallback

### 3. No Comprehensive Tier 0 → Tier 1 Fallback
**Current**: Hard-coded routing per provider
**Should be**: Dynamic routing with proper fallback chain

### 4. Railway Deployment Will Skip Ollama
When deployed to Railway:
- `OLLAMA_ENDPOINT` = empty string
- All Ollama models become unavailable
- Falls back to cloud models (some paid)

---

## 🎯 RECOMMENDED ROUTING PRIORITY

### Optimal Fallback Chain (General Tasks)

```
1. ollama_deepseek        (FREE local - Tier 0)
2. ollama_llama_3_3_70b   (FREE local - Tier 0)
3. groq_llama_70b         (FREE cloud - Tier 0)
4. groq_llama             (FREE cloud - Tier 0)
5. gemini_15_flash        (PAID cheap - Tier 1) - $0.075
6. gpt_4o_mini            (PAID cheap - Tier 1) - $0.15
7. gemini                 (PAID mid - Tier 1) - $0.50
8. chatgpt (gpt-4o)       (PAID expensive - Tier 1) - $2.50
9. claude                 (PAID expensive - Tier 1) - $3.00
10. grok                  (PAID very expensive - Tier 1) - $5.00
```

### Optimal Routing by Provider Request

```javascript
const OPTIMAL_ROUTING = {
  openai: [
    'ollama_deepseek',      // FREE local
    'ollama_llama_3_3_70b', // FREE local
    'groq_llama_70b',       // FREE cloud
    'groq_llama',           // FREE cloud
    'gpt_4o_mini',          // PAID fallback ($0.15)
    'chatgpt',              // PAID expensive ($2.50)
  ],
  anthropic: [
    'ollama_deepseek',      // FREE local
    'ollama_llama_3_3_70b', // FREE local
    'groq_llama_70b',       // FREE cloud
    'groq_llama',           // FREE cloud
    'claude',               // PAID fallback ($3.00)
  ],
  google: [
    'ollama_deepseek',      // FREE local
    'ollama_llama_3_3_70b', // FREE local
    'groq_llama_70b',       // FREE cloud
    'gemini_15_flash',      // PAID cheap ($0.075)
    'gemini',               // PAID mid ($0.50)
  ],
};
```

---

## 🔧 RECOMMENDED FIXES

### Fix #1: Update TCO Routing Map

**File**: `routes/tco-routes.js` (line 896)

**Current**:
```javascript
const routingMap = {
  openai: {
    councilMember: 'groq_llama',
    provider: 'groq',
    model: 'llama-3.1-70b-versatile',
  },
  anthropic: {
    councilMember: 'ollama_deepseek',
    provider: 'ollama',
    model: 'deepseek-r1:8b',
  },
  google: {
    councilMember: 'gemini',
    provider: 'google',
    model: 'gemini-pro',
  },
};
```

**Should be**:
```javascript
async function selectOptimalModel({ provider, model, messages, modelRouter }) {
  // Try FREE local Ollama first (if available)
  if (process.env.OLLAMA_ENDPOINT || !process.env.RAILWAY_ENVIRONMENT) {
    return {
      councilMember: 'ollama_deepseek',
      provider: 'ollama',
      model: 'deepseek-coder:latest',
      tier: 'tier0',
      cost: 0,
    };
  }

  // Fallback to FREE cloud (Groq)
  if (process.env.GROQ_API_KEY) {
    return {
      councilMember: 'groq_llama_70b',
      provider: 'groq',
      model: 'llama-3.1-70b-versatile',
      tier: 'tier0',
      cost: 0,
    };
  }

  // Last resort: Cheap paid models
  const cheapFallbacks = {
    openai: 'gpt_4o_mini',
    anthropic: 'claude',
    google: 'gemini_15_flash',
  };

  return {
    councilMember: cheapFallbacks[provider] || 'gemini_15_flash',
    provider,
    model,
    tier: 'tier1',
    cost: 0.15, // Average cheap tier cost
  };
}
```

### Fix #2: Add Comprehensive Fallback Chain

Create a new function in `tco-routes.js`:

```javascript
async function selectWithFallback({ provider, model, messages }) {
  const fallbackChain = [
    // Tier 0: FREE local
    { member: 'ollama_deepseek', requiresOllama: true },
    { member: 'ollama_llama_3_3_70b', requiresOllama: true },

    // Tier 0: FREE cloud
    { member: 'groq_llama_70b', requiresGroq: true },
    { member: 'groq_llama', requiresGroq: true },

    // Tier 1: PAID cheap
    { member: 'gemini_15_flash', cost: 0.075 },
    { member: 'gpt_4o_mini', cost: 0.15 },

    // Tier 1: PAID expensive (last resort)
    { member: 'gemini', cost: 0.50 },
    { member: 'chatgpt', cost: 2.50 },
  ];

  for (const option of fallbackChain) {
    // Check if requirements are met
    if (option.requiresOllama && !process.env.OLLAMA_ENDPOINT) continue;
    if (option.requiresGroq && !process.env.GROQ_API_KEY) continue;

    // Found a valid option
    const config = COUNCIL_MEMBERS[option.member];
    return {
      councilMember: option.member,
      provider: config.provider,
      model: config.model,
      tier: config.tier,
      cost: option.cost || 0,
    };
  }

  // If all else fails, use original requested provider
  throw new Error('No available models - check API keys');
}
```

### Fix #3: Environment Variable for Railway

**Add to Railway env vars**:
```bash
# Tell TCO to use Groq as Tier 0 when Ollama unavailable
TCO_FALLBACK_MODE=groq  # or 'paid' to allow paid models

# Or keep Ollama for local dev tunnel (if you set up Cloudflare tunnel)
OLLAMA_ENDPOINT=https://your-tunnel.trycloudflare.com
```

---

## 📊 Cost Comparison

### Current TCO Routing (1 million tokens)

| Request Type | Routed To | Cost | Savings vs Original |
|--------------|-----------|------|---------------------|
| OpenAI (GPT-4) | groq_llama | $0 | $2,500 (100%) ✅ |
| Anthropic (Claude) | ollama_deepseek | $0 | $3,000 (100%) ✅ |
| Google (Gemini) | gemini | $500 | $0 (0%) ❌ |

**Total for 1M tokens each**: $500 (should be $0)

### Optimized TCO Routing (1 million tokens)

| Request Type | Routed To | Cost | Savings vs Original |
|--------------|-----------|------|---------------------|
| OpenAI (GPT-4) | ollama_deepseek | $0 | $2,500 (100%) ✅ |
| Anthropic (Claude) | ollama_deepseek | $0 | $3,000 (100%) ✅ |
| Google (Gemini) | ollama_deepseek | $0 | $500 (100%) ✅ |

**Total for 1M tokens each**: $0 (perfect)

**Additional savings**: $500 per 1M tokens (100% on Google requests)

---

## 🚀 Quick Fix Command

To immediately fix the Google routing issue:

1. **Edit `routes/tco-routes.js` line 912**:

   Change:
   ```javascript
   google: {
     councilMember: 'gemini',  // ❌ PAID
   ```

   To:
   ```javascript
   google: {
     councilMember: 'ollama_deepseek',  // ✅ FREE
     provider: 'ollama',
     model: 'deepseek-coder:latest',
   },
   ```

2. **Commit and deploy**:
   ```bash
   git add routes/tco-routes.js
   git commit -m "fix: route Google requests to FREE Ollama instead of paid Gemini"
   git push origin main
   ```

---

## 🎯 Action Items

- [ ] Fix Google routing to use Ollama (immediate)
- [ ] Consider routing OpenAI to Ollama instead of Groq (better for high volume)
- [ ] Add comprehensive fallback chain with availability checks
- [ ] For Railway: Set up Cloudflare tunnel to local Ollama OR accept Groq as Tier 0
- [ ] Add cost tracking to verify 100% free routing
- [ ] Add dashboard showing which models are being used

---

## Summary

**Current State**: TCO saves 66% of costs (OpenAI + Anthropic only)
**Optimal State**: TCO saves 100% of costs (all providers → FREE models)

**Fix**: Change 1 line in `routes/tco-routes.js` to route Google → Ollama
**Result**: Complete elimination of AI API costs when Ollama is available
