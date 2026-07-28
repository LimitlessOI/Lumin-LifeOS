/**
 * SYNOPSIS: services/site-builder-additional-templates.js
 */
// services/site-builder-additional-templates.js

const additionalTemplates = [
  { id: 1, name: 'Blog Template', description: 'A template for blogging' },
  { id: 2, name: 'Portfolio Template', description: 'A template for showcasing work' },
  { id: 3, name: 'E-commerce Template', description: 'A template for online stores' }
];

function getTemplateOptions() {
  return additionalTemplates;
}

export { getTemplateOptions };
