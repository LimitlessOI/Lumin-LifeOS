/**
 * Hard execution-truth gate — never emit PASS / COMMITTED without proof.
 * Fail-closed: when evidence is missing, downgrade to FAIL with explicit blocker.
 * Every FAIL includes an autopsy: what happened, lessons, executable fix steps.
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
  let failure_code = raw.failure_code || null;

  if (!apiOk && !committed) {
    failure_code = failure_code || 'COMMAND_FAILED';
    first_blocker = first_blocker || 'Command did not complete successfully.';
    lesson = lesson || 'The system returned failure or no commit — nothing shipped.';
    fix = fix || 'Read the autopsy below and run Fix step 1.';
  } else if (apiOk && !committed) {
    failure_code = failure_code || 'OK_WITHOUT_COMMIT';
    first_blocker = first_blocker || 'Builder returned ok but committed=false — no file landed.';
    lesson = 'Never treat ok alone as success; commit proof is required.';
    fix = fix || 'Retry with explicit target_file and a single bounded patch.';
  } else if (committed && !targetFile) {
    failure_code = failure_code || 'COMMIT_NO_FILE';
    first_blocker = 'Commit claimed but target_file missing from receipt.';
    lesson = 'COMMITTED requires a file path in the receipt.';
    fix = 'Inspect builder /execute response; fix receipt wiring before retry.';
  } else if (committed && targetFile) {
    const isLargeOverlay = LARGE_OVERLAY_PATHS.some((p) => targetFile.replace(/^\//, '') === p);
    const taskNamesOverlay = /\blifeos-app\.html\b/i.test(task) || LARGE_OVERLAY_PATHS.some((p) => task.includes(p));
    const outputBytes = raw.task_meta?.output_bytes || raw.output_bytes || 0;
    const stubRewrite = isLargeOverlay && outputBytes > 0 && outputBytes < 8000;

    if ((isLargeOverlay && taskNamesOverlay) || stubRewrite) {
      failure_code = stubRewrite ? 'OVERLAY_STUB_REWRITE' : 'OVERLAY_FULL_REWRITE_BLOCKED';
      first_blocker = first_blocker || (
        stubRewrite
          ? `Builder committed a ${outputBytes}-byte stub to ${targetFile} — destroyed the ${LARGE_OVERLAY_PATHS.includes(targetFile.replace(/^\//, '')) ? '2700+' : 'full'}-line production shell.`
          : `Large overlay ${targetFile} — whole-file rewrite not verified and not safe via builder.`
      );
      pass_fail = 'FAIL';
      command_truth = 'BUILD_ATTEMPTED';
      receipt_truth = stubRewrite ? 'COMMITTED_HARMFUL_STUB' : 'UNVERIFIED';
      lesson = lesson || 'The builder cannot replace entire overlay shells. It produced placeholder theater while claiming success.';
      fix = fix || 'Use GAP-FILL scoped patch on #lumin-drawer only — never regenerate lifeos-app.html wholesale.';
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

  const autopsy = pass_fail === 'FAIL'
    ? buildExecutionAutopsy({
      task,
      action,
      targetFile,
      failure_code,
      first_blocker,
      committed,
      apiOk,
      sha,
      raw,
      lesson,
    })
    : null;

  if (autopsy?.lessons?.length && !lesson) {
    lesson = autopsy.lessons[0];
  }
  if (autopsy?.fix_steps?.length && !fix) {
    fix = autopsy.fix_steps.join(' → ');
  }

  return {
    ok: pass_fail === 'PASS',
    pass_fail,
    command_truth,
    receipt_truth,
    failure_code,
    committed: pass_fail === 'PASS' && committed,
    target_file: targetFile || null,
    sha: sha || null,
    first_blocker,
    autopsy,
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
 * Structured autopsy — mandatory on every FAIL.
 */
