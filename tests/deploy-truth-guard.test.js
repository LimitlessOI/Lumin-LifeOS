/**
 * SYNOPSIS: Tests for deploy-truth guard — unproven must never round up to success.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CHECK_STATUS,
  EXIT,
  RUNTIME_PROOF,
  VERDICT,
  assessBranchDivergence,
  assessParityStability,
  buildReceipt,
  classifyRuntimeProof,
  computeVerdict,
  dockerImageMembership,
  exitCodeForVerdict,
  globToRegExp,
  missingSolutions,
  normalizeSha,
  parseDockerignore,
  shasMatch,
} from '../scripts/lib/deploy-truth-guard.mjs';
import { parsePorcelainPaths } from '../scripts/lib/deploy-truth-io.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('globToRegExp keeps * inside one path segment and lets ** cross segments', () => {
  assert.ok(globToRegExp('docs/*').test('docs/README.md'));
  assert.ok(!globToRegExp('docs/*').test('docs/products/INDEX.md'));
  assert.ok(globToRegExp('docs/products/**').test('docs/products/a/b/PRODUCT_HOME.md'));
  assert.ok(globToRegExp('*.log').test('server.log'));
  assert.ok(!globToRegExp('*.log').test('logs/server.log'));
});

test('parseDockerignore drops comments and blanks and marks negations', () => {
  const rules = parseDockerignore('# comment\n\nnode_modules/\n!docs/products/**\n');
  assert.equal(rules.length, 2);
  assert.equal(rules[0].negated, false);
  assert.equal(rules[1].negated, true);
  assert.equal(rules[1].pattern, 'docs/products/**');
});

test('dockerImageMembership honours directory matches and last-rule-wins negation', () => {
  const rules = parseDockerignore(['docs/*', '!docs/products/', '!docs/products/**', 'tests/', 'data/'].join('\n'));
  assert.equal(dockerImageMembership('docs/AGENT_INBOX.md', rules).in_image, false);
  assert.equal(dockerImageMembership('docs/products/lifeos/PRODUCT_HOME.md', rules).in_image, true);
  assert.equal(dockerImageMembership('tests/foo.test.js', rules).in_image, false);
  assert.equal(dockerImageMembership('data/x.json', rules).in_image, false);
  assert.equal(dockerImageMembership('routes/foo.js', rules).in_image, true);
});

test('the real .dockerignore excludes paths that a ship could wrongly call live', () => {
  const rules = parseDockerignore(fs.readFileSync(path.join(ROOT, '.dockerignore'), 'utf8'));
  // Server code and the founder interface must be in the image…
  assert.equal(dockerImageMembership('routes/tc-routes.js', rules).in_image, true);
  assert.equal(dockerImageMembership('public/overlay/lifeos-app.html', rules).in_image, true);
  // …while these are committed but never reach the container.
  assert.equal(dockerImageMembership('tests/deploy-truth-guard.test.js', rules).in_image, false);
  assert.equal(dockerImageMembership('products/receipts/DEPLOY_TRUTH_VERIFY.json', rules).in_image, false);
});

test('classifyRuntimeProof maps public assets to HTTP and server code to a probe', () => {
  const asset = classifyRuntimeProof('public/overlay/lifeos-app.html');
  assert.equal(asset.kind, RUNTIME_PROOF.HTTP_STATIC);
  assert.equal(asset.url_path, '/overlay/lifeos-app.html');

  const server = classifyRuntimeProof('routes/tc-routes.js');
  assert.equal(server.kind, RUNTIME_PROOF.BEHAVIOR_PROBE_REQUIRED);
  assert.match(server.proposed_solution, /--probe/);

  const docs = classifyRuntimeProof('docs/products/lifeos/PRODUCT_HOME.md');
  assert.equal(docs.kind, RUNTIME_PROOF.NO_RUNTIME_SURFACE);

  const excluded = classifyRuntimeProof('routes/tc-routes.js', { inImage: false });
  assert.equal(excluded.kind, RUNTIME_PROOF.NOT_IN_IMAGE);
  assert.match(excluded.proposed_solution, /dockerignore/i);
});

test('every unprovable classification carries a concrete next action', () => {
  for (const p of ['routes/a.js', 'docs/a.md', 'weird/a.txt']) {
    const c = classifyRuntimeProof(p);
    if (c.kind !== RUNTIME_PROOF.HTTP_STATIC) {
      assert.ok(c.proposed_solution && c.proposed_solution.length > 20, `${p} needs a solution`);
    }
  }
});

test('assessBranchDivergence refuses to overwrite a file the branch moved', () => {
  const r = assessBranchDivergence({
    branch: 'main',
    localBranch: 'devin/x',
    behind: 3,
    behindFiles: ['routes/tc-routes.js', 'docs/CONTINUITY_LOG.md'],
    aheadFiles: [],
    shipPaths: ['routes/tc-routes.js'],
  });
  assert.equal(r.status, CHECK_STATUS.FAIL);
  assert.equal(r.reason, 'STALE_BASE_WOULD_REVERT_REMOTE_CHANGES');
  assert.deepEqual(r.clobbered_files, ['routes/tc-routes.js']);
  assert.match(r.proposed_solution, /rebase/);
});

test('assessBranchDivergence tolerates being behind when no shipped path moved', () => {
  const r = assessBranchDivergence({
    behind: 5,
    behindFiles: ['services/other.js'],
    aheadFiles: [],
    shipPaths: ['routes/tc-routes.js'],
  });
  assert.equal(r.status, CHECK_STATUS.PASS);
  assert.equal(r.reason, 'DIVERGED_BUT_SHIP_PATHS_UNAFFECTED');
});

test('assessBranchDivergence blocks partial application unless allowed', () => {
  const input = {
    ahead: 2,
    aheadFiles: ['routes/tc-routes.js', 'services/tc-browser-agent.js'],
    behindFiles: [],
    shipPaths: ['routes/tc-routes.js'],
  };
  const blocked = assessBranchDivergence(input);
  assert.equal(blocked.status, CHECK_STATUS.FAIL);
  assert.equal(blocked.reason, 'PARTIAL_APPLICATION_LOCAL_COMMITS_NOT_SHIPPED');
  assert.deepEqual(blocked.stranded_files, ['services/tc-browser-agent.js']);

  const allowed = assessBranchDivergence({ ...input, allowPartial: true });
  assert.equal(allowed.status, CHECK_STATUS.PASS);
  assert.deepEqual(allowed.stranded_files, ['services/tc-browser-agent.js']);
});

test('assessBranchDivergence passes cleanly when local matches the branch', () => {
  const r = assessBranchDivergence({ ahead: 0, behind: 0, shipPaths: ['a.js'] });
  assert.equal(r.status, CHECK_STATUS.PASS);
  assert.equal(r.reason, 'LOCAL_TREE_ALIGNED_WITH_DEPLOY_BRANCH');
});

test('parity is unproven from a single sample', () => {
  const r = assessParityStability([{ serves_commit: true, in_flight: false }], { requiredSamples: 3 });
  assert.equal(r.status, CHECK_STATUS.UNPROVEN);
  assert.equal(r.reason, 'INSUFFICIENT_STABILITY_SAMPLES');
});

test('parity fails when a later sample stops serving the built commit', () => {
  const r = assessParityStability(
    [
      { serves_commit: true, in_flight: false, served_sha: 'aaaaaaaaaaaa' },
      { serves_commit: false, in_flight: false, served_sha: 'bbbbbbbbbbbb' },
    ],
    { requiredSamples: 2 },
  );
  assert.equal(r.status, CHECK_STATUS.FAIL);
  assert.equal(r.reason, 'PARITY_NOT_STABLE');
});

test('parity with a deployment in flight is unproven, not success', () => {
  // The live failure this encodes: parity announced while Railway had a newer
  // commit QUEUED, so "deployed" was true for seconds and then false.
  const r = assessParityStability(
    [
      { serves_commit: true, in_flight: false, deployment_status: 'SUCCESS' },
      { serves_commit: true, in_flight: true, deployment_status: 'QUEUED' },
    ],
    { requiredSamples: 2 },
  );
  assert.equal(r.status, CHECK_STATUS.UNPROVEN);
  assert.equal(r.reason, 'DEPLOYMENT_IN_FLIGHT_DURING_VERIFY');
  assert.ok(r.proposed_solution);
});

test('parity passes only when every sample is stable and nothing is in flight', () => {
  const r = assessParityStability(
    [
      { serves_commit: true, in_flight: false, deployment_status: 'SUCCESS' },
      { serves_commit: true, in_flight: false, deployment_status: 'SUCCESS' },
      { serves_commit: true, in_flight: false, deployment_status: 'SUCCESS' },
    ],
    { requiredSamples: 3 },
  );
  assert.equal(r.status, CHECK_STATUS.PASS);
});

test('computeVerdict never lets an unproven check round up to success', () => {
  const proven = computeVerdict([{ id: 'a', status: CHECK_STATUS.PASS }, { id: 'b', status: CHECK_STATUS.SKIP }]);
  assert.equal(proven.verdict, VERDICT.PROVEN);
  assert.equal(proven.ok, true);

  const unsolved = computeVerdict([{ id: 'a', status: CHECK_STATUS.PASS }, { id: 'b', status: CHECK_STATUS.UNPROVEN }]);
  assert.equal(unsolved.verdict, VERDICT.UNSOLVED);
  assert.equal(unsolved.ok, false);
  assert.deepEqual(unsolved.unproven, ['b']);

  const drift = computeVerdict([{ id: 'a', status: CHECK_STATUS.FAIL }, { id: 'b', status: CHECK_STATUS.UNPROVEN }]);
  assert.equal(drift.verdict, VERDICT.DRIFT);
  assert.deepEqual(drift.failed, ['a']);
});

test('exit codes separate provably broken from not proven', () => {
  assert.equal(exitCodeForVerdict(VERDICT.PROVEN), EXIT.PROVEN);
  assert.equal(exitCodeForVerdict(VERDICT.DRIFT), EXIT.DRIFT);
  assert.equal(exitCodeForVerdict(VERDICT.UNSOLVED), EXIT.UNSOLVED);
});

test('missingSolutions flags any failure reported without a next action', () => {
  const gaps = missingSolutions([
    { id: 'ok', status: CHECK_STATUS.PASS },
    { id: 'naked', status: CHECK_STATUS.FAIL },
    { id: 'good', status: CHECK_STATUS.UNPROVEN, proposed_solution: 'do this' },
  ]);
  assert.deepEqual(gaps, ['naked']);
});

test('a receipt with an unproven check is not ok and refuses the word deployed', () => {
  const receipt = buildReceipt({
    command: 'ship-truth',
    base: 'https://example.test',
    branch: 'main',
    commitSha: 'abc123def4567890',
    checks: [
      { id: 'commit.landed', status: CHECK_STATUS.PASS, detail: 'landed' },
      { id: 'runtime.behavior', status: CHECK_STATUS.UNPROVEN, detail: 'no probe', proposed_solution: 'declare a probe' },
    ],
  });
  assert.equal(receipt.ok, false);
  assert.equal(receipt.verdict, VERDICT.UNSOLVED);
  assert.match(receipt.human_summary, /^UNSOLVED/);
  assert.match(receipt.human_summary, /Do not report this as deployed/);
  assert.equal(receipt.schema, 'deploy_truth_verify_v1');
});

test('a fully proven receipt is ok with no failures recorded', () => {
  const receipt = buildReceipt({
    command: 'ship-truth',
    base: 'https://example.test',
    branch: 'main',
    commitSha: 'abc123def4567890',
    servedSha: 'abc123def4567890',
    checks: [{ id: 'runtime.parity', status: CHECK_STATUS.PASS, detail: 'serves it' }],
  });
  assert.equal(receipt.ok, true);
  assert.equal(receipt.verdict, VERDICT.PROVEN);
  assert.deepEqual(receipt.failed, []);
  assert.match(receipt.human_summary, /^PROVEN/);
});

test('a proven ship summary distinguishes live paths from unverifiable ones', () => {
  const receipt = buildReceipt({
    command: 'ship-truth',
    base: 'https://example.test',
    branch: 'main',
    commitSha: 'abc123def4567890',
    servedSha: 'abc123def4567890',
    checks: [{ id: 'runtime.parity', status: CHECK_STATUS.PASS, detail: 'serves it' }],
    files: [
      { target_file: 'public/overlay/lifeos-app.html', runtime_proof_kind: RUNTIME_PROOF.HTTP_STATIC },
      { target_file: 'docs/products/lifeos/PRODUCT_HOME.md', runtime_proof_kind: RUNTIME_PROOF.NO_RUNTIME_SURFACE },
    ],
  });
  assert.match(receipt.human_summary, /1 path\(s\) verified live in the running app/);
  assert.match(receipt.human_summary, /1 path\(s\) have no HTTP-verifiable surface/);
  assert.doesNotMatch(receipt.human_summary, /content-verified.verified live/);
});

test('a proven audit summary does not claim paths were shipped', () => {
  const receipt = buildReceipt({
    command: 'drift-audit',
    base: 'https://example.test',
    branch: 'main',
    commitSha: 'abc123def4567890',
    servedSha: 'abc123def4567890',
    checks: [{ id: 'runtime.version', status: CHECK_STATUS.PASS, detail: 'current' }],
  });
  assert.match(receipt.human_summary, /^PROVEN — production serves abc123def456, which contains origin\/main/);
  assert.doesNotMatch(receipt.human_summary, /shipped path/);
});

test('porcelain parsing keeps the leading status space intact', () => {
  // ' M path' has a space in column 1; trimming the block first shifts the path.
  const out = [' M docs/CONTINUITY_LOG.md', 'M  package.json', '?? data/lip/', 'R  old.js -> new.js'].join('\n');
  assert.deepEqual(parsePorcelainPaths(out), [
    'docs/CONTINUITY_LOG.md',
    'package.json',
    'data/lip/',
    'new.js',
  ]);
});

test('sha helpers treat a short prefix as the same commit', () => {
  assert.equal(normalizeSha(' D411DA2E9D48 '), 'd411da2e9d48');
  assert.equal(normalizeSha('nope'), null);
  assert.equal(shasMatch('d411da2e9d48', 'd411da2e9d48b8394471c1341224cb9d402089bc'), true);
  assert.equal(shasMatch('d411da2e9d48', 'aaaaaaaaaaaa'), false);
});