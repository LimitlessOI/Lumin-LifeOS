/**
 * SYNOPSIS: Exports logStruggleDetectionEvent — services/struggleDetectionLogger.js.
 */
import fs from 'fs';
import path from 'path';

const logFilePath = path.join(process.cwd(), 'logs', 'struggleDetectionEvents.log');

export function logStruggleDetectionEvent(event) {
  const logEntry = `${new Date().toISOString()} - ${JSON.stringify(event)}\n`;
  fs.appendFile(logFilePath, logEntry, (err) => {
    if (err) {
      console.error('Failed to log struggle detection event:', err);
    }
  });
}
