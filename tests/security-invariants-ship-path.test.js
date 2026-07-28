/**
 * SYNOPSIS: Proves the security-invariant gate covers the machine ship path.
 *
 * The unit tests in security-invariants.test.js prove the checker judges content
 * correctly. This file proves the thing that actually failed twice on
 * 2026-07-27: that an auth-stripping payload sent to the mandated ship path
 * (execute-batch) is refused BEFORE any commit function is reached.
 *
 * commitManyToGitHub is injected as a stub that records calls, so nothing can be
 * committed by this test even if the gate regresses.
 *
 * @ssot docs/products/tc-service/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLifeOSCouncilBuilderRoutes } from '../routes/lifeos-council-builder-routes.js';
import { createDeploymentService } from '../services/deployment-service.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROTECTED = 'routes/tc-routes.js';
const realContent = readFileSync(path.join(ROOT, PROTECTED), 'utf8');

const quietLogger = {
  info() {}, warn() {}, error() {}, debug() {}, child() { return quietLogger; },
};

function harness() {
  const commitCalls = [];
  const routes = new Map();
  const app = {
    post(p, ...rest) { routes.set(`POST ${p}`, rest[rest.length - 1]); },
    get(p, ...rest) { routes.set(`GET ${p}`, rest[rest.length - 1]); },
    put(p, ...rest) { routes.set(`PUT ${p}`, rest[rest.length - 1]); },
    delete(p, ...rest) { routes.set(`DELETE ${p}`, rest[rest.length - 1]); },
    use() {},
  };

  const mount = createLifeOSCouncilBuilderRoutes({
    pool: null,
    requireKey: (req, res, next) => next(),
    logger: quietLogger,
    commitManyToGitHub: async (fileEntries, message, branch) => {
      commitCalls.push({ fileEntries, message, branch });
      return {
        ok: true,
        committed: true,
        sha: 'stub0000000000000000000000000000000000000',
        commit_sha: 'stub0000000000000000000000000000000000000',
        changed_files: fileEntries.map((e) => e.path),
      };
    },
  });
  mount(app);

  const handler = routes.get('POST /api/v1/lifeos/builder/execute-batch');
  assert.ok(handler, 'execute-batch must be mounted');
  return { handler, commitCalls };
}

function fakeRes() {
  const out = { statusCode: 200, body: null };
  return {
    status(code) { out.statusCode = code; return this; },
    json(payload) { out.body = payload; return this; },
    set() { return this; },
    setHeader() { return this; },
    out,
  };
}

async function callBatch(handler, files, message = '[system-build] test') {
  const res = fakeRes();
  await handler({ body: { files, commit_message: message }, headers: {} }, res, () => {});
  return res.out;
}

test('REFUSES an auth-stripping payload on the machine ship path, and never commits', async () => {
  const { handler, commitCalls } = harness();
  const stripped = realContent.replaceAll('requireLifeOSAdmin', 'noAuthAtAll');

  const out = await callBatch(handler, [{ target_file: PROTECTED, output: stripped }]);

  assert.equal(out.statusCode, 422, 'auth-stripping ship must be refused');
  assert.equal(out.body.ok, false);
  assert.equal(out.body.committed, false);
  assert.equal(out.body.code, 'SECURITY_INVARIANT_VIOLATION');
  assert.equal(out.body.security_invariant_findings.length, 1);
  assert.equal(out.body.security_invariant_findings[0].file, PROTECTED);
  assert.ok(
    out.body.security_invariant_findings[0].proposed_solution,
    'refusal must carry a concrete fix (SO-002 solution-mandatory)',
  );
  assert.equal(commitCalls.length, 0, 'commit must never be reached when an invariant is violated');
});

test('lets an unrelated file through to the commit function', async () => {
  const { handler, commitCalls } = harness();
  const out = await callBatch(handler, [
    { target_file: 'docs/products/tc-service/NOTES.md', output: '# notes\n\nreal content here\n' },
  ]);

  assert.equal(out.statusCode, 200, `expected pass-through, got ${out.statusCode}: ${JSON.stringify(out.body)}`);
  assert.equal(commitCalls.length, 1, 'a clean ship must reach the commit function');
  assert.equal(commitCalls[0].fileEntries[0].path, 'docs/products/tc-service/NOTES.md');
});

test('the lowest choke point refuses too, before any network call', async () => {
  // scripts/system-commit-files.mjs calls commitManyToGitHub directly, bypassing the
  // builder route entirely — so the route gate alone would leave that path open.
  let fetchCalls = 0;
  const svc = createDeploymentService({
    GITHUB_TOKEN: 'fake-token-for-test',
    GITHUB_REPO: 'owner/repo',
    GITHUB_DEPLOY_BRANCH: 'main',
    fetch: async () => { fetchCalls += 1; throw new Error('network must not be reached'); },
    logger: quietLogger,
  });
  const stripped = realContent.replaceAll('requireLifeOSAdmin', 'noAuthAtAll');

  await assert.rejects(
    () => svc.commitManyToGitHub([{ path: PROTECTED, content: stripped }], 'should never land'),
    /BLOCKED: security invariant violation/,
  );
  await assert.rejects(
    () => svc.commitToGitHub(PROTECTED, stripped, 'should never land'),
    /BLOCKED: security invariant violation/,
  );
  assert.equal(fetchCalls, 0, 'must refuse before talking to GitHub at all');
});

test('lets the protected file through when the invariant is intact', async () => {
  const { handler, commitCalls } = harness();
  const out = await callBatch(handler, [{ target_file: PROTECTED, output: realContent }]);

  assert.equal(out.statusCode, 200, `intact file must not be blocked, got ${JSON.stringify(out.body)}`);
  assert.equal(commitCalls.length, 1, 'gate must not block a legitimate change to the protected file');
});
