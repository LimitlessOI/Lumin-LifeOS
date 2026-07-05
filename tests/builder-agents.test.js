/**
 * SYNOPSIS: tests/builder-agents.test.js — unit tests for the model-agnostic builder agent.
 * @ssot docs/products/project-governance/PRODUCT_HOME.md
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  resolveAgentKind,
  agentAvailability,
  runBuilderAgent,
  AGENT_OPENAI,
  AGENT_CLAUDE_CLI,
} from '../scripts/autonomy/builder-agents.mjs';

test('resolveAgentKind honors explicit BUILDER_AGENT then falls back on key presence', () => {
  assert.equal(resolveAgentKind({ BUILDER_AGENT: 'openai' }), AGENT_OPENAI);
  assert.equal(resolveAgentKind({ BUILDER_AGENT: 'claude-cli' }), AGENT_CLAUDE_CLI);
  assert.equal(resolveAgentKind({ OPENAI_API_KEY: `sk-${'x'.repeat(20)}` }), AGENT_OPENAI);
  assert.equal(resolveAgentKind({}), AGENT_CLAUDE_CLI);
});

test('agentAvailability reflects key/CLI presence', () => {
  assert.equal(agentAvailability(AGENT_OPENAI, { env: {} }).ok, false);
  assert.equal(agentAvailability(AGENT_OPENAI, { env: { OPENAI_API_KEY: `sk-${'x'.repeat(20)}` } }).ok, true);
  assert.equal(agentAvailability(AGENT_CLAUDE_CLI, { claudeBinExists: false }).ok, false);
  assert.equal(agentAvailability(AGENT_CLAUDE_CLI, { claudeBinExists: true }).ok, true);
});

test('claude-cli agent delegates to the provided claudeRunner', async () => {
  const r = await runBuilderAgent({
    kind: AGENT_CLAUDE_CLI,
    prompt: 'x',
    cwd: os.tmpdir(),
    claudeRunner: async () => ({ exitCode: 0, stdout: 'done', stderr: '', elapsedMinutes: 0, toolsUsed: [], eventCount: 1 }),
  });
  assert.equal(r.exitCode, 0);
  assert.equal(r.agent, AGENT_CLAUDE_CLI);
});

test('openai agent fails closed without a key', async () => {
  const r = await runBuilderAgent({ kind: AGENT_OPENAI, prompt: 'x', cwd: os.tmpdir(), env: {} });
  assert.equal(r.exitCode, 1);
  assert.match(r.stderr, /OPENAI_API_KEY/);
});

test('openai agent aborts a hung call via per-call timeout', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (_url, opts) => new Promise((_resolve, reject) => {
    // Never resolves on its own — only the AbortController should end it.
    opts?.signal?.addEventListener('abort', () => {
      const e = new Error('aborted');
      e.name = 'AbortError';
      reject(e);
    });
  });
  try {
    const r = await runBuilderAgent({
      kind: AGENT_OPENAI,
      prompt: 'x',
      cwd: os.tmpdir(),
      env: { OPENAI_API_KEY: `sk-${'x'.repeat(20)}`, BUILDER_OPENAI_CALL_TIMEOUT_MS: '50' },
    });
    assert.equal(r.exitCode, 1);
    assert.match(r.stderr, /timed out/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('openai tool-loop writes allowed files, jails paths, enforces allowlist', async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'builder-wt-'));
  const originalFetch = globalThis.fetch;
  let turn = 0;
  globalThis.fetch = async () => {
    turn += 1;
    if (turn === 1) {
      return {
        ok: true,
        json: async () => ({
          usage: { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 },
          choices: [{ message: { content: '', tool_calls: [
            { id: 'c1', function: { name: 'write_file', arguments: JSON.stringify({ path: 'services/foo.js', content: 'export const x = 1;\n' }) } },
            { id: 'c2', function: { name: 'write_file', arguments: JSON.stringify({ path: '../escape.js', content: 'bad' }) } },
            { id: 'c3', function: { name: 'write_file', arguments: JSON.stringify({ path: 'notallowed.js', content: 'nope' }) } },
          ] } }],
        }),
      };
    }
    return {
      ok: true,
      json: async () => ({
        usage: { prompt_tokens: 2000, completion_tokens: 500, total_tokens: 2500 },
        choices: [{ message: { content: '', tool_calls: [
          { id: 'c4', function: { name: 'node_check', arguments: JSON.stringify({ path: 'services/foo.js' }) } },
          { id: 'c5', function: { name: 'finish', arguments: JSON.stringify({ summary: 'wrote foo' }) } },
        ] } }],
      }),
    };
  };
  try {
    const r = await runBuilderAgent({
      kind: AGENT_OPENAI,
      prompt: 'make foo',
      cwd,
      env: { OPENAI_API_KEY: `sk-${'x'.repeat(20)}` },
      allowedFiles: ['services/foo.js'],
    });
    assert.equal(r.exitCode, 0);
    assert.equal(r.agent, AGENT_OPENAI);
    assert.ok(fs.existsSync(path.join(cwd, 'services/foo.js')), 'allowed file written');
    assert.ok(!fs.existsSync(path.resolve(cwd, '../escape.js')), 'path escape blocked');
    assert.ok(!fs.existsSync(path.join(cwd, 'notallowed.js')), 'allowlist enforced');
    assert.ok(r.toolsUsed.includes('node_check'), 'node_check executed');
    assert.match(r.stdout, /wrote foo/);
    assert.equal(r.usage.totalTokens, 4000, 'usage summed across turns');
    assert.equal(r.usage.calls, 2, 'usage call count');
    // gpt-4o-mini default: (3000/1e6*0.15) + (1000/1e6*0.6) = 0.00045 + 0.0006 = 0.00105
    assert.equal(r.usage.estimatedUsd, 0.00105, 'estimated cost computed');
  } finally {
    globalThis.fetch = originalFetch;
    fs.rmSync(cwd, { recursive: true, force: true });
  }
});
