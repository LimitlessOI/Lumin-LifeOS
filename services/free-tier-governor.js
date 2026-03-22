/**
 * services/free-tier-governor.js
 * Governs usage of free-tier AI providers so we never go over limits.
 *
 * Priority chain (all free, in order):
 *   1. Groq           — 14,400 req/day, 30 RPM
 *   2. Gemini Flash   — 1,500 req/day, 15 RPM, 1M tokens/day
 *   3. Cerebras       — 1,000 req/day (conservative), 30 RPM
 *   4. OpenRouter     — 200 req/day (free models only, conservative)
 *   5. Mistral        — 500 req/day (conservative)
 *   6. Ollama         — unlimited (local, always last)
 *
 * Rules:
 *  - Track daily requests + tokens per provider (resets at midnight UTC)
 *  - On 429 from any provider → mark it exhausted for the rest of the day
 *  - When daily cap is 90% used → skip to next provider (safety buffer)
 *  - Ollama is always the final fallback — unlimited but slowest
 *  - Never call a paid provider (MAX_DAILY_SPEND=$0 enforced elsewhere)
 *
 * Exports: createFreeTierGovernor() → { canUse, record, markExhausted, getStatus, getNextAvailable }
 */

import fs from 'fs/promises';
import path from 'path';

const STATE_FILE = path.join(process.cwd(), 'data', 'free-tier-usage.json');

// Daily limits — set 10% below actual free limit as safety buffer
const PROVIDER_LIMITS = {
  groq: {
    dailyRequests: 13000,   // actual: 14,400 — buffer: 1,400
    rpm: 28,                 // actual: 30 — buffer: 2
    dailyTokens: null,       // no token limit on Groq free
    councilMembers: ['groq_llama', 'groq_deepseek', 'groq'],
    label: 'Groq',
  },
  gemini: {
    dailyRequests: 1350,    // actual: 1,500 — buffer: 150
    rpm: 13,                 // actual: 15 — buffer: 2
    dailyTokens: 900000,    // actual: 1,000,000 — buffer: 100k
    councilMembers: ['gemini', 'gemini_flash', 'gemini-2.0-flash'],
    label: 'Gemini Flash',
  },
  cerebras: {
    dailyRequests: 900,     // actual: ~1,000 — conservative
    rpm: 28,
    dailyTokens: null,
    councilMembers: ['cerebras', 'cerebras_llama'],
    label: 'Cerebras',
  },
  openrouter: {
    dailyRequests: 180,     // actual: ~200 for free models — conservative
    rpm: 10,
    dailyTokens: null,
    councilMembers: ['openrouter', 'openrouter_free'],
    label: 'OpenRouter (free)',
  },
  mistral: {
    dailyRequests: 450,     // actual: ~500 — conservative
    rpm: 8,
    dailyTokens: null,
    councilMembers: ['mistral', 'mistral_free'],
    label: 'Mistral (free)',
  },
  together: {
    dailyRequests: 900,     // conservative buffer for free/shared usage
    rpm: 15,
    dailyTokens: null,
    councilMembers: ['together', 'together_free'],
    label: 'Together (free/shared)',
  },
  ollama: {
    dailyRequests: null,    // unlimited — local
    rpm: null,
    dailyTokens: null,
    councilMembers: ['ollama_deepseek', 'ollama_llama', 'ollama_phi3', 'ollama_deepseek_coder_v2', 'ollama_qwen', 'ollama_gemma'],
    label: 'Ollama (local)',
  },
};

// Ordered priority — first available wins
export const PROVIDER_PRIORITY = ['groq', 'gemini', 'cerebras', 'openrouter', 'mistral', 'together', 'ollama'];

