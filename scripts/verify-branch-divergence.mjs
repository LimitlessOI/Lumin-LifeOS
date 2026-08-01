/**
 * SYNOPSIS: Branch-divergence guard. Fails if the working tree is not on the
 * main trunk or is behind/ahead of origin/main. Used by commit and redeploy
 * scripts to prevent silent "shipped on a branch nobody deploys" drift.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { spawnSync } from 'node:child_process';

const DEFAULT_MAIN_REF = 'main';
const DEFAULT_REMOTE = 'origin';

function git(args, cwd) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (r.status !== 0) {
    const err = String(r.stderr || '').trim() || `git ${args.join(' ')} failed`;
    throw new Error(err);
  }
  return String(r.stdout || '').trim();
}

export function getBranchDivergence({ mainRef = DEFAULT_MAIN_REF, remote = DEFAULT_REMOTE, cwd } = {}) {
  const fullRemoteRef = `${remote}/${mainRef}`;

  // Ensure remote tracking ref exists
  try {
    git(['fetch', remote, mainRef], cwd);
  } catch (err) {
    return { ok: false, reason: 'fetch_failed', error: err.message };
  }

  const currentBranch = git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
  const currentSha = git(['rev-parse', 'HEAD'], cwd);
  const remoteSha = git(['rev-parse', fullRemoteRef], cwd);

  // commits in HEAD not in origin/main (ahead) and origin/main not in HEAD (behind)
  const revList = git(['rev-list', '--left-right', '--count', `HEAD...${fullRemoteRef}`], cwd);
  const [ahead, behind] = revList.split(/\s+/).map((n) => parseInt(n, 10) || 0);

  return {
    ok: currentBranch === mainRef && ahead === 0,
    current_branch: currentBranch,
    current_sha: currentSha,
    remote_sha: remoteSha,
    ahead,
    behind,
    main_ref: mainRef,
    reason: currentBranch !== mainRef
      ? `not_on_${mainRef}_branch`
      : ahead > 0
        ? `ahead_of_${fullRemoteRef}`
        : 'in_sync',
  };
}

export function verifyBranchDivergence(opts) {
  const result = getBranchDivergence(opts);
  if (!result.ok) {
    const msg = [
      '[BRANCH-DIVERGENCE] HALT:',
      `  current branch: ${result.current_branch}`,
      `  current sha:    ${result.current_sha}`,
      `  ${result.remote_ref || 'origin/main'} sha: ${result.remote_sha || 'unknown'}`,
      `  ahead: ${result.ahead}, behind: ${result.behind}`,
      `  reason: ${result.reason}`,
      '',
      'Every commit and deploy must happen from main with origin/main in sync.',
      'Checkout main, pull, and retry.',
    ].join('\n');
    return { ...result, error: msg };
  }
  return result;
}

export function getMainBranchSync({ mainRef = DEFAULT_MAIN_REF, remote = DEFAULT_REMOTE, cwd } = {}) {
  const fullRemoteRef = `${remote}/${mainRef}`;
  try {
    git(['fetch', remote, mainRef], cwd);
  } catch (err) {
    return { ok: false, reason: 'fetch_failed', error: err.message };
  }
  const localMain = git(['rev-parse', mainRef], cwd);
  const remoteMain = git(['rev-parse', fullRemoteRef], cwd);
  const revList = git(['rev-list', '--left-right', '--count', `${mainRef}...${fullRemoteRef}`], cwd);
  const [ahead, behind] = revList.split(/\s+/).map((n) => parseInt(n, 10) || 0);
  return {
    ok: ahead === 0,
    local_sha: localMain,
    remote_sha: remoteMain,
    ahead,
    behind,
    main_ref: mainRef,
    reason: ahead > 0 ? `main_ahead_${fullRemoteRef}` : 'in_sync',
  };
}

export function verifyMainBranchSync(opts) {
  const result = getMainBranchSync(opts);
  if (!result.ok) {
    const msg = [
      '[MAIN-DIVERGENCE] HALT:',
      `  local ${result.main_ref} sha: ${result.local_sha}`,
      `  ${result.remote_ref || 'origin/main'} sha: ${result.remote_sha || 'unknown'}`,
      `  ahead: ${result.ahead}, behind: ${result.behind}`,
      `  reason: ${result.reason}`,
      '',
      'Deploy target origin/main must match local main. Pull and retry.',
    ].join('\n');
    return { ...result, error: msg };
  }
  return result;
}

function main() {
  const opts = {};
  for (let i = 2; i < process.argv.length; i += 2) {
    const a = process.argv[i];
    const v = process.argv[i + 1];
    if (a === '--main-ref') opts.mainRef = v;
    if (a === '--remote') opts.remote = v;
    if (a === '--cwd') opts.cwd = v;
    if (a === '--max-behind') opts.maxBehind = parseInt(v, 10);
    if (a === '--max-ahead') opts.maxAhead = parseInt(v, 10);
  }
  const result = verifyBranchDivergence(opts);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('verify-branch-divergence.mjs')) {
  main();
}
