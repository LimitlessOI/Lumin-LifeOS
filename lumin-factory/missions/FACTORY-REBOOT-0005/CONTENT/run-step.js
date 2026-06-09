import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { getSandboxBoundary } from './sandbox.js';
import { buildBlockedReturn } from './blocked-return.js';

const BUILDER_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(BUILDER_DIR, '../../..');
export const FACTORY_ROOT = path.resolve(BUILDER_DIR, '../..');

function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export function resolveRepoPath(relativePath) {
  return path.join(REPO_ROOT, relativePath.replace(/\\/g, '/'));
}

export function pathMatchesSandbox(relativePath, sandboxBoundary) {
  const normalized = relativePath.replace(/\\/g, '/');
  const boundary = sandboxBoundary.replace(/\\/g, '/').replace(/\/\*\*$/, '');
  return normalized === boundary || normalized.startsWith(`${boundary}/`);
}

/**
 * Execute one frozen write_file_exact step. No discretion — copy bytes source → target.
 */
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

  const sourceRel = step.exact_inputs?.content_source_path;
  if (!sourceRel) {
    return buildBlockedReturn({
      mission_id,
      blueprint_id,
      step_id: step.step_id,
      gap_type: 'missing_requirement',
      summary: 'write_file_exact requires exact_inputs.content_source_path',
      attempted_action: 'runWriteFileExact',
      missing_information: ['exact_inputs.content_source_path'],
      evidence: {},
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

  const source = resolveRepoPath(sourceRel);
  const target = resolveRepoPath(step.target_file);

  if (!fs.existsSync(source)) {
    return buildBlockedReturn({
      mission_id,
      blueprint_id,
      step_id: step.step_id,
      gap_type: 'hidden_dependency',
      summary: `Missing source file: ${sourceRel}`,
      attempted_action: 'runWriteFileExact',
      missing_information: [sourceRel],
      evidence: {},
    });
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  const content = fs.readFileSync(source);
  fs.writeFileSync(target, content);
  const gotSha = sha256Buffer(content);

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
    };
  }

  return {
    status: 'DONE',
    mission_id,
    blueprint_id,
    step_id: step.step_id,
    target_file: step.target_file,
    sha256: gotSha,
    bytes: content.length,
    sandbox: getSandboxBoundary(step),
  };
}

export function dispatchExecuteStep(body) {
  const mission_id = body?.mission_id || 'unknown';
  const blueprint_id = body?.blueprint_id || 'unknown';
  const step = body?.step;

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

  const builderResult = runWriteFileExact({ mission_id, blueprint_id, step });
  const status = builderResult.status;

  if (status === 'BLOCKED_RETURN_TO_BPB') {
    return { httpStatus: 422, body: builderResult };
  }
  if (status === 'FAILED_VERIFICATION') {
    return { httpStatus: 409, body: builderResult };
  }

  return {
    httpStatus: 200,
    body: {
      ok: true,
      builder: builderResult,
      sentry: {
        implementation_status: 'PASS',
        step_id: step.step_id,
        verifyAgainst: ['exact_output_contract', 'sandbox_boundary'],
      },
    },
  };
}
