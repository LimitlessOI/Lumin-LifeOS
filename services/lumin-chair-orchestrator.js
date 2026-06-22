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
import { isRepairContinuationIntent } from './builder-instruction-target.js';
import { handlePointBFounderMessage } from './point-b-navigator.js';
import { loadPointBTarget } from './point-b-target-lite.js';
import { wrapChairHumanSummary } from './founder-communication-format.js';
import { enforceChairTruthExit } from './chair-truth-gate.js';
import { expandFounderBuildTask, isFounderShipOrUsabilityIntent, resolveExplicitChairChannel } from './founder-chair-intent.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXECUTE_MISSION = path.join(REPO_ROOT, 'builderos-reboot/scripts/execute-mission.mjs');

export function isExplicitExecuteCommand(text = '') {
  const t = String(text || '').trim();
  if (!t) return false;
  if (/^\s*(execute|run|go|ship)\s*[.!]?\s*$/i.test(t)) return true;
  return /\b(execute it|do it now|run it now|ship it|go ahead|make it happen|just do it|execute that|run that|do that now|get it done|execute this)\b/i.test(t);
}

export function isBlueprintExecuteIntent(text = '') {
  const t = String(text || '');
  if (/\b(build|run|execute)\s+(the\s+)?blueprint\b/i.test(t)) return true;
  if (/\bexecute\s+(the\s+)?mission\b/i.test(t)) return true;
  if (/\brun\s+execute[- ]?mission\b/i.test(t)) return true;
  if (/\bexecute\s+PRODUCT-[A-Z0-9-]+\b/i.test(t)) return true;
  return false;
}

export function isPureCounselQuestion(text = '') {
  const t = String(text || '').trim();
  if (!/\?\s*$/.test(t)) return false;
  if (/\b(status|keep going|point b|continue|progress|execute|build|fix|change|lifere|mission|blueprint)\b/i.test(t)) {
    return false;
  }
  return true;
}

export function isBuildRequest(text) {
  if (isBlueprintExecuteIntent(text)) return false;
  const t = String(text || '');
  if (/\b(what changed|tell me what changed|show me what changed|what is the|what are the|how many|status of|queue status)\b/i.test(t)
    && !/\b(change|fix|make|update|set)\b.*\b(color|ui|css|response|reply|bubble)\b/i.test(t)) {
    return false;
  }
  if (/\b(should be|needs to be|want.*(yellow|blue|red|green|color))\b/i.test(t)
    && /\b(response|reply|bubble|assistant|message|color|background)\b/i.test(t)) {
    return true;
  }
  return /\b(fix|change|update|add|remove|delete|create|make|build|improve|edit|modify|resize|increase|decrease|enable|disable|install|configure|rename|move|replace|set|reset|adjust|implement|wire|connect|upgrade|rewrite|refactor)\b/i.test(t)
    || isFounderShipOrUsabilityIntent(t);
}

export function classifyChairIntent(ctx = {}) {
  const {
    cleanedInput = '',
    shouldDisplayOnly = false,
    explicitExecute = false,
    useTerminalForBuild = false,
    explicitAction = 'auto',
  } = ctx;

  const forced = resolveExplicitChairChannel(explicitAction, { useTerminalForBuild });
  if (forced) return forced;

  if (shouldDisplayOnly) return 'display';
  if (isBlueprintExecuteIntent(cleanedInput)) return 'blueprint_execute';

  if (explicitExecute && isExplicitExecuteCommand(cleanedInput)) return 'execute';

  const shouldRunFounderBuild = isBuildRequest(cleanedInput) || isRepairContinuationIntent(cleanedInput);
  if (shouldRunFounderBuild && useTerminalForBuild) return 'build_terminal';
  if (shouldRunFounderBuild) return 'build_async';

  if (isMissionPipelineIntent(cleanedInput)) return 'mission_pipeline';

  if (explicitExecute && !isBuildRequest(cleanedInput)) return 'execute';
  if (isPureCounselQuestion(cleanedInput)) return 'counsel';
  return 'point_b';
}

