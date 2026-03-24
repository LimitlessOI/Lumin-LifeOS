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
 *   6. Together       — 900 req/day (conservative)
 *   7. Ollama         — unlimited (local, always last)
 *
 * Rules:
 *  - Track daily requests + tokens per provider (resets at midnight UTC)
 *  - On 429 from any provider → mark it exhausted for the rest of the day
 *  - When daily cap is 90% used → skip to next provider (safety buffer)
 *  - Ollama is always the final fallback — unlimited but slowest
 *  - State stored in Neon (free_tier_usage table) — survives Railway deploys
 *
 * Exports: createFreeTierGovernor({ pool? }) → { canUse, record, markExhausted, getStatus, ... }
 */

// Daily limits — set 10% below actual free limit as safety buffer
const PROVIDER_LIMITS = {
  groq: {
    dailyRequests: 13000,   // actual: 14,400 — buffer: 1,400
    rpm: 28,                 // actual: 30 — buffer: 2
    dailyTokens: null,
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
    dailyRequests: 900,
    rpm: 28,
    dailyTokens: null,
    councilMembers: ['cerebras', 'cerebras_llama'],
    label: 'Cerebras',
  },
  openrouter: {
    dailyRequests: 180,
    rpm: 10,
    dailyTokens: null,
    councilMembers: ['openrouter', 'openrouter_free'],
    label: 'OpenRouter (free)',
  },
  mistral: {
    dailyRequests: 450,
    rpm: 8,
    dailyTokens: null,
    councilMembers: ['mistral', 'mistral_free'],
    label: 'Mistral (free)',
  },
  together: {
    dailyRequests: 900,
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

function emptyProviderState() {
  return { requests: 0, tokens: 0, exhaustedAt: null, last429At: null };
}

export function createFreeTierGovernor({ pool = null } = {}) {
  // In-memory cache of today's state — refreshed from Neon on day change
  let cachedDate = null;
  let cachedState = null; // { [providerKey]: { requests, tokens, exhaustedAt, last429At } }
  let _loadPromise = null; // mutex — prevents concurrent Neon loads logging "New day" N times

  // RPM sliding window — in-memory only (per-minute, no need to persist)
  const lastRpmCheck = {}; // providerKey → { count, windowStart }

  // ── Neon persistence ───────────────────────────────────────────────────────

  async function ensureSchema() {
    if (!pool) return;
    await pool.query(`
      CREATE TABLE IF NOT EXISTS free_tier_usage (
        id            BIGSERIAL PRIMARY KEY,
        date          DATE NOT NULL,
        provider_key  TEXT NOT NULL,
        requests      INTEGER NOT NULL DEFAULT 0,
        tokens        BIGINT  NOT NULL DEFAULT 0,
        exhausted_at  TIMESTAMPTZ,
        last_429_at   TIMESTAMPTZ,
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (date, provider_key)
      )
    `).catch(() => {}); // non-fatal if migration already ran
  }

  async function loadFromNeon(date) {
    if (!pool) return null;
    try {
      const { rows } = await pool.query(
        `SELECT provider_key, requests, tokens, exhausted_at, last_429_at
         FROM free_tier_usage WHERE date = $1`,
        [date]
      );
      const state = {};
      for (const row of rows) {
        state[row.provider_key] = {
          requests: row.requests,
          tokens: Number(row.tokens),
          exhaustedAt: row.exhausted_at ? row.exhausted_at.toISOString() : null,
          last429At: row.last_429_at ? row.last_429_at.toISOString() : null,
        };
      }
      return state;
    } catch {
      return null;
    }
  }

  async function upsertNeon(providerKey, { requestsDelta = 0, tokensDelta = 0, exhaustedAt = undefined, last429At = undefined } = {}) {
    if (!pool) return;
    try {
      // Use explicit table-qualified column references to avoid ambiguity in ON CONFLICT DO UPDATE
      await pool.query(
        `INSERT INTO free_tier_usage (date, provider_key, requests, tokens)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (date, provider_key) DO UPDATE SET
           requests     = free_tier_usage.requests + $3,
           tokens       = free_tier_usage.tokens   + $4,
           exhausted_at = CASE WHEN $5::timestamptz IS NOT NULL THEN $5::timestamptz ELSE free_tier_usage.exhausted_at END,
           last_429_at  = CASE WHEN $6::timestamptz IS NOT NULL THEN $6::timestamptz ELSE free_tier_usage.last_429_at  END,
           updated_at   = NOW()`,
        [
          todayUTC(),
          providerKey,
          requestsDelta,
          tokensDelta,
          exhaustedAt ?? null,
          last429At   ?? null,
        ]
      );
    } catch (err) {
      console.warn(`[FREE-TIER] Neon write failed: ${err.message}`);
    }
  }

  // ── State management ───────────────────────────────────────────────────────

  async function getState() {
    const today = todayUTC();

    // Return cached if same day
    if (cachedDate === today && cachedState) return cachedState;

    // Mutex: if a load is already in flight, wait for it instead of firing another
    if (_loadPromise) return _loadPromise;

    _loadPromise = (async () => {
      const neonState = await loadFromNeon(today);
      cachedDate = today;
      cachedState = {};
      for (const key of PROVIDER_PRIORITY) {
        cachedState[key] = neonState?.[key] || emptyProviderState();
      }
      if (neonState && Object.keys(neonState).length === 0) {
        console.log(`[FREE-TIER] New day (${today}) — fresh counters`);
      }
      return cachedState;
    })().finally(() => { _loadPromise = null; });

    return _loadPromise;
  }

  function patchCache(providerKey, patch) {
    if (cachedState?.[providerKey]) {
      Object.assign(cachedState[providerKey], patch);
    }
  }

  // ── RPM rate limiter (in-memory sliding window) ────────────────────────────

  function checkRpm(providerKey) {
    const limit = PROVIDER_LIMITS[providerKey];
    if (!limit?.rpm) return true; // no RPM limit (Ollama)

    const now = Date.now();
    const window = lastRpmCheck[providerKey] || { count: 0, windowStart: now };

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

  // ── Public API ─────────────────────────────────────────────────────────────

  async function canUse(providerKey) {
    const limits = PROVIDER_LIMITS[providerKey];
    if (!limits) return false;
    if (providerKey === 'ollama') return true; // always available

    const s = await getState();
    const usage = s[providerKey];

    if (usage.exhaustedAt) {
      console.log(`🚫 [FREE-TIER] ${limits.label} exhausted for today — skip`);
      return false;
    }

    if (limits.dailyRequests !== null) {
      const cap = Math.floor(limits.dailyRequests * 0.9);
      if (usage.requests >= cap) {
        console.log(`📊 [FREE-TIER] ${limits.label} at ${usage.requests}/${limits.dailyRequests} req — skip`);
        return false;
      }
    }

    if (limits.dailyTokens !== null && usage.tokens >= limits.dailyTokens * 0.9) {
      console.log(`📊 [FREE-TIER] ${limits.label} token limit approached (${usage.tokens}/${limits.dailyTokens}) — skip`);
      return false;
    }

    if (!checkRpm(providerKey)) return false;

    return true;
  }

  async function record(providerKey, tokensUsed = 0) {
    const s = await getState();
    if (!s[providerKey]) return;

    // Update in-memory cache immediately
    patchCache(providerKey, {
      requests: s[providerKey].requests + 1,
      tokens: s[providerKey].tokens + tokensUsed,
    });

    // Persist to Neon async (don't await — never block the AI call)
    upsertNeon(providerKey, { requestsDelta: 1, tokensDelta: tokensUsed });

    const limits = PROVIDER_LIMITS[providerKey];
    const updated = cachedState[providerKey];
    if (limits?.dailyRequests) {
      const pct = Math.round((updated.requests / limits.dailyRequests) * 100);
      if (pct >= 80) {
        console.log(`⚠️  [FREE-TIER] ${limits.label} at ${pct}% daily limit (${updated.requests}/${limits.dailyRequests})`);
      }
    }
  }

  async function markExhausted(providerKey, reason = '429') {
    const s = await getState();
    if (!s[providerKey]) return;

    const now = new Date().toISOString();
    const patch = { exhaustedAt: now };
    if (reason === '429') patch.last429At = now;

    patchCache(providerKey, patch);

    const limits = PROVIDER_LIMITS[providerKey];
    console.log(`🔴 [FREE-TIER] ${limits?.label || providerKey} marked exhausted (${reason}) — will skip for rest of day`);

    upsertNeon(providerKey, {
      exhaustedAt: now,
      last429At: reason === '429' ? now : undefined,
    });
  }

  function resolveProvider(councilMemberName) {
    if (MEMBER_TO_PROVIDER[councilMemberName]) return MEMBER_TO_PROVIDER[councilMemberName];
    for (const key of PROVIDER_PRIORITY) {
      if (councilMemberName.startsWith(key)) return key;
    }
    if (councilMemberName.startsWith('ollama_') || councilMemberName === 'ollama') return 'ollama';
    return null;
  }

  async function getNextAvailable(excludeProviders = []) {
    for (const providerKey of PROVIDER_PRIORITY) {
      if (excludeProviders.includes(providerKey)) continue;
      if (await canUse(providerKey)) return providerKey;
    }
    return 'ollama';
  }

  async function checkAndRecord(councilMemberName, tokensUsed = 0) {
    const providerKey = resolveProvider(councilMemberName);
    if (!providerKey) return { allowed: true };
    const allowed = await canUse(providerKey);
    if (allowed) await record(providerKey, tokensUsed);
    return { allowed, providerKey };
  }

  async function on429(councilMemberName) {
    const providerKey = resolveProvider(councilMemberName);
    if (providerKey) await markExhausted(providerKey, '429');
  }

  async function getStatus() {
    const s = await getState();
    const result = { date: todayUTC(), providers: {}, backend: pool ? 'neon' : 'memory-only' };

    for (const key of PROVIDER_PRIORITY) {
      const limits = PROVIDER_LIMITS[key];
      const usage = s[key] || emptyProviderState();
      const available = await canUse(key);

      result.providers[key] = {
        label: limits.label,
        available,
        exhausted: !!usage.exhaustedAt,
        requests: {
          used: usage.requests,
          limit: limits.dailyRequests,
          pct: limits.dailyRequests
            ? Math.round((usage.requests / limits.dailyRequests) * 100)
            : null,
          remaining: limits.dailyRequests
            ? Math.max(0, limits.dailyRequests - usage.requests)
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
        exhaustedAt: usage.exhaustedAt,
      };
    }

    return result;
  }

  // Warm the cache on creation (non-blocking)
  ensureSchema().then(() => getState()).catch(() => {});

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
