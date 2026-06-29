/**
 * SYNOPSIS: LifeOS founder System Direct — API-only comms (no council, no department personas).
 * LifeOS founder System Direct — API-only comms (no council, no department personas).
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { listCommandControlJobs } from './builderos-command-control-service.js';
import {
  executeVoiceRailFounderCommand,
  extractTargetFileFromInstruction,
  formatCommandSystemReply,
  isVoiceRailCommandExecuteEnabled,
} from './voice-rail-command-executor.js';
import {
  detectSystemActionIntent,
  isRepoBuildCommand,
} from './lifeos-founder-command-class.js';

const HELP_TEXT = [
  'LifeOS DIRECT — straight line to Railway APIs. No council. No department chat.',
  '',
  'Status probes (examples):',
  '  "status" / "health" / "ready" / "connected"',
  '  "recent jobs" / "last jobs"',
  '',
  'Execute (BuilderOS command-control):',
  '  Include a repo path: scripts/foo.mjs, services/bar.js, routes/…',
  '  Example: Add one comment to scripts/my-audit.mjs — do not change anything else.',
].join('\n');

function normalizeText(value) {
  return String(value || '').trim();
}

export function classifySystemDirectAction(utterance) {
  const t = normalizeText(utterance).toLowerCase();
  if (!t) return { type: 'help' };
  if (/^\/?(help|commands|\?)$/.test(t) || /\b(what can (you|i) do|list apis|direct help)\b/.test(t)) {
    return { type: 'help' };
  }
  if (detectSystemActionIntent(utterance)) {
    return { type: 'system_action' };
  }
  if (
    /\b(status|health|ready|connected|connection|am i connected|system check|probe)\b/.test(t)
    && !extractTargetFileFromInstruction(utterance)
  ) {
    return { type: 'status' };
  }
  if (/\b(recent jobs|last jobs|job list|command.control jobs|failed jobs)\b/.test(t)) {
    return { type: 'jobs' };
  }
  if (isRepoBuildCommand(utterance)) {
    return { type: 'execute' };
  }
  return { type: 'unsupported' };
}

async function fetchJson(baseUrl, path, commandKey) {
  const url = `${String(baseUrl || '').replace(/\/$/, '')}${path}`;
  const headers = { accept: 'application/json' };
  if (commandKey) headers['x-command-key'] = commandKey;
  try {
    const res = await fetch(url, { headers });
    const body = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, path, body };
  } catch (err) {
    return { ok: false, status: 0, path, error: err.message };
  }
}

function formatProbeLines(probes) {
  return probes.map((p) => {
    if (p.error) return `  ${p.path} → ERROR ${p.error}`;
    const hint = p.body?.connected != null
      ? `connected=${p.body.connected}`
      : p.body?.ok != null
        ? `ok=${p.body.ok}`
        : p.status;
    return `  ${p.method || 'GET'} ${p.path} → HTTP ${p.status} (${hint})`;
  }).join('\n');
}

export async function runSystemDirectStatusProbes({ baseUrl, commandKey, connectionProbe }) {
  const probes = [];
  if (typeof connectionProbe === 'function') {
    try {
      const local = await connectionProbe();
      probes.push({
        method: 'INTERNAL',
        path: 'probeFounderContext',
        status: local?.sufficient ? 200 : 503,
        body: {
          connected: local?.sufficient === true,
          level: local?.context_health?.level,
          counts: local?.context_health?.counts,
        },
      });
    } catch (err) {
      probes.push({
        method: 'INTERNAL',
        path: 'probeFounderContext',
        status: 0,
        error: err.message,
      });
    }
  }
  probes.push(await fetchJson(baseUrl, '/healthz', null));
  probes.push(await fetchJson(baseUrl, '/api/v1/lifeos/builder/ready', commandKey));
  probes.push(await fetchJson(baseUrl, '/api/v1/lifeos/voice-rail/connection-proof?user=adam', commandKey));
  return probes;
}

function formatStatusReply(probes, jobs) {
  const ready = probes.find((p) => p.path?.includes('/builder/ready'))?.body;
  const conn = probes.find((p) => p.path?.includes('connection-proof') || p.path === 'probeFounderContext')?.body;
  const deploySha =
    ready?.codegen?.deploy_commit_sha
    || ready?.builder?.deploy_commit_sha
    || conn?.context_health?.counts?.deploy_commit_sha
    || '—';
  const failed = (jobs || []).filter((j) => j.status === 'failed' || j.status === 'blocked').length;
  const lines = [
    'LifeOS DIRECT — status probes (no LLM)',
    'api_path: lifeos/system/direct',
    '',
    'probes:',
    formatProbeLines(probes),
    '',
    `deploy_sha: ${deploySha}`,
    `builder_commit_ready: ${ready?.builder?.commitToGitHub ?? ready?.ok ?? '—'}`,
    `context_level: ${conn?.context_health?.level || conn?.level || '—'}`,
    `recent_jobs_failed: ${failed}`,
  ];
  return lines.join('\n');
}

function formatJobsReply(jobs) {
  const lines = [
    'LifeOS DIRECT — command-control jobs (Neon)',
    'api_path: GET /api/v1/lifeos/builderos/command-control/jobs',
    '',
  ];
  if (!jobs?.length) {
    lines.push('(no jobs)');
    return lines.join('\n');
  }
  for (const job of jobs.slice(0, 8)) {
    lines.push(
      `- ${job.id} · ${job.status}${job.blocker ? ` · ${job.blocker}` : ''} · ${normalizeText(job.instruction).slice(0, 72)}`,
    );
  }
  return lines.join('\n');
}

/**
 * Founder System Direct message — never calls callCouncilMember.
 */
