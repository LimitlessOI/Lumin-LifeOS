/**
 * SYNOPSIS: Pre-ARC enrichment artifacts + consensus receipt.
 * @ssot docs/projects/AMENDMENT_04_AUTO_BUILDER.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../../builder/run-step.js';
import { loadMissionJson } from '../mission-paths.js';
import { readFounderText } from './coverage-map.js';

function writeJson(absPath, data) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, `${JSON.stringify(data, null, 2)}\n`);
}

export function writePreArcEnrichment(missionFolder) {
  const missionId = path.basename(missionFolder);
  const founderText = readFounderText(missionFolder);
  const baseline = loadMissionJson(missionFolder, 'INTENT_BASELINE.json');

  const risks = [];
  if (/never auto|staged-only/i.test(founderText)) {
    risks.push({ id: 'R1', risk: 'Auto-execution bypass', severity: 'high', owner: 'SNT' });
  }
  if (/private/i.test(founderText)) {
    risks.push({ id: 'R2', risk: 'Private data persistence', severity: 'high', owner: 'SNT' });
  }

  writeJson(path.join(missionFolder, 'KNOWN_RISKS.json'), {
    schema: 'known_risks_v1',
    mission_id: missionId,
    risks,
    updated_at: new Date().toISOString(),
  });

  writeJson(path.join(missionFolder, 'KNOWN_ASSUMPTIONS.json'), {
    schema: 'known_assumptions_v1',
    mission_id: missionId,
    assumptions: [
      { id: 'A1', assumption: 'Adam is primary user at Alpha', confidence: 'KNOW' },
      { id: 'A2', assumption: 'Railway production spine is live', confidence: 'THINK' },
      { id: 'A3', assumption: baseline?.outcome_statement || 'Outcome per FOUNDER_PACKET', confidence: 'KNOW' },
    ],
  });

  writeJson(path.join(missionFolder, 'KNOWN_CONTRADICTIONS.json'), {
    schema: 'known_contradictions_v1',
    mission_id: missionId,
    contradictions: [],
    note: 'None detected at handoff',
  });

  writeJson(path.join(missionFolder, 'DO_NOT_INVENT.json'), {
    schema: 'do_not_invent_v1',
    mission_id: missionId,
    rules: [
      'ARC must not invent product scope beyond FOUNDER_PACKET',
      'Builder must not choose mechanics — follow blueprint byte contracts',
      'No auto-execution of BuilderOS from staged items',
    ],
  });

  return { ok: true };
}

export function writeConsensusReceipt(missionFolder, departmentResults) {
  const missionId = path.basename(missionFolder);
  const seats = ['SNT', 'CHAIR', 'CFO', 'WISDOM'];
  const dissent = [];
  const synthesis = [];

  for (const seat of seats) {
    const r = departmentResults?.departments?.[seat];
    if (!r?.pass) dissent.push({ seat, verdict: r?.verdict, note: 'Failed simulation — Chair must resolve' });
    else synthesis.push({ seat, verdict: r?.verdict, aligned: true });
  }

  const receipt = {
    schema: 'idc_consensus_receipt_v1',
    mission_id: missionId,
    at: new Date().toISOString(),
    chair_led: true,
    load_bearing_decision: 'handoff_to_arc_corridor',
    dissent,
    synthesis,
    consensus_reached: dissent.length === 0,
    founder_escalation_required: false,
    verdict: dissent.length ? 'BLOCKED_PENDING_CHAIR' : 'CONSENSUS_YES',
  };

  writeJson(path.join(missionFolder, 'IDC_CONSENSUS_RECEIPT.json'), receipt);
  return receipt;
}

export function assembleFullPreArcPacket(missionFolder) {
  const missionId = path.basename(missionFolder);
  const rel = (p) => path.relative(REPO_ROOT, path.join(missionFolder, p)).replace(/\\/g, '/');

  const entries = [
    'FOUNDER_PACKET.md',
    'INTENT_BASELINE.json',
    'INTENT_COVERAGE_MAP.json',
    'ASSET_REUSE_DECISION.json',
    'IDC_CONSENSUS_RECEIPT.json',
    'KNOWN_RISKS.json',
    'KNOWN_ASSUMPTIONS.json',
    'KNOWN_CONTRADICTIONS.json',
    'DO_NOT_INVENT.json',
    'CHAIR_HANDOFF_RECEIPT.json',
    'receipts/SNT_INTENT_ATTACK_RECEIPT.json',
    'receipts/CHAIR_FORECAST_SIMULATION_RECEIPT.json',
    'receipts/CFO_RESOURCE_SIMULATION_RECEIPT.json',
    'receipts/WISDOM_REVIEW_RECEIPT.json',
  ];

  const manifest = entries.map((p) => ({
    artifact: path.basename(p, path.extname(p)),
    path: rel(p),
    exists: fs.existsSync(path.join(missionFolder, p)),
  }));

  const packet = {
    schema: 'pre_arc_input_packet_v2',
    mission_id: missionId,
    assembled_at: new Date().toISOString(),
    assembled_by: 'foundation/pre-arc-enrichment.js',
    doctrine: 'FOUNDER_PACKET_V2 full minimum contents',
    manifest,
    complete: manifest.every((m) => m.exists),
  };

  writeJson(path.join(missionFolder, 'PRE_ARC_INPUT_PACKET.json'), packet);
  return packet;
}
