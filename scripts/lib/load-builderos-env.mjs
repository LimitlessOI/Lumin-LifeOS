/**
 * SYNOPSIS: Load BuilderOS worker env for CLI scripts that only import dotenv/config.
 * @ssot docs/products/builderos/PRODUCT_HOME.md
 *
 * Builder tooling often stores low-cost worker credentials in `.env.builderos`
 * rather than the main app `.env`. Runtime boot already loads that file via
 * config/runtime-env.js; CLI scripts need the same fallback so they do not
 * falsely report missing model keys.
 */
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

let builderEnvLoaded = false;

export function loadBuilderOsEnv(cwd = process.cwd()) {
  if (builderEnvLoaded) return;
  builderEnvLoaded = true;

  const envPath = path.join(cwd, '.env.builderos');
  if (!fs.existsSync(envPath)) return;

  dotenv.config({ path: envPath, override: false });
}

loadBuilderOsEnv();
