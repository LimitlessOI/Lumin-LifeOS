/**
 * BuilderOS governed loop executor bridge — single queued job only.
 * OIL boundary audit → BP/PBB plan → Builder dispatch → OIL verifier → optional one retry.
 *
 * C2 remains intake/status only; this module is explicit runtime glue.
 *
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 */

import { writeFileSync, unlinkSync, existsSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { auditCommandControlJobBoundary } from './builderos-oil-job-audit.js';
import { generatePbbPlanFromOilAudit } from './builderos-pbb-plan.js';
import {
  getCommandControlJob,
  getCommandControlHaltState,
  updateCommandControlJobExecution,
} from './builderos-command-control-service.js';
import { runVerification } from '../scripts/builderos-builder-output-verifier.mjs';
import { emitTSOSHookReading, buildTsosHookPayloadFromGovernedCommit } from './builderos-tsos-hook-service.js';
import { scheduleProofParityAfterGovernedCommit } from './builderos-governed-proof-parity.js';
import { looksLikeBuilderProseRefusal } from './builder-instruction-target.js';
import { verifyGovernedOutcomeBeforePass } from './builder-outcome-verifier.js';

function resolveBaseUrl(explicit) {
  return (
    explicit ||
    process.env.PUBLIC_BASE_URL ||
    process.env.RAILWAY_PUBLIC_DOMAIN ||
    'http://127.0.0.1:3000'
  ).replace(/\/$/, '');
}

function resolveCommandKey(explicit) {
  return explicit || process.env.COMMAND_CENTER_KEY || process.env.LIFEOS_KEY || process.env.API_KEY || '';
}

/** Same-process Railway deploy: loopback avoids edge proxy timeout on nested /build fetch. */
function resolveBuilderDispatchBaseUrl(baseUrl) {
  const normalized = String(baseUrl || '').replace(/\/$/, '');
  const publicBase = String(
    process.env.PUBLIC_BASE_URL || process.env.RAILWAY_PUBLIC_DOMAIN || '',
  ).replace(/\/$/, '');
  const port = process.env.PORT || '3000';
  if (publicBase && normalized === publicBase) {
    return `http://127.0.0.1:${port}`;
  }
  return normalized || `http://127.0.0.1:${port}`;
}

async function dispatchBuilderPlan(plan, { baseUrl, commandKey, task_id, blueprint_id }) {
  const dispatchBase = resolveBuilderDispatchBaseUrl(baseUrl);
  const url = `${dispatchBase}/api/v1/lifeos/builder/build`;
  const body = {
    domain: plan.domain,
    mode: plan.mode || 'code',
    task: plan.task,
    spec: plan.spec,
    target_file: plan.target_file || undefined,
    commit_message: plan.commit_message,
    release_mode: 'SUPERVISED',
    task_id: task_id || plan.task_id || `cc-job-${Date.now()}`,
    blueprint_id: blueprint_id || plan.blueprint_id || undefined,
    ...(Array.isArray(plan.files) && plan.files.length ? { files: plan.files } : {}),
    ...(plan.model ? { model: plan.model } : {}),
    ...(plan.max_output_tokens ? { max_output_tokens: plan.max_output_tokens } : {}),
  };

  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), 90_000);
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-command-key': commandKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(abortTimer);
  }

  let json = null;
  try {
    json = await response.json();
  } catch {
    json = { ok: false, error: 'non_json_builder_response' };
  }

  return {
    ok: response.ok && json?.ok === true,
    http_status: response.status,
    committed: json?.committed === true,
    target_file: json?.target_file || plan.target_file || null,
    commit_sha: json?.commit_sha || json?.sha || null,
    output: json?.output || null,
    model_used: json?.model_used || null,
    error: json?.error || null,
    detail: json?.detail || null,
    raw: json,
  };
}

async function verifyBuilderOutput(targetFile, output) {
  if (output) {
    const tempDir = mkdtempSync(join(tmpdir(), 'builderos-loop-verify-'));
    const tempFile = join(tempDir, targetFile ? targetFile.split('/').pop() : 'builder-output.js');
    try {
      writeFileSync(tempFile, output, 'utf8');
      return runVerification(tempFile);
    } finally {
      if (existsSync(tempFile)) unlinkSync(tempFile);
    }
  }
  if (targetFile && existsSync(targetFile)) {
    return runVerification(targetFile);
  }
  return {
    ok: false,
    first_failure: 'missing_output',
    syntax_error: 'No builder output available for verification',
    gates: { syntax: false, antipattern: false, stub: false, runtime: false },
  };
}

