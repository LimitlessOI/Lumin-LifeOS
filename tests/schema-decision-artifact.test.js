/**
 * SYNOPSIS: Proves the Schema Decision Artifact gate — one frozen, hashed answer
 * set consumed identically by every factory.
 *
 * The failure being prevented: two lanes reading the same underspecified sentence
 * and building two different schemas, which presents as builder disagreement when
 * it is actually a specification defect. Those have opposite fixes, so confusing
 * them wastes the debugging.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createSchemaDecisionArtifact,
  loadSchemaDecisionArtifact,
  verifySchemaAuthority,
  artifactHash,
  ARTIFACT_STATUS,
} from '../scripts/schema-decision-artifact.mjs';

const STORES = ['TaskStore', 'AuthorityLedger'];

function tmpArtifact(artifact) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-artifact-'));
  const file = path.join(dir, 'artifact.json');
  fs.writeFileSync(file, `${JSON.stringify(artifact, null, 2)}\n`);
  return file;
}

test('an artifact with no answers is AWAITING_FOUNDER and names what is missing', () => {
  const a = createSchemaDecisionArtifact({ requiredStores: STORES });
  assert.equal(a.status, ARTIFACT_STATUS.AWAITING_FOUNDER);
  assert.deepEqual(a.unanswered_stores, ['AuthorityLedger', 'TaskStore']);
});

test('answering every store seals the artifact', () => {
  const a = createSchemaDecisionArtifact({
    requiredStores: STORES,
    answers: {
      TaskStore: { columns: ['id'], ratified_by: 'founder' },
      AuthorityLedger: { columns: ['id'], ratified_by: 'founder' },
    },
    provenance: { decided_by: 'founder', decided_at: '2026-08-12T00:00:00Z' },
  });
  assert.equal(a.status, ARTIFACT_STATUS.SEALED);
  assert.deepEqual(a.unanswered_stores, []);
});

test('the hash covers the answers, so changing one invalidates the artifact', () => {
  const a = createSchemaDecisionArtifact({ requiredStores: STORES, answers: { TaskStore: { columns: ['id'] } } });
  const before = a.artifact_hash;
  a.answers.TaskStore.columns.push('secretly_added');
  assert.notEqual(artifactHash(a), before, 'an edited answer must not keep its old hash');

  const file = tmpArtifact(a);
  const loaded = loadSchemaDecisionArtifact(file);
  assert.equal(loaded.ok, false);
  assert.equal(loaded.reason, 'ARTIFACT_HASH_MISMATCH');
});

test('the hash ignores key order, so reformatting does not break a valid artifact', () => {
  const a = createSchemaDecisionArtifact({ requiredStores: STORES, answers: { TaskStore: { b: 2, a: 1 } } });
  const reordered = { ...a, answers: { TaskStore: { a: 1, b: 2 } } };
  assert.equal(artifactHash(reordered), a.artifact_hash);
});

test('a missing artifact blocks rather than defaulting', () => {
  const r = verifySchemaAuthority({ requiredStores: STORES, artifactPath: '/nonexistent/artifact.json' });
  assert.equal(r.ok, false);
  assert.equal(r.defects[0].id, 'NO_ARTIFACT');
  assert.equal(r.defects[0].authority, 'founder');
});

test('an unanswered store blocks the build and routes to the founder', () => {
  const file = tmpArtifact(createSchemaDecisionArtifact({ requiredStores: STORES, answers: { TaskStore: { columns: ['id'] } } }));
  const r = verifySchemaAuthority({ requiredStores: STORES, artifactPath: file });
  assert.equal(r.ok, false);
  const d = r.defects.find((x) => x.id === 'UNANSWERED_STORE_CONTRACT');
  assert.deepEqual(d.stores, ['AuthorityLedger']);
  assert.equal(d.origin, 'founder_decision');
});

test('a proposed answer the founder never ratified is refused, not counted', () => {
  const file = tmpArtifact(
    createSchemaDecisionArtifact({
      requiredStores: STORES,
      answers: {
        TaskStore: { columns: ['id'], proposed_by: 'architect' },
        AuthorityLedger: { columns: ['id'], ratified_by: 'founder', ratified_at: '2026-08-12T00:00:00Z' },
      },
    })
  );
  const r = verifySchemaAuthority({ requiredStores: STORES, artifactPath: file });
  assert.equal(r.ok, false);
  const d = r.defects.find((x) => x.id === 'UNRATIFIED_SCHEMA_ANSWER');
  assert.deepEqual(d.stores, ['TaskStore'], 'only the unratified proposal is refused');
  assert.equal(d.authority, 'founder');
});

test('a fully ratified artifact passes', () => {
  const file = tmpArtifact(
    createSchemaDecisionArtifact({
      requiredStores: STORES,
      answers: {
        TaskStore: { columns: ['id'], ratified_by: 'founder' },
        AuthorityLedger: { columns: ['id'], ratified_by: 'founder' },
      },
    })
  );
  const r = verifySchemaAuthority({ requiredStores: STORES, artifactPath: file });
  assert.equal(r.ok, true);
});

test('two factories citing different artifact hashes is caught as specification divergence', () => {
  const artifact = createSchemaDecisionArtifact({
    requiredStores: STORES,
    answers: {
      TaskStore: { columns: ['id'], ratified_by: 'founder' },
      AuthorityLedger: { columns: ['id'], ratified_by: 'founder' },
    },
  });
  const file = tmpArtifact(artifact);
  const r = verifySchemaAuthority({
    requiredStores: STORES,
    artifactPath: file,
    citedHashes: { 'factory-1': artifact.artifact_hash, 'factory-2': 'deadbeef' },
  });
  assert.equal(r.ok, false);
  const d = r.defects.find((x) => x.id === 'FACTORY_CITES_STALE_SCHEMA_ARTIFACT');
  assert.equal(d.factory_id, 'factory-2');
  assert.match(d.detail, /misread as builder disagreement/);
});

test('both factories citing the sealed hash passes', () => {
  const artifact = createSchemaDecisionArtifact({
    requiredStores: STORES,
    answers: {
      TaskStore: { columns: ['id'], ratified_by: 'founder' },
      AuthorityLedger: { columns: ['id'], ratified_by: 'founder' },
    },
  });
  const file = tmpArtifact(artifact);
  const r = verifySchemaAuthority({
    requiredStores: STORES,
    artifactPath: file,
    citedHashes: { 'factory-1': artifact.artifact_hash, 'factory-2': artifact.artifact_hash },
  });
  assert.equal(r.ok, true);
  assert.deepEqual(r.defects, []);
});
