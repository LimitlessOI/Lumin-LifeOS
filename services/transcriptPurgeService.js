/**
 * SYNOPSIS: Exports purgeOldTranscripts — services/transcriptPurgeService.js.
 * @ssot docs/products/word-keeper/PRODUCT_HOME.md
 */
import fs from 'fs';
import path from 'path';

const TRANSCRIPTS_DIR = './transcripts';
const TRANSCRIPT_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export function purgeOldTranscripts() {
  const now = Date.now();

  fs.readdir(TRANSCRIPTS_DIR, (err, files) => {
    if (err) {
      console.error('Error reading transcripts directory:', err);
      return;
    }

    files.forEach(file => {
      const filePath = path.join(TRANSCRIPTS_DIR, file);

      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error('Error getting file stats:', err);
          return;
        }

        const fileAge = now - stats.mtimeMs;
        if (fileAge > TRANSCRIPT_LIFETIME_MS) {
          fs.unlink(filePath, err => {
            if (err) {
              console.error('Error deleting old transcript file:', err);
            } else {
              console.log(`Deleted old transcript file: ${file}`);
            }
          });
        }
      });
    });
  });
}