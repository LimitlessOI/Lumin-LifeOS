/**
 * SYNOPSIS: Voice Rail — founder commands → BuilderOS command-control → builder receipt.
 * Voice Rail — founder commands → BuilderOS command-control → builder receipt.
 * @ssot docs/products/lifeos/PRODUCT_HOME.md
 */
import { createCommandControlJob, getCommandControlJob } from './builderos-command-control-service.js';
import { executeCommandControlJob } from './builderos-governed-loop-executor.js';
import {
  extractTargetFileFromInstruction,
  inferBuilderDomainForTargetFile,
} from './builder-instruction-target.js';
import {
  detectSystemActionIntent,
  isRepoBuildCommand,
} from './lifeos-founder-command-class.js';
import { detectProviderProofIntent } from './founder-provider-tool-action.js';
import { detectSystemAgentQuestion } from './lifeos-system-agent.js';
import { isVoiceRailCommandExecuteEnabled } from './voice-rail-execute-flag.js';

const DEFAULT_SYNC_MS = 90_000;

export { isVoiceRailCommandExecuteEnabled };

/** Parse repo-relative path from founder "please build … scripts/foo.mjs …" utterances. */
export {
  extractTargetFileFromInstruction,
  extractTargetFileFromInstruction as extractTargetFileFromFounderUtterance,
} from './builder-instruction-target.js';
export { inferBuilderDomainForTargetFile } from './builder-instruction-target.js';

function extractCommitSha(trace) {
  const raw = trace?.builder_output?.raw || trace?.builder_output || {};
  return (
    trace?.builder_output?.commit_sha
    || raw.commit_sha
    || raw.commitSha
    || raw.sha
    || null
  );
}

function extractTargetFile(trace, job) {
  return (
    trace?.builder_output?.target_file
    || trace?.pbb_plan?.target_file
    || job?.metadata_json?.target_file
    || null
  );
}

function extractBuilderFailureDetail(trace, job) {
  const bo = trace?.builder_output || job?.result_json?.builder_output || {};
  const raw = job?.result_json?.builder_raw || trace?.builder_output?.raw || {};
  return {
    blocker: job?.blocker || null,
    builder_error: bo.error || raw.error || raw.detail?.reason || null,
    builder_http_status: bo.http_status ?? raw.http_status ?? null,
    execute_fallback_error: bo.execute_fallback_error || null,
    stage: trace?.stage || null,
  };
}

const TARGET_FILE_HINT_PREFIXES =
  'scripts/, services/, routes/, public/, config/, db/migrations/, builderos-reboot/';

/**
 * Founder work utterances → BuilderOS command-control (same path as terminal/API).
 * Conversation mode still uses council for Q&A; build/route/fix requests skip department chat.
 */
export function shouldRouteFounderToSystem({ mode, intent, content, department } = {}) {
  const text = String(content || '').trim();
  if (!text) return false;

  if (detectProviderProofIntent(text)) return false;
  if (detectSystemActionIntent(text)) return false;
  if (detectSystemAgentQuestion(text)) return false;

  const targetFile = extractTargetFileFromInstruction(text);
  const t = text.toLowerCase();

  if (mode === 'command' || intent === 'command') {
    return isRepoBuildCommand(text, { explicitMode: mode === 'command' ? 'command' : 'lifeos' });
  }

  if (
    /\b(send (this )?to|route (this )?to|forward to|hand (this )?off to|escalate (this )?to)\b/.test(t)
    && /\b(bpb|blueprint|cdr|builderos|builder|code execution|command.control)\b/.test(t)
  ) {
    return true;
  }
  if (targetFile && /\b(take a look at|fix the|update the|change the|patch the|implement|make the system)\b/.test(t)) {
    return true;
  }
  if (/\b(please build|please fix|please run|deploy this|execute this|run builder)\b/.test(t) && targetFile) {
    return true;
  }
  if (
    /\b(build|run|execute|complete)\b.*\bnext\b.*\b(bp|blueprint|lifeos)\b/.test(t)
    || /\bnext\b.*\b(lifeos\s+)?(bp|blueprint)\b.*\bstep\b/.test(t)
  ) {
    return true;
  }
  const dept = String(department || '').toUpperCase();
  if (dept === 'CDR' && targetFile && /\b(build|fix|patch|implement|execute|deploy)\b/.test(t)) {
    return true;
  }
  if (dept === 'BPB' && /\b(blueprint|translate|turn this into|spec for)\b/.test(t)) {
    return true;
  }
  return false;
}

