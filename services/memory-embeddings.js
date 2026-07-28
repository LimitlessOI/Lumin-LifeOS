/**
 * SYNOPSIS: Real embedding generation for memory capsules — closes the gap
 * where memory_capsules.embedding (vector(1536), schema already live) had
 * never once been written to (confirmed live: 21 real capsules, 0 with an
 * embedding, 2026-07-19). text-embedding-3-small is 1536-dim, matching the
 * column exactly — the schema was clearly built for this model.
 * @ssot docs/products/memory-system/PRODUCT_HOME.md
 *
 * Deliberately its own small module, not folded into memory-capsule.js:
 * capsule creation must stay fast and never block on an external API call
 * (memory-system's own NON-NEGOTIABLE: "Memory writes are async — never
 * block the main request") — embedding generation is a separate, backfill-
 * style concern (scripts/memory-embeddings-backfill.mjs), not part of the
 * write path itself.
 */

const EMBEDDING_MODEL = 'text-embedding-3-small'; // 1536-dim, matches memory_capsules.embedding

/**
 * Calls OpenAI's embeddings API for one piece of text. Dependency-injected
 * fetch so this is fully unit-testable without a real API call/spend.
 * Returns a plain number[] (1536 entries) or throws with a clear reason.
 */
export async function generateEmbedding(text, { apiKey = process.env.OPENAI_API_KEY, model = EMBEDDING_MODEL, fetchFn = fetch } = {}) {
  const input = String(text || '').trim();
  if (!input) {
    throw new Error('generateEmbedding: empty text');
  }
  if (!apiKey) {
    throw new Error('generateEmbedding: OPENAI_API_KEY not configured');
  }

  const resp = await fetchFn('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input: input.slice(0, 8000) }), // API input limit headroom
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new Error(`generateEmbedding: OpenAI API ${resp.status}: ${body.slice(0, 300)}`);
  }

  const json = await resp.json();
  const vector = json?.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error('generateEmbedding: no embedding vector in response');
  }
  return vector;
}

/** Formats a JS number array as a pgvector literal for a parameterized query. */
export function toPgVectorLiteral(vector) {
  if (!Array.isArray(vector) || !vector.length) {
    throw new Error('toPgVectorLiteral: vector must be a non-empty array');
  }
  return `[${vector.map((n) => Number(n)).join(',')}]`;
}
