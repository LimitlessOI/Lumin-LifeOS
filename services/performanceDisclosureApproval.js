/**
 * SYNOPSIS: Existing code for reviewing and approving past-performance disclosure language
 */
// Existing code for reviewing and approving past-performance disclosure language

export function approvePerformanceDisclosure(disclosureText) {
  // Check if disclosure text meets certain criteria for approval
  if (!disclosureText || typeof disclosureText !== 'string') {
    throw new Error('Invalid disclosure text');
  }

  // Example criteria: disclosure must mention past performance and future risks
  const hasPastPerformance = disclosureText.includes('past performance');
  const hasFutureRisks = disclosureText.includes('future risks');

  if (hasPastPerformance && hasFutureRisks) {
    return {
      approved: true,
      message: 'Disclosure approved'
    };
  } else {
    return {
      approved: false,
      message: 'Disclosure must include both past performance and future risks'
    };
  }
}
