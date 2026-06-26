/**
 * SYNOPSIS: Hard execution-truth gate — never emit PASS / COMMITTED without proof.
 * Hard execution-truth gate — never emit PASS / COMMITTED without proof.
 * Fail-closed: when evidence is missing, downgrade to FAIL with explicit blocker.
 * Every FAIL includes an autopsy: what happened, lessons, executable fix steps.
 *
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import { scrubCounselTheater, detectCounselTheater } from './chair-direct-connection-truth.js';

const LARGE_OVERLAY_PATHS = [
  'public/overlay/lifeos-app.html',
  'public/overlay/lifeos-dashboard.html',
];

const CRITICAL_SERVER_FILES = {
  'routes/lifeos-builderos-command-control-routes.js': { minLines: 400, requireExpress: true },
  'routes/lifeos-council-builder-routes.js': { minLines: 500, requireExpress: true },
  'routes/lifeos-chat-routes.js': { minLines: 80, requireExpress: true },
};

const BROWSER_CODE_MARKERS = [
  /\bdocument\.(getElementById|querySelector|createElement)\b/,
  /\blocalStorage\.(getItem|setItem)\b/,
  /\bwindow\.(luminBootThread|addEventListener)\b/,
  /\bclassList\.(add|remove|toggle)\b/,
];

const SERVER_MODULE_MARKERS = [
  /from\s+['"]express['"]/,
  /\bexpress\.Router\b/,
  /\bexport\s+function\s+create/i,
  /\bimport\s+.+\s+from\s+['"]node:/,
];

/**
 * Detect browser/UI code or destructive shrink committed to server route/service files.
 * @returns {{ code: string, detail: string } | null}
 */
