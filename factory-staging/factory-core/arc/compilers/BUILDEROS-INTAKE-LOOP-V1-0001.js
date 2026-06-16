import path from 'node:path';
import { spawnSync } from 'node:child_process';

function stepFromSnapshot({
  step_id,
  phase_id,
  title,
  target_file,
  snapshot,
  dependencies = [],
  non_goals = [],
  sandbox_boundary,
  acceptance_test_ids,
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
    non_goals,
    acceptance_test_ids,
    blocked_return_type_on_failure: 'BLOCKED_RETURN_TO_ARC',
    sandbox_boundary,
    authority_owner: 'ARC',
    on_block: 'BLOCKED_RETURN_TO_ARC',
  };
}

/**
 * Mechanical compiler — P1-P3 intake loop from ASSET_REUSE + roadmap + repo truth.
 */
export function compileBuilderosIntakeLoopV1(ctx) {
  const { missionId, missionFolder, contentRoot, snapshot, repoRoot } = ctx;
  const missing = [];
  const steps = [];

  const fileSteps = [
    { step_id: 'IL-S01', phase_id: 'P1', title: 'INTENT_BASELINE schema', target: 'builderos-reboot/governance/schemas/INTENT_BASELINE.schema.json', sandbox: 'builderos-reboot/governance/schemas/**', deps: [] },
    { step_id: 'IL-S02', phase_id: 'P1', title: 'INTENT_COVERAGE_MAP schema', target: 'builderos-reboot/governance/schemas/INTENT_COVERAGE_MAP.schema.json', sandbox: 'builderos-reboot/governance/schemas/**', deps: ['IL-S01'] },
    { step_id: 'IL-S03', phase_id: 'P1', title: 'PRE_ARC_INPUT_PACKET schema', target: 'builderos-reboot/governance/schemas/PRE_ARC_INPUT_PACKET.schema.json', sandbox: 'builderos-reboot/governance/schemas/**', deps: ['IL-S01'] },
    { step_id: 'IL-S04', phase_id: 'P1', title: 'PRE_BUILD_VALIDATION_PACKET schema', target: 'builderos-reboot/governance/schemas/PRE_BUILD_VALIDATION_PACKET.schema.json', sandbox: 'builderos-reboot/governance/schemas/**', deps: ['IL-S01'] },
    { step_id: 'IL-S05', phase_id: 'P1', title: 'Tier-1 validator CLI', target: 'scripts/validate-intent-tier1.mjs', sandbox: 'scripts/**', deps: ['IL-S04'] },
    { step_id: 'IL-S06', phase_id: 'P1', title: 'Mission intake scaffold CLI', target: 'scripts/scaffold-mission-intake.mjs', sandbox: 'scripts/**', deps: ['IL-S04'] },
    { step_id: 'IL-S07', phase_id: 'P2', title: 'Pre-ARC packet assembler', target: 'scripts/assemble-pre-arc-packet.mjs', sandbox: 'scripts/**', deps: ['IL-S05'] },
    { step_id: 'IL-S08', phase_id: 'P2', title: 'Founder interruption defect service', target: 'services/founder-interruption-defect.js', sandbox: 'services/**', deps: [] },
    { step_id: 'IL-S09', phase_id: 'P3', title: 'BUILDER_SIMULATION_REPORT schema', target: 'builderos-reboot/governance/schemas/BUILDER_SIMULATION_REPORT.schema.json', sandbox: 'builderos-reboot/governance/schemas/**', deps: ['IL-S04'] },
    { step_id: 'IL-S10', phase_id: 'P3', title: 'Pre-build validation assembler', target: 'scripts/assemble-pre-build-packet.mjs', sandbox: 'scripts/**', deps: ['IL-S09'] },
    { step_id: 'IL-S11', phase_id: 'P3', title: 'Blueprint gate soft pre-build warn', target: 'services/builder-blueprint-gate.js', sandbox: 'services/builder-blueprint-gate.js', deps: ['IL-S10'] },
    { step_id: 'IL-S12', phase_id: 'P3', title: 'Intake loop v1 acceptance runner', target: 'scripts/run-builderos-intake-loop-v1-acceptance.mjs', sandbox: 'scripts/**', deps: ['IL-S07', 'IL-S10'] },
  ];

  for (const spec of fileSteps) {
    const snap = snapshot(spec.target, contentRoot, spec.step_id);
    if (!snap.ok) {
      missing.push({ step_id: spec.step_id, target: spec.target, error: snap.error });
      continue;
    }
    steps.push(
      stepFromSnapshot({
        step_id: spec.step_id,
        phase_id: spec.phase_id,
        title: spec.title,
        target_file: spec.target,
        snapshot: snap,
        dependencies: spec.deps,
        sandbox_boundary: spec.sandbox,
        acceptance_test_ids: [`AT-${spec.step_id}-1`],
        non_goals: ['Voice Rail out of scope', 'No server.js changes'],
      }),
    );
  }

  const pkgSnap = snapshot('package.json', contentRoot, 'IL-S13');
  if (pkgSnap.ok) {
    steps.push(
      stepFromSnapshot({
        step_id: 'IL-S13',
        phase_id: 'P2',
        title: 'npm scripts for intake validate + assemble',
        target_file: 'package.json',
        snapshot: pkgSnap,
        dependencies: ['IL-S07'],
        sandbox_boundary: 'package.json',
        acceptance_test_ids: ['AT-IL-S13-1'],
        non_goals: ['Do not remove protected scripts'],
      }),
    );
  } else {
    missing.push({ step_id: 'IL-S13', target: 'package.json', error: pkgSnap.error });
  }

  spawnSync(process.execPath, ['scripts/assemble-pre-arc-packet.mjs', missionId], {
    cwd: repoRoot,
    stdio: 'pipe',
  });

  const preArcRel = `builderos-reboot/MISSIONS/${missionId}/PRE_ARC_INPUT_PACKET.json`;
  const preArcSnap = snapshot(preArcRel, contentRoot, 'IL-S14');
  if (preArcSnap.ok) {
    steps.push(
      stepFromSnapshot({
        step_id: 'IL-S14',
        phase_id: 'P3',
        title: 'PRE_ARC manifest byte contract',
        target_file: preArcRel,
        snapshot: preArcSnap,
        dependencies: ['IL-S07', 'IL-S13'],
        sandbox_boundary: `builderos-reboot/MISSIONS/${missionId}/**`,
        acceptance_test_ids: ['AT-IL-S14-1'],
        non_goals: ['No runtime assemble — Builder copies CONTENT snapshot only'],
      }),
    );
  } else {
    missing.push({ step_id: 'IL-S14', target: preArcRel, error: preArcSnap.error });
  }

  if (missing.length) {
    return {
      ok: false,
      status: 'BLOCKED_RETURN_TO_ARC',
      error: 'implementation_files_missing',
      missing,
      hint: 'Builder must implement files before ARC can snapshot CONTENT contracts',
    };
  }

  const blueprint = {
    mission_id: missionId,
    blueprint_id: `${missionId}-ARC-${new Date().toISOString().slice(0, 10)}`,
    blueprint_status: 'ready_for_builder',
    scope: 'intake_loop_phases_p1_p3',
    summary: 'Mechanical ARC compile from PRE_ARC packet + repo snapshots. Voice Rail out of scope.',
    authority: 'FOUNDER_PACKET.md',
    acceptance_command: 'npm run builderos:intake-loop:v1-acceptance',
    allowed_action_types: ['write_file_exact'],
    non_goals: [
      'No server.js changes',
      'No Voice Rail work',
      'No DB migrations v1',
    ],
    intent_sources: [
      'FOUNDER_PACKET.md',
      'INTENT_BASELINE.json',
      'ASSET_REUSE_DECISION.json',
      'BLUEPRINT_ROADMAP.json',
    ],
    steps,
  };

  return {
    ok: true,
    status: 'ARC_COMPILE_PASS',
    blueprint,
    steps_count: steps.length,
    content_root: path.relative(ctx.repoRoot, contentRoot),
  };
}
