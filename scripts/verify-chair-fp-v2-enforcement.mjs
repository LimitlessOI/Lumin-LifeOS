#!/usr/bin/env node
/**
 * SYNOPSIS: Verifies Founder Packet V2 hard enforcement on live Lumin Chair.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function fail(msg) {
  console.error(`CHAIR_FP_V2_ENFORCEMENT_FAIL: ${msg}`);
  process.exit(1);
}

const matrix = JSON.parse(read('builderos-reboot/governance/GATE_ENFORCEMENT_MATRIX.json'));
if (!(matrix.gates || []).some((g) => g.gate_id === 'CHAIR_FP_V2_LIVE')) {
  fail('GATE_ENFORCEMENT_MATRIX missing CHAIR_FP_V2_LIVE');
}

const runtime = JSON.parse(read('builderos-reboot/governance/FOUNDER_PACKET_V2_CHAIR_RUNTIME.json'));
if (!runtime.supreme_authority?.includes('FOUNDER_PACKET_V2')) {
  fail('FOUNDER_PACKET_V2_CHAIR_RUNTIME missing supreme_authority');
}

const orchestrator = read('services/lumin-chair-orchestrator.js');
if (!orchestrator.includes('enforceFounderPacketV2ChairTurn')) {
  fail('lumin-chair-orchestrator.js must call enforceFounderPacketV2ChairTurn');
}
if (!orchestrator.includes('chairFpV2BlockResponse')) {
  fail('lumin-chair-orchestrator.js must block execute on FP V2 failure');
}

const enforcement = read('services/chair-founder-packet-v2-enforcement.js');
if (!enforcement.includes('CHAIR_FORECAST_SIMULATION_RECEIPT')) {
  fail('chair-founder-packet-v2-enforcement.js must write CHAIR_FORECAST receipt');
}
if (!enforcement.includes('createAdfPredictionLedger')) {
  fail('chair-founder-packet-v2-enforcement.js must file ADF predictions');
}

const truth = read('services/chair-truth-gate.js');
if (!truth.includes('BLOCKED_CHAIR_FP_V2')) {
  fail('chair-truth-gate.js must enforce FP V2 on execute channels');
}

const bp = JSON.parse(read('builderos-reboot/BP_PRIORITY.json'));
const scrapped = (bp.scrapped_items || []).find((i) => i.mission_id === 'PRODUCT-VOICE-RAIL-V1-0001');
if (!scrapped || scrapped.status !== 'SCRAPPED_SALVAGE') {
  fail('BP_PRIORITY must list Voice Rail under scrapped_items SCRAPPED_SALVAGE');
}
if ((bp.items || []).some((i) => i.mission_id === 'PRODUCT-VOICE-RAIL-V1-0001')) {
  fail('Voice Rail must not remain in BP_PRIORITY active items[]');
}

const salvagePath = 'builderos-reboot/MISSIONS/PRODUCT-VOICE-RAIL-V1-0001/SALVAGE_MANIFEST.json';
if (!fs.existsSync(path.join(ROOT, salvagePath))) {
  fail('SALVAGE_MANIFEST.json missing for Voice Rail');
}

console.log('CHAIR_FP_V2_ENFORCEMENT_PASS');
