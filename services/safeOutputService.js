/**
 * SYNOPSIS: New functions for family and classroom safety levels
 * @ssot docs/products/faith-studio/PRODUCT_HOME.md
 */
const defaultSafetyLevel = 'medium';

function ensureSafeOutput(content, safetyLevel = defaultSafetyLevel) {
  return filterContent(content, safetyLevel);
}

function generateSafeOutput(content, safetyLevel = defaultSafetyLevel) {
  return filterContent(content, safetyLevel);
}

function setDefaultSafety(level) {
  // Logic to set default safety level
}

function filterContent(content, safetyLevel) {
  const filters = {
    low: [],
    medium: ['inappropriate', 'offensive'],
    high: ['inappropriate', 'offensive', 'sensitive', 'adult'],
  };

  const forbiddenWords = filters[safetyLevel] || [];
  let safeContent = content;

  forbiddenWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    safeContent = safeContent.replace(regex, '[REDACTED]');
  });

  return safeContent;
}

// New functions for family and classroom safety levels
function familySafeOutputs(content) {
  const familySafetyLevel = 'high'; // Assuming higher safety for family
  return ensureSafeOutput(content, familySafetyLevel);
}

function classroomSafety(content) {
  const classroomSafetyLevel = 'medium'; // Assuming medium safety for classroom
  return ensureSafeOutput(content, classroomSafetyLevel);
}

// Exporting the necessary functions
export { ensureSafeOutput, setDefaultSafety, generateSafeOutput, familySafeOutputs, classroomSafety };
