/**
 * LifeOS System Operator — natural conversation backed by real API/tool execution.
 * One channel: talk normally; system runs first; model speaks from receipts only.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import {
  classifySystemDirectAction,
  handleSystemDirectMessage,
  runSystemDirectStatusProbes,
} from './voice-rail-system-direct.js';
import { listCommandControlJobs } from './builderos-command-control-service.js';
import {
  shouldRouteFounderToSystem,
  extractTargetFileFromInstruction,
} from './voice-rail-command-executor.js';
import {
  isBpProgramUtterance,
  wantsBpExecute,
  loadBpPriorityQueue,
  resolveNextLifeOSSlice,
  executeLifeOSSliceBuild,
  summarizeBuildAsCommandExecution,
  formatSliceToolSummary,
} from './lifeos-bp-next-slice.js';

function normalizeText(value) {
  return String(value || '').trim();
}

/**
 * Decide what the system does before any conversational reply.
 * BP/slice requests → read queue + optional /builder/build. General chat → context only.
 */
export function classifyFounderToolPass({ utterance, mode, intent, department }) {
  const content = normalizeText(utterance);
  if (isBpProgramUtterance(content)) {
    return { type: wantsBpExecute(content) ? 'bp_execute' : 'bp_inspect' };
  }
  const direct = classifySystemDirectAction(content);
  if (direct.type === 'help' || direct.type === 'status' || direct.type === 'jobs') {
    return direct;
  }
  if (
    mode === 'command'
    || shouldRouteFounderToSystem({ mode, intent, content, department })
    || extractTargetFileFromInstruction(content)
  ) {
    return { type: 'execute' };
  }
  return { type: 'context_only' };
}

export async function runFounderSystemToolPass({
  pool,
  userId,
  utterance,
  mode,
  intent,
  department,
  baseUrl,
  commandKey,
  connectionProbe,
  stageCommand,
  sessionId,
  logger,
}) {
  const action = classifyFounderToolPass({ utterance, mode, intent, department });

  if (action.type === 'bp_inspect' || action.type === 'bp_execute') {
    const queue = await loadBpPriorityQueue();
    const slice = await resolveNextLifeOSSlice();
    let buildResult = null;
    if (action.type === 'bp_execute' && slice?.target_file && slice.actionable !== false) {
      buildResult = await executeLifeOSSliceBuild({ slice, baseUrl, commandKey, logger });
    }
    const tool_summary = formatSliceToolSummary({
      slice,
      buildResult,
      mode: action.type,
      queue,
    });
    return {
      action: action.type,
      bp_slice: slice,
      bp_queue: queue,
      context_health: null,
      command_execution: summarizeBuildAsCommandExecution(buildResult),
      staged_command: null,
      api_trace: [
        { action: action.type, slice: slice?.step_id || slice?.task_id },
        ...(buildResult ? [{ action: 'builder_build', http: buildResult.http_status, committed: buildResult.committed }] : []),
      ],
      tool_summary,
    };
  }

  if (action.type === 'context_only') {
    let contextHealth = null;
    let bpSummary = '';
    try {
      const queue = await loadBpPriorityQueue();
      const slice = await resolveNextLifeOSSlice();
      bpSummary = formatSliceToolSummary({ slice, buildResult: null, mode: 'bp_inspect', queue });
    } catch (err) {
      logger?.warn?.({ err: err.message }, 'lifeos operator bp preload failed');
    }
    if (typeof connectionProbe === 'function') {
      try {
        const probe = await connectionProbe();
        contextHealth = probe?.context_health || null;
      } catch (err) {
        logger?.warn?.({ err: err.message }, 'lifeos operator context probe failed');
      }
    }
    const tool_summary = [
      bpSummary || 'LifeOS BP queue: preload failed',
      contextHealth
        ? `LifeOS context: ${contextHealth.level || 'unknown'} (connected=${contextHealth.connected ?? contextHealth.sufficient_for_founder_reply ?? '?'})`
        : '',
    ].filter(Boolean).join('\n\n');
    return {
      action: 'context_only',
      context_health: contextHealth,
      command_execution: null,
      staged_command: null,
      api_trace: [{ action: 'context_only', bp_preloaded: Boolean(bpSummary) }],
      tool_summary,
    };
  }

  const direct = await handleSystemDirectMessage({
    pool,
    userId,
    sessionId,
    utterance,
    baseUrl,
    commandKey,
    connectionProbe,
    stageCommand,
    logger,
  });

  return {
    action: action.type,
    command_execution: direct.command_execution,
    staged_command: direct.staged_command,
    api_trace: direct.api_trace,
    probes: direct.probes,
    tool_summary: direct.text,
    raw_direct: direct,
  };
}

