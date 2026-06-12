/**
 * Voice Rail — founder commands → BuilderOS command-control → builder receipt.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import { createCommandControlJob, getCommandControlJob } from './builderos-command-control-service.js';
import { executeCommandControlJob } from './builderos-governed-loop-executor.js';
import {
  extractTargetFileFromInstruction,
  inferBuilderDomainForTargetFile,
} from './builder-instruction-target.js';

const DEFAULT_SYNC_MS = 90_000;

export function isVoiceRailCommandExecuteEnabled() {
  const v = String(process.env.VOICE_RAIL_EXECUTE_COMMANDS ?? '1').trim().toLowerCase();
  return v !== '0' && v !== 'false' && v !== 'off';
}

/** Parse repo-relative path from founder "please build … scripts/foo.mjs …" utterances. */
export { extractTargetFileFromInstruction as extractTargetFileFromFounderUtterance } from './builder-instruction-target.js';
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
