/**
 * SYNOPSIS: Existing code and exports
 */
// Existing code and exports
export function existingFunction() {
  // Some existing functionality
}

// New implementation for token budget and truncation
export function calculateTokenBudget(totalTokens, usedTokens, buffer = 0) {
  return Math.max(0, totalTokens - usedTokens - buffer);
}

export function truncateContext(context, maxTokens) {
  const tokens = tokenize(context);
  if (tokens.length <= maxTokens) {
    return context;
  }
  return detokenize(tokens.slice(0, maxTokens));
}

// Helper functions (not exported)
function tokenize(context) {
  // Logic to convert context into tokens
  return context.split(' '); // Example logic, modify as needed
}

function detokenize(tokens) {
  // Logic to convert tokens back to context
  return tokens.join(' '); // Example logic, modify as needed
}