/**
 * Deterministic founder-command reply — no council chat layer.
 * Shown in LifeOS app when command mode routes straight to command-control.
 */
export function formatCommandSystemReply({ commandExecution, stagedCommand, utterance } = {}) {
  const ce = commandExecution || {};
  const stagedId = stagedCommand?.id || ce.staged_command_id || null;

  if (!commandExecution && !isVoiceRailCommandExecuteEnabled()) {
    return [
      'LifeOS SYSTEM — command staged only (execution disabled on server).',
      `Set VOICE_RAIL_EXECUTE_COMMANDS=1 on Railway to run builder from the app.`,
      stagedId ? `staged_command_id: ${stagedId}` : '',
    ].filter(Boolean).join('\n');
  }

  if (ce.skipped) {
    return [
      'LifeOS SYSTEM — command staged only (execution disabled).',
      `Set VOICE_RAIL_EXECUTE_COMMANDS=1 on Railway to run builder jobs from the app.`,
      stagedId ? `staged_command_id: ${stagedId}` : '',
    ].filter(Boolean).join('\n');
  }

  if (ce.ok) {
    return [
      'LifeOS SYSTEM — BuilderOS command-control completed.',
      `job_id: ${ce.job_id || '—'}`,
      `target_file: ${ce.target_file || '—'}`,
      `commit_sha: ${ce.commit_sha || '—'}`,
      ce.poll_url ? `poll: ${ce.poll_url}` : '',
    ].filter(Boolean).join('\n');
  }

  const lines = [
    'LifeOS SYSTEM — routed to BuilderOS command-control (not department chat).',
    `job_id: ${ce.job_id || '—'}`,
    `status: ${ce.job_status || ce.stage || 'failed'}`,
    `root_cause: ${ce.root_cause || ce.error || 'unknown'}`,
  ];

  const root = String(ce.root_cause || ce.error || '').toLowerCase();
  if (root.includes('missing_target_file') || root.includes('insufficient_instruction')) {
    lines.push('');
    lines.push('Include a repo file path in your command, for example:');
    lines.push('  "Add a one-line comment to scripts/my-audit.mjs — do not change anything else."');
    lines.push(`Supported prefixes: ${TARGET_FILE_HINT_PREFIXES}`);
  }
  if (ce.timed_out) {
    lines.push('');
    lines.push(`Still running — poll ${ce.poll_url || 'command-control job API'} for commit_sha.`);
  }
  if (ce.builder_http_status) {
    lines.push(`builder_http_status: ${ce.builder_http_status}`);
  }
  if (utterance && !extractTargetFileFromInstruction(String(utterance))) {
    lines.push('');
    lines.push('No target_file was detected in your message — the builder requires an explicit path.');
  }
  return lines.join('\n');
}

export function summarizeVoiceRailCommandExecution(job, execResult = {}) {
  const trace = execResult.trace || {};
  const failure = extractBuilderFailureDetail(trace, job);
  const rootCause =
    failure.blocker
    || failure.builder_error
    || failure.execute_fallback_error
    || execResult.error
    || null;

  return {
    ok: execResult.ok === true,
    job_id: job?.id || null,
    job_status: job?.status || execResult.status || null,
    stage: execResult.stage || failure.stage || null,
    error: execResult.error || job?.blocker || null,
    root_cause: rootCause,
    builder_http_status: failure.builder_http_status,
    builder_error: failure.builder_error,
    commit_sha: extractCommitSha(trace),
    target_file: extractTargetFile(trace, job),
    timed_out: Boolean(execResult.timed_out),
    poll_url: job?.id ? `/api/v1/lifeos/builderos/command-control/jobs/${job.id}` : null,
    executed_at: new Date().toISOString(),
  };
}

