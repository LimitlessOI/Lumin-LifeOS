/**
 * SYNOPSIS: Provider API-key health — enumerate the AI/LLM/tool keys Railway
 * injects and test each one live so we know which are funded/working and which
 * need a card, without ever exposing a key value.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

// Founder need (2026-07-03): "the system should know what keys are in Railway,
// test which are funded, and give me a payment link for the ones that aren't."
// Railway injects env vars at boot, so process.env on prod IS the live Railway
// env — enumerating it here is the system reporting its own key inventory.
//
// Each provider declares the env var(s) that hold its key, a billing/top-up URL,
// and a `probe` that makes the CHEAPEST possible authenticated call. The probe
// classifies the account into one status. We never return the key itself.

const TIMEOUT_MS = 9000;

// Status vocabulary (kept small + honest):
//   working       - authenticated AND the account can actually run work
//   needs_payment - key is valid but the account is out of credit / unfunded
//   invalid_key   - the key is present but rejected (401/403) — wrong/rotated
//   error         - provider/network error we could not classify (see detail)
//   absent        - no env var set for this provider
export const STATUS = {
  WORKING: 'working',
  NEEDS_PAYMENT: 'needs_payment',
  INVALID_KEY: 'invalid_key',
  ERROR: 'error',
  ABSENT: 'absent',
};

async function timedFetch(url, opts = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: ac.signal });
  } finally {
    clearTimeout(t);
  }
}

// Map an HTTP response + body text to a status. The credit/quota signals differ
// per provider so callers pass the raw body; we look for the common phrases.
function classify(status, bodyText) {
  const b = String(bodyText || '').toLowerCase();
  if (status >= 200 && status < 300) return { status: STATUS.WORKING, http: status };
  if (status === 401 || status === 403) return { status: STATUS.INVALID_KEY, http: status, detail: 'key rejected' };
  if (
    status === 402 ||
    /insufficient|quota|billing|credit|balance|payment|exceeded your current/.test(b)
  ) {
    return { status: STATUS.NEEDS_PAYMENT, http: status, detail: b.slice(0, 160) };
  }
  return { status: STATUS.ERROR, http: status, detail: b.slice(0, 160) };
}

// A minimal 1-token chat completion against an OpenAI-compatible endpoint. This
// is the reliable funding test: a valid-but-unfunded key returns 402/429-quota,
// a funded key returns 200. Models-list GETs do NOT reveal funding, so we spend
// exactly one token instead.
function openAiCompatibleProbe(baseUrl, model) {
  return async (key) => {
    const res = await timedFetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
    });
    return classify(res.status, await res.text());
  };
}

export const PROVIDERS = [
  {
    id: 'openai', label: 'OpenAI', envVars: ['OPENAI_API_KEY'],
    billingUrl: 'https://platform.openai.com/settings/organization/billing/overview',
    probe: openAiCompatibleProbe('https://api.openai.com/v1', 'gpt-4o-mini'),
  },
  {
    id: 'anthropic', label: 'Anthropic (Claude)', envVars: ['ANTHROPIC_API_KEY'],
    billingUrl: 'https://console.anthropic.com/settings/billing',
    probe: async (key) => {
      const res = await timedFetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
      });
      return classify(res.status, await res.text());
    },
  },
  {
    id: 'gemini', label: 'Google Gemini', envVars: ['GEMINI_API_KEY', 'GOOGLE_API_KEY'],
    billingUrl: 'https://aistudio.google.com/app/apikey',
    probe: async (key) => {
      const res = await timedFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }], generationConfig: { maxOutputTokens: 1 } }),
        },
      );
      return classify(res.status, await res.text());
    },
  },
  {
    id: 'groq', label: 'Groq', envVars: ['GROQ_API_KEY'],
    billingUrl: 'https://console.groq.com/settings/billing',
    probe: openAiCompatibleProbe('https://api.groq.com/openai/v1', 'llama-3.1-8b-instant'),
  },
  {
    id: 'cerebras', label: 'Cerebras', envVars: ['CEREBRAS_API_KEY'],
    billingUrl: 'https://cloud.cerebras.ai/',
    probe: openAiCompatibleProbe('https://api.cerebras.ai/v1', 'llama3.1-8b'),
  },
  {
    id: 'perplexity', label: 'Perplexity', envVars: ['PERPLEXITY_API_KEY'],
    billingUrl: 'https://www.perplexity.ai/settings/api',
    probe: openAiCompatibleProbe('https://api.perplexity.ai', 'sonar'),
  },
  {
    id: 'mistral', label: 'Mistral', envVars: ['MISTRAL_API_KEY'],
    billingUrl: 'https://console.mistral.ai/billing/',
    probe: openAiCompatibleProbe('https://api.mistral.ai/v1', 'mistral-small-latest'),
  },
  {
    id: 'deepseek', label: 'DeepSeek', envVars: ['DEEPSEEK_API_KEY'],
    billingUrl: 'https://platform.deepseek.com/top_up',
    probe: openAiCompatibleProbe('https://api.deepseek.com/v1', 'deepseek-chat'),
  },
  {
    id: 'openrouter', label: 'OpenRouter', envVars: ['OPENROUTER_API_KEY'],
    billingUrl: 'https://openrouter.ai/settings/credits',
    probe: openAiCompatibleProbe('https://openrouter.ai/api/v1', 'openai/gpt-4o-mini'),
  },
  {
    id: 'together', label: 'Together AI', envVars: ['TOGETHER_API_KEY'],
    billingUrl: 'https://api.together.xyz/settings/billing',
    probe: openAiCompatibleProbe('https://api.together.xyz/v1', 'meta-llama/Llama-3.2-3B-Instruct-Turbo'),
  },
  {
    id: 'fireworks', label: 'Fireworks AI', envVars: ['FIREWORKS_API_KEY'],
    billingUrl: 'https://fireworks.ai/account/billing',
    probe: openAiCompatibleProbe('https://api.fireworks.ai/inference/v1', 'accounts/fireworks/models/llama-v3p1-8b-instruct'),
  },
  {
    id: 'replicate', label: 'Replicate', envVars: ['REPLICATE_API_TOKEN', 'REPLICATE_API'],
    billingUrl: 'https://replicate.com/account/billing',
    probe: async (key) => {
      const res = await timedFetch('https://api.replicate.com/v1/account', { headers: { authorization: `Bearer ${key}` } });
      return classify(res.status, await res.text());
    },
  },
  {
    id: 'elevenlabs', label: 'ElevenLabs', envVars: ['ELEVENLABS_API_KEY'],
    billingUrl: 'https://elevenlabs.io/app/subscription',
    probe: async (key) => {
      const res = await timedFetch('https://api.elevenlabs.io/v1/user/subscription', { headers: { 'xi-api-key': key } });
      return classify(res.status, await res.text());
    },
  },
  {
    id: 'brave_search', label: 'Brave Search', envVars: ['BRAVE_SEARCH_API_KEY'],
    billingUrl: 'https://api-dashboard.search.brave.com/app/subscriptions',
    probe: async (key) => {
      const res = await timedFetch('https://api.search.brave.com/res/v1/web/search?q=ping', {
        headers: { 'x-subscription-token': key, accept: 'application/json' },
      });
      return classify(res.status, await res.text());
    },
  },
];

function firstPresentEnv(envVars) {
  for (const name of envVars) {
    const v = String(process.env[name] || '').trim();
    if (v.length > 8) return { name, value: v };
  }
  return null;
}

/**
 * Test every known provider whose key is present in the (Railway-injected) env.
 * @param {object} opts
 * @param {boolean} [opts.includeAbsent=true] - include providers with no key set
 * @returns {Promise<{ checked_at, summary, providers }>} — never contains a key value.
 */
export async function checkAllProviders({ includeAbsent = true } = {}) {
  const results = await Promise.all(
    PROVIDERS.map(async (p) => {
      const present = firstPresentEnv(p.envVars);
      const base = { id: p.id, label: p.label, env_var: present?.name || p.envVars[0], billing_url: p.billingUrl };
      if (!present) return { ...base, present: false, status: STATUS.ABSENT };
      try {
        const r = await p.probe(present.value);
        return { ...base, present: true, ...r };
      } catch (e) {
        const aborted = e?.name === 'AbortError';
        return { ...base, present: true, status: STATUS.ERROR, detail: aborted ? 'probe timed out' : String(e.message).slice(0, 160) };
      }
    }),
  );

  const providers = includeAbsent ? results : results.filter((r) => r.present);
  const summary = providers.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  const needs_payment = providers.filter((r) => r.status === STATUS.NEEDS_PAYMENT).map((r) => ({ label: r.label, billing_url: r.billing_url }));

  return { checked_at: new Date().toISOString(), summary, needs_payment, providers };
}
