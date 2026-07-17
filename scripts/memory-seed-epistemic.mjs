/**
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */
/**
 * SYNOPSIS: Script — Memory Seed Epistemic.
 */
import { exec } from 'child_process';

function seedEpistemicFacts() {
  exec('npm run memory:seed', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing memory seed: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Stderr from memory seed: ${stderr}`);
      return;
    }
    console.log(`Memory seed output: ${stdout}`);
  });
}

export { seedEpistemicFacts };
