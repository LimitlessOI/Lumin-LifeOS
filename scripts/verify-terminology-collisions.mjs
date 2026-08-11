#!/usr/bin/env node
/**
 * SYNOPSIS: Deterministic guard for OPEN-6. "Conductor" named two unrelated
 * things at once — the constitutional office, and a mechanical session-supervisor
 * role — so a governance document could say "the Conductor must seal this" and a
 * reader could not tell which of the two was meant. The founder resolved it: the
 * office keeps the name, the mechanical role is renamed.
 *
 * A rename is only finished when it cannot come back. This flags NEW uses of the
 * collided sense against a pinned baseline of as-is occurrences, so existing
 * physical names (a live table cannot be renamed without a governed migration)
 * stay recorded and visible instead of quietly becoming permanent.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCodeIndex, buildClaimIndex, ROOT } from './lib/reference-index.mjs';

const BASELINE_REL = 'data/terminology-collision-baseline.json';
const RECEIPT_REL = 'products/receipts/TERMINOLOGY_COLLISION_RECEIPT.json';

/**
 * Markers of the session-supervisor sense specifically. Deliberately narrow: the
 * constitutional office is supposed to appear everywhere, so a bare "Conductor"
 * is not a finding. Only the collided sense is.
 */
const COLLISION_PATTERNS = [
  { id: 'conductorSession_identifier', re: /\bconductorSession\b/g },
  { id: 'conductor_session_table', re: /\bconductor_session_savings\b/g },
  { id: 'conductor_builder_audit_table', re: /\bconductor_builder_audit\b/g },
  { id: 'conductor_cold_start_prose', re: /Conductor cold[- ]start/gi },
  { id: 'conductor_as_ide_agent', re: /Conductor\s*\((?:the\s*)?(?:IDE|Cursor|chat)\s*agent\)/gi },
];

const SKIP = [
  'node_modules/',
  'docs/history/',
  'data/terminology-collision-baseline.json',
  'products/receipts/TERMINOLOGY_COLLISION_RECEIPT.json',
  'scripts/verify-terminology-collisions.mjs',
  // The bridge is the registry OF this collision. It has to be able to name the
  // terms it resolves, exactly like the baseline file above.
  'builderos-reboot/governance/TERMINOLOGY_BRIDGE.json',
  'REPO_FILE_SYNOPSIS_INDEX.json',
];

export function scanCollisions() {
  const findings = [];
  const files = [...buildCodeIndex(), ...buildClaimIndex()];
  for (const f of files) {
    if (SKIP.some((s) => f.rel.includes(s))) continue;
    const text = f.content || '';
    if (!text) continue;
    for (const p of COLLISION_PATTERNS) {
      const matches = text.match(p.re);
      if (matches?.length) {
        findings.push({ id: `${p.id}:${f.rel}`, pattern: p.id, file: f.rel, occurrences: matches.length });
      }
    }
  }
  return findings.sort((a, b) => a.id.localeCompare(b.id));
}

function main() {
  const ci = process.argv.includes('--ci');
  const writeBaseline = process.argv.includes('--baseline-write');
  const findings = scanCollisions();
  const baselineAbs = path.join(ROOT, BASELINE_REL);

  let baseline = { ids: [] };
  if (fs.existsSync(baselineAbs)) baseline = JSON.parse(fs.readFileSync(baselineAbs, 'utf8'));

  const known = new Set(baseline.ids || []);
  const newOnes = findings.filter((f) => !known.has(f.id));
  const gone = [...known].filter((id) => !findings.some((f) => f.id === id));

  if (writeBaseline) {
    fs.mkdirSync(path.dirname(baselineAbs), { recursive: true });
    fs.writeFileSync(
      baselineAbs,
      `${JSON.stringify(
        {
          schema: 'terminology_collision_baseline_v1',
          purpose:
            'As-is occurrences of the collided "Conductor" sense (OPEN-6). Physical table names stay until a governed migration renames them; this file keeps them visible rather than letting them become permanent by silence.',
          updated_at: new Date().toISOString().slice(0, 10),
          count: findings.length,
          ids: findings.map((f) => f.id),
        },
        null,
        2
      )}\n`
    );
  }

  const receipt = {
    schema: 'terminology_collision_receipt_v1',
    generated_at: new Date().toISOString(),
    produced_by: 'scripts/verify-terminology-collisions.mjs',
    resolution: 'OPEN-6: the constitutional office keeps the name Conductor; the mechanical session-supervisor role was renamed to Session Supervisor.',
    verdict: newOnes.length === 0 ? 'NO_NEW_COLLISIONS' : 'NEW_COLLISIONS_PRESENT',
    total_occurrences: findings.length,
    new_collisions: newOnes,
    resolved_since_baseline: gone,
    remaining: findings,
    remaining_note:
      'Remaining entries are physical names (DB tables) and historical receipts. Renaming a live table requires a governed migration and coordinated deploy, which is deliberately not done as a side effect of a naming fix.',
  };
  const receiptAbs = path.join(ROOT, RECEIPT_REL);
  fs.mkdirSync(path.dirname(receiptAbs), { recursive: true });
  fs.writeFileSync(receiptAbs, `${JSON.stringify(receipt, null, 2)}\n`);

  console.log(
    JSON.stringify(
      { verdict: receipt.verdict, total: findings.length, new: newOnes.map((f) => f.id), resolved: gone, receipt: RECEIPT_REL },
      null,
      2
    )
  );
  if (ci && newOnes.length > 0) process.exit(1);
}

if (process.argv[1] && process.argv[1].endsWith('verify-terminology-collisions.mjs')) {
  main();
}
