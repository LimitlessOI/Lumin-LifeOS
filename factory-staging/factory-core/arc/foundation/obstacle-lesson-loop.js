/**
 * SYNOPSIS: Obstacle → lesson → system adjustment. Stopping is failure; obstacles are routed around.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadPointBTarget } from './point-b-target.js';

function writeJson(absPath, data) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, `${JSON.stringify(data, null, 2)}\n`);
}

function loadJson(absPath, fallback) {
  if (!fs.existsSync(absPath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(absPath, 'utf8'));
  } catch {
    return fallback;
  }
}

const ROUTE_STRATEGIES = [
  { id: 'repair_in_place', when: /INTENT_BASELINE|development:|idc:/i, action: 'bootstrap_development_intake' },
  { id: 're_arc', when: /corridor|BLOCKED_RETURN|compile/i, action: 're_arc_translate' },
  { id: 'refresh_post_arc', when: /post_arc|PRE_BUILD|builder_sim/i, action: 'refresh_post_arc_receipts' },
  { id: 'rerun_builder', when: /builder|execute|TECHNICAL_PASS/i, action: 'rerun_builder_execute' },
  { id: 'doctrine_patch', when: /doctrine|SNT|evidence_if_wrong/i, action: 'repair_snt_doctrine' },
  { id: 'roadmap_unblock', when: /roadmap|FUTURE P/i, action: 'roadmap_builder_ready' },
  { id: 'bp_enqueue', when: /BP_PRIORITY|not_on_queue/i, action: 'ensure_bp_priority' },
  { id: 'founder_scaffold', when: /founder packet|FOUNDER_PACKET/i, action: 'scaffold_founder_packet' },
];

function pickRoute(violations = []) {
  const blob = violations.join(' ');
  for (const strategy of ROUTE_STRATEGIES) {
    if (strategy.when.test(blob)) return strategy;
  }
  return { id: 'bootstrap_full', when: /.*/, action: 'bootstrap_development_intake' };
}

function nextFixSteps(route, violations) {
  const base = [
    `Route strategy: ${route.id} (${route.action})`,
    'Re-run failed phase after adjustment',
    'Verify receipt shows movement toward Point B (LifeRE Alpha)',
  ];
  if (/acceptance/i.test(violations.join(' '))) {
    base.push('Run acceptance command; fix failing assertion before claiming progress');
  }
  return base;
}

export function recordObstacle(missionFolder, {
  phase,
  violations = [],
  result = null,
  attempt = 0,
  kind = 'phase_fail',
}) {
  const missionId = path.basename(missionFolder);
  const target = loadPointBTarget();
  const route = pickRoute(violations);
  const ledgerPath = path.join(missionFolder, 'receipts/OBSTACLE_LESSON_LEDGER.json');
  const ledger = loadJson(ledgerPath, {
    schema: 'obstacle_lesson_ledger_v1',
    mission_id: missionId,
    point_b_target: target?.label || 'LifeRE Alpha',
    obstacles: [],
  });

  const obstacle = {
    obstacle_id: `obs_${Date.now()}_${attempt}`,
    at: new Date().toISOString(),
    kind,
    phase,
    attempt,
    what_happened: violations.length ? violations.join('; ') : (result?.error || 'phase returned not ok'),
    lesson: `Obstacle in ${phase} — not a stop condition. Point B remains ${target?.label || 'LifeRE Alpha'}.`,
    route_strategy: route.id,
    route_action: route.action,
    fix_steps: nextFixSteps(route, violations),
    system_adjustment: {
      action: route.action,
      efficiency_note: 'Prefer shortest mechanical repair before re-running expensive builder',
      recorded_for: 'next_repair_attempt',
    },
    point_b_status: 'not_reached',
    stopping_is_failure: true,
  };

  ledger.obstacles.push(obstacle);
  ledger.last_obstacle = obstacle.obstacle_id;
  ledger.obstacle_count = ledger.obstacles.length;
  ledger.updated_at = obstacle.at;
  writeJson(ledgerPath, ledger);

  const assumptionsPath = path.join(missionFolder, 'KNOWN_ASSUMPTIONS.json');
  const assumptions = loadJson(assumptionsPath, { schema: 'known_assumptions_v1', mission_id: missionId, assumptions: [] });
  assumptions.assumptions = assumptions.assumptions || [];
  assumptions.assumptions.push({
    id: `OBS-${ledger.obstacle_count}`,
    assumption: obstacle.lesson,
    confidence: 'KNOW',
    source: 'obstacle-lesson-loop',
    route: route.id,
  });
  assumptions.updated_at = obstacle.at;
  writeJson(assumptionsPath, assumptions);

  return obstacle;
}

export function recordCookingSliceObstacle(missionFolder, { phase, slice, sliceSize, totalAttempts }) {
  return recordObstacle(missionFolder, {
    phase,
    attempt: totalAttempts,
    kind: 'cooking_slice_exhausted',
    violations: [
      `cooking_slice_exhausted slice=${slice} size=${sliceSize} total=${totalAttempts}`,
      'Stopping is failure — opening new slice and continuing',
    ],
  });
}

export function loadObstacleLedger(missionFolder) {
  return loadJson(path.join(missionFolder, 'receipts/OBSTACLE_LESSON_LEDGER.json'), { obstacles: [] });
}

export function applySystemAdjustments(missionFolder, obstacle) {
  const adjPath = path.join(missionFolder, 'receipts/SYSTEM_ADJUSTMENT_LOG.json');
  const log = loadJson(adjPath, { schema: 'system_adjustment_log_v1', adjustments: [] });
  log.adjustments.push({
    at: new Date().toISOString(),
    obstacle_id: obstacle.obstacle_id,
    action: obstacle.system_adjustment?.action,
    route: obstacle.route_strategy,
    efficiency: obstacle.system_adjustment?.efficiency_note,
  });
  log.last_adjustment = obstacle.system_adjustment?.action;
  writeJson(adjPath, log);
  return log;
}
