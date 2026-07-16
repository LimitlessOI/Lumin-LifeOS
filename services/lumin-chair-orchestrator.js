/**
 * SYNOPSIS: Lumin Chair — single front door for founder messages (orchestrates all channels).
 * WIRED: founder-interface/message via lifeos-builderos-command-control-routes.js
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isMissionPipelineIntent,
  extractMissionIdFromText,
  runFoundationPipelineForFounder,
  extractIntakeSessionId,
  isIntakeBlueprintIntent,
  extractIntakeProductName,
  SOCIALMEDIAOS_INTAKE_SESSION,
} from './lifeos-mission-pipeline-executor.js';
import { executeIntakeBlueprint } from './intake-blueprint-executor.js';
import { isRepairContinuationIntent, extractTargetFileFromInstruction, resolveFounderBuildTarget, isCssOnlyUiFeedback, inferTargetFileFromFounderFeedback } from './builder-instruction-target.js';
import { isVisualUiPatchRequest } from './founder-visual-ui-patch.js';
import { isSmokeCanaryMjsCommentPatch } from './founder-overlay-surgical-patch.js';
import { handlePointBFounderMessage } from './point-b-navigator.js';
import { buildListeningOnboardingContext } from './lifeos-listening-profile.js';
import { loadPointBTarget } from './point-b-target-lite.js';
import { wrapChairHumanSummary } from './founder-communication-format.js';
import { enforceChairTruthExit } from './chair-truth-gate.js';
import { enforceDirectConnectionTruth } from './chair-direct-connection-truth.js';
import { enforceTruthLockdown } from './truth-lockdown.js';
import { formatExecutionTruthReply } from './lifeos-execution-truth.js';
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
  isBuildStatusQuestion,
  isCounselPresenceIntent,
  isExplicitExecuteCommand,
  isPureCounselQuestion,
  isFounderRepairOrderIntent,
  isFounderUiBehaviorChangeRequest,
  stripChairDoPrefix,
} from './chair-intent-signals.js';
import { tryLuminChairSystemAction } from './lumin-chair-system-actions.js';
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
import { runChairDirectAgent } from './chair-direct-agent.js';

export {
  isBlueprintExecuteIntent,
  isBuildRequest,
  isBuildStatusQuestion,
  isCounselPresenceIntent,
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
      // Founder/human chat is not a cheap ops lane — SO-003 + ship quality.
      return { route: 'lumin_chair_native', complexity: 'medium', estimated_cost_tier: 'medium' };
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

function chairDirectAgentResponse(ctx, agentRes) {
  const committed = agentRes.command_ran === true;
  const build = agentRes.build || null;
  const lane = agentRes.lane || 'chair';
  const isBuild = committed && lane === 'direct_build';
  let summary = agentRes.reply;
  if (isBuild && build) {
    const structured = formatExecutionTruthReply({
      ...build,
      action: 'build',
      pass_fail: build.pass_fail || 'PASS',
      command_truth: build.command_truth || 'COMMITTED',
      sha: build.sha || build.commit_sha,
      first_blocker: null,
      human_summary: agentRes.reply,
    });
    if (/\bPASS\b/.test(structured)) summary = structured;
  }
  const channel = isBuild ? 'build_async' : 'chair';
  const action = isBuild ? 'build' : (committed ? (lane === 'chair' ? 'chair' : lane) : 'chair');
  const commandTruth = committed ? (isBuild ? (build?.command_truth || 'COMMITTED') : 'COMMAND_RAN') : 'NO_COMMAND_RAN';
  const truth = finalizeTruth({
    ok: agentRes.ok !== false,
    pass_fail: committed ? 'PASS' : 'NO_COMMAND_RAN',
    command_truth: commandTruth,
    action,
    chair_direct_agent: true,
    direct_connection: true,
    build_receipt: build,
    target_file: build?.target_file || null,
    sha: build?.sha || build?.commit_sha || null,
    transport_status: build?.transport_status || null,
    human_summary_technical: summary,
    conversational_mode: ctx.conversationalMode,
    communication_law: agentRes.communication_law || null,
  }, channel);
  return {
    statusCode: 200,
    body: chairEnvelope(channel, {
      ...truth,
      chair_direct_agent: true,
      direct_connection: true,
      conversational_mode: ctx.conversationalMode,
      intake_normalized: ctx.intakeNormalized,
      source_mode: ctx.sourceMode,
      auth_mode: ctx.auth_mode,
      user_role: ctx.user_role,
      communication_law: agentRes.communication_law || null,
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
  const _ct0 = Date.now();
  const _clog = (label) => console.log(`[CHAIR-TURN] ${label} +${Date.now() - _ct0}ms`);
  _clog('start');
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

  const rawUserId = ctx.userId;
  let resolvedUserId = (
    Number.isInteger(rawUserId)
      ? rawUserId
      : (/^\d+$/.test(String(rawUserId || '').trim()) ? parseInt(String(rawUserId).trim(), 10) : null)
  );
  if (!alphaProbe && !resolvedUserId && deps.resolveUserId && (ctx.userHandle || userHandle)) {
    resolvedUserId = await deps.resolveUserId(ctx.userHandle || userHandle).catch(() => null);
  }
  _clog('resolvedUserId');

  let mergedHistory = conversationHistory;
  if (!alphaProbe && deps.luminPersist && resolvedUserId) {
    const serverHist = await loadFounderThreadHistory(deps.luminPersist, resolvedUserId, { limit: 24 });
    mergedHistory = mergeConversationHistory(serverHist, conversationHistory, { max: 24 });
  }
  _clog('loadHistory');

  const doPrefix = stripChairDoPrefix(cleanedInput);
  // Build/execute orders must use build_async (202 + job poll). The direct agent
  // runs a sync builder inside the HTTP turn and hits Railway/proxy 502 + the
  // 92s handler deadline — which is exactly how drawer_direct_build got
  // "No response from system." Skip the front-door agent for those turns.
  const isFastSurgicalPatch = isSmokeCanaryMjsCommentPatch(doPrefix.text || cleanedInput);
  const skipDirectAgentForBuild = (!isFastSurgicalPatch && doPrefix.forcedExecute)
    || (
      isBuildRequest(doPrefix.text || cleanedInput)
      && !isBuildStatusQuestion(doPrefix.text || cleanedInput)
      && !isCounselPresenceIntent(doPrefix.text || cleanedInput)
      && !isFastSurgicalPatch
    )
    || (isExplicitExecuteCommand(cleanedInput) && !isFastSurgicalPatch)
    || (/^\s*(do|execute|run)\s*:/i.test(ctx.originalText || cleanedInput) && !isFastSurgicalPatch);

  // ── DIRECT CHAIR AGENT (front door) ──
  // Adam talks straight to the Chair (the AI): it answers AND acts (real build tool), no keyword-router middle layer.
  const directAgentOn = process.env.CHAIR_DIRECT_AGENT !== '0';
  if (
    directAgentOn
    && conversationalMode
    && !shouldDisplayOnly
    && !ctx.alphaProbe
    && explicitAction !== 'display'
    && !skipDirectAgentForBuild
  ) {
    try {
      _clog('direct_agent_start');
      // T05: direct-agent front door must inject FOUNDER MEMORY into SYSTEM_FACTS.
      // Legacy counsel path already called loadChairMemoryContext; this path skipped it,
      // so memory_context stayed null even when /api/v1/founder-memory had entries.
      let directMemoryContext = null;
      if (typeof deps.loadChairMemoryContext === 'function') {
        directMemoryContext = await deps.loadChairMemoryContext({
          userId: resolvedUserId,
          userHandle: ctx.userHandle || userHandle || null,
          messageText: ctx.originalText || cleanedInput,
          productId: ctx.productId || null,
        }).catch(() => null);
      }
      const agentRes = await runChairDirectAgent({
        message: ctx.originalText || cleanedInput,
        history: mergedHistory,
        deps: {
          callAI: deps.callCouncilMember,
          routeToBuilder: deps.routeToBuilder,
          operatorKey: deps.operatorKey,
          pool: deps.pool,
          memoryContext: directMemoryContext,
        },
        ctx: {
          userId: resolvedUserId,
          userHandle: ctx.userHandle || userHandle || null,
          user_role,
        },
      });
      _clog(`direct_agent_done ok=${agentRes?.ok} cmd=${agentRes?.command_ran}`);
      if (agentRes && agentRes.reply) {
        return chairDirectAgentResponse(
          { intakeNormalized, sourceMode, auth_mode, user_role, conversationalMode },
          agentRes,
        );
      }
    } catch (agentErr) {
      _clog(`direct_agent_error: ${agentErr.message} — falling back to legacy routing`);
    }
  }
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
  } else if (isVisualUiPatchRequest(effectiveInput) && !doPrefix.forcedExecute) {
    effectiveInput = `do: ${effectiveInput}\ntarget_file: public/overlay/lifeos-theme-overrides.css`;
    forceExecute = true;
  } else if (!doPrefix.forcedExecute && isBuildRequest(effectiveInput) && hasProductBuildContext(effectiveInput)) {
    const inferred = inferTargetFileFromFounderFeedback(effectiveInput);
    if (inferred?.target_file && ['high', 'medium'].includes(inferred.confidence)) {
      effectiveInput = `do: ${effectiveInput}\ntarget_file: ${inferred.target_file}`;
      forceExecute = true;
    }
  }
  const likelyBuild = (isBuildRequest(effectiveInput)
    || isRepairContinuationIntent(effectiveInput)
    || hasHighConfidenceBuildTarget(effectiveInput))
    && !isIntakeBlueprintIntent(effectiveInput);

  const skipIntentGate = force || forceExecute;
  const displayOnlyTurn = shouldDisplayOnly || explicitAction === 'display';
  const isIntake = isIntakeBlueprintIntent(effectiveInput) || isIntakeBlueprintIntent(cleanedInput);
  _clog(`isIntake=${isIntake}`);

  if (!displayOnlyTurn && conversationalMode && !isIntake) {
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
    explicitAction: forceExecute && isBuildRequest(effectiveInput) && !isIntakeBlueprintIntent(effectiveInput)
      ? 'build'
      : explicitAction,
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
  let channel = chairContext.channel;

  // Founder Alpha Chat v2: short-circuit the life_admin channel through the
  // deterministic chat intent executor before falling back to counsel.
  if (channel === 'life_admin' && deps.pool && resolvedUserId) {
    try {
      const { classifyIntent: classifyChatIntent, executeIntent: executeChatIntent, formatReply } = await import('./lifeos-chat-intent-executor.js');
      const chatIntent = classifyChatIntent(ctx.originalText || cleanedInput);
      if (chatIntent !== 'unknown') {
        const chatResult = await executeChatIntent({
          db: deps.pool,
          userId: resolvedUserId,
          timezone: 'America/New_York',
          intent: chatIntent,
          text: ctx.originalText || cleanedInput,
        });
        if (chatResult?.message && chatResult?.execution_kind === 'command') {
          const truth = finalizeTruth({
            ok: true,
            command_truth: 'COMMAND_RAN',
            pass_fail: 'PASS',
            human_summary: formatReply(chatResult),
            action: chatIntent,
            chair_channel: 'life_admin',
          }, 'life_admin');
          return {
            statusCode: 200,
            body: chairEnvelope('life_admin', {
              ...truth,
              intake_normalized: intakeNormalized,
              source_mode: sourceMode,
              auth_mode,
              user_role,
              direct_connection: true,
            }),
          };
        }
      }
    } catch (intentErr) {
      // fall through to counsel so a chat-intent bug never kills the chair
    }
  }

  let fpV2Enforcement = null;
  const executeChannels = ['build_async', 'build_terminal', 'blueprint_execute', 'execute'];
  const counselChannels = new Set(['display', 'lumin', 'counsel', 'life_admin', 'chair', 'intake_blueprint']);
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
    const executeGateChannels = ['build_async', 'build_terminal', 'blueprint_execute', 'execute'];
    if (executeGateChannels.includes(channel) && !fpV2Enforcement.execute_cleared) {
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

    case 'intake_blueprint': {
      _clog('intake_blueprint_case');
      const detectedProductId = extractIntakeProductName(cleanedInput);
      const sessionId = extractIntakeSessionId(cleanedInput) || SOCIALMEDIAOS_INTAKE_SESSION;
      const operatorKey = deps.operatorKey || process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || '';
      const baseUrl = deps.founderBuildBaseUrl || process.env.PUBLIC_BASE_URL || '';
      const started = Date.now();

      if (detectedProductId) {
        const isArcOrExecuteRequest = /\b(run|execute|review|check|arc|sentry|status|validate)\b/i.test(cleanedInput)
          && !/\b(create|generate|make|produce|write|draft|start|kick.?off)\b/i.test(cleanedInput);

        _clog(`isArcOrExecuteRequest=${isArcOrExecuteRequest} detectedProductId=${detectedProductId} cleanedInput=${cleanedInput.slice(0,60)}`);
        if (isArcOrExecuteRequest) {
          try {
            const { rows: existingRows } = await deps.pool.query(
              `SELECT id, status, error_message, blueprint_json IS NOT NULL AS has_bp FROM blueprint_intake_sessions
               WHERE product_name = $1 AND status IN ('arc_review','generating','extracting','ready','gap_collection','failed')
               ORDER BY created_at DESC LIMIT 1`,
              [detectedProductId]
            );
            _clog(`existingRows=${existingRows.length} first_status=${existingRows[0]?.status}`);
            if (existingRows.length) {
              const existSession = existingRows[0];

              if (existSession.status === 'failed') {
                const errMsg = existSession.error_message || 'unknown error';
                const truth = finalizeTruth({
                  ok: false, pass_fail: 'FAIL', command_truth: 'NO_COMMAND_RAN',
                  action: 'intake_blueprint', execution_path: 'intake_status_check',
                  session_id: existSession.id, product: detectedProductId,
                  first_blocker: errMsg, duration_ms: Date.now() - started,
                  done_synopsis: `${detectedProductId} blueprint generation failed.`,
                  done_bullets: [`Product: ${detectedProductId}`, `Error: ${errMsg.slice(0, 80)}`],
                  next_synopsis: `Say "Create a blueprint for ${detectedProductId}" to retry.`,
                  human_summary: `${detectedProductId} blueprint FAILED: ${errMsg}. Say "Create a blueprint for ${detectedProductId}" to retry.`,
                }, channel);
                return { statusCode: 200, body: chairEnvelope(channel, { ...truth, intake_normalized: intakeNormalized, source_mode: sourceMode, auth_mode, user_role }) };
              }

              if (existSession.status === 'arc_review' || existSession.status === 'gap_collection') {
                const stageLabel = existSession.status === 'arc_review' ? 'ARC reviewing blueprint' : 'Collecting founder input on gaps';
                const truth = finalizeTruth({
                  ok: true, pass_fail: 'RUNNING', command_truth: 'COMMAND_RAN',
                  action: 'intake_blueprint', execution_path: 'intake_status_check',
                  session_id: existSession.id, product: detectedProductId,
                  first_blocker: null, duration_ms: Date.now() - started,
                  done_synopsis: `${detectedProductId} blueprint in progress.`,
                  done_bullets: [`Product: ${detectedProductId}`, `Stage: ${stageLabel}`, `Session: ${existSession.id.slice(0, 8)}`],
                  human_summary: `${detectedProductId} blueprint is in ${existSession.status}. ${stageLabel}.`,
                  human_summary_technical: `Session ${existSession.id} status: ${existSession.status}.`,
                }, channel);
                return { statusCode: 200, body: chairEnvelope(channel, { ...truth, intake_normalized: intakeNormalized, source_mode: sourceMode, auth_mode, user_role }) };
              }

              if (existSession.status === 'ready') {
                const wantsExecute = /\b(execute|build|run|deploy|start)\b/i.test(effectiveInput);
                if (wantsExecute) {
                  const { executeIntakeBlueprint } = await import('../services/intake-blueprint-executor.js');
                  const execPromise = executeIntakeBlueprint({
                    pool: deps.pool, sessionId: existSession.id, baseUrl, commandKey: operatorKey,
                    dryRun: false,
                  });
                  const EXEC_INLINE_TIMEOUT_MS = 60000;
                  const timeoutPromise = new Promise(r => setTimeout(() => r(null), EXEC_INLINE_TIMEOUT_MS));
                  const execResult = await Promise.race([execPromise, timeoutPromise]);
                  if (!execResult) {
                    _clog('execute_inline_timeout — continuing in background');
                    execPromise.then(r => _clog(`execute_bg_done ok=${r?.ok} steps=${r?.steps_run}`)).catch(e => _clog(`execute_bg_err: ${e.message}`));
                    const truth = finalizeTruth({
                      ok: true, pass_fail: 'RUNNING', command_truth: 'COMMAND_RAN',
                      action: 'intake_blueprint', execution_path: 'execute_blueprint_async',
                      session_id: existSession.id, product: detectedProductId,
                      first_blocker: null, duration_ms: Date.now() - started,
                      done_synopsis: `${detectedProductId} blueprint execution started (building code in background).`,
                      done_bullets: [`Product: ${detectedProductId}`, `Session: ${existSession.id.slice(0,8)}`, `Status: building in background`],
                      human_summary: `${detectedProductId} blueprint is being executed in the background — code generation takes time for larger blueprints. Check status with "Check status of the ${detectedProductId} blueprint".`,
                      human_summary_technical: `Execution dispatched async — inline timeout after ${EXEC_INLINE_TIMEOUT_MS}ms. Builder is generating code in background.`,
                    }, channel);
                    return { statusCode: 200, body: chairEnvelope(channel, { ...truth, intake_normalized: intakeNormalized, source_mode: sourceMode, auth_mode, user_role }) };
                  }
                  const truth = finalizeTruth({
                    ok: execResult.ok, pass_fail: execResult.ok ? 'PASS' : 'FAIL', command_truth: 'COMMAND_RAN',
                    action: 'intake_blueprint', execution_path: 'execute_blueprint',
                    session_id: existSession.id, product: detectedProductId,
                    first_blocker: execResult.error || null, duration_ms: Date.now() - started,
                    done_synopsis: execResult.ok
                      ? `${detectedProductId} blueprint executed. ${execResult.already_complete ? 'All targets present — acceptance passed.' : `${execResult.steps_run || 0} steps built.`}`
                      : `${detectedProductId} blueprint execution failed.`,
                    done_bullets: execResult.ok
                      ? [`Product: ${detectedProductId}`, `Steps: ${execResult.steps_run || 0}`, `Acceptance: ${execResult.acceptance?.ok ? 'PASSED' : 'not run'}`]
                      : [`Product: ${detectedProductId}`, `Error: ${execResult.error}`, ...(execResult.failed_step ? [`Failed step: ${execResult.failed_step}`] : []), ...(execResult.target_file ? [`Target: ${execResult.target_file}`] : [])],
                    human_summary: execResult.ok
                      ? `${detectedProductId} blueprint executed successfully. ${execResult.steps_run || 0} steps processed. ${execResult.already_complete ? 'All targets already present — acceptance passed.' : 'Build complete.'}`
                      : `${detectedProductId} blueprint execution failed: ${execResult.error}${execResult.failed_step ? ` (step ${execResult.failed_step}${execResult.target_file ? ` → ${execResult.target_file}` : ''})` : ''}${execResult.builder?.detail ? `. Detail: ${execResult.builder.detail}` : ''}`,
                    human_summary_technical: execResult.ok
                      ? `Execution complete. steps_run=${execResult.steps_run} acceptance=${JSON.stringify(execResult.acceptance?.ok)}`
                      : `Execution failed: ${execResult.error} step=${execResult.failed_step} target=${execResult.target_file} detail=${execResult.builder?.detail || execResult.builder?.error || 'none'}`,
                  }, channel);
                  return { statusCode: 200, body: chairEnvelope(channel, { ...truth, intake_normalized: intakeNormalized, source_mode: sourceMode, auth_mode, user_role }) };
                }
                const truth = finalizeTruth({
                  ok: true, pass_fail: 'PASS', command_truth: 'COMMAND_RAN',
                  action: 'intake_blueprint', execution_path: 'intake_status_check',
                  session_id: existSession.id, product: detectedProductId,
                  first_blocker: null, duration_ms: Date.now() - started,
                  done_synopsis: `${detectedProductId} blueprint is ready to execute.`,
                  done_bullets: [`Product: ${detectedProductId}`, `Status: ready`, `Session: ${existSession.id.slice(0, 8)}`],
                  next_synopsis: `Say "Execute the ${detectedProductId} blueprint" to build.`,
                  human_summary: `${detectedProductId} blueprint is READY to execute (session ${existSession.id}). Say "Execute the ${detectedProductId} blueprint" to build.`,
                  human_summary_technical: `Blueprint ready. Execute with POST .../execute.`,
                }, channel);
                return { statusCode: 200, body: chairEnvelope(channel, { ...truth, intake_normalized: intakeNormalized, source_mode: sourceMode, auth_mode, user_role }) };
              }

              const truth = finalizeTruth({
                ok: true, pass_fail: 'RUNNING', command_truth: 'COMMAND_RAN',
                action: 'intake_blueprint', execution_path: 'intake_status_check',
                session_id: existSession.id, product: detectedProductId,
                first_blocker: null, duration_ms: Date.now() - started,
                done_synopsis: `${detectedProductId} blueprint is processing (${existSession.status}).`,
                done_bullets: [`Product: ${detectedProductId}`, `Status: ${existSession.status}`, `Session: ${existSession.id.slice(0, 8)}`],
                human_summary: `${detectedProductId} blueprint session is currently ${existSession.status}. It will proceed automatically.`,
              }, channel);
              return { statusCode: 200, body: chairEnvelope(channel, { ...truth, intake_normalized: intakeNormalized, source_mode: sourceMode, auth_mode, user_role }) };
            }
          } catch (arcErr) {
            _clog(`existingSession_error: ${arcErr.message}`);
            console.error('[CHAIR-ARC] Error looking up existing session:', arcErr.message);
          }
        }

        _clog('pre_productHome_read');
        const productHomeFile = `docs/products/${detectedProductId}/PRODUCT_HOME.md`;
        let amendmentText = '';
        try {
          const { REPO_ROOT } = await import('./repo-root.js');
          const { default: fs } = await import('node:fs');
          const { default: nodePath } = await import('node:path');
          const fullPath = nodePath.join(REPO_ROOT, productHomeFile);
          if (fs.existsSync(fullPath)) {
            amendmentText = fs.readFileSync(fullPath, 'utf8');
          }
        } catch { /* fall through */ }

        _clog(`productHome_diskRead done=${!!amendmentText}`);
        if (!amendmentText) {
          _clog('pre_github_fetch');
          try {
            const ghToken = process.env.GITHUB_TOKEN?.trim();
            const ghRepo = process.env.GITHUB_REPO || 'LimitlessOI/Lumin-LifeOS';
            if (ghToken) {
              const ghRes = await fetch(
                `https://api.github.com/repos/${ghRepo}/contents/${productHomeFile}?ref=main`,
                { headers: { Authorization: `token ${ghToken}`, Accept: 'application/vnd.github.v3.raw' }, signal: AbortSignal.timeout(15000) },
              );
              if (ghRes.ok) amendmentText = await ghRes.text();
            }
          } catch { /* GitHub fallback failed — fall through to error */ }
          _clog('post_github_fetch');
        }

        if (!amendmentText) {
          const truth = finalizeTruth({
            ok: false,
            pass_fail: 'FAIL',
            command_truth: 'NO_COMMAND_RAN',
            action: 'intake_blueprint',
            execution_path: 'intake_blueprint_backfill',
            product: detectedProductId,
            first_blocker: `Product home not found: ${productHomeFile}`,
            human_summary: `Blueprint intake failed — could not read ${productHomeFile}. Ensure the product home exists.`,
          }, channel);
          return { statusCode: 200, body: chairEnvelope(channel, { ...truth, intake_normalized: intakeNormalized, source_mode: sourceMode, auth_mode, user_role }) };
        }

        try {
          const { injectProductMemoryIntoContext } = await import('./founder-memory-product-resolver.js');
          const injected = await injectProductMemoryIntoContext({
            productId: detectedProductId,
            productHomeText: amendmentText,
            pool: deps.pool,
          });
          amendmentText = injected.full_context;
          _clog(`productHome_memoryInject entries=${injected.entries?.length || 0}`);
        } catch (memErr) {
          _clog(`productHome_memoryInject_error=${memErr.message}`);
        }

        const wantsExecuteBeforeBackfill = /\b(execute|build|run|deploy)\b/i.test(cleanedInput)
          && !/\b(create|generate|make|produce|write|draft)\b/i.test(cleanedInput);
        if (wantsExecuteBeforeBackfill) {
          try {
            const { rows: readySessions } = await deps.pool.query(
              `SELECT id, status FROM blueprint_intake_sessions WHERE product_name = $1 AND status = 'ready' ORDER BY created_at DESC LIMIT 1`,
              [detectedProductId]
            );
            _clog(`execute_redirect_check readySessions=${readySessions.length}`);
            if (readySessions.length) {
              const readySession = readySessions[0];
              const { executeIntakeBlueprint } = await import('../services/intake-blueprint-executor.js');
              const execPromise2 = executeIntakeBlueprint({
                pool: deps.pool, sessionId: readySession.id, baseUrl, commandKey: operatorKey,
                dryRun: false,
              });
              const EXEC_INLINE_TIMEOUT_MS2 = 60000;
              const timeoutPromise2 = new Promise(r => setTimeout(() => r(null), EXEC_INLINE_TIMEOUT_MS2));
              const execResult = await Promise.race([execPromise2, timeoutPromise2]);
              if (!execResult) {
                _clog('execute_redirect_inline_timeout — continuing in background');
                execPromise2.then(r => _clog(`execute_redirect_bg_done ok=${r?.ok} steps=${r?.steps_run}`)).catch(e => _clog(`execute_redirect_bg_err: ${e.message}`));
                const truth = finalizeTruth({
                  ok: true, pass_fail: 'RUNNING', command_truth: 'COMMAND_RAN',
                  action: 'intake_blueprint', execution_path: 'execute_blueprint_async',
                  session_id: readySession.id, product: detectedProductId,
                  first_blocker: null, duration_ms: Date.now() - started,
                  done_synopsis: `${detectedProductId} blueprint execution started (building code in background).`,
                  done_bullets: [`Product: ${detectedProductId}`, `Session: ${readySession.id.slice(0,8)}`, `Status: building in background`],
                  human_summary: `${detectedProductId} blueprint is being executed in the background — code generation takes time for larger blueprints. Check status with "Check status of the ${detectedProductId} blueprint".`,
                  human_summary_technical: `Execution dispatched async — inline timeout after ${EXEC_INLINE_TIMEOUT_MS2}ms. Builder is generating code in background.`,
                }, channel);
                return { statusCode: 200, body: chairEnvelope(channel, { ...truth, intake_normalized: intakeNormalized, source_mode: sourceMode, auth_mode, user_role }) };
              }
              const truth = finalizeTruth({
                ok: execResult.ok, pass_fail: execResult.ok ? 'PASS' : 'FAIL', command_truth: 'COMMAND_RAN',
                action: 'intake_blueprint', execution_path: 'execute_blueprint',
                session_id: readySession.id, product: detectedProductId,
                first_blocker: execResult.error || null, duration_ms: Date.now() - started,
                done_synopsis: execResult.ok
                  ? `${detectedProductId} blueprint executed. ${execResult.already_complete ? 'All targets present — acceptance passed.' : `${execResult.steps_run || 0} steps built.`}`
                  : `${detectedProductId} blueprint execution failed.`,
                done_bullets: execResult.ok
                  ? [`Product: ${detectedProductId}`, `Steps: ${execResult.steps_run || 0}`, `Acceptance: ${execResult.acceptance?.ok ? 'PASSED' : 'not run'}`]
                  : [`Product: ${detectedProductId}`, `Error: ${execResult.error}`, ...(execResult.failed_step ? [`Failed step: ${execResult.failed_step}`] : []), ...(execResult.target_file ? [`Target: ${execResult.target_file}`] : [])],
                human_summary: execResult.ok
                  ? `${detectedProductId} blueprint executed successfully. ${execResult.steps_run || 0} steps processed. ${execResult.already_complete ? 'All targets already present — acceptance passed.' : 'Build complete.'}`
                  : `${detectedProductId} blueprint execution failed: ${execResult.error}${execResult.failed_step ? ` (step ${execResult.failed_step}${execResult.target_file ? ` → ${execResult.target_file}` : ''})` : ''}${execResult.builder?.detail ? `. Detail: ${execResult.builder.detail}` : ''}`,
                human_summary_technical: execResult.ok
                  ? `Execution complete. steps_run=${execResult.steps_run} acceptance=${JSON.stringify(execResult.acceptance?.ok)}`
                  : `Execution failed: ${execResult.error} step=${execResult.failed_step} target=${execResult.target_file} detail=${execResult.builder?.detail || execResult.builder?.error || 'none'}`,
              }, channel);
              return { statusCode: 200, body: chairEnvelope(channel, { ...truth, intake_normalized: intakeNormalized, source_mode: sourceMode, auth_mode, user_role }) };
            }
          } catch (exErr) {
            _clog(`execute_redirect_error: ${exErr.message}`);
          }
        }

        _clog('pre_import_intake');
        const intake = (await import('../services/blueprint-intake.js')).createBlueprintIntakeService(deps.pool, deps.callCouncilMember);
        _clog('pre_startBackfill');
        const backfillResult = await intake.startBackfill({
          amendmentFile: productHomeFile,
          amendmentText,
          productName: detectedProductId,
          ownerId: null,
        });
        _clog(`post_startBackfill status=${backfillResult.status}`);

        const truth = finalizeTruth({
          ok: true,
          pass_fail: 'RUNNING',
          command_truth: 'COMMAND_RAN',
          action: 'intake_blueprint',
          execution_path: 'intake_blueprint_backfill',
          session_id: backfillResult.sessionId,
          product: detectedProductId,
          product_home: productHomeFile,
          async: true,
          first_blocker: null,
          duration_ms: Date.now() - started,
          done_synopsis: `${detectedProductId} blueprint generation started.`,
          done_bullets: [`Product: ${detectedProductId}`, `Source: ${productHomeFile}`, `Session: ${backfillResult.sessionId.slice(0, 8)}`],
          next_synopsis: `Chair → Architect → ARC review running. Check status with "Check status of the ${detectedProductId} blueprint".`,
          human_summary: `Blueprint intake started for ${detectedProductId}. Session ${backfillResult.sessionId} — status: ${backfillResult.status}.`,
          human_summary_technical: `Blueprint intake backfill started for ${detectedProductId} from ${productHomeFile}.`,
        }, channel);
        return {
          statusCode: 202,
          body: chairEnvelope(channel, { ...truth, intake_normalized: intakeNormalized, source_mode: sourceMode, auth_mode, user_role }),
        };
      }

      const intakeResult = await executeIntakeBlueprint({
        sessionId,
        baseUrl,
        commandKey: operatorKey,
        dryRun: false,
        onStep: () => {},
      });
      const productLabel = detectedProductId || 'SocialMediaOS';
      const truth = finalizeTruth({
        ok: intakeResult.ok === true,
        pass_fail: intakeResult.ok ? 'PASS' : 'FAIL',
        command_truth: intakeResult.ok ? 'COMMAND_RAN' : 'NO_COMMAND_RAN',
        action: 'intake_blueprint',
        execution_path: 'intake_blueprint_executor',
        session_id: sessionId,
        product: productLabel,
        steps_run: intakeResult.steps_run || 0,
        failed_step: intakeResult.failed_step || null,
        acceptance: intakeResult.acceptance || null,
        already_complete: intakeResult.already_complete === true,
        first_blocker: intakeResult.ok ? null : (intakeResult.error || intakeResult.failed_step || 'intake_failed'),
        duration_ms: Date.now() - started,
        human_summary: intakeResult.ok
          ? (intakeResult.already_complete
            ? `${productLabel} intake blueprint already complete — acceptance PASS (idempotent re-run).`
            : `${productLabel} intake blueprint complete (${intakeResult.steps_run || 0} steps). Acceptance: ${intakeResult.acceptance?.ok ? 'PASS' : 'check logs'}.`)
          : `${productLabel} intake failed at ${intakeResult.failed_step || 'unknown'}: ${intakeResult.error || 'see builder receipt'}.`,
        human_summary_technical: deps.formatExecutionTruthReply({
          ok: intakeResult.ok,
          pass_fail: intakeResult.ok ? 'PASS' : 'FAIL',
          action: 'intake_blueprint',
          session_id: sessionId,
        }),
      }, channel);
      return {
        statusCode: intakeResult.ok ? 200 : 200,
        body: chairEnvelope(channel, { ...truth, intake_normalized: intakeNormalized, source_mode: sourceMode, auth_mode, user_role }),
      };
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
          userId: ctx.userId || resolvedUserId,
          callCouncilMember: deps.callCouncilMember,
          pool: deps.pool,
          luminPersist: deps.luminPersist || null,
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
      const memoryContext = ctx.alphaProbe
        ? null
        : (deps.loadChairMemoryContext
          ? await deps.loadChairMemoryContext({
            userId: resolvedUserId,
            userHandle: ctx.userHandle || userHandle || null,
            messageText: effectiveInput,
            productId: ctx.productId || chairContext?.product_id || null,
          }).catch(() => null)
          : null);
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
          userId: resolvedUserId,
          userHandle: ctx.userHandle || null,
          strategicBrief,
          listeningOnboarding,
      }, {
        ...chairContext,
        domain: sourceMode === 'listening_setup' ? 'listening_onboarding' : chairContext.domain,
        user_handle: ctx.userHandle || userHandle || chairContext.user_handle || null,
        conversation_history: mergedHistory,
        alpha_probe: ctx.alphaProbe === true,
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
