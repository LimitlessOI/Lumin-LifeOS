#!/usr/bin/env node
/**
 * SYNOPSIS: Backfills memory_capsules.embedding for capsules that don't have
 * one yet — new capsules AND the 21 that already existed with the column
 * unused. Deliberately separate from capsule creation (services/memory-
 * capsule.js) so writes stay fast/non-blocking (memory-system's own
 * NON-NEGOTIABLE: never block the main request on an async concern).
 * @ssot docs/products/memory-system/PRODUCT_HOME.md
 *
 * Goes through createUsefulWorkGuard per the Zero Waste AI Call Rule
 * (CLAUDE.md): real prerequisite (OPENAI_API_KEY present) + real work check
 * (rows actually needing an embedding) before a single API call is made.
 */
import { createUsefulWorkGuard, requireEnvVars, requireTableRows } from '../services/useful-work-guard.js';
import { generateEmbedding, toPgVectorLiteral } from '../services/memory-embeddings.js';

const BATCH_SIZE = 10; // small, bounded — a scheduled job, not a one-shot migration

/**
 * Finds up to BATCH_SIZE capsules missing an embedding, generates one from
 * title + the linked epistemic_facts.text (same content combination the
 * full-text search fix uses, kept consistent), and writes it back. Returns
 * counts, never throws on a single row's failure — one bad row must not
 * block the rest of the batch.
 */
export async function backfillMemoryEmbeddings({ pool, apiKey = process.env.OPENAI_API_KEY, fetchFn = fetch, logger = console, batchSize = BATCH_SIZE }) {
  const candidates = await pool.query(
    `SELECT mc.capsule_id, mc.title, ef.text AS fact_text
     FROM memory_capsules mc
     LEFT JOIN epistemic_facts ef ON ef.id = mc.fact_id
     WHERE mc.embedding IS NULL
     ORDER BY mc.created_at ASC
     LIMIT $1`,
    [batchSize],
  );

  let succeeded = 0;
  let failed = 0;
  for (const row of candidates.rows) {
    const text = [row.title, row.fact_text].filter(Boolean).join(' — ');
    try {
      const vector = await generateEmbedding(text, { apiKey, fetchFn });
      await pool.query(
        `UPDATE memory_capsules SET embedding = $1::vector WHERE capsule_id = $2`,
        [toPgVectorLiteral(vector), row.capsule_id],
      );
      succeeded += 1;
    } catch (err) {
      failed += 1;
      logger?.warn?.({ capsule_id: row.capsule_id, err: err.message }, '[MEMORY-EMBEDDINGS] backfill failed for one capsule');
    }
  }

  return { candidates: candidates.rows.length, succeeded, failed };
}

export function startMemoryEmbeddingsBackfillScheduler({ pool, logger = console } = {}) {
  const intervalMs = Number(process.env.MEMORY_EMBEDDINGS_BACKFILL_INTERVAL_MS || 15 * 60 * 1000);

  const guarded = createUsefulWorkGuard({
    taskName: 'Memory Embeddings Backfill',
    purpose: 'Populate memory_capsules.embedding so retrieval can use real semantic search instead of full-text-only',
    prerequisites: requireEnvVars('OPENAI_API_KEY'),
    workCheck: requireTableRows(pool, 'SELECT COUNT(*) FROM memory_capsules WHERE embedding IS NULL', [], 'capsules needing an embedding'),
    execute: async () => backfillMemoryEmbeddings({ pool, logger }),
    logger,
  });

  return setInterval(guarded, intervalMs);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { Client } = await import('pg');
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  try {
    const result = await backfillMemoryEmbeddings({ pool: client });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await client.end();
  }
}
