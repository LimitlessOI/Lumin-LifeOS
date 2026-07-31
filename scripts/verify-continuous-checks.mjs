/**
 * SYNOPSIS: CLI to run the continuous verification heartbeat once.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 */

import { runContinuousVerification } from '../services/continuous-verification.mjs';

const result = await runContinuousVerification({ repoRoot: process.cwd() });

console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  console.error('[verify-continuous-checks] Autonomy paused due to failing governance checks.');
  process.exit(1);
}

process.exit(0);
