/**
 * SYNOPSIS: Model-cost ROI ledger tests.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { logModelCall, readLedger, computeRoiReport, formatRoiReport } from '../services/model-roi-ledger.mjs';

describe('model-roi-ledger', () => {
  let tmpDir;
  beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), 'roi-')); });
  afterEach(() => { try { rmSync(tmpDir, { recursive: true, force: true }); } catch {} });

  it('logs a model call to a JSONL ledger', () => {
    const ledgerPath = join(tmpDir, 'ledger.jsonl');
    const entry = logModelCall({ ledgerPath, model: 'openai_gpt', lensId: 'cfo-roi', responsibility: 'cfo', mission: 'test', promptTokens: 10, completionTokens: 20, estimatedUsd: 0.001, outcome: 'pass' });
    assert.equal(entry.model, 'openai_gpt');
    assert.ok(existsSync(ledgerPath));
    const lines = readFileSync(ledgerPath, 'utf8').trim().split('\n');
    assert.equal(lines.length, 1);
    const parsed = JSON.parse(lines[0]);
    assert.equal(parsed.lens_id, 'cfo-roi');
    assert.equal(parsed.outcome, 'pass');
  });

  it('reads the ledger', () => {
    const ledgerPath = join(tmpDir, 'ledger.jsonl');
    logModelCall({ ledgerPath, model: 'claude_sonnet', lensId: 'steve-jobs', outcome: 'pass' });
    logModelCall({ ledgerPath, model: 'openai_builder_mini', lensId: 'toyota-lean', outcome: 'fail' });
    const entries = readLedger(ledgerPath);
    assert.equal(entries.length, 2);
    assert.equal(entries[1].outcome, 'fail');
  });

  it('computes per-model, per-lens, and per-lens-model ROI with trust deltas', () => {
    const ledgerPath = join(tmpDir, 'ledger.jsonl');
    logModelCall({ ledgerPath, model: 'claude_sonnet', lensId: 'steve-jobs', outcome: 'pass', estimatedUsd: 0.003 });
    logModelCall({ ledgerPath, model: 'claude_sonnet', lensId: 'steve-jobs', outcome: 'pass', estimatedUsd: 0.003 });
    logModelCall({ ledgerPath, model: 'openai_gpt', lensId: 'cfo-roi', outcome: 'fail', estimatedUsd: 0.001 });
    const report = computeRoiReport(readLedger(ledgerPath));
    assert.equal(report.total_calls, 3);
    assert.equal(report.by_model['claude_sonnet'].passes, 2);
    assert.equal(report.by_model['openai_gpt'].fails, 1);
    assert.equal(report.by_lens['steve-jobs'].pass_rate, 1);
    assert.equal(report.by_lens['cfo-roi'].pass_rate, 0);
    assert.ok(report.by_lens['steve-jobs'].trust_score_delta > 0);
    assert.ok(report.by_lens['cfo-roi'].trust_score_delta < 0);
    assert.equal(report.by_lens_model['steve-jobs::claude_sonnet'].calls, 2);
    assert.ok(formatRoiReport(report).includes('Model ROI Report'));
  });
});
