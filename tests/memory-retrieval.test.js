/**
 * SYNOPSIS: Regression suite for a real bug found 2026-07-19: retrieveCapsules ran
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  fetchCandidateCapsules,
  retrieveCapsules,
  enforceLaneCeiling,
  RETRIEVAL_ROW_LIMIT,
} from '../services/memory-retrieval.js';

/**
 * Regression suite for a real bug found 2026-07-19: retrieveCapsules ran
 * `SELECT * FROM memory_capsules` with no WHERE clause referencing the
 * `query` argument at all and no LIMIT — every retrieval call returned the
 * entire table (lane-filtered only), never anything relevance-matched to
 * what was actually asked, and would have scanned unboundedly as the table
 * grew. Confirmed live: 21 real capsules in production, 0 with the (already
 * schema-present) `embedding` column ever set — nothing computes embeddings
 * on capsule creation, so this fix uses Postgres full-text search over
 * title + the joined epistemic_facts.text as the immediate real fix, not a
 * vector/embedding pipeline (a larger, separate initiative).
 */

function fakePool(queryImpl) {
  const calls = [];
  return {
    calls,
    query: async (sql, params) => {
      calls.push({ sql, params });
      return queryImpl(sql, params);
    },
  };
}

test('fetchCandidateCapsules: a non-empty query uses full-text search joined to epistemic_facts, ranked and limited', async () => {
  const pool = fakePool((sql, params) => {
    assert.match(sql, /to_tsvector\('english', coalesce\(mc\.title/);
    assert.match(sql, /LEFT JOIN epistemic_facts ef ON ef\.id = mc\.fact_id/);
    assert.match(sql, /plainto_tsquery\('english', \$1\)/);
    assert.match(sql, /ORDER BY relevance_rank DESC/);
    assert.match(sql, /LIMIT \$2/);
    assert.deepEqual(params, ['railway deploy', RETRIEVAL_ROW_LIMIT]);
    return { rows: [{ capsule_id: 'a', title: 'Railway deployment healthy' }] };
  });

  const rows = await fetchCandidateCapsules('railway deploy', pool);
  assert.equal(rows.length, 1);
  assert.equal(pool.calls.length, 1);
});

test('fetchCandidateCapsules: empty/whitespace query falls back to recency order, still bounded by LIMIT', async () => {
  const pool = fakePool((sql, params) => {
    assert.doesNotMatch(sql, /plainto_tsquery/);
    assert.match(sql, /ORDER BY created_at DESC/);
    assert.match(sql, /LIMIT \$1/);
    assert.deepEqual(params, [RETRIEVAL_ROW_LIMIT]);
    return { rows: [] };
  });

  await fetchCandidateCapsules('', pool);
  await fetchCandidateCapsules('   ', pool);
  await fetchCandidateCapsules(undefined, pool);
  assert.equal(pool.calls.length, 3);
});

test('fetchCandidateCapsules: every call is bounded by RETRIEVAL_ROW_LIMIT (the previous SELECT * had no limit at all)', async () => {
  const pool = fakePool((sql, params) => ({ rows: [] }));
  await fetchCandidateCapsules('anything', pool);
  await fetchCandidateCapsules('', pool);
  for (const call of pool.calls) {
    assert.ok(call.params.includes(RETRIEVAL_ROW_LIMIT), 'every query must carry the row limit as a bound parameter, never string-interpolated');
  }
});

test('retrieveCapsules end-to-end: query text actually narrows results (regression for the ignored-query bug)', async () => {
  const allCapsules = [
    { capsule_id: 'match', fact_id: 'fact-match', title: 'Railway deployment healthy', status: 'PROPOSED', retrieval_permission: 'context_only', source_type: 'system', source_ref: null, truth_class: 'objective', trust_level: 'PROPOSED' },
    { capsule_id: 'nomatch', fact_id: 'fact-nomatch', title: 'GEMINI_API_KEY confirmed present', status: 'PROPOSED', retrieval_permission: 'context_only', source_type: 'system', source_ref: null, truth_class: 'objective', trust_level: 'PROPOSED' },
  ];
  // Full fake, including buildProvenanceChain's own follow-up queries — this
  // test exercises retrieveCapsules end-to-end (relevance filtering +
  // existing lane/provenance logic together), not just fetchCandidateCapsules
  // in isolation.
  const pool = fakePool((sql, params) => {
    if (sql.includes('plainto_tsquery')) {
      // Simulate real Postgres FTS behavior: only the matching row comes back.
      return { rows: allCapsules.filter((c) => c.capsule_id === 'match') };
    }
    if (sql.includes('WHERE capsule_id = $1')) {
      return { rows: allCapsules.filter((c) => c.capsule_id === params[0]) };
    }
    if (sql.includes('FROM epistemic_facts WHERE id')) {
      return { rows: [{ id: params[0], level: 1 }] };
    }
    if (sql.includes('INSERT INTO retrieval_events')) {
      return { rows: [{ id: 'fake-event-id' }] };
    }
    return { rows: [] };
  });

  const result = await retrieveCapsules('railway', 'context_lane', null, 'testing', 'testing', pool);
  assert.equal(result.results.length, 1);
  assert.equal(result.results[0].capsule_id, 'match');
});

test('enforceLaneCeiling behavior is unchanged by the retrieval fix (access-control logic untouched)', async () => {
  const blocked = await enforceLaneCeiling({ status: 'QUARANTINED', retrieval_permission: 'context_only' }, 'context_lane');
  assert.equal(blocked.allowed, false);

  const allowed = await enforceLaneCeiling({ status: 'PROPOSED', retrieval_permission: 'context_only' }, 'context_lane');
  assert.equal(allowed.allowed, true);
});