// Build reverse map: councilMember → providerKey
const MEMBER_TO_PROVIDER = {};
for (const [key, config] of Object.entries(PROVIDER_LIMITS)) {
  for (const member of config.councilMembers) {
    MEMBER_TO_PROVIDER[member] = key;
  }
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

function emptyState() {
  const today = todayUTC();
  const state = { date: today, providers: {} };
  for (const key of PROVIDER_PRIORITY) {
    state.providers[key] = {
      requests: 0,
      tokens: 0,
      exhaustedAt: null,   // ISO timestamp if manually marked exhausted
      last429At: null,     // ISO timestamp of last 429 response
    };
  }
  return state;
}

async function loadState() {
  try {
    const raw = await fs.readFile(STATE_FILE, 'utf-8');
    const state = JSON.parse(raw);
    // Reset if it's a new day
    if (state.date !== todayUTC()) {
      console.log(`[FREE-TIER] New day (${todayUTC()}) — resetting all provider usage counters`);
      return emptyState();
    }
    return state;
  } catch {
    return emptyState();
  }
}

async function saveState(state) {
  try {
    await fs.mkdir(path.dirname(STATE_FILE), { recursive: true });
    await fs.writeFile(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.warn(`[FREE-TIER] Could not save usage state: ${err.message}`);
  }
}

export function createFreeTierGovernor() {
  // In-memory state — loaded from disk on first use
  let state = null;
  let lastRpmCheck = {}; // providerKey → { count, windowStart }

  async function getState() {
    if (!state || state.date !== todayUTC()) {
      state = await loadState();
    }
    return state;
  }

  // ── RPM rate limiter (in-memory sliding window) ─────────────────────────────
  function checkRpm(providerKey) {
    const limit = PROVIDER_LIMITS[providerKey];
    if (!limit.rpm) return true; // no RPM limit (Ollama)

    const now = Date.now();
    const window = lastRpmCheck[providerKey] || { count: 0, windowStart: now };

    // Reset window if 60s has passed
    if (now - window.windowStart > 60000) {
      lastRpmCheck[providerKey] = { count: 1, windowStart: now };
      return true;
    }

    if (window.count >= limit.rpm) {
      console.log(`⏱️  [FREE-TIER] ${providerKey} RPM limit hit (${window.count}/${limit.rpm})`);
      return false;
    }

    window.count++;
    lastRpmCheck[providerKey] = window;
    return true;
  }

  // ── Can we use this provider right now? ────────────────────────────────────
  async function canUse(providerKey) {
    const s = await getState();
    const limits = PROVIDER_LIMITS[providerKey];
    if (!limits) return false;

    // Ollama — always available (unlimited)
    if (providerKey === 'ollama') return true;

    const usage = s.providers[providerKey];

    // Check if manually exhausted today
    if (usage.exhaustedAt) {
      console.log(`🚫 [FREE-TIER] ${limits.label} exhausted for today — skip`);
      return false;
    }

    // Check daily request cap (90% threshold = safety buffer)
    if (limits.dailyRequests !== null) {
      const cap = Math.floor(limits.dailyRequests * 0.9); // 90% of our already-buffered limit
      if (usage.requests >= cap) {
        console.log(`📊 [FREE-TIER] ${limits.label} at ${usage.requests}/${limits.dailyRequests} req — skip`);
        return false;
      }
    }

    // Check daily token cap
    if (limits.dailyTokens !== null && usage.tokens >= limits.dailyTokens * 0.9) {
      console.log(`📊 [FREE-TIER] ${limits.label} token limit approached (${usage.tokens}/${limits.dailyTokens}) — skip`);
      return false;
    }

    // Check RPM
    if (!checkRpm(providerKey)) return false;

    return true;
  }

  // ── Record a completed call ─────────────────────────────────────────────────
  async function record(providerKey, tokensUsed = 0) {
    const s = await getState();
    if (!s.providers[providerKey]) return;

    s.providers[providerKey].requests += 1;
    s.providers[providerKey].tokens += tokensUsed;

    const limits = PROVIDER_LIMITS[providerKey];
    if (limits?.dailyRequests) {
      const pct = Math.round((s.providers[providerKey].requests / limits.dailyRequests) * 100);
      if (pct >= 80) {
        console.log(`⚠️  [FREE-TIER] ${limits.label} at ${pct}% daily limit (${s.providers[providerKey].requests}/${limits.dailyRequests})`);
      }
    }

    await saveState(s);
  }

  // ── Mark provider as exhausted (on 429 or explicit call) ───────────────────
  async function markExhausted(providerKey, reason = '429') {
    const s = await getState();
    if (!s.providers[providerKey]) return;

    s.providers[providerKey].exhaustedAt = new Date().toISOString();
    s.providers[providerKey].last429At = reason === '429' ? new Date().toISOString() : s.providers[providerKey].last429At;

    const limits = PROVIDER_LIMITS[providerKey];
    console.log(`🔴 [FREE-TIER] ${limits?.label || providerKey} marked exhausted (${reason}) — will skip for rest of day`);

    await saveState(s);
  }

  // ── Resolve a council member name to its provider key ──────────────────────
  function resolveProvider(councilMemberName) {
    // Direct match
    if (MEMBER_TO_PROVIDER[councilMemberName]) return MEMBER_TO_PROVIDER[councilMemberName];
    // Prefix match (e.g. 'groq_anything' → 'groq')
    for (const key of PROVIDER_PRIORITY) {
      if (councilMemberName.startsWith(key)) return key;
    }
    // Ollama prefix
    if (councilMemberName.startsWith('ollama_') || councilMemberName === 'ollama') return 'ollama';
    return null;
  }

  // ── Get next available provider in priority chain ──────────────────────────
  async function getNextAvailable(excludeProviders = []) {
    for (const providerKey of PROVIDER_PRIORITY) {
      if (excludeProviders.includes(providerKey)) continue;
      if (await canUse(providerKey)) return providerKey;
    }
    return 'ollama'; // always last resort
  }

  // ── Check + record in one call (use before/after AI calls) ─────────────────
  async function checkAndRecord(councilMemberName, tokensUsed = 0) {
    const providerKey = resolveProvider(councilMemberName);
    if (!providerKey) return { allowed: true }; // unknown provider — don't block

    const allowed = await canUse(providerKey);
    if (allowed) await record(providerKey, tokensUsed);
    return { allowed, providerKey };
  }

  // ── Handle 429 error from a provider ───────────────────────────────────────
  async function on429(councilMemberName) {
    const providerKey = resolveProvider(councilMemberName);
    if (providerKey) await markExhausted(providerKey, '429');
  }

  // ── Status dashboard ────────────────────────────────────────────────────────
  async function getStatus() {
    const s = await getState();
    const status = { date: s.date, providers: {} };

    for (const key of PROVIDER_PRIORITY) {
      const limits = PROVIDER_LIMITS[key];
      const usage = s.providers[key] || { requests: 0, tokens: 0 };
      const available = await canUse(key);

      status.providers[key] = {
        label: limits.label,
        available,
        exhausted: !!usage.exhaustedAt,
        requests: {
          used: usage.requests,
          limit: limits.dailyRequests,
          pct: limits.dailyRequests
            ? Math.round((usage.requests / limits.dailyRequests) * 100)
            : null,
        },
        tokens: {
          used: usage.tokens,
          limit: limits.dailyTokens,
          pct: limits.dailyTokens
            ? Math.round((usage.tokens / limits.dailyTokens) * 100)
            : null,
        },
        rpm: limits.rpm,
        last429: usage.last429At,
      };
    }

    return status;
  }

  return {
    canUse,
    record,
    markExhausted,
    on429,
    checkAndRecord,
    getNextAvailable,
    getStatus,
    resolveProvider,
    PROVIDER_PRIORITY,
    PROVIDER_LIMITS,
  };
}
