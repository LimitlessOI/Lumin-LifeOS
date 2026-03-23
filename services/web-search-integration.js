/**
 * web-search-integration.js — extracted from server.js
 * Web search validation, drift detection, and Gemini web search helpers.
 *
 * Use createWebSearchIntegration(deps) to get bound functions.
 * @ssot docs/projects/AMENDMENT_15_BUSINESS_TOOLS.md
 */

/**
 * @param {object} deps
 * @param {function} deps.callCouncilMember
 */
export function createWebSearchIntegration(deps) {
  const { callCouncilMember } = deps;

  // --------------------------------------------------------------------------
  // validateAgainstWebSearch
  // --------------------------------------------------------------------------
  async function validateAgainstWebSearch(aiResponse, webSearchResults, problem) {
    try {
      if (!webSearchResults || !webSearchResults.success) {
        return { validated: false, confidence: "low", reason: "No web search results available" };
      }

      // Extract key technical terms from AI response
      const responseTerms = extractTechnicalTerms(aiResponse);
      const webTerms = extractTechnicalTerms(webSearchResults.results);

      // Check for overlap
      const overlap = responseTerms.filter(term => webTerms.includes(term));
      const overlapRatio = overlap.length / Math.max(responseTerms.length, 1);

      // Check if web search confirms or contradicts
      const confirms = overlapRatio > 0.4;
      const confidence = overlapRatio > 0.6 ? "high" : overlapRatio > 0.4 ? "medium" : "low";

      return {
        validated: confirms,
        confidence,
        overlapRatio,
        reason: confirms
          ? `Response aligns with web search results (${(overlapRatio * 100).toFixed(0)}% overlap)`
          : `Response may not align with web search results (${(overlapRatio * 100).toFixed(0)}% overlap)`,
      };
    } catch (error) {
      console.warn(`Web search validation error: ${error.message}`);
      return { validated: false, confidence: "unknown", reason: error.message };
    }
  }

  // --------------------------------------------------------------------------
  // extractTechnicalTerms (helper)
  // --------------------------------------------------------------------------
  function extractTechnicalTerms(text) {
    // Extract technical terms: function names, APIs, error messages, etc.
    const terms = [];
    // Code patterns
    const codeMatches = text.match(/\b[a-z_][a-z0-9_]*\s*\(/gi) || [];
    terms.push(...codeMatches.map(m => m.replace(/\s*\(/, "").toLowerCase()));
    // Error patterns
    const errorMatches = text.match(/error[:\s]+([^\n]+)/gi) || [];
    terms.push(...errorMatches.map(m => m.replace(/error[:\s]+/i, "").toLowerCase()));
    // API/library names
    const apiMatches = text.match(/\b(?:require|import|from)\s+['"]([^'"]+)['"]/gi) || [];
    terms.push(...apiMatches.map(m => m.replace(/\b(?:require|import|from)\s+['"]|['"]/gi, "").toLowerCase()));
    return [...new Set(terms)];
  }

  // --------------------------------------------------------------------------
  // detectDrift
  // --------------------------------------------------------------------------
  async function detectDrift(member, currentResponse, historicalResponses) {
    try {
      if (historicalResponses.length < 3) {
        return { hasDrift: false, confidence: "low", reason: "Insufficient history" };
      }

      // Compare current response style/approach with historical
      const currentPattern = extractSolutionPattern(currentResponse);
      const historicalPatterns = historicalResponses.map(r => extractSolutionPattern(r));

      // Check for significant deviation
      const avgSimilarity = historicalPatterns.reduce((sum, pattern) => {
        const words1 = new Set(currentPattern.split(/\s+/));
        const words2 = new Set(pattern.split(/\s+/));
        const intersection = new Set([...words1].filter(x => words2.has(x)));
        const union = new Set([...words1, ...words2]);
        return sum + (intersection.size / union.size);
      }, 0) / historicalPatterns.length;

      const hasDrift = avgSimilarity < 0.3;
      const confidence = avgSimilarity < 0.2 ? "high" : avgSimilarity < 0.3 ? "medium" : "low";

      return {
        hasDrift,
        confidence,
        similarity: avgSimilarity,
        reason: hasDrift
          ? `Response style deviates significantly from historical patterns (${(avgSimilarity * 100).toFixed(0)}% similarity)`
          : `Response consistent with historical patterns (${(avgSimilarity * 100).toFixed(0)}% similarity)`,
      };
    } catch (error) {
      console.warn(`Drift detection error: ${error.message}`);
      return { hasDrift: false, confidence: "unknown", reason: error.message };
    }
  }

  // --------------------------------------------------------------------------
  // extractSolutionPattern (helper)
  // --------------------------------------------------------------------------
  function extractSolutionPattern(response) {
    // Extract the core solution approach
    const patterns = [
      /(?:fix|solution|approach|method):\s*([^\n]+)/i,
      /(?:use|try|implement):\s*([^\n]+)/i,
    ];
    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match) return match[1].toLowerCase();
    }
    return response.substring(0, 100).toLowerCase();
  }

  // --------------------------------------------------------------------------
  // searchWebWithGemini
  // --------------------------------------------------------------------------
  async function searchWebWithGemini(query) {
    try {
      const apiKey = process.env.LIFEOS_GEMINI_KEY?.trim() || process.env.GEMINI_API_KEY?.trim();
      if (!apiKey) {
        console.log("ℹ️ Gemini API key not set → using local open-source alias for web search");
      }

      // Use Gemini with enhanced prompt for web knowledge
      const searchPrompt = `🔍 WEB SEARCH REQUEST: ${query}

Search your knowledge base and web-connected information for:
1. Recent blog posts, Stack Overflow answers, and documentation
2. Code examples and working solutions
3. Best practices and patterns
4. GitHub repositories with similar code
5. Official documentation links

Provide:
- Specific solutions with code examples
- Links to resources (if available in your knowledge)
- Step-by-step fixes
- Why these solutions work

Focus on practical, tested solutions that have worked for others.`;

      const response = await callCouncilMember("gemini", searchPrompt, {
        webSearch: true,
      });

      return {
        success: true,
        results: response,
        source: "gemini_web_search",
      };
    } catch (error) {
      console.warn(`⚠️ Gemini web search failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        source: "gemini_web_search",
      };
    }
  }

  return { validateAgainstWebSearch, detectDrift, searchWebWithGemini };
}