async function persistStagedExecution(pool, stagedId, { executed, status, jobId, receipt }) {
  await pool.query(
    `UPDATE voice_rail_staged_commands
        SET executed = $2,
            status = $3,
            command_control_job_id = COALESCE($4, command_control_job_id),
            execution_receipt = COALESCE(execution_receipt, '{}'::jsonb) || $5::jsonb
      WHERE id = $1`,
    [stagedId, executed, status, jobId || null, JSON.stringify(receipt || {})],
  );
}

/**
 * Queue + run founder command through governed command-control loop.
 * Waits up to syncWaitMs; continues in background on timeout.
 */
export async function executeVoiceRailFounderCommand({
  pool,
  stagedCommandId,
  utterance,
  userId,
  logger,
  baseUrl,
  commandKey,
  syncWaitMs = DEFAULT_SYNC_MS,
}) {
  if (!isVoiceRailCommandExecuteEnabled()) {
    return {
      ok: false,
      skipped: true,
      reason: 'VOICE_RAIL_EXECUTE_COMMANDS disabled',
    };
  }

  const instruction = String(utterance || '').trim();
  const targetFile = extractTargetFileFromInstruction(instruction);
  const domain = inferBuilderDomainForTargetFile(targetFile);

  const job = await createCommandControlJob(pool, {
    instruction,
    requested_by: 'voice_rail_founder_command',
    metadata_json: {
      source: 'voice_rail',
      staged_command_id: stagedCommandId,
      user_id: userId,
      domain,
      ...(targetFile ? { target_file: targetFile } : {}),
    },
  });

  if (job.status !== 'queued') {
    const receipt = summarizeVoiceRailCommandExecution(job, {
      ok: false,
      error: job.blocker,
      status: job.status,
    });
    await persistStagedExecution(pool, stagedCommandId, {
      executed: false,
      status: job.status,
      jobId: job.id,
      receipt,
    });
    return receipt;
  }

  await persistStagedExecution(pool, stagedCommandId, {
    executed: false,
    status: 'running',
    jobId: job.id,
    receipt: { queued: true, job_id: job.id, target_file: targetFile, domain },
  });

  const execPromise = executeCommandControlJob(pool, job.id, { baseUrl, commandKey });
  let timedOut = false;
  const execResult = await Promise.race([
    execPromise,
    new Promise((resolve) => {
      setTimeout(() => {
        timedOut = true;
        resolve({ timed_out: true });
      }, Math.max(Number(syncWaitMs) || DEFAULT_SYNC_MS, 5000));
    }),
  ]);

  async function finalizeReceipt(finalExec) {
    let refreshed = job;
    try {
      refreshed = (await getCommandControlJob(pool, job.id)) || job;
    } catch (e) {
      logger?.warn?.({ err: e.message, job_id: job.id }, 'voice-rail job refresh failed');
    }
    return summarizeVoiceRailCommandExecution(refreshed, finalExec);
  }

  if (timedOut) {
    execPromise
      .then(async (final) => {
        const refreshed = await pool.query(
          `SELECT id FROM builderos_command_control_jobs WHERE id = $1`,
          [job.id],
        );
        if (!refreshed.rows[0]) return;
        const receipt = await finalizeReceipt(final);
        await persistStagedExecution(pool, stagedCommandId, {
          executed: final.ok === true,
          status: final.ok ? 'executed' : 'failed',
          jobId: job.id,
          receipt,
        });
      })
      .catch((err) => {
        logger?.warn?.({ err: err.message, job_id: job.id }, 'voice-rail background command execute failed');
      });

    const receipt = await finalizeReceipt({
      timed_out: true,
      status: 'running',
    });
    receipt.note = 'Execute still running — poll poll_url for commit_sha';
    return receipt;
  }

  const receipt = await finalizeReceipt(execResult);
  await persistStagedExecution(pool, stagedCommandId, {
    executed: execResult.ok === true,
    status: execResult.ok ? 'executed' : 'failed',
    jobId: job.id,
    receipt,
  });
  return receipt;
}
