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

async function dispatchBuilderPlan(plan, { baseUrl, commandKey }) {
  const url = `${baseUrl}/api/v1/lifeos/builder/build`;
  const body = {
    domain: plan.domain,
    mode: plan.mode || 'code',
    task: plan.task,
    spec: plan.spec,
    target_file: plan.target_file || undefined,
    commit_message: plan.commit_message,
    release_mode: 'supervised',
    ...(Array.isArray(plan.files) && plan.files.length ? { files: plan.files } : {}),
    ...(plan.model ? { model: plan.model } : {}),
    ...(plan.max_output_tokens ? { max_output_tokens: plan.max_output_tokens } : {}),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-command-key': commandKey,
    },
    body: JSON.stringify(body),
  });

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

export async function executeCommandControlJob(pool, jobId, options = {}) {
  const baseUrl = resolveBaseUrl(options.baseUrl);
  const commandKey = resolveCommandKey(options.commandKey);
  if (!commandKey) {
    return { ok: false, error: 'command_key_missing', stage: 'preflight' };
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

  const trace = {
    job_id: jobId,
    oil_finding: null,
    pbb_plan: null,
    builder_task_sent: null,
    builder_output: null,
    oil_audit_result: null,
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

  let builderResult = await dispatchBuilderPlan(plan, { baseUrl, commandKey });
  trace.builder_output = {
    committed: builderResult.committed,
    target_file: builderResult.target_file,
    model_used: builderResult.model_used,
    http_status: builderResult.http_status,
    error: builderResult.error,
    output_bytes: builderResult.output ? builderResult.output.length : 0,
  };
  await updateCommandControlJobExecution(pool, jobId, {
    receipt: { stage: 'builder_dispatch', repair_attempt: 0, ...trace.builder_output },
  });

  if (!builderResult.ok || !builderResult.committed) {
    await updateCommandControlJobExecution(pool, jobId, {
      status: 'failed',
      blocker: builderResult.error || 'BUILDER_DISPATCH_FAILED',
      result_json: { builder_output: trace.builder_output, builder_raw: builderResult.raw },
    });
    return { ok: false, error: 'builder_failed', stage: 'builder_dispatch', trace };
  }

  let verifierResult = await verifyBuilderOutput(builderResult.target_file, builderResult.output);
  trace.oil_audit_result = verifierResult;
  await updateCommandControlJobExecution(pool, jobId, {
    receipt: { stage: 'oil_verifier', repair_attempt: 0, ok: verifierResult.ok, first_failure: verifierResult.first_failure || null },
  });

  if (verifierResult.ok) {
    await updateCommandControlJobExecution(pool, jobId, {
      status: 'committed',
      blocker: null,
      result_json: {
        oil_finding: oilFinding,
        pbb_plan: plan,
        builder_output: trace.builder_output,
        oil_audit_result: verifierResult,
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

  builderResult = await dispatchBuilderPlan(plan, { baseUrl, commandKey });
  trace.builder_output = {
    committed: builderResult.committed,
    target_file: builderResult.target_file,
    model_used: builderResult.model_used,
    http_status: builderResult.http_status,
    error: builderResult.error,
    output_bytes: builderResult.output ? builderResult.output.length : 0,
    repair_attempt: 1,
  };
  await updateCommandControlJobExecution(pool, jobId, {
    receipt: { stage: 'builder_dispatch', repair_attempt: 1, ...trace.builder_output },
  });

  if (!builderResult.ok || !builderResult.committed) {
    await updateCommandControlJobExecution(pool, jobId, {
      status: 'failed',
      blocker: builderResult.error || 'BUILDER_RETRY_FAILED',
      result_json: { repair_loop_result: trace.repair_loop_result, builder_output: trace.builder_output },
    });
    trace.repair_loop_result.result = 'builder_retry_failed';
    return { ok: false, error: 'builder_retry_failed', stage: 'builder_retry', trace };
  }

  const retryVerifier = await verifyBuilderOutput(builderResult.target_file, builderResult.output);
  trace.oil_audit_result = retryVerifier;
  await updateCommandControlJobExecution(pool, jobId, {
    receipt: { stage: 'oil_verifier', repair_attempt: 1, ok: retryVerifier.ok, first_failure: retryVerifier.first_failure || null },
  });

  if (retryVerifier.ok) {
    await updateCommandControlJobExecution(pool, jobId, {
      status: 'committed',
      blocker: null,
      result_json: {
        oil_finding: oilFinding,
        pbb_plan: plan,
        builder_output: trace.builder_output,
        oil_audit_result: retryVerifier,
        repair_loop_result: trace.repair_loop_result,
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
}
