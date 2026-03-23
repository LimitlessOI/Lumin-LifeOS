/**
 * response-cache.js
 * Two-tier AI response cache: L1 in-memory (fast) + L2 Neon DB (survives deploys).
 *
 * On startup: warms L1 from recent DB rows so cache hits resume immediately.
 * On cache write: writes to L1 synchronously, DB asynchronously.
 * On cache hit: serves from L1; if L1 cold, checks DB (post-deploy warm path).
 *
 * TTL: 24h default. Research/analysis prompts use 72h (low churn).
 */

import crypto from 'crypto';

const CACHE_TTL_MS  = 24 * 60 * 60 * 1000;  // 24h default
const CACHE_TTL_LONG = 72 * 60 * 60 * 1000; // 72h for analysis tasks
const MAX_L1_SIZE   = 1000;

// L1 — in-memory Map: key → { response, expiresAt, taskType, words }
const L1 = new Map();

// ---------------------------------------------------------------------------
// Semantic helpers — Jaccard similarity for fuzzy cache matching
// ---------------------------------------------------------------------------
const SEMANTIC_THRESHOLD = 0.65; // lowered from 0.75 — catches near-duplicate prompts

function tokenize(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
}

function jaccardSimilarity(wordsA, wordsB) {
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  let intersection = 0;
  for (const w of setA) { if (setB.has(w)) intersection++; }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function semanticLookupL1(words, member) {
  const now = Date.now();
  let bestKey = null, bestScore = 0;
  const prefix = `${member}:`;
  for (const [key, entry] of L1) {
    if (!key.startsWith(prefix)) continue;
    if (entry.expiresAt <= now) continue;
    if (!entry.words || entry.words.length === 0) continue;
    const score = jaccardSimilarity(words, entry.words);
    if (score > bestScore && score >= SEMANTIC_THRESHOLD) {
      bestScore = score;
      bestKey = key;
    }
  }
  return bestKey ? { key: bestKey, score: bestScore } : null;
}

// Pool reference — set once via initCache()
let _pool = null;
let _warmed = false;

// ---------------------------------------------------------------------------
// hashPrompt — stable key from prompt content
// ---------------------------------------------------------------------------
export function hashPrompt(prompt) {
  const normalized = prompt.toLowerCase()
    // Strip timestamps (10:32am, 2026-03-23T10:32:00Z, Mar 23 2026, etc.)
    .replace(/\d{4}-\d{2}-\d{2}t\d{2}:\d{2}:\d{2}(\.\d+)?z?/gi, '__TS__')
    .replace(/\b\d{1,2}:\d{2}(:\d{2})?\s*(am|pm)?\b/gi, '__TIME__')
    .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2},?\s+\d{4}\b/gi, '__DATE__')
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, '__DATE__')
    // Strip UUIDs and request IDs
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '__UUID__')
    .replace(/\b[a-z]+_[0-9a-f]{8,}\b/gi, '__ID__')
    // Strip log noise (numbers that change every call)
    .replace(/\b\d{10,}\b/g, '__EPOCH__')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
  return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
}

function cacheKey(member, prompt) {
  return `${member}:${hashPrompt(prompt)}`;
}

function ttlMs(taskType = '') {
  const longTypes = ['research', 'analysis', 'planning', 'summaries'];
  return longTypes.some(t => taskType.includes(t)) ? CACHE_TTL_LONG : CACHE_TTL_MS;
}

// ---------------------------------------------------------------------------
// initCache — call once at startup with the DB pool
// ---------------------------------------------------------------------------
export async function initCache(pool) {
  _pool = pool;
  await _warmL1FromDB();
}

async function _warmL1FromDB() {
  if (_warmed || !_pool) return;
  _warmed = true;
  try {
    const { rows } = await _pool.query(
      `SELECT cache_key, response_text, expires_at, task_type
       FROM ai_response_cache
       WHERE expires_at > NOW()
       ORDER BY last_hit_at DESC NULLS LAST
       LIMIT 500`
    );
    for (const row of rows) {
      L1.set(row.cache_key, {
        response: row.response_text,
        expiresAt: new Date(row.expires_at).getTime(),
        taskType: row.task_type || '',
        words: row.prompt_snippet ? tokenize(row.prompt_snippet) : [],
      });
    }
    if (rows.length > 0) {
      console.log(`♻️  [CACHE] Warmed L1 with ${rows.length} entries from DB`);
    }
  } catch {
    // Table may not exist yet — non-fatal
  }
}

