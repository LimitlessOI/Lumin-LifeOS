/**
 * SYNOPSIS: Cold Builder walk — authoritative handoff test. Zero decision gaps = PASS.
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../builder/run-step.js';
import { detectFactoryLayout } from '../../../builderos-reboot/scripts/factory-repo-layout.mjs';
import { legacyWriteGap } from '../../../builderos-reboot/scripts/blueprint-write-policy.mjs';

export const BUILDER_RUNTIME = 'builderos-reboot/scripts/execute-mission.mjs';
export const BUILDER_SUPPORTED_ACTION_TYPES = new Set(['write_file_exact']);

/**
 * Cold Builder walk — authoritative handoff test. Zero decision gaps = PASS.
 */
export function coldBuilderWalk(blueprint) {
  const gaps = [];
  const layout = detectFactoryLayout(REPO_ROOT);

  for (const step of blueprint?.steps || []) {
    const sid = step.step_id || '?';

    if (!BUILDER_SUPPORTED_ACTION_TYPES.has(step.action_type)) {
      gaps.push({
        step_id: sid,
        decision_gap: `action_type "${step.action_type}" not executable by ${BUILDER_RUNTIME}`,
        decision_type: 'mechanical',
        required_owner: 'ARC',
        severity: 'blocking',
        blocked: true,
      });
      continue;
    }

    const src = step.exact_inputs?.content_source_path;
    const hasInline = step.exact_inputs?.exact_content != null;
    if (!hasInline && !src) {
      gaps.push({
        step_id: sid,
        decision_gap: 'write_file_exact missing content source',
        required_owner: 'ARC',
        severity: 'blocking',
        blocked: true,
      });
      continue;
    }

    if (src) {
      const abs = path.join(REPO_ROOT, src.replace(/\\/g, '/'));
      if (!fs.existsSync(abs)) {
        gaps.push({
          step_id: sid,
          decision_gap: `CONTENT file missing: ${src}`,
          required_owner: 'ARC',
          severity: 'blocking',
          blocked: true,
        });
      }
    }

    const quarantineGap = legacyWriteGap(step, layout);
    if (quarantineGap) {
      gaps.push({ step_id: sid, ...quarantineGap });
    }
  }

  const blocking = gaps.filter((g) => g.blocked).length;
  return {
    schema: 'builder_cold_simulation_v1',
    mission_id: blueprint?.mission_id || null,
    blueprint_id: blueprint?.blueprint_id || null,
    simulated_by: 'factory-core/arc/builder-cold-walk.js',
    simulated_at: new Date().toISOString(),
    builder_runtime: BUILDER_RUNTIME,
    steps: gaps.length ? gaps : (blueprint?.steps || []).map((s) => ({
      step_id: s.step_id,
      decision_gap: null,
      blocked: false,
    })),
    summary: {
      decision_gaps: blocking,
      total_gaps: gaps.length,
      handoff_to_builder: blocking === 0,
      architect_pass: blocking === 0,
    },
  };
}
