/**
 * SYNOPSIS: Lumin Chair — single front door for founder messages (orchestrates all channels).
 * WIRED: founder-interface/message via lifeos-builderos-command-control-routes.js
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isMissionPipelineIntent,
  extractMissionIdFromText,
  runFoundationPipelineForFounder,
} from './lifeos-mission-pipeline-executor.js';
import { isRepairContinuationIntent, extractTargetFileFromInstruction, resolveFounderBuildTarget, isCssOnlyUiFeedback, inferTargetFileFromFounderFeedback } from './builder-instruction-target.js';
import { handlePointBFounderMessage } from './point-b-navigator.js';
import { buildListeningOnboardingContext } from './lifeos-listening-profile.js';
import { loadPointBTarget } from './point-b-target-lite.js';
import { wrapChairHumanSummary } from './founder-communication-format.js';
import { enforceChairTruthExit } from './chair-truth-gate.js';
import { enforceDirectConnectionTruth } from './chair-direct-connection-truth.js';
import { enforceTruthLockdown } from './truth-lockdown.js';
import { expandFounderBuildTask, isFounderShipOrUsabilityIntent, resolveExplicitChairChannel } from './founder-chair-intent.js';
import { isGovernanceOrSsotIntent } from './founder-governance-clarify.js';
import {
  enforceFounderPacketV2Unified,
  formatUnifiedGateBlockSummary,
} from './founder-packet-v2-unified-gate.js';
import {
  gatherStrategicBriefForChair,
  formatStrategicBriefSection,
} from './lumin-strategic-intelligence.js';
import {
  assessChairIntentUnderstanding,
  formatChairIntentClarifySummary,
  CHAIR_INTENT_PROTOCOL,
} from './chair-intent-protocol.js';
import { isFounderPersonalLifeIntent } from './founder-life-admin-intent.js';
import { coerceDisplayMisrouteToChair } from './lumin-conversation-routing.js';
import {
  resolveChairContext,
  requiresPreExecuteClarify,
  chairChannelFromContext,
  hasHighConfidenceBuildTarget,
  hasProductBuildContext,
} from './chair-context-classifier.js';
import { runChairNativeTurn } from './chair-lumin-unified.js';
import { translateChairPersonality } from './chair-personality-translate.js';
import { shouldAttachStrategicBrief } from './chair-lumin-personal-mode.js';
import {
  isBlueprintExecuteIntent,
  isBuildRequest,
  isExplicitExecuteCommand,
  isPureCounselQuestion,
  isFounderRepairOrderIntent,
  isFounderUiBehaviorChangeRequest,
} from './chair-intent-signals.js';
import { stripChairDoPrefix, tryLuminChairSystemAction } from './lumin-chair-system-actions.js';
import {
  assessFounderUtteranceWisdom,
  formatWisdomClarifySummary,
  WISDOM_TRUTH_AUDITOR_VERSION,
} from './wisdom-truth-auditor.js';
import { getPointBDnaPromptBlock, POINT_B_DNA_VERSION } from './point-b-dna.js';
import {
  bindContinuationUtterance,
  compileFounderIntent,
  isFounderFrustrationContinuation,
} from './founder-intent-compiler.js';
import { executeFounderWorkIntent } from './founder-work-executors.js';
import {
  loadFounderThreadHistory,
  mergeConversationHistory,
} from './lumin-thread-context.js';

export {
  isBlueprintExecuteIntent,
  isBuildRequest,
  isExplicitExecuteCommand,
  isPureCounselQuestion,
} from './chair-intent-signals.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXECUTE_MISSION = path.join(REPO_ROOT, 'builderos-reboot/scripts/execute-mission.mjs');

export function classifyChairIntent(ctx = {}) {
  const forced = resolveExplicitChairChannel(ctx.explicitAction, { useTerminalForBuild: ctx.useTerminalForBuild });
  if (forced) return forced;
  return chairChannelFromContext(ctx.cleanedInput || '', ctx);
}

export function isChairActionableTurn(text = '', ctx = {}) {
  if (ctx.shouldDisplayOnly) return false;
  return requiresPreExecuteClarify(text, ctx);
}

function chairFpV2BlockResponse(ctx, enforcement, channel) {
  const summary = formatUnifiedGateBlockSummary(enforcement);
  const truth = finalizeTruth({
    ok: false,
    pass_fail: 'FAIL',
    command_truth: 'NO_COMMAND_RAN',
    receipt_truth: enforcement.blocker || 'BLOCKED_FOUNDER_PACKET_V2',
    action: channel || 'fp_v2_blocked',
    fp_v2_enforcement: enforcement,
    first_blocker: enforcement.violations?.[0] || enforcement.blocker,
    human_summary_technical: summary,
    done_synopsis: 'Blocked — Founder Packet V2 end-to-end gate failed.',
    next_synopsis: 'Fix IDC/builder blockers or clarify intent via Chair.',
    next_why: 'Results are the scoreboard.',
  }, channel || 'fp_v2_blocked');
  return {
    statusCode: 200,
    body: chairEnvelope(channel || 'fp_v2_blocked', {
      ...truth,
      intake_normalized: ctx.intakeNormalized,
      source_mode: ctx.sourceMode,
      auth_mode: ctx.auth_mode,
      user_role: ctx.user_role,
    }),
  };
}

function chairIntentClarifyResponse(ctx, understanding, summary, fpV2 = null) {
  const truth = finalizeTruth({
    ok: true,
    pass_fail: 'CLARIFY',
    command_truth: 'NO_COMMAND_RAN',
    receipt_truth: 'INTENT_NOT_YET_UNDERSTOOD',
    action: 'intent_clarify',
    chair_intent_protocol: CHAIR_INTENT_PROTOCOL.version,
    fp_v2_enforcement: fpV2,
    founder_packet_v2_authority: 'docs/constitution/FOUNDER_PACKET_V2_BUILDEROS_MASTER_ARCHITECTURE.md',
    intent: understanding,
    human_summary_technical: summary,
    done_synopsis: 'Chair is asking until your intent is clear — then it executes.',
    next_synopsis: 'Answer the questions or confirm A/B/C — Point B is what YOU want, not process theater.',
    next_why: CHAIR_INTENT_PROTOCOL.tools_not_destination,
  }, 'intent_clarify');
  return {
    statusCode: 200,
    body: chairEnvelope('intent_clarify', {
      ...truth,
      intake_normalized: ctx.intakeNormalized,
      source_mode: ctx.sourceMode,
      auth_mode: ctx.auth_mode,
      user_role: ctx.user_role,
    }),
  };
}

function chairRepairOrderAckResponse(ctx) {
  const summary = [
    'Repair order received — no command ran yet.',
    'Covenant: I execute or say honestly I cannot — I do not explain the bug back at you.',
    'Give me a concrete target: `do: …` or name the file/UI area to change.',
  ].join('\n');
  const truth = finalizeTruth({
    ok: true,
    pass_fail: 'CLARIFY',
    command_truth: 'NO_COMMAND_RAN',
    receipt_truth: 'REPAIR_ORDER_AWAITING_TARGET',
    action: 'repair_order_ack',
    repair_order_blocked_counsel: true,
    human_summary_technical: summary,
    done_synopsis: 'Repair intent locked — awaiting target, not counsel deflection.',
    next_synopsis: 'Say `do: fix X in …` or point at the exact UI/file.',
    next_why: 'Direct connection covenant: execute or HALT honestly.',
    direct_connection: true,
  }, 'repair_order_ack');
  return {
    statusCode: 200,
    body: chairEnvelope('repair_order_ack', {
      ...truth,
      intake_normalized: ctx.intakeNormalized,
      source_mode: ctx.sourceMode,
      auth_mode: ctx.auth_mode,
      user_role: ctx.user_role,
      conversational_mode: ctx.conversationalMode,
      direct_connection: true,
    }),
  };
}

function chairWisdomClarifyResponse(ctx, wisdom) {
  const summary = formatWisdomClarifySummary(wisdom);
  const truth = finalizeTruth({
    ok: true,
    pass_fail: 'CLARIFY',
    command_truth: 'NO_COMMAND_RAN',
    receipt_truth: 'WISDOM_ASSUMPTION_CHALLENGE',
    action: 'wisdom_clarify',
    wisdom_auditor: WISDOM_TRUTH_AUDITOR_VERSION,
    founder_input_epistemic: wisdom.epistemic_label,
    founder_input_treated_as: wisdom.founder_input_treated_as,
    wisdom_assessment: wisdom,
    human_summary_technical: summary,
    done_synopsis: 'Wisdom paused execution — assumptions must be clarified before lock.',
    next_synopsis: 'Answer the questions or confirm intent explicitly. No random moment scripts the system.',
    next_why: wisdom.wisdom_note,
  }, 'wisdom_clarify');
  return {
    statusCode: 200,
    body: chairEnvelope('wisdom_clarify', {
      ...truth,
      intake_normalized: ctx.intakeNormalized,
      source_mode: ctx.sourceMode,
      auth_mode: ctx.auth_mode,
      user_role: ctx.user_role,
    }),
  };
}

export function modelRoutingForChannel(channel) {
  switch (channel) {
    case 'display':
      return { route: 'lumin_chair_display', complexity: 'low', estimated_cost_tier: 'cheap' };
    case 'counsel':
    case 'life_admin':
    case 'lumin':
    case 'chair':
      return { route: 'lumin_chair_native', complexity: 'low', estimated_cost_tier: 'cheap' };
    case 'point_b':
      return { route: 'lumin_chair_point_b', complexity: 'high', estimated_cost_tier: 'medium' };
    case 'system_action':
      return { route: 'lumin_chair_system_action', complexity: 'low', estimated_cost_tier: 'cheap' };
    case 'work_execute':
      return { route: 'lumin_chair_work_execute', complexity: 'medium', estimated_cost_tier: 'cheap' };
    case 'blueprint_execute':
    case 'mission_pipeline':
      return { route: 'lumin_chair_mission', complexity: 'high', estimated_cost_tier: 'medium' };
    default:
      return { route: 'lumin_chair_execute', complexity: 'high', estimated_cost_tier: 'medium' };
  }
}

function spawnExecuteMission(missionId) {
  const child = spawn(process.execPath, [EXECUTE_MISSION, missionId], {
    cwd: REPO_ROOT,
    env: process.env,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  return { spawned: true, pid: child.pid, mission_id: missionId };
}

function chairEnvelope(channel, body) {
  return {
    interface: 'Lumin',
    lumin_chair: true,
    lumin: true,
    direct_connection: body.direct_connection !== false,
    chair_channel: channel,
    point_b_dna_version: POINT_B_DNA_VERSION,
    system_purpose: 'point_a_to_point_b',
    model_routing: modelRoutingForChannel(channel),
    ...body,
  };
}

function finalizeTruth(truth, channel) {
  const locked = enforceTruthLockdown(truth, channel);
  const technical = locked.human_summary_technical || locked.human_summary || '';
  const withChannel = { ...locked, chair_channel: channel };
  const humanSummary = wrapChairHumanSummary(withChannel, technical);
  const final = enforceTruthLockdown({
    ...withChannel,
    action: locked.action || channel,
    human_summary_technical: technical,
    human_summary: humanSummary,
    founder_card_applied: true,
  }, channel);
  if (humanSummary) {
    final.human_summary = humanSummary;
  }
  return final;
}

function chairWorkExecutorResponse(ctx, result) {
  const truth = finalizeTruth({
    ok: result.ok !== false,
    pass_fail: result.pass_fail || (result.ok ? 'PASS' : 'FAIL'),
    command_truth: result.command_truth || (result.ok ? 'COMMAND_RAN' : 'NO_COMMAND_RAN'),
    action: result.action_type || 'work_execute',
    action_type: result.action_type,
    work_receipt: result.receipt || null,
    work_package: result.package || null,
    intent_compiler: result.intent_compiler || null,
    human_summary_technical: result.human_summary || result.error || 'Work executed.',
    direct_connection: true,
    conversational_mode: ctx.conversationalMode,
  }, 'work_execute');
  return {
    statusCode: 200,
    body: chairEnvelope('work_execute', {
      ...truth,
      intake_normalized: ctx.intakeNormalized,
      source_mode: ctx.sourceMode,
      auth_mode: ctx.auth_mode,
      user_role: ctx.user_role,
      conversational_mode: ctx.conversationalMode,
      direct_connection: true,
    }),
  };
}

function systemActionChairResponse(ctx, result) {
  const truth = finalizeTruth({
    ok: result.ok === true,
    pass_fail: result.ok === true ? 'PASS' : 'FAIL',
    command_truth: result.command_truth || (result.executed ? 'COMMAND_RAN' : 'NO_COMMAND_RAN'),
    action: result.action_type || 'system_action',
    human_summary_technical: result.human_summary,
    shell_action: result.shell_action || null,
    execution_receipt: result.receipt || null,
    done_synopsis: result.done_synopsis || result.human_summary,
    first_blocker: result.error || null,
  }, 'system_action');
  return {
    statusCode: 200,
    body: chairEnvelope('system_action', {
      ...truth,
      intake_normalized: ctx.intakeNormalized,
      source_mode: ctx.sourceMode,
      auth_mode: ctx.auth_mode,
      user_role: ctx.user_role,
    }),
  };
}

export async function runLuminChairTurn(ctx, deps) {
  const {
    cleanedInput,
    normalizedText,
    missionId,
    force,
    stage,
    inferredDisplayScope,
    displayScope,
    sourceMode,
    dictateThenSend,
    conversationalMode,
    intakeNormalized,
    inboxGate,
    auth_mode,
    user_role,
    confirmIntent,
    shouldDisplayOnly,
    explicitExecute,
    useTerminalForBuild,
    explicitAction = 'auto',
    conversationHistory = [],
    uiContext = null,
    userHandle = null,
    alphaProbe = false,
  } = ctx;

  let mergedHistory = conversationHistory;
  if (!alphaProbe && deps.luminPersist && ctx.userId) {
    const serverHist = await loadFounderThreadHistory(deps.luminPersist, ctx.userId, { limit: 24 });
    mergedHistory = mergeConversationHistory(serverHist, conversationHistory, { max: 24 });
  }

  const doPrefix = stripChairDoPrefix(cleanedInput);
  const actionSource = ctx.originalText || cleanedInput;
  let effectiveInput = bindContinuationUtterance(doPrefix.text || cleanedInput, mergedHistory);
  let forceExecute = doPrefix.forcedExecute || confirmIntent || isFounderFrustrationContinuation(cleanedInput);
  const uiBehavior = isFounderUiBehaviorChangeRequest(effectiveInput);
  if (uiBehavior && !doPrefix.forcedExecute) {
    effectiveInput = `do: ${effectiveInput}\ntarget_file: ${uiBehavior.target_file}`;
    forceExecute = true;
  } else if (isCssOnlyUiFeedback(effectiveInput) && !doPrefix.forcedExecute) {
    const cssTarget = resolveFounderBuildTarget(effectiveInput)
      || (uiContext?.surface === 'lifeos-app' ? 'public/overlay/lifeos-app.html' : 'public/overlay/lifeos-dashboard.html');
    effectiveInput = `do: ${effectiveInput}\ntarget_file: ${cssTarget}`;
    forceExecute = true;
  } else if (!doPrefix.forcedExecute && isBuildRequest(effectiveInput) && hasProductBuildContext(effectiveInput)) {
    const inferred = inferTargetFileFromFounderFeedback(effectiveInput);
    if (inferred?.target_file && ['high', 'medium'].includes(inferred.confidence)) {
      effectiveInput = `do: ${effectiveInput}\ntarget_file: ${inferred.target_file}`;
      forceExecute = true;
    }
  }
  const likelyBuild = isBuildRequest(effectiveInput)
    || isRepairContinuationIntent(effectiveInput)
    || hasHighConfidenceBuildTarget(effectiveInput);

  const skipIntentGate = force || forceExecute;
  const displayOnlyTurn = shouldDisplayOnly || explicitAction === 'display';

  if (!displayOnlyTurn && conversationalMode) {
    const cssTurn = isCssOnlyUiFeedback(cleanedInput) || isCssOnlyUiFeedback(doPrefix.text || cleanedInput);
    if (!cssTurn) {
      const compiled = await compileFounderIntent({
        utterance: effectiveInput,
        conversationHistory: mergedHistory,
        uiContext,
        callAI: deps.callCouncilMember,
      });
      if (compiled?.execute_now && compiled.intent === 'work') {
        const workResult = await executeFounderWorkIntent(compiled, {
          pool: deps.pool,
          userId: ctx.userId,
          userHandle: userHandle || ctx.userHandle || 'adam',
          tenantId: ctx.tenantId || 'default',
          callCouncilMember: deps.callCouncilMember,
          founderRole: user_role,
          utterance: effectiveInput,
        });
        if (workResult) {
          return chairWorkExecutorResponse(
            { intakeNormalized, sourceMode, auth_mode, user_role, conversationalMode },
            workResult,
          );
        }
      }
    }
  }
  if (!skipIntentGate && likelyBuild && !displayOnlyTurn) {
    const wisdom = assessFounderUtteranceWisdom(effectiveInput, { confirmIntent: forceExecute });
    if (wisdom.needs_clarification) {
      return chairWisdomClarifyResponse(
        { intakeNormalized, sourceMode, auth_mode, user_role },
        wisdom,
      );
    }
  }

  let systemAction = { matched: false };
  if (!displayOnlyTurn) {
    systemAction = await tryLuminChairSystemAction(actionSource, {
      pool: deps.pool,
      logger: deps.logger || console,
      operatorKey: deps.operatorKey,
      founderBuildBaseUrl: deps.founderBuildBaseUrl,
      userId: ctx.userId,
    });
    if (systemAction.matched) {
      return systemActionChairResponse(
        { intakeNormalized, sourceMode, auth_mode, user_role },
        systemAction,
      );
    }
  }

  if (
    isFounderRepairOrderIntent(effectiveInput)
    && !forceExecute
    && !extractTargetFileFromInstruction(effectiveInput)
    && !resolveFounderBuildTarget(effectiveInput)
  ) {
    return chairRepairOrderAckResponse({
      intakeNormalized,
      sourceMode,
      auth_mode,
      user_role,
      conversationalMode,
    });
  }

  const pointBTarget = loadPointBTarget();
  const contextOpts = {
    shouldDisplayOnly,
    explicitExecute: explicitExecute || forceExecute,
    useTerminalForBuild,
    explicitAction: forceExecute && isBuildRequest(effectiveInput) ? 'build' : explicitAction,
    confirmIntent: forceExecute,
    forceExecute,
  };

  if (!skipIntentGate && likelyBuild && requiresPreExecuteClarify(effectiveInput, contextOpts)) {
    let expandedTask = effectiveInput;
    if (isBuildRequest(effectiveInput) || isRepairContinuationIntent(effectiveInput)) {
      expandedTask = await deps.resolveBuildTaskForFounder(ctx.req, effectiveInput);
    }
    const understanding = assessChairIntentUnderstanding(effectiveInput, {
      expandedTask,
      pointBTarget,
      includeBuild: isBuildRequest(effectiveInput) || isFounderShipOrUsabilityIntent(effectiveInput),
      includeGovernance: isGovernanceOrSsotIntent(effectiveInput),
      includeMissionPipeline: isMissionPipelineIntent(effectiveInput),
    });
    const fpV2 = await enforceFounderPacketV2Unified({
      cleanedInput: effectiveInput,
      pool: deps.pool,
      callAI: deps.callCouncilMember,
      pointBTarget,
      confirmIntent: false,
      channel: null,
    });
    if (!understanding.intent_understood || !fpV2.execute_cleared) {
      const summary = formatChairIntentClarifySummary(understanding, fpV2.chair?.strategic_brief);
      return chairIntentClarifyResponse(
        { intakeNormalized, sourceMode, auth_mode, user_role },
        { ...understanding, strategic_brief: fpV2.chair?.strategic_brief },
        summary,
        fpV2,
      );
    }
  }

  const chairContext = coerceDisplayMisrouteToChair(
    effectiveInput,
    resolveChairContext(effectiveInput, contextOpts),
    { explicitAction, shouldDisplayOnly },
  );
  const channel = chairContext.channel;

  let fpV2Enforcement = null;
  const executeChannels = ['build_async', 'build_terminal', 'blueprint_execute', 'execute'];
  const counselChannels = new Set(['display', 'lumin', 'counsel', 'life_admin', 'chair']);
  if (!shouldDisplayOnly && !counselChannels.has(channel)) {
    const understandingForChannel = assessChairIntentUnderstanding(effectiveInput, {
      expandedTask: effectiveInput,
      pointBTarget,
      includeBuild: isBuildRequest(effectiveInput),
      includeGovernance: isGovernanceOrSsotIntent(effectiveInput),
      includeMissionPipeline: isMissionPipelineIntent(effectiveInput),
    });
    fpV2Enforcement = await enforceFounderPacketV2Unified({
      cleanedInput: effectiveInput,
      understanding: understandingForChannel,
      missionId: missionId || pointBTarget?.mission_id || pointBTarget?.target?.mission_id || null,
      pool: deps.pool,
      callAI: deps.callCouncilMember,
      pointBTarget,
      confirmIntent: skipIntentGate,
      channel,
    });
    const executeChannels = ['build_async', 'build_terminal', 'blueprint_execute', 'execute'];
    if (executeChannels.includes(channel) && !fpV2Enforcement.execute_cleared) {
      return chairFpV2BlockResponse(
        { intakeNormalized, sourceMode, auth_mode, user_role },
        fpV2Enforcement,
        channel,
      );
    }
  }

  switch (channel) {
    case 'display': {
      const displayBundle = await deps.buildDisplayBundle({
        scope: displayScope || inferredDisplayScope,
        missionId,
      });
      const displayResult = {
        pass_fail: 'NO_COMMAND_RAN',
        first_blocker: null,
        human_summary: `Rendered ${displayBundle.scope} display from live system data.`,
        display: displayBundle,
      };
      const truth = finalizeTruth({
        ok: true,
        action: 'display',
        command_truth: 'NO_COMMAND_RAN',
        pass_fail: 'NO_COMMAND_RAN',
        human_summary_technical: displayResult.human_summary,
        display: displayBundle,
      }, channel);
      return { statusCode: 200, body: chairEnvelope(channel, truth) };
    }

    case 'mission_pipeline': {
      const pipelineMission = missionId || extractMissionIdFromText(cleanedInput);
      if (!pipelineMission) {
        const truth = finalizeTruth({
          ok: false,
          pass_fail: 'FAIL',
          command_truth: 'NO_COMMAND_RAN',
          first_blocker: 'Mission id required for pipeline',
          action: 'mission_pipeline',
        }, channel);
        return { statusCode: 200, body: chairEnvelope(channel, truth) };
      }
      const bpbGate = await deps.runBpbIntakeGateForMission(pipelineMission, { skip_if_missing: true });
      if (bpbGate && !bpbGate.ok && bpbGate.status !== 'SKIP') {
        const truth = finalizeTruth({
          ok: false,
          pass_fail: 'FAIL',
          command_truth: 'NO_COMMAND_RAN',
          first_blocker: bpbGate.violations?.[0] || 'BPB intake gate failed',
          action: 'mission_pipeline',
          bpb_intake_gate: bpbGate,
          human_summary_technical: deps.formatExecutionTruthReply({
            ok: false,
            pass_fail: 'FAIL',
            action: 'mission_pipeline',
            bpb_gate: bpbGate,
          }),
        }, channel);
        return { statusCode: 200, body: chairEnvelope(channel, truth) };
      }
      const pipelineResult = await runFoundationPipelineForFounder(pipelineMission, { force: force || true });
      const truth = finalizeTruth({
        ...pipelineResult,
        action: 'mission_pipeline',
        human_summary_technical: deps.formatExecutionTruthReply({ ...pipelineResult, action: 'mission_pipeline' }),
      }, channel);
      return { statusCode: 200, body: chairEnvelope(channel, { ...truth, intake_normalized: intakeNormalized, source_mode: sourceMode, auth_mode, user_role }) };
    }

    case 'blueprint_execute': {
      const target = loadPointBTarget();
      const execMission = missionId || extractMissionIdFromText(cleanedInput) || target?.mission_id;
      if (!execMission) {
        const truth = finalizeTruth({
          ok: false,
          pass_fail: 'FAIL',
          command_truth: 'NO_COMMAND_RAN',
          first_blocker: 'No Point B mission to execute',
          action: 'blueprint_execute',
        }, channel);
        return { statusCode: 200, body: chairEnvelope(channel, truth) };
      }
      const spawnInfo = spawnExecuteMission(execMission);
      const truth = finalizeTruth({
        ok: true,
        pass_fail: 'RUNNING',
        command_truth: 'COMMAND_RAN',
        action: 'blueprint_execute',
        execution_path: 'execute_mission',
        mission_id: execMission,
        command_executed: `node builderos-reboot/scripts/execute-mission.mjs ${execMission}`,
        done_synopsis: `Running blueprint for ${execMission}.`,
        done_bullets: [`Spawned execute-mission (pid ${spawnInfo.pid})`],
        next_synopsis: 'Poll receipts or say "status" for progress.',
        next_why: 'Blueprint steps run through factory execute + SENTRY.',
        human_summary_technical: `COMMAND_RAN: execute-mission ${execMission} (async).`,
      }, channel);
      return { statusCode: 202, body: chairEnvelope(channel, truth) };
    }

    case 'build_terminal': {
      const result = await deps.runTerminalBridgeIntake({
        text: normalizedText || cleanedInput,
        textFile: ctx.textFile,
        stage,
        missionId,
        force,
      });
      const wrapped = deps.wrapBridgeResultAsTruth(result, cleanedInput);
      const truth = finalizeTruth({
        ...result,
        ...wrapped,
        action: 'execute',
        execution_path: 'terminal_bridge',
        human_summary_technical: deps.formatExecutionTruthReply({ ...wrapped, action: 'execute' }),
        inbox_item_id: inboxGate?.inbox_item_id || null,
        classification: inboxGate?.classification || null,
      }, channel);
      return { statusCode: 200, body: chairEnvelope(channel, { ...truth, intake_normalized: intakeNormalized }) };
    }

    case 'build_async': {
      const operatorKey = deps.operatorKey;
      if (!operatorKey) {
        const missing = deps.enforceExecutionTruth({
          ok: false,
          committed: false,
          failure_code: 'BUILDER_KEY_MISSING',
          first_blocker: 'Build request requires operator command key — cannot dispatch to builder.',
          execution_path: 'builder_task_execute',
        }, { action: 'build', task: cleanedInput });
        const truth = finalizeTruth({
          ...missing,
          action: 'build',
          human_summary_technical: deps.formatExecutionTruthReply({ ...missing, action: 'build' }),
        }, channel);
        return { statusCode: 503, body: chairEnvelope(channel, truth) };
      }
      const buildTask = await deps.resolveBuildTaskForFounder(ctx.req, effectiveInput);
      if (ctx.useAsync) {
        const jobId = deps.startFounderBuildJob({
          task: buildTask,
          commandKey: operatorKey,
          baseUrl: deps.founderBuildBaseUrl,
          buildFailureReceipt: deps.buildBuildFailureReceipt,
          enforceExecutionTruth: deps.enforceExecutionTruth,
          repoRoot: deps.repoRoot,
          userId: ctx.userId,
          callCouncilMember: deps.callCouncilMember,
          pool: deps.pool,
          confirmIntent: ctx.confirmIntent || forceExecute,
        });
        const truth = finalizeTruth({
          ok: true,
          async: true,
          job_id: jobId,
          poll_url: `/api/v1/lifeos/builderos/command-control/founder-interface/build-job/${jobId}`,
          pass_fail: 'RUNNING',
          command_truth: 'BUILD_ATTEMPTED',
          action: 'build',
          done_synopsis: 'Build job started.',
          done_bullets: [`Job ${jobId.slice(0, 8)}… — poll until PASS or FAIL`],
          human_summary_technical: `Build running asynchronously — job ${jobId}`,
          inbox_item_id: inboxGate?.inbox_item_id || null,
          classification: inboxGate?.classification || null,
        }, channel);
        return { statusCode: 202, body: chairEnvelope(channel, { ...truth, build_task_resolved: buildTask !== effectiveInput }) };
      }
      const builderResult = await deps.routeToBuilder(buildTask, operatorKey);
      const truth = finalizeTruth({
        ...deps.founderBuildResponsePayload(builderResult),
        action: 'build',
        human_summary_technical: deps.formatExecutionTruthReply(builderResult),
        inbox_item_id: inboxGate?.inbox_item_id || null,
        classification: inboxGate?.classification || null,
      }, channel);
      return { statusCode: 200, body: chairEnvelope(channel, { ...truth, build_task_resolved: buildTask !== effectiveInput }) };
    }

    case 'execute': {
      const result = await deps.runTerminalBridgeIntake({
        text: normalizedText || cleanedInput,
        textFile: ctx.textFile,
        stage,
        missionId,
        force,
      });
      const wrapped = deps.wrapBridgeResultAsTruth(result, cleanedInput);
      const truth = finalizeTruth({
        ...result,
        ...wrapped,
        action: 'execute',
        human_summary_technical: deps.formatExecutionTruthReply({ ...wrapped, action: 'execute' }),
      }, channel);
      return { statusCode: 200, body: chairEnvelope(channel, {
        ...truth,
        source_mode: sourceMode,
        dictate_then_send: dictateThenSend,
        conversational_mode: conversationalMode,
        auth_mode,
        user_role,
        intake_normalized: intakeNormalized,
      }) };
    }

    case 'point_b': {
      const pbResult = await handlePointBFounderMessage(cleanedInput, {
        autoRun: true,
        callAI: deps.callCouncilMember,
      });
      const strategicBrief = fpV2Enforcement?.chair?.strategic_brief
        || await gatherStrategicBriefForChair({
          cleanedInput,
          pool: deps.pool,
          callAI: deps.callCouncilMember,
          pointBTarget,
        }).catch(() => null);
      const strategicSection = formatStrategicBriefSection(strategicBrief);
      const technical = deps.formatExecutionTruthReply({ ...pbResult, action: 'point_b' });
      const truth = finalizeTruth({
        ...pbResult,
        action: 'point_b',
        human_summary_technical: strategicSection ? `${technical}${strategicSection}` : technical,
        done_synopsis: pbResult.human_summary?.split('\n')[0] || pbResult.human_summary,
        next_synopsis: pbResult.point_b?.next_action ? `Next gate: ${pbResult.point_b.next_action}` : undefined,
        next_why: pbResult.point_b?.blocker || undefined,
        point_b: pbResult.point_b,
        strategic_brief: strategicBrief,
        fp_v2_enforcement: fpV2Enforcement,
      }, channel);
      return {
        statusCode: pbResult.run?.async ? 202 : 200,
        body: chairEnvelope(channel, { ...truth, intake_normalized: intakeNormalized, source_mode: sourceMode, auth_mode, user_role }),
      };
    }

    case 'counsel':
    case 'life_admin':
    case 'lumin':
    case 'chair': {
      if (isFounderRepairOrderIntent(effectiveInput) && !forceExecute) {
        return chairRepairOrderAckResponse({
          intakeNormalized,
          sourceMode,
          auth_mode,
          user_role,
          conversationalMode,
        });
      }
      const memoryContext = deps.loadChairMemoryContext
        ? await deps.loadChairMemoryContext().catch(() => null)
        : null;
      const listeningOnboarding = sourceMode === 'listening_setup' && deps.pool
        ? await buildListeningOnboardingContext(deps.pool, ctx.userId).catch(() => null)
        : null;
      const strategicBrief = shouldAttachStrategicBrief(effectiveInput, chairContext)
        && sourceMode !== 'listening_setup'
        ? await gatherStrategicBriefForChair({
          cleanedInput: effectiveInput,
          pool: deps.pool,
          callAI: deps.callCouncilMember,
          pointBTarget,
        }).catch(() => null)
        : null;
      const chairResult = await runChairNativeTurn(effectiveInput, {
        callAI: deps.callCouncilMember,
        translatePersonality: deps.translateChairPersonality || translateChairPersonality,
        sanitizeConversationReply: deps.sanitizeConversationReply,
        memoryContext,
        pool: deps.pool,
        userId: ctx.userId,
        userHandle: ctx.userHandle || null,
        strategicBrief,
        listeningOnboarding,
      }, {
        ...chairContext,
        domain: sourceMode === 'listening_setup' ? 'listening_onboarding' : chairContext.domain,
        user_handle: ctx.userHandle || userHandle || chairContext.user_handle || null,
        conversation_history: mergedHistory,
      });
      const truth = finalizeTruth({
        ...chairResult,
        chair_context: chairContext,
        conversational_mode: conversationalMode,
        direct_connection: true,
        fp_v2_enforcement: null,
      }, 'chair');
      return {
        statusCode: 200,
        body: chairEnvelope('chair', {
          ...truth,
          conversational_mode: conversationalMode,
          direct_connection: true,
          intake_normalized: intakeNormalized,
          source_mode: sourceMode,
          auth_mode,
          user_role,
          chair_native_facts: chairResult.chair_native_facts || null,
        }),
      };
    }

    default: {
      if (!['development', 'system'].includes(stage)) {
        const truth = finalizeTruth({
          ok: false,
          pass_fail: 'FAIL',
          command_truth: 'NO_COMMAND_RAN',
          first_blocker: 'stage must be development or system',
          action: 'execute',
        }, 'terminal_default');
        return { statusCode: 400, body: chairEnvelope('terminal_default', truth) };
      }
      const result = await deps.runTerminalBridgeIntake({
        text: normalizedText,
        textFile: ctx.textFile,
        stage,
        missionId,
        force,
      });
      const wrapped = deps.wrapBridgeResultAsTruth(result, cleanedInput);
      const truth = finalizeTruth({
        ...result,
        ...wrapped,
        action: 'execute',
        human_summary_technical: deps.formatExecutionTruthReply({ ...wrapped, action: 'execute' }),
      }, channel);
      return { statusCode: 200, body: chairEnvelope('terminal_default', {
        ...truth,
        source_mode: sourceMode,
        auth_mode,
        user_role,
        intake_normalized: intakeNormalized,
      }) };
    }
  }
}
