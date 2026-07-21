/**
 * SYNOPSIS: Regression coverage for council response cache fence normalization.
 * @ssot docs/products/ai-council/PRODUCT_HOME.md
 */
import assert from 'node:assert/strict';
import test from 'node:test';

import { cleanCouncilResponseForCache } from '../services/council-service.js';

test('strips fenced JSON when the closing fence ends the response', () => {
  const response = '```json\n[{"title":"Paid content"}]\n```';

  assert.equal(
    cleanCouncilResponseForCache(response),
    '[{"title":"Paid content"}]',
  );
});

test('strips fenced JSON with trailing whitespace and preserves plain JSON', () => {
  assert.equal(
    cleanCouncilResponseForCache('```json\n{"ok":true}\n``` \n'),
    '{"ok":true}',
  );
  assert.equal(
    cleanCouncilResponseForCache('{"ok":true}'),
    '{"ok":true}',
  );
});
