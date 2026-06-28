/**
 * SYNOPSIS: Canonical BP completion semantics for queue, Point B, and readiness truth.
 * @ssot builderos-reboot/MISSIONS/FACTORY-BUILDEROS-AUTONOMY-CLOSURE-0001/BLUEPRINT.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPointBTarget } from './point-b-target-lite.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TECHNICAL_VERDICTS = new Set(['TECHNICAL_PASS', 'PASS', 'OBJECTIVE_COMPLETE']);

function safeReadJson(relPath) {
  if (!relPath) return null;
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), 'utf8'));
  } catch {
    return null;
  }
}

export function normalizeVerdict(value) {
  return String(value || '').trim().toUpperCase();
}

export function isTechnicalPassVerdict(value) {
  return TECHNICAL_VERDICTS.has(normalizeVerdict(value));
}

export function isScrappedSalvage(item = {}) {
  return /SCRAPPED_SALVAGE/i.test(String(item.status || ''))
    || /SCRAPPED_SALVAGE/i.test(String(item.verdict || ''));
}

export function loadObjectiveVerdict(item = {}) {
  return safeReadJson(item.objective_verdict || null);
}

export function getCompletionState(item = {}, options = {}) {
  const pointBTarget = options.pointBTarget || loadPointBTarget();
  const objective = options.objectiveVerdict ?? loadObjectiveVerdict(item);
  const verdict = normalizeVerdict(item.verdict || item.receipt_verdict);
  const objectiveVerdict = normalizeVerdict(objective?.verdict);
  const technicalPass = isTechnicalPassVerdict(verdict) || isTechnicalPassVerdict(objectiveVerdict);
  const pointBMission = Boolean(pointBTarget?.mission_id && item.mission_id === pointBTarget.mission_id);
  const founderUsabilityPass = item.founder_usability_pass === true || objective?.founder_usability_pass === true;
  const blueprintStatus = String(item.blueprint_status || '').toLowerCase();
  const archived = blueprintStatus === 'complete_archived';
  const pointBComplete = pointBMission && technicalPass && founderUsabilityPass;

  let readinessState = 'READY_FOR_PRODUCT_DEVELOPMENT';
  let requiredNextAction = 'product_development';
  let blockingReason = null;

  if (isScrappedSalvage(item)) {
    readinessState = 'SCRAPPED_SALVAGE_ONLY';
    requiredNextAction = 'none';
  } else if (pointBComplete) {
    readinessState = 'POINT_B_COMPLETE';
    requiredNextAction = 'none';
  } else if (technicalPass && pointBMission && !founderUsabilityPass) {
    readinessState = 'TECHNICAL_PASS_ONLY';
    requiredNextAction = 'founder_usability_confirmation';
    blockingReason = 'point_b_founder_confirmation_required';
  } else if (technicalPass) {
    readinessState = 'TECHNICAL_PASS_ONLY';
    requiredNextAction = 'none';
  } else if (blueprintStatus === 'complete') {
    readinessState = 'BLUEPRINT_ACTIVE';
    requiredNextAction = 'implementation_or_acceptance';
    blockingReason = 'technical_pass_missing';
  } else if (blueprintStatus) {
    readinessState = 'BLUEPRINT_ACTIVE';
    requiredNextAction = 'blueprint_execution';
  } else {
    readinessState = 'READY_FOR_PRODUCT_DEVELOPMENT';
    requiredNextAction = 'product_development';
  }

  const queueCompleteForScheduler = isScrappedSalvage(item)
    || archived
    || (pointBMission ? pointBComplete : technicalPass);

  return {
    verdict,
    objective_verdict: objectiveVerdict || null,
    technical_pass: technicalPass,
    founder_usability_pass: founderUsabilityPass,
    point_b_mission: pointBMission,
    point_b_complete: pointBComplete,
    queue_complete_for_scheduler: queueCompleteForScheduler,
    readiness_state: readinessState,
    required_next_action: requiredNextAction,
    blocking_reason: blockingReason,
  };
}

export function isQueueItemIncomplete(item = {}, options = {}) {
  return !getCompletionState(item, options).queue_complete_for_scheduler;
}

export function getActiveQueueItem(items = [], options = {}) {
  const sorted = [...items].sort((a, b) => Number(a.rank || 0) - Number(b.rank || 0));
  return sorted.find((item) => isQueueItemIncomplete(item, options)) || null;
}
