/**
 * SYNOPSIS: Creates a new security receipt and stores it.
 */
// Placeholder for security receipt data storage
const securityReceipts = [];

/**
 * Creates a new security receipt and stores it.
 * @param {Object} receipt - The receipt data.
 * @returns {Object} The created receipt.
 */
export function createReceipt(receipt) {
  securityReceipts.push(receipt);
  return receipt;
}

/**
 * Retrieves a security receipt by its ID.
 * @param {string} id - The ID of the receipt to retrieve.
 * @returns {Object|null} The found receipt or null if not found.
 */
export function getReceipt(id) {
  return securityReceipts.find(receipt => receipt.id === id) || null;
}
