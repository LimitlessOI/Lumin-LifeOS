/**
 * SYNOPSIS: Verification command for the FACTORY-MASTER-A-TO-Z-0001 demo receipt.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

if (!fs.existsSync('public/factory-demo-widget.mjs')) {
  console.error('Missing public/factory-demo-widget.mjs');
  process.exit(1);
}

run('node --check public/factory-demo-widget.mjs');
run('node --test tests/reasoning-plan.test.mjs');
run('node --test tests/cognitive-chair.test.mjs');
run('node --test tests/blueprint-generator.test.mjs');
run('node --test tests/lens-registry.test.mjs');

console.log('MASTER_A_TO_Z_DEMO verification PASS');
