/**
 * Standalone runner for the Lumin Memory GitHub importer.
 * Connects directly to the production DB and fetches all dump files.
 *
 * Usage:
 *   GITHUB_TOKEN=ghp_xxx node scripts/run-memory-import.mjs
 *
 * Uses DATABASE_URL from .env automatically.
 * AI extraction is skipped if ANTHROPIC_API_KEY is not set —
 * raw chunks are still stored and searchable.
 */

import { readFileSync } from 'fs';
// ── Load .env ──────────────────────────────────────────────────────────────
try {
  const env = readFileSync('.env', 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
} catch { /* no .env file, use shell env */ }

// Repo is public — token is optional but helps with rate limits
if (!process.env.GITHUB_TOKEN) {
  console.log('ℹ  No GITHUB_TOKEN — using unauthenticated GitHub API (60 req/hr limit)');
}
if (!process.env.DATABASE_URL) {
  console.error('\n❌  DATABASE_URL is required (should be in .env).\n');
  process.exit(1);
}

// ── Import service ─────────────────────────────────────────────────────────
const { createLuminMemoryFetcher } = await import('../services/lumin-memory-fetcher.js');

// ── DB pool ────────────────────────────────────────────────────────────────
let pool;
try {
  const { default: pg } = await import('pg');
  const { Pool } = pg;
  pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
} catch (e) {
  console.error('DB pool error:', e.message);
  process.exit(1);
}

// ── Optional AI (skipped if no key) ───────────────────────────────────────
let callAI = null;
if (process.env.ANTHROPIC_API_KEY) {
  console.log('✓ AI extraction enabled (Anthropic)');
  callAI = async (prompt) => {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const j = await resp.json();
    return j?.content?.[0]?.text || '';
  };
} else {
  console.log('ℹ  No ANTHROPIC_API_KEY — chunks will be stored without AI extraction');
}

// ── Run ────────────────────────────────────────────────────────────────────
const fetcher = createLuminMemoryFetcher({ pool, callAI, logger: console });

console.log('\n🚀  Starting Lumin Memory import…\n');

const result = await fetcher.importFromGitHub({
  dryRun: false,
  skipAlreadyImported: true,
  maxFiles: 100,
});

console.log('\n✅  Import complete:\n');
console.log(`  Files found:       ${result.files_found}`);
console.log(`  Files processed:   ${result.files_processed}`);
console.log(`  Files skipped:     ${result.files_skipped}`);
console.log(`  Chunks stored:     ${result.chunks_stored}`);
console.log(`  Insights:          ${result.insights_extracted}`);
console.log(`  Commitments:       ${result.commitments_stored}`);
console.log(`  Decisions:         ${result.decisions_stored}`);

if (result.errors?.length) {
  console.log(`\n⚠  Errors (${result.errors.length}):`);
  for (const e of result.errors) console.log(`   - ${e.file}: ${e.error}`);
}

await pool.end();
