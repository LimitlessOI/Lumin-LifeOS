/**
 * SYNOPSIS: Existing file content
 */
// Existing file content
// services/reverenceBlockService.js

// Function to check if an output is irreverent
function isIrreverent(output) {
  const irreverentTerms = ['offensiveTerm1', 'offensiveTerm2']; // Add more terms as needed
  return irreverentTerms.some(term => output.includes(term));
}

// Function to block irreverent outputs
export function blockIrreverentOutputs(output) {
  if (isIrreverent(output)) {
    return 'Output blocked due to irreverence.';
  }
  return output;
}

// Export the function
export { isIrreverent };
