/**
 * Voice Rail — founder commands → BuilderOS command-control → builder receipt.
 * @ssot docs/projects/AMENDMENT_21_LIFEOS_CORE.md
 */
import { createCommandControlJob } from './builderos-command-control-service.js';
import { executeCommandControlJob } from './builderos-governed-loop-executor.js';

const DEFAULT_SYNC_MS = 90_000;

export function isVoiceRailCommandExecuteEnabled() {
  const v = String(process.env.VOICE_RAIL_EXECUTE_COMMANDS ?? '1').trim().toLowerCase();
  return v !== '0' && v !== 'false' && v !== 'off';
}

function extractCommitSha(trace) {
  const raw = trace?.builder_output?.raw || trace?.builder_output || {};
  return raw.commit_sha || raw.commitSha || raw.sha || null;
}

function extractTargetFile(trace) {
  return trace?.builder_output?.target_file || trace?.pbb_plan?.target_file || null;
}

export function summarizeVoiceRailCommandExecution(job, execResult = {}) {
  const trace = execResult.trace || {};
  return {
    ok: execResult.ok === true,
    job_id: job?.id || null,
    job_status: execResult.status || job?.status || null,
    stage: execResult.stage || null,
    error: execResult.error || job?.blocker || null,
    commit_sha: extractCommitSha(trace),
    target_file: extractTargetFile(trace),
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
  const job = await createCommandControlJob(pool, {
    instruction,
    requested_by: 'voice_rail_founder_command',
    metadata_json: {
      source: 'voice_rail',
      staged_command_id: stagedCommandId,
      user_id: userId,
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
    receipt: { queued: true, job_id: job.id },
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

  if (timedOut) {
    execPromise
      .then(async (final) => {
        const refreshed = await pool.query(
          `SELECT id FROM builderos_command_control_jobs WHERE id = $1`,
          [job.id],
        );
        if (!refreshed.rows[0]) return;
        const receipt = summarizeVoiceRailCommandExecution(job, final);
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

    const receipt = summarizeVoiceRailCommandExecution(job, {
      timed_out: true,
      status: 'running',
    });
    receipt.note = 'Execute still running — poll poll_url for commit_sha';
    return receipt;
  }

  const receipt = summarizeVoiceRailCommandExecution(job, execResult);
  await persistStagedExecution(pool, stagedCommandId, {
    executed: execResult.ok === true,
    status: execResult.ok ? 'executed' : 'failed',
    jobId: job.id,
    receipt,
  });
  return receipt;
}
