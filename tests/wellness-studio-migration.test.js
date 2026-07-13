/**
 * SYNOPSIS: Wellness Studio migration contract regression tests.
 * @ssot docs/products/wellness-studio/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

test('Wellness Studio core migration uses bigint IDs for canonical LifeOS references', () => {
  const sql = readFileSync(
    path.join(ROOT, 'db/migrations/20260713_wellness_studio_core_tables.sql'),
    'utf8',
  );

  assert.match(sql, /user_id\s+bigint\s+NOT NULL REFERENCES lifeos_users\(id\)/i);
  assert.match(sql, /joy_checkin_id\s+bigint\s+REFERENCES joy_checkins\(id\)/i);
  assert.match(sql, /integrity_score_log_id\s+bigint\s+REFERENCES integrity_score_log\(id\)/i);
  assert.match(sql, /wearable_data_id\s+bigint\s+REFERENCES wearable_data\(id\)/i);
  assert.match(sql, /emotional_pattern_id\s+bigint\s+REFERENCES emotional_patterns\(id\)/i);
  assert.doesNotMatch(sql, /\buser_id\s+uuid\b/i);
  assert.doesNotMatch(sql, /\b(?:joy_checkin_id|integrity_score_log_id|wearable_data_id|emotional_pattern_id)\s+uuid\b/i);
});
