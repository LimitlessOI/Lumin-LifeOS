/**
 * SYNOPSIS: Exports investigateOllamaTokens — services/ollamaInvestigation.js.
 * @ssot docs/products/ai-council/PRODUCT_HOME.md
 */
export function investigateOllamaTokens(ollamaData) {
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

    const systemPromptLength = systemPrompt.length;
    const tokensPerCharacter = tokensUsed / systemPromptLength;

    // Identify bloated prompts
    const isBloated = systemPromptLength > 1000; // Example threshold

    return {
      systemPromptLength,
      tokensUsed,
      tokensPerCharacter,
      isBloated
    };
  });

  const averageTokensPerCall = tokenUsageDetails.reduce((acc, { tokensUsed }) => acc + tokensUsed, 0) / tokenUsageDetails.length;

  const bloatedPrompts = tokenUsageDetails.filter(detail => detail.isBloated);

  return {
    tokenUsageDetails,
    averageTokensPerCall,
    bloatedPrompts
  };
}
