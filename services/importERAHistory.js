/**
 * SYNOPSIS: Processes and imports ERA/remit history to boost payout forecasting confidence.
 * Processes and imports ERA/remit history to boost payout forecasting confidence.
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Reads and parses ERA/remit history files.
 * @param {string} directory - The directory containing the ERA/remit files.
 * @returns {Promise<Array<Object>>} - A promise that resolves to an array of parsed history objects.
 */
async function readHistoryFiles(directory) {
  const files = await fs.readdir(directory);
  const historyData = [];

  for (const file of files) {
    const filePath = path.join(directory, file);
    const data = await fs.readFile(filePath, 'utf-8');
    const parsedData = JSON.parse(data);
    historyData.push(parsedData);
  }

  return historyData;
}

/**
 * Imports ERA/remit history for boosting payout forecasting confidence.
 * @param {string} directory - The directory containing the ERA/remit files.
 * @returns {Promise<void>}
 */
export async function importERAHistory(directory) {
  try {
    const historyData = await readHistoryFiles(directory);
    // Placeholder for processing logic to utilize historyData
    console.log('Successfully imported ERA/remit history:', historyData);
  } catch (error) {
    console.error('Error importing ERA/remit history:', error);
  }
}
