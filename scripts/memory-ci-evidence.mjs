/**
 * @ssot docs/products/memory-intelligence/PRODUCT_HOME.md
 */
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
    createFactEvidence(stdout);
  });
}

export function createFactEvidence(data) {
  // Assume db is previously defined and connected
  db.collection('evidence').insertOne({ fact_evidence: data }, (err, res) => {
    if (err) {
      console.error(`DB Error: ${err.message}`);
      return;
    }
    console.log('Fact evidence recorded in the database.');
  });
}