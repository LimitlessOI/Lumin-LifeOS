import fs from 'node:fs';
import path from 'node:path';
import { dispatchExecuteStep, REPO_ROOT } from './run-step.js';

function sortStepsByDependencies(steps) {
  const byId = new Map(steps.map((s) => [s.step_id, s]));
  const visited = new Set();
  const visiting = new Set();
  const sorted = [];

  function visit(stepId) {
    if (visited.has(stepId)) return;
    if (visiting.has(stepId)) throw new Error(`Circular dependency at ${stepId}`);
    visiting.add(stepId);
    const step = byId.get(stepId);
    if (!step) throw new Error(`Unknown step ${stepId}`);
    for (const dep of step.dependencies || []) visit(dep);
    visiting.delete(stepId);
    visited.add(stepId);
    sorted.push(step);
  }

  for (const step of steps) visit(step.step_id);
  return sorted;
}

export function loadBlueprintFromRepo(missionId) {
  const blueprintPath = path.join(REPO_ROOT, 'builderos-reboot/MISSIONS', missionId, 'BLUEPRINT.json');
  if (!fs.existsSync(blueprintPath)) {
    return { error: 'missing_blueprint', mission_id: missionId, path: blueprintPath };
  }
  return JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
}

export function dispatchExecuteMission(body) {
  const mission_id = body?.mission_id;
  const dry_run = Boolean(body?.dry_run);

  if (!mission_id) {
    return {
      httpStatus: 422,
      body: { status: 'BLOCKED_RETURN_TO_BPB', gap_type: 'missing_requirement', summary: 'mission_id required' },
    };
  }

  const blueprint = loadBlueprintFromRepo(mission_id);
  if (blueprint.error) {
    return { httpStatus: 404, body: blueprint };
  }

  const steps = sortStepsByDependencies(blueprint.steps || []);
  const results = [];

  for (const step of steps) {
    if (dry_run) {
      results.push({
        step_id: step.step_id,
        target_file: step.target_file,
        dry_run: true,
        status: 'SKIPPED_WRITE',
      });
      continue;
    }

    const { httpStatus, body: stepBody } = dispatchExecuteStep({
      mission_id,
      blueprint_id: blueprint.blueprint_id,
      step,
    });

    results.push({
      step_id: step.step_id,
      httpStatus,
      status: stepBody.status || stepBody.builder?.status || 'UNKNOWN',
    });

    if (httpStatus !== 200) {
      return {
        httpStatus,
        body: {
          ok: false,
          mission_id,
          blueprint_id: blueprint.blueprint_id,
          failed_at: step.step_id,
          step_result: stepBody,
          results,
        },
      };
    }
  }

  return {
    httpStatus: 200,
    body: {
      ok: true,
      mission_id,
      blueprint_id: blueprint.blueprint_id,
      dry_run,
      steps_total: steps.length,
      results,
    },
  };
}
