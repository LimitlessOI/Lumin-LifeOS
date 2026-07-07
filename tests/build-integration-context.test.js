/**
 * SYNOPSIS: Tests for the /build integration-context builder (schema digest +
 * injected-deps contract + auto-mount convention).
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  parseSchemaFromMigrations,
  selectRelevantTables,
  buildIntegrationContext,
  readInstalledPackages,
  INJECTED_DEPS_CONTRACT,
} from '../services/build-integration-context.js';

function tmpRepoWithMigrations(sqlByFile, pkg) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bic-'));
  const dir = path.join(root, 'db', 'migrations');
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, sql] of Object.entries(sqlByFile)) fs.writeFileSync(path.join(dir, name), sql);
  if (pkg) fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkg));
  return root;
}

test('parseSchemaFromMigrations extracts tables + columns, ignoring constraints', () => {
  const root = tmpRepoWithMigrations({
    '001_marketing.sql': `
      CREATE TABLE IF NOT EXISTS marketing_sessions (
        id uuid PRIMARY KEY,
        founder_id text NOT NULL,
        status text DEFAULT 'active',
        price numeric(10,2),
        created_at timestamptz DEFAULT now(),
        CONSTRAINT uq_founder UNIQUE (founder_id),
        FOREIGN KEY (founder_id) REFERENCES founders(id)
      );`,
  });
  const schema = parseSchemaFromMigrations(path.join(root, 'db', 'migrations'));
  assert.deepEqual(schema.marketing_sessions, ['id', 'founder_id', 'status', 'price', 'created_at']);
  fs.rmSync(root, { recursive: true, force: true });
});

test('parseSchemaFromMigrations handles multiple tables + public. prefix + missing dir', () => {
  const root = tmpRepoWithMigrations({
    'a.sql': 'CREATE TABLE public.a (x int, y int);',
    'b.sql': 'create table if not exists b (\n  name text,\n  n int\n);',
  });
  const schema = parseSchemaFromMigrations(path.join(root, 'db', 'migrations'));
  assert.deepEqual(schema.a, ['x', 'y']);
  assert.deepEqual(schema.b, ['name', 'n']);
  assert.deepEqual(parseSchemaFromMigrations('/no/such/dir'), {});
  fs.rmSync(root, { recursive: true, force: true });
});

test('selectRelevantTables scores by shared tokens and is bounded', () => {
  const schema = { marketing_sessions: [], marketing_pieces: [], unrelated_widgets: [], founders: [] };
  const rel = selectRelevantTables(schema, { targetFile: 'routes/marketing-session-routes.js', task: 'create marketing session', limit: 2 });
  assert.ok(rel.includes('marketing_sessions'));
  assert.ok(!rel.includes('unrelated_widgets'));
  assert.ok(rel.length <= 2);
});

test('buildIntegrationContext includes deps contract + mount convention for route module', () => {
  const root = tmpRepoWithMigrations({
    'm.sql': 'CREATE TABLE marketing_sessions (id uuid, founder_id text);',
  });
  const { context } = buildIntegrationContext({
    root,
    targetFile: 'routes/marketing-session-routes.js',
    productId: 'marketingos',
    task: 'create + list marketing sessions',
  });
  // Auto-mount convention with a derived register fn name + registry entry
  assert.match(context, /registerMarketingSessionRoutes/);
  assert.match(context, /auto-registered-product-modules\.json/);
  assert.match(context, /do NOT edit server\.js/i);
  // Injected deps contract present, and the exact anti-pattern that caused the false-done
  assert.match(context, /deps\.callCouncilMember/);
  assert.match(context, /ai-council\.js/);
  assert.match(context, /deps\.pool/);
  // Live schema surfaced with exact names
  assert.match(context, /marketing_sessions\(id, founder_id\)/);
  fs.rmSync(root, { recursive: true, force: true });
});

test('buildIntegrationContext omits mount convention for non-route targets but keeps deps + schema note', () => {
  const root = tmpRepoWithMigrations({ 'm.sql': 'CREATE TABLE x (a int);' });
  const { context } = buildIntegrationContext({
    root,
    targetFile: 'db/migrations/20260707_new.sql',
    productId: 'marketingos',
    task: 'add sessions table',
  });
  assert.doesNotMatch(context, /register[A-Z]/);
  assert.match(context, /INJECTED DEPENDENCIES/);
  fs.rmSync(root, { recursive: true, force: true });
});

test('readInstalledPackages reads prod + dev deps and dedupes; empty on missing pkg', () => {
  const root = tmpRepoWithMigrations(
    { 'm.sql': 'CREATE TABLE x (a int);' },
    { dependencies: { express: '^4', pg: '^8' }, devDependencies: { pg: '^8', eslint: '^9' } },
  );
  assert.deepEqual(readInstalledPackages(root), ['eslint', 'express', 'pg']);
  fs.rmSync(root, { recursive: true, force: true });
  assert.deepEqual(readInstalledPackages('/no/such/repo'), []);
});

test('buildIntegrationContext lists available packages + forbids uuid/JS-side ids when schema present', () => {
  const root = tmpRepoWithMigrations(
    { 'm.sql': 'CREATE TABLE marketing_sessions (id uuid, founder_id text, created_at timestamptz);' },
    { dependencies: { express: '^4', pg: '^8' } },
  );
  const { context, packages } = buildIntegrationContext({
    root,
    targetFile: 'routes/marketing-session-routes.js',
    productId: 'marketingos',
    task: 'create marketing sessions',
  });
  assert.deepEqual(packages, ['express', 'pg']);
  assert.match(context, /AVAILABLE NPM PACKAGES/);
  assert.match(context, /express, pg/);
  // The exact class that caused the uuid false-done: don't invent ids / import uuid
  assert.match(context, /DB-DEFAULTED/);
  assert.match(context, /do NOT import a uuid package/i);
  fs.rmSync(root, { recursive: true, force: true });
});

test('INJECTED_DEPS_CONTRACT matches what the boot actually injects', () => {
  const names = INJECTED_DEPS_CONTRACT.map(([n]) => n);
  for (const required of ['pool', 'requireKey', 'callCouncilMember', 'logger', 'baseUrl', 'commitToGitHub', 'commitManyToGitHub']) {
    assert.ok(names.includes(required), `deps contract must document ${required}`);
  }
});
