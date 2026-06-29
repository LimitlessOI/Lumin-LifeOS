/**
 * SYNOPSIS: Founder CSS commit outcome verifier — git-show parity for founder batch commits.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const COMMIT_MESSAGE_MARKER = '--COMMIT-MESSAGE-END--';

const REQUIRED_PATH_FRAGMENTS = [
  'lifeos-theme-overrides.css',
  'lifeos-dashboard.html',
  'lifeos-app.html',
  'sw.js',
];

async function readCommitEvidence(commitSha) {
  const sha = String(commitSha || '').trim();
  if (!sha) return { ok: false, error: 'missing_commit_sha' };
  try {
    const messageResult = await execFileAsync('git', [
      'show',
      '--name-only',
      '--pretty=format:%B%n' + COMMIT_MESSAGE_MARKER,
      sha,
    ]);
    const splitIdx = messageResult.stdout.indexOf(COMMIT_MESSAGE_MARKER);
    const messagePart = splitIdx === -1 ? '' : messageResult.stdout.slice(0, splitIdx);
    const filesPart = splitIdx === -1 ? messageResult.stdout : messageResult.stdout.slice(splitIdx + COMMIT_MESSAGE_MARKER.length);
    const changedFiles = filesPart.split('\n').map((line) => line.trim()).filter(Boolean);
    const patchResult = await execFileAsync('git', ['show', '--pretty=format:', '--unified=0', sha]);
    return {
      ok: true,
      commit_sha: sha,
      commit_message: messagePart.trim(),
      changed_files: changedFiles,
      patch_text: patchResult.stdout || '',
    };
  } catch (err) {
    return { ok: false, error: err?.message || 'git_show_failed', commit_sha: sha };
  }
}

export async function verifyFounderCssCommitOutcome({
  task,
  commitSha,
  colors,
  readCommit = readCommitEvidence,
}) {
  const instruction = String(task || '').trim();
  const bg = String(colors?.background || '').toLowerCase();
  const fg = String(colors?.color || '').toLowerCase();
  if (!instruction || !bg) {
    return { ok: false, code: 'FAIL_WRONG_OUTCOME', reason: 'missing_task_or_colors' };
  }
  if (!commitSha) {
    return { ok: false, code: 'COMMIT_NO_SHA', reason: 'missing_commit_sha' };
  }

  const evidence = await readCommit(commitSha);
  if (!evidence.ok) {
    return {
      ok: false,
      code: 'FAIL_WRONG_OUTCOME',
      reason: 'missing_committed_content_evidence',
      commit_read_error: evidence.error,
    };
  }

  const evidenceText = [
    evidence.commit_message,
    evidence.patch_text,
    evidence.changed_files.join('\n'),
  ].join('\n').toLowerCase();

  const missingFiles = REQUIRED_PATH_FRAGMENTS.filter(
    (frag) => !evidence.changed_files.some((f) => f.includes(frag)),
  );
  if (missingFiles.length) {
    return {
      ok: false,
      code: 'SCOPE_INCOMPLETE',
      reason: 'batch_commit_missing_files',
      missing: missingFiles,
      changed_files: evidence.changed_files,
    };
  }

  if (!evidenceText.includes(bg) || !evidenceText.includes(fg)) {
    return {
      ok: false,
      code: 'FAIL_WRONG_OUTCOME',
      reason: 'requested_colors_missing_in_commit',
      expected: { background: bg, color: fg },
      commit_sha: evidence.commit_sha,
    };
  }

  return {
    ok: true,
    code: 'PASS_OUTCOME_VERIFIED',
    commit_sha: evidence.commit_sha,
    changed_files: evidence.changed_files,
    founder_request: instruction,
  };
}

export const __private__ = { readCommitEvidence };
