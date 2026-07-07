/**
 * SYNOPSIS: Exports resolveRepoPath — factory-staging/factory-core/builder/run-step.js.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getSandboxBoundary } from './sandbox.js';
import { buildBlockedReturn } from './blocked-return.js';
import { verifyStepContract } from '../sentry/verify-step-contract.js';
import { verifyStepResult, buildSentryReview } from '../sentry/verify-step-result.js';
import { appendSentryReview } from '../sentry/proof-freshness.js';
import { appendStepMetrics } from '../tsos/record-step-metrics.js';
import { evaluateEfficiency } from '../tsos/evaluate-efficiency.js';
import { appendStepExecutionRecord } from '../historian/append-record.js';
import { runBpbIntakeGate } from '../bpb/intake-gate.js';
import { runBehaviorAssertions } from '../sentry/behavior-assertions.js';
import { REPO_ROOT, FACTORY_ROOT, resolveRepoPath } from '../repo-paths.js';

export { REPO_ROOT, FACTORY_ROOT, resolveRepoPath };

function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export function pathMatchesSandbox(relativePath, sandboxBoundary) {
  const normalized = relativePath.replace(/\\/g, '/');
  const boundary = sandboxBoundary.replace(/\\/g, '/').replace(/\/\*\*$/, '');
  return normalized === boundary || normalized.startsWith(`${boundary}/`);
}

function resolveStepContent(step) {
  const inputs = step.exact_inputs || {};
  if (inputs.exact_content != null) {
    return { mode: 'greenfield', content: Buffer.from(String(inputs.exact_content), 'utf8') };
  }
  if (inputs.content_source_path) {
    const source = resolveRepoPath(inputs.content_source_path);
    if (!fs.existsSync(source)) return { error: 'missing_source', path: inputs.content_source_path };
    return { mode: 'copy', content: fs.readFileSync(source) };
  }
  return { error: 'missing_input' };
}

export function runWriteFileExact({ mission_id, blueprint_id, step }) {
  if (step.action_type !== 'write_file_exact') {
    return buildBlockedReturn({
      mission_id,
      blueprint_id,
      step_id: step.step_id,
      gap_type: 'step_not_deterministic',
      summary: `Unsupported action_type: ${step.action_type}`,
      attempted_action: 'runWriteFileExact',
      missing_information: [],
      evidence: { action_type: step.action_type },
    });
  }

  if (!step.sandbox_boundary || !pathMatchesSandbox(step.target_file, step.sandbox_boundary)) {
    return buildBlockedReturn({
      mission_id,
      blueprint_id,
      step_id: step.step_id,
      gap_type: 'authority_violation',
      summary: `Target ${step.target_file} outside sandbox ${step.sandbox_boundary}`,
      attempted_action: 'runWriteFileExact',
      missing_information: [],
      evidence: { target_file: step.target_file, sandbox_boundary: step.sandbox_boundary },
    });
  }

  const resolved = resolveStepContent(step);
  if (resolved.error === 'missing_input') {
    return buildBlockedReturn({
      mission_id,
      blueprint_id,
      step_id: step.step_id,
      gap_type: 'missing_requirement',
      summary: 'write_file_exact requires content_source_path or exact_content',
      attempted_action: 'runWriteFileExact',
      missing_information: ['exact_inputs.content_source_path', 'exact_inputs.exact_content'],
      evidence: {},
    });
  }
  if (resolved.error === 'missing_source') {
    return buildBlockedReturn({
      mission_id,
      blueprint_id,
      step_id: step.step_id,
      gap_type: 'hidden_dependency',
      summary: `Missing source file: ${resolved.path}`,
      attempted_action: 'runWriteFileExact',
      missing_information: [resolved.path],
      evidence: {},
    });
  }

  const target = resolveRepoPath(step.target_file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, resolved.content);
  const gotSha = sha256Buffer(resolved.content);

  const contract = step.exact_output_contract || {};
  if (contract.type === 'byte_exact_copy' && contract.sha256 && gotSha !== contract.sha256) {
    return {
      status: 'FAILED_VERIFICATION',
      mission_id,
      blueprint_id,
      step_id: step.step_id,
      target_file: step.target_file,
      summary: 'byte_exact_copy sha256 mismatch after write',
      expected_sha256: contract.sha256,
      got_sha256: gotSha,
      input_mode: resolved.mode,
    };
  }

  return {
    status: 'DONE',
    mission_id,
    blueprint_id,
    step_id: step.step_id,
    target_file: step.target_file,
    sha256: gotSha,
    bytes: resolved.content.length,
    input_mode: resolved.mode,
    sandbox: getSandboxBoundary(step),
  };
}

export async function dispatchExecuteStep(body, options = {}) {
  const mission_id = body?.mission_id || 'unknown';
  const blueprint_id = body?.blueprint_id || 'unknown';
  const step = body?.step;
  const skipIntake = body?.skip_intake_gate === true;
  const assertionRunner = options?.assertionRunner || null;

  if (!step?.step_id || !step?.sandbox_boundary) {
    return {
      httpStatus: 422,
      body: buildBlockedReturn({
        mission_id,
        blueprint_id,
        step_id: step?.step_id || 'unknown',
        gap_type: 'missing_requirement',
        summary: 'execute-step requires step with step_id and sandbox_boundary',
        attempted_action: 'POST /factory/execute-step',
        missing_information: ['step.step_id', 'step.sandbox_boundary'],
        evidence: { bodyKeys: Object.keys(body || {}) },
      }),
    };
  }

  if (!skipIntake) {
    const intake = runBpbIntakeGate(mission_id, { strict_pd: body?.strict_upstream_gates === true });
    if (!intake.ok) {
      return {
        httpStatus: 422,
        body: {
          ok: false,
          status: 'AIC_GATE_FAILURE',
          intake,
          summary: 'BPB intake gate failed — strategic or blueprint prerequisites missing',
        },
      };
    }
  }

  const t0 = Date.now();
  const builderResult = runWriteFileExact({ mission_id, blueprint_id, step });
  const status = builderResult.status;

  if (status === 'BLOCKED_RETURN_TO_BPB') {
    return { httpStatus: 422, body: builderResult };
  }
  if (status === 'FAILED_VERIFICATION') {
    return { httpStatus: 409, body: builderResult };
  }

  const declaredAssertions = Array.isArray(step.behavior_assertions) ? step.behavior_assertions : [];
  const runnerAvailable = Boolean(assertionRunner);
  const behaviorResults = declaredAssertions.length && runnerAvailable
    ? await runBehaviorAssertions(declaredAssertions, assertionRunner)
    : [];

  const sentryContract = verifyStepContract({ mission_id, step, builderResult });
  const sentryVerify = verifyStepResult(step, builderResult, {
    mission_id,
    contract: sentryContract,
    behavior: { runnerAvailable, results: behaviorResults },
  });
  const sentryReview = buildSentryReview({
    mission_id,
    step,
    builderResult,
    contract: sentryContract,
    verify: sentryVerify,
  });

  if (!sentryContract.pass || !sentryVerify.pass) {
    appendSentryReview(sentryReview);
    return {
      httpStatus: 409,
      body: {
        ok: false,
        status: 'SENTRY_FAILED',
        builder: builderResult,
        sentry: {
          implementation_status: 'FAIL',
          step_id: step.step_id,
          contract: sentryContract,
          verify: sentryVerify,
          review: sentryReview,
        },
      },
    };
  }

  appendSentryReview(sentryReview);

  const tsosResult = appendStepMetrics({
    mission_id,
    blueprint_id,
    step_id: step.step_id,
    target_file: builderResult.target_file,
    token_cost: Number(body?.token_cost) || 0,
    latency_ms: Date.now() - t0,
    retries: Number(body?.retries) || 0,
    waste: Boolean(body?.waste),
    bytes_written: builderResult.bytes,
    input_mode: builderResult.input_mode,
    model_tier: body?.model_tier || 'unspecified',
  });

  if (!tsosResult.ok) {
    return {
      httpStatus: 422,
      body: {
        ok: false,
        status: 'TSOS_GUARDRAIL_VIOLATION',
        builder: builderResult,
        sentry: { contract: sentryContract, verify: sentryVerify, review: sentryReview },
        tsos: tsosResult,
      },
    };
  }

  const tsosEval = evaluateEfficiency({ stepMetrics: tsosResult.metrics });

  appendStepExecutionRecord({
    mission_id,
    blueprint_id,
    step_id: step.step_id,
    builderResult,
    sentryReview,
    tsosResult,
    behaviorResults,
  });

  return {
    httpStatus: 200,
    body: {
      ok: true,
      builder: builderResult,
      sentry: {
        implementation_status: 'PASS',
        step_id: step.step_id,
        contract: sentryContract,
        verify: sentryVerify,
        review: sentryReview,
        verifyAgainst: ['acceptance_tests', 'exact_output_contract', 'anti_pattern_check', 'future_lookback', 'proof_freshness', 'behavior_proof'],
        behavior_proof: { runner_available: runnerAvailable, results: behaviorResults },
      },
      tsos: { ...tsosResult, evaluation: tsosEval },
      historian: { recorded: true, mission_state: 'Verification', behavior_assertions: behaviorResults },
    },
  };
}
