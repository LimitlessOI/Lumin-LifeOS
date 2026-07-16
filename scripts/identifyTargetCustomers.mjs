/**
 * SYNOPSIS: Exports identifyTargetCustomers — scripts/identifyTargetCustomers.mjs.
 * @ssot docs/products/productized-sprint/PRODUCT_HOME.md
 */
import fetch from 'node-fetch';

/**
 * Identifies the first 5 target customers from the network.
 * @param {string} networkUrl - The URL to fetch the customer data from.
 * @returns {Promise<Array>} A promise that resolves to an array of the first 5 target customers.
 */
export async function identifyTargetCustomers(networkUrl) {
  try {
    const response = await fetch(networkUrl);
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }
    const customers = await response.json();
    const targetCustomerList = customers.slice(0, 5);
    console.log('Identified targetCustomerList:', targetCustomerList);
    return targetCustomerList;
  } catch (error) {
    console.error('Error identifying target customers:', error);
    return [];
  }
}

/**
 * Exports identifyTargetCustomers under the new name getInitialTargetCustomers.
 * @param {string} networkUrl - The URL to fetch the customer data from.
 * @returns {Promise<Array>} A promise that resolves to an array of the first 5 target customers.
 */
export const getInitialTargetCustomers = async (networkUrl) => {
  return identifyTargetCustomers(networkUrl);
};

export default getInitialTargetCustomers;
