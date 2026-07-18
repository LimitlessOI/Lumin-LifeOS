/**
 * SYNOPSIS: Exports approvePerformanceDisclosure — services/performanceDisclosureApproval.js.
 * @ssot docs/products/personal-finance-os/PRODUCT_HOME.md
 */

export function rejectDisclosure() {
  return {
    approved: false,
    message: 'Disclosure must include both past performance and future risks'
  };
}

export function approveDisclosure(disclosureText) {
  if (disclosureText.includes('past performance') && disclosureText.includes('future risks')) {
    return {
      approved: true,
      message: 'Disclosure approved'
    };
  }
  return rejectDisclosure();
}

export function checkAndApprovePerformanceDisclosure(disclosureText) {
  if (disclosureText.includes('past performance disclosure')) {
    return approveDisclosure(disclosureText);
  }
  return rejectDisclosure();
}