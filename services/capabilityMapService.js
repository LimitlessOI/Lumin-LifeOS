/**
 * SYNOPSIS: services/capabilityMapService.js
 * @ssot docs/products/capability-map/PRODUCT_HOME.md
 */
// services/capabilityMapService.js

// Existing code
const capabilities = [];

/**
 * Retrieves all pending capabilities.
 * @returns {Array} An array of pending capabilities.
 */
export function getPendingCapabilities() {
  return capabilities.filter(capability => !capability.completed);
}

/**
 * Adds a new capability to the list.
 * @param {Object} capability - The capability to add.
 */
export function addCapability(capability) {
  capabilities.push(capability);
}

export default {
  getPendingCapabilities,
  addCapability
};
