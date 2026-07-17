/**
 * SYNOPSIS: Import payer list from an external source.
 * @ssot docs/products/clientcare-billing-recovery/PRODUCT_HOME.md
 */
import fetch from 'node-fetch';

export async function importPayerList() {
  try {
    const response = await fetch('https://external-source.com/api/payer-list');
    if (!response.ok) {
      throw new Error('Failed to fetch payer list');
    }
    const payerList = await response.json();

    // Assuming the payerList is an array of claims
    const uniquePayerList = getUniqueClaims(payerList);
    return uniquePayerList;
  } catch (error) {
    console.error('Error importing payer list:', error);
    throw error;
  }
}

function getUniqueClaims(claims) {
  // Assuming each claim has a unique identifier 'claimId'
  const claimMap = new Map();
  claims.forEach(claim => {
    if (!claimMap.has(claim.claimId)) {
      claimMap.set(claim.claimId, claim);
    }
  });
  return Array.from(claimMap.values());
}
