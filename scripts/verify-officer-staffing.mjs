#!/usr/bin/env node
/**
 * SYNOPSIS: Deterministic guard that SO-003's floor is real. Reads the live
 * channel router and refuses any load-bearing channel routed below its tier
 * floor.
 *
 * This script is itself an example of the thing it checks: an officer's cheapest
 * assistant doing the officer's checking for zero tokens. SO-003 was previously
 * enforced by a code comment, which is not enforcement — the comment cannot
 * fail a build.
 *
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { modelRoutingForChannel } from '../services/lumin-chair-orchestrator.js';
import {
  FLOOR_PROTECTED_CHANNELS,
  OFFICER_STAFF,
  STAFF_TIER,
  TIER_RANK,
  TIER_FLOOR,
  TASK_CLASS,
  isTierPermitted,
} from '../config/officer-staff.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT_REL = 'products/receipts/OFFICER_STAFFING_RECEIPT.json';

/** The router speaks cheap/medium/strong; the ladder speaks tiers. One map, stated once. */
const ROUTER_TIER_TO_STAFF_TIER = Object.freeze({
  cheap: STAFF_TIER.CHEAP_MODEL,
  medium: STAFF_TIER.CHEAP_MODEL,
  strong: STAFF_TIER.STRONG_MODEL,
});

export function auditChannelFloors() {
  const findings = [];
  for (const channel of FLOOR_PROTECTED_CHANNELS) {
    const routing = modelRoutingForChannel(channel);
    const mapped = ROUTER_TIER_TO_STAFF_TIER[routing.estimated_cost_tier] ?? null;
    if (!mapped) {
      findings.push({ id: 'UNMAPPED_ROUTER_TIER', channel, router_tier: routing.estimated_cost_tier });
      continue;
    }
    // A load-bearing channel is JUDGMENT by definition — that is what makes it
    // load-bearing — so it inherits the judgment floor.
    const verdict = isTierPermitted(TASK_CLASS.JUDGMENT, mapped);
    if (!verdict.permitted) {
      findings.push({
        id: 'LOAD_BEARING_CHANNEL_ROUTED_BELOW_FLOOR',
        channel,
        router_tier: routing.estimated_cost_tier,
        resolved_tier: mapped,
        floor: verdict.floor,
        detail: 'SO-003: a cheap or canned answer to a load-bearing reasoning request is a wrong answer delivered efficiently.',
      });
    }
  }
  return findings;
}

/** Staff assignments must respect the same floors the officers do. */
export function auditStaffAssignments() {
  const findings = [];
  for (const [officer, spec] of Object.entries(OFFICER_STAFF)) {
    for (const duty of spec.staff_may) {
      if (TIER_RANK[duty.tier] === undefined) {
        findings.push({ id: 'UNKNOWN_STAFF_TIER', officer, task: duty.task, tier: duty.tier });
      }
      // A duty naming a real implementation must name one that exists, or the
      // ladder is describing capacity it does not have.
      if (duty.implemented_by && !fs.existsSync(path.join(ROOT, duty.implemented_by))) {
        findings.push({ id: 'STAFF_IMPLEMENTATION_MISSING', officer, task: duty.task, implemented_by: duty.implemented_by });
      }
    }
    if (!Array.isArray(spec.judgment_reserved_to_officer) || spec.judgment_reserved_to_officer.length === 0) {
      findings.push({ id: 'OFFICE_RESERVES_NO_JUDGMENT', officer, detail: 'An office whose staff may decide everything is not an office.' });
    }
  }
  return findings;
}

function main() {
  const findings = [...auditChannelFloors(), ...auditStaffAssignments()];
  const deterministicDuties = Object.values(OFFICER_STAFF).flatMap((s) =>
    s.staff_may.filter((d) => d.tier === STAFF_TIER.DETERMINISTIC)
  );

  const receipt = {
    schema: 'officer_staffing_receipt_v1',
    generated_at: new Date().toISOString(),
    produced_by: 'scripts/verify-officer-staffing.mjs',
    purpose:
      'Proves SO-003 mechanically rather than by comment: no load-bearing channel may be routed below the judgment floor, and no staff duty may claim an implementation that does not exist.',
    independent_reproduction_command: 'node scripts/verify-officer-staffing.mjs',
    floors: TIER_FLOOR,
    offices_audited: Object.keys(OFFICER_STAFF).length,
    duties_audited: Object.values(OFFICER_STAFF).reduce((n, s) => n + s.staff_may.length, 0),
    zero_token_duties: deterministicDuties.length,
    findings,
    verdict: findings.length === 0 ? 'CLEAN' : 'FLOOR_VIOLATIONS_PRESENT',
  };

  const abs = path.join(ROOT, RECEIPT_REL);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(
    `officer staffing: ${receipt.offices_audited} offices, ${receipt.duties_audited} duties, ` +
      `${receipt.zero_token_duties} answerable with zero tokens — ${receipt.verdict}`
  );
  for (const f of findings) console.log(`  ${f.id}: ${f.channel || f.officer} ${f.detail || ''}`);
  if (findings.length > 0) process.exit(1);
}

if (process.argv[1] && process.argv[1].endsWith('verify-officer-staffing.mjs')) {
  main();
}
