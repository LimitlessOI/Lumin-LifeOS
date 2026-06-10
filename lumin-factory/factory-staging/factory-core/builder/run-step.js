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

function isPathInside(childPath, parentPath) {
  const relative = path.relative(parentPath, childPath);
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

export function resolveRepoPath(relativePath) {
  const normalized = String(relativePath || '').replace(/\\/g, '/');
  if (!normalized || path.isAbsolute(normalized)) {
    const err = new Error(`Path must be repo-relative: ${relativePath}`);
    err.code = 'PATH_OUTSIDE_REPO';
    throw err;
  }

  const resolved = path.resolve(REPO_ROOT, normalized);
  if (!isPathInside(resolved, REPO_ROOT)) {
    const err = new Error(`Path escapes repo root: ${relativePath}`);
    err.code = 'PATH_OUTSIDE_REPO';
    throw err;
  }
  return resolved;
}

function resolveSandboxBoundary(sandboxBoundary) {
  const boundary = String(sandboxBoundary || '')
    .replace(/\\/g, '/')
    .replace(/\/\*\*$/, '')
    .replace(/\/$/, '');
  return resolveRepoPath(boundary || '.');
}

export function pathMatchesSandbox(relativePath, sandboxBoundary) {
  try {
    const target = resolveRepoPath(relativePath);
    const boundary = resolveSandboxBoundary(sandboxBoundary);
    return isPathInside(target, boundary);
  } catch {
    return false;
  }
}

function resolveStepContent(step) {
  const inputs = step.exact_inputs || {};
  if (inputs.exact_content != null) {
    return { mode: 'greenfield', content: Buffer.from(String(inputs.exact_content), 'utf8') };
  }
  if (inputs.content_source_path) {
    let source;
    try {
      source = resolveRepoPath(inputs.content_source_path);
    } catch (err) {
      return { error: 'invalid_source_path', path: inputs.content_source_path, message: err.message };
    }
    if (!fs.existsSync(source)) return { error: 'missing_source', path: inputs.content_source_path };
    return { mode: 'copy', content: fs.readFileSync(source) };
  }
  return { error: 'missing_input' };
}

/**
 * Execute one frozen write_file_exact step (copy OR greenfield exact_content).
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
  if (resolved.error === 'invalid_source_path') {
    return buildBlockedReturn({
      mission_id,
      blueprint_id,
      step_id: step.step_id,
      gap_type: 'authority_violation',
      summary: `Source ${resolved.path} outside repo boundary`,
      attempted_action: 'runWriteFileExact',
      missing_information: [],
      evidence: { path: resolved.path, error: resolved.message },
    });
  }

  const gotSha = sha256Buffer(resolved.content);

  const contract = step.exact_output_contract || {};
  if (contract.type === 'byte_exact_copy' && contract.sha256 && gotSha !== contract.sha256) {
    return {
      status: 'FAILED_VERIFICATION',
      mission_id,
      blueprint_id,
      step_id: step.step_id,
      target_file: step.target_file,
      summary: 'byte_exact_copy sha256 mismatch before write',
      expected_sha256: contract.sha256,
      got_sha256: gotSha,
      input_mode: resolved.mode,
    };
  }

  const target = resolveRepoPath(step.target_file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, resolved.content);

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
