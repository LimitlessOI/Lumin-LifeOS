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
function fetchPendingCapabilities() {
  return capabilities.filter(capability => !capability.completed);
}

export { fetchPendingCapabilities };

/**
 * Adds a new capability to the list.
 * @param {Object} capability - The capability to add.
 */
export function addCapability(capability) {
  capabilities.push(capability);
}

export default {
  fetchPendingCapabilities,
  addCapability
};
