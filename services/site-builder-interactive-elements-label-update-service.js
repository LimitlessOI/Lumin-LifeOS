/**
 * SYNOPSIS: Import necessary modules
 */
// Import necessary modules
import fs from 'fs/promises';
import path from 'path';

// Define the path to the data file
const dataFilePath = path.join(process.cwd(), 'data', 'interactive-elements-labels.json');

// Function to get interactive element labels
export async function getInteractiveElementLabels() {
  try {
    const data = await fs.readFile(dataFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading labels:', error);
    throw new Error('Failed to get interactive element labels');
  }
}

// Function to update an interactive element label
export async function updateInteractiveElementLabel(elementId, newLabel) {
  try {
    const data = await getInteractiveElementLabels();
    const elementIndex = data.findIndex(element => element.id === elementId);

    if (elementIndex === -1) {
      throw new Error(`Element with id ${elementId} not found`);
    }

    data[elementIndex].label = newLabel;

    await fs.writeFile(dataFilePath, JSON.stringify(data, null, 2), 'utf-8');
    return data[elementIndex];
  } catch (error) {
    console.error('Error updating label:', error);
    throw new Error('Failed to update interactive element label');
  }
}
