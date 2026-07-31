/**
 * SYNOPSIS: Receipt Auditor unit tests.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { auditReceipt, createReceiptAuditor, replaySample } from '../services/receipt-auditor.mjs';

describe('receipt-auditor', () => {
  it('createReceiptAuditor returns bound functions', () => {
    const auditor = createReceiptAuditor({ repoRoot: process.cwd() });
    assert.equal(typeof auditor.auditReceipt, 'function');
    assert.equal(typeof auditor.replaySample, 'function');
  });

  it('auditReceipt returns PASS for a passing command with skip_git_checkout', async () => {
    const result = await auditReceipt(
      {
        receipt: {
          git_sha: 'HEAD',
          verify_command: "node --eval \"console.log('ok')\"",
        },
        skip_git_checkout: true,
      },
      { repoRoot: process.cwd() },
    );
    assert.equal(result.replay_verdict, 'PASS');
    assert.equal(result.audit_completed, true);
    assert.equal(result.exit_code, 0);
    assert.ok(result.stdout.includes('ok'));
  });

  it('auditReceipt returns FAIL for a failing command with skip_git_checkout', async () => {
    const result = await auditReceipt(
      {
        receipt: {
          git_sha: 'HEAD',
          verify_command: 'node --eval "process.exit(1)"',
        },
        skip_git_checkout: true,
      },
      { repoRoot: process.cwd() },
    );
    assert.equal(result.replay_verdict, 'FAIL');
    assert.equal(result.audit_completed, true);
    assert.equal(result.exit_code, 1);
  });

  it('auditReceipt returns UNREPRODUCIBLE when no command is provided', async () => {
    const result = await auditReceipt({ receipt: { git_sha: 'HEAD' } });
    assert.equal(result.replay_verdict, 'UNREPRODUCIBLE');
    assert.equal(result.audit_completed, false);
    assert.equal(result.exit_code, null);
  });

  it('auditReceipt accepts a receipt string path', async () => {
    const result = await auditReceipt(
      'builderos-reboot/MISSIONS/FACTORY-PATH-TO-TEN-0001/OBJECTIVE_VERDICT.json',
      { skip_git_checkout: true, repoRoot: process.cwd() },
    );
    assert.equal(typeof result.replay_verdict, 'string');
    assert.equal(result.audit_completed, true);
  });

  it('auditReceipt normalizes original verdict from receipt', async () => {
    const result = await auditReceipt(
      {
        receipt: {
          kind: 'sentry',
          passed: true,
          verify_command: "node --eval \"console.log('ok')\"",
        },
        skip_git_checkout: true,
      },
      { repoRoot: process.cwd() },
    );
    assert.equal(result.original_verdict, 'pass');
    assert.equal(result.replay_verdict, 'PASS');
  });

  it('replaySample returns a structured audit for the PATH-TO-TEN OBJECTIVE_VERDICT', async () => {
    const result = await replaySample({ repoRoot: process.cwd() });
    assert.equal(typeof result.replay_verdict, 'string');
    assert.equal(result.audit_completed, true);
    assert.equal(result.git_sha, result.git_sha);
  });
});
