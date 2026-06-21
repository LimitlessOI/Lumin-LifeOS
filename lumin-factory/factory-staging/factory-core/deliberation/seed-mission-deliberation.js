/**
 * SYNOPSIS: Seed minimum deliberation records for a factory mission (jsonl + DELIBERATION_GATE.json).
 * Seed minimum deliberation records for a factory mission (jsonl + DELIBERATION_GATE.json).
 * @ssot docs/projects/AMENDMENT_48_BUILDEROS_VOCABULARY.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { REPO_ROOT } from '../builder/run-step.js';
import {
  appendDeliberationRecord,
  validateDeliberationGate,
} from './validate-deliberation-gate.js';
import {
  recordHistDeptCase,
  recordCfoDeliberationReceipt,
  recordConsensusSession,
} from '../historian/record-consensus-session.js';

function missionGatePath(mission_id) {
  return path.join(REPO_ROOT, 'builderos-reboot/MISSIONS', mission_id, 'DELIBERATION_GATE.json');
}

export function loadMissionDeliberationFile(mission_id) {
  const p = missionGatePath(mission_id);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export function writeMissionDeliberationFile(mission_id, payload) {
  const p = missionGatePath(mission_id);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return p;
}

/**
 * Ensure mission has minimum Hist + CFO deliberation records (A→Z factory path).
 */
export function ensureMissionDeliberation(mission_id, context = {}) {
  const session_id = context.session_id || `mission:${mission_id}`;
  const existing = validateDeliberationGate(session_id, {
    load_bearing: context.load_bearing === true,
  });
  if (existing.ok && context.force_reseed !== true) {
    return { ok: true, seeded: false, session_id, status: existing.status };
  }

  const authorities = context.authorities || ['BPB', 'CDR', 'SNT'];
  const reps = context.reps || [{ name: 'LifeOS' }, { name: 'Founder' }];

  const hist_case = {
    session_id,
    problem: context.problem || `Mission ${mission_id} build`,
    case_text:
      context.case_text ||
      `Auto-seeded Historian case for mission ${mission_id}. Prior builds and lessons should attach here on first full deliberation.`,
    ideas: context.ideas || [],
    opportunity: context.opportunity || 'Complete mission steps with SNT verify and Hist outcome record.',
    uncertainty: 'THINK',
  };

  const cfo_receipt = {
    session_id,
    dept: 'CFO',
    role: context.role || 'mission_execute',
    model: context.model || 'factory-local',
    tokens: context.tokens ?? 0,
    cost_usd: context.cost_usd ?? 0,
    founder_priority_mode: Boolean(context.founder_priority_mode),
  };

  recordHistDeptCase(hist_case);
  recordCfoDeliberationReceipt(cfo_receipt);

  const gatePayload = {
    session_id,
    mission_id,
    authorities,
    reps,
    models: context.models || [
      { id: 'bpb-slot', focus: 'BPB' },
      { id: 'cdr-slot', focus: 'CDR' },
    ],
    partial: true,
    hist_case,
    cfo_receipt,
    seeded_at: new Date().toISOString(),
    auto_seeded: true,
  };

  if (context.consensus) {
    const consensusResult = recordConsensusSession(context.consensus);
    if (consensusResult?.ok === false) {
      return {
        ok: false,
        seeded: false,
        session_id,
        status: 'CONSENSUS_INVALID',
        errors: consensusResult.errors,
      };
    }
    gatePayload.consensus_session = context.consensus;
  }

  writeMissionDeliberationFile(mission_id, gatePayload);

  const after = validateDeliberationGate(session_id);
  return {
    ok: after.ok,
    seeded: true,
    session_id,
    status: after.status,
    violations: after.violations,
  };
}

/**
 * Full factory A→Z deliberation pipeline for a mission (local jsonl path).
 */
export function runFactoryDeliberationPipeline(mission_id, context = {}) {
  const seed = ensureMissionDeliberation(mission_id, context);
  const session_id = seed.session_id;
  const gate = validateDeliberationGate(session_id);

  return {
    ok: gate.ok,
    session_id,
    seed,
    gate,
    next: gate.ok
      ? 'BPB intake gate may pass — proceed to execute-step / execute-mission'
      : `Fix violations: ${(gate.violations || []).join(', ')}`,
  };
}
