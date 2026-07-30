/**
 * SYNOPSIS: Tests for Q-001 runtime fingerprint + main-ancestor ship guard.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRuntimeFingerprintReport,
  fingerprintRuntimePath,
  isAllowlistedRuntimePath,
  parseRuntimeFingerprintPaths,
  sha256Buffer,
} from '../scripts/lib/runtime-fingerprint.mjs';
import {
  interpretMainCompareStatus,
  verifyCommitOnMain,
} from '../scripts/lib/ship-main-ancestor.mjs';

test('allowlist accepts routes/services and rejects escape', () => {
  assert.equal(isAllowlistedRuntimePath('routes/foo.js'), true);
  assert.equal(isAllowlistedRuntimePath('scripts/lib/x.mjs'), true);
  assert.equal(isAllowlistedRuntimePath('docs/x.md'), false);
  assert.equal(isAllowlistedRuntimePath('../etc/passwd'), false);
});

test('parseRuntimeFingerprintPaths caps and dedupes', () => {
  const paths = parseRuntimeFingerprintPaths('routes/a.js,routes/a.js,services/b.js', { max: 2 });
  assert.deepEqual(paths, ['routes/a.js', 'services/b.js']);
});

test('fingerprintRuntimePath hashes fixture via injectable fs', () => {
  const buf = Buffer.from('hello-fingerprint\n');
  const fsApi = {
    statSync() {
      return { isFile: () => true, mtimeMs: 1 };
    },
    readFileSync() {
      return buf;
    },
  };
  const hit = fingerprintRuntimePath('/repo', 'routes/x.js', { fsApi });
  assert.equal(hit.ok, true);
  assert.equal(hit.sha256, sha256Buffer(buf));
  assert.equal(hit.bytes, buf.length);
});

test('buildRuntimeFingerprintReport rejects non-allowlisted', () => {
  const report = buildRuntimeFingerprintReport({
    repoRoot: '/repo',
    paths: ['routes/ok.js', 'docs/no.md'],
    deployCommitSha: 'abc',
    fsApi: {
      statSync() {
        return { isFile: () => true, mtimeMs: 1 };
      },
      readFileSync() {
        return Buffer.from('x');
      },
    },
  });
  assert.equal(report.ok, false);
  assert.equal(report.rejected.length, 1);
  assert.equal(report.files.length, 1);
});

test('interpretMainCompareStatus accepts behind/identical only', () => {
  assert.equal(interpretMainCompareStatus('behind').ok, true);
  assert.equal(interpretMainCompareStatus('identical').ok, true);
  assert.equal(interpretMainCompareStatus('ahead').ok, false);
  assert.equal(interpretMainCompareStatus('diverged').ok, false);
  assert.match(interpretMainCompareStatus('ahead').reason, /ship_commit_not_on_main/);
});

test('verifyCommitOnMain uses compare API', async () => {
  const calls = [];
  const fetchFn = async (url, opts) => {
    calls.push({ url, auth: opts?.headers?.Authorization });
    return {
      ok: true,
      async json() {
        return { status: 'behind' };
      },
    };
  };
  const v = await verifyCommitOnMain('abcdef0123456789', {
    owner: 'Org',
    repo: 'Repo',
    token: 't',
    fetchFn,
  });
  assert.equal(v.ok, true);
  assert.match(calls[0].url, /compare\/main\.\.\.abcdef0123456789/);
});

test('verifyCommitOnMain fails on shadow ahead', async () => {
  const v = await verifyCommitOnMain('abcdef0123456789', {
    owner: 'Org',
    repo: 'Repo',
    token: 't',
    fetchFn: async () => ({ ok: true, async json() { return { status: 'ahead' }; } }),
  });
  assert.equal(v.ok, false);
  assert.match(v.reason, /ship_commit_not_on_main/);
});
