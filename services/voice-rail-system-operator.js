/**
 * LifeOS System Operator — natural conversation backed by real API/tool execution.
 * One channel: talk normally; system runs first; model speaks from receipts only.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
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
import {
  summarizeBpPriorityForOperator,
  resolveNextBlueprintBuild,
} from './bp-priority-queue.js';

function normalizeText(value) {
  return String(value || '').trim();
}

function isFounderBlueprintUtterance(utterance) {
  const t = normalizeText(utterance).toLowerCase();
  if (!t) return false;
  if (/\b(bp|blueprint|bp_priority)\b/.test(t)) return true;
  if (/\b(next slice|program.*slice|pick.*slice|build.*slice)\b/.test(t)) return true;
  if (/\b(prove|show).*\b(agent|system|lifeos)\b/.test(t)) return true;
  if (/\b(program|build|execute|run|ship)\b/.test(t) && /\b(slice|bp|blueprint|lifeos)\b/.test(t)) {
    return true;
  }
  return false;
}

function wantsBlueprintBuild(utterance) {
  const t = normalizeText(utterance).toLowerCase();
  if (/\b(just (tell|show|list)|what is next|status only)\b/.test(t) && !/\b(program|build|run|execute|do it)\b/.test(t)) {
    return false;
  }
  if (/\b(program|build|run|execute|do it|ship|prove|go ahead)\b/.test(t)) return true;
  if (/\bpick any slice\b/.test(t) || /\bvery next slice\b/.test(t)) return true;
  return isFounderBlueprintUtterance(utterance);
}

async function dispatchBlueprintStepBuild({ step, baseUrl, commandKey, logger }) {
  if (!step?.target_file && step?.action_type !== 'shell_command') {
    return { ok: false, error: 'blueprint_step_no_target', step };
  }
  if (step.action_type === 'shell_command' && step.command) {
    return {
      ok: false,
      error: 'shell_command_not_via_voice',
      hint: `Run locally: ${step.command}`,
      step,
    };
  }

  const publicBase = String(process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '');
  const normalized = String(baseUrl || '').replace(/\/$/, '');
  const port = process.env.PORT || '3000';
  const dispatchBase = publicBase && normalized === publicBase
    ? `http://127.0.0.1:${port}`
    : normalized || `http://127.0.0.1:${port}`;

  const url = `${dispatchBase}/api/v1/lifeos/builder/build`;
  const body = {
    domain: 'lifeos-platform',
    mission_id: step.mission_id,
    blueprint_path: step.blueprint_path,
    target_file: step.target_file,
    task: `${step.step_id}: ${step.title}`,
    spec: `Execute blueprint step from ${step.blueprint_path}. Step ${step.step_id}. @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md`,
    commit_message: `[system-build] ${step.mission_id} ${step.step_id}`,
  };

  logger?.info?.({ step: step.step_id, target: step.target_file }, 'blueprint step build');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-command-key': commandKey || process.env.COMMAND_CENTER_KEY || '',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const json = await response.json().catch(() => ({}));
    return {
      ok: response.ok && json?.ok === true,
      http_status: response.status,
      committed: json?.committed === true,
      target_file: json?.target_file || step.target_file,
      commit_sha: json?.commit_sha || null,
      model_used: json?.model_used || null,
      error: json?.error || null,
      step,
    };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, error: err.message, step };
  }
}

/**
 * Decide what the system does before any conversational reply.
 */
export function classifyFounderToolPass({ utterance, mode, intent, department }) {
  const content = normalizeText(utterance);
  if (isFounderBlueprintUtterance(content)) {
    return { type: wantsBlueprintBuild(content) ? 'blueprint_build' : 'blueprint_inspect' };
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

  if (action.type === 'blueprint_inspect' || action.type === 'blueprint_build') {
    const summary = summarizeBpPriorityForOperator();
    let buildResult = null;
    if (action.type === 'blueprint_build' && summary.next) {
      buildResult = await dispatchBlueprintStepBuild({
        step: summary.next,
        baseUrl,
        commandKey,
        logger,
      });
    }
    let tool_summary = summary.text;
    if (buildResult) {
      tool_summary += `\n\nBUILDER /build:\n  committed: ${buildResult.committed === true}\n  commit_sha: ${buildResult.commit_sha || '—'}\n  error: ${buildResult.error || '—'}`;
    } else if (action.type === 'blueprint_build' && !summary.next) {
      tool_summary += '\n\nBUILD: nothing to run — all BLUEPRINT.json steps in BP_PRIORITY are complete.';
    }
    return {
      action: action.type,
      blueprint_step: summary.next,
      command_execution: buildResult
        ? {
          ok: buildResult.ok && buildResult.committed,
          target_file: buildResult.target_file,
          commit_sha: buildResult.commit_sha,
          root_cause: buildResult.error,
          stage: 'builder_build',
          model_used: buildResult.model_used,
        }
        : null,
      staged_command: null,
      api_trace: [{ action: action.type, step: summary.next?.step_id || null }],
      tool_summary,
    };
  }

  if (action.type === 'context_only') {
    let contextHealth = null;
    let bpText = '';
    try {
      bpText = summarizeBpPriorityForOperator().text;
    } catch (err) {
      logger?.warn?.({ err: err.message }, 'bp priority preload failed');
    }
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
      tool_summary: [bpText, contextHealth ? `LifeOS context: ${contextHealth.level}` : ''].filter(Boolean).join('\n\n'),
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
    : '';

  const receipt = toolPass?.command_execution;
  const receiptBlock = receipt
    ? `\nCOMMAND_EXECUTION_RECEIPT: ${JSON.stringify({
      ok: receipt.ok,
      target_file: receipt.target_file,
      commit_sha: receipt.commit_sha,
      root_cause: receipt.root_cause,
    })}`
    : '';

  return [
    `You are LifeOS — ${name}'s live operator on Railway.`,
    'Natural voice only. NOT department personas. NOT a separate advisor.',
    `${name} is the authority. The server reads builderos-reboot/BP_PRIORITY.json and each mission BLUEPRINT.json directly.`,
    'When SYSTEM_TOOL_RESULTS lists blueprint steps, cite them. NEVER claim you lack repo access or need Adam to name file paths.',
    'If all blueprint steps are complete, say so honestly — do not invent work.',
    executionTruthBlock || '',
    toolBlock,
    receiptBlock,
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
    note: 'System APIs + BLUEPRINT.json — not department theater.',
    system_operator: true,
    council_used: true,
    operator_voice: true,
    tool_action: toolPass?.action || null,
    blueprint_step: toolPass?.blueprint_step || null,
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
