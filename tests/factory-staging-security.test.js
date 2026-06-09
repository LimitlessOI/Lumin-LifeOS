/**
 * Factory staging security regression tests.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import test from 'node:test';
import express from 'express';
import { dispatchExecuteStep, resolveRepoPath } from '../factory-staging/factory-core/builder/run-step.js';
import { registerFactoryRoutes } from '../factory-staging/startup/register-routes.js';

const TSOS_METRICS_RELATIVE_PATH = 'factory-staging/data/tsos-step-metrics.jsonl';

function sha256Text(text) {
  return crypto.createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
}

function removeIfExists(relativePath) {
  const abs = resolveRepoPath(relativePath);
  if (fs.existsSync(abs)) fs.rmSync(abs, { recursive: true, force: true });
}

function executeSecurityStep(step, body = {}) {
  return dispatchExecuteStep({
    mission_id: body.mission_id || 'SECURITY-REGRESSION',
    blueprint_id: body.blueprint_id || 'security-regression',
    step,
    ...body,
  });
}

function snapshotFile(relativePath) {
  const abs = resolveRepoPath(relativePath);
  if (!fs.existsSync(abs)) return { relativePath, existed: false };
  return { relativePath, existed: true, content: fs.readFileSync(abs) };
}

function restoreFile(snapshot) {
  const abs = resolveRepoPath(snapshot.relativePath);
  if (!snapshot.existed) {
    removeIfExists(snapshot.relativePath);
    return;
  }
  fs.mkdirSync(resolveRepoPath(pathDirname(snapshot.relativePath)), { recursive: true });
  fs.writeFileSync(abs, snapshot.content);
}

function pathDirname(relativePath) {
  return relativePath.split('/').slice(0, -1).join('/') || '.';
}

async function withFactoryHttpServer(fn) {
  const app = express();
  app.use(express.json());
  registerFactoryRoutes(app);
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const { port } = server.address();
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

test('factory execute-step blocks target traversal outside sandbox', () => {
  const target = 'factory-staging/escape/../../factory_stage_escape_probe.txt';
  removeIfExists('factory_stage_escape_probe.txt');

  const { httpStatus, body } = executeSecurityStep({
    step_id: 'TRAVERSAL-PROBE',
    action_type: 'write_file_exact',
    target_file: target,
    sandbox_boundary: 'factory-staging/**',
    exact_inputs: { exact_content: 'probe-after-fix' },
  });

  assert.equal(httpStatus, 422);
  assert.equal(body.gap_type, 'authority_violation');
  assert.equal(fs.existsSync(resolveRepoPath('factory_stage_escape_probe.txt')), false);
});

test('factory execute-step blocks source reads outside authorized factory roots', () => {
  const source = 'factory_source_escape_probe.txt';
  const target = 'factory-staging/test-fixtures/source-escape-probe.txt';
  fs.writeFileSync(resolveRepoPath(source), 'secret-after-fix', 'utf8');
  removeIfExists(target);

  try {
    const { httpStatus, body } = executeSecurityStep({
      step_id: 'SOURCE-PROBE',
      action_type: 'write_file_exact',
      target_file: target,
      sandbox_boundary: 'factory-staging/**',
      exact_inputs: { content_source_path: source },
    });

    assert.equal(httpStatus, 422);
    assert.equal(body.gap_type, 'authority_violation');
    assert.equal(fs.existsSync(resolveRepoPath(target)), false);
  } finally {
    removeIfExists(source);
    removeIfExists(target);
  }
});

test('factory execute-step still allows valid sandbox writes', () => {
  const target = 'factory-staging/test-fixtures/security-legit-output.txt';
  const content = 'legit factory write';
  const metricsSnapshot = snapshotFile(TSOS_METRICS_RELATIVE_PATH);
  removeIfExists(target);

  try {
    const { httpStatus, body } = executeSecurityStep({
      step_id: 'LEGIT-WRITE',
      action_type: 'write_file_exact',
      target_file: target,
      sandbox_boundary: 'factory-staging/**',
      exact_inputs: { exact_content: content },
      exact_output_contract: { type: 'byte_exact_copy', sha256: sha256Text(content) },
    });

    assert.equal(httpStatus, 200);
    assert.equal(body.builder.status, 'DONE');
    assert.equal(fs.readFileSync(resolveRepoPath(target), 'utf8'), content);
  } finally {
    restoreFile(metricsSnapshot);
    removeIfExists(target);
  }
});

test('factory execute-step rolls back writes when SENTRY rejects the result', () => {
  const missionId = 'SECURITY-ROLLBACK-TEST';
  const missionDir = `builderos-reboot/MISSIONS/${missionId}`;
  const acceptancePath = `${missionDir}/ACCEPTANCE_TESTS.json`;
  const target = 'factory-staging/test-fixtures/rollback-output.txt';
  removeIfExists(missionDir);
  removeIfExists(target);
  fs.mkdirSync(resolveRepoPath(missionDir), { recursive: true });
  fs.writeFileSync(
    resolveRepoPath(acceptancePath),
    JSON.stringify([
      {
        test_id: 'ROLLBACK-SHA',
        step_id: 'ROLLBACK-PROBE',
        type: 'file_sha256_matches',
        target,
        expected_sha256: sha256Text('expected-different-content'),
      },
    ]),
    'utf8'
  );

  try {
    const { httpStatus, body } = executeSecurityStep(
      {
        step_id: 'ROLLBACK-PROBE',
        action_type: 'write_file_exact',
        target_file: target,
        sandbox_boundary: 'factory-staging/**',
        exact_inputs: { exact_content: 'actual-content' },
      },
      { mission_id: missionId }
    );

    assert.equal(httpStatus, 409);
    assert.equal(body.status, 'SENTRY_FAILED');
    assert.equal(fs.existsSync(resolveRepoPath(target)), false);
  } finally {
    removeIfExists(missionDir);
    removeIfExists(target);
  }
});

test('factory HTTP mutation routes require configured command key', async () => {
  const oldFactoryKey = process.env.FACTORY_COMMAND_KEY;
  const oldCommandKey = process.env.COMMAND_CENTER_KEY;
  process.env.FACTORY_COMMAND_KEY = 'factory-test-key';
  delete process.env.COMMAND_CENTER_KEY;

  try {
    await withFactoryHttpServer(async (baseUrl) => {
      const step = {
        step_id: 'HTTP-AUTH-PROBE',
        action_type: 'write_file_exact',
        target_file: 'factory-staging/http-auth/../../http_auth_escape_probe.txt',
        sandbox_boundary: 'factory-staging/**',
        exact_inputs: { exact_content: 'should-not-write' },
      };

      const unauthorized = await fetch(`${baseUrl}/factory/execute-step`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mission_id: 'SECURITY-HTTP', step }),
      });
      assert.equal(unauthorized.status, 401);

      const authorized = await fetch(`${baseUrl}/factory/execute-step`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-command-key': 'factory-test-key' },
        body: JSON.stringify({ mission_id: 'SECURITY-HTTP', step }),
      });
      assert.equal(authorized.status, 422);
      assert.equal(fs.existsSync(resolveRepoPath('http_auth_escape_probe.txt')), false);
    });
  } finally {
    if (oldFactoryKey === undefined) {
      delete process.env.FACTORY_COMMAND_KEY;
    } else {
      process.env.FACTORY_COMMAND_KEY = oldFactoryKey;
    }
    if (oldCommandKey === undefined) {
      delete process.env.COMMAND_CENTER_KEY;
    } else {
      process.env.COMMAND_CENTER_KEY = oldCommandKey;
    }
    removeIfExists('http_auth_escape_probe.txt');
  }
});
