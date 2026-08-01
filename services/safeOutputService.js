/**
 * SYNOPSIS: safeOutput filter helpers — implements family/church/classroom-safe
 * outputs by filtering content based on safety levels.
 * @ssot docs/products/faith-studio/PRODUCT_HOME.md
 */

// safeOutput filter helpers
let defaultSafetyLevel = 'medium';

function filterContent(content, safetyLevel) {
  switch (safetyLevel) {
    case 'high':
      return content.replace(/inappropriate|offensive|profanity|sexually explicit/gi, '***');
    case 'medium':
      return content.replace(/offensive|profanity/gi, '***');
    case 'low':
    default:
      return content;
  }
}

/**
 * Ensures content is safe based on a specified or default safety level.
 * Deterministic-only pass (no AI call) — use generateSafeOutput for the full
 * AI + deterministic pipeline.
 */
export function ensureSafeOutput(content, safetyLevel = defaultSafetyLevel) {
  return filterContent(content, safetyLevel);
}

/**
 * Generates family/church/classroom-safe outputs using AI and content filtering.
 * @param {object} deps Dependencies including logger and callCouncilMember.
 * @param {object} payload Payload containing the content to be made safe and an optional safety level.
 */
export async function generateSafeOutput(deps, payload) {
  const { logger, callCouncilMember } = deps;
  const { content, safetyLevel = defaultSafetyLevel } = payload || {};

  if (!content) {
    logger.warn('generateSafeOutput called with empty content.');
    return '';
  }

  try {
    const prompt = `Review the following content for suitability in a family, church, or classroom environment. Apply a '${safetyLevel}' safety filter. Replace any inappropriate or sensitive phrases with asterisks (***) or rephrase to be entirely innocuous. Provide only the cleaned text.

Content: "${content}"`;

    const aiFilteredContent = await callCouncilMember('content-moderator', prompt, {
      temperature: 0.2,
      max_tokens: 1000,
    });

    // Deterministic filtering as a final pass, in case the AI pass missed anything.
    return filterContent(aiFilteredContent, safetyLevel);
  } catch (error) {
    logger.error({ error, content, safetyLevel }, 'Error in generateSafeOutput');
    throw new Error('Failed to generate safe output.');
  }
}

/**
 * Sets the default safety level for content processing.
 */
export function setDefaultSafety(level) {
  defaultSafetyLevel = level;
}