export function buildExecutionAutopsy({
  task = '',
  action = 'build',
  targetFile = '',
  failure_code = 'UNKNOWN',
  first_blocker = '',
  committed = false,
  apiOk = false,
  sha = null,
  raw = {},
  lesson = '',
}) {
  const path = raw.execution_path || 'builder_task_execute';
  const cacheHit = raw.task_meta?.cache_hit === true;
  const outputBytes = raw.task_meta?.output_bytes || 0;
  const execError = raw.exec_meta?.error || raw.task_meta?.error || null;

  const what_happened = [
    `You asked: ${task.slice(0, 200)}${task.length > 200 ? '…' : ''}`,
    `Route: founder-interface → ${path} → POST /api/v1/lifeos/builder/task → POST /api/v1/lifeos/builder/execute`,
  ];

  if (cacheHit) what_happened.push('Builder task returned cache_hit:true — stale cached output was reused.');
  if (outputBytes) what_happened.push(`Builder output size: ${outputBytes} bytes${targetFile ? ` for ${targetFile}` : ''}.`);
  if (apiOk && committed) what_happened.push('Execute returned ok:true and committed:true.');
  else if (apiOk && !committed) what_happened.push('Execute returned ok:true but committed:false — nothing in git.');
  else if (!apiOk) what_happened.push(`Execute/task failed: ${execError || first_blocker || 'no detail'}.`);
  if (sha) what_happened.push(`Commit SHA reported: ${String(sha).slice(0, 12)}.`);
  if (failure_code === 'OVERLAY_STUB_REWRITE') {
    what_happened.push('The committed file was a short placeholder stub, not the production LifeOS shell.');
    what_happened.push('Prior UI showed PASS/COMMITTED anyway — that was false (fixed by execution-truth gate on 2026-06-20).');
  }

  const lessons = [];
  if (failure_code === 'OVERLAY_STUB_REWRITE' || failure_code === 'OVERLAY_FULL_REWRITE_BLOCKED') {
    lessons.push('Whole-file rewrites of public/overlay/lifeos-app.html always fail or produce harmful stubs.');
    lessons.push('PASS requires proof you can verify — file path, commit, and scope — not builder ok alone.');
    lessons.push('Dock/UI features must extend #lumin-drawer in place; never replace the shell.');
  } else if (failure_code === 'OK_WITHOUT_COMMIT') {
    lessons.push('Builder codegen can succeed while commit is refused (validation, truncation, governance).');
  } else if (cacheHit) {
    lessons.push('Cached builder output is not fresh code for a new task.');
  } else {
    lessons.push(lesson || 'Failure without commit means zero user-visible change — never claim shipped.');
  }
  lessons.push('Every FAIL must ship this autopsy block — vague “retry smaller” alone is not acceptable.');

  const fix_steps = buildFixSteps({ failure_code, targetFile, task, action });

  return { what_happened, lessons, fix_steps, failure_code };
}

function buildFixSteps({ failure_code, targetFile, task, action }) {
  const file = targetFile || (/\blifeos-app\.html\b/i.test(task) ? 'public/overlay/lifeos-app.html' : null);

  if (failure_code === 'OVERLAY_STUB_REWRITE' || failure_code === 'OVERLAY_FULL_REWRITE_BLOCKED'
    || (file && /lifeos-app\.html/i.test(file) && /\bdock|panel|lumin-drawer\b/i.test(task))) {
    return [
      'System job (founder chat — NOT Cursor): scoped build on existing #lumin-drawer only — dock CSS classes, header controls Side/Top/Bottom/Pin/Min, localStorage keys; forbid whole-file rewrite of lifeos-app.html.',
      'Prompt must name target_file and list exact DOM/CSS hooks to extend — one patch surface, not regenerate the shell.',
      'After system commit: hard refresh → open Lumin drawer → verify controls persist across refresh.',
      'If FAIL receipt returns: paste full autopsy here — do not rerun whole-file builder on lifeos-app.html.',
    ];
  }

  if (failure_code === 'OK_WITHOUT_COMMIT') {
    return [
      `Name exact target_file (e.g. ${file || 'routes/your-file.js'}) and one specific change in the message.`,
      'Retry build — truth gate will FAIL until committed:true and target_file are both present.',
      'If validation/truncation error in Blocker: shrink scope to one function or CSS block.',
    ];
  }

  return [
    'Read Blocker line above — that is the root cause, not a summary.',
    file ? `Retry with: "GAP-FILL: patch ${file} — [one specific change]"` : 'Retry with explicit file path and single change.',
    'After deploy, hard refresh and verify visually before treating as done.',
  ];
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
  if (truth.failure_code && truth.pass_fail === 'FAIL') lines.push(`Code: ${truth.failure_code}`);
  if (truth.execution_path) lines.push(`Path: ${truth.execution_path}`);
  if (truth.target_file) lines.push(`File: ${truth.target_file}`);
  if (truth.sha) lines.push(`Commit: ${String(truth.sha).slice(0, 12)}`);
  if (truth.first_blocker) lines.push(`Blocker: ${truth.first_blocker}`);

  const autopsy = truth.autopsy;
  if (autopsy && truth.pass_fail === 'FAIL') {
    lines.push('');
    lines.push('── Autopsy: what happened ──');
    for (const step of autopsy.what_happened || []) lines.push(`• ${step}`);
    lines.push('');
    lines.push('── Lessons ──');
    for (const L of autopsy.lessons || []) lines.push(`• ${L}`);
    lines.push('');
    lines.push('── Fix path (execute in order) ──');
    (autopsy.fix_steps || []).forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  } else {
    const r = truth.execution_receipt;
    if (r?.lesson) lines.push(`Lesson: ${r.lesson}`);
    if (r?.fix) lines.push(`Fix: ${r.fix}`);
  }

  const gap = truth.execution_receipt?.gap_recommendation || truth.gap_recommendation;
  if (gap?.next_platform_fix) lines.push(`Next platform: ${gap.next_platform_fix}`);

  const note = String(truth.human_summary || '').trim();
  if (note) {
    lines.push('');
    lines.push(note);
  }
  return lines.join('\n');
}
