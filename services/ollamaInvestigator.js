/**
 * SYNOPSIS: Exports investigateOllamaSystemPrompts — services/ollamaInvestigator.js.
 */
export async function investigateOllamaSystemPrompts() {
  const ollamaData = await fetchOllamaData();
  const report = analyzeOllamaTokens(ollamaData);
  return report;
}

async function fetchOllamaData() {
  // Simulates fetching data related to Ollama tokens
  return [
    { callId: 1, tokens: 8000 },
    { callId: 2, tokens: 7500 },
    { callId: 3, tokens: 7200 }
    // Add more data as needed
  ];
}

function analyzeOllamaTokens(data) {
  const tokenThreshold = 7000;
  const bloatedCalls = data.filter(call => call.tokens > tokenThreshold);
  const averageTokens = calculateAverageTokens(data);

  return {
    bloatedCalls,
    averageTokens,
    recommendation: generateRecommendation(averageTokens, tokenThreshold)
  };
}

function calculateAverageTokens(data) {
  const totalTokens = data.reduce((sum, call) => sum + call.tokens, 0);
  return totalTokens / data.length;
}

function generateRecommendation(averageTokens, threshold) {
  if (averageTokens > threshold) {
    return "Consider optimizing system prompts to reduce token usage.";
  } else {
    return "System prompts are optimized.";
  }
}