/**
 * SYNOPSIS: BuilderOS Phase R3 — component maturity gap navigator.
 * @ssot docs/projects/BUILDEROS_ALPHA_BLUEPRINT.md
 * BuilderOS Phase R3 — component maturity gap navigator.
 *
 * READ-ONLY diagnostic. Reads COMPONENT_MATURITY_MAP (hardcoded from OIL audit
 * snapshot), computes gap scores, ranks components by distance from ACTIVE,
 * writes data/builderos-gap-report.json and prints to stdout.
 *
 * GAP-FILL: builder (groq_llama) produced 4-bug output — writeFileSync not
 * imported, CLI entry point missing, wrong data source (used overnight state
 * keys as component IDs), COMPONENT_MATURITY_MAP defined but never used.
 * Rewritten directly.
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(fileURLToPath(import.meta.url), '../..');

const MATURITY_LEVELS = ['NOT_WIRED', 'WIRED', 'LIVE', 'PROVEN', 'ACTIVE'];

// Snapshot from OIL audit — update after each governed round
const COMPONENT_MATURITY_MAP = {
  builder:             ['WIRED', 'LIVE', 'PROVEN'],
  oil:                 ['WIRED', 'LIVE', 'PROVEN', 'ACTIVE'],
  council:             ['WIRED', 'LIVE', 'PROVEN'],
  tsos_internal_hooks: ['WIRED', 'LIVE'],
  memory:              ['WIRED', 'LIVE', 'PROVEN'],
  pb_authority:        ['WIRED', 'LIVE', 'PROVEN'],
  proof_freshness:     ['WIRED', 'LIVE', 'PROVEN', 'ACTIVE'],
  self_repair:         ['WIRED', 'LIVE', 'PROVEN'],
  prevention:          ['WIRED', 'LIVE', 'PROVEN', 'ACTIVE'],
  telemetry:           ['WIRED', 'LIVE', 'PROVEN', 'ACTIVE'],
  overnight_runner:    ['WIRED', 'LIVE', 'PROVEN', 'ACTIVE'], // R3: state committed
  command_center:      ['WIRED', 'LIVE', 'PROVEN'],
};

const KNOWN_BLOCKERS = {
  tsos_internal_hooks: 'no PROVEN condition in alpha readiness service — needs service edit (Zone 3)',
  builder:             'no ACTIVE condition wired in alpha readiness service',
  council:             'no ACTIVE condition wired in alpha readiness service',
  command_center:      'legacy /command-center surface noted in fake_green_risk',
};

export function generateGapReport() {
  const gaps = Object.entries(COMPONENT_MATURITY_MAP).map(([id, statuses]) => {
    const maxIdx = Math.max(...statuses.map((s) => MATURITY_LEVELS.indexOf(s)));
    const currentMaturity = MATURITY_LEVELS[maxIdx] || 'NOT_WIRED';
    const nextIdx = maxIdx + 1 < MATURITY_LEVELS.length ? maxIdx + 1 : null;
    const nextNeeded = nextIdx !== null ? MATURITY_LEVELS[nextIdx] : null;
    const gapScore = 4 - maxIdx; // 0 = ACTIVE (complete), 4 = NOT_WIRED
    return {
      component_id: id,
      current_maturity: currentMaturity,
      next_needed: nextNeeded,
      gap_score: gapScore,
      known_blocker: KNOWN_BLOCKERS[id] || null,
    };
  }).sort((a, b) => b.gap_score - a.gap_score);

  const summary = {
    total_components: gaps.length,
    active_count:    gaps.filter((g) => g.gap_score === 0).length,
    proven_count:    gaps.filter((g) => g.gap_score === 1).length,
    live_count:      gaps.filter((g) => g.gap_score === 2).length,
    wired_only_count: gaps.filter((g) => g.gap_score === 3).length,
    not_wired_count: gaps.filter((g) => g.gap_score === 4).length,
  };

  const result = { generated_at: new Date().toISOString(), summary, gaps };

  try {
    writeFileSync(join(ROOT, 'data', 'builderos-gap-report.json'), JSON.stringify(result, null, 2));
  } catch { /* non-fatal — stdout still works */ }

  return result;
}

// CLI entry point
const result = generateGapReport();
console.log(JSON.stringify(result, null, 2));
