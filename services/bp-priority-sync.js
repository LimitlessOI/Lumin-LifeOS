/**
 * SYNOPSIS: Sync BP_PRIORITY + mission BLUEPRINT from acceptance receipts (machine law).
 * Sync BP_PRIORITY + mission BLUEPRINT from acceptance receipts (machine law).
 * @ssot docs/projects/AMENDMENT_46_BUILDEROS_CONTROL_PLANE.md
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { BP_PRIORITY_REL, loadBpPriority } from './bp-priority-queue.js';

export { BP_PRIORITY_REL };
export const BP_SYNC_REQUIRED_PATH = BP_PRIORITY_REL;
const TECHNICAL_VERDICTS = new Set(['TECHNICAL_PASS', 'OBJECTIVE_COMPLETE', 'PASS']);
const ACCEPTANCE_SYNC_MARKERS = ['finishBpAcceptance', 'syncMissionFromTechnicalReceipt'];

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

function readJsonFile(full) {
  return JSON.parse(fs.readFileSync(full, 'utf8'));
}

function resolveAcceptanceScriptRel(root, acceptanceCommand) {
  const pkgPath = path.join(root, 'package.json');
  if (!fs.existsSync(pkgPath) || !acceptanceCommand) return null;
  const pkg = readJsonFile(pkgPath);
  const match = String(acceptanceCommand).match(/npm run (\S+)/);
  if (!match) return null;
  const def = pkg.scripts?.[match[1]];
  if (!def) return null;
  const nodeMatch = def.match(/node\s+(\S+\.mjs)/);
  return nodeMatch ? nodeMatch[1] : null;
}

/** Every BP queue acceptance script must wire mandatory BP sync (no hand-written finish bypass). */
export function checkAcceptanceScriptsRequireBpSync({ root }) {
  const failures = [];
  const bp = loadBpPriority({ root });
  for (const item of bp.items || []) {
    const rel = resolveAcceptanceScriptRel(root, item.acceptance_command);
    if (!rel) {
      failures.push({
        id: 'BP_ACCEPTANCE_SCRIPT_UNRESOLVED',
        detail: `${item.mission_id}: cannot resolve script from ${item.acceptance_command}`,
      });
      continue;
    }
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) {
      failures.push({ id: 'BP_ACCEPTANCE_SCRIPT_MISSING', detail: `${item.mission_id}: missing ${rel}` });
      continue;
    }
    const src = fs.readFileSync(full, 'utf8');
    const wired = ACCEPTANCE_SYNC_MARKERS.some((m) => src.includes(m));
    if (!wired) {
      failures.push({
        id: 'BP_ACCEPTANCE_NO_SYNC',
        detail: `${item.mission_id}: ${rel} must call finishBpAcceptance or syncMissionFromTechnicalReceipt`,
      });
    }
  }
  return failures;
}

/** PASS product receipts must carry machine proof that BP sync ran. */
export function checkPassReceiptsHaveBpSyncProof({ root }) {
  const failures = [];
  const bp = loadBpPriority({ root });
  const byReceipt = new Map((bp.items || []).map((i) => [i.receipt_path, i]));
  for (const [receiptRel, item] of byReceipt) {
    if (!receiptRel) continue;
    const full = path.join(root, receiptRel);
    if (!fs.existsSync(full)) continue;
    let receipt;
    try {
      receipt = readJsonFile(full);
    } catch (e) {
      failures.push({ id: 'BP_RECEIPT_PARSE', detail: `${receiptRel}: ${e.message}` });
      continue;
    }
    if (receipt.verdict !== 'PASS') continue;
    const updated = receipt.bp_sync?.updated;
    if (!Array.isArray(updated) || !updated.includes(BP_SYNC_REQUIRED_PATH)) {
      failures.push({
        id: 'BP_RECEIPT_NO_SYNC_PROOF',
        detail: `${item.mission_id}: ${receiptRel} verdict PASS but missing bp_sync.updated → ${BP_SYNC_REQUIRED_PATH}`,
      });
    }
    failures.push(...checkBpFingerprintForItem({ root, item, receipt }).map((f) => ({ ...f, id: f.id || 'BP_FINGERPRINT' })));
  }
  return failures;
}

