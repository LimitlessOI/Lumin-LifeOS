/**
 * SYNOPSIS: services/memory-retrieval.js
 */
// services/memory-retrieval.js
/** @ssot docs/products/memory-system/PRODUCT_HOME.md */
import { buildProvenanceChain } from './memory-provenance.js';

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

async function retrieveCapsules(query, lane, taskScope, whyRetrieved, allowedUse, pool) {
  if (!lane) {
    throw { halt_code: 'MEMORY_RETRIEVAL_PERMISSION_UNKNOWN' };
  }
  const capsules = await fetchCandidateCapsules(query, pool);
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
  RETRIEVAL_ROW_LIMIT,
};