async function tryExecuteFallback(builderResult, plan, { baseUrl, commandKey, jobId }) {
  if (!builderResult.ok || !builderResult.output || builderResult.committed) return builderResult;
  const effectiveTargetFile = builderResult.target_file || plan.target_file;
  if (!effectiveTargetFile) return builderResult;
  if (looksLikeBuilderProseRefusal(builderResult.output, effectiveTargetFile)) {
    return {
      ...builderResult,
      error: 'builder_prose_refusal',
      execute_fallback_attempted: false,
    };
  }
  const url = `${baseUrl}/api/v1/lifeos/builder/execute`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-command-key': commandKey },
    body: JSON.stringify({
      output: builderResult.output,
      target_file: effectiveTargetFile,
      commit_message: plan.commit_message || `[system-build] cc-${jobId}`,
    }),
  });
  let json = null;
  try {
    json = await response.json();
  } catch {
    json = { ok: false, error: 'non_json_execute_response' };
  }
  if (response.ok && json?.ok && json?.committed) {
    return {
      ...builderResult,
      committed: true,
      target_file: json.target_file || effectiveTargetFile,
      commit_sha: json?.commit_sha || json?.sha || builderResult.commit_sha || null,
      execute_fallback_used: true,
    };
  }
  return { ...builderResult, execute_fallback_attempted: true, execute_fallback_error: json?.error || `http_${response.status}` };
}

function resolveBuilderDispatchBlocker(builderResult, plan) {
  const raw = builderResult.raw || {};
  const targetFile = plan.target_file || builderResult.target_file;
  if (looksLikeBuilderProseRefusal(builderResult.output, targetFile)) {
    return 'builder_prose_refusal';
  }
  if (!builderResult.committed && !targetFile) {
    return 'builder_missing_target_file';
  }
  return (
    builderResult.execute_fallback_error
    || builderResult.error
    || raw.error
    || raw.note
    || 'BUILDER_DISPATCH_FAILED'
  );
}

