/**
 * SYNOPSIS: Regression coverage for governed queue commit and exact-change durability.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  collectExactArtifactEntries,
  markShippedStepsDone,
  mergeShippedStepMetadata,
  queueCommitContent,
} from '../services/governed-autonomous-shipping-loop.js';

test('queue commit serialization ignores local source path and detects equal content', () => {
  const queue = {
    schema: 'product_build_queue_v1',
    product_id: 'demo',
    steps: [{ id: 'step-1', status: 'blocked', attempts: 2 }],
  };
  const local = { ...queue, _sourcePath: '/tmp/demo/BUILD_QUEUE.json' };

  assert.equal(queueCommitContent(local), queueCommitContent(queue));
  assert.equal(JSON.parse(queueCommitContent(local))._sourcePath, undefined);
});

test('SHIP to DONE transition preserves sealed exact-change metadata', () => {
  const runtime = {
    steps: [{
      id: 'step-1',
      status: 'pending',
      target_file: 'services/demo.js',
      task: 'build demo',
      spec: 'export demo',
    }],
  };
  const sealed = {
    steps: [{
      ...runtime.steps[0],
      action_type: 'write_file_exact',
      exact_inputs: {
        content_source_path: 'docs/products/demo/twins/steps/step-1.exact',
      },
      exactness: {
        sealed: true,
        content_sha256: 'abc123',
        reverse: { mode: 'delete_file', target_file: 'services/demo.js' },
      },
    }],
  };

  mergeShippedStepMetadata(runtime, sealed, ['step-1']);
  markShippedStepsDone(runtime, ['step-1'], 'deadbeef12345678');

  assert.equal(runtime.steps[0].action_type, 'write_file_exact');
  assert.equal(runtime.steps[0].status, 'done');
  assert.equal(runtime.steps[0].commit_sha, 'deadbeef12345678');
  assert.equal(runtime.steps[0].exactness.sealed, true);
  assert.equal(runtime.steps[0].exactness.commit_sha, 'deadbeef12345678');
  assert.equal(runtime.steps[0].exactness.reverse.target_file, 'services/demo.js');
});

test('SHIP commit collects sealed exact bytes and rejects paths outside repository', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'governed-exact-'));
  const exactPath = 'docs/products/demo/twins/steps/step-1.exact';
  fs.mkdirSync(path.dirname(path.join(root, exactPath)), { recursive: true });
  fs.writeFileSync(path.join(root, exactPath), 'export const durable = true;\n', 'utf8');
  const queue = {
    steps: [
      {
        id: 'step-1',
        exact_inputs: { content_source_path: exactPath },
      },
      {
        id: 'step-2',
        exact_inputs: { content_source_path: '../outside.exact' },
      },
    ],
  };

  const entries = collectExactArtifactEntries(queue, ['step-1', 'step-2'], { repoRoot: root });

  assert.deepEqual(entries, [{
    path: exactPath,
    content: 'export const durable = true;\n',
  }]);
});
