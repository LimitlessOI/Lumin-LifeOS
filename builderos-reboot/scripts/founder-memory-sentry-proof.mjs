#!/usr/bin/env node
/**
 * SYNOPSIS: SENTRY proof — load product X ⇒ founder conversations are in context.
 * @ssot docs/products/memory-system/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const PRODUCT_ID = process.env.FOUNDER_MEMORY_PROOF_PRODUCT || 'memory-system';
const PROOF_MARKER = `SENTRY_PROOF_${Date.now()}`;
const RECEIPT_PATH = path.join(REPO_ROOT, 'products/receipts/FOUNDER_MEMORY_V1_SENTRY.json');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function withPool() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  const pool = new pg.Pool({ connectionString: url, ssl: url.includes('localhost') ? false : { rejectUnauthorized: false } });
  return pool;
}

async function main() {
  const checks = [];
  const started = Date.now();

  process.chdir(REPO_ROOT);

  const { createFounderMemoryStore } = await import('../../services/founder-memory-store.js');
  const {
    loadProductHomeWithFounderMemory,
    assertProductMemoryInContext,
  } = await import('../../services/founder-memory-product-resolver.js');
  const { verifyFounderClaim } = await import('../../services/founder-memory-claim-gate.js');
  const { buildFanoutPaths } = await import('../../services/founder-memory-fanout.js');

  const pool = await withPool();
  const store = createFounderMemoryStore(pool);

  const sessionId = `sentry_proof_${started}`;
  const appendResult = await store.append({
    sessionId,
    productIds: [PRODUCT_ID],
    classification: 'decision',
    role: 'founder',
    content: `${PROOF_MARKER} — founder approved canonical memory auto-inject for ${PRODUCT_ID}.`,
    metadata: { sentry_proof: true },
  });
  checks.push({ id: 'append_entry', ok: !!appendResult.receipt?.receipt_id });
  assert(appendResult.receipt?.receipt_id, 'append did not return receipt_id');

  const loaded = await loadProductHomeWithFounderMemory({
    productId: PRODUCT_ID,
    pool,
  });
  const contextCheck = assertProductMemoryInContext(loaded.full_context, { productId: PRODUCT_ID });
  checks.push({ id: 'context_has_memory_block', ok: contextCheck.has_memory_block });
  checks.push({ id: 'context_has_product', ok: contextCheck.has_product_tag });
  checks.push({ id: 'context_contains_proof_marker', ok: loaded.full_context.includes(PROOF_MARKER) });
  assert(contextCheck.ok, 'product load did not inject founder memory block');
  assert(loaded.full_context.includes(PROOF_MARKER), 'proof marker missing from injected context');

  const claimBad = await verifyFounderClaim({
    claim: 'founder approved canonical memory',
    receiptId: null,
    pool,
  });
  checks.push({ id: 'claim_without_receipt_unverified', ok: claimBad.label === 'UNVERIFIED' });

  const claimGood = await verifyFounderClaim({
    claim: 'founder approved canonical memory auto-inject',
    receiptId: appendResult.receipt.receipt_id,
    pool,
  });
  checks.push({ id: 'claim_with_receipt_verified', ok: claimGood.ok === true });

  const fanoutPaths = buildFanoutPaths(appendResult.entry);
  checks.push({ id: 'index_jsonl_exists', ok: fs.existsSync(fanoutPaths.index) });
  checks.push({ id: 'governance_decision_exists', ok: fs.existsSync(fanoutPaths.governance) });
  checks.push({ id: 'continuity_log_exists', ok: fs.existsSync(fanoutPaths.continuity) });

  const indexText = fs.readFileSync(fanoutPaths.index, 'utf8');
  checks.push({ id: 'index_contains_receipt', ok: indexText.includes(appendResult.receipt.receipt_id) });

  if (pool) await pool.end();

  const failed = checks.filter((c) => !c.ok);
  const receipt = {
    schema: 'founder_memory_sentry_v1',
    pass_fail: failed.length ? 'FAIL' : 'PASS',
    product_id: PRODUCT_ID,
    proof_marker: PROOF_MARKER,
    session_id: sessionId,
    citation_receipt_id: appendResult.receipt.receipt_id,
    checks,
    duration_ms: Date.now() - started,
    verified_at: new Date().toISOString(),
    assertion: 'load product X ⇒ tagged founder conversations are in context (not a link)',
  };

  fs.mkdirSync(path.dirname(RECEIPT_PATH), { recursive: true });
  fs.writeFileSync(RECEIPT_PATH, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify(receipt, null, 2));
  if (failed.length) {
    console.error('SENTRY FAIL:', failed.map((f) => f.id).join(', '));
    process.exit(1);
  }
  console.log('SENTRY PASS: founder memory auto-inject proven');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