// ---------------------------------------------------------------------------
// getCachedResponse — L1 first, then L2 (DB), then null
// ---------------------------------------------------------------------------
export async function getCachedResponse(prompt, member, compressionMetrics) {
  const key = cacheKey(member, prompt);
  const now = Date.now();

  // L1 check
  const l1 = L1.get(key);
  if (l1 && l1.expiresAt > now) {
    if (compressionMetrics) compressionMetrics.cache_hits = (compressionMetrics.cache_hits || 0) + 1;
    // Bump hit count in DB async (fire-and-forget)
    _bumpHitCount(key).catch(() => {});
    return l1.response;
  }
  if (l1) L1.delete(key); // expired

  // L2 check — DB (handles post-deploy cold L1)
  if (_pool) {
    try {
      const { rows } = await _pool.query(
        `UPDATE ai_response_cache
         SET hit_count = hit_count + 1, last_hit_at = NOW()
         WHERE cache_key = $1 AND expires_at > NOW()
         RETURNING response_text, expires_at, task_type`,
        [key]
      );
      if (rows[0]) {
        // Repopulate L1
        L1.set(key, {
          response: rows[0].response_text,
          expiresAt: new Date(rows[0].expires_at).getTime(),
          taskType: rows[0].task_type || '',
        });
        if (compressionMetrics) compressionMetrics.cache_hits = (compressionMetrics.cache_hits || 0) + 1;
        return rows[0].response_text;
      }
    } catch {}
  }

  // Semantic fallback — fuzzy match via Jaccard similarity on L1 word sets
  const words = tokenize(prompt);
  const semantic = semanticLookupL1(words, member);
  if (semantic) {
    const entry = L1.get(semantic.key);
    if (compressionMetrics) compressionMetrics.semantic_hits = (compressionMetrics.semantic_hits || 0) + 1;
    _bumpHitCount(semantic.key).catch(() => {});
    console.log(`🔍 [SEMANTIC-CACHE] Hit for ${member} (Jaccard: ${semantic.score.toFixed(2)})`);
    return entry.response;
  }

  if (compressionMetrics) compressionMetrics.cache_misses = (compressionMetrics.cache_misses || 0) + 1;
  return null;
}

// ---------------------------------------------------------------------------
// cacheResponse — write to L1 + DB
// ---------------------------------------------------------------------------
export function cacheResponse(prompt, member, response, taskType = '') {
  const key = cacheKey(member, prompt);
  const expiresAt = Date.now() + ttlMs(taskType);

  // L1 write (synchronous) — include word set for semantic lookup
  L1.set(key, { response, expiresAt, taskType, words: tokenize(prompt) });
  if (L1.size > MAX_L1_SIZE) {
    L1.delete(L1.keys().next().value); // evict oldest
  }

  // L2 write (async, non-blocking)
  _writeToDb(key, member, prompt, response, taskType, expiresAt).catch(() => {});
}

async function _writeToDb(key, member, prompt, response, taskType, expiresAt) {
  if (!_pool) return;
  try {
    await _pool.query(
      `INSERT INTO ai_response_cache
         (cache_key, member, prompt_hash, prompt_snippet, response_text, task_type, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (cache_key) DO UPDATE SET
         response_text = EXCLUDED.response_text,
         expires_at    = EXCLUDED.expires_at,
         task_type     = EXCLUDED.task_type`,
      [
        key, member,
        hashPrompt(prompt),
        prompt.substring(0, 120),
        response,
        taskType || null,
        new Date(expiresAt).toISOString(),
      ]
    );
  } catch {}
}

async function _bumpHitCount(key) {
  if (!_pool) return;
  await _pool.query(
    `UPDATE ai_response_cache SET hit_count = hit_count + 1, last_hit_at = NOW() WHERE cache_key = $1`,
    [key]
  );
}

// ---------------------------------------------------------------------------
// getCacheStats — for monitoring dashboard
// ---------------------------------------------------------------------------
export async function getCacheStats() {
  const l1Size = L1.size;
  let dbStats = null;
  if (_pool) {
    try {
      const { rows } = await _pool.query(`
        SELECT
          COUNT(*)                                      AS total_entries,
          SUM(hit_count)                                AS total_hits,
          COUNT(*) FILTER (WHERE expires_at > NOW())    AS live_entries,
          MAX(last_hit_at)                              AS last_hit_at
        FROM ai_response_cache
      `);
      dbStats = rows[0];
    } catch {}
  }
  return { l1Size, dbStats };
}

// ---------------------------------------------------------------------------
// pruneExpired — call periodically to keep DB tidy
// ---------------------------------------------------------------------------
export async function pruneExpiredCache() {
  if (!_pool) return 0;
  try {
    const { rowCount } = await _pool.query(
      `DELETE FROM ai_response_cache WHERE expires_at < NOW()`
    );
    return rowCount || 0;
  } catch { return 0; }
}

// ---------------------------------------------------------------------------
// Legacy exports — keep existing callers working
// ---------------------------------------------------------------------------
export function advancedCompress(text) {
  return { compressed: text, ratio: 1, method: 'none' };
}
export function advancedDecompress(compressed) {
  return compressed;
}
