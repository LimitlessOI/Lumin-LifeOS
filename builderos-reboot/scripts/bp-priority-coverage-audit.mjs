/**
 * SYNOPSIS: STEP 5d — the batch validation the Chair demanded BEFORE any fence
 * flip (live council receipt LIFERE_COUNCIL_1783453514819: "SENTRY/Century should
 * validate the spec extraction on a representative batch before any fence flip").
 * Walks every mission in builderos-reboot/BP_PRIORITY.json, derives an
 * assertion_spec from each step's BLUEPRINT.json via the pure BPB derivation
 * layer, and reports per-mission coverage: how many steps the governed pipe could
 * PROVE vs how many are silent COVERAGE GAPS (server-code steps with no verifiable
 * expectation). Non-fabricating — it surfaces gaps, it does not invent proof.
 * Exit non-zero only on read/parse failure; the gap census is informational so
 * the founder + Chair can decide the flip with eyes open.
 *
 * Usage: node builderos-reboot/scripts/bp-priority-coverage-audit.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { auditBlueprintCoverage } from '../../factory-staging/factory-core/bpb/derive-assertion-spec.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'));
const resolveSource = (rel) => {
  try { return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8'); } catch { return null; }
};

const bp = readJson('builderos-reboot/BP_PRIORITY.json');
const items = Array.isArray(bp.items) ? bp.items : [];

let totalSteps = 0;
let totalProvable = 0;
let totalGaps = 0;
const missionReports = [];

for (const item of items) {
  const bpPath = item.blueprint_path;
  if (!bpPath) continue;
  let blueprint;
  try {
    blueprint = readJson(bpPath);
  } catch (err) {
    missionReports.push({ mission_id: item.mission_id, rank: item.rank, error: `blueprint_unreadable: ${err.message}` });
    continue;
  }
  const audit = auditBlueprintCoverage(blueprint, resolveSource);
  totalSteps += audit.total;
  totalProvable += audit.provable;
  totalGaps += audit.gaps;
  missionReports.push({ rank: item.rank, ...audit });
}

console.log('=== BP_PRIORITY GOVERNED-PIPE COVERAGE AUDIT ===\n');
for (const r of missionReports) {
  if (r.error) {
    console.log(`rank ${r.rank ?? '?'}  ${r.mission_id}  ⚠️  ${r.error}`);
    continue;
  }
  const flag = r.gaps > 0 ? '⚠️ GAPS' : '✅';
  console.log(`rank ${r.rank ?? '?'}  ${r.mission_id}  ${flag}  total=${r.total} provable=${r.provable} gaps=${r.gaps}  coverage=${JSON.stringify(r.by_coverage)}`);
  for (const g of r.gap_steps) {
    console.log(`      GAP[${g.gap_kind}]  ${g.step_id}  (${g.action_type})  ${g.target_file}`);
  }
}

const pct = totalSteps > 0 ? Math.round((totalProvable / totalSteps) * 100) : 0;
console.log(`\nSUMMARY: ${items.length} missions, ${totalSteps} steps — ${totalProvable} provable (${pct}%), ${totalGaps} coverage gaps.`);
console.log(totalGaps > 0
  ? `\nVERDICT: ${totalGaps} server-code steps cannot yet be proven from their blueprint. These MUST get mission-authored assertion_spec (or be converted to exact_content) before GOVERNED_FACTORY_ONLY=1, or the governed runner would halt them fail-closed. This is the Chair's #1 pre-flip risk, now measured.`
  : `\nVERDICT: every step is provable by the governed pipe — no silent coverage gaps.`);

// Informational census: never fail CI on gap count (gaps are the point of the audit).
process.exit(0);
