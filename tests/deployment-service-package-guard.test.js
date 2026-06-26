/**
 * SYNOPSIS: Regression tests for the package.json protected-scripts guard in
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 * Regression tests for the package.json protected-scripts guard in
 * `services/deployment-service.js → commitToGitHub`.
 *
 * The guard fires before any GitHub API call, so these tests require no
 * real credentials and no network access.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modPath = path.join(__dirname, '..', 'services', 'deployment-service.js');
const { createDeploymentService } = await import(pathToFileURL(modPath).href);

const VALID_PKG = JSON.stringify({
  scripts: {
    test: 'node --test tests/site-builder-postmark-helper.test.js tests/tc-morning-digest-service-module.test.js tests/operator-runtime-status-freshness.test.js tests/deployment-service-package-guard.test.js',
    'repo:sync-check': 'node scripts/repo-sync-check.mjs',
    'lifeos:verify:ui-map': 'node scripts/verify-dashboard-ui-map.mjs',
  },
});

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

test('guard — valid package.json does not throw compliance error', async () => {
  const { commitToGitHub } = makeService();
  try {
    await commitToGitHub('package.json', VALID_PKG, 'test commit');
  } catch (err) {
    assert.ok(
      !err.message.includes('commitToGitHub BLOCKED: package.json is missing'),
      `Guard incorrectly blocked a valid package.json: ${err.message}`,
    );
  }
});

test('guard — missing repo:sync-check script throws', async () => {
  const { commitToGitHub } = makeService();
  const pkg = JSON.stringify({
    scripts: {
      test: 'node --test tests/site-builder-postmark-helper.test.js tests/tc-morning-digest-service-module.test.js tests/operator-runtime-status-freshness.test.js',
      'lifeos:verify:ui-map': 'node scripts/verify-dashboard-ui-map.mjs',
    },
  });
  await assert.rejects(
    () => commitToGitHub('package.json', pkg, 'test'),
    (err) => {
      assert.ok(err.message.includes('repo:sync-check'), `Expected 'repo:sync-check' in error, got: ${err.message}`);
      return true;
    },
  );
});

test('guard — missing lifeos:verify:ui-map script throws', async () => {
  const { commitToGitHub } = makeService();
  const pkg = JSON.stringify({
    scripts: {
      test: 'node --test tests/site-builder-postmark-helper.test.js tests/tc-morning-digest-service-module.test.js tests/operator-runtime-status-freshness.test.js',
      'repo:sync-check': 'node scripts/repo-sync-check.mjs',
    },
  });
  await assert.rejects(
    () => commitToGitHub('package.json', pkg, 'test'),
    (err) => {
      assert.ok(err.message.includes('lifeos:verify:ui-map'), `Expected 'lifeos:verify:ui-map' in error, got: ${err.message}`);
      return true;
    },
  );
});

test('guard — missing required test file throws', async () => {
  const { commitToGitHub } = makeService();
  const pkg = JSON.stringify({
    scripts: {
      test: 'node --test tests/smoke.test.js',
      'repo:sync-check': 'node scripts/repo-sync-check.mjs',
      'lifeos:verify:ui-map': 'node scripts/verify-dashboard-ui-map.mjs',
    },
  });
  await assert.rejects(
    () => commitToGitHub('package.json', pkg, 'test'),
    (err) => {
      assert.ok(
        err.message.includes('operator-runtime-status-freshness.test.js') ||
        err.message.includes('site-builder-postmark-helper.test.js') ||
        err.message.includes('tc-morning-digest-service-module.test.js'),
        `Expected missing test file in error, got: ${err.message}`,
      );
      return true;
    },
  );
});

test('guard — invalid JSON throws', async () => {
  const { commitToGitHub } = makeService();
  await assert.rejects(
    () => commitToGitHub('package.json', '{not valid json', 'test'),
    /commitToGitHub BLOCKED: package\.json content is not valid JSON/,
  );
});

test('guard — non-package.json files are not blocked by guard', async () => {
  const { commitToGitHub } = makeService();
  try {
    await commitToGitHub('services/some-service.js', '// valid js', 'test');
  } catch (err) {
    assert.ok(
      !err.message.includes('commitToGitHub BLOCKED: package.json is missing'),
      `Guard should not fire for non-package.json files`,
    );
  }
});

test('safe-scope — startup/register-runtime-routes.js blocked without allowRouteRegistration', async () => {
  const { commitToGitHub } = makeService();
  await assert.rejects(
    () => commitToGitHub('startup/register-runtime-routes.js', '// routes', 'test'),
    /builder-safe-scope/,
  );
});

test('safe-scope — allowRouteRegistration bypasses startup block for register-runtime-routes.js', async () => {
  const { commitToGitHub } = makeService();
  try {
    await commitToGitHub(
      'startup/register-runtime-routes.js',
      'export async function registerRuntimeRoutes() {}',
      'wire test',
      'main',
      { allowRouteRegistration: true },
    );
  } catch (err) {
    assert.ok(
      !err.message.includes('builder-safe-scope'),
      `Route registration bypass should skip safe-scope block: ${err.message}`,
    );
  }
});
