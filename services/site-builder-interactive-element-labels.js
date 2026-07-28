/**
 * SYNOPSIS: services/site-builder-interactive-element-labels.js
 */
// services/site-builder-interactive-element-labels.js

// Mock database for storing labels
const labelsDB = new Map();

// Function to get labels of interactive elements
export function getElementLabels(elementId) {
  if (!elementId) {
    throw new Error('Element ID is required');
  }
  return labelsDB.get(elementId) || [];
}

// Function to update a label for a specific interactive element
export function updateElementLabel(elementId, label) {
  if (!elementId || !label) {
    throw new Error('Element ID and label are required');
  }
  const labels = labelsDB.get(elementId) || [];
  labels.push(label);
  labelsDB.set(elementId, labels);
}
