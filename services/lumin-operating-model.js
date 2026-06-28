/**
 * SYNOPSIS: Lumin operating model — runtime lanes, truth scale, authority roots, product registry.
 * @ssot builderos-reboot/governance/LUMIN_OPERATING_MODEL.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODEL_PATH = path.join(ROOT, 'builderos-reboot/governance/LUMIN_OPERATING_MODEL.json');
const PRODUCT_REGISTRY_PATH = path.join(ROOT, 'docs/products/PRODUCT_REGISTRY.json');

let modelCache = null;
let registryCache = null;

function readJson(absPath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(absPath, 'utf8'));
  } catch {
    return fallback;
  }
}

export function loadLuminOperatingModel() {
  if (!modelCache) {
    modelCache = readJson(MODEL_PATH, {
      runtime_lanes: [],
      truth_scale: [],
      authority_roots: [],
      model_tiering: {},
    });
  }
  return modelCache;
}

export function loadProductRegistry() {
  if (!registryCache) {
    registryCache = readJson(PRODUCT_REGISTRY_PATH, { products: [] });
  }
  return registryCache;
}

export function getChairLane(channel = '') {
  const model = loadLuminOperatingModel();
  const value = String(channel || '').trim();
  return model.runtime_lanes.find((lane) => Array.isArray(lane.chair_channels) && lane.chair_channels.includes(value)) || null;
}

export function getTruthScale() {
  return loadLuminOperatingModel().truth_scale || [];
}

export function getAuthorityRoots() {
  return loadLuminOperatingModel().authority_roots || [];
}

export function getModelTieringPolicy() {
  return loadLuminOperatingModel().model_tiering || {};
}

export function findProductRecord(productId = '') {
  const wanted = String(productId || '').trim().toLowerCase();
  return (loadProductRegistry().products || []).find((product) => String(product.product_id || '').toLowerCase() === wanted) || null;
}

export function summarizeLuminOperatingModel() {
  const model = loadLuminOperatingModel();
  return {
    chair_identity: model.chair_identity || null,
    model_tiering: model.model_tiering || null,
    truth_scale: model.truth_scale || [],
    runtime_lanes: model.runtime_lanes || [],
    authority_roots: model.authority_roots || [],
  };
}
