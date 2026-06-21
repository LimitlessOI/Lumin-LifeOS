/**
 * Never-stop founder build loop — infer target_file, retry on repairable blockers.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
import {
  augmentTaskWithGapFillScope,
  CANONICAL_FOUNDER_UI_TARGET,
  inferTargetFileFromFounderFeedback,
  isMissingTargetFileBlocker,
  isCssOnlyUiFeedback,
  resolveFounderBuildTarget,
} from './builder-instruction-target.js';
import {
  applyAssistantBubbleCssPatch,
  commitCssPatchViaBuilder,
} from './founder-css-patch.js';

export const DEFAULT_MAX_FOUNDER_BUILD_ATTEMPTS = 5;

function isRetriableBlocker(blocker = '') {
  const b = String(blocker);
  if (isMissingTargetFileBlocker(b)) return true;
  if (/prose refusal|not code|too short|truncated|overlay shrink|refusing overlay|theme-overrides\.css/i.test(b)) return true;
  if (/OVERLAY_STUB|production shell requires/i.test(b)) return true;
  return false;
}

function pickRepairTarget(task, currentTarget, blocker) {
  if (/OVERLAY_STUB|overlay shrink|production shell requires|too short.*html/i.test(String(blocker))) {
    if (isCssOnlyUiFeedback(task)) {
      return { targetFile: 'public/overlay/lifeos-theme-overrides.css', repair: 'css_only_reroute' };
    }
  }
  if (isMissingTargetFileBlocker(blocker)) {
    const inferred = inferTargetFileFromFounderFeedback(task);
    if (inferred?.target_file && inferred.target_file !== currentTarget) {
      return { targetFile: inferred.target_file, repair: inferred.source };
    }
    if (!currentTarget) {
      return { targetFile: CANONICAL_FOUNDER_UI_TARGET, repair: 'default_ui_surface' };
    }
  }
  if (!currentTarget) {
    const resolved = resolveFounderBuildTarget(task);
    if (resolved) return { targetFile: resolved, repair: 'pre_dispatch_infer' };
  }
  return null;
}

async function postJson(url, headers, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return { status: res.status, json };
}

/**
 * Run builder task → execute with self-repair retries until PASS or exhaustion.
 */
