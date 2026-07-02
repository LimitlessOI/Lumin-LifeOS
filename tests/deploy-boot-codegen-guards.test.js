/**
 * SYNOPSIS: Static regression guards for the two bugs that caused the 2026-07-02
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 * Static regression guards for the two bugs that caused the 2026-07-02 outage:
 *   1. `node` launched as a bare PID 1 in the Dockerfile — node-as-PID-1 does not
 *      ignore SIGPIPE, so the pino logger's first stdout write killed the process
 *      before it bound the port (every deploy "succeeded" but served 0 bytes).
 *   2. OpenAI-native codegen (gpt-5.x) sent `max_tokens`, which those models reject
 *      with HTTP 400 — the self-build loop was silently dead at the codegen step.
 *
 * These read source files only (no network, no credentials, no runtime) so they
 * fail fast in CI if either outage fix is ever reverted.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

test('Dockerfile — node is not launched as a bare PID 1 (SIGPIPE guard)', () => {
  const dockerfile = read('Dockerfile');
  const cmdLine = dockerfile
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('CMD'))
    .pop();

  assert.ok(cmdLine, 'Dockerfile must define a CMD');

  // Exec-form `CMD ["node", ...]` makes node PID 1 (does NOT ignore SIGPIPE).
  const bareNodeExecForm = /^CMD\s*\[\s*"node"/.test(cmdLine);
  assert.ok(
    !bareNodeExecForm,
    `Dockerfile CMD must not run node as a bare PID 1 (exec-form ["node", ...]). ` +
      `Wrap it in a shell so node inherits SIGPIPE=ignore. Got: ${cmdLine}`,
  );

  // Node must be launched through a shell (sh -c "exec node ...").
  assert.match(
    cmdLine,
    /sh".*exec node/,
    `Dockerfile CMD must launch node via a shell with exec. Got: ${cmdLine}`,
  );
});

test('council codegen — OpenAI-native provider uses max_completion_tokens, not max_tokens', () => {
  const src = read('services/council-service.js');

  assert.match(
    src,
    /max_completion_tokens/,
    'council-service.js must send max_completion_tokens for OpenAI-native (gpt-5.x) models',
  );

  // The provider-specific selection must exist: openai-native → max_completion_tokens.
  const nativeBranch =
    /isOpenAiNative[\s\S]{0,120}max_completion_tokens[\s\S]{0,80}max_tokens/;
  assert.match(
    src,
    nativeBranch,
    'council-service.js must select max_completion_tokens for openai-native and max_tokens only for other OpenAI-compatible providers',
  );
});
