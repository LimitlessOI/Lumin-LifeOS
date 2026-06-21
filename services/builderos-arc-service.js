/**
 * SYNOPSIS: BuilderOS ARC translate — system mechanical compile + optional council fallback.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import { runArcTranslate } from '../factory-staging/factory-core/arc/translate-mission.js';
import { runArcEntryGate } from '../factory-staging/factory-core/arc/entry-gate.js';
import { simulateBlueprintSteps } from '../factory-staging/factory-core/arc/simulate-blueprint-steps.js';
import { compileBlueprint, listRegisteredCompilers } from '../factory-staging/factory-core/arc/compile-blueprint.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MISSIONS_ROOT = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS');

function missionFolder(missionId) {
  return path.join(MISSIONS_ROOT, missionId);
}

function extractJson(text) {
  const raw = String(text || '').trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fence ? fence[1].trim() : raw;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('no JSON object in council response');
  return JSON.parse(body.slice(start, end + 1));
}

export function createBuilderOSArcService({ callCouncilMember, logger = console } = {}) {
  async function translateMission(missionId, { councilMember = 'claude', dryRun = false, mode = 'auto' } = {}) {
    const hasCompiler = listRegisteredCompilers().includes(missionId);

    if (mode === 'auto' && hasCompiler) {
      const result = runArcTranslate(missionId, { dryRun, writeBlueprint: !dryRun });
      logger.info?.(`[ARC] mechanical translate ${missionId} ok=${result.ok} status=${result.status}`);
      return result;
    }

    if (mode === 'mechanical') {
      return runArcTranslate(missionId, { dryRun, writeBlueprint: !dryRun });
    }

    if (!callCouncilMember) {
      return {
        ok: false,
        status: 'ARC_TRANSLATE_UNAVAILABLE',
        error: 'council_not_configured',
        hint: hasCompiler
          ? 'Use mode=mechanical or npm run builderos:arc:translate'
          : 'Register mechanical compiler or deploy council on server',
      };
    }

    const mechanical = runArcTranslate(missionId, { dryRun: true, writeBlueprint: false });
    if (mechanical.ok) return runArcTranslate(missionId, { dryRun, writeBlueprint: !dryRun });

    return {
      ok: false,
      status: 'ARC_COUNCIL_NOT_IMPLEMENTED_FOR_MISSION',
      error: 'council_fallback_requires_mechanical_compiler_first',
      mechanical_preview: mechanical,
    };
  }

  function simulateMission(missionId) {
    const dir = missionFolder(missionId);
    if (!fs.existsSync(path.join(dir, 'BLUEPRINT.json'))) {
      return { ok: false, error: 'missing_blueprint' };
    }
    const blueprint = JSON.parse(fs.readFileSync(path.join(dir, 'BLUEPRINT.json'), 'utf8'));
    const simulation = simulateBlueprintSteps(blueprint, { missionFolder: dir });
    return { ok: simulation.summary.clear_to_build, simulation };
  }

  function runEntryGate(missionId) {
    return runArcEntryGate(missionId);
  }

  function compileMission(missionId) {
    return compileBlueprint(missionId);
  }

  return { translateMission, simulateMission, runEntryGate, compileMission, runArcTranslate };
}
