/**
 * SYNOPSIS: js — tests/founder-memory.test.js.
 * @ssot docs/products/memory-system/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatMemoryBlock,
  assertProductMemoryInContext,
  inferProductIdsFromMessage,
} from '../services/founder-memory-product-resolver.js';
import { createFounderMemoryStore, inferClassification, productIdFromHomePath } from '../services/founder-memory-store.js';
import { downgradeClaimWithoutReceipt } from '../services/founder-memory-claim-gate.js';

test('inferClassification detects decision vs idea vs chore', () => {
  assert.equal(inferClassification('I approved shipping memory-system v1'), 'decision');
  assert.equal(inferClassification('What if we tag every exchange?'), 'idea');
  assert.equal(inferClassification('Fix the fan-out path'), 'chore');
});

test('productIdFromHomePath parses nested product homes', () => {
  assert.equal(
    productIdFromHomePath('docs/products/marketingos/socialmediaos/PRODUCT_HOME.md'),
    'marketingos/socialmediaos'
  );
  assert.equal(productIdFromHomePath('docs/products/memory-system/PRODUCT_HOME.md'), 'memory-system');
});

test('formatMemoryBlock includes receipt ids and mandatory integrity rule', () => {
  const block = formatMemoryBlock([
    {
      classification: 'decision',
      receipt_id: 'fmrcpt_test123',
      session_id: 'sess_1',
      role: 'founder',
      occurred_at: '2026-07-08T00:00:00.000Z',
      content: 'Approved canonical store.',
    },
  ], 'memory-system');
  assert.match(block, /FOUNDER MEMORY \(auto-injected/);
  assert.match(block, /fmrcpt_test123/);
  assert.match(block, /UNVERIFIED/);
});

test('assertProductMemoryInContext passes when block present', () => {
  const ctx = '# Product\n\n---\n\n## FOUNDER MEMORY (auto-injected — cite receipt_id for claims)\n\nProduct: `memory-system`';
  const r = assertProductMemoryInContext(ctx, { productId: 'memory-system' });
  assert.equal(r.ok, true);
});

test('downgradeClaimWithoutReceipt marks UNVERIFIED without citation', () => {
  const out = downgradeClaimWithoutReceipt({ claim: 'founder approved X' });
  assert.equal(out.label, 'UNVERIFIED');
});

test('createFounderMemoryStore append returns typed receipt', async () => {
  const store = createFounderMemoryStore(null);
  const result = await store.append({
    sessionId: 'test_sess',
    productId: 'memory-system',
    role: 'founder',
    content: 'Unit test marker — skip fan-out',
    classification: 'chore',
    skipFanout: true,
  });
  assert.ok(result.receipt.receipt_id);
  assert.equal(result.receipt.schema, 'founder_memory_receipt_v1');
});

test('inferProductIdsFromMessage uses explicit product id', () => {
  assert.deepEqual(inferProductIdsFromMessage('hello', 'site-builder'), ['site-builder']);
});
