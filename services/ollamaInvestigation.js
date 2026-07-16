/**
 * @ssot docs/products/ai-council/PRODUCT_HOME.md
 */
/**
 * SYNOPSIS: Exports investigateTokenUsage — services/ollamaInvestigation.js.
 */
export function investigateOllamaPrompts(ollamaData) {
  if (!Array.isArray(ollamaData)) {
    throw new Error('Invalid input: ollamaData must be an array');
  }

  const tokenUsageDetails = ollamaData.map(call => {
    if (typeof call !== 'object' || call === null) {
      throw new Error('Invalid call data: each call must be an object');
    }

    const { systemPrompt, tokensUsed } = call;
    if (typeof systemPrompt !== 'string' || typeof tokensUsed !== 'number') {
      throw new Error('Invalid call data: systemPrompt must be a string and tokensUsed must be a number');
    }

    return {
      systemPromptLength: systemPrompt.length,
      tokensUsed,
      tokensPerCharacter: tokensUsed / systemPrompt.length
    };
  });

  const averageTokensPerCall = tokenUsageDetails.reduce((acc, { tokensUsed }) => acc + tokensUsed, 0) / tokenUsageDetails.length;

  return {
    tokenUsageDetails,
    averageTokensPerCall
  };
}
