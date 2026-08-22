#!/usr/bin/env node
/**
 * SYNOPSIS: Fail-closed verifier for Three Creations, free-first routing, and 1+1=3 recovery governance.
 */
import fs from 'node:fs';

const required = [
  'docs/constitution/INTELLIGENCE_ECONOMY_AND_THREE_CREATIONS.md',
  'builderos-reboot/governance/INTELLIGENCE_ROUTING_CONTRACT.json',
  'builderos-reboot/LOOP_ESCALATION_CONTRACT.json',
  'docs/CHATGPT_CONTEXT_CAPSULE.md',
  'services/builderos-model-escalation-gate.js'
];

const fail = (msg) => { console.error(`[intelligence-routing-governance] FAIL: ${msg}`); process.exit(1); };
for (const p of required) if (!fs.existsSync(p)) fail(`missing ${p}`);

const contract = JSON.parse(fs.readFileSync('builderos-reboot/governance/INTELLIGENCE_ROUTING_CONTRACT.json', 'utf8'));
if (contract.enforcement !== 'HARD_FAIL_CLOSED') fail('routing contract must be HARD_FAIL_CLOSED');
if (!contract.problem_trigger?.material_failure_requires_1_plus_1_equals_3) fail('material failure must trigger 1+1=3');
if ((contract.problem_trigger?.minimum_independent_perspectives_when_available || 0) < 2) fail('1+1=3 requires >=2 independent perspectives when available');
if (!contract.economy?.free_before_paid) fail('free_before_paid must be true');
if (!contract.economy?.paid_requires_receipt) fail('paid escalation receipt must be required');

const doctrine = fs.readFileSync('docs/constitution/INTELLIGENCE_ECONOMY_AND_THREE_CREATIONS.md', 'utf8');
for (const phrase of ['Creation I', 'Creation II', 'Creation III', 'Problem => 1+1=3', 'Free-first intelligence economy', 'Lower-model prevention test']) {
  if (!doctrine.includes(phrase)) fail(`doctrine missing ${phrase}`);
}

const capsule = fs.readFileSync('docs/CHATGPT_CONTEXT_CAPSULE.md', 'utf8');
for (const p of ['LOOP_ESCALATION_CONTRACT.json', 'INTELLIGENCE_ROUTING_CONTRACT.json']) {
  if (!capsule.includes(p)) fail(`context capsule does not load ${p}`);
}

const gate = fs.readFileSync('services/builderos-model-escalation-gate.js', 'utf8');
if (!gate.includes('FREE_ESCALATION_TIERS')) fail('runtime escalation gate does not expose FREE_ESCALATION_TIERS');
if (!gate.includes('PAID_ESCALATION_TIERS')) fail('runtime escalation gate does not separate PAID_ESCALATION_TIERS');

console.log('[intelligence-routing-governance] PASS');
