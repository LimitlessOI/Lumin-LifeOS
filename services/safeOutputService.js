/**
 * SYNOPSIS: safeOutput filter helpers for family/church/classroom-safe content.
 * @ssot docs/products/faith-studio/PRODUCT_HOME.md
 */

// safeOutput filter helpers
let defaultSafetyLevel = 'medium';

export function ensureSafeOutput(content, safetyLevel = defaultSafetyLevel) {
  return filterContent(content, safetyLevel);
}

export function generateSafeOutput(content, safetyLevel = defaultSafetyLevel) {
  return filterContent(content, safetyLevel);
}

function filterContent(content, safetyLevel) {
  switch (safetyLevel) {
    case 'high':
      return content.replace(/inappropriate|offensive/gi, '***');
    case 'medium':
      return content.replace(/offensive/gi, '***');
    case 'low':
    default:
      return content;
  }
}

export function setDefaultSafety(level) {
  defaultSafetyLevel = level;
}
