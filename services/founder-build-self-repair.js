/**
 * Never-stop founder build loop — infer target_file, retry on repairable blockers.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */
import {
  augmentTaskWithGapFillScope,
  CANONICAL_FOUNDER_UI_TARGET,
  inferTargetFileFromFounderFeedback,
  isCssOnlyUiFeedback,
  isMissingTargetFileBlocker,
  resolveFounderBuildTarget,
} from './builder-instruction-target.js';
import {
  applyAssistantBubbleCssPatch,
  commitCssPatchViaBuilder,
} from './founder-css-patch.js';
import {
  assertFounderBuildBaseUrl,
  runFounderSuccessGate,
  triggerRailwayRedeploy,
  waitForLiveCssContent,
} from './founder-build-success-gate.js';
import {
  createFounderBuildJob,
  getFounderBuildJob,
  setFounderBuildJobResult,
} from './founder-build-job-store.js';

export const DEFAULT_MAX_FOUNDER_BUILD_ATTEMPTS = 5;
const POST_JSON_TIMEOUT_MS = Number(process.env.FOUNDER_POST_JSON_TIMEOUT_MS || '120000');

function isRetriableBlocker(blocker = '', code = '') {
  const b = String(blocker);
  const c = String(code);
  if (isMissingTargetFileBlocker(b)) return true;
  if (/prose refusal|not code|too short|truncated|overlay shrink|refusing overlay/i.test(b)) return true;
  if (/OVERLAY_STUB|production shell requires/i.test(b)) return true;
  if (/FOUNDER_VISUAL_NOT_VERIFIED|DEPLOY_NOT_SYNCED|LIVE_FETCH_FAILED|LOCAL_CSS_MISSING|SCOPE_INCOMPLETE|FAIL_WRONG_OUTCOME/i.test(b)) return true;
  if (/FOUNDER_VISUAL_NOT_VERIFIED|DEPLOY_NOT_SYNCED|LIVE_FETCH_FAILED|LOCAL_CSS_MISSING|SCOPE_INCOMPLETE|FAIL_WRONG_OUTCOME/i.test(c)) return true;
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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), POST_JSON_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let json = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { ok: false, error: text.slice(0, 300) || 'Non-JSON response' };
    }
    return { status: res.status, json };
  } finally {
    clearTimeout(timer);
  }
}

