/**
 * SYNOPSIS: js — tests/runtime-env-builderos-refresh.test.js.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const MODULE_PATH = pathToFileURL(
  path.join(process.cwd(), 'config/runtime-env.js'),
).href;

test('refreshBuilderOsEnvFallback loads updated .env.builderos values without restart', async () => {
  const originalCwd = process.cwd();
  const originalCommandKey = process.env.COMMAND_CENTER_KEY;
  const originalOpenAiKey = process.env.OPENAI_API_KEY;
  const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'builderenv-refresh-'));

  try {
    process.chdir(tmp);
    process.env.COMMAND_CENTER_KEY = process.env.COMMAND_CENTER_KEY || 'test-command-key';
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/testdb';
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    fs.writeFileSync(
      path.join(tmp, '.env.builderos'),
      'OPENAI_API_KEY=test-openai-1\nANTHROPIC_API_KEY=test-anthropic-1\n',
      'utf8',
    );

    const runtimeEnv = await import(`${MODULE_PATH}?case=${Date.now()}`);
    runtimeEnv.loadRuntimeEnv();
    assert.equal(process.env.OPENAI_API_KEY, 'test-openai-1');
    assert.equal(process.env.ANTHROPIC_API_KEY, 'test-anthropic-1');

    delete process.env.OPENAI_API_KEY;
    fs.writeFileSync(
      path.join(tmp, '.env.builderos'),
      'OPENAI_API_KEY=test-openai-2\nANTHROPIC_API_KEY=test-anthropic-1\n',
      'utf8',
    );

    const refreshed = runtimeEnv.refreshBuilderOsEnvFallback();
    assert.equal(refreshed, true);
    assert.equal(process.env.OPENAI_API_KEY, 'test-openai-2');
    assert.equal(process.env.ANTHROPIC_API_KEY, 'test-anthropic-1');
  } finally {
    process.chdir(originalCwd);
    if (originalCommandKey === undefined) delete process.env.COMMAND_CENTER_KEY;
    else process.env.COMMAND_CENTER_KEY = originalCommandKey;
    if (originalOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalOpenAiKey;
    if (originalAnthropicKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
