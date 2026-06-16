/**
 * Host existing product BLUEPRINT.json as ARC write_file_exact machine twin.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import fs from 'node:fs';
import path from 'node:path';

function sandboxFor(target) {
  const dir = path.dirname(target.replace(/\\/g, '/'));
  if (dir === '.') return target;
  return `${dir}/**`;
}

function stepFromSnapshot({
  step_id,
  phase_id,
  title,
  target_file,
  snapshot,
  dependencies = [],
  sandbox_boundary,
  acceptance_test_ids = [],
}) {
  return {
    step_id,
    phase_id,
    title,
    target_file,
    action_type: 'write_file_exact',
    exact_inputs: { content_source_path: snapshot.content_source_path },
    exact_output_contract: { type: 'byte_exact_copy', sha256: snapshot.sha256 },
    allowed_context_files: [snapshot.content_source_path],
    forbidden_context_files: ['**'],
    dependencies,
    non_goals: ['No agent improvisation — byte contract only'],
    acceptance_test_ids,
    blocked_return_type_on_failure: 'BLOCKED_RETURN_TO_ARC',
    sandbox_boundary,
    authority_owner: 'ARC',
    on_block: 'BLOCKED_RETURN_TO_ARC',
  };
}

/**
 * Convert legacy builder_build blueprint steps → frozen write_file_exact contracts.
 */
export function compileProductBlueprintHost(ctx) {
  const { missionId, missionFolder, contentRoot, snapshot, repoRoot } = ctx;
  const bpPath = path.join(missionFolder, 'BLUEPRINT.json');
  if (!fs.existsSync(bpPath)) {
    return { ok: false, status: 'BLOCKED_RETURN_TO_IDC', error: 'BLUEPRINT.json missing' };
  }

  let legacy;
  try {
    legacy = JSON.parse(fs.readFileSync(bpPath, 'utf8'));
  } catch (e) {
    return { ok: false, status: 'BLOCKED_RETURN_TO_ARC', error: `invalid BLUEPRINT.json: ${e.message}` };
  }

  const missing = [];
  const steps = [];
  const fileSteps = (legacy.steps || []).filter((s) => s.target_file);

  for (const spec of fileSteps) {
    const snap = snapshot(spec.target_file, contentRoot, spec.step_id);
    if (!snap.ok) {
      missing.push({ step_id: spec.step_id, target: spec.target_file, error: snap.error });
      continue;
    }
    steps.push(
      stepFromSnapshot({
        step_id: spec.step_id,
        phase_id: spec.phase_id || 'P1',
        title: spec.title || spec.step_id,
        target_file: spec.target_file,
        snapshot: snap,
        dependencies: spec.dependencies || [],
        sandbox_boundary: sandboxFor(spec.target_file),
        acceptance_test_ids: [`AT-${spec.step_id}-1`],
      }),
    );
  }

  if (missing.length) {
    return {
      ok: false,
      status: 'BLOCKED_RETURN_TO_ARC',
      error: 'implementation_files_missing',
      missing,
      hint: 'All blueprint target_file paths must exist in repo before ARC host compile',
    };
  }

  if (!steps.length) {
    return { ok: false, status: 'BLOCKED_RETURN_TO_ARC', error: 'no_file_steps_in_blueprint' };
  }

  const blueprint = {
    mission_id: missionId,
    blueprint_id: legacy.blueprint_id || `${missionId}-ARC-HOST`,
    blueprint_status: 'ready_for_builder',
    scope: legacy.scope || 'product_host',
    summary: 'Mechanical ARC host — legacy blueprint re-emitted as write_file_exact byte contracts',
    authority: legacy.authority || 'FOUNDER_PACKET.md',
    acceptance_command: legacy.acceptance_command || null,
    allowed_action_types: ['write_file_exact'],
    non_goals: ['No shell_command steps in Builder — acceptance at blueprint root only'],
    intent_sources: [
      'FOUNDER_PACKET.md',
      'INTENT_BASELINE.json',
      'ASSET_REUSE_DECISION.json',
      'BLUEPRINT_ROADMAP.json',
      'BLUEPRINT.json (legacy host)',
    ],
    compile_mode: 'product_host',
    hosted_from: path.relative(repoRoot, bpPath).replace(/\\/g, '/'),
    steps,
  };

  return {
    ok: true,
    status: 'ARC_COMPILE_PASS',
    blueprint,
    steps_count: steps.length,
    content_root: path.relative(repoRoot, contentRoot),
  };
}
