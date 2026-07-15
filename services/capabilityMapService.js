/**
 * SYNOPSIS: Retrieves all pending capabilities.
 */
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
