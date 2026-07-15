/**
 * SYNOPSIS: Exports identifyTargetCustomers — scripts/identifyTargetCustomers.mjs.
 */
import fetch from 'node-fetch';

export async function identifyTargetCustomers(networkUrl) {
  try {
    const response = await fetch(networkUrl);
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }
    const customers = await response.json();
    return customers.slice(0, 5);
  } catch (error) {
    console.error('Error identifying target customers:', error);
    return [];
  }
}
