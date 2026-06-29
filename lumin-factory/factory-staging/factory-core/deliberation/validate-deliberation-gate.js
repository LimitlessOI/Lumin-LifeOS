/**
 * SYNOPSIS: Factory deliberation gate v2.7 — Hist case + CFO receipt required; load-bearing adds consensus.
 * Factory deliberation gate v2.7 — Hist case + CFO receipt required; load-bearing adds consensus.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateConsensusSession } from '../canon/deliberation-governance.js';
import { loadMissionDeliberationFile } from './seed-mission-deliberation.js';

const FACTORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DELIBERATION_DATA = path.join(FACTORY_ROOT, 'data/deliberation-gate.jsonl');

function readDeliberationRecords(session_id) {
  if (!fs.existsSync(DELIBERATION_DATA)) return [];
  return fs
    .readFileSync(DELIBERATION_DATA, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l))
    .filter((r) => r.session_id === session_id);
}

function loadMissionDeliberation(mission_id) {
  return loadMissionDeliberationFile(mission_id);
}

/**
 * @param {string} session_id
 * @param {{ skip_if_missing?: boolean, load_bearing?: boolean }} [opts]
 */
export function validateDeliberationGate(session_id, { skip_if_missing = false, load_bearing = false } = {}) {
  if (!session_id) {
    return { ok: false, status: 'DELIBERATION_GATE_FAIL', violations: ['session_id required'] };
  }

  const records = readDeliberationRecords(session_id);
  const missionFile = session_id.startsWith('mission:')
    ? loadMissionDeliberation(session_id.replace(/^mission:/, ''))
    : null;

  const histCases = records.filter((r) => r.type === 'hist_case');
  const cfoReceipts = records.filter((r) => r.type === 'cfo_receipt');
  const consensusSessions = records.filter((r) => r.type === 'consensus_session');

  if (missionFile) {
    if (missionFile.hist_case) histCases.push(missionFile.hist_case);
    if (missionFile.cfo_receipt) cfoReceipts.push(missionFile.cfo_receipt);
    if (missionFile.consensus_session) consensusSessions.push(missionFile.consensus_session);
  }

  const violations = [];
  if (histCases.length < 1) violations.push('HIST_CASE_MISSING');
  if (cfoReceipts.length < 1) violations.push('CFO_RECEIPT_MISSING');

  const loadBearing = load_bearing === true || missionFile?.load_bearing === true;
  if (loadBearing) {
    if (consensusSessions.length < 1) {
      violations.push('CONSENSUS_SESSION_MISSING');
    } else {
      const latest = consensusSessions[consensusSessions.length - 1];
      const cv = validateConsensusSession({ session_id, ...latest });
      if (!cv.ok) {
        violations.push(...cv.errors.map((e) => `CONSENSUS_INVALID:${e}`));
      }
    }
  }

  if (violations.length && skip_if_missing) {
    return { ok: true, status: 'SKIP', reason: 'deliberation receipts missing — skipped', violations };
  }

  return {
    ok: violations.length === 0,
    status: violations.length === 0 ? 'DELIBERATION_GATE_PASS' : 'DELIBERATION_GATE_FAIL',
    session_id,
    load_bearing: loadBearing,
    hist_case_count: histCases.length,
    cfo_receipt_count: cfoReceipts.length,
    consensus_session_count: consensusSessions.length,
    violations,
  };
}

export function appendDeliberationRecord(entry) {
  fs.mkdirSync(path.dirname(DELIBERATION_DATA), { recursive: true });
  const record = { ...entry, recorded_at: new Date().toISOString() };
  fs.appendFileSync(DELIBERATION_DATA, `${JSON.stringify(record)}\n`, 'utf8');
  return { ok: true, record };
}
