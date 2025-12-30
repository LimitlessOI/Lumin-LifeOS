/**
 * ╔══════════════════════════════════════════════════════════════════════════════════╗
 * ║                    JSON SANITIZER                                                 ║
 * ║                    Removes comments and invalid JSON from LLM responses          ║
 * ╚══════════════════════════════════════════════════════════════════════════════════╝
 */

/**
 * Sanitize JSON response from LLM (removes comments, trailing commas, etc.)
 * Fixes JSON parsing errors from models that output comments in JSON
 */
export function sanitizeJsonResponse(text) {
  if (!text || typeof text !== 'string') return text;
  
  // Remove common JSON-breaking patterns from LLM responses
  let cleaned = text
    // Remove single-line comments
    .replace(/\/\/.*$/gm, '')
    // Remove multi-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove trailing commas before } or ]
    .replace(/,(\s*[}\]])/g, '$1')
    // Remove markdown code fences
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    // Trim whitespace
    .trim();
  
  // Try to extract JSON object if wrapped in text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleaned = jsonMatch[0];
  }
  
  // Also try array if no object found
  if (!cleaned.startsWith('{')) {
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      cleaned = arrayMatch[0];
    }
  }
  
  return cleaned;
}

/**
 * Parse JSON with sanitization (safe wrapper for LLM responses)
 */
export function parseJSONSafe(text, fallback = null) {
  if (!text || typeof text !== 'string') return fallback;
  
  try {
    const sanitized = sanitizeJsonResponse(text);
    return JSON.parse(sanitized);
  } catch (error) {
    console.warn(`[JSON-SANITIZER] Failed to parse JSON: ${error.message}`);
    return fallback;
  }
}

/**
 * Extract and parse JSON from text (handles wrapped JSON)
 */
export function extractAndParseJSON(text, fallback = null) {
  if (!text || typeof text !== 'string') return fallback;
  
  try {
    // Try array first
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      const sanitized = sanitizeJsonResponse(arrayMatch[0]);
      return JSON.parse(sanitized);
    }
    
    // Try object
    const objMatch = text.match(/\{[\s\S]*\}/);
    if (objMatch) {
      const sanitized = sanitizeJsonResponse(objMatch[0]);
      return JSON.parse(sanitized);
    }
    
    // Try parsing entire response
    const sanitized = sanitizeJsonResponse(text);
    return JSON.parse(sanitized);
  } catch (error) {
    console.warn(`[JSON-SANITIZER] Failed to extract/parse JSON: ${error.message}`);
    return fallback;
  }
}

export default { sanitizeJsonResponse, parseJSONSafe, extractAndParseJSON };
