/**
 * SYNOPSIS: services/site-builder-template-variations.js
 */
// services/site-builder-template-variations.js

// In-memory storage for template variations
const templateVariations = [];

// Retrieve template variations by ID
export function getTemplateVariations(templateId) {
  return templateVariations.filter(variation => variation.templateId === templateId);
}

// Add a new template variation
export function addTemplateVariation(templateId, variation) {
  const newVariation = { templateId, ...variation };
  templateVariations.push(newVariation);
  return newVariation;
}

// List all template variations
export function listAllVariations() {
  return templateVariations;
}