/** Receipt timestamps/SHA must match BP row + blueprint + founder JSON. */
export function checkBpFingerprintForItem({ root, item, receipt }) {
  const failures = [];
  if (!item || receipt?.verdict !== 'PASS') return failures;

  if (item.technical_pass_at && receipt.completed_at && item.technical_pass_at !== receipt.completed_at) {
    failures.push({
      id: 'BP_FINGERPRINT_TIME',
      detail: `${item.mission_id}: BP technical_pass_at !== receipt.completed_at`,
    });
  }
  if (item.git_sha && receipt.git_sha && item.git_sha !== receipt.git_sha) {
    failures.push({
      id: 'BP_FINGERPRINT_SHA',
      detail: `${item.mission_id}: BP git_sha !== receipt.git_sha`,
    });
  }
  if (item.receipt_verdict && item.receipt_verdict !== receipt.verdict) {
    failures.push({
      id: 'BP_FINGERPRINT_RECEIPT_VERDICT',
      detail: `${item.mission_id}: BP receipt_verdict mismatch`,
    });
  }

  if (item.blueprint_path) {
    const bpFull = path.join(root, item.blueprint_path);
    if (fs.existsSync(bpFull)) {
      const blueprint = readJsonFile(bpFull);
      if (blueprint.receipt_verdict !== 'PASS') {
        failures.push({
          id: 'BP_FINGERPRINT_BLUEPRINT',
          detail: `${item.mission_id}: blueprint.receipt_verdict !== PASS`,
        });
      }
    }
  }

  const founderRel = item.founder_packet?.replace(/\.md$/, '.json');
  if (founderRel) {
    const founderFull = path.join(root, founderRel);
    if (fs.existsSync(founderFull)) {
      const founder = readJsonFile(founderFull);
      if (founder.technical_pass?.receipt_verdict !== 'PASS') {
        failures.push({
          id: 'BP_FINGERPRINT_FOUNDER',
          detail: `${item.mission_id}: founder technical_pass.receipt_verdict !== PASS`,
        });
      }
    }
  }
  return failures;
}

