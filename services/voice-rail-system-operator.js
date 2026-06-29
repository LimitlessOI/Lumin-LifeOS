/**
 * SYNOPSIS: LifeOS System Operator — natural conversation backed by real API/tool execution.
 * LifeOS System Operator — natural conversation backed by real API/tool execution.
 * One channel: talk normally; system runs first; model speaks from receipts only.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import {
  classifySystemDirectAction,
  handleSystemDirectMessage,
} from './voice-rail-system-direct.js';
import { listCommandControlJobs } from './builderos-command-control-service.js';
import {
  shouldRouteFounderToSystem,
  extractTargetFileFromInstruction,
} from './voice-rail-command-executor.js';
import { isRepoBuildCommand } from './lifeos-founder-command-class.js';
import { detectProviderProofIntent } from './founder-provider-tool-action.js';
import { BP_PRIORITY_REL } from './bp-priority-queue.js';

function normalizeText(value) {
  return String(value || '').trim();
}

/**
 * Decide what the system does before any conversational reply.
 * General chat → context only (no spurious builder jobs).
 */
export function classifyFounderToolPass({ utterance, mode, intent, department }) {
  const content = normalizeText(utterance);
  if (detectProviderProofIntent(content)) {
    return { type: 'provider_proof' };
  }
  const direct = classifySystemDirectAction(content);
  if (direct.type === 'help' || direct.type === 'status' || direct.type === 'jobs' || direct.type === 'system_action') {
    return direct;
  }
  if (direct.type === 'unsupported') {
    return direct;
  }
  if (
    (mode === 'command' || intent === 'command')
    && isRepoBuildCommand(content, { explicitMode: mode })
  ) {
    return { type: 'execute' };
  }
  if (shouldRouteFounderToSystem({ mode, intent, content, department })) {
    return { type: 'execute' };
  }
  if (extractTargetFileFromInstruction(content) && isRepoBuildCommand(content, { explicitMode: mode })) {
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

  if (action.type === 'provider_proof') {
    return {
      action: 'provider_proof',
      context_health: null,
      command_execution: null,
      staged_command: null,
      api_trace: [{ action: 'provider_proof_deferred_to_hard_route' }],
      tool_summary: 'Provider proof — handled by hard route (not builder/council).',
    };
  }

  if (action.type === 'context_only') {
    let contextHealth = null;
    if (typeof connectionProbe === 'function') {
      try {
        const probe = await connectionProbe();
        contextHealth = probe?.context_health || null;
      } catch (err) {
        logger?.warn?.({ err: err.message }, 'lifeos operator context probe failed');
      }
    }
    return {
      action: 'context_only',
      context_health: contextHealth,
      command_execution: null,
      staged_command: null,
      api_trace: [{ action: 'context_only' }],
      tool_summary: contextHealth
        ? `LifeOS context: ${contextHealth.level || 'unknown'} (connected=${contextHealth.connected ?? contextHealth.sufficient_for_founder_reply ?? '?'})`
        : 'LifeOS context: probe unavailable',
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
    })}`
    : '';

  const bpBlock = Array.isArray(contextData?.bp_priority) && contextData.bp_priority.length
    ? `\nBP_PRIORITY (${BP_PRIORITY_REL} + each mission BLUEPRINT.json):\n${JSON.stringify(contextData.bp_priority, null, 2)}`
    : '';

  return [
    `You are LifeOS — ${name}'s live operator interface to their Railway-deployed system.`,
    'You speak naturally in conversation, like a trusted operator who runs the machine — NOT a separate "advisor" chatbot.',
    'You are NOT Council Chair, NOT BPB, NOT any department persona. Never say "I routed to…" or "the team will…".',
    `${BP_PRIORITY_REL} is priority ranking only — which mission BLUEPRINT.json to work first. BLUEPRINT.json is the executable work plan. Do not call BP_PRIORITY a queue; there is no mission queue, task queue, or product queue.`,
    'NEVER claim you lack repo access, cannot read blueprints, or need Adam to name paths when BP_PRIORITY is in context.',
    'When work was requested, SYSTEM_TOOL_RESULTS shows what command-control/builder actually did. Cite job_id / blockers when present.',
    'Keep flow human. Short paragraphs. No corporate filler. No fake pipelines.',
    executionTruthBlock || '',
    bpBlock,
    toolBlock,
    receiptBlock,
    contextData?.communication_profile_summary
      ? `\nOperator tone preferences:\n${String(contextData.communication_profile_summary).slice(0, 800)}`
      : '',
  ].filter(Boolean).join('\n');
}

/** Deterministic LifeOS reply — BP_PRIORITY + BLUEPRINT.json + receipts only. */
export function formatBpPriorityReply(bpPriority) {
  if (!Array.isArray(bpPriority) || !bpPriority.length) {
    return `${BP_PRIORITY_REL}: not loaded this turn.`;
  }
  const lines = [`${BP_PRIORITY_REL} (rank → mission → BLUEPRINT.json):`];
  let hasPending = false;
  for (const row of bpPriority) {
    const next = row.next_step;
    let note = 'all blueprint steps complete';
    if (next?.step_id) {
      note = `next ${next.step_id} → ${next.target_file || next.command || '?'}`;
      hasPending = true;
    } else if (next?.error) {
      note = 'blueprint unreadable';
    }
    lines.push(`  rank ${row.rank} ${row.mission_id} [${row.verdict || '?'}] — ${note}`);
  }
  if (!hasPending) {
    lines.push('');
    lines.push('No incomplete steps in any BLUEPRINT.json. Add a step to a blueprint or a new rank in BP_PRIORITY.json.');
  }
  return lines.join('\n');
}

export function formatLifeOSOperatorReply({ toolPass, bpPriority }) {
  const parts = [formatBpPriorityReply(bpPriority)];
  if (toolPass?.tool_summary) parts.push(toolPass.tool_summary);
  if (toolPass?.command_execution) {
    const ce = toolPass.command_execution;
    parts.push([
      'Execution receipt:',
      `  ok: ${ce.ok}`,
      `  job_id: ${ce.job_id || '—'}`,
      `  target_file: ${ce.target_file || '—'}`,
      `  commit_sha: ${ce.commit_sha || '—'}`,
      ce.root_cause ? `  blocker: ${ce.root_cause}` : '',
    ].filter(Boolean).join('\n'));
  }
  return parts.filter(Boolean).join('\n\n');
}

export function buildLifeOSOperatorReplySource(routing, toolPass, usageReceipt, { councilUsed = false } = {}) {
  return {
    path: 'lifeos/system/operator',
    persona: 'LifeOS',
    department: 'LifeOS',
    department_title: 'LifeOS',
    display_name: routing?.displayName || 'LifeOS',
    model_id: councilUsed ? (routing?.modelId || null) : null,
    provider: councilUsed ? (routing?.provider || null) : 'system',
    note: councilUsed
      ? 'Council voice over system receipts'
      : 'System receipts only — no council call (anti-theater)',
    system_operator: true,
    council_used: councilUsed,
    operator_voice: !councilUsed,
    tool_action: toolPass?.action || null,
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