export function buildLifeOSOperatorSystemPrompt({
  operator,
  contextData,
  toolPass,
  executionTruthBlock,
}) {
  const name = operator?.display_name || 'Adam';
  const toolBlock = toolPass?.tool_summary
    ? `\n\nSYSTEM_TOOL_RESULTS (ground truth — never contradict):\n${toolPass.tool_summary}`
    : '\n\nSYSTEM_TOOL_RESULTS: (no tools ran this turn — conversation only; do not claim builds or jobs.)';

  const receipt = toolPass?.command_execution;
  const receiptBlock = receipt
    ? `\nCOMMAND_EXECUTION_RECEIPT: ${JSON.stringify({
      ok: receipt.ok,
      job_id: receipt.job_id,
      root_cause: receipt.root_cause,
      target_file: receipt.target_file,
      commit_sha: receipt.commit_sha,
      stage: receipt.stage,
      model_used: receipt.model_used,
    })}`
    : '';

  const bpContext = contextData?.bp_next_slice
    ? `\nBP_NEXT_SLICE (from repo): ${JSON.stringify({
      source: contextData.bp_next_slice.source,
      step_id: contextData.bp_next_slice.step_id,
      target_file: contextData.bp_next_slice.target_file,
      title: contextData.bp_next_slice.title,
    })}`
    : '';

  return [
    `You are LifeOS — ${name}'s live operator interface to their Railway-deployed system.`,
    'You speak naturally in conversation, like a trusted operator who runs the machine — NOT a separate "advisor" chatbot.',
    'You are NOT Council Chair, NOT BPB, NOT any department persona. Never say "I routed to…" or "the team will…".',
    `${name} is the authority. When he asks to program, build, or run a BP slice, the system already read BP_PRIORITY.json and blueprints — cite SYSTEM_TOOL_RESULTS.`,
    'You HAVE repo access via the server: builderos-reboot/BP_PRIORITY.json, mission BLUEPRINT.json files, and the builder API. NEVER claim you cannot browse the repo, pick the next slice, or need Adam to supply file paths when BP context is present.',
    'NEVER refuse work with "I require you to provide a file path" unless COMMAND_EXECUTION_RECEIPT shows missing_target_file from a failed build.',
    'When work was requested, SYSTEM_TOOL_RESULTS shows what the APIs actually did. Cite job_id / commit_sha / blockers when present.',
    'Keep flow human. Short paragraphs. No corporate filler. No fake pipelines. No arguing with the founder.',
    executionTruthBlock || '',
    bpContext,
    toolBlock,
    receiptBlock,
    contextData?.communication_profile_summary
      ? `\nOperator tone preferences:\n${String(contextData.communication_profile_summary).slice(0, 800)}`
      : '',
  ].filter(Boolean).join('\n');
}

export function buildLifeOSOperatorReplySource(routing, toolPass, usageReceipt) {
  return {
    path: 'lifeos/system/operator',
    persona: 'LifeOS',
    department: 'LifeOS',
    department_title: 'LifeOS',
    display_name: routing?.displayName || 'LifeOS',
    model_id: routing?.modelId || null,
    provider: routing?.provider || null,
    note: 'Natural conversation backed by system API tool pass — not department theater.',
    system_operator: true,
    council_used: true,
    operator_voice: true,
    tool_action: toolPass?.action || null,
    bp_slice: toolPass?.bp_slice || null,
    command_execution: toolPass?.command_execution || null,
    usage_receipt: usageReceipt || null,
    routing_meta: routing?.routing_meta || null,
  };
}

export async function fetchRecentJobsSummary(pool, limit = 3) {
  if (!pool) return '';
  const jobs = await listCommandControlJobs(pool, { limit });
  if (!jobs?.length) return 'Recent command-control jobs: none';
  return `Recent command-control jobs:\n${jobs
    .slice(0, limit)
    .map((j) => `- ${j.id?.slice(0, 8)}… ${j.status}${j.blocker ? ` (${j.blocker})` : ''}`)
    .join('\n')}`;
}