async function runCssPatchWithVerification({
  task,
  commandKey,
  baseUrl,
  repoRoot,
  maxAttempts,
  buildFailureReceipt,
  enforceExecutionTruth,
  cacheBust,
}) {
  const baseCheck = assertFounderBuildBaseUrl(baseUrl);
  if (!baseCheck.ok) {
    const failure = enforceExecutionTruth({
      ok: false,
      committed: false,
      first_blocker: baseCheck.blocker,
      failure_code: baseCheck.code,
      execution_path: 'founder_css_patch',
    }, { action: 'build', task });
    return failure;
  }
  const verifiedBase = baseCheck.baseUrl;

  const attempts = [];
  let lastPatch = null;
  let lastExec = null;
  let lastVerification = null;
  let redeployTriggered = false;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const patchResult = applyAssistantBubbleCssPatch({
      root: repoRoot,
      task,
      cacheBust: cacheBust || undefined,
    });
    if (!patchResult.ok) {
      attempts.push({ attempt, pass_fail: 'FAIL', blocker: patchResult.reason, repair: null });
      break;
    }
    lastPatch = patchResult;

    let execRes;
    try {
      execRes = await commitCssPatchViaBuilder({ baseUrl: verifiedBase, commandKey, patchResult });
    } catch (err) {
      attempts.push({ attempt, pass_fail: 'FAIL', blocker: err.message, repair: null });
      break;
    }
    lastExec = execRes;
    const execJson = execRes.json || {};
    const committedFiles = execRes.committed_files || patchResult.files?.map((f) => f.target_file) || [];
    const sha = execJson.sha || execJson.commit_sha || null;

    if (!execJson.ok || !execJson.committed) {
      const receipt = buildFailureReceipt(task, {}, execJson);
      attempts.push({
        attempt,
        target_file: execRes.failed_file || committedFiles.join(', '),
        pass_fail: 'FAIL',
        blocker: receipt.blocker,
        repair: null,
      });
      break;
    }

    if (!redeployTriggered) {
      redeployTriggered = true;
      await triggerRailwayRedeploy({ baseUrl: verifiedBase, commandKey });
    }

    let verification = await runFounderSuccessGate({
      task,
      executionPath: 'founder_css_patch',
      patchResult,
      commitSha: sha,
      baseUrl: verifiedBase,
      commandKey,
    });
    lastVerification = verification;

    attempts.push({
      attempt,
      target_file: committedFiles.join(', '),
      pass_fail: verification.ok ? 'PASS' : 'FAIL',
      blocker: verification.blocker || verification.deploy_warning || null,
      sha,
      verification_code: verification.code,
      repair: null,
    });

    if (verification.ok) {
      const result = enforceExecutionTruth({
        ok: true,
        committed: true,
        target_file: committedFiles.join(', '),
        sha,
        generated_output: patchResult.files?.[0]?.output || '',
        first_blocker: null,
        execution_receipt: { pass_fail: 'PASS', blocker: null, lesson: null, fix: null },
        execution_path: 'founder_css_patch',
        founder_verification: verification,
        founder_verification_required: true,
        task_meta: {
          output_bytes: patchResult.files?.[0]?.output?.length || 0,
          patch: patchResult.patch,
          committed_files: committedFiles,
          cache_bust: patchResult.cache_bust,
        },
        exec_meta: execJson,
      }, { action: 'build', task });
      return {
        ...result,
        human_summary: [
          result.human_summary,
          verification.deploy_warning ? `Deploy note: ${verification.deploy_warning}` : null,
          'Hard refresh once. Client bubble proof runs automatically when available.',
        ].filter(Boolean).join('\n'),
        self_repair: { attempts, repaired: attempt > 1, success_attempt: attempt },
      };
    }

    if (attempt >= maxAttempts || !isRetriableBlocker(verification.blocker, verification.code)) {
      break;
    }

    if (/FOUNDER_VISUAL|LIVE_FETCH|DEPLOY_NOT_SYNCED|LOCAL_CSS|SCOPE_INCOMPLETE|FAIL_WRONG_OUTCOME/i.test(String(verification.code))) {
      if (!redeployTriggered) {
        attempts[attempts.length - 1].repair_applied = 'trigger_redeploy';
        redeployTriggered = true;
        await triggerRailwayRedeploy({ baseUrl: verifiedBase, commandKey });
      } else {
        attempts[attempts.length - 1].repair_applied = 'wait_live_content';
      }
      const liveRetry = await waitForLiveCssContent({ baseUrl: verifiedBase, patchResult, maxWaitMs: 30000 });
      if (liveRetry.ok) {
        verification = {
          ...liveRetry,
          outcome_verified: true,
          deploy_synced: false,
          deploy_warning: 'Live content matched before deploy SHA sync.',
          stage: 'complete',
        };
        lastVerification = verification;
        attempts[attempts.length - 1].pass_fail = 'PASS';
        attempts[attempts.length - 1].repair_applied = 'live_content_recovered';
        const result = enforceExecutionTruth({
          ok: true,
          committed: true,
          target_file: committedFiles.join(', '),
          sha,
          execution_path: 'founder_css_patch',
          founder_verification: verification,
          founder_verification_required: true,
          task_meta: { committed_files: committedFiles, cache_bust: patchResult.cache_bust },
          exec_meta: execJson,
        }, { action: 'build', task });
        return { ...result, self_repair: { attempts, repaired: true, success_attempt: attempt } };
      }
      cacheBust = `f${Date.now()}`;
      attempts[attempts.length - 1].repair_applied = 'recommit_css_sw_bump';
      continue;
    }
  }

  const execJson = lastExec?.json || {};
  const committedFiles = lastExec?.committed_files || lastPatch?.files?.map((f) => f.target_file) || [];
  const receipt = buildFailureReceipt(task, {}, execJson);
  const failure = enforceExecutionTruth({
    ok: false,
    committed: Boolean(execJson.committed),
    target_file: committedFiles.join(', ') || null,
    sha: execJson.sha || execJson.commit_sha || null,
    first_blocker: lastVerification?.blocker || receipt.blocker,
    execution_receipt: receipt,
    execution_path: 'founder_css_patch',
    founder_verification: lastVerification,
    founder_verification_required: true,
    failure_code: lastVerification?.code || null,
    task_meta: {
      committed_files: committedFiles,
      cache_bust: lastPatch?.cache_bust,
    },
    exec_meta: execJson,
  }, { action: 'build', task });
  return { ...failure, self_repair: { attempts, exhausted: true } };
}

export async function runFounderBuildWithSelfRepair(options) {
  const {
    task,
    commandKey,
    baseUrl,
    maxAttempts = DEFAULT_MAX_FOUNDER_BUILD_ATTEMPTS,
    buildFailureReceipt,
    enforceExecutionTruth,
    repoRoot = process.cwd(),
  } = options;

  const base = String(baseUrl || '').replace(/\/$/, '');
  const headers = { 'Content-Type': 'application/json', 'x-command-key': commandKey };
  let currentTask = String(task || '').trim();

  if (isCssOnlyUiFeedback(currentTask)) {
    return runCssPatchWithVerification({
      task: currentTask,
      commandKey,
      baseUrl: base,
      repoRoot,
      maxAttempts,
      buildFailureReceipt,
      enforceExecutionTruth,
    });
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
        attempts.push({ attempt, target_file: targetFile, pass_fail: failure.pass_fail, blocker: failure.first_blocker, repair: null });
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
        founder_verification_required: isCssOnlyUiFeedback(currentTask),
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

export function startFounderBuildJob(options) {
  const jobId = createFounderBuildJob({ task: options.task, userId: options.userId || null });
  setImmediate(async () => {
    try {
      const result = await runFounderBuildWithSelfRepair(options);
      setFounderBuildJobResult(jobId, result);
    } catch (err) {
      setFounderBuildJobResult(jobId, {
        pass_fail: 'FAIL',
        first_blocker: err.message,
        execution_path: 'founder_css_patch',
      });
    }
  });
  return jobId;
}

export function getFounderBuildJobStatus(jobId) {
  return getFounderBuildJob(jobId);
}
