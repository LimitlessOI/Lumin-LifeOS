#!/usr/bin/env node
import { stdin as input, exit } from 'process';
import { runDriftCheck } from '../audit/drift/drift_sentinel.js';

async function readStdin() {
  return await new Promise((resolve) => {
    let data = '';
    input.setEncoding('utf8');
    input.on('data', (chunk) => (data += chunk));
    input.on('end', () => resolve(data.trim()));
  });
}

async function main() {
  try {
    const arg = process.argv[2];
    const payloadStr = arg && arg.trim().length > 0 ? arg : await readStdin();
    const payload = payloadStr ? JSON.parse(payloadStr) : {};

    const { jsonPath, mdPath, report } = await runDriftCheck(payload);
    console.log('Drift report written:');
    console.log(`  JSON: ${jsonPath}`);
    console.log(`  MD:   ${mdPath}`);
    console.log('Summary:', report);
  } catch (error) {
    console.error('Drift check failed:', error.message);
    exit(1);
  }
}

main();
