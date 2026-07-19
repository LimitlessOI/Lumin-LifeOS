/**
 * SYNOPSIS: Regression suite for a real bug found 2026-07-19: retrieveCapsules ran
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  fetchCandidateCapsules,
  fetchCandidateCapsulesSemantic,
  fetchCandidateCapsulesHybrid,
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

// Real semantic search (2026-07-19) on top of the full-text fix above —
// memory_capsules.embedding (vector(1536)) existed in the schema but was
// never populated by anything until scripts/memory-embeddings-backfill.mjs.

test('fetchCandidateCapsulesSemantic: returns null (never throws) when the embedding call fails — callers must have a safe fallback', async () => {
  const embedFn = async () => { throw new Error('OPENAI_API_KEY not configured'); };
  const pool = { query: async () => { throw new Error('must not query if no embedding'); } };
  const result = await fetchCandidateCapsulesSemantic('railway deploy', pool, { embedFn });
  assert.equal(result, null);
});

test('fetchCandidateCapsulesSemantic: empty query returns null without calling the embedder', async () => {
  let called = false;
  const embedFn = async () => { called = true; return [1, 2, 3]; };
  const result = await fetchCandidateCapsulesSemantic('', {}, { embedFn });
  assert.equal(result, null);
  assert.equal(called, false);
});

test('fetchCandidateCapsulesSemantic: a real embedding queries only rows with embedding set, ordered by vector distance', async () => {
  const embedFn = async (text) => { assert.equal(text, 'railway deploy'); return [0.1, 0.2, 0.3]; };
  let captured;
  const pool = {
    query: async (sql, params) => {
      captured = { sql, params };
      return { rows: [{ capsule_id: 'x', distance: 0.05 }] };
    },
  };
  const result = await fetchCandidateCapsulesSemantic('railway deploy', pool, { embedFn });
  assert.equal(result.length, 1);
  assert.match(captured.sql, /WHERE mc\.embedding IS NOT NULL/);
  assert.match(captured.sql, /ORDER BY mc\.embedding <=> \$1::vector ASC/);
  assert.equal(captured.params[0], '[0.1,0.2,0.3]');
});

test('fetchCandidateCapsulesHybrid: falls back entirely to full-text when semantic returns nothing (no embeddings populated yet)', async () => {
  const embedFn = async () => { throw new Error('no key'); };
  let fullTextCalled = false;
  const pool = {
    query: async (sql, params) => {
      if (sql.includes('plainto_tsquery')) {
        fullTextCalled = true;
        return { rows: [{ capsule_id: 'text-match' }] };
      }
      return { rows: [] };
    },
  };
  const result = await fetchCandidateCapsulesHybrid('railway', pool, { embedFn });
  assert.equal(fullTextCalled, true);
  assert.equal(result[0].capsule_id, 'text-match');
});

test('fetchCandidateCapsulesHybrid: tops up semantic results with full-text matches for capsules without an embedding, de-duplicated', async () => {
  const embedFn = async () => [0.1, 0.2];
  const pool = {
    query: async (sql) => {
      if (sql.includes('mc.embedding <=> $1::vector ASC')) {
        return { rows: [{ capsule_id: 'semantic-1' }] }; // only 1 semantic hit, well under the limit
      }
      if (sql.includes('plainto_tsquery')) {
        return { rows: [{ capsule_id: 'semantic-1' }, { capsule_id: 'text-2' }] }; // overlaps + adds one new
      }
      return { rows: [] };
    },
  };
  const result = await fetchCandidateCapsulesHybrid('railway', pool, { embedFn, limit: 5 });
  assert.deepEqual(result.map((c) => c.capsule_id), ['semantic-1', 'text-2'], 'must not duplicate semantic-1, must include the new text-2');
});

test('fetchCandidateCapsulesHybrid: semantic results alone already meeting the limit skips the full-text top-up query entirely', async () => {
  const embedFn = async () => [0.1];
  let textQueried = false;
  const pool = {
    query: async (sql) => {
      if (sql.includes('mc.embedding <=> $1::vector ASC')) {
        return { rows: [{ capsule_id: 'a' }, { capsule_id: 'b' }] };
      }
      if (sql.includes('plainto_tsquery')) {
        textQueried = true;
        return { rows: [] };
      }
      return { rows: [] };
    },
  };
  const result = await fetchCandidateCapsulesHybrid('x', pool, { embedFn, limit: 2 });
  assert.equal(result.length, 2);
  assert.equal(textQueried, false, 'no need to top up when semantic already filled the limit');
});
