/**
 * Regression: orphan PASS receipts forbidden repo-wide (§2.18).
 * @ssot docs/architecture/HIST_LEGACY_SYSTEM_REGISTRY.md
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkOrphanProductPassReceipts } from '../services/bp-priority-sync.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT_DIR = path.join(ROOT, 'products/receipts');

describe('checkOrphanProductPassReceipts', () => {
  it('passes for registered product PASS receipts with bp_sync', () => {
    const failures = checkOrphanProductPassReceipts({ root: ROOT });
    const orphan = failures.filter((f) => f.id.startsWith('BP_ORPHAN_PASS'));
    assert.equal(orphan.length, 0, orphan.map((f) => f.detail).join('; '));
  });

  it('fails orphan PASS without bp_sync in temp fixture', () => {
    fs.mkdirSync(RECEIPT_DIR, { recursive: true });
    const rel = 'products/receipts/_test_orphan_pass_fixture.json';
    const full = path.join(ROOT, rel);
    fs.writeFileSync(
      full,
      `${JSON.stringify({ schema: 'test', verdict: 'PASS' }, null, 2)}\n`,
    );
    try {
      const failures = checkOrphanProductPassReceipts({ root: ROOT });
      assert.ok(
        failures.some((f) => f.id === 'BP_ORPHAN_PASS_NO_SYNC' || f.id === 'BP_ORPHAN_PASS_NOT_REGISTERED'),
      );
    } finally {
      fs.unlinkSync(full);
    }
  });
});
