#!/usr/bin/env node
import { stdin as input, exit } from 'process';
import { runFSAR } from '../audit/fsar/fsar_runner.js';

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
    const proposal = arg && arg.trim().length > 0 ? arg : await readStdin();

    if (!proposal || proposal.length === 0) {
      console.error('Usage: node scripts/run_fsr_proposal.js "<proposal text>"\n  or: cat proposal.txt | node scripts/run_fsr_proposal.js');
      exit(1);
    }

    const { jsonPath, mdPath, report } = await runFSAR(proposal);
    console.log('FSAR artifacts written:');
    console.log(`  JSON: ${jsonPath}`);
    console.log(`  MD:   ${mdPath}`);
    console.log('Summary:', report);
  } catch (error) {
    console.error('FSAR run failed:', error.message);
    exit(1);
  }
}

main();
