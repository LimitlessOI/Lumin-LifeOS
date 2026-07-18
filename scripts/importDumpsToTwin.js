/**
 * SYNOPSIS: Exports importDumps — scripts/importDumpsToTwin.js.
 */
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

export function importDumps(buildProfile) {
  const dumpsPath = path.resolve(__dirname, '../dumps');
  const twinPath = path.resolve(__dirname, '../twin');

  fs.readdir(dumpsPath, (err, files) => {
    if (err) {
      console.error('Failed to read dumps directory:', err);
      return;
    }

    files.forEach(file => {
      const filePath = path.join(dumpsPath, file);
      const command = `node importDump.js --file ${filePath} --dest ${twinPath} --build-profile ${buildProfile}`;
      
      exec(command, (err, stdout, stderr) => {
        if (err) {
          console.error(`Error importing dump ${file}:`, stderr);
          return;
        }
        console.log(`Successfully imported ${file}:`, stdout);
      });
    });
  });
}

export function main() {
  const buildProfile = process.argv[2] || 'default';
  importDumps(buildProfile);
}