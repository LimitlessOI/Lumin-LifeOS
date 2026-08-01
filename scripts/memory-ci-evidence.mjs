/**
 * SYNOPSIS: Records CI evidence by running `npm run memory:ci-evidence`.
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */
import { spawn } from 'child_process';

/**
 * Records CI evidence by running `npm run memory:ci-evidence`.
 * @returns {Promise<void>} A promise that resolves when the command completes, or rejects if an error occurs.
 */
export async function recordCiEvidence() {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'memory:ci-evidence'], {
      stdio: 'inherit', // This pipes stdout/stderr of the child to the parent
      shell: true, // Use shell to allow npm to find its binaries
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log('CI evidence recorded successfully.');
        resolve();
      } else {
        console.error(`npm run memory:ci-evidence exited with code ${code}`);
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    child.on('error', (err) => {
      console.error('Failed to start npm run memory:ci-evidence process:', err);
      reject(err);
    });
  });
}

// Alias for the BUILD_QUEUE expected export name.
export async function createFactEvidence(...args) {
  return recordCiEvidence(...args);
}