export function modelRoutingForChannel(channel) {
  switch (channel) {
    case 'display':
      return { route: 'lumin_chair_display', complexity: 'low', estimated_cost_tier: 'cheap' };
    case 'counsel':
      return { route: 'lumin_chair_counsel', complexity: 'low', estimated_cost_tier: 'cheap' };
    case 'point_b':
      return { route: 'lumin_chair_point_b', complexity: 'high', estimated_cost_tier: 'medium' };
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
    interface: 'Lumin Chair',
    lumin_chair: true,
    chair_channel: channel,
    model_routing: modelRoutingForChannel(channel),
    ...body,
  };
}

function finalizeTruth(truth, channel) {
  const gated = enforceChairTruthExit(truth, channel);
  const technical = gated.human_summary_technical || gated.human_summary || '';
  const withChannel = { ...gated, chair_channel: channel };
  return {
    ...withChannel,
    action: gated.action || channel,
    human_summary_technical: technical,
    human_summary: wrapChairHumanSummary(withChannel, technical),
  };
}

export async function runLuminChairTurn(ctx, deps) {
  const channel = classifyChairIntent(ctx);
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
  } = ctx;

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
      const plainEnglish = await deps.translateToPlainEnglish(cleanedInput, displayResult);
      const truth = finalizeTruth({
        ok: true,
        action: 'display',
        command_truth: 'NO_COMMAND_RAN',
        pass_fail: 'NO_COMMAND_RAN',
        human_summary_technical: plainEnglish || displayResult.human_summary,
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
      const buildTask = await deps.resolveBuildTaskForFounder(ctx.req, cleanedInput);
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
        return { statusCode: 202, body: chairEnvelope(channel, { ...truth, build_task_resolved: buildTask !== cleanedInput }) };
      }
      const builderResult = await deps.routeToBuilder(buildTask, operatorKey);
      const truth = finalizeTruth({
        ...deps.founderBuildResponsePayload(builderResult),
        action: 'build',
        human_summary_technical: deps.formatExecutionTruthReply(builderResult),
        inbox_item_id: inboxGate?.inbox_item_id || null,
        classification: inboxGate?.classification || null,
      }, channel);
      return { statusCode: 200, body: chairEnvelope(channel, { ...truth, build_task_resolved: buildTask !== cleanedInput }) };
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
      const technical = deps.formatExecutionTruthReply({ ...pbResult, action: 'point_b' });
      const truth = finalizeTruth({
        ...pbResult,
        action: 'point_b',
        human_summary_technical: technical,
        done_synopsis: pbResult.human_summary?.split('\n')[0] || pbResult.human_summary,
        next_synopsis: pbResult.point_b?.next_action ? `Next gate: ${pbResult.point_b.next_action}` : undefined,
        next_why: pbResult.point_b?.blocker || undefined,
        point_b: pbResult.point_b,
      }, channel);
      return {
        statusCode: pbResult.run?.async ? 202 : 200,
        body: chairEnvelope(channel, { ...truth, intake_normalized: intakeNormalized, source_mode: sourceMode, auth_mode, user_role }),
      };
    }

    case 'counsel': {
      const luminReply = await deps.luminConverse(cleanedInput);
      const safeReply = deps.sanitizeConversationReply(luminReply, { command_truth: 'NO_COMMAND_RAN' });
      const truth = finalizeTruth({
        ok: true,
        action: 'counsel',
        command_truth: 'NO_COMMAND_RAN',
        pass_fail: 'NO_COMMAND_RAN',
        done_synopsis: 'Counsel only — no system command ran.',
        human_summary_technical: safeReply,
        conversation_sanitized: safeReply !== luminReply,
      }, channel);
      return { statusCode: 200, body: chairEnvelope(channel, { ...truth, intake_normalized: intakeNormalized, auth_mode }) };
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
