#!/usr/bin/env node
import fs from 'node:fs';

const targetPath = process.env.POINT_B_TARGET_FILE || 'builderos-reboot/POINT_B_TARGET.json';
const bpPath = process.env.BP_PRIORITY_FILE || 'builderos-reboot/BP_PRIORITY.json';
const canonicalUrl = process.env.CANONICAL_POINT_B_URL || '';
const receiptPath = process.env.CONTROL_PLANE_RECEIPT || 'products/receipts/POINT_B_CONTROL_PLANE.json';

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, 'utf8'));
}
function missionIdOf(value) {
  if (!value || typeof value !== 'object') return null;
  return value.mission_id || value.bp_id || value.id || null;
}
function findMission(root, missionId, out = []) {
  if (!root || typeof root !== 'object') return out;
  if (missionIdOf(root) === missionId) out.push(root);
  for (const value of Object.values(root)) if (value && typeof value === 'object') findMission(value, missionId, out);
  return out;
}
function contradiction(record) {
  const status = String(record?.status ?? record?.state ?? '').toUpperCase();
  const verdict = String(record?.receipt_verdict ?? record?.verdict ?? '').toUpperCase();
  const claimsDone = /(PASS|COMPLETE|DONE|PROVEN)/.test(status) && !/(NOT_|INCOMPLETE|UNPROVEN)/.test(status);
  const claimsFail = /(FAIL|NOT_PROVEN|UNPROVEN|NOT_COMPLETE)/.test(verdict);
  return claimsDone && claimsFail;
}

const localTarget = readJson(targetPath);
const bp = readJson(bpPath);
const localMissionId = localTarget?.target?.mission_id || null;
const reasons = [];
if (!localMissionId) reasons.push('LOCAL_POINT_B_MISSING_MISSION_ID');
const bpMatches = localMissionId ? findMission(bp, localMissionId) : [];
if (localMissionId && bpMatches.length === 0) reasons.push(`ACTIVE_POINT_B_NOT_IN_BP_PRIORITY:${localMissionId}`);
if (bpMatches.some(contradiction)) reasons.push(`ACTIVE_BP_STATUS_RECEIPT_CONTRADICTION:${localMissionId}`);
const parkedIds = new Set((localTarget?.parked_targets || []).map(x => x?.mission_id).filter(Boolean));
if (localMissionId && parkedIds.has(localMissionId)) reasons.push(`ACTIVE_POINT_B_ALSO_PARKED:${localMissionId}`);

let canonicalMissionId = null;
let canonicalUpdatedAt = null;
if (canonicalUrl) {
  try {
    const response = await fetch(canonicalUrl, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const canonical = await response.json();
    canonicalMissionId = canonical?.target?.mission_id || null;
    canonicalUpdatedAt = canonical?.updated_at || null;
    if (!canonicalMissionId) reasons.push('CANONICAL_POINT_B_MISSING_MISSION_ID');
    else if (localMissionId && canonicalMissionId !== localMissionId) reasons.push(`AUTHORITY_CONFLICT:local=${localMissionId}:canonical=${canonicalMissionId}`);
  } catch (error) {
    reasons.push(`CANONICAL_POINT_B_UNREADABLE:${error.message}`);
  }
}

const receipt = {
  schema: 'point_b_control_plane_guard_v1', checked_at: new Date().toISOString(),
  ok: reasons.length === 0,
  classification: reasons.length === 0 ? 'CONTROL_PLANE_ALIGNED' : 'CONTROL_PLANE_BLOCKED',
  local_mission_id: localMissionId, canonical_mission_id: canonicalMissionId,
  local_updated_at: localTarget?.updated_at || null, canonical_updated_at: canonicalUpdatedAt,
  bp_match_count: bpMatches.length, reasons,
};
fs.mkdirSync(receiptPath.split('/').slice(0, -1).join('/') || '.', { recursive: true });
fs.writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
process.exit(receipt.ok ? 0 : 2);
