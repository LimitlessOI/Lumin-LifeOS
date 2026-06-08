/**
 * @ssot docs/projects/AMENDMENT_41_MARKETINGOS.md
 * Critical regression tests for MarketingOS startup/schema and session UI safety.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);

async function readRepoFile(relativePath) {
  return readFile(path.join(ROOT, relativePath), 'utf8');
}

test('MarketingOS Phase 1 migration is executable SQL for all five SSOT tables', async () => {
  const sql = await readRepoFile('db/migrations/[date]_marketing_schema.sql');

  assert.doesNotMatch(sql, /```|specification is contradictory/i);
  assert.match(sql, /CREATE EXTENSION IF NOT EXISTS pgcrypto;/i);

  for (const table of [
    'marketing_consent_records',
    'marketing_sessions',
    'marketing_content_extractions',
    'marketing_content_pieces',
    'marketing_channel_profiles',
  ]) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`, 'i'), `${table} table must exist`);
  }

  assert.match(sql, /consent_record_id UUID NOT NULL REFERENCES marketing_consent_records\(id\)/i);
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_profile_owner/i);
  assert.match(sql.trimEnd(), /;$/);
});

test('MarketingOS session overlay does not auto-confirm consent or render user HTML', async () => {
  const html = await readRepoFile('public/overlay/marketing-session.html');

  assert.match(html, /id="consentCheckbox"/);
  assert.match(html, /id="confirmConsent"/);
  assert.doesNotMatch(html, /setTimeout\(\s*\(\)\s*=>\s*\{\s*updateConsentStatus\(true\)/);
  assert.doesNotMatch(html, /\.innerHTML\s*=/);
  assert.match(html, /textContent = `\$\{sender\}:`/);
  assert.match(html, /document\.createTextNode/);
});

test('governed overnight runner does not depend on /bin/zsh for local checks', async () => {
  const source = await readRepoFile('scripts/governed-overnight-backlog-run.mjs');

  assert.doesNotMatch(source, /shell:\s*['"]\/bin\/zsh['"]/);
  assert.match(source, /existsSync\(resolved\)/);
  assert.match(source, /execFileSync\(process\.execPath,\s*\['--check', filePath\]/);
});
