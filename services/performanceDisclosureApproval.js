/**
 * SYNOPSIS: Exports rejectDisclosure — services/performanceDisclosureApproval.js.
 * @ssot docs/products/personal-finance-os/PRODUCT_HOME.md
 */
export function rejectDisclosure() {
  return {
    approved: false,
    message: 'Disclosure must include both past performance and future risks'
  };
}

export function approveDisclosure(disclosureText) {
  if (!disclosureText.includes('past performance') || !disclosureText.includes('future risks')) {
    return rejectDisclosure();
  }

  return {
    approved: true,
    message: 'Disclosure approved'
  };
}

export function checkAndApprovePerformanceDisclosure(disclosureText) {
  return approveDisclosure(disclosureText);
}
