/**
 * SYNOPSIS: Behavioral tests for services/blueprint-grounding-check.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import assert from 'node:assert';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, test } from 'node:test';
import { verifyGeneratedContentGrounding } from '../services/blueprint-grounding-check.js';

describe('verifyGeneratedContentGrounding', () => {
  function tmpRepo() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'grounding-'));
  }

  function write(root, rel, content) {
    const abs = path.join(root, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf8');
    return abs;
  }

  test('PASS: a known-good file with valid named imports and known SQL tables', () => {
    const root = tmpRepo();
    write(root, 'services/friend.js', 'export const greet = () => "hi";\n');
    write(root, 'db/migrations/001_users.sql', 'CREATE TABLE users (id uuid PRIMARY KEY);\n');
    const file = write(root, 'routes/hello.js', `
import { greet } from '../services/friend.js';
export function handler() {
  const result = pool.query('SELECT * FROM users');
  return greet();
}
`);
    const result = verifyGeneratedContentGrounding({
      filePath: file,
      repoRoot: root,
    });
    assert.equal(result.status, 'PASS', result.reason);
    assert.equal(result.reason, null);
  });

  test('FAIL: imports a named export that does not exist in the source module', () => {
    const root = tmpRepo();
    write(root, 'services/helper.js', 'export const real = 1;\n');
    const file = write(root, 'routes/bad.js', `
import { real, missing } from '../services/helper.js';
export function handler() { return missing(); }
`);
    const result = verifyGeneratedContentGrounding({
      filePath: file,
      repoRoot: root,
    });
    assert.equal(result.status, 'FAIL');
    assert.ok(result.reason.includes('missing_named_export'));
    assert.ok(result.reason.includes('missing'));
    assert.ok(result.details.importChecks.some((d) => d.missing?.includes('missing')));
  });

  test('FAIL: SQL references a table that does not exist in the schema', () => {
    const root = tmpRepo();
    write(root, 'db/migrations/001_known.sql', 'CREATE TABLE known (id int);\n');
    const file = write(root, 'routes/query.js', `
export function handler() {
  return pool.query('SELECT * FROM unknown_table');
}
`);
    const result = verifyGeneratedContentGrounding({
      filePath: file,
      repoRoot: root,
    });
    assert.equal(result.status, 'FAIL');
    assert.ok(result.reason.includes('unknown_table'));
  });

  test('FAIL: resealing a rejected content hash is refused', () => {
    const root = tmpRepo();
    const file = write(root, 'routes/plain.js', 'export const a = 1;\n');
    const content = fs.readFileSync(file, 'utf8');
    const hash = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
    const result = verifyGeneratedContentGrounding({
      filePath: file,
      repoRoot: root,
      rejectedHashes: [hash],
    });
    assert.equal(result.status, 'FAIL');
    assert.ok(result.reason.includes('rejected_content_hash'));
  });

  test('FAIL: import source module is missing entirely', () => {
    const root = tmpRepo();
    const file = write(root, 'routes/orphan.js', `
import { nothing } from '../services/does-not-exist.js';
export function handler() { return nothing; }
`);
    const result = verifyGeneratedContentGrounding({
      filePath: file,
      repoRoot: root,
    });
    assert.equal(result.status, 'FAIL');
    assert.ok(result.reason.includes('import_source_missing'));
  });

  test('PASS: external / node: imports are not statically verified', () => {
    const root = tmpRepo();
    const file = write(root, 'routes/external.js', `
import fs from 'node:fs';
import pg from 'pg';
export function handler() { return fs.readFileSync('x'); }
`);
    const result = verifyGeneratedContentGrounding({
      filePath: file,
      repoRoot: root,
    });
    assert.equal(result.status, 'PASS', result.reason);
  });

  test('INDETERMINATE: dynamic import with non-literal source', () => {
    const root = tmpRepo();
    const file = write(root, 'routes/dynamic.js', `
export async function handler(target) {
  const mod = await import(target);
  return mod.go();
}
`);
    const result = verifyGeneratedContentGrounding({
      filePath: file,
      repoRoot: root,
    });
    assert.equal(result.status, 'INDETERMINATE');
    assert.ok(
      result.reason.includes('dynamic import with non-literal source')
      || result.details.importChecks.some((d) => d.reason.includes('dynamic_import_non_literal')),
    );
  });
});
