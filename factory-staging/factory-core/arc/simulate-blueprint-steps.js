import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT } from '../builder/run-step.js';
import { blueprintFreezeCheck } from '../sentry/blueprint-freeze-check.js';
import { BUILDER_SUPPORTED_ACTION_TYPES } from './builder-cold-walk.js';
import { detectFactoryLayout } from '../../../builderos-reboot/scripts/factory-repo-layout.mjs';
import { legacyWriteGap } from '../../../builderos-reboot/scripts/blueprint-write-policy.mjs';

const FACTORY_STEP_REQUIRED = [
  'step_id',
  'action_type',
  'target_file',
  'sandbox_boundary',
  'authority_owner',
  'on_block',
];

const BLOCKING_SEVERITIES = new Set(['medium', 'high', 'blocking']);

function loadAcceptanceTestIds(missionFolder) {
  const p = path.join(missionFolder, 'ACCEPTANCE_TESTS.json');
  if (!fs.existsSync(p)) return new Set();
  try {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    const tests = Array.isArray(data) ? data : data.tests || [];
    return new Set(tests.map((t) => t.test_id).filter(Boolean));
  } catch {
    return new Set();
  }
}

function countFilesInRequiredOutcome(text) {
  const m = String(text || '').match(/Create (\d+) (schema|file|files)/i);
  return m ? Number(m[1]) : 0;
}

/**
 * Cold Builder simulation — mechanical audit, no AI, no session memory.
 */
