/**
 * SYNOPSIS: Regression tests for the never-stop file-placement + blueprint-priority
 * gate wired into services/deployment-service.js.
 *
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modPath = path.join(__dirname, '..', 'services', 'deployment-service.js');
const { createDeploymentService } = await import(pathToFileURL(modPath).href);

function makeService() {
  return createDeploymentService({
    pool: { query: async () => ({ rows: [] }) },
    GITHUB_TOKEN: 'fake-token-for-guard-test',
    GITHUB_REPO: 'owner/repo',
    GITHUB_DEPLOY_BRANCH: 'main',
    systemMetrics: null,
    broadcastToAll: () => {},
    __dirname: path.join(__dirname, '..'),
  });
}

test('never-stop gate — new services/ file without @ssot is blocked', async () => {
  const { commitToGitHub } = makeService();
  await assert.rejects(
    () => commitToGitHub('services/orphan-service.js', 'export function foo() {}', 'test commit'),
    /FILE_PLACEMENT_VIOLATION|file-placement authority violation/,
  );
});

test('never-stop gate — new services/ file with @ssot but unregistered product is blocked', async () => {
  const { commitToGitHub } = makeService();
  const content = `/**\n * @ssot docs/products/not-in-bp-priority/PRODUCT_HOME.md\n */\nexport function foo() {}`;
  await assert.rejects(
    () => commitToGitHub('services/orphan-service-2.js', content, 'test commit'),
    /authority violation/,
  );
});

test('never-stop gate — new services/ file with valid @ssot to BP-registered product is allowed through gate (fails on fake GH)', async () => {
  const { commitToGitHub } = makeService();
  const content = `/**\n * @ssot docs/products/builderos/PRODUCT_HOME.md\n */\nexport function foo() {}`;
  try {
    await commitToGitHub('services/builderos-new-service.js', content, 'test commit');
  } catch (err) {
    assert.ok(
      !/file-placement authority violation|blueprint-priority authority violation/.test(err.message),
      `Gate should not block a valid @ssot to a BP-registered product: ${err.message}`,
    );
  }
});

test('never-stop gate — commitManyToGitHub blocks a batch with a new un-tagged services/ file', async () => {
  const { commitManyToGitHub } = makeService();
  await assert.rejects(
    () => commitManyToGitHub(
      [
        { path: 'services/orphan-a.js', content: 'export function a() {}' },
        { path: 'services/orphan-b.js', content: 'export function b() {}' },
      ],
      'test batch',
    ),
    /FILE_PLACEMENT_VIOLATION|file-placement authority violation/,
  );
});

test('never-stop gate — existing services/ file bypasses new-file gate even without @ssot', async () => {
  const { commitToGitHub } = makeService();
  // services/deployment-service.js is already tracked; modifying it should not
  // be gated by the new-file file-placement check.
  try {
    await commitToGitHub('services/deployment-service.js', '// already tracked', 'test commit');
  } catch (err) {
    assert.ok(
      !/file-placement authority violation/.test(err.message),
      `Existing-file guard should not raise file-placement: ${err.message}`,
    );
  }
});
