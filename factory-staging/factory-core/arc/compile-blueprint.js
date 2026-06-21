/**
 * SYNOPSIS: Mechanical ARC compile — snapshots repo files to CONTENT/, emits factory blueprint.
 */
import path from 'node:path';
import { REPO_ROOT } from '../builder/run-step.js';
import { resolveMissionFolder, missionRel } from './mission-paths.js';
import { snapshotRepoFile } from './validate-arc-intake.js';
import { compileBuilderosIntakeLoopV1 } from './compilers/BUILDEROS-INTAKE-LOOP-V1-0001.js';
import { compileProductBlueprintHost } from './compilers/product-blueprint-host.js';

const COMPILERS = {
  'BUILDEROS-INTAKE-LOOP-V1-0001': compileBuilderosIntakeLoopV1,
};

function resolveCompiler(missionId) {
  if (COMPILERS[missionId]) return COMPILERS[missionId];
  if (missionId.startsWith('PRODUCT-')) return compileProductBlueprintHost;
  return null;
}

/**
 * Mechanical ARC compile — snapshots repo files to CONTENT/, emits factory blueprint.
 */
export function compileBlueprint(missionId) {
  const missionFolder = resolveMissionFolder(missionId);
  if (!missionFolder) {
    return { ok: false, status: 'BLOCKED_RETURN_TO_IDC', error: 'mission_not_found' };
  }

  const compileFn = resolveCompiler(path.basename(missionFolder));
  if (!compileFn) {
    return {
      ok: false,
      status: 'ARC_COMPILER_MISSING',
      error: 'no_mechanical_compiler',
      hint: 'Register compiler in arc/compilers/ or use council translate on server',
      mission_id: path.basename(missionFolder),
    };
  }

  const contentRoot = path.join(missionFolder, 'CONTENT');
  const result = compileFn({
    missionId: path.basename(missionFolder),
    missionFolder,
    missionRel: missionRel(missionFolder),
    contentRoot,
    repoRoot: REPO_ROOT,
    snapshot: snapshotRepoFile,
  });

  if (!result.ok) return result;

  result.blueprint.compiled_by =
    path.basename(missionFolder).startsWith('PRODUCT-')
      ? 'factory-core/arc/compilers/product-blueprint-host.js'
      : `factory-core/arc/compilers/${path.basename(missionFolder)}.js`;
  result.blueprint.compile_mode = path.basename(missionFolder).startsWith('PRODUCT-')
    ? 'product_host'
    : 'mechanical';
  return result;
}

export function listRegisteredCompilers() {
  return [...Object.keys(COMPILERS), 'PRODUCT-* (product-blueprint-host)'];
}
