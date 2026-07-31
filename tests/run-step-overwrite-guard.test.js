/**
 * SYNOPSIS: Tests that run-step refuses to write content whose sha256 is in the
 * step's rejected_content_hashes list, blocking the overwrite path before it
 * reaches the filesystem.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { runWriteFileExact } from '../factory-staging/factory-core/builder/run-step.js';

test('runWriteFileExact blocks content whose hash is in rejected_content_hashes', () => {
  const content = 'export const duplicate = 1;\n';
  const hash = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  const targetRel = `services/tmp-overwrite-guard-${process.hrtime.bigint()}.js`;
  const abs = path.resolve(targetRel);
  try {
    const result = runWriteFileExact({
      mission_id: 'm',
      blueprint_id: 'b',
      step: {
        step_id: 's1',
        action_type: 'write_file_exact',
        target_file: targetRel,
        sandbox_boundary: 'services',
        exact_inputs: { exact_content: content },
        rejected_content_hashes: [hash],
      },
    });
    assert.equal(result.status, 'BLOCKED_RETURN_TO_BPB', result.summary);
    assert.equal(result.gap_type, 'content_rejected');
    assert.ok(!fs.existsSync(abs), 'file must NOT be written when content hash is rejected');
  } finally {
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  }
});

test('runWriteFileExact writes content when hash is not rejected', () => {
  const content = 'export const allowed = 1;\n';
  const targetRel = `services/tmp-overwrite-allowed-${process.hrtime.bigint()}.js`;
  const abs = path.resolve(targetRel);
  try {
    const result = runWriteFileExact({
      mission_id: 'm',
      blueprint_id: 'b',
      step: {
        step_id: 's2',
        action_type: 'write_file_exact',
        target_file: targetRel,
        sandbox_boundary: 'services',
        exact_inputs: { exact_content: content },
        rejected_content_hashes: ['deadbeef'],
      },
    });
    assert.equal(result.status, 'DONE');
    assert.ok(fs.existsSync(abs));
    assert.equal(fs.readFileSync(abs, 'utf8'), content);
  } finally {
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  }
});
