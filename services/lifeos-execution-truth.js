/**
 * Hard execution-truth gate — never emit PASS / COMMITTED without proof.
 * Fail-closed: when evidence is missing, downgrade to FAIL with explicit blocker.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

const LARGE_OVERLAY_PATHS = [
  'public/overlay/lifeos-app.html',
  'public/overlay/lifeos-dashboard.html',
];

/**
 * @param {object} raw — builder / terminal bridge result fields
 * @param {object} [ctx]
 * @param {string} [ctx.action] — build | execute
 * @param {string} [ctx.task] — original founder text
 */
export function enforceExecutionTruth(raw, ctx = {}) {
  const action = ctx.action || 'execute';
  const task = String(ctx.task || '');
  const targetFile = String(raw.target_file || raw.targetFile || '').trim();
  const committed = raw.committed === true;
  const apiOk = raw.ok === true;
  const sha = raw.sha || raw.commit_sha || null;
  const upstreamBlocker = raw.first_blocker || raw.error || raw.execution_receipt?.blocker || null;

  let pass_fail = 'FAIL';
  let command_truth = 'NO_COMMAND_RAN';
  let receipt_truth = 'NO_RECEIPT';
  let first_blocker = upstreamBlocker;
  let lesson = raw.execution_receipt?.lesson || null;
  let fix = raw.execution_receipt?.fix || null;

  if (!apiOk && !committed) {
    first_blocker = first_blocker || 'Command did not complete successfully.';
    lesson = lesson || 'The system returned failure or no commit — nothing shipped.';
    fix = fix || 'Read Blocker, fix the root cause, retry with a smaller scoped change.';
  } else if (apiOk && !committed) {
    first_blocker = first_blocker || 'Builder returned ok but committed=false — no file landed.';
    lesson = 'Never treat ok alone as success; commit proof is required.';
    fix = 'Retry with an explicit target_file and a bounded patch scope.';
  } else if (committed && !targetFile) {
    first_blocker = 'Commit claimed but target_file missing from receipt.';
    lesson = 'COMMITTED requires a file path in the receipt.';
    fix = 'Inspect builder /execute response; fix receipt wiring before retry.';
  } else if (committed && targetFile) {
    const overlayRisk = LARGE_OVERLAY_PATHS.some((p) => targetFile.replace(/^\//, '') === p)
      || (/\blifeos-app\.html\b/i.test(task) && !targetFile.includes('lifeos-app.html'));
    if (overlayRisk && LARGE_OVERLAY_PATHS.some((p) => task.includes(p) || task.includes('lifeos-app'))) {
      first_blocker = first_blocker || `Large overlay ${targetFile} — commit not verified in browser; builder often truncates full HTML rewrites.`;
      pass_fail = 'FAIL';
      command_truth = 'BUILD_ATTEMPTED';
      receipt_truth = 'UNVERIFIED';
      lesson = lesson || 'Full-file HTML rewrites via builder are blocked by design — use minimal scoped patches.';
      fix = fix || 'Ask for a bounded change (one CSS block or one DOM hook), not a whole-file rewrite.';
    } else {
      pass_fail = 'PASS';
      command_truth = 'COMMITTED';
      receipt_truth = sha ? 'COMMIT_SHA_PRESENT' : 'COMMIT_CLAIMED_NO_SHA';
      first_blocker = null;
    }
  }

  const human_summary = pass_fail === 'PASS'
    ? (sha
      ? `Wrote ${targetFile} · commit ${String(sha).slice(0, 12)}. Hard refresh after deploy SHA updates. Browser visual NOT auto-verified.`
      : `Wrote ${targetFile}. Commit claimed; SHA not returned. Hard refresh after deploy — verify visually.`)
    : null;

  return {
    ok: pass_fail === 'PASS',
    pass_fail,
    command_truth,
    receipt_truth,
    committed: pass_fail === 'PASS' && committed,
    target_file: targetFile || null,
    sha: sha || null,
    first_blocker,
    execution_receipt: {
      pass_fail,
      blocker: first_blocker,
      lesson,
      fix,
      gap_recommendation: raw.gap_recommendation || raw.execution_receipt?.gap_recommendation || null,
    },
    human_summary,
    action,
    execution_path: raw.execution_path || null,
  };
}

/**
 * Client-safe formatter — single source, no duplicate PASS lines.
 */
export function formatExecutionTruthReply(truth) {
  if (!truth || typeof truth !== 'object') return 'No response from system.';
  const lines = [];
  const icon = truth.pass_fail === 'PASS' ? '✅' : truth.pass_fail === 'FAIL' ? '❌' : 'ℹ️';
  lines.push(`${icon} ${truth.pass_fail || 'UNKNOWN'} · ${truth.action || 'response'}`);
  if (truth.command_truth) lines.push(`Command: ${truth.command_truth}`);
  if (truth.receipt_truth) lines.push(`Receipt: ${truth.receipt_truth}`);
  if (truth.execution_path) lines.push(`Path: ${truth.execution_path}`);
  if (truth.target_file) lines.push(`File: ${truth.target_file}`);
  if (truth.sha) lines.push(`Commit: ${String(truth.sha).slice(0, 12)}`);
  if (truth.first_blocker) lines.push(`Blocker: ${truth.first_blocker}`);
  const r = truth.execution_receipt;
  if (r?.lesson) lines.push(`Lesson: ${r.lesson}`);
  if (r?.fix) lines.push(`Fix: ${r.fix}`);
  const gap = r?.gap_recommendation || truth.gap_recommendation;
  if (gap?.next_platform_fix) lines.push(`Next: ${gap.next_platform_fix}`);
  const note = String(truth.human_summary || '').trim();
  if (note) {
    lines.push('');
    lines.push(note);
  }
  return lines.join('\n');
}