function getStagedRelPaths(root) {
  try {
    return execSync('git diff --cached --name-only --diff-filter=ACM', { cwd: root, encoding: 'utf8' })
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function hasDiffFromHead(root, rel) {
  if (!rel) return false;
  try {
    execSync(`git diff --quiet HEAD -- "${rel}"`, { cwd: root, stdio: 'ignore' });
    execSync(`git diff --quiet --cached HEAD -- "${rel}"`, { cwd: root, stdio: 'ignore' });
    return false;
  } catch {
    return true;
  }
}

function requireCoStageIfChanged(root, staged, rel, failures, id, detail) {
  if (!rel) return;
  if (hasDiffFromHead(root, rel) && !staged.has(rel)) {
    failures.push({ id, detail });
  }
}

function readStagedFile(root, rel) {
  try {
    return execSync(`git show :${rel}`, { cwd: root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  } catch {
    return null;
  }
}

/** HARD: staged PASS receipt must co-commit changed BP artifacts (already-on-HEAD OK). */
export function checkStagedProductReceiptCommit({ root }) {
  const failures = [];
  const staged = new Set(getStagedRelPaths(root));
  if (!staged.size) return failures;

  const bp = loadBpPriority({ root });
  const byReceipt = new Map((bp.items || []).map((i) => [i.receipt_path, i]));

  for (const rel of staged) {
    if (!rel.startsWith('products/receipts/') || !rel.endsWith('.json')) continue;
    const raw = readStagedFile(root, rel);
    if (!raw) continue;
    let receipt;
    try {
      receipt = JSON.parse(raw);
    } catch {
      failures.push({ id: 'BP_STAGED_RECEIPT_PARSE', detail: rel });
      continue;
    }
    if (receipt.verdict !== 'PASS') continue;

    const item = byReceipt.get(rel);
    if (!item) {
      failures.push({ id: 'BP_STAGED_RECEIPT_UNKNOWN', detail: `${rel} not listed in ${BP_PRIORITY_REL}` });
      continue;
    }

    const updated = receipt.bp_sync?.updated;
    if (!Array.isArray(updated) || !updated.includes(BP_SYNC_REQUIRED_PATH)) {
      failures.push({
        id: 'BP_STAGED_NO_SYNC_PROOF',
        detail: `${rel}: PASS receipt staged without bp_sync.updated → ${BP_SYNC_REQUIRED_PATH} — re-run acceptance`,
      });
      continue;
    }

    const required = new Set([
      BP_PRIORITY_REL,
      ...updated,
      item.objective_verdict
        || path.join(path.dirname(item.founder_packet), 'OBJECTIVE_VERDICT.json').replace(/\\/g, '/'),
    ]);

    for (const req of required) {
      requireCoStageIfChanged(
        root,
        staged,
        req,
        failures,
        'BP_STAGED_CO_COMMIT',
        `${rel}: PASS requires staged ${req} (BP law — no receipt-only commits)`,
      );
    }

    failures.push(...checkBpFingerprintForItem({ root, item, receipt }));
  }

  // Staging BP verdict upgrade without receipt is also blocked
  if (staged.has(BP_PRIORITY_REL)) {
    const raw = readStagedFile(root, BP_PRIORITY_REL);
    if (raw) {
      try {
        const stagedBp = JSON.parse(raw);
        for (const item of stagedBp.items || []) {
          if (!TECHNICAL_VERDICTS.has(String(item.verdict || '').toUpperCase())) continue;
          requireCoStageIfChanged(
            root,
            staged,
            item.receipt_path,
            failures,
            'BP_STAGED_VERDICT_WITHOUT_RECEIPT',
            `${item.mission_id}: TECHNICAL_PASS staged in BP without staged ${item.receipt_path}`,
          );
        }
      } catch {
        failures.push({ id: 'BP_STAGED_PARSE', detail: BP_PRIORITY_REL });
      }
    }
  }

  return failures;
}

const PRODUCT_RECEIPTS_DIR = 'products/receipts';

/** §2.18 — any product PASS receipt must be BP-registered and carry bp_sync proof (repo-wide, not staged-only). */
export function checkOrphanProductPassReceipts({ root }) {
  const failures = [];
  const receiptDir = path.join(root, PRODUCT_RECEIPTS_DIR);
  if (!fs.existsSync(receiptDir)) return failures;

  const bp = loadBpPriority({ root });
  const registeredReceipts = new Set(
    (bp.items || []).map((i) => i.receipt_path).filter(Boolean),
  );

  for (const name of fs.readdirSync(receiptDir)) {
    if (!name.endsWith('.json')) continue;
    const rel = `${PRODUCT_RECEIPTS_DIR}/${name}`;
    const full = path.join(root, rel);
    let receipt;
    try {
      receipt = JSON.parse(fs.readFileSync(full, 'utf8'));
    } catch (e) {
      failures.push({ id: 'BP_RECEIPT_PARSE', detail: `${rel}: ${e.message}` });
      continue;
    }
    if (receipt.verdict !== 'PASS') continue;

    if (!registeredReceipts.has(rel)) {
      failures.push({
        id: 'BP_ORPHAN_PASS_NOT_REGISTERED',
        detail: `${rel}: verdict PASS but not listed in ${BP_PRIORITY_REL} — orphan PASS forbidden (§2.18)`,
      });
    }

    const updated = receipt.bp_sync?.updated;
    if (!Array.isArray(updated) || !updated.includes(BP_SYNC_REQUIRED_PATH)) {
      failures.push({
        id: 'BP_ORPHAN_PASS_NO_SYNC',
        detail: `${rel}: verdict PASS requires bp_sync.updated → ${BP_SYNC_REQUIRED_PATH} (§2.18)`,
      });
    }
  }
  return failures;
}
