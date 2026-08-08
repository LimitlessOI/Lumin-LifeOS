/**
 * SYNOPSIS: Exports resolveRepoPath — factory-staging/factory-core/builder/run-step.js.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
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
import { runChairConsensusGate } from './chair-consensus-gate.mjs';
import { runBehaviorAssertions, stepRequiresBehaviorProof } from '../sentry/behavior-assertions.js';
import { runSentryRealityStation, assertSentryPassForStep } from '../../../services/sentry-reality-station.mjs';
import { stepRequiresAuthoring, runAuthoring } from './authoring.js';
import { REPO_ROOT, FACTORY_ROOT, resolveRepoPath } from '../repo-paths.js';

export { REPO_ROOT, FACTORY_ROOT, resolveRepoPath };

function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export function pathMatchesSandbox(relativePath, sandboxBoundary) {
  const normalized = path.posix.normalize(String(relativePath || '').replace(/\\/g, '/'));
  if (normalized === '..' || normalized.startsWith('../')) return false;
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
  const gotSha = sha256Buffer(resolved.content);
  const rejectedHashes = Array.isArray(step?.rejected_content_hashes) ? step.rejected_content_hashes : [];
  if (rejectedHashes.length && rejectedHashes.includes(gotSha)) {
    return buildBlockedReturn({
      mission_id,
      blueprint_id,
      step_id: step.step_id,
      gap_type: 'content_rejected',
      summary: `Generated content sha256 ${gotSha} is in the twin's rejected_content_hashes list — the identical broken content was previously unsealed and must not overwrite an approved correction`,
      attempted_action: 'runWriteFileExact',
      missing_information: [],
      evidence: { rejected_content_hashes: rejectedHashes, got_sha256: gotSha },
    });
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, resolved.content);

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
  let step = body?.step;
  const skipIntake = body?.skip_intake_gate === true;
  const assertionRunner = options?.assertionRunner || null;
  const codegenRunner = options?.codegenRunner || null;
  const commitRunner = options?.commitRunner || null;
  const sentryBaseUrl = options?.publicBaseUrl || process.env.PUBLIC_BASE_URL || 'https://lumin-web-production-e3a9.up.railway.app';

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

  // STEP-STATUS GATE: a terminal or blocked step is not actionable. This guards
  // direct POST /factory/execute-step against callers that bypass the ship-queue
  // exactChangeClaim check. runGovernedShippingQueue also checks before dispatch.
  const stepStatus = String(step.status || 'pending').toLowerCase();
  const nonActionable = new Set(['blocked', 'skipped', 'cancelled', 'done']);
  if (nonActionable.has(stepStatus) || step.human_hold === true || step.pause_for_founder === true) {
    return {
      httpStatus: 422,
      body: buildBlockedReturn({
        mission_id,
        blueprint_id,
        step_id: step.step_id,
        gap_type: 'authority_violation',
        summary: `execute-step cannot run a step with status "${stepStatus}"${step.human_hold ? ' + human_hold' : ''}${step.pause_for_founder ? ' + pause_for_founder' : ''}`,
        attempted_action: 'POST /factory/execute-step',
        missing_information: ['amend the blueprint to reset status or remove human_hold'],
        evidence: { status: stepStatus, human_hold: step.human_hold, pause_for_founder: step.pause_for_founder },
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

  const chairGate = runChairConsensusGate({
    mission_id,
    blueprint_id,
    step,
    reasoning_plan: body?.reasoning_plan,
    reasoning_plan_id: body?.reasoning_plan_id,
    autoGenerate: body?.auto_generate_reasoning_plan === true,
  });
  if (!chairGate.approved) {
    return {
      httpStatus: 422,
      body: buildBlockedReturn({
        mission_id,
        blueprint_id,
        step_id: step.step_id,
        gap_type: 'chair_consensus_gate_failure',
        summary: `Chair consensus gate failed: ${chairGate.reason}`,
        attempted_action: 'runChairConsensusGate',
        missing_information: chairGate.missing || [],
        evidence: { chair_gate_required: chairGate.chair_gate_required },
      }),
    };
  }

  const t0 = Date.now();

  // STEP 4 — untrusted codegen authoring sub-step ("dumb pipe"). If the step
  // declares author_then_write, a model produces candidate CONTENT ONLY; that
  // content becomes exact_content and flows through the SAME write_file_exact +
  // SENTRY behavior gate as any other step. Assertions stay blueprint-authored
  // (provenance lock). Fail-closed: authoring failure blocks the step.
  let authoringResult = null;
  if (stepRequiresAuthoring(step)) {
    authoringResult = await runAuthoring(step, codegenRunner);
    if (!authoringResult.ok) {
      return {
        httpStatus: 422,
        body: buildBlockedReturn({
          mission_id,
          blueprint_id,
          step_id: step.step_id,
          gap_type: 'codegen_authoring_failed',
          summary: `Authoring sub-step failed: ${authoringResult.reason}`,
          attempted_action: 'runAuthoring',
          missing_information: [],
          evidence: {
            reason: authoringResult.reason,
            model_tier: authoringResult.model_tier || null,
            tier_errors: authoringResult.tier_errors || null,
          },
        }),
      };
    }
    // The authored content is untrusted input to a normal write_file_exact step.
    // behavior_assertions are preserved from the blueprint step, never taken from codegen.
    step = {
      ...step,
      action_type: 'write_file_exact',
      exact_inputs: { ...(step.exact_inputs || {}), exact_content: authoringResult.content },
    };
  }

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

  // Layer A/B reality station: produce an independent SENTRY receipt and
  // fail-closed on assertSentryPassForStep for any step that declares proof.
  if (stepRequiresBehaviorProof(step) || step.require_layer_b || step.run_sentry_reality_station) {
    const realityReceipt = await runSentryRealityStation({
      step,
      baseUrl: sentryBaseUrl,
      layerA: { assertions: declaredAssertions, runner: assertionRunner },
      layerB: { scenario: step.layer_b_scenario || [] },
      requireLayerB: step.require_layer_b === true,
      runId: `${mission_id}-${step.step_id}-${Date.now()}`,
    });
    try {
      assertSentryPassForStep(step, realityReceipt?.receipt);
    } catch (err) {
      appendSentryReview({ ...realityReceipt, error: err.message });
      return {
        httpStatus: 409,
        body: {
          ok: false,
          status: 'SENTRY_REALITY_STATION_FAILED',
          error: err.message,
          receipt: realityReceipt,
          builder: builderResult,
          sentry: {
            implementation_status: 'FAIL',
            step_id: step.step_id,
            contract: sentryContract,
            verify: sentryVerify,
            review: sentryReview,
            reality_receipt: realityReceipt,
          },
        },
      };
    }
    appendSentryReview({ ...realityReceipt, kind: 'sentry_reality_station_pass' });
  }

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
    authoringResult,
  });

  // runWriteFileExact only writes to the local (ephemeral Railway container)
  // filesystem -- confirmed live 2026-08-07: this dispatch path has never once
  // called commitToGitHub anywhere in its chain (run-step.js, governed-shipping-
  // runner.js, governed-autonomous-shipping-loop.js all checked directly), so a
  // real SENTRY PASS produced by this endpoint was silently lost on the next
  // container restart/redeploy every time. governed-shipping-runner.js already
  // expects a commit_sha in this response (its honesty grader distinguishes
  // 'sentry_PASS+commit_sha' from 'sentry_PASS_no_sha') -- it was simply never
  // populated. Fail-closed: if a commitRunner is wired but the commit itself
  // fails, this is a real failure, not an ok:true with nothing durable to show
  // for it ("if a real command did not run and produce real receipts, it did
  // not happen").
  let commitResult = null;
  if (commitRunner) {
    try {
      const writtenAbsPath = resolveRepoPath(step.target_file);
      let writtenContent = fs.readFileSync(writtenAbsPath, 'utf8');
      // Codegen was asked (task/spec) to include an @ssot JSDoc tag and
      // skipped it twice in a row live 2026-08-07, including after an
      // explicit repair retry naming the exact fix -- a model-compliance
      // gap for what is actually deterministic metadata the blueprint
      // already knows. Same doctrine as ensureSynopsisInContent (deployment-
      // service.js): don't keep re-asking the model for something we can
      // just supply. Only injects when the blueprint step declares `ssot`
      // AND the written content has no @ssot tag already -- never overrides
      // a real one the model did write.
      if (step.ssot && !/^\s*\*\s*@ssot\s+/m.test(writtenContent)) {
        writtenContent = `/**\n * @ssot ${step.ssot}\n */\n${writtenContent}`;
        fs.writeFileSync(writtenAbsPath, writtenContent);
      }
      const commitMessage = `[system-build] ${mission_id} ${step.step_id} — ${step.target_file}`;
      commitResult = await commitRunner(step.target_file, writtenContent, commitMessage);
    } catch (err) {
      appendSentryReview({ ...sentryReview, kind: 'commit_failed', error: String(err?.message || err) });
      return {
        httpStatus: 502,
        body: {
          ok: false,
          status: 'COMMIT_FAILED',
          error: String(err?.message || err),
          builder: builderResult,
          sentry: {
            implementation_status: 'PASS',
            step_id: step.step_id,
            contract: sentryContract,
            verify: sentryVerify,
            review: sentryReview,
          },
        },
      };
    }
  }

  return {
    httpStatus: 200,
    body: {
      ok: true,
      builder: builderResult,
      commit_sha: commitResult?.sha || null,
      committed: Boolean(commitResult?.sha),
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
      codegen: authoringResult
        ? {
            model_tier: authoringResult.model_tier,
            escalated: authoringResult.escalated,
            content_sha256: authoringResult.content_sha256,
            assertion_provenance: authoringResult.assertion_provenance,
            commit_sha: commitResult?.sha || null,
          }
        : null,
    },
  };
}
