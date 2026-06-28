/**
 * SYNOPSIS: Never-stop founder build loop — infer target_file, retry on repairable blockers.
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
  applyVisualUiPatch,
  isVisualUiPatchRequest,
} from './founder-visual-ui-patch.js';
import {
  applySurgicalHtmlCommentPatch,
  commitSurgicalPatchViaBuilder,
  isSurgicalHtmlCommentPatch,
  parseSurgicalHtmlCommentPatch,
} from './founder-overlay-surgical-patch.js';
import {
  applyVoiceSendWirePatch,
  commitVoiceSendPatchViaBuilder,
  isVoiceSendWireOrder,
} from './founder-voice-send-patch.js';
import {
  applyEnterKeySendWirePatch,
  commitEnterKeySendPatchViaBuilder,
  isEnterKeySendWireOrder,
} from './founder-enter-send-patch.js';
import {
  assertFounderBuildBaseUrl,
  runFounderSuccessGate,
  triggerRailwayRedeploy,
  waitForDeployMatchingCommit,
  waitForLiveCssContent,
} from './founder-build-success-gate.js';
import {
  createFounderBuildJob,
  getFounderBuildJob,
  setFounderBuildJobResult,
} from './founder-build-job-store.js';
import {
  createFounderInterfaceBuildJobRecord,
  persistFounderBuildJobResult,
} from './builderos-command-control-service.js';
import { resolvePlatformGapFillForBuildDispatch } from './builderos-governed-loop-executor.js';
import {
  FOUNDER_SOLO_ATTEMPT_MAX,
  runFounderBuildQuorumEscalation,
  buildQuorumFailureEnvelope,
  recordFounderEscalationLesson,
  loadFounderBuildLessons,
} from './founder-build-quorum-escalation.js';
import { enforceBeforeBuilderDispatch, formatUnifiedGateBlockSummary } from './founder-packet-v2-unified-gate.js';
import { buildAttemptCarryForwardContext } from './self-repair-attempt-context.js';

export const DEFAULT_MAX_FOUNDER_BUILD_ATTEMPTS = FOUNDER_SOLO_ATTEMPT_MAX;
const POST_JSON_TIMEOUT_MS = Number(process.env.FOUNDER_POST_JSON_TIMEOUT_MS || '120000');
const FOUNDER_BUILD_JOB_TIMEOUT_MS = Number(process.env.FOUNDER_BUILD_JOB_TIMEOUT_MS || '480000');

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
    if (isSurgicalHtmlCommentPatch(task)) {
      const spec = parseSurgicalHtmlCommentPatch(task);
      return { targetFile: spec?.targetFile || currentTarget, repair: 'surgical_html_comment' };
    }
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

function prepareRetryContext({
  attempt,
  attempts,
  lessons,
  proposedFix,
  consensusParticipants = [],
}) {
  return buildAttemptCarryForwardContext({
    attemptNumber: attempt,
    priorAttempts: attempts,
    lessonsLoaded: lessons,
    researchCompleted: false,
    consensusParticipants,
    proposedFix,
  });
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

async function tryApplyQuorumPlan({
  plan,
  stage,
  task,
  commandKey,
  baseUrl,
  repoRoot,
  buildFailureReceipt,
  enforceExecutionTruth,
  callCouncilMember,
  pool,
}) {
  if (!plan?.augmented_task) return null;
  const approach = String(plan.fix_approach || 'builder_execute');
  const nextTask = String(plan.augmented_task).trim() || task;

  if (approach === 'surgical_html_comment' || isSurgicalHtmlCommentPatch(nextTask) || isSurgicalHtmlCommentPatch(task)) {
    return runSurgicalHtmlPatchWithVerification({
      task: nextTask,
      commandKey,
      baseUrl,
      repoRoot,
      buildFailureReceipt,
      enforceExecutionTruth,
    });
  }

  if (approach === 'enter_key_send_wire' || isEnterKeySendWireOrder(nextTask) || isEnterKeySendWireOrder(task)) {
    return runEnterKeySendPatchWithVerification({
      task: nextTask,
      commandKey,
      baseUrl,
      repoRoot,
      buildFailureReceipt,
      enforceExecutionTruth,
    });
  }

  if (approach === 'voice_send_wire' || isVoiceSendWireOrder(nextTask) || isVoiceSendWireOrder(task)) {
    return runVoiceSendPatchWithVerification({
      task: nextTask,
      commandKey,
      baseUrl,
      repoRoot,
      buildFailureReceipt,
      enforceExecutionTruth,
    });
  }

  if (approach === 'css_patch' || isCssOnlyUiFeedback(nextTask) || isCssOnlyUiFeedback(task)) {
    return runCssPatchWithVerification({
      task: nextTask,
      commandKey,
      baseUrl,
      repoRoot,
      maxAttempts: 1,
      buildFailureReceipt,
      enforceExecutionTruth,
      skipQuorum: true,
      callCouncilMember,
      pool,
      quorumStage: stage,
    });
  }

  return runFounderBuildWithSelfRepair({
    task: nextTask,
    commandKey,
    baseUrl,
    maxAttempts: 1,
    buildFailureReceipt,
    enforceExecutionTruth,
    repoRoot,
    skipQuorum: true,
    callCouncilMember,
    pool,
    quorumStage: stage,
  });
}

async function escalateAfterSoloExhaustion({
  task,
  attempts,
  blocker,
  verification,
  targetFile,
  commandKey,
  baseUrl,
  repoRoot,
  buildFailureReceipt,
  enforceExecutionTruth,
  callCouncilMember,
  pool,
  baseFailure,
  executionPath,
}) {
  let recovered = null;
  let recoveredVia = null;

  const receipt = await runFounderBuildQuorumEscalation({
    task,
    attempts,
    blocker,
    verification,
    targetFile,
    callCouncilMember,
    pool,
    onStagePlan: async (plan, stage) => {
      const applied = await tryApplyQuorumPlan({
        plan,
        stage,
        task,
        commandKey,
        baseUrl,
        repoRoot,
        buildFailureReceipt,
        enforceExecutionTruth,
        callCouncilMember,
        pool,
      });
      if (applied?.pass_fail === 'PASS') {
        recovered = applied;
        recoveredVia = stage;
        await recordFounderEscalationLesson(pool, {
          task,
          blocker,
          stage,
          outcome: 'PASS',
          plan,
        });
        return { stop: true };
      }
      return { stop: false };
    },
  });

  if (recovered) {
    return {
      ...recovered,
      self_repair: {
        ...(recovered.self_repair || {}),
        solo_attempts: attempts,
        quorum_escalation: receipt,
        recovered_via: recoveredVia,
      },
    };
  }

  return buildQuorumFailureEnvelope(receipt, {
    ...baseFailure,
    execution_path: executionPath,
    self_repair: { attempts, exhausted: true, quorum_escalation: receipt },
  });
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
  skipQuorum = false,
  skipLiveVerification = false,
  callCouncilMember = null,
  pool = null,
  quorumStage = null,
  patchFn = applyAssistantBubbleCssPatch,
  executionPath = 'founder_css_patch',
}) {
  const effectiveSkipQuorum = skipQuorum === true;
  const baseCheck = assertFounderBuildBaseUrl(baseUrl);
  if (!baseCheck.ok) {
    const failure = enforceExecutionTruth({
      ok: false,
      committed: false,
      first_blocker: baseCheck.blocker,
      failure_code: baseCheck.code,
      execution_path: executionPath,
    }, { action: 'build', task });
    return failure;
  }
  const verifiedBase = baseCheck.baseUrl;

  const attempts = [];
  let lastPatch = null;
  let lastExec = null;
  let lastVerification = null;
  let redeployTriggered = false;
  const loadedLessons = await loadFounderBuildLessons(pool);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const carryForward = prepareRetryContext({
      attempt,
      attempts,
      lessons: loadedLessons,
      proposedFix: attempt === 1 ? 'direct_css_patch' : (attempts.at(-1)?.repair_applied || 'retry_css_patch'),
    });
    if (!carryForward.ok) {
      const blocked = enforceExecutionTruth({
        ok: false,
        committed: false,
        first_blocker: carryForward.blocked_return.code,
        failure_code: carryForward.blocked_return.code,
        execution_path: executionPath,
      }, { action: 'build', task });
      return {
        ...blocked,
        blocked_return: carryForward.blocked_return,
        self_repair: { attempts, exhausted: true },
      };
    }
    const patchResult = patchFn({
      root: repoRoot,
      task,
      cacheBust: cacheBust || undefined,
    });
    if (!patchResult.ok) {
      attempts.push({
        attempt,
        pass_fail: 'FAIL',
        blocker: patchResult.reason,
        repair: null,
        attempt_context: carryForward.attempt_context,
      });
      break;
    }
    lastPatch = patchResult;

    let execRes;
    try {
      execRes = await commitCssPatchViaBuilder({ baseUrl: verifiedBase, commandKey, patchResult });
    } catch (err) {
      attempts.push({
        attempt,
        pass_fail: 'FAIL',
        blocker: err.message,
        repair: null,
        attempt_context: carryForward.attempt_context,
      });
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
        attempt_context: carryForward.attempt_context,
      });
      break;
    }

    if (skipLiveVerification) {
      const result = enforceExecutionTruth({
        ok: true,
        committed: true,
        pass_fail: 'PASS',
        target_file: committedFiles.join(', '),
        sha,
        generated_output: patchResult.files?.[0]?.output || '',
        first_blocker: null,
        execution_receipt: { pass_fail: 'PASS', blocker: null, lesson: null, fix: null },
        execution_path: executionPath,
        founder_verification_required: false,
        task_meta: {
          output_bytes: patchResult.files?.[0]?.output?.length || 0,
          patch: patchResult.patch,
          committed_files: committedFiles,
          cache_bust: patchResult.cache_bust,
          direct_order: true,
        },
        exec_meta: execJson,
      }, { action: 'build', task });
      return {
        ...result,
        human_summary: `${result.human_summary}\nDirect order — commit landed; live CSS verify deferred.`,
        self_repair: { attempts, repaired: attempt > 1, success_attempt: attempt },
      };
    }

    if (!redeployTriggered) {
      redeployTriggered = true;
      await triggerRailwayRedeploy({ baseUrl: verifiedBase, commandKey });
    }

    let verification = await runFounderSuccessGate({
      task,
      executionPath,
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
      attempt_context: carryForward.attempt_context,
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
        execution_path: executionPath,
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
          execution_path: executionPath,
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
    execution_path: executionPath,
    founder_verification: lastVerification,
    founder_verification_required: true,
    failure_code: lastVerification?.code || null,
    task_meta: {
      committed_files: committedFiles,
      cache_bust: lastPatch?.cache_bust,
    },
    exec_meta: execJson,
  }, { action: 'build', task });
  const baseFailure = { ...failure, self_repair: { attempts, exhausted: true, quorum_stage: quorumStage || null } };

  if (!effectiveSkipQuorum && attempts.length >= FOUNDER_SOLO_ATTEMPT_MAX) {
    return escalateAfterSoloExhaustion({
      task,
      attempts,
      blocker: lastVerification?.blocker || receipt.blocker,
      verification: lastVerification,
      targetFile: committedFiles.join(', '),
      commandKey,
      baseUrl: verifiedBase,
      repoRoot,
      buildFailureReceipt,
      enforceExecutionTruth,
      callCouncilMember,
      pool,
      baseFailure,
      executionPath,
    });
  }

  return baseFailure;
}

async function runSurgicalHtmlPatchWithVerification({
  task,
  commandKey,
  baseUrl,
  repoRoot,
  buildFailureReceipt,
  enforceExecutionTruth,
}) {
  const baseCheck = assertFounderBuildBaseUrl(baseUrl);
  if (!baseCheck.ok) {
    return enforceExecutionTruth({
      ok: false,
      committed: false,
      first_blocker: baseCheck.blocker,
      failure_code: baseCheck.code,
      execution_path: 'founder_surgical_html_patch',
    }, { action: 'build', task });
  }

  const patchResult = applySurgicalHtmlCommentPatch({ root: repoRoot, task });
  if (!patchResult.ok) {
    return enforceExecutionTruth({
      ok: false,
      committed: false,
      first_blocker: patchResult.reason || 'surgical_patch_failed',
      failure_code: 'SURGICAL_PATCH_FAILED',
      execution_path: 'founder_surgical_html_patch',
    }, { action: 'build', task });
  }

  let execRes;
  try {
    execRes = await commitSurgicalPatchViaBuilder({
      baseUrl: baseCheck.baseUrl,
      commandKey,
      patchResult,
    });
  } catch (err) {
    return enforceExecutionTruth({
      ok: false,
      committed: false,
      first_blocker: err.message,
      execution_path: 'founder_surgical_html_patch',
    }, { action: 'build', task });
  }

  const execJson = execRes.json || {};
  const committedFiles = execRes.committed_files || patchResult.files?.map((f) => f.target_file) || [];
  if (!execJson.ok || !execJson.committed) {
    const receipt = buildFailureReceipt(task, {}, execJson);
    return enforceExecutionTruth({
      ok: false,
      committed: false,
      first_blocker: receipt.blocker,
      execution_receipt: receipt,
      execution_path: 'founder_surgical_html_patch',
    }, { action: 'build', task });
  }

  return enforceExecutionTruth({
    ok: true,
    committed: true,
    target_file: committedFiles.join(', ') || patchResult.files?.[0]?.target_file,
    sha: execJson.sha || execJson.commit_sha || null,
    human_summary: patchResult.already_present
      ? `Comment already present in ${patchResult.files?.[0]?.target_file}`
      : `Surgical HTML comment applied to ${patchResult.files?.[0]?.target_file}`,
    execution_path: 'founder_surgical_html_patch',
    task_meta: { patch: patchResult.patch, comment: patchResult.comment },
    exec_meta: execJson,
  }, { action: 'build', task });
}

async function runVoiceSendPatchWithVerification({
  task,
  commandKey,
  baseUrl,
  repoRoot,
  buildFailureReceipt,
  enforceExecutionTruth,
}) {
  const baseCheck = assertFounderBuildBaseUrl(baseUrl);
  if (!baseCheck.ok) {
    return enforceExecutionTruth({
      ok: false,
      committed: false,
      first_blocker: baseCheck.blocker,
      failure_code: baseCheck.code,
      execution_path: 'founder_voice_send_patch',
    }, { action: 'build', task });
  }

  const patchResult = applyVoiceSendWirePatch({ root: repoRoot, task });
  if (!patchResult.ok) {
    return enforceExecutionTruth({
      ok: false,
      committed: false,
      first_blocker: patchResult.reason || 'voice_send_patch_failed',
      failure_code: 'VOICE_SEND_PATCH_FAILED',
      execution_path: 'founder_voice_send_patch',
    }, { action: 'build', task });
  }

  if (patchResult.already_present) {
    return enforceExecutionTruth({
      ok: true,
      committed: false,
      pass_fail: 'PASS',
      target_file: patchResult.files?.[0]?.target_file,
      human_summary: `Voice send wire already present in ${patchResult.files?.[0]?.target_file}`,
      execution_path: 'founder_voice_send_patch',
      task_meta: { patch: patchResult.patch, already_present: true },
    }, { action: 'build', task });
  }

  let execRes;
  try {
    execRes = await commitVoiceSendPatchViaBuilder({
      baseUrl: baseCheck.baseUrl,
      commandKey,
      patchResult,
    });
  } catch (err) {
    return enforceExecutionTruth({
      ok: false,
      committed: false,
      first_blocker: err.message,
      execution_path: 'founder_voice_send_patch',
    }, { action: 'build', task });
  }

  const execJson = execRes.json || {};
  const committedFiles = execRes.committed_files || patchResult.files?.map((f) => f.target_file) || [];
  if (!execJson.ok || !execJson.committed) {
    const receipt = buildFailureReceipt(task, {}, execJson);
    return enforceExecutionTruth({
      ok: false,
      committed: false,
      first_blocker: receipt.blocker,
      execution_receipt: receipt,
      execution_path: 'founder_voice_send_patch',
    }, { action: 'build', task });
  }

  await triggerRailwayRedeploy({ baseUrl: baseCheck.baseUrl, commandKey });

  return enforceExecutionTruth({
    ok: true,
    committed: true,
    pass_fail: 'PASS',
    target_file: committedFiles.join(', ') || patchResult.files?.[0]?.target_file,
    sha: execJson.sha || execJson.commit_sha || null,
    human_summary: `Voice "send it" wired in ${patchResult.files?.[0]?.target_file}. Hard refresh once, then dictate and say "send it".`,
    execution_path: 'founder_voice_send_patch',
    task_meta: { patch: patchResult.patch },
    exec_meta: execJson,
  }, { action: 'build', task });
}

async function runEnterKeySendPatchWithVerification({
  task,
  commandKey,
  baseUrl,
  repoRoot,
  buildFailureReceipt,
  enforceExecutionTruth,
}) {
  const baseCheck = assertFounderBuildBaseUrl(baseUrl);
  if (!baseCheck.ok) {
    return enforceExecutionTruth({
      ok: false,
      committed: false,
      first_blocker: baseCheck.blocker,
      failure_code: baseCheck.code,
      execution_path: 'founder_enter_send_patch',
    }, { action: 'build', task });
  }

  const patchResult = applyEnterKeySendWirePatch({ root: repoRoot, task });
  if (!patchResult.ok) {
    return enforceExecutionTruth({
      ok: false,
      committed: false,
      first_blocker: patchResult.reason || 'enter_send_patch_failed',
      failure_code: 'ENTER_SEND_PATCH_FAILED',
      execution_path: 'founder_enter_send_patch',
    }, { action: 'build', task });
  }

  if (patchResult.already_present) {
    return enforceExecutionTruth({
      ok: true,
      committed: false,
      pass_fail: 'PASS',
      target_file: patchResult.files?.map((f) => f.target_file).join(', '),
      human_summary: `Enter-to-send already wired (${patchResult.files?.map((f) => f.target_file).join(', ')}). Hard refresh once if behavior looks stale.`,
      execution_path: 'founder_enter_send_patch',
      task_meta: { patch: patchResult.patch, already_present: true },
    }, { action: 'build', task });
  }

  let execRes;
  try {
    execRes = await commitEnterKeySendPatchViaBuilder({
      baseUrl: baseCheck.baseUrl,
      commandKey,
      patchResult,
    });
  } catch (err) {
    return enforceExecutionTruth({
      ok: false,
      committed: false,
      first_blocker: err.message,
      execution_path: 'founder_enter_send_patch',
    }, { action: 'build', task });
  }

  const execJson = execRes.json || {};
  const committedFiles = execRes.committed_files || patchResult.files?.map((f) => f.target_file) || [];
  if (!execJson.ok || !execJson.committed) {
    const receipt = buildFailureReceipt(task, {}, execJson);
    return enforceExecutionTruth({
      ok: false,
      committed: false,
      first_blocker: receipt.blocker,
      execution_receipt: receipt,
      execution_path: 'founder_enter_send_patch',
    }, { action: 'build', task });
  }

  await triggerRailwayRedeploy({ baseUrl: baseCheck.baseUrl, commandKey });

  return enforceExecutionTruth({
    ok: true,
    committed: true,
    pass_fail: 'PASS',
    target_file: committedFiles.join(', '),
    sha: execJson.sha || execJson.commit_sha || null,
    human_summary: `Enter sends message (Shift+Enter = newline) in ${committedFiles.join(', ')}. Hard refresh once.`,
    execution_path: 'founder_enter_send_patch',
    task_meta: { patch: patchResult.patch },
    exec_meta: execJson,
  }, { action: 'build', task });
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
    skipQuorum = false,
    callCouncilMember = null,
    pool = null,
    quorumStage = null,
  } = options;

  const base = String(baseUrl || '').replace(/\/$/, '');
  const headers = { 'Content-Type': 'application/json', 'x-command-key': commandKey };
  let currentTask = String(task || '').trim();
  const directOrder = options.confirmIntent === true;
  const effectiveSkipQuorum = skipQuorum || directOrder;
  let targetFile = resolveFounderBuildTarget(currentTask);
  const platformGapFill = resolvePlatformGapFillForBuildDispatch(
    {
      domain: 'builderos-platform',
      task: currentTask,
      target_file: targetFile || undefined,
    },
    {
      instruction: currentTask,
      metadata_json: targetFile ? { target_file: targetFile } : {},
    },
    {},
  );

  const fpV2Gate = await enforceBeforeBuilderDispatch({
    task: currentTask,
    pool,
    callAI: callCouncilMember,
    confirmIntent: options.confirmIntent === true,
    platformGapFill: options.platform_gap_fill === true || platformGapFill?.platform_gap_fill === true,
    platformGapFillReason: options.platform_gap_fill_reason || platformGapFill?.platform_gap_fill_reason,
  });
  if (!fpV2Gate.execute_cleared) {
    const blocker = fpV2Gate.violations?.[0] || 'BLOCKED_FOUNDER_PACKET_V2';
    const failure = enforceExecutionTruth({
      ok: false,
      committed: false,
      first_blocker: blocker,
      failure_code: 'BLOCKED_FOUNDER_PACKET_V2',
      human_summary: formatUnifiedGateBlockSummary(fpV2Gate),
      execution_path: 'founder_build_self_repair',
    }, { action: 'build', task: currentTask });
    return { ...failure, fp_v2_gate: fpV2Gate };
  }

  if (isSurgicalHtmlCommentPatch(currentTask)) {
    return runSurgicalHtmlPatchWithVerification({
      task: currentTask,
      commandKey,
      baseUrl: base,
      repoRoot,
      buildFailureReceipt,
      enforceExecutionTruth,
    });
  }

  if (isVoiceSendWireOrder(currentTask)) {
    return runVoiceSendPatchWithVerification({
      task: currentTask,
      commandKey,
      baseUrl: base,
      repoRoot,
      buildFailureReceipt,
      enforceExecutionTruth,
    });
  }

  if (isEnterKeySendWireOrder(currentTask)) {
    return runEnterKeySendPatchWithVerification({
      task: currentTask,
      commandKey,
      baseUrl: base,
      repoRoot,
      buildFailureReceipt,
      enforceExecutionTruth,
    });
  }

  if (isVisualUiPatchRequest(currentTask)) {
    return runCssPatchWithVerification({
      task: currentTask,
      commandKey,
      baseUrl: base,
      repoRoot,
      maxAttempts,
      buildFailureReceipt,
      enforceExecutionTruth,
      skipQuorum: effectiveSkipQuorum,
      skipLiveVerification: directOrder,
      callCouncilMember,
      pool,
      quorumStage,
      patchFn: applyVisualUiPatch,
      executionPath: 'founder_visual_ui_patch',
    });
  }

  if (isCssOnlyUiFeedback(currentTask)) {
    return runCssPatchWithVerification({
      task: currentTask,
      commandKey,
      baseUrl: base,
      repoRoot,
      maxAttempts,
      buildFailureReceipt,
      enforceExecutionTruth,
      skipQuorum: effectiveSkipQuorum,
      skipLiveVerification: directOrder,
      callCouncilMember,
      pool,
      quorumStage,
    });
  }

  const attempts = [];
  const loadedLessons = await loadFounderBuildLessons(pool);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const carryForward = prepareRetryContext({
      attempt,
      attempts,
      lessons: loadedLessons,
      proposedFix: attempt === 1 ? (targetFile || 'initial_builder_dispatch') : (attempts.at(-1)?.repair_applied || targetFile || 'retry_builder_dispatch'),
    });
    if (!carryForward.ok) {
      const blocked = enforceExecutionTruth({
        ok: false,
        committed: false,
        first_blocker: carryForward.blocked_return.code,
        failure_code: carryForward.blocked_return.code,
        execution_path: 'builder_task_execute',
      }, { action: 'build', task: currentTask });
      return {
        ...blocked,
        blocked_return: carryForward.blocked_return,
        self_repair: { attempts, exhausted: true },
      };
    }
    const taskBody = {
      task: currentTask,
      mode: 'code',
      useCache: false,
      ...(platformGapFill || {}),
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
          attempt_context: carryForward.attempt_context,
        });
        const repair = pickRepairTarget(currentTask, targetFile, failure.first_blocker);
        if (repair && attempt < maxAttempts && isRetriableBlocker(failure.first_blocker)) {
          targetFile = repair.targetFile;
          currentTask = augmentTaskWithGapFillScope(currentTask, targetFile);
          attempts[attempts.length - 1].repair_applied = repair.repair;
          continue;
        }
        if (!effectiveSkipQuorum && attempts.length >= FOUNDER_SOLO_ATTEMPT_MAX) {
          return escalateAfterSoloExhaustion({
            task: currentTask,
            attempts,
            blocker: failure.first_blocker,
            verification: null,
            targetFile,
            commandKey,
            baseUrl: base,
            repoRoot,
            buildFailureReceipt,
            enforceExecutionTruth,
            callCouncilMember,
            pool,
            baseFailure: { ...failure, self_repair: { attempts, exhausted: true } },
            executionPath: 'builder_task_execute',
          });
        }
        return { ...failure, self_repair: { attempts, exhausted: true } };
      }

      const execTarget = taskJson.target_file || taskJson.placement?.target_file || targetFile;
      const execRes = await postJson(`${base}/api/v1/lifeos/builder/execute`, headers, {
        output: taskJson.output,
        target_file: execTarget,
        commit_message: `[system-build] ${currentTask.slice(0, 80)}`,
        ...(platformGapFill || {}),
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
        attempt_context: carryForward.attempt_context,
      });

      if (result.pass_fail === 'PASS' && result.committed) {
        const commitSha = result.sha || execJson.sha || execJson.commit_sha || null;
        const baseCheck = assertFounderBuildBaseUrl(base);
        if (commitSha && baseCheck.ok) {
          await triggerRailwayRedeploy({ baseUrl: baseCheck.baseUrl, commandKey, commitSha });
          const deploy = await waitForDeployMatchingCommit({
            baseUrl: baseCheck.baseUrl,
            commandKey,
            commitSha,
            maxWaitMs: 60000,
          });
          if (deploy.ok) {
            result = {
              ...result,
              origin_contains_commit: true,
              transport_status: 'REMOTE_TRANSPORT_PASS',
              human_summary: [
                result.human_summary,
                `Live deploy synced to ${String(commitSha).slice(0, 12)}.`,
              ].filter(Boolean).join('\n'),
            };
          }
        }
        return { ...result, self_repair: { attempts, repaired: attempt > 1, success_attempt: attempt } };
      }

      const repair = pickRepairTarget(currentTask, resolvedTarget || targetFile, receipt.blocker);
      if (repair && attempt < maxAttempts && isRetriableBlocker(receipt.blocker)) {
        targetFile = repair.targetFile;
        currentTask = augmentTaskWithGapFillScope(currentTask, targetFile);
        attempts[attempts.length - 1].repair_applied = repair.repair;
        continue;
      }

      if (!effectiveSkipQuorum && attempts.length >= FOUNDER_SOLO_ATTEMPT_MAX) {
        return escalateAfterSoloExhaustion({
          task: currentTask,
          attempts,
          blocker: result.first_blocker,
          verification: null,
          targetFile: resolvedTarget || targetFile,
          commandKey,
          baseUrl: base,
          repoRoot,
          buildFailureReceipt,
          enforceExecutionTruth,
          callCouncilMember,
          pool,
          baseFailure: { ...result, self_repair: { attempts, exhausted: true } },
          executionPath: 'builder_task_execute',
        });
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
      attempts.push({
        attempt,
        target_file: targetFile,
        pass_fail: 'FAIL',
        blocker: err.message,
        repair: null,
        attempt_context: carryForward.attempt_context,
      });
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
  const baseFailure = { ...failure, self_repair: { attempts, exhausted: true } };
  if (!effectiveSkipQuorum && attempts.length >= FOUNDER_SOLO_ATTEMPT_MAX) {
    return escalateAfterSoloExhaustion({
      task: currentTask,
      attempts,
      blocker: receipt.blocker,
      verification: null,
      targetFile,
      commandKey,
      baseUrl: base,
      repoRoot,
      buildFailureReceipt,
      enforceExecutionTruth,
      callCouncilMember,
      pool,
      baseFailure,
      executionPath: 'builder_task_execute',
    });
  }
  return baseFailure;
}

export function startFounderBuildJob(options) {
  const jobId = createFounderBuildJob({ task: options.task, userId: options.userId || null });
  if (options.pool) {
    createFounderInterfaceBuildJobRecord(options.pool, {
      id: jobId,
      instruction: options.task,
      userId: options.userId || null,
    }).catch((err) => {
      console.warn('[founder-build-job] db persist failed:', err.message);
    });
  }
  setImmediate(async () => {
    try {
      const buildPromise = runFounderBuildWithSelfRepair(options);
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error(`founder_build_job_timeout after ${FOUNDER_BUILD_JOB_TIMEOUT_MS}ms`)),
          FOUNDER_BUILD_JOB_TIMEOUT_MS,
        );
      });
      const result = await Promise.race([buildPromise, timeoutPromise]);
      setFounderBuildJobResult(jobId, result);
      if (options.pool) {
        await persistFounderBuildJobResult(options.pool, jobId, result).catch((err) => {
          console.warn('[founder-build-job] db result persist failed:', err.message);
        });
      }
    } catch (err) {
      const failResult = {
        pass_fail: 'FAIL',
        first_blocker: err.message,
        execution_path: 'founder_build_self_repair',
      };
      setFounderBuildJobResult(jobId, failResult);
      if (options.pool) {
        await persistFounderBuildJobResult(options.pool, jobId, failResult).catch(() => {});
      }
    }
  });
  return jobId;
}

export function getFounderBuildJobStatus(jobId) {
  return getFounderBuildJob(jobId);
}
