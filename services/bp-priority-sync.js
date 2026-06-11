/**
 * Sync BP_PRIORITY + mission BLUEPRINT from acceptance receipts (machine law).
 * @ssot docs/architecture/HIST_LEGACY_SYSTEM_REGISTRY.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { BP_PRIORITY_REL, loadBpPriority } from './bp-priority-queue.js';

const TECHNICAL_VERDICTS = new Set(['TECHNICAL_PASS', 'OBJECTIVE_COMPLETE', 'PASS']);

export function findBpItem(bpPriority, missionId) {
  return (bpPriority.items || []).find((i) => i.mission_id === missionId) || null;
}

export function loadMissionBlueprint(root, blueprintPath) {
  const full = path.join(root, blueprintPath);
  if (!fs.existsSync(full)) return null;
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

export function writeJson(relPath, data, { root }) {
  const full = path.join(root, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, `${JSON.stringify(data, null, 2)}\n`);
}

/**
 * Apply technical PASS receipt to canonical BP artifacts.
 * @returns {{ updated: string[], skipped: string[] }}
 */
export function syncMissionFromTechnicalReceipt({
  missionId,
  receipt,
  root,
  buildRecord = {},
}) {
  const updated = [];
  const skipped = [];
  const bp = loadBpPriority({ root });
  const item = findBpItem(bp, missionId);
  if (!item) {
    throw new Error(`BP_SYNC_NO_ITEM: ${missionId} not in ${BP_PRIORITY_REL}`);
  }
  if (receipt?.verdict !== 'PASS') {
    skipped.push(BP_PRIORITY_REL);
    return { updated, skipped, reason: 'receipt_not_pass' };
  }

  const now = receipt.completed_at || new Date().toISOString();
  const gitSha = receipt.git_sha || buildRecord.git_sha || '';
  const productionBase = receipt.production_base || buildRecord.production_base || '';

  item.blueprint_status = 'complete';
  item.verdict = 'TECHNICAL_PASS';
  item.receipt_verdict = 'PASS';
  item.technical_pass_at = now;
  item.git_sha = gitSha;
  item.production_base = productionBase;
  if (buildRecord.canonical_url) item.canonical_url = buildRecord.canonical_url;
  if (buildRecord.public_alias) item.public_alias = buildRecord.public_alias;
  if (buildRecord.build_method) item.build_method = buildRecord.build_method;
  if (buildRecord.intent_drift) item.intent_drift = buildRecord.intent_drift;
  if (buildRecord.note) item.note = buildRecord.note;
  item.founder_usability_pass = receipt.founder_usability_pass === true;
  item.objective_verdict = path.join(
    path.dirname(item.founder_packet),
    'OBJECTIVE_VERDICT.json',
  ).replace(/\\/g, '/');

  bp.updated_at = now.slice(0, 10);
  writeJson(BP_PRIORITY_REL, bp, { root });
  updated.push(BP_PRIORITY_REL);

  if (item.blueprint_path) {
    const blueprint = loadMissionBlueprint(root, item.blueprint_path);
    if (blueprint) {
      blueprint.blueprint_status = 'complete';
      blueprint.completed_at = now;
      blueprint.git_sha = gitSha;
      blueprint.receipt_path = item.receipt_path || receipt.receipt_path;
      blueprint.receipt_verdict = 'PASS';
      if (buildRecord.build_method) blueprint.build_method = buildRecord.build_method;
      for (const step of blueprint.steps || []) {
        step.status = 'complete';
        step.completed_at = now;
        if (gitSha) step.git_sha = gitSha;
        if (step.action_type === 'shell_command' && step.command === item.acceptance_command) {
          step.receipt_verdict = 'PASS';
        }
      }
      writeJson(item.blueprint_path, blueprint, { root });
      updated.push(item.blueprint_path);
    }
  }

  const founderJsonRel = item.founder_packet.replace(/\.md$/, '.json');
  const founderJsonPath = path.join(root, founderJsonRel);
  if (fs.existsSync(founderJsonPath)) {
    const founder = JSON.parse(fs.readFileSync(founderJsonPath, 'utf8'));
    founder.technical_pass = {
      at: now,
      receipt_path: item.receipt_path,
      receipt_verdict: 'PASS',
      git_sha: gitSha,
      production_base: productionBase,
      canonical_url: buildRecord.canonical_url || founder.canonical_surface,
      public_alias: buildRecord.public_alias,
      founder_usability_pass: receipt.founder_usability_pass === true,
      build_method: buildRecord.build_method,
    };
    writeJson(founderJsonRel, founder, { root });
    updated.push(founderJsonRel);
  }

  return { updated, skipped };
}

/** Verifier helper — BP item must match receipt when technically complete. */
export function checkBpReceiptAlignment({ root }) {
  const failures = [];
  const bp = loadBpPriority({ root });
  for (const item of bp.items || []) {
    const verdict = String(item.verdict || '').toUpperCase();
    if (!TECHNICAL_VERDICTS.has(verdict)) continue;
    if (item.blueprint_status !== 'complete') {
      failures.push({
        id: 'BP_RECEIPT_STATUS',
        detail: `${item.mission_id}: verdict ${verdict} but blueprint_status=${item.blueprint_status}`,
      });
    }
    const receiptRel = item.receipt_path;
    if (!receiptRel) {
      failures.push({ id: 'BP_RECEIPT_PATH', detail: `${item.mission_id}: missing receipt_path` });
      continue;
    }
    const receiptFull = path.join(root, receiptRel);
    if (!fs.existsSync(receiptFull)) {
      failures.push({ id: 'BP_RECEIPT_MISSING', detail: `${item.mission_id}: missing ${receiptRel}` });
      continue;
    }
    let receipt;
    try {
      receipt = JSON.parse(fs.readFileSync(receiptFull, 'utf8'));
    } catch (e) {
      failures.push({ id: 'BP_RECEIPT_PARSE', detail: `${item.mission_id}: ${e.message}` });
      continue;
    }
    if (receipt.verdict !== 'PASS') {
      failures.push({
        id: 'BP_RECEIPT_VERDICT',
        detail: `${item.mission_id}: BP ${verdict} but receipt.verdict=${receipt.verdict}`,
      });
    }
    const objectiveRel = item.objective_verdict
      || path.join(path.dirname(item.founder_packet), 'OBJECTIVE_VERDICT.json').replace(/\\/g, '/');
    const objectiveFull = path.join(root, objectiveRel);
    if (fs.existsSync(objectiveFull)) {
      const objective = JSON.parse(fs.readFileSync(objectiveFull, 'utf8'));
      const objVerdict = String(objective.verdict || '').toUpperCase();
      if (!TECHNICAL_VERDICTS.has(objVerdict)) {
        failures.push({
          id: 'BP_OBJECTIVE_VERDICT',
          detail: `${item.mission_id}: OBJECTIVE_VERDICT=${objective.verdict}`,
        });
      }
    } else {
      failures.push({ id: 'BP_OBJECTIVE_MISSING', detail: `${item.mission_id}: missing ${objectiveRel}` });
    }
  }
  return failures;
}
