/**
 * SYNOPSIS: PATH-TO-TEN mission acceptance smoke test ( Receipt Auditor vertical slice ).
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { execFile } from 'node:child_process';

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = execFile(cmd, args, { shell: false, timeout: 120_000 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Command failed: ${cmd} ${args.join(' ')}\n${stderr || stdout || error.message}`));
      } else {
        resolve(stdout);
      }
    });
    child.on('error', (err) => reject(err));
  });
}

try {
  await run('node', ['--test', 'tests/receipt-auditor.test.js']);
  console.log(JSON.stringify({ ok: true, acceptance: 'receipt-auditor tests PASS' }));
  process.exit(0);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
