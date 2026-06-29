/**
 * SYNOPSIS: Full V2 intent coverage dimensions per FOUNDER_PACKET_V2.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import fs from 'node:fs';
import path from 'node:path';

export const TIER1_LOAD_BEARING = [
  'outcome', 'user', 'pain', 'value', 'success_metric', 'failure_metric',
  'done_definition', 'scope_boundary', 'constraints', 'unacceptable_result',
  'ownership', 'priority_fit',
];

export const TIER2_DIMENSIONS = [
  'behavior_change', 'tradeoffs', 'alternatives', 'assumptions', 'evidence_needed',
  'risk', 'dependencies', 'stage_target', 'rollback_condition', 'competing_intents',
  'market_reality', 'future_implications', 'alpha_learning_target', 'release_boundary',
];

export const ALL_DIMENSIONS = [...TIER1_LOAD_BEARING, ...TIER2_DIMENSIONS];

function section(text, heading) {
  const re = new RegExp(`##+\\s*${heading}[\\s\\S]*?(?=\\n##|$)`, 'i');
  const m = text.match(re);
  return m ? m[0].replace(/^##[^\n]*\n?/, '').trim() : '';
}

function levelFor(name, founderText, baseline, queueEntry) {
  const fp = founderText.toLowerCase();
  const has = (re) => re.test(founderText);

  const map = {
    outcome: has(/desired outcome|founder success/i) || baseline?.outcome_statement,
    user: has(/adam|founder|user/i) || baseline?.user,
    pain: has(/##\s*problem/i) || baseline?.pain,
    value: has(/desired outcome|value/i) || baseline?.value,
    success_metric: has(/founder success test|pass criteria/i) || baseline?.success_metrics?.length,
    failure_metric: has(/unacceptable|failure|never auto/i) || baseline?.failure_metrics?.length,
    done_definition: has(/acceptance|pass criteria|npm run/i),
    scope_boundary: has(/out of scope|scope|boundary/i) || baseline?.scope_boundary,
    constraints: has(/locked|rule|non-negotiable|constraint/i) || baseline?.constraints?.length,
    unacceptable_result: has(/unacceptable|never auto|must not/i) || baseline?.unacceptable_result,
    ownership: has(/authority|owner/i) || baseline?.ownership,
    priority_fit: typeof queueEntry?.rank === 'number',
    behavior_change: has(/approve|staging|trust|see staged/i),
    tradeoffs: has(/tradeoff|vs\.|instead/i),
    alternatives: has(/alternative|option/i),
    assumptions: has(/assume|trust that/i),
    evidence_needed: has(/receipt|acceptance|prove/i),
    risk: has(/lost|never auto|private|risk/i),
    dependencies: has(/voice rail|builder|depends/i),
    stage_target: has(/v1|alpha|v2/i),
    rollback_condition: has(/dismiss|reject|fail/i),
    competing_intents: has(/out of scope/i),
    market_reality: 'PARKED',
    future_implications: has(/v2|future|later/i) ? 'PARTIAL' : 'PARKED',
    alpha_learning_target: has(/founder success test/i),
    release_boundary: has(/v1|out of scope/i),
  };

  const v = map[name];
  if (v === 'PARKED') return { level: 'PARKED', load_bearing: false };
  if (v && v !== 'PARTIAL' && v !== 'PARKED') return { level: 'SUFFICIENT', load_bearing: TIER1_LOAD_BEARING.includes(name) };
  if (v === 'PARTIAL') return { level: 'PARTIAL', load_bearing: TIER1_LOAD_BEARING.includes(name) };
  if (TIER1_LOAD_BEARING.includes(name)) return { level: 'MISSING', load_bearing: true };
  return { level: 'PARTIAL', load_bearing: false };
}

export function buildFullCoverageMap(missionId, founderText, baseline, queueEntry) {
  const dimensions = [];
  for (const name of ALL_DIMENSIONS) {
    const spec = levelFor(name, founderText, baseline, queueEntry);
    dimensions.push({
      name,
      coverage_level: spec.level,
      load_bearing: spec.load_bearing,
      evidence_refs: spec.level === 'PARKED' ? ['deferred_v1'] : ['FOUNDER_PACKET.md', 'INTENT_BASELINE.json'],
      ...(spec.level === 'PARKED'
        ? { parked_reason: 'Not required for v1 internal product lap', parked_owner: 'Chair', parked_due_at: 'RELEASE_PASS' }
        : {}),
    });
  }
  dimensions.push({
    name: 'sherry_household',
    coverage_level: 'PARKED',
    load_bearing: false,
    parked_reason: 'SHERRY_FILTER_PARK_RECEIPT',
    parked_owner: 'Studio',
  });

  const blocking = dimensions.filter(
    (d) => d.load_bearing && ['MISSING', 'MENTIONED'].includes(d.coverage_level),
  );

  return {
    schema: 'intent_coverage_map_v2',
    intent_id: missionId,
    tier: 1,
    updated_at: new Date().toISOString().slice(0, 10),
    snt_regrade_required: false,
    dimensions,
    summary: {
      tier1_load_bearing_ready: blocking.length === 0,
      blocking_gaps: blocking.map((d) => `${d.name}:${d.coverage_level}`),
    },
  };
}

export function writeCoverageMap(missionFolder, map) {
  const out = path.join(missionFolder, 'INTENT_COVERAGE_MAP.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(map, null, 2)}\n`);
  return out;
}

export function readFounderText(missionFolder) {
  const md = path.join(missionFolder, 'FOUNDER_PACKET.md');
  const json = path.join(missionFolder, 'FOUNDER_PACKET.json');
  if (fs.existsSync(md)) return fs.readFileSync(md, 'utf8');
  if (fs.existsSync(json)) return JSON.stringify(JSON.parse(fs.readFileSync(json, 'utf8')), null, 2);
  return '';
}
