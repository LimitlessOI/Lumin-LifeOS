/**
 * SYNOPSIS: Exports recordCiEvidence — scripts/memory-ci-evidence.mjs.
 */
import { exec } from 'child_process';

export function recordCiEvidence() {
  exec('npm run memory:ci-evidence', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return;
    }
    console.log(`Stdout: ${stdout}`);
  });
}
