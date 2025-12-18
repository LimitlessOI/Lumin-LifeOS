#!/usr/bin/env node
import { runQualityRegression } from '../audit/quality/regression_runner.js';

async function main() {
  try {
    const { jsonPath, mdPath, report } = await runQualityRegression();
    console.log('Quality regression report written:');
    console.log(`  JSON: ${jsonPath}`);
    console.log(`  MD:   ${mdPath}`);
    console.log('Summary:', report.summary);
  } catch (err) {
    console.error('Quality regression failed:', err.message);
    process.exit(1);
  }
}

main();
