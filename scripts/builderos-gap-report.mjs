// scripts/builderos-gap-report.mjs
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(fileURLToPath(import.meta.url), '../..');

const tryCatch = (fn) => {
  try {
    return fn();
  } catch (error) {
    return null;
  }
};

const readData = (filePath) => tryCatch(() => readFileSync(join(ROOT, filePath), 'utf8'));

const generateGapReport = () => {
  const usefulWorkGuardAuditResults = JSON.parse(readData('data/useful-work-guard-audit-results.json'));
  const governedAutonomyOvernightState = JSON.parse(readData('data/governed-autonomy-overnight-state.json'));

  const COMPONENT_MATURITY_MAP = {
    builder: ['WIRED', 'LIVE', 'PROVEN'],
    oil: ['WIRED', 'LIVE', 'PROVEN', 'ACTIVE'],
    council: ['WIRED', 'LIVE', 'PROVEN'],
    'tsos_internal_hooks': ['WIRED', 'LIVE'],
    memory: ['WIRED', 'LIVE', 'PROVEN'],
    'pb_authority': ['WIRED', 'LIVE', 'PROVEN'],
    'proof_freshness': ['WIRED', 'LIVE', 'PROVEN', 'ACTIVE'],
    'self_repair': ['WIRED', 'LIVE', 'PROVEN'],
    'prevention': ['WIRED', 'LIVE', 'PROVEN', 'ACTIVE'],
    telemetry: ['WIRED', 'LIVE', 'PROVEN', 'ACTIVE'],
    'overnight_runner': ['WIRED'],
    'command_center': ['WIRED', 'LIVE', 'PROVEN'],
  };

  const MATURITY_LEVELS = ['NOT_WIRED', 'WIRED', 'LIVE', 'PROVEN', 'ACTIVE'];

  const perComp = {};
  Object.keys(governedAutonomyOvernightState).forEach((componentId) => {
    const currentLevel = MATURITY_LEVELS.indexOf(governedAutonomyOvernightState[componentId].status);
    const nextLevel = currentLevel + 1 < MATURITY_LEVELS.length ? currentLevel + 1 : null;
    const gapScore = 4 - currentLevel;
    perComp[componentId] = {
      current_maturity: governedAutonomyOvernightState[componentId].status,
      next_needed: nextLevel,
      gap_score: gapScore,
      known_blocker: getKnownBlocker(componentId),
    };
  });

  const result = {
    generated_at: new Date().toISOString(),
    summary: {
      total_components: Object.keys(perComp).length,
      active_count: Object.values(perComp).filter((c) => c.gap_score === 0).length,
      proven_count: Object.values(perComp).filter((c) => c.gap_score === 1).length,
      live_count: Object.values(perComp).filter((c) => c.gap_score === 2).length,
      wired_only_count: Object.values(perComp).filter((c) => c.gap_score === 3).length,
    },
    gaps: Object.values(perComp).sort((a, b) => b.gap_score - a.gap_score),
  };

  writeFileSync(join(ROOT, 'data/builderos-gap-report.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));

  return result;
};

const getKnownBlocker = (componentId) => {
  switch (componentId) {
    case 'overnight_runner':
      return 'state files missing on Railway FS';
    case 'tsos_internal_hooks':
      return 'no PROVEN condition in alpha readiness service';
    case 'builder':
      return 'no ACTIVE condition in alpha readiness service';
    case 'council':
      return 'no ACTIVE condition in alpha readiness service';
    default:
      return 'gap not yet analyzed';
  }
};

export { generateGapReport };

// @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md