export function simulateBlueprintSteps(blueprint, { missionFolder, trustArcPipeline = false } = {}) {
  const acceptanceIds = missionFolder ? loadAcceptanceTestIds(missionFolder) : new Set();
  const layout = detectFactoryLayout(REPO_ROOT);
  const stepsOut = [];
  let totalGaps = 0;
  let blockingGaps = 0;

  function record(step_id, gap) {
    const severity = gap.severity || 'medium';
    const blocked = BLOCKING_SEVERITIES.has(severity);
    totalGaps += 1;
    if (blocked) blockingGaps += 1;
    stepsOut.push({
      step_id,
      decision_gap: gap.decision_gap,
      decision_type: gap.decision_type || 'mechanical',
      forced_decision_reason: gap.forced_decision_reason || gap.decision_gap,
      required_owner: gap.required_owner || 'Builder',
      severity,
      blocked,
    });
  }

  const blueprintSteps = blueprint?.steps || [];
  if (!blueprintSteps.length) {
    record('BLUEPRINT', {
      decision_gap: 'empty steps array',
      severity: 'blocking',
      required_owner: 'ARC',
    });
  }

  for (const step of blueprintSteps) {
    const sid = step.step_id || '?';

    for (const key of FACTORY_STEP_REQUIRED) {
      if (step[key] === undefined || step[key] === null || step[key] === '') {
        record(sid, {
          decision_gap: `missing required field ${key}`,
          severity: 'blocking',
          required_owner: 'ARC',
        });
      }
    }

    if (!BUILDER_SUPPORTED_ACTION_TYPES.has(step.action_type)) {
      record(sid, {
        decision_gap: `action_type "${step.action_type}" not executable by execute-mission.mjs`,
        severity: 'blocking',
        forced_decision_reason: 'Architect PASS requires write_file_exact only until Builder supports more',
        required_owner: 'ARC',
      });
    }

    if (step.action_type === 'write_file_exact') {
      const hasExact = step.exact_inputs?.exact_content != null;
      const hasSource = Boolean(step.exact_inputs?.content_source_path);
      if (!hasExact && !hasSource) {
        record(sid, {
          decision_gap: 'write_file_exact missing exact_inputs (content_source_path or exact_content)',
          severity: 'blocking',
          forced_decision_reason: 'Factory Builder cannot execute prose-only required_outcome',
          required_owner: 'ARC',
        });
      } else if (hasSource) {
        const srcAbs = path.join(REPO_ROOT, step.exact_inputs.content_source_path.replace(/\\/g, '/'));
        if (!fs.existsSync(srcAbs)) {
          record(sid, {
            decision_gap: `CONTENT file missing: ${step.exact_inputs.content_source_path}`,
            severity: 'blocking',
            required_owner: 'ARC',
          });
        }
      }
    }

    const quarantineGap = legacyWriteGap(step, layout);
    if (quarantineGap) {
      record(sid, quarantineGap);
    }

    if (step.action_type === 'shell_command') {
      record(sid, {
        decision_gap: 'shell_command forbidden — use write_file_exact CONTENT snapshot',
        severity: 'blocking',
        required_owner: 'ARC',
      });
    }

    void step.command;

    const multiFile = countFilesInRequiredOutcome(step.required_outcome);
    if (multiFile > 1 && !step.additional_files?.length) {
      record(sid, {
        decision_gap: `required_outcome implies ${multiFile} files but additional_files[] not set; target_file is single`,
        severity: 'medium',
        required_owner: 'ARC',
      });
    }

    if (Array.isArray(step.acceptance_test_ids) && step.action_type === 'write_file_exact') {
      for (const testId of step.acceptance_test_ids) {
        if (!acceptanceIds.has(testId)) {
          record(sid, {
            decision_gap: `phantom acceptance_test_id ${testId} — not in ACCEPTANCE_TESTS.json`,
            severity: 'blocking',
            required_owner: 'ARC',
          });
        }
      }
    }

    if (step.action_type === 'write_file_exact' && step.target_file) {
      const rel = step.target_file.replace(/\\/g, '/');
      const abs = path.join(REPO_ROOT, rel);
      if (step.required_outcome?.includes('read') && rel.endsWith('.js') && !step.interface_contract) {
        record(sid, {
          decision_gap: 'integration edit without interface_contract',
          severity: 'low',
          required_owner: 'ARC',
        });
      }
      if (!step.required_outcome && !step.exact_inputs) {
        record(sid, {
          decision_gap: 'no required_outcome and no exact_inputs',
          severity: 'blocking',
          required_owner: 'ARC',
        });
      }
      void abs;
    }
  }

  const freeze = blueprintFreezeCheck(blueprint);
  if (!freeze.pass) {
    for (const b of freeze.blocking || []) {
      record('FACTORY_FREEZE', {
        decision_gap: b,
        severity: 'blocking',
        required_owner: 'ARC',
      });
    }
  }

  const arcReceiptPath = missionFolder
    ? path.join(missionFolder, 'ARC_RUN_RECEIPT.json')
    : null;
  if (
    !trustArcPipeline &&
    blueprint?.authored_by === 'ARC' &&
    arcReceiptPath &&
    !fs.existsSync(arcReceiptPath)
  ) {
    record('ARC_PROVENANCE', {
      decision_gap: 'authored_by ARC but ARC_RUN_RECEIPT.json missing — not system-produced',
      severity: 'blocking',
      required_owner: 'ARC pipeline',
    });
  }

  const perStep = {};
  for (const s of stepsOut) {
    if (!perStep[s.step_id]) {
      perStep[s.step_id] = { step_id: s.step_id, gaps: [], blocked: false };
    }
    perStep[s.step_id].gaps.push(s);
    if (s.blocked) perStep[s.step_id].blocked = true;
  }

  const steps = Object.values(perStep).map((row) => {
    const top = row.gaps.sort((a, b) => {
      const rank = { blocking: 3, high: 2, medium: 1, low: 0 };
      return (rank[b.severity] || 0) - (rank[a.severity] || 0);
    })[0];
    return {
      step_id: row.step_id,
      decision_gap: top?.decision_gap || null,
      decision_type: top?.decision_type || null,
      forced_decision_reason: top?.forced_decision_reason || null,
      required_owner: top?.required_owner || null,
      severity: top?.severity || null,
      blocked: row.blocked,
      gap_count: row.gaps.length,
    };
  });

  return {
    schema: 'builder_simulation_report_v1',
    mission_id: blueprint?.mission_id || null,
    blueprint_id: blueprint?.blueprint_id || null,
    simulated_by: 'factory-core/arc/simulate-blueprint-steps.js',
    simulated_at: new Date().toISOString(),
    steps,
    all_gaps: stepsOut,
    summary: {
      total_gaps: totalGaps,
      blocking_gaps: blockingGaps,
      clear_to_build: blockingGaps === 0,
    },
  };
}
