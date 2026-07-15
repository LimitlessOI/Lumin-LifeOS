/**
 * SYNOPSIS: Exports importPayerList — services/importPayerList.js.
 */
import fetch from 'node-fetch';

export async function importPayerList() {
  try {
    const response = await fetch('https://external-source.com/api/payer-list');
    if (!response.ok) {
      throw new Error('Failed to fetch payer list');
    }
    const payerList = await response.json();
    return payerList;
  } catch (error) {
    console.error('Error importing payer list:', error);
    throw error;
  }
}