export async function executeCommandControlJob(pool, jobId, options = {}) {
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const commandKey = resolveCommandKey(options.commandKey);
  if (!commandKey) {
    return { ok: false, error: 'command_key_missing', stage: 'preflight' };
  }

  if (options.controlPlaneHealthCheck !== false && options.fetchControlPlaneHealth) {
    try {
      const cpHealth = await options.fetchControlPlaneHealth({ baseUrl, commandKey });
      if (cpHealth?.status === 'RED' && !options.allow_red_health) {
        return {
          ok: false,
          error: 'control_plane_health_red',
          stage: 'preflight',
          health: cpHealth,
        };
      }
    } catch (healthErr) {
      if (options.strict_health) {
        return { ok: false, error: 'control_plane_health_check_failed', stage: 'preflight', detail: healthErr.message };
      }
    }
  }

  const job = await getCommandControlJob(pool, jobId);
  if (!job) return { ok: false, error: 'job_not_found', stage: 'preflight' };
  if (job.status !== 'queued') {
    return { ok: false, error: 'job_not_executable', stage: 'preflight', job_status: job.status };
  }

  const haltState = await getCommandControlHaltState(pool);
  const claimed = await updateCommandControlJobExecution(pool, jobId, {
    status: 'running',
    blocker: null,
    receipt: { stage: 'claimed', status: 'running', at: new Date().toISOString() },
  });
  if (!claimed) {
    return { ok: false, error: 'claim_failed', stage: 'preflight' };
  }

  // Guard: if anything throws after claiming running, mark job failed so it never zombies.
  try {

  const trace = {
    job_id: jobId,
    oil_finding: null,
    pbb_plan: null,
    builder_task_sent: null,
    builder_output: null,
    oil_audit_result: null,
    outcome_verification: null,
    repair_loop_result: null,
  };

  const oilFinding = auditCommandControlJobBoundary(job, haltState);
  trace.oil_finding = oilFinding;
  await updateCommandControlJobExecution(pool, jobId, {
    receipt: { stage: 'oil_boundary_audit', ...oilFinding },
  });

  if (!oilFinding.ok) {
    await updateCommandControlJobExecution(pool, jobId, {
      status: 'blocked',
      blocker: oilFinding.findings[0]?.code || 'OIL_BOUNDARY_FAIL',
      result_json: { oil_finding: oilFinding },
    });
    return { ok: false, error: 'oil_boundary_failed', stage: 'oil_audit', trace };
  }

  let plan = generatePbbPlanFromOilAudit(job, oilFinding, { repairAttempt: 0 });
  trace.pbb_plan = plan;
  await updateCommandControlJobExecution(pool, jobId, {
    receipt: { stage: 'pbb_plan', plan_id: plan.plan_id, repair_attempt: 0 },
  });

  if (!plan.ok) {
    await updateCommandControlJobExecution(pool, jobId, {
      status: 'failed',
      blocker: 'PBB_PLAN_FAILED',
      result_json: { pbb_plan: plan },
    });
    return { ok: false, error: 'pbb_plan_failed', stage: 'pbb_plan', trace };
  }

  trace.builder_task_sent = {
    url: `${baseUrl}/api/v1/lifeos/builder/build`,
    task: plan.task,
    target_file: plan.target_file,
    domain: plan.domain,
    repair_attempt: 0,
  };

  let builderResult = await dispatchBuilderPlan(plan, {
    baseUrl,
    commandKey,
    task_id: `cc-${jobId}`,
    blueprint_id: job.blueprint_id || plan.blueprint_id,
  });
  trace.builder_output = {
    committed: builderResult.committed,
    target_file: builderResult.target_file,
    commit_sha: builderResult.commit_sha || builderResult.raw?.commit_sha || null,
    model_used: builderResult.model_used,
    http_status: builderResult.http_status,
    error: builderResult.error,
    output_bytes: builderResult.output ? builderResult.output.length : 0,
    task_id: `cc-${jobId}`,
    kernel_receipts: builderResult.raw?.kernel_receipts || null,
  };
  await updateCommandControlJobExecution(pool, jobId, {
    receipt: { stage: 'builder_dispatch', repair_attempt: 0, ...trace.builder_output },
  });

  if (builderResult.ok && !builderResult.committed && builderResult.output) {
    builderResult = await tryExecuteFallback(builderResult, plan, { baseUrl, commandKey, jobId });
    trace.builder_output = {
      ...trace.builder_output,
      execute_fallback_attempted: builderResult.execute_fallback_attempted || false,
      execute_fallback_used: builderResult.execute_fallback_used || false,
      execute_fallback_error: builderResult.execute_fallback_error || null,
    };
    if (builderResult.execute_fallback_attempted || builderResult.execute_fallback_used) {
      await updateCommandControlJobExecution(pool, jobId, {
        receipt: { stage: 'execute_fallback', repair_attempt: 0, ok: builderResult.committed, target_file: builderResult.target_file || null },
      });
    }
  }

  if (!builderResult.ok || !builderResult.committed) {
    const blocker = resolveBuilderDispatchBlocker(builderResult, plan);
    await updateCommandControlJobExecution(pool, jobId, {
      status: 'failed',
      blocker,
      result_json: { builder_output: trace.builder_output, builder_raw: builderResult.raw },
    });
    return { ok: false, error: 'builder_failed', stage: 'builder_dispatch', trace, blocker };
  }

  let verifierResult = await verifyBuilderOutput(builderResult.target_file, builderResult.output);
  trace.oil_audit_result = verifierResult;
  await updateCommandControlJobExecution(pool, jobId, {
    receipt: { stage: 'oil_verifier', repair_attempt: 0, ok: verifierResult.ok, first_failure: verifierResult.first_failure || null },
  });

  if (verifierResult.ok) {
    const outcomeVerification = await verifyGovernedOutcomeBeforePass({
      job,
      trace,
      verifierResult,
    });
    trace.outcome_verification = outcomeVerification;
    await updateCommandControlJobExecution(pool, jobId, {
      receipt: {
        stage: 'outcome_verifier',
        repair_attempt: 0,
        ok: outcomeVerification.ok === true,
        code: outcomeVerification.code || null,
        reason: outcomeVerification.reason || null,
      },
    });
    if (!outcomeVerification.ok) {
      await updateCommandControlJobExecution(pool, jobId, {
        status: 'failed',
        blocker: 'FAIL_WRONG_OUTCOME',
        result_json: {
          oil_finding: oilFinding,
          pbb_plan: plan,
          builder_output: trace.builder_output,
          oil_audit_result: verifierResult,
          outcome_verification: outcomeVerification,
        },
      });
      return { ok: false, error: 'wrong_outcome', stage: 'outcome_verifier', trace, blocker: 'FAIL_WRONG_OUTCOME' };
    }
    await updateCommandControlJobExecution(pool, jobId, {
      status: 'committed',
      blocker: null,
      result_json: {
        oil_finding: oilFinding,
        pbb_plan: plan,
        builder_output: trace.builder_output,
        oil_audit_result: verifierResult,
        outcome_verification: outcomeVerification,
      },
    });
    trace.repair_loop_result = { attempted: false, reason: 'verifier_pass_first_attempt' };
    await emitTSOSHookReading(pool, buildTsosHookPayloadFromGovernedCommit({
      jobId,
      job,
      plan,
      builderResult,
      verifierResult,
      repairAttempts: 0,
    }));
    scheduleProofParityAfterGovernedCommit(pool, { jobId, triggeredBy: `governed-loop-${jobId}` });
    return { ok: true, status: 'committed', trace };
  }

  await updateCommandControlJobExecution(pool, jobId, {
    status: 'retrying',
    blocker: verifierResult.first_failure || 'VERIFIER_FAILED',
    receipt: { stage: 'repair_loop_start', first_failure: verifierResult.first_failure || null },
  });

  plan = generatePbbPlanFromOilAudit(job, oilFinding, {
    repairAttempt: 1,
    verifierResult,
  });
  trace.repair_loop_result = {
    attempted: true,
    repair_attempt: 1,
    replan_id: plan.plan_id,
  };

  trace.builder_task_sent = {
    url: `${baseUrl}/api/v1/lifeos/builder/build`,
    task: plan.task,
    target_file: plan.target_file,
    domain: plan.domain,
    repair_attempt: 1,
  };

  builderResult = await dispatchBuilderPlan(plan, {
    baseUrl,
    commandKey,
    task_id: `cc-${jobId}-retry`,
    blueprint_id: job.blueprint_id || plan.blueprint_id,
  });
  trace.builder_output = {
    committed: builderResult.committed,
    target_file: builderResult.target_file,
    commit_sha: builderResult.commit_sha || builderResult.raw?.commit_sha || null,
    model_used: builderResult.model_used,
    http_status: builderResult.http_status,
    error: builderResult.error,
    output_bytes: builderResult.output ? builderResult.output.length : 0,
    repair_attempt: 1,
    task_id: `cc-${jobId}-retry`,
    kernel_receipts: builderResult.raw?.kernel_receipts || null,
  };
  await updateCommandControlJobExecution(pool, jobId, {
    receipt: { stage: 'builder_dispatch', repair_attempt: 1, ...trace.builder_output },
  });

  if (builderResult.ok && !builderResult.committed && builderResult.output) {
    builderResult = await tryExecuteFallback(builderResult, plan, { baseUrl, commandKey, jobId });
    trace.builder_output = {
      ...trace.builder_output,
      execute_fallback_attempted: builderResult.execute_fallback_attempted || false,
      execute_fallback_used: builderResult.execute_fallback_used || false,
      execute_fallback_error: builderResult.execute_fallback_error || null,
    };
    if (builderResult.execute_fallback_attempted || builderResult.execute_fallback_used) {
      await updateCommandControlJobExecution(pool, jobId, {
        receipt: { stage: 'execute_fallback', repair_attempt: 1, ok: builderResult.committed, target_file: builderResult.target_file || null },
      });
    }
  }

  if (!builderResult.ok || !builderResult.committed) {
    const blocker = resolveBuilderDispatchBlocker(builderResult, plan) || 'BUILDER_RETRY_FAILED';
    await updateCommandControlJobExecution(pool, jobId, {
      status: 'failed',
      blocker,
      result_json: { repair_loop_result: trace.repair_loop_result, builder_output: trace.builder_output },
    });
    trace.repair_loop_result.result = 'builder_retry_failed';
    return { ok: false, error: 'builder_retry_failed', stage: 'builder_retry', trace, blocker };
  }

  const retryVerifier = await verifyBuilderOutput(builderResult.target_file, builderResult.output);
  trace.oil_audit_result = retryVerifier;
  await updateCommandControlJobExecution(pool, jobId, {
    receipt: { stage: 'oil_verifier', repair_attempt: 1, ok: retryVerifier.ok, first_failure: retryVerifier.first_failure || null },
  });

  if (retryVerifier.ok) {
    const retryOutcomeVerification = await verifyGovernedOutcomeBeforePass({
      job,
      trace,
      verifierResult: retryVerifier,
    });
    trace.outcome_verification = retryOutcomeVerification;
    await updateCommandControlJobExecution(pool, jobId, {
      receipt: {
        stage: 'outcome_verifier',
        repair_attempt: 1,
        ok: retryOutcomeVerification.ok === true,
        code: retryOutcomeVerification.code || null,
        reason: retryOutcomeVerification.reason || null,
      },
    });
    if (!retryOutcomeVerification.ok) {
      await updateCommandControlJobExecution(pool, jobId, {
        status: 'failed',
        blocker: 'FAIL_WRONG_OUTCOME',
        result_json: {
          oil_finding: oilFinding,
          pbb_plan: plan,
          builder_output: trace.builder_output,
          oil_audit_result: retryVerifier,
          repair_loop_result: trace.repair_loop_result,
          outcome_verification: retryOutcomeVerification,
        },
      });
      trace.repair_loop_result.result = 'wrong_outcome_after_retry';
      return { ok: false, error: 'wrong_outcome', stage: 'outcome_verifier', trace, blocker: 'FAIL_WRONG_OUTCOME' };
    }
    await updateCommandControlJobExecution(pool, jobId, {
      status: 'committed',
      blocker: null,
      result_json: {
        oil_finding: oilFinding,
        pbb_plan: plan,
        builder_output: trace.builder_output,
        oil_audit_result: retryVerifier,
        repair_loop_result: trace.repair_loop_result,
        outcome_verification: retryOutcomeVerification,
      },
    });
    trace.repair_loop_result.result = 'verifier_pass_after_retry';
    await emitTSOSHookReading(pool, buildTsosHookPayloadFromGovernedCommit({
      jobId,
      job,
      plan,
      builderResult,
      verifierResult: retryVerifier,
      repairAttempts: 1,
    }));
    scheduleProofParityAfterGovernedCommit(pool, { jobId, triggeredBy: `governed-loop-${jobId}` });
    return { ok: true, status: 'committed', trace };
  }

  await updateCommandControlJobExecution(pool, jobId, {
    status: 'verifier_failed',
    blocker: retryVerifier.first_failure || 'VERIFIER_FAILED',
    result_json: {
      oil_finding: oilFinding,
      pbb_plan: plan,
      builder_output: trace.builder_output,
      oil_audit_result: retryVerifier,
      repair_loop_result: trace.repair_loop_result,
    },
  });
    trace.repair_loop_result.result = 'verifier_failed_after_retry';
    return { ok: false, error: 'verifier_failed', stage: 'oil_verifier', trace };
  } catch (unexpectedErr) {
    // Ensure job never stays zombied in 'running' on unexpected throws (e.g. redeploy mid-fetch).
    try {
      const currentJob = await getCommandControlJob(pool, jobId);
      if (currentJob?.status === 'running') {
        await updateCommandControlJobExecution(pool, jobId, {
          status: 'failed',
          blocker: `UNEXPECTED_ERROR: ${unexpectedErr?.message || 'unknown'}`,
          result_json: { unexpected_error: unexpectedErr?.message, stack: unexpectedErr?.stack?.slice(0, 500) },
        });
      }
    } catch {
      // best-effort — DB may be unavailable during redeploy
    }
    return { ok: false, error: 'unexpected_error', stage: 'execution', detail: unexpectedErr?.message };
  }
}