export async function runFounderBuildWithSelfRepair({
  task,
  commandKey,
  baseUrl,
  maxAttempts = DEFAULT_MAX_FOUNDER_BUILD_ATTEMPTS,
  buildFailureReceipt,
  enforceExecutionTruth,
  repoRoot = process.cwd(),
}) {
  const base = String(baseUrl || '').replace(/\/$/, '');
  const headers = { 'Content-Type': 'application/json', 'x-command-key': commandKey };
  let currentTask = String(task || '').trim();

  if (isCssOnlyUiFeedback(currentTask)) {
    const patchResult = applyAssistantBubbleCssPatch({ root: repoRoot, task: currentTask });
    if (patchResult.ok) {
      try {
        const execRes = await commitCssPatchViaBuilder({ baseUrl: base, commandKey, patchResult });
        const execJson = execRes.json || {};
        const committedFiles = execRes.committed_files || patchResult.files?.map((f) => f.target_file) || [patchResult.target_file];
        const receipt = execJson.ok === true && execJson.committed === true
          ? { pass_fail: 'PASS', blocker: null, lesson: null, fix: null, gap_recommendation: null }
          : buildFailureReceipt(currentTask, {}, execJson);
        const result = enforceExecutionTruth({
          ok: execJson.ok === true,
          committed: execJson.committed === true,
          target_file: committedFiles.join(', '),
          sha: execJson.sha || execJson.commit_sha || null,
          generated_output: patchResult.files?.[0]?.output || patchResult.output,
          first_blocker: receipt.blocker,
          execution_receipt: receipt,
          execution_path: 'founder_css_patch',
          task_meta: {
            output_bytes: patchResult.files?.[0]?.output?.length || 0,
            patch: patchResult.patch,
            committed_files: committedFiles,
            cache_bust: patchResult.cache_bust,
          },
          exec_meta: execJson,
        }, { action: 'build', task: currentTask });
        if (result.pass_fail === 'PASS') {
          return {
            ...result,
            human_summary: `${result.human_summary || ''}\nHard refresh (Cmd+Shift+R) — updated inline CSS in dashboard + app shell + theme overrides.`,
            self_repair: {
              attempts: committedFiles.map((f, i) => ({
                attempt: i + 1,
                target_file: f,
                pass_fail: 'PASS',
                repair: 'mechanical_css_patch',
              })),
              repaired: false,
              success_attempt: 1,
            },
          };
        }
        currentTask = augmentTaskWithGapFillScope(currentTask, patchResult.target_file);
      } catch {
        /* fall through to LLM path */
      }
    }
  }

  let targetFile = resolveFounderBuildTarget(currentTask);
  const attempts = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const taskBody = {
      task: currentTask,
      mode: 'code',
      useCache: false,
      ...(targetFile ? { target_file: targetFile, files: [targetFile] } : {}),
    };

    let taskJson = {};
    let execJson = {};
    try {
      const taskRes = await postJson(`${base}/api/v1/lifeos/builder/task`, headers, taskBody);
      taskJson = taskRes.json || {};
      if (!taskJson.ok || !taskJson.output) {
        const receipt = buildFailureReceipt(currentTask, taskJson, {
          error: taskJson.error || 'Builder task returned no output.',
        });
        const failure = enforceExecutionTruth({
          ok: false,
          committed: false,
          first_blocker: receipt.blocker,
          execution_receipt: receipt,
          gap_recommendation: receipt.gap_recommendation,
          execution_path: 'builder_task_execute',
          task_meta: { cache_hit: taskJson.cache_hit === true, output_bytes: 0, error: taskJson.error || null },
        }, { action: 'build', task: currentTask });
        attempts.push({
          attempt,
          target_file: targetFile,
          pass_fail: failure.pass_fail,
          blocker: failure.first_blocker,
          repair: null,
        });
        const repair = pickRepairTarget(currentTask, targetFile, failure.first_blocker);
        if (repair && attempt < maxAttempts && isRetriableBlocker(failure.first_blocker)) {
          targetFile = repair.targetFile;
          currentTask = augmentTaskWithGapFillScope(currentTask, targetFile);
          attempts[attempts.length - 1].repair_applied = repair.repair;
          continue;
        }
        return { ...failure, self_repair: { attempts, exhausted: true } };
      }

      const execTarget = taskJson.target_file || taskJson.placement?.target_file || targetFile;
      const execRes = await postJson(`${base}/api/v1/lifeos/builder/execute`, headers, {
        output: taskJson.output,
        target_file: execTarget,
        commit_message: `[system-build] ${currentTask.slice(0, 80)}`,
      });
      execJson = execRes.json || {};
      const resolvedTarget = execJson.target_file || execTarget;
      const receipt = execJson.ok === true && execJson.committed === true
        ? { pass_fail: 'PASS', blocker: null, lesson: null, fix: null, gap_recommendation: null }
        : buildFailureReceipt(currentTask, taskJson, execJson);
      const result = enforceExecutionTruth({
        ok: execJson.ok === true,
        committed: execJson.committed === true,
        target_file: resolvedTarget,
        sha: execJson.sha || execJson.commit_sha || null,
        generated_output: taskJson.output,
        first_blocker: receipt.blocker,
        execution_receipt: receipt,
        gap_recommendation: execJson.gap_recommendation || receipt.gap_recommendation || null,
        execution_path: 'builder_task_execute',
        task_meta: {
          cache_hit: taskJson.cache_hit === true,
          output_bytes: typeof taskJson.output === 'string' ? taskJson.output.length : 0,
          error: taskJson.error || null,
        },
        exec_meta: execJson,
      }, { action: 'build', task: currentTask });

      attempts.push({
        attempt,
        target_file: resolvedTarget || targetFile,
        pass_fail: result.pass_fail,
        blocker: result.first_blocker,
        repair: null,
        sha: result.sha || null,
      });

      if (result.pass_fail === 'PASS' && result.committed) {
        return { ...result, self_repair: { attempts, repaired: attempt > 1, success_attempt: attempt } };
      }

      const repair = pickRepairTarget(currentTask, resolvedTarget || targetFile, receipt.blocker);
      if (repair && attempt < maxAttempts && isRetriableBlocker(receipt.blocker)) {
        targetFile = repair.targetFile;
        currentTask = augmentTaskWithGapFillScope(currentTask, targetFile);
        attempts[attempts.length - 1].repair_applied = repair.repair;
        continue;
      }

      return { ...result, self_repair: { attempts, exhausted: true } };
    } catch (err) {
      const receipt = buildFailureReceipt(currentTask, taskJson, { error: err.message });
      const failure = enforceExecutionTruth({
        ok: false,
        committed: false,
        first_blocker: err.message,
        execution_receipt: receipt,
        execution_path: 'builder_task_execute',
      }, { action: 'build', task: currentTask });
      attempts.push({ attempt, target_file: targetFile, pass_fail: 'FAIL', blocker: err.message, repair: null });
      return { ...failure, self_repair: { attempts, exhausted: true } };
    }
  }

  const receipt = buildFailureReceipt(currentTask, {}, { error: 'Self-repair attempt budget exhausted' });
  const failure = enforceExecutionTruth({
    ok: false,
    committed: false,
    first_blocker: receipt.blocker,
    execution_receipt: receipt,
    execution_path: 'builder_task_execute',
  }, { action: 'build', task: currentTask });
  return { ...failure, self_repair: { attempts, exhausted: true } };
}
