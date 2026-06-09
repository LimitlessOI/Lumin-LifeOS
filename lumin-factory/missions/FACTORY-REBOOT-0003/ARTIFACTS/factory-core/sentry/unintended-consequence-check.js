export function unintendedConsequenceCheck(subject) {
  return {
    subject,
    reviewLanes: ['help', 'harm', 'misuse', 'boundary_regression'],
    status: 'REVIEW_REQUIRED'
  };
}
