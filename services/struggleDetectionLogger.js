/**
 * SYNOPSIS: Function to log struggle detection events
 */
import fs from 'fs';
import path from 'path';

// Function to log struggle detection events
export function logStruggleDetectionEvent(event) {
  const logFilePath = path.resolve('logs', 'struggleDetection.log');
  const logEntry = `${new Date().toISOString()} - ${JSON.stringify(event)}\n`;

  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err) {
      console.error('Failed to log struggle detection event:', err);
    }
  });
}