export async function handleSystemDirectMessage({
  pool,
  userId,
  sessionId,
  utterance,
  baseUrl,
  commandKey,
  connectionProbe,
  stageCommand,
  logger,
}) {
  const content = normalizeText(utterance);
  const action = classifySystemDirectAction(content);
  const apiTrace = [{ action: action.type, at: new Date().toISOString() }];

  if (action.type === 'help') {
    return {
      ok: true,
      text: HELP_TEXT,
      api_trace: apiTrace,
      command_execution: null,
      staged_command: null,
    };
  }

  if (action.type === 'status') {
    apiTrace.push({ probe: 'status_bundle' });
    const probes = await runSystemDirectStatusProbes({ baseUrl, commandKey, connectionProbe });
    const jobs = pool ? await listCommandControlJobs(pool, { limit: 5 }) : [];
    return {
      ok: true,
      text: formatStatusReply(probes, jobs),
      api_trace: apiTrace,
      probes,
      command_execution: null,
      staged_command: null,
    };
  }

  if (action.type === 'jobs') {
    apiTrace.push({ api: 'GET /api/v1/lifeos/builderos/command-control/jobs' });
    const jobs = pool ? await listCommandControlJobs(pool, { limit: 10 }) : [];
    return {
      ok: true,
      text: formatJobsReply(jobs),
      api_trace: apiTrace,
      command_execution: null,
      staged_command: null,
    };
  }

  if (action.type === 'system_action') {
    const { executeFounderSystemAction, formatFounderSystemActionReply } = await import('./lifeos-founder-system-action.js');
    apiTrace.push({ api: 'lifeos_event_stream INSERT (founder system action)' });
    const result = await executeFounderSystemAction({
      pool,
      userId,
      utterance: content,
      sessionId,
      baseUrl,
      commandKey,
      connectionProbe,
    });
    const text = formatFounderSystemActionReply(
      { lane: 'system_action', confidence: 'high', reason: 'system_action_no_repo' },
      result,
    );
    return {
      ok: result.ok === true,
      text,
      api_trace: apiTrace,
      command_execution: null,
      staged_command: null,
      system_action: result,
    };
  }

  if (action.type === 'unsupported') {
    apiTrace.push({ action: 'unsupported_no_builder_route' });
    const text = [
      'LifeOS DIRECT — BLOCKED (no BuilderOS route)',
      'api_path: lifeos/system/direct',
      '',
      'This utterance is not a repo build (no target_file), not a system read, and not a classified system action.',
      'For repo edits include a path: scripts/foo.mjs, services/bar.js, routes/…',
      'For connection proof without repo edits, ask to create a harmless timestamped receipt/event with no repo edits.',
      'builder_job_created: false',
    ].join('\n');
    return {
      ok: false,
      text,
      api_trace: apiTrace,
      command_execution: null,
      staged_command: null,
    };
  }

  // execute → command-control (same path as terminal POST …/command-control/jobs + execute)
  apiTrace.push({ api: 'POST /api/v1/lifeos/builderos/command-control/jobs + execute' });
  let stagedCommand = null;
  let commandExecution = null;
  if (stageCommand) {
    stagedCommand = await stageCommand({
      userId,
      sessionId,
      utterance: content,
      intent: 'command',
    });
  }
  if (stagedCommand?.id && isVoiceRailCommandExecuteEnabled()) {
    try {
      commandExecution = await executeVoiceRailFounderCommand({
        pool,
        stagedCommandId: stagedCommand.id,
        utterance: content,
        userId,
        logger,
        commandKey,
        baseUrl,
      });
      stagedCommand = {
        ...stagedCommand,
        executed: commandExecution.ok === true,
        command_control_job_id: commandExecution.job_id || null,
        execution_receipt: commandExecution,
      };
    } catch (err) {
      logger?.warn?.({ err: err.message }, 'system-direct command execute failed');
      commandExecution = { ok: false, error: err.message };
    }
  } else if (!isVoiceRailCommandExecuteEnabled()) {
    commandExecution = { ok: false, skipped: true, reason: 'VOICE_RAIL_EXECUTE_COMMANDS disabled' };
  }

  const body = formatCommandSystemReply({
    commandExecution,
    stagedCommand,
    utterance: content,
  });
  const text = [
    'LifeOS DIRECT — BuilderOS command-control (no LLM reply layer)',
    'api_path: POST /api/v1/lifeos/builderos/command-control/jobs → execute',
    '',
    body,
  ].join('\n');

  return {
    ok: commandExecution?.ok === true,
    text,
    api_trace: apiTrace,
    command_execution: commandExecution,
    staged_command: stagedCommand,
  };
}

export function buildSystemDirectReplySource(commandExecution) {
  return {
    path: 'lifeos/system/direct',
    persona: 'SYS',
    department: 'SYS',
    department_title: 'LifeOS Direct API',
    display_name: 'Railway system APIs',
    model_id: 'none',
    provider: 'lifeos',
    note: 'Founder direct line — no council member, no department persona.',
    system_direct: true,
    council_used: false,
    command_execution: commandExecution || null,
  };
}
