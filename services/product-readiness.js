/**
 * SYNOPSIS: Product readiness — report product home, active missions, and Point B honesty from repo truth.
 * @ssot docs/products/PRODUCT_REGISTRY.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCompletionState } from './bp-priority-completion.js';
import { loadBpPriority } from './bp-priority-queue.js';
import { findProductRecord, loadProductRegistry } from './lumin-operating-model.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POINT_B_TARGET_PATH = path.join(ROOT, 'builderos-reboot/POINT_B_TARGET.json');

function readJson(absPath) {
  try {
    return JSON.parse(fs.readFileSync(absPath, 'utf8'));
  } catch {
    return null;
  }
}

function readStatRel(relPath) {
  if (!relPath) return null;
  try {
    return fs.statSync(path.join(ROOT, relPath));
  } catch {
    return null;
  }
}

function pathExists(relPath) {
  if (!relPath) return false;
  return fs.existsSync(path.join(ROOT, relPath));
}

function readJsonRel(relPath) {
  if (!relPath) return null;
  return readJson(path.join(ROOT, relPath));
}

function deriveState({ product, missions, pointBTarget }) {
  if (product?.status === 'SCRAPPED_SALVAGE_ONLY') return 'SCRAPPED_SALVAGE_ONLY';
  if (!missions.length) return 'READY_FOR_PRODUCT_DEVELOPMENT';

  const pointBMissionId = product?.point_b_mission_id || null;
  const pointBMission = pointBMissionId
    ? missions.find((mission) => mission.mission_id === pointBMissionId)
    : null;
  if (pointBMission) return getCompletionState(pointBMission, { pointBTarget }).readiness_state;
  if (missions.some((mission) => String(mission.blueprint_status || '').toLowerCase() === 'complete')) {
    return 'BLUEPRINT_ACTIVE';
  }
  if (pointBTarget?.mission_id && pointBTarget.mission_id === pointBMissionId) {
    return 'READY_FOR_BLUEPRINT';
  }
  return 'READY_FOR_PRODUCT_DEVELOPMENT';
}

export function buildProductReadinessReport({ root = ROOT } = {}) {
  const registry = loadProductRegistry();
  const bp = loadBpPriority({ root });
  const pointBTarget = readJson(POINT_B_TARGET_PATH);
  const uiAlphaGate = readJsonRel('products/receipts/UI_ALPHA_GATE.json');
  const products = (registry.products || []).map((product) => {
    const missions = (bp.items || []).filter((item) => String(item.product_id || '') === product.product_id);
    const pointBLocked = pointBTarget?.mission_id && product.point_b_mission_id === pointBTarget.mission_id;
    const pointBMission = product.point_b_mission_id
      ? missions.find((mission) => mission.mission_id === product.point_b_mission_id)
      : null;
    const alphaReadiness = pointBMission?.alpha_readiness_receipt
      ? readJsonRel(pointBMission.alpha_readiness_receipt)
      : null;
    const verdictRel = pointBMission?.objective_verdict || null;
    const verdictStat = readStatRel(verdictRel);
    const uiAlphaStat = readStatRel('products/receipts/UI_ALPHA_GATE.json');
    const alphaReadinessStat = pointBMission?.alpha_readiness_receipt
      ? readStatRel(pointBMission.alpha_readiness_receipt)
      : null;
    const state = deriveState({ product, missions, pointBTarget });
    return {
      product_id: product.product_id,
      name: product.name,
      canonical_home: product.canonical_home,
      canonical_home_exists: pathExists(product.canonical_home),
      law_path: product.law_path,
      law_path_exists: pathExists(product.law_path),
      status: product.status,
      readiness_state: state,
      ui_alpha_gate: {
        receipt: 'products/receipts/UI_ALPHA_GATE.json',
        ok: uiAlphaGate?.ok === true,
        verdict: uiAlphaGate?.verdict || null,
        stale_against_objective: Boolean(
          verdictStat?.mtimeMs && uiAlphaStat?.mtimeMs && uiAlphaStat.mtimeMs < verdictStat.mtimeMs
        ),
      },
      alpha_readiness: alphaReadiness ? {
        ok: alphaReadiness.ok === true,
        ready_for_alpha_testing: alphaReadiness.ready_for_alpha_testing === true,
        ready_for_alpha_gate: alphaReadiness.ready_for_alpha_gate === true,
        stale_against_objective: Boolean(
          verdictStat?.mtimeMs && alphaReadinessStat?.mtimeMs && alphaReadinessStat.mtimeMs < verdictStat.mtimeMs
        ),
      } : null,
      point_b_mission_id: product.point_b_mission_id || null,
      point_b_locked: Boolean(pointBLocked),
      default_runtime_surface: product.default_runtime_surface || null,
      bp_priority: missions.map((mission) => ({
        rank: mission.rank,
        mission_id: mission.mission_id,
        blueprint_status: mission.blueprint_status || null,
        verdict: mission.verdict || mission.receipt_verdict || null,
        founder_usability_pass: mission.founder_usability_pass === true,
        completion_receipt_id: mission.completion_receipt_id || null,
        artifact_sync: mission.artifact_sync || null,
      })),
      notes: product.notes || [],
    };
  });

  const missingHomes = products
    .filter((product) => !product.canonical_home_exists || !product.law_path_exists)
    .map((product) => ({
      product_id: product.product_id,
      canonical_home: product.canonical_home_exists,
      law_path: product.law_path_exists,
    }));

  return {
    schema: 'product_readiness_report_v1',
    updated_at: new Date().toISOString(),
    authority: {
      product_registry: 'docs/products/PRODUCT_REGISTRY.json',
      bp_priority: 'builderos-reboot/BP_PRIORITY.json',
      point_b_target: 'builderos-reboot/POINT_B_TARGET.json',
    },
    summary: {
      products: products.length,
      missing_product_homes: missingHomes.length,
      active_bp_products: products.filter((product) => product.bp_priority.length > 0).length,
      point_b_complete_products: products.filter((product) => product.readiness_state === 'POINT_B_COMPLETE').length,
    },
    missing_homes: missingHomes,
    products,
  };
}
