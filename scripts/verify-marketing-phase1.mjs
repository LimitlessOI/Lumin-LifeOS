/**
 * SYNOPSIS: Shim — retired hallucinated MarketingOS probes; runs LIVE §6 verifier.
 * @ssot docs/products/marketingos/PRODUCT_HOME.md
 *
 * Old file probed nonexistent /api/v1/marketingos/* and /api/v1/socialmediaos/* paths.
 * Canonical verifier: scripts/verify-marketing-phase1-live.mjs
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const live = path.join(here, 'verify-marketing-phase1-live.mjs');

const child = spawn(process.execPath, [live], {
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
