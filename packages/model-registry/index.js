/**
 * Model Registry
 * Loads and manages model configurations from YAML
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let registry = null;

/**
 * Load model registry from YAML
 */
export function loadRegistry() {
  if (registry) return registry;

  try {
    const yamlPath = path.join(__dirname, 'models.yaml');
    const yamlContent = fs.readFileSync(yamlPath, 'utf8');
    registry = yaml.load(yamlContent);
    return registry;
  } catch (error) {
    console.error('Failed to load model registry:', error);
    // Return empty registry for graceful degradation
    return { models: [], capability_roles: {} };
  }
}

/**
 * Get all models
 */
export function getAllModels() {
  const reg = loadRegistry();
  return reg.models || [];
}

/**
 * Get models by capability
 */
export function getModelsByCapability(capability) {
  const models = getAllModels();
  return models.filter(m => 
    m.capabilities && m.capabilities.includes(capability)
  );
}

/**
 * Get models by role
 */
export function getModelsByRole(role) {
  const reg = loadRegistry();
  const roleConfig = reg.capability_roles?.[role];
  if (!roleConfig) return [];

  const models = getAllModels();
  const result = [];

  if (roleConfig.primary) {
    const primary = models.find(m => m.name === roleConfig.primary);
    if (primary) result.push(primary);
  }
  if (roleConfig.fallback) {
    const fallback = models.find(m => m.name === roleConfig.fallback);
    if (fallback) result.push(fallback);
  }
  if (roleConfig.fast) {
    const fast = models.find(m => m.name === roleConfig.fast);
    if (fast) result.push(fast);
  }

  return result;
}

/**
 * Get model by name
 */
export function getModel(name) {
  const models = getAllModels();
  return models.find(m => m.name === name);
}

/**
 * Get free models only
 */
export function getFreeModels() {
  const models = getAllModels();
  return models.filter(m => m.cost_class === 'free');
}

/**
 * Get premium models only
 */
export function getPremiumModels() {
  const models = getAllModels();
  return models.filter(m => m.cost_class === 'premium');
}

/**
 * Check if model is available (basic check)
 */
export async function isModelAvailable(model) {
  if (!model) return false;

  // Check provider-specific availability
  if (model.provider === 'ollama') {
    try {
      const response = await fetch(`${model.endpoint}/api/tags`);
      if (!response.ok) return false;
      const data = await response.json();
      return data.models?.some(m => m.name === model.model_id);
    } catch (error) {
      return false;
    }
  }

  // For other providers, assume available if configured
  return true;
}

export default {
  loadRegistry,
  getAllModels,
  getModelsByCapability,
  getModelsByRole,
  getModel,
  getFreeModels,
  getPremiumModels,
  isModelAvailable,
};
