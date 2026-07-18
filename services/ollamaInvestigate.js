/**
 * SYNOPSIS: services/ollamaInvestigate.js
 * @ssot docs/products/ai-council/PRODUCT_HOME.md
 */
// services/ollamaInvestigate.js

// Function to analyze token usage
function analyzeTokenUsage(callsData) {
    let totalTokens = 0;
    let callCount = callsData.length;
    let bloatedCalls = [];

    callsData.forEach(call => {
        const tokens = call.tokenCount;
        totalTokens += tokens;
        if (tokens > THRESHOLD) { // Define a threshold to identify bloat
            bloatedCalls.push(call);
        }
    });

    const averageTokens = totalTokens / callCount;

    return {
        averageTokens,
        bloatedCalls
    };
}

// Export the function
export { analyzeTokenUsage };
