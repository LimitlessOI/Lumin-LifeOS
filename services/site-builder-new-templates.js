/**
 * SYNOPSIS: Exports getTemplates — services/site-builder-new-templates.js.
 */
const templates = [];

export function getTemplates() {
  return templates;
}

export function addTemplate(template) {
  if (template && typeof template === 'object' && !templates.includes(template)) {
    templates.push(template);
    return true;
  }
  return false;
}
