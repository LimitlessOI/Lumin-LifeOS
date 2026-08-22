#!/usr/bin/env node
/** SYNOPSIS: Deterministic guard for canonical officer staffing and governed capability routing. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { modelRoutingForChannel } from '../services/lumin-chair-orchestrator.js';
import { FLOOR_PROTECTED_CHANNELS, OFFICER_STAFF, STAFF_TIER, TIER_RANK, TIER_FLOOR, TASK_CLASS, isTierPermitted } from '../config/officer-staff.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RECEIPT_REL = 'products/receipts/OFFICER_STAFFING_RECEIPT.json';

/**
 * Legacy router labels cheap/medium/strong are treated only as transport-era
 * labels. They cannot authorize spend or define capability. Protected channels
 * must enter central governed selection regardless of the legacy label.
 */
const ROUTER_TIER_TO_STAFF_TIER = Object.freeze({
  cheap: STAFF_TIER.GOVERNED_MODEL,
  medium: STAFF_TIER.GOVERNED_MODEL,
  strong: STAFF_TIER.GOVERNED_MODEL,
});

export function auditChannelFloors() {
  const findings = [];
  for (const channel of FLOOR_PROTECTED_CHANNELS) {
    let routing;
    try {
      routing = modelRoutingForChannel(channel);
    } catch (error) {
      findings.push({ id: 'PROTECTED_CHANNEL_UNROUTABLE', channel, detail: String(error?.message || error) });
      continue;
    }
    const mapped = ROUTER_TIER_TO_STAFF_TIER[routing.estimated_cost_tier] ?? null;
    if (!mapped) {
      findings.push({ id: 'UNMAPPED_ROUTER_TIER', channel, router_tier: routing.estimated_cost_tier });
      continue;
    }
    const verdict = isTierPermitted(TASK_CLASS.JUDGMENT, mapped);
    if (!verdict.permitted) findings.push({ id: 'LOAD_BEARING_CHANNEL_ROUTED_BELOW_FLOOR', channel, floor: verdict.floor });
  }
  return findings;
}

export function auditStaffAssignments() {
  const findings = [];
  for (const [officer, spec] of Object.entries(OFFICER_STAFF)) {
    for (const duty of spec.staff_may) {
      if (TIER_RANK[duty.tier] === undefined) findings.push({ id: 'UNKNOWN_STAFF_TIER', officer, task: duty.task, tier: duty.tier });
      if (duty.implemented_by && !fs.existsSync(path.join(ROOT, duty.implemented_by))) findings.push({ id: 'STAFF_IMPLEMENTATION_MISSING', officer, task: duty.task, implemented_by: duty.implemented_by });
    }
    if (!Array.isArray(spec.judgment_reserved_to_officer) || spec.judgment_reserved_to_officer.length === 0) findings.push({ id: 'OFFICE_RESERVES_NO_JUDGMENT', officer });
  }
  if ('CHEAP_MODEL' in STAFF_TIER || 'STRONG_MODEL' in STAFF_TIER) findings.push({ id: 'LEGACY_PRICE_AS_CAPABILITY_TIER_PRESENT' });
  if (FLOOR_PROTECTED_CHANNELS.includes('chair')) findings.push({ id: 'LEGACY_CHAIR_CHANNEL_PRESENT' });
  return findings;
}

function main() {
  const findings = [...auditChannelFloors(), ...auditStaffAssignments()];
  const deterministicDuties = Object.values(OFFICER_STAFF).flatMap((s) => s.staff_may.filter((d) => d.tier === STAFF_TIER.DETERMINISTIC));
  const receipt = {
    schema: 'officer_staffing_receipt_v2',
    generated_at: new Date().toISOString(),
    produced_by: 'scripts/verify-officer-staffing.mjs',
    purpose: 'Proves officer boundaries remain intact and legacy price-as-capability staffing cannot silently become authority.',
    controlling_routing_contract: 'builderos-reboot/governance/INTELLIGENCE_ROUTING_CONTRACT.json',
    independent_reproduction_command: 'node scripts/verify-officer-staffing.mjs',
    floors: TIER_FLOOR,
    offices_audited: Object.keys(OFFICER_STAFF).length,
    duties_audited: Object.values(OFFICER_STAFF).reduce((n, s) => n + s.staff_may.length, 0),
    zero_token_duties: deterministicDuties.length,
    findings,
    verdict: findings.length === 0 ? 'CLEAN' : 'GOVERNANCE_VIOLATIONS_PRESENT',
  };
  const abs = path.join(ROOT, RECEIPT_REL);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(`officer staffing: ${receipt.offices_audited} offices, ${receipt.duties_audited} duties — ${receipt.verdict}`);
  for (const f of findings) console.log(`  ${f.id}: ${f.channel || f.officer || ''} ${f.detail || ''}`);
  if (findings.length > 0) process.exit(1);
}

if (process.argv[1] && process.argv[1].endsWith('verify-officer-staffing.mjs')) main();
