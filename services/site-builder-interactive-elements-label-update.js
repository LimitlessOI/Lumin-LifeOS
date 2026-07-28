/**
 * SYNOPSIS: services/site-builder-interactive-elements-label-update.js
 */
// services/site-builder-interactive-elements-label-update.js

export function updateInteractiveElementLabels(elements) {
  elements.forEach(element => {
    if (!element.hasAttribute('aria-label') && !element.hasAttribute('aria-labelledby')) {
      const tagName = element.tagName.toLowerCase();
      let label = '';

      switch (tagName) {
        case 'button':
          label = 'Button';
          break;
        case 'a':
          label = 'Link';
          break;
        case 'input':
          const type = element.getAttribute('type') || 'text';
          label = `${type.charAt(0).toUpperCase() + type.slice(1)} Input`;
          break;
        case 'select':
          label = 'Dropdown';
          break;
        case 'textarea':
          label = 'Text Area';
          break;
        default:
          label = 'Interactive Element';
      }

      element.setAttribute('aria-label', label);
    }
  });
}
