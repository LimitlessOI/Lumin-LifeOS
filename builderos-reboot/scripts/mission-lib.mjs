import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  detectFactoryLayout,
  isLegacyWriteTarget,
  missionDir as layoutMissionDir,
  repoRootFromScriptMeta,
} from './factory-repo-layout.mjs';

export const REPO_ROOT = repoRootFromScriptMeta(import.meta.url);
export const FACTORY_LAYOUT = detectFactoryLayout(REPO_ROOT);

export function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

export function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export function loadJson(relativePath) {
  let rel = relativePath;
  if (rel.startsWith('builderos-reboot/MISSIONS/')) {
    rel = rel.replace('builderos-reboot/MISSIONS/', `${FACTORY_LAYOUT.missionsRel}/`);
  } else if (rel.startsWith('builderos-reboot/')) {
    rel = FACTORY_LAYOUT.machineRel
      ? rel.replace('builderos-reboot/', `${FACTORY_LAYOUT.machineRel}/`)
      : rel.replace('builderos-reboot/', '');
  }
  const full = path.join(REPO_ROOT, rel);
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

export function missionDir(missionId) {
  return layoutMissionDir(FACTORY_LAYOUT, missionId);
}

export function loadBlueprint(missionId) {
  return loadJson(`${FACTORY_LAYOUT.missionsRel}/${missionId}/BLUEPRINT.json`);
}

export function loadAcceptanceTests(missionId) {
  return loadJson(`${FACTORY_LAYOUT.missionsRel}/${missionId}/ACCEPTANCE_TESTS.json`);
}

function normalizeRepoRelative(relativePath) {
  return String(relativePath || '').replace(/\\/g, '/');
}

function resolveRepoContainedPath(relativePath) {
  const resolved = path.resolve(REPO_ROOT, normalizeRepoRelative(relativePath));
  const rootPrefix = `${REPO_ROOT}${path.sep}`;
  if (resolved !== REPO_ROOT && !resolved.startsWith(rootPrefix)) {
    return null;
  }
  return resolved;
}

export function resolveRepoPath(relativePath) {
  const resolved = resolveRepoContainedPath(relativePath);
  if (!resolved) {
    throw new Error(`Path escapes repo root: ${relativePath}`);
  }
  return resolved;
}

export function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

export function sortStepsByDependencies(steps) {
  const byId = new Map(steps.map((s) => [s.step_id, s]));
  const visited = new Set();
  const visiting = new Set();
  const sorted = [];

  function visit(stepId) {
    if (visited.has(stepId)) return;
    if (visiting.has(stepId)) {
      throw new Error(`Circular dependency at ${stepId}`);
    }
    visiting.add(stepId);
    const step = byId.get(stepId);
    if (!step) throw new Error(`Unknown dependency step ${stepId}`);
    for (const dep of step.dependencies || []) visit(dep);
    visiting.delete(stepId);
    visited.add(stepId);
    sorted.push(step);
  }

  for (const step of steps) visit(step.step_id);
  return sorted;
}

export function pathMatchesSandbox(relativePath, sandboxBoundary) {
  const target = resolveRepoContainedPath(relativePath);
  const boundaryText = normalizeRepoRelative(sandboxBoundary).replace(/\/\*\*$/, '');
  const boundary = resolveRepoContainedPath(boundaryText);
  if (!target || !boundary) return false;
  return target === boundary || target.startsWith(`${boundary}${path.sep}`);
}

export function writeFileExactStep(step) {
  let content;
  const sourceRel = step.exact_inputs?.content_source_path;

  if (step.exact_inputs?.exact_content != null) {
    content = Buffer.from(String(step.exact_inputs.exact_content), 'utf8');
  } else if (sourceRel) {
    const source = resolveRepoContainedPath(sourceRel);
    if (!source) {
      return {
        ok: false,
        status: 'BLOCKED_RETURN_TO_BPB',
        gap_type: 'authority_violation',
        summary: `Source ${sourceRel} outside repo root`,
      };
    }
    if (!fs.existsSync(source)) {
      return {
        ok: false,
        status: 'BLOCKED_RETURN_TO_BPB',
        gap_type: 'hidden_dependency',
        summary: `Missing source file ${sourceRel}`,
      };
    }
    content = fs.readFileSync(source);
  } else {
    return {
      ok: false,
      status: 'BLOCKED_RETURN_TO_BPB',
      gap_type: 'missing_requirement',
      summary: `Step ${step.step_id} needs content_source_path or exact_content`,
    };
  }

  if (!pathMatchesSandbox(step.target_file, step.sandbox_boundary)) {
    return {
      ok: false,
      status: 'BLOCKED_RETURN_TO_BPB',
      gap_type: 'authority_violation',
      summary: `Target ${step.target_file} outside sandbox ${step.sandbox_boundary}`,
    };
  }

  const target = resolveRepoPath(step.target_file);

  if (isLegacyWriteTarget(step.target_file, FACTORY_LAYOUT)) {
    return {
      ok: false,
      status: 'BLOCKED_RETURN_TO_BPB',
      gap_type: 'legacy_quarantine',
      summary: `Target ${step.target_file} is legacy LifeOS spine — run from Lumin-Factory repo or fix blueprint sandbox`,
    };
  }

  ensureParentDir(target);
  fs.writeFileSync(target, content);

  const contract = step.exact_output_contract || {};
  if (contract.type === 'byte_exact_copy' && contract.sha256) {
    const got = sha256Buffer(content);
    if (got !== contract.sha256) {
      return {
        ok: false,
        status: 'FAILED_VERIFICATION',
        summary: `sha256 mismatch on ${step.target_file}`,
        expected: contract.sha256,
        got,
      };
    }
  }

  return {
    ok: true,
    status: 'DONE',
    step_id: step.step_id,
    target_file: step.target_file,
    bytes: content.length,
    sha256: sha256Buffer(content),
  };
}