export function detectGeneratedLayerViolation(targetFile, output) {
  const normalized = String(targetFile || '').replace(/^\//, '').trim();
  const text = String(output || '');
  if (!normalized || !text.trim()) return null;

  const isServerPath = /^(routes|services|middleware|startup)\/[\w.-]+\.js$/i.test(normalized);
  if (!isServerPath) return null;

  const browserHits = BROWSER_CODE_MARKERS.filter((r) => r.test(text)).length;
  const serverHits = SERVER_MODULE_MARKERS.filter((r) => r.test(text)).length;

  if (/\bdocument\./.test(text) && serverHits === 0) {
    return {
      code: 'ROUTE_STUB_REWRITE',
      detail: `Browser DOM code in ${normalized} — Node crashes on import (document is not defined). Railway healthcheck will fail.`,
    };
  }
  if (browserHits >= 2 && serverHits === 0) {
    return {
      code: 'ROUTE_STUB_REWRITE',
      detail: `Frontend UI code committed to ${normalized} — missing Express/server module exports.`,
    };
  }

  const critical = CRITICAL_SERVER_FILES[normalized];
  if (critical) {
    const lines = text.split('\n').length;
    if (lines < critical.minLines) {
      return {
        code: 'SERVER_FILE_MASS_SHRINK',
        detail: `Output is ${lines} lines; ${normalized} requires ≥${critical.minLines} — destructive rewrite, not a scoped patch.`,
      };
    }
    if (critical.requireExpress && !/\bexpress\b/.test(text)) {
      return {
        code: 'ROUTE_STUB_REWRITE',
        detail: `${normalized} missing express — not a valid route module.`,
      };
    }
  }

  return null;
}

/**
 * Extract explicit repo-relative paths named in a founder/build task.
 * @returns {string[]}
 */
export function extractRequiredFilesFromTask(task) {
  const t = String(task || '');
  const paths = [];
  const re = /(?:^|[\s'"`,:])(?:\.?\/)?((?:public\/overlay|routes|services|middleware|startup)\/[\w./-]+\.(?:html|js|md))/gi;
  let m;
  while ((m = re.exec(t)) !== null) {
    paths.push(m[1].replace(/^\//, ''));
  }
  return [...new Set(paths)];
}

/**
 * Task names multiple files but commit only touched one.
 * @returns {{ code: string, detail: string, missing: string[] } | null}
 */
export function detectScopeIncomplete(task, targetFile, committed) {
  if (!committed) return null;
  const required = extractRequiredFilesFromTask(task);
  const target = String(targetFile || '').replace(/^\//, '');
  if (required.length < 2 || !target) return null;
  if (!required.includes(target)) return null;
  const missing = required.filter((f) => f !== target);
  if (!missing.length) return null;
  return {
    code: 'SCOPE_INCOMPLETE',
    detail: `Task required ${required.join(', ')} but only committed ${target}. Missing: ${missing.join(', ')}.`,
    missing,
  };
}

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
  const generatedOutput = raw.generated_output || raw.output || raw.output_content || '';

  let pass_fail = 'FAIL';
  let command_truth = 'NO_COMMAND_RAN';
  let receipt_truth = 'NO_RECEIPT';
  let first_blocker = upstreamBlocker;
  let lesson = raw.execution_receipt?.lesson || null;
  let fix = raw.execution_receipt?.fix || null;
  let failure_code = raw.failure_code || null;

  if (!apiOk && !committed) {
    const builderRan = raw.execution_path === 'builder_task_execute'
      || (raw.task_meta?.output_bytes > 0)
      || Boolean(raw.exec_meta);
    if (builderRan) {
      command_truth = 'BUILD_ATTEMPTED';
      receipt_truth = 'COMMIT_BLOCKED';
    }
    const blockerText = String(first_blocker || raw.exec_meta?.error || '');
    if (/too short|validation|syntax|refusing to commit|stub|layer violation|pre-commit|governance|prose refusal|not code/i.test(blockerText)) {
      failure_code = failure_code || 'VALIDATION_REJECTED';
    } else {
      failure_code = failure_code || 'COMMAND_FAILED';
    }
    first_blocker = first_blocker || 'Command did not complete successfully.';
    lesson = lesson || (builderRan
      ? 'Builder ran but commit was blocked — nothing shipped to git or deploy.'
      : 'The system returned failure or no commit — nothing shipped.');
    fix = fix || 'Read the autopsy below and run Fix step 1.';
  } else if (apiOk && !committed && raw.task_meta?.already_present === true) {
    failure_code = null;
    first_blocker = null;
    pass_fail = 'PASS';
    command_truth = 'COMMITTED';
    receipt_truth = 'ALREADY_PRESENT';
    lesson = null;
    fix = null;
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
    const normalizedTarget = targetFile.replace(/^\//, '');
    const isLargeOverlay = LARGE_OVERLAY_PATHS.some((p) => normalizedTarget === p);
    const outputBytes = raw.task_meta?.output_bytes || raw.output_bytes || (typeof generatedOutput === 'string' ? generatedOutput.length : 0);
    const outputLines = typeof generatedOutput === 'string' && generatedOutput.trim()
      ? generatedOutput.split('\n').length
      : 0;
    const overlayMinLines = normalizedTarget.includes('lifeos-app.html') ? 2000
      : normalizedTarget.includes('lifeos-dashboard.html') ? 400
        : 0;
    const stubRewrite = isLargeOverlay && outputBytes > 0 && (
      outputBytes < 8000 || (overlayMinLines > 0 && outputLines > 0 && outputLines < overlayMinLines)
    );

    const layerViolation = detectGeneratedLayerViolation(normalizedTarget, generatedOutput);
    const scopeMiss = detectScopeIncomplete(task, normalizedTarget, committed);

    if (layerViolation) {
      failure_code = layerViolation.code;
      first_blocker = layerViolation.detail;
      pass_fail = 'FAIL';
      command_truth = 'BUILD_ATTEMPTED';
      receipt_truth = 'COMMITTED_HARMFUL_STUB';
      lesson = lesson || 'Never commit browser/DOM code to routes/ or services/ — server crashes and deploy healthcheck fails.';
      fix = fix || `Restore ${normalizedTarget} from last good commit; patch the correct UI file under public/overlay/ instead.`;
    } else if (scopeMiss) {
      failure_code = scopeMiss.code;
      first_blocker = scopeMiss.detail;
      pass_fail = 'FAIL';
      command_truth = 'COMMITTED';
      receipt_truth = sha ? 'COMMIT_SHA_PRESENT' : 'COMMIT_CLAIMED_NO_SHA';
      lesson = lesson || 'Multi-file tasks require every named file to be patched — one-file commit is not PASS.';
      fix = fix || `Complete missing files: ${scopeMiss.missing.join(', ')} — or narrow task to single target_file.`;
    } else if (stubRewrite) {
      failure_code = 'OVERLAY_STUB_REWRITE';
      first_blocker = first_blocker || (
        outputLines && overlayMinLines
          ? `Builder committed ${outputLines} lines to ${targetFile} — production shell requires ≥${overlayMinLines} lines.`
          : `Builder committed a ${outputBytes}-byte stub to ${targetFile} — destroyed the production shell.`
      );
      pass_fail = 'FAIL';
      command_truth = 'BUILD_ATTEMPTED';
      receipt_truth = 'COMMITTED_HARMFUL_STUB';
      lesson = lesson || 'The builder cannot replace entire overlay shells. It produced placeholder theater while claiming success.';
      fix = fix || 'Use GAP-FILL scoped patch on #lumin-drawer only — never regenerate lifeos-app.html wholesale.';
    } else if (action === 'build' && !sha) {
      failure_code = 'COMMIT_NO_SHA';
      first_blocker = 'Commit claimed but no SHA returned — cannot verify git or deploy.';
      pass_fail = 'FAIL';
      command_truth = 'COMMITTED';
      receipt_truth = 'COMMIT_CLAIMED_NO_SHA';
      lesson = lesson || 'PASS on build requires commit SHA in the receipt — COMMIT_CLAIMED_NO_SHA is not proof.';
      fix = fix || 'Fix builder /execute to return sha; retry only after SHA is present in response.';
    } else {
      let passCandidate = true;
      const founderRequired = raw.founder_verification_required === true
        || (raw.execution_path === 'founder_css_patch' && raw.founder_verification_required !== false);
      const committedFiles = Array.isArray(raw.task_meta?.committed_files)
        ? raw.task_meta.committed_files.map((f) => String(f).replace(/^\//, ''))
        : [];
      if (founderRequired && raw.execution_path === 'founder_css_patch') {
        const requiredCss = [
          'public/overlay/lifeos-theme-overrides.css',
          'public/overlay/lifeos-dashboard.html',
          'public/overlay/lifeos-app.html',
          'public/overlay/sw.js',
        ];
        const missingCss = requiredCss.filter((f) => !committedFiles.includes(f));
        if (missingCss.length) {
          failure_code = 'SCOPE_INCOMPLETE';
          first_blocker = `CSS patch PASS requires ${requiredCss.join(', ')} — missing: ${missingCss.join(', ')}.`;
          passCandidate = false;
          command_truth = 'COMMITTED';
          receipt_truth = sha ? 'COMMIT_SHA_PRESENT' : 'COMMIT_CLAIMED_NO_SHA';
          lesson = lesson || 'Theme-only commit does not change what founder sees — inline CSS in dashboard + app is required.';
          fix = fix || 'Mechanical patch must commit theme + dashboard + app inline styles + service worker cache bump.';
        }
      }
      const founderVerification = raw.founder_verification;
      if (passCandidate && founderRequired) {
        if (!founderVerification || founderVerification.ok !== true) {
          failure_code = founderVerification?.code || 'FOUNDER_VISUAL_NOT_VERIFIED';
          first_blocker = founderVerification?.blocker
            || 'Commit succeeded but founder-visible outcome was not verified on live deploy.';
          passCandidate = false;
          command_truth = 'COMMITTED';
          receipt_truth = sha ? 'COMMIT_SHA_PRESENT' : 'COMMIT_CLAIMED_NO_SHA';
          lesson = lesson || 'PASS on UI/CSS builds requires live overlay proof — commit alone is not enough.';
          fix = fix || 'Wait for deploy SHA sync, verify /overlay/lifeos-dashboard.html contains expected CSS, bump SW cache if stale.';
        }
      }
      if (passCandidate) {
        pass_fail = 'PASS';
        command_truth = 'COMMITTED';
        receipt_truth = sha ? 'COMMIT_SHA_PRESENT' : 'COMMIT_CLAIMED_NO_SHA';
        first_blocker = null;
      } else {
        pass_fail = 'FAIL';
      }
    }
  }

  const founderVerified = raw.founder_verification?.ok === true;
  const human_summary = pass_fail === 'PASS'
    ? (founderVerified
      ? (sha
        ? `Wrote ${targetFile} · commit ${String(sha).slice(0, 12)} · founder visual verified on live deploy. Hard refresh once if service worker cached old CSS.`
        : `Wrote ${targetFile} · founder visual verified. Hard refresh once if bubbles look stale.`)
      : (sha
        ? `Wrote ${targetFile} · commit ${String(sha).slice(0, 12)}. Deploy sync + live CSS verification required before PASS.`
        : `Wrote ${targetFile}. Commit claimed; SHA not returned.`))
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
    founder_verification: raw.founder_verification || null,
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
  if (failure_code === 'ROUTE_STUB_REWRITE' || failure_code === 'SERVER_FILE_MASS_SHRINK') {
    what_happened.push('Browser or truncated code was committed to a server routes/services file.');
    what_happened.push('Node throws on import (e.g. document is not defined) — Railway deploy healthcheck fails; previous active deploy stays live.');
  }
  if (failure_code === 'SCOPE_INCOMPLETE') {
    what_happened.push('Task named multiple files but builder only committed one — partial delivery is FAIL.');
  }
  if (failure_code === 'VALIDATION_REJECTED') {
    what_happened.push('Pre-commit validation refused the builder output before git commit — live files were not corrupted.');
  }

  const lessons = [];
  if (failure_code === 'ROUTE_STUB_REWRITE' || failure_code === 'SERVER_FILE_MASS_SHRINK') {
    lessons.push('routes/*.js and services/*.js are Express/Node modules — never paste lifeos-app.html drawer JS into them.');
    lessons.push('Deploy healthcheck failure means the bad commit never went live — but main may still be poisoned until revert.');
    lessons.push('UI history/persistence patches belong in public/overlay/*.html using CTX.fetchWithAuth — not in route files.');
  } else if (failure_code === 'SCOPE_INCOMPLETE') {
    lessons.push('When a prompt lists N files, PASS requires all N to change — or narrow the prompt to one target_file.');
    lessons.push('Committing the wrong layer (routes instead of overlay) does not satisfy UX requirements.');
  } else if (failure_code === 'OVERLAY_STUB_REWRITE' || failure_code === 'OVERLAY_FULL_REWRITE_BLOCKED') {
    lessons.push('Whole-file rewrites of public/overlay/lifeos-app.html always fail or produce harmful stubs.');
    lessons.push('PASS requires proof you can verify — file path, commit, and scope — not builder ok alone.');
    lessons.push('Dock/UI features must extend #lumin-drawer in place; never replace the shell.');
  } else if (failure_code === 'OK_WITHOUT_COMMIT') {
    lessons.push('Builder codegen can succeed while commit is refused (validation, truncation, governance).');
  } else   if (failure_code === 'COMMIT_NO_SHA') {
    lessons.push('Build PASS requires commit SHA — without it the founder cannot verify deploy or revert.');
  } else if (failure_code === 'FOUNDER_VISUAL_NOT_VERIFIED' || failure_code === 'DEPLOY_NOT_SYNCED') {
    lessons.push('UI/CSS PASS requires live overlay proof — commit to git is necessary but not sufficient.');
    lessons.push('Inline CSS in dashboard + app shell beats theme-overrides alone; service worker cache can hide changes.');
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

  if (failure_code === 'ROUTE_STUB_REWRITE' || failure_code === 'SERVER_FILE_MASS_SHRINK') {
    return [
      `Revert ${targetFile || 'routes/lifeos-builderos-command-control-routes.js'} on main to last good Express module (git revert or restore from prior SHA).`,
      'If UI change needed: patch public/overlay/lifeos-app.html or lifeos-dashboard.html — extend luminBootThread / initChatHistory, never rewrite routes.',
      'Redeploy and confirm Railway healthcheck PASS + deploy SHA matches revert commit.',
      'Re-run comms proof: send message → hard refresh → history visible.',
    ];
  }

  if (failure_code === 'SCOPE_INCOMPLETE') {
    const missing = extractRequiredFilesFromTask(task).filter((f) => f !== String(targetFile || '').replace(/^\//, ''));
    return [
      `Complete patches for: ${missing.length ? missing.join(', ') : 'each file named in the task'}.`,
      'One scoped commit per surface OR one commit touching all named files with SHA proof.',
      'PASS only after hard refresh proves history in both dashboard and app drawer.',
    ];
  }

  if (failure_code === 'COMMIT_NO_SHA') {
    return [
      'Inspect POST /api/v1/lifeos/builder/execute response — sha must flow from commitToGitHub.',
      'Do not show PASS in founder chat until SHA is present.',
      'After SHA confirmed: verify Railway deploy SHA matches before founder visual test.',
    ];
  }

  if (failure_code === 'FOUNDER_VISUAL_NOT_VERIFIED' || failure_code === 'DEPLOY_NOT_SYNCED' || failure_code === 'LOCAL_CSS_MISSING') {
    return [
      'System retries: redeploy → wait for deploy SHA → fetch live /overlay/lifeos-dashboard.html + lifeos-app.html for CSS tokens.',
      'Mechanical patch must update inline .msg.assistant and .lumin-msg.assistant plus bump sw.js CACHE_NAME.',
      'Founder: hard refresh (Cmd+Shift+R) once after PASS — unregister service worker if bubbles still wrong.',
    ];
  }

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
  if (truth.founder_verification?.ok === true) {
    lines.push(`Founder visual: VERIFIED (${truth.founder_verification.code || 'live'})`);
    if (truth.founder_verification.client_check?.expected_colors) {
      const c = truth.founder_verification.client_check.expected_colors;
      lines.push(`Expected bubbles: bg ${c.background} · text ${c.color}`);
    }
    if (truth.founder_verification.deploy_warning) {
      lines.push(`Deploy note: ${truth.founder_verification.deploy_warning}`);
    }
  } else if (truth.founder_verification?.code && truth.pass_fail === 'FAIL') {
    lines.push(`Founder visual: ${truth.founder_verification.code}`);
  }
  if (truth.persist_warning === 'HISTORY_NOT_SAVED') {
    lines.push('Warning: chat history was not saved — refresh may lose this turn.');
  }
  if (truth.first_blocker) lines.push(`Blocker: ${truth.first_blocker}`);

  const repair = truth.self_repair;
  if (repair?.attempts?.length) {
    lines.push('');
    lines.push(`── Self-repair (${repair.attempts.length} attempt(s)) ──`);
    for (const a of repair.attempts) {
      const tag = a.repair_applied ? ` → repair: ${a.repair_applied}` : '';
      lines.push(`• #${a.attempt}: ${a.pass_fail}${a.target_file ? ` · ${a.target_file}` : ''}${a.blocker ? ` · ${a.blocker}` : ''}${tag}`);
    }
    if (repair.repaired && repair.success_attempt) {
      lines.push(`Recovered on attempt ${repair.success_attempt}.`);
    } else     if (repair.exhausted) {
      lines.push('Repair budget exhausted — quorum + Chair attempted if eligible.');
    }
    const quorum = repair.quorum_escalation;
    if (quorum?.stages?.length) {
      lines.push('');
      lines.push('── Quorum escalation (CFO overseen) ──');
      if (quorum.cfo?.roi_note) lines.push(`CFO: ${quorum.cfo.roi_note}`);
      for (const s of quorum.stages) {
        if (s.ok) {
          lines.push(`• ${s.stage}: ${s.plan?.fix_approach} (confidence ${s.plan?.confidence ?? '?'})`);
        } else {
          lines.push(`• ${s.stage}: failed (${s.error || 'unknown'})`);
        }
      }
      if (repair.recovered_via) lines.push(`Recovered via ${repair.recovered_via}.`);
    }
  }

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

const FALSE_EXECUTION_CLAIM = /\b(successfully executed|has been triggered|build has been|mission .{0,40} (complete|completed|executed)|updated according to|necessary files and configurations have been)\b/i;

/**
 * Strip LLM theater when no command ran — conversation path only.
 */
export function sanitizeConversationReply(text, { command_truth = 'NO_COMMAND_RAN' } = {}) {
  const scrubbed = scrubCounselTheater(text, command_truth);
  const theater = detectCounselTheater(text, command_truth);
  if (theater.violation && !scrubbed.trim()) {
    return 'I cannot claim that action ran — nothing executed. Tell me what to run.';
  }
  if (scrubbed.trim()) return scrubbed;

  const reply = String(text || '').trim();
  if (!reply || command_truth !== 'NO_COMMAND_RAN') return reply;
  if (!FALSE_EXECUTION_CLAIM.test(reply) && !/\b(COMMITTED|deployed to production)\b/i.test(reply)) {
    return reply;
  }
  return [
    'No command ran — I cannot claim execution or Point B from conversation alone.',
    '',
    'To run LifeRE toward Point B, say:',
    '**Execute mission PRODUCT-LIFERE-OS-V1-0001**',
    'or resend your Point B packet (the system will auto-route to the foundation pipeline).',
    '',
    `(Blocked false claim in model reply: "${reply.slice(0, 120)}…")`,
  ].join('\n');
}
