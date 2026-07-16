/**
 * SYNOPSIS: services/accreditationBodyConsultationResult.js
 * @ssot docs/products/lumin-university/PRODUCT_HOME.md
 */
// services/accreditationBodyConsultationResult.js

let consultationResults = [];

// Stores the consultation result
export function storeAccreditationConsultationResult(result) {
  consultationResults.push(result);
}

// Retrieves all consultation results
export function getConsultationResults() {
  return [...consultationResults]; // Return a copy to prevent direct modification
}
