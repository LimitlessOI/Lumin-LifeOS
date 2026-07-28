/**
 * SYNOPSIS: services/memory-retrieval.js
 */
// services/memory-retrieval.js
/** @ssot docs/products/memory-system/PRODUCT_HOME.md */
import { buildProvenanceChain } from './memory-provenance.js';
import { generateEmbedding, toPgVectorLiteral } from './memory-embeddings.js';

const TRUST_TO_PERMISSION = {
  UNTRUSTED: 'blocked',
  PROPOSED: 'context_only',
  SCOPED: 'context_only',
  RECEIPT_BACKED: 'decision_support',
  TRUSTED_FOR_CONTEXT: 'action_authority',
};

const LANE_TO_PERMISSION = {
  context_lane: 'context_only',
  decision_support_lane: 'decision_support',
  action_authority_lane: 'action_authority',
  relationship_sensitive_lane: 'decision_support',
  review_lane: 'blocked',
};

async function assignRetrievalPermission(capsuleId, pool) {
  const result = await pool.query(
    `SELECT trust_level FROM memory_capsules WHERE capsule_id = $1`,
    [capsuleId]
  );
  const trustLevel = result.rows[0].trust_level;
  const permission = TRUST_TO_PERMISSION[trustLevel] || 'context_only';
  await pool.query(
    `UPDATE memory_capsules SET retrieval_permission = $1 WHERE capsule_id = $2`,
    [permission, capsuleId]
  );
  const receiptResult = await pool.query(
    `SELECT id FROM memory_use_receipts WHERE capsule_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [capsuleId]
  );
  return receiptResult.rows[0]?.id;
}

async function enforceLaneCeiling(capsule, requestedLane) {
  if (
    (capsule.status === 'QUARANTINED' || capsule.status === 'DEPRECATED') &&
    requestedLane !== 'review_lane'
  ) {
    return { allowed: false, reason: 'Blocked capsule in non-review lane' };
  }
  if (capsule.retrieval_permission === 'blocked' && requestedLane !== 'review_lane') {
    return { allowed: false, reason: 'Blocked capsule in non-review lane' };
  }
  const ceilingOrder = ['blocked', 'context_only', 'decision_support', 'action_authority'];
  const currentIndex = ceilingOrder.indexOf(capsule.retrieval_permission);
  const requestedPermission = LANE_TO_PERMISSION[requestedLane];
  const requestedIndex = ceilingOrder.indexOf(requestedPermission);
  if (requestedLane === 'review_lane') {
    return { allowed: true, reason: 'Review lane bypass allowed' };
  }
  if (requestedIndex === -1) {
    throw { halt_code: 'RETRIEVAL_LANE_CEILING_EXCEEDED' };
  }
  if (currentIndex > requestedIndex) {
    return { allowed: false, reason: 'Lane ceiling exceeded' };
  }
  return { allowed: true, reason: 'Lane ceiling satisfied' };
}

// Hard cap regardless of query shape — the previous unconditional `SELECT *`
// had no LIMIT at all, so it re-scanned and returned the ENTIRE table on
// every single retrieval call. Fine at 21 rows; a real risk once this system
// has thousands of capsules.
const RETRIEVAL_ROW_LIMIT = 50;

/**
 * Fetches candidate capsules for a retrieval request. Real bug fixed
 * 2026-07-19: this previously ran `SELECT * FROM memory_capsules` and never
 * referenced the `query` argument at all — "retrieval" meant "everything the
 * caller's lane is allowed to see," not "what's relevant to what was asked."
 * Confirmed live: 21 real capsules in production, 0 with `embedding` set (the
 * column exists — someone added it expecting semantic search — but nothing
 * writes to it), so this uses Postgres full-text search over the capsule
 * title + its underlying epistemic_facts.text (the real content; `title` is
 * often a short label like "GEMINI_API_KEY confirmed present") as the
 * immediate, real fix. Vector/embedding-based retrieval is a larger,
 * separate initiative (needs embedding generation wired into capsule
 * creation + a backfill) — named, not silently left unfixed.
 */
async function fetchCandidateCapsules(query, pool) {
  const trimmed = typeof query === 'string' ? query.trim() : '';
  if (trimmed) {
    const result = await pool.query(
      `SELECT mc.*,
              ts_rank(
                to_tsvector('english', coalesce(mc.title, '') || ' ' || coalesce(ef.text, '')),
                plainto_tsquery('english', $1)
              ) AS relevance_rank
       FROM memory_capsules mc
       LEFT JOIN epistemic_facts ef ON ef.id = mc.fact_id
       WHERE to_tsvector('english', coalesce(mc.title, '') || ' ' || coalesce(ef.text, ''))
             @@ plainto_tsquery('english', $1)
       ORDER BY relevance_rank DESC
       LIMIT $2`,
      [trimmed, RETRIEVAL_ROW_LIMIT],
    );
    return result.rows;
  }
  // No query text given — most-recent-first rather than undefined table order,
  // still bounded by the same limit.
  const result = await pool.query(
    `SELECT * FROM memory_capsules ORDER BY created_at DESC LIMIT $1`,
    [RETRIEVAL_ROW_LIMIT],
  );
  return result.rows;
}

/**
 * Real semantic search (2026-07-19), on top of the full-text fix above: only
 * among capsules that already have an embedding (memory_capsules.embedding,
 * vector(1536) — schema existed but was never populated until
 * scripts/memory-embeddings-backfill.mjs). Returns null (never throws) if a
 * query embedding can't be generated — no API key, network error, etc. —
 * since callers must always have a safe path back to full-text search rather
 * than failing retrieval entirely over an embedding-provider hiccup.
 */
async function fetchCandidateCapsulesSemantic(query, pool, { embedFn = generateEmbedding, limit = RETRIEVAL_ROW_LIMIT } = {}) {
  const trimmed = typeof query === 'string' ? query.trim() : '';
  if (!trimmed) return null;

  let vector;
  try {
    vector = await embedFn(trimmed);
  } catch {
    return null; // no embedding available this call — caller falls back to full-text
  }

  const result = await pool.query(
    `SELECT mc.*, (mc.embedding <=> $1::vector) AS distance
     FROM memory_capsules mc
     WHERE mc.embedding IS NOT NULL
     ORDER BY mc.embedding <=> $1::vector ASC
     LIMIT $2`,
    [toPgVectorLiteral(vector), limit],
  );
  return result.rows;
}

/**
 * Combines semantic + full-text: semantic results first (genuinely embedded,
 * ranked by real similarity), topped up with full-text matches for capsules
 * that don't have an embedding yet (gradual backfill means both kinds
 * coexist for a while), de-duplicated, bounded by the same overall limit.
 * Falls back to pure full-text if semantic search returns nothing at all
 * (no embeddings populated yet, or the embedding call failed) — this can
 * never retrieve LESS than the full-text-only path already proven to work.
 */
async function fetchCandidateCapsulesHybrid(query, pool, opts = {}) {
  const limit = opts.limit || RETRIEVAL_ROW_LIMIT;
  const semantic = await fetchCandidateCapsulesSemantic(query, pool, opts);
  if (!semantic || !semantic.length) {
    return fetchCandidateCapsules(query, pool);
  }
  if (semantic.length >= limit) {
    return semantic;
  }
  const seen = new Set(semantic.map((c) => c.capsule_id));
  const textResults = await fetchCandidateCapsules(query, pool);
  const topUp = textResults.filter((c) => !seen.has(c.capsule_id)).slice(0, limit - semantic.length);
  return [...semantic, ...topUp];
}

async function retrieveCapsules(query, lane, taskScope, whyRetrieved, allowedUse, pool) {
  if (!lane) {
    throw { halt_code: 'MEMORY_RETRIEVAL_PERMISSION_UNKNOWN' };
  }
  const capsules = await fetchCandidateCapsulesHybrid(query, pool);
  const includedCapsules = [];
  let abstentionCount = 0;
  for (const capsule of capsules) {
    const enforcementResult = await enforceLaneCeiling(capsule, lane);
    if (enforcementResult.allowed) {
      includedCapsules.push(capsule);
    } else {
      abstentionCount++;
    }
  }
  const provenanceChains = await Promise.all(
    includedCapsules.map((capsule) =>
      buildProvenanceChain(capsule.capsule_id, lane, whyRetrieved, allowedUse, pool)
    )
  );
  return {
    results: includedCapsules,
    provenance: provenanceChains,
    abstention_count: abstentionCount,
    lane_applied: lane,
  };
}

async function checkZombieLane(capsule, lane) {
  if (capsule.status === 'QUARANTINED' && lane !== 'review_lane') {
    throw { halt_code: 'ZOMBIE_MEMORY_USED_FOR_ACTION' };
  }
  if (capsule.status === 'DEPRECATED' && lane !== 'review_lane') {
    throw { halt_code: 'DEPRECATED_MEMORY_USED_FOR_ACTION' };
  }
}

export {
  assignRetrievalPermission,
  enforceLaneCeiling,
  retrieveCapsules,
  checkZombieLane,
  fetchCandidateCapsules,
  fetchCandidateCapsulesSemantic,
  fetchCandidateCapsulesHybrid,
  RETRIEVAL_ROW_LIMIT,
};
