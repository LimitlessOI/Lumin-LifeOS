/**
 * SYNOPSIS: Exports getElementGuides — services/site-builder-interactive-element-guides.js.
 */
const elementGuides = new Map();

export function getElementGuides() {
  return Array.from(elementGuides.entries()).map(([element, guide]) => ({
    element,
    ...guide
  }));
}

export function addElementGuide(element, label, description) {
  if (!element || !label || !description) {
    throw new Error("Element, label, and description are required.");
  }
  elementGuides.set(element, { label, description });
}
