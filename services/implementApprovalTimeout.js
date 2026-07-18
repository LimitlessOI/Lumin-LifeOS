/**
 * SYNOPSIS: services/implementApprovalTimeout.js
 * @ssot docs/products/business-tools/PRODUCT_HOME.md
 */
// services/implementApprovalTimeout.js

// Function to set a 48-hour auto-reject timeout
export function setApprovalTimeout(approvalId, rejectCallback) {
  const fortyEightHours = 48 * 60 * 60 * 1000; // 48 hours in milliseconds

  setTimeout(() => {
    rejectCallback(approvalId);
  }, fortyEightHours);
}

// Make sure to include this export to meet the export requirement
export default setApprovalTimeout;
