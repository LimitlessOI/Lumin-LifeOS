/**
 * SYNOPSIS: Exports rejectDisclosure and approveDisclosure — services/performanceDisclosureApproval.js.
 * @ssot docs/products/personal-finance-os/PRODUCT_HOME.md
 */
export function rejectDisclosure() {
  return {
    approved: false,
    message: 'Disclosure must include both past performance and future risks'
  };
}

export function approveDisclosure(disclosureText) {
  if (!disclosureText.includes('past performance')) {
    return {
      approved: false,
      message: 'Disclosure must include past performance'
    };
  }
  if (!disclosureText.includes('future risks')) {
    return {
      approved: false,
      message: 'Disclosure must include future risks'
    };
  }
  return {
    approved: true,
    message: 'Disclosure approved'
  };
}

export function approvePerformanceDisclosure(disclosureText) {
  return approveDisclosure(disclosureText);